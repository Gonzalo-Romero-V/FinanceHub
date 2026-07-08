<?php

namespace Tests\Feature;

use App\Models\TipoCuentaModel;
use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentaColorTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserAndTipo(): array
    {
        $user = UserModel::create([
            'name' => 'Test', 'email' => 'test' . uniqid() . '@example.com',
            'password' => 'password123', 'email_verified_at' => now(), 'role' => 'user',
        ]);
        $tipoCuenta = TipoCuentaModel::firstOrCreate(['nombre' => 'Efectivo']);
        return [$user, $tipoCuenta];
    }

    public function test_can_create_cuenta_with_valid_color(): void
    {
        [$user, $tipoCuenta] = $this->makeUserAndTipo();
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/cuentas', [
            'nombre' => 'Cuenta test',
            'tipo_cuenta_id' => $tipoCuenta->id,
            'saldo' => 100,
            'activa' => true,
            'color' => '#3b82f6',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('cuentas', ['nombre' => 'Cuenta test', 'color' => '#3b82f6']);
    }

    public function test_rejects_invalid_color_format(): void
    {
        [$user, $tipoCuenta] = $this->makeUserAndTipo();
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/cuentas', [
            'nombre' => 'Cuenta test',
            'tipo_cuenta_id' => $tipoCuenta->id,
            'saldo' => 100,
            'activa' => true,
            'color' => 'blue',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_update_cuenta_color(): void
    {
        [$user, $tipoCuenta] = $this->makeUserAndTipo();
        $token = $user->createToken('t')->plainTextToken;

        $create = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/cuentas', [
            'nombre' => 'Cuenta test', 'tipo_cuenta_id' => $tipoCuenta->id, 'saldo' => 100, 'activa' => true,
        ]);
        $cuentaId = $create->json('data.id');

        $response = $this->withHeader('Authorization', "Bearer {$token}")->patchJson("/api/cuentas/{$cuentaId}", [
            'color' => '#ef4444',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('cuentas', ['id' => $cuentaId, 'color' => '#ef4444']);
    }

    public function test_cuenta_without_color_defaults_to_null(): void
    {
        [$user, $tipoCuenta] = $this->makeUserAndTipo();
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/cuentas', [
            'nombre' => 'Cuenta test', 'tipo_cuenta_id' => $tipoCuenta->id, 'saldo' => 100, 'activa' => true,
        ]);

        $response->assertCreated();
        $this->assertNull($response->json('data.color'));
    }
}
