<?php

namespace Tests\Feature;

use App\Models\ConceptoModel;
use App\Models\CuentaModel;
use App\Models\MovimientoModel;
use App\Models\TipoCuentaModel;
use App\Models\TipoMovimientoModel;
use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MovimientoAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserWithAccountAndConcept(string $tipoNombre = 'Egreso'): array
    {
        $user = UserModel::create([
            'name' => 'Test',
            'email' => 'test' . uniqid() . '@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);
        $tipoMov = TipoMovimientoModel::where('nombre', $tipoNombre)->first()
            ?? TipoMovimientoModel::forceCreate(['nombre' => $tipoNombre]);
        $tipoCuenta = TipoCuentaModel::firstOrCreate(['nombre' => 'Efectivo']);
        $concepto = ConceptoModel::create([
            'user_id' => $user->id,
            'nombre' => 'Concepto ' . uniqid(),
            'tipo_movimiento_id' => $tipoMov->id,
            'color' => '#ff0000',
        ]);
        $cuenta = CuentaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Cuenta ' . uniqid(),
            'tipo_cuenta_id' => $tipoCuenta->id,
            'saldo' => 1000,
            'saldo_inicial' => 1000,
            'fecha_creacion' => now()->toDateString(),
            'activa' => true,
        ]);
        return [$user, $cuenta, $concepto];
    }

    public function test_cannot_create_movimiento_with_another_users_cuenta(): void
    {
        [$attacker] = $this->makeUserWithAccountAndConcept();
        [, $victimCuenta, $attackerConcepto] = $this->makeUserWithAccountAndConcept();
        // victimCuenta belongs to a DIFFERENT user than $attacker/$attackerConcepto
        $token = $attacker->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/movimientos', [
            'concepto_id' => $attackerConcepto->id,
            'cuenta_origen_id' => $victimCuenta->id,
            'monto' => 50,
        ]);

        $response->assertStatus(404);
    }

    public function test_cannot_create_movimiento_with_another_users_concepto(): void
    {
        [$attacker, $attackerCuenta] = $this->makeUserWithAccountAndConcept();
        [, , $victimConcepto] = $this->makeUserWithAccountAndConcept();
        $token = $attacker->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/movimientos', [
            'concepto_id' => $victimConcepto->id,
            'cuenta_origen_id' => $attackerCuenta->id,
            'monto' => 50,
        ]);

        $response->assertStatus(404);
    }

    public function test_cannot_update_movimiento_to_point_at_another_users_cuenta(): void
    {
        [$attacker, $attackerCuenta, $attackerConcepto] = $this->makeUserWithAccountAndConcept();
        [, $victimCuenta] = $this->makeUserWithAccountAndConcept();
        $token = $attacker->createToken('t')->plainTextToken;

        $movimiento = MovimientoModel::create([
            'concepto_id' => $attackerConcepto->id,
            'cuenta_origen_id' => $attackerCuenta->id,
            'monto' => 50,
            'fecha' => now(),
        ]);

        $victimSaldoAntes = $victimCuenta->fresh()->saldo;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/movimientos/{$movimiento->id}", [
                'cuenta_origen_id' => $victimCuenta->id,
            ]);

        $response->assertStatus(404);
        // El bug original permitía este PATCH y le restaba saldo a la
        // cuenta de la víctima — confirmamos que quedó intacto.
        $this->assertEquals($victimSaldoAntes, $victimCuenta->fresh()->saldo);
    }

    public function test_cannot_update_movimiento_to_use_another_users_concepto(): void
    {
        [$attacker, $attackerCuenta, $attackerConcepto] = $this->makeUserWithAccountAndConcept();
        [, , $victimConcepto] = $this->makeUserWithAccountAndConcept();
        $token = $attacker->createToken('t')->plainTextToken;

        $movimiento = MovimientoModel::create([
            'concepto_id' => $attackerConcepto->id,
            'cuenta_origen_id' => $attackerCuenta->id,
            'monto' => 50,
            'fecha' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/movimientos/{$movimiento->id}", [
                'concepto_id' => $victimConcepto->id,
            ]);

        $response->assertStatus(404);
    }

    public function test_can_still_update_own_movimiento_normally(): void
    {
        [$user, $cuenta, $concepto] = $this->makeUserWithAccountAndConcept();
        $token = $user->createToken('t')->plainTextToken;

        $movimiento = MovimientoModel::create([
            'concepto_id' => $concepto->id,
            'cuenta_origen_id' => $cuenta->id,
            'monto' => 50,
            'fecha' => now(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/movimientos/{$movimiento->id}", [
                'monto' => 75,
                'nota' => 'actualizado',
            ]);

        $response->assertOk();
        $this->assertEquals(75, $movimiento->fresh()->monto);
    }
}
