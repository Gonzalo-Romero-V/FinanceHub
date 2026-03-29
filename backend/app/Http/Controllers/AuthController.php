<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserModel;
use Exception;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class AuthController
{

    // REGISTER TRADICIONAL
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

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'mensaje' => 'Registro exitoso',
                'data' => $user,
                'token' => $token
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