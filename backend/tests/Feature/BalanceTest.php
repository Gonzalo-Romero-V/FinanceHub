<?php

namespace Tests\Feature;

use App\Models\CuentaModel;
use App\Models\CuotaModel;
use App\Models\DeudaModel;
use App\Models\TipoCuentaModel;
use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_nets_active_asset_accounts_against_liability_accounts_and_active_debts(): void
    {
        $user = $this->createUser('balance@example.com');
        $otherUser = $this->createUser('other@example.com');
        $assetType = TipoCuentaModel::create(['nombre' => 'Activo']);
        $liabilityType = TipoCuentaModel::create(['nombre' => 'Pasivo']);

        $this->createAccount($user, $assetType, 1000.25);
        $this->createAccount($user, $assetType, 999, false);
        $this->createAccount($user, $liabilityType, 125.10);
        $this->createAccount($user, $liabilityType, 999, false);
        $this->createAccount($otherUser, $assetType, 5000);
        $this->createAccount($otherUser, $liabilityType, 5000);

        $activeDebt = $this->createDebt($user, 'activa');
        $this->createInstallment($activeDebt, 200, false, 1);
        $this->createInstallment($activeDebt, 50, true, 2);

        $paidDebt = $this->createDebt($user, 'pagada');
        $this->createInstallment($paidDebt, 300, false, 1);

        $cancelledDebt = $this->createDebt($user, 'cancelada');
        $this->createInstallment($cancelledDebt, 400, false, 1);

        $otherDebt = $this->createDebt($otherUser, 'activa');
        $this->createInstallment($otherDebt, 500, false, 1);

        Sanctum::actingAs($user);

        $this->getJson('/api/balance')
            ->assertOk()
            ->assertJsonPath('total_activos', 1000.25)
            ->assertJsonPath('total_pasivos', 325.1)
            ->assertJsonPath('patrimonio_total', 675.15);
    }

    private function createUser(string $email): UserModel
    {
        return UserModel::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password',
        ]);
    }

    private function createAccount(
        UserModel $user,
        TipoCuentaModel $type,
        float $balance,
        bool $active = true,
    ): CuentaModel {
        return CuentaModel::create([
            'nombre' => 'Cuenta de prueba',
            'tipo_cuenta_id' => $type->id,
            'saldo' => $balance,
            'saldo_inicial' => $balance,
            'activa' => $active,
            'user_id' => $user->id,
        ]);
    }

    private function createDebt(UserModel $user, string $status): DeudaModel
    {
        return DeudaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Deuda de prueba',
            'sistema' => 'frances',
            'monto_original' => 1000,
            'plazo_meses' => 12,
            'fecha_inicio' => '2026-01-01',
            'estado' => $status,
        ]);
    }

    private function createInstallment(
        DeudaModel $debt,
        float $amount,
        bool $paid,
        int $number,
    ): CuotaModel {
        return CuotaModel::create([
            'deuda_id' => $debt->id,
            'numero_cuota' => $number,
            'fecha_vencimiento' => '2026-02-01',
            'cuota_total' => $amount,
            'saldo_restante' => 0,
            'pagada' => $paid,
        ]);
    }
}
