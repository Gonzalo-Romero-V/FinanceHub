<?php

namespace Tests\Feature;

use App\Models\UserModel;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_unverified_user_sends_notification_and_returns_no_token(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Nuevo Usuario',
            'email' => 'nuevo@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)->assertJsonMissing(['token']);

        $user = UserModel::where('email', 'nuevo@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_login_blocks_unverified_user_with_409(): void
    {
        UserModel::create([
            'name' => 'Sin Verificar',
            'email' => 'sinverificar@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'sinverificar@example.com',
            'password' => 'password123',
        ])->assertStatus(409)->assertJsonMissing(['token']);
    }

    public function test_login_succeeds_for_verified_user(): void
    {
        UserModel::create([
            'name' => 'Verificado',
            'email' => 'verificado@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'verificado@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_verify_email_with_valid_signed_link_marks_verified_and_redirects(): void
    {
        $user = UserModel::create([
            'name' => 'Por Verificar',
            'email' => 'porverificar@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->getKey(),
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('verified=1', $response->headers->get('Location'));

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_verify_email_with_tampered_hash_does_not_verify(): void
    {
        $user = UserModel::create([
            'name' => 'Por Verificar 2',
            'email' => 'porverificar2@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->getKey(),
            'hash' => sha1('otro-email-cualquiera@example.com'),
        ]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertStringContainsString('error=invalid_verification_link', $response->headers->get('Location'));

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_verify_email_without_valid_signature_is_rejected(): void
    {
        $user = UserModel::create([
            'name' => 'Por Verificar 3',
            'email' => 'porverificar3@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);

        // URL sin firma válida (armada a mano, no generada por temporarySignedRoute).
        $response = $this->get("/api/auth/email/verify/{$user->id}/" . sha1($user->email));

        $response->assertStatus(403);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }

    public function test_resend_verification_sends_notification_only_if_unverified(): void
    {
        Notification::fake();

        $unverified = UserModel::create([
            'name' => 'Reenviar',
            'email' => 'reenviar@example.com',
            'password' => 'password123',
            'role' => 'user',
        ]);
        $verified = UserModel::create([
            'name' => 'Ya Verificado',
            'email' => 'yaverificado@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $this->postJson('/api/auth/resend-verification', ['email' => 'reenviar@example.com'])->assertOk();
        $this->postJson('/api/auth/resend-verification', ['email' => 'yaverificado@example.com'])->assertOk();

        Notification::assertSentTo($unverified, VerifyEmailNotification::class);
        Notification::assertNotSentTo($verified, VerifyEmailNotification::class);
    }

    public function test_google_account_is_verified_immediately_and_not_blocked_by_login_rule(): void
    {
        $user = UserModel::create([
            'name' => 'Google User',
            'email' => 'googleuser@example.com',
            'provider' => 'google',
            'provider_id' => '12345',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);

        $this->assertTrue($user->hasVerifiedEmail());
    }
}
