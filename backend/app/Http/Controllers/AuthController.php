<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserModel;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Auth\Events\Verified;

class AuthController
{

    // REGISTER TRADICIONAL — no devuelve token: primero hay que confirmar el email
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6'
        ]);

        try {
            $user = UserModel::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password,
                'role' => 'user'
            ]);

            $user->sendEmailVerificationNotification();

            return response()->json([
                'mensaje' => 'Registro exitoso. Te enviamos un email para confirmar tu cuenta — revisá tu bandeja de entrada antes de iniciar sesión.',
                'data' => $user,
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error en el proceso de registro'
            ], 500);
        }
    }

    // LOGIN TRADICIONAL
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        try {

            if (!Auth::attempt($request->only('email', 'password'))) {
                return response()->json([
                    'mensaje' => 'Credenciales incorrectas'
                ], 401);
            }

            $user = Auth::user();

            if (!$user->hasVerifiedEmail()) {
                Auth::logout();
                return response()->json([
                    'mensaje' => 'Confirmá tu email antes de iniciar sesión. Revisá tu bandeja de entrada (o spam) por el enlace que te mandamos al registrarte.',
                ], 409);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'mensaje' => 'Login exitoso',
                'data' => $user,
                'token' => $token
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error en el proceso de login'
            ], 500);
        }
    }


    // REDIRECT GOOGLE
    public function redirectToGoogle()
    {
        // prompt=select_account obliga a mostrar la pantalla de elegir cuenta
        // max_age=0 obliga a Google a volver a requerir la contraseña si el SSO está guardado
        return Socialite::driver('google')
            ->stateless()
            ->with([
                'prompt' => 'select_account',
                'max_age' => 0
            ])
            ->redirect();
    }


    // CALLBACK GOOGLE
    public function handleGoogleCallback()
    {
        try {

            $driver = Socialite::driver('google')->stateless();

            // Fix cURL error 60 on local Windows environments
            if (app()->environment('local')) {
                $driver->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
            }

            $googleUser = $driver->user();

            $user = UserModel::where('email', $googleUser->getEmail())->first();

            if ($user !== null) {

                if (!$user->provider) {
                    $user->update([
                        'provider' => 'google',
                        'provider_id' => $googleUser->getId()
                    ]);
                }

            } else {

                $user = UserModel::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'provider' => 'google',
                    'provider_id' => $googleUser->getId(),
                    'email_verified_at' => now(),
                    'role' => 'user'
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            // Redirect to frontend with the token
            return redirect()->away(env('FRONTEND_URL', 'http://localhost:3000') . '/auth/callback?token=' . $token);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Google Auth Error: ' . $e->getMessage());
            return redirect()->away(env('FRONTEND_URL', 'http://localhost:3000') . '/login?error=google_auth_failed');
        }
    }


    // OLVIDÉ MI CONTRASEÑA — envía el link de reset por email
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Se manda el link también para cuentas 100% Google (password null):
        // les permite SETEAR una contraseña por primera vez, habilitando login
        // híbrido — mismo resultado que "Establecer contraseña" en Perfil,
        // pero accesible sin estar logueado.
        Password::sendResetLink($request->only('email'));

        // Respuesta siempre neutra: no confirma ni niega si el email existe,
        // para no habilitar enumeración de usuarios.
        return response()->json([
            'mensaje' => 'Si el email existe en nuestro sistema, vas a recibir un enlace para restablecer tu contraseña.',
        ], 200);
    }

    // RESTABLECER CONTRASEÑA — consume el token del email
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (UserModel $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                // Invalida todas las sesiones existentes: si alguien más tenía
                // acceso (token robado, sesión abierta), queda afuera.
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'mensaje' => 'Contraseña restablecida correctamente. Iniciá sesión con tu nueva contraseña.',
            ], 200);
        }

        return response()->json([
            'mensaje' => $status === Password::INVALID_TOKEN
                ? 'El enlace no es válido o ya expiró. Solicitá uno nuevo.'
                : 'No se pudo restablecer la contraseña.',
        ], 422);
    }


    // CONFIRMAR EMAIL — el link firmado del correo pega directo acá (mismo
    // patrón que el callback de Google) y redirige al frontend al terminar.
    public function verifyEmail(Request $request, $id, $hash)
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');

        $user = UserModel::find($id);

        if (!$user || !hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
            return redirect()->away($frontendUrl . '/login?error=invalid_verification_link');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect()->away($frontendUrl . '/login?verified=1');
    }

    // REENVIAR EMAIL DE VERIFICACIÓN
    public function resendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = UserModel::where('email', $request->email)->first();

        if ($user && !$user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        // Respuesta neutra, mismo criterio anti-enumeración que forgot-password.
        return response()->json([
            'mensaje' => 'Si el email existe y todavía no fue confirmado, te reenviamos el enlace.',
        ], 200);
    }


    // USUARIO AUTENTICADO
    public function me()
    {
        return response()->json([
            'mensaje' => 'Usuario autenticado',
            'data' => auth()->user()
        ], 200);
    }


    // LOGOUT
    public function logout()
    {
        try {

            auth()->user()->tokens()->delete();

            return response()->json([
                'mensaje' => 'Sesión cerrada correctamente'
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'Error al cerrar sesión'
            ], 500);
        }
    }
}