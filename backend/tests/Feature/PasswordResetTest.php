<?php

namespace Tests\Feature;

use App\Models\UserModel;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(string $email, ?string $password = 'password123', ?string $provider = null): UserModel
    {
        return UserModel::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => $password,
            'provider' => $provider,
            'role' => 'user',
        ]);
    }

    public function test_forgot_password_sends_reset_link_with_frontend_url(): void
    {
        Notification::fake();
        $user = $this->createUser('reset@example.com');

        $this->postJson('/api/auth/forgot-password', ['email' => 'reset@example.com'])
            ->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_forgot_password_returns_neutral_message_for_unknown_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'noexiste@example.com'])
            ->assertOk()
            ->assertJsonFragment(['mensaje' => 'Si el email existe en nuestro sistema, vas a recibir un enlace para restablecer tu contraseña.']);
    }

    public function test_forgot_password_works_for_google_only_account(): void
    {
        Notification::fake();
        $user = $this->createUser('google@example.com', password: null, provider: 'google');

        $this->postJson('/api/auth/forgot-password', ['email' => 'google@example.com'])
            ->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_password_with_valid_token_updates_password_and_revokes_tokens(): void
    {
        $user = $this->createUser('reset2@example.com');
        $oldToken = $user->createToken('old')->plainTextToken;

        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'reset2@example.com',
            'password' => 'nuevaClave123',
            'password_confirmation' => 'nuevaClave123',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('nuevaClave123', $user->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_reset_password_with_invalid_token_fails(): void
    {
        $this->createUser('reset3@example.com');

        $this->postJson('/api/auth/reset-password', [
            'token' => 'token-invalido',
            'email' => 'reset3@example.com',
            'password' => 'nuevaClave123',
            'password_confirmation' => 'nuevaClave123',
        ])->assertStatus(422);
    }

    public function test_changing_own_password_requires_current_password(): void
    {
        $user = $this->createUser('selfchange@example.com', password: 'oldPassword1');
        Sanctum::actingAs($user);

        $this->patchJson("/api/users/{$user->id}", ['password' => 'newPassword1'])
            ->assertStatus(422);

        $this->patchJson("/api/users/{$user->id}", [
            'password' => 'newPassword1',
            'current_password' => 'wrongPassword',
        ])->assertStatus(422);

        $user->refresh();
        $this->assertTrue(Hash::check('oldPassword1', $user->password));
    }

    public function test_changing_own_password_succeeds_with_correct_current_password(): void
    {
        $user = $this->createUser('selfchange2@example.com', password: 'oldPassword1');
        Sanctum::actingAs($user);

        $this->patchJson("/api/users/{$user->id}", [
            'password' => 'newPassword1',
            'current_password' => 'oldPassword1',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('newPassword1', $user->password));
    }

    public function test_google_user_can_set_password_first_time_without_current_password(): void
    {
        $user = $this->createUser('googleset@example.com', password: null, provider: 'google');
        Sanctum::actingAs($user);

        $this->patchJson("/api/users/{$user->id}", ['password' => 'firstPassword1'])
            ->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('firstPassword1', $user->password));
    }
}
