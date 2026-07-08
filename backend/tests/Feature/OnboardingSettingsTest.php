<?php

namespace Tests\Feature;

use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(string $email): UserModel
    {
        return UserModel::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    public function test_marks_onboarding_keys_as_seen(): void
    {
        $user = $this->createUser('onboarding@example.com');
        Sanctum::actingAs($user);

        $this->patchJson('/api/user-settings/onboarding', ['keys' => ['cuentas_activos']])
            ->assertOk()
            ->assertJsonPath('data.onboarding_seen.cuentas_activos', true);

        $this->patchJson('/api/user-settings/onboarding', ['keys' => ['tipos_movimiento']])
            ->assertOk()
            ->assertJsonPath('data.onboarding_seen.cuentas_activos', true)
            ->assertJsonPath('data.onboarding_seen.tipos_movimiento', true);
    }

    public function test_resets_specific_keys_only(): void
    {
        $user = $this->createUser('onboarding2@example.com');
        Sanctum::actingAs($user);

        $this->patchJson('/api/user-settings/onboarding', [
            'keys' => ['cuentas_activos', 'tipos_movimiento'],
        ])->assertOk();

        $this->postJson('/api/user-settings/onboarding/reset', ['keys' => ['cuentas_activos']])
            ->assertOk()
            ->assertJsonPath('data.onboarding_seen.tipos_movimiento', true)
            ->assertJsonMissingPath('data.onboarding_seen.cuentas_activos');
    }

    public function test_resets_all_keys_when_none_specified(): void
    {
        $user = $this->createUser('onboarding3@example.com');
        Sanctum::actingAs($user);

        $this->patchJson('/api/user-settings/onboarding', [
            'keys' => ['cuentas_activos', 'welcome_carousel'],
        ])->assertOk();

        $this->postJson('/api/user-settings/onboarding/reset', [])
            ->assertOk()
            ->assertJsonPath('data.onboarding_seen', []);
    }

    public function test_onboarding_state_is_isolated_per_user(): void
    {
        $userA = $this->createUser('a@example.com');
        $userB = $this->createUser('b@example.com');

        Sanctum::actingAs($userA);
        $this->patchJson('/api/user-settings/onboarding', ['keys' => ['cuentas_activos']])->assertOk();

        Sanctum::actingAs($userB);
        $this->getJson('/api/user-settings')
            ->assertOk()
            ->assertJsonPath('data.onboarding_seen', []);
    }
}
