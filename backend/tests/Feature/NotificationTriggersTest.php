<?php

namespace Tests\Feature;

use App\Models\CuotaModel;
use App\Models\DeudaModel;
use App\Models\UserModel;
use App\Models\UserSettingsModel;
use App\Notifications\CuotaDeudaProximaNotification;
use App\Notifications\PresupuestoUmbralNotification;
use App\Notifications\ReconciliacionProximaNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTriggersTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): UserModel
    {
        return UserModel::create([
            'name' => 'Test',
            'email' => 'test' . uniqid() . '@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);
    }

    // ─── Reconciliación ────────────────────────────────────────────────

    public function test_reconciliacion_command_notifies_when_due_soon(): void
    {
        $user = $this->makeUser();
        UserSettingsModel::create([
            'user_id' => $user->id,
            'reconciliacion_tipo' => 'semanal',
            'reconciliacion_dia_semana' => 1,
            'reconciliacion_proxima' => now()->addDays(2)->toDateString(),
            'onboarding_seen' => [],
        ]);

        $this->artisan('notificaciones:reconciliaciones')->assertExitCode(0);

        $this->assertEquals(1, $user->notifications()->where('type', ReconciliacionProximaNotification::class)->count());
    }

    public function test_reconciliacion_command_does_not_duplicate_on_second_run(): void
    {
        $user = $this->makeUser();
        UserSettingsModel::create([
            'user_id' => $user->id,
            'reconciliacion_tipo' => 'semanal',
            'reconciliacion_dia_semana' => 1,
            'reconciliacion_proxima' => now()->addDay()->toDateString(),
            'onboarding_seen' => [],
        ]);

        $this->artisan('notificaciones:reconciliaciones');
        $this->artisan('notificaciones:reconciliaciones');

        $this->assertEquals(1, $user->notifications()->where('type', ReconciliacionProximaNotification::class)->count());
    }

    public function test_reconciliacion_command_ignores_far_future_dates(): void
    {
        $user = $this->makeUser();
        UserSettingsModel::create([
            'user_id' => $user->id,
            'reconciliacion_tipo' => 'mensual',
            'reconciliacion_dia_mes' => 1,
            'reconciliacion_proxima' => now()->addDays(20)->toDateString(),
            'onboarding_seen' => [],
        ]);

        $this->artisan('notificaciones:reconciliaciones');

        $this->assertEquals(0, $user->notifications()->count());
    }

    public function test_reconciliar_reprograms_proxima_for_weekly_schedule(): void
    {
        $user = $this->makeUser();
        $settings = UserSettingsModel::create([
            'user_id' => $user->id,
            'reconciliacion_tipo' => 'semanal',
            'reconciliacion_dia_semana' => 1,
            'reconciliacion_proxima' => now()->subDay()->toDateString(),
            'onboarding_seen' => [],
        ]);

        $recalculada = $settings->calcularProximaReconciliacion();

        $this->assertNotNull($recalculada);
        $this->assertTrue(\Carbon\Carbon::parse($recalculada)->isFuture() || \Carbon\Carbon::parse($recalculada)->isToday());
    }

    // ─── Cuotas de deuda ───────────────────────────────────────────────

    public function test_cuotas_command_notifies_when_due_soon(): void
    {
        $user = $this->makeUser();
        $deuda = DeudaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Préstamo test',
            'sistema' => 'frances',
            'monto_original' => 1000,
            'plazo_meses' => 12,
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
        ]);
        $cuota = CuotaModel::create([
            'deuda_id' => $deuda->id,
            'numero_cuota' => 1,
            'fecha_vencimiento' => now()->addDays(2)->toDateString(),
            'cuota_total' => 100,
            'saldo_restante' => 900,
            'pagada' => false,
        ]);

        $this->artisan('notificaciones:cuotas-deuda')->assertExitCode(0);

        $this->assertEquals(1, $user->notifications()->where('type', CuotaDeudaProximaNotification::class)->count());
        $notification = $user->notifications()->first();
        $this->assertEquals($cuota->id, $notification->data['cuota_id']);
    }

    public function test_cuotas_command_ignores_paid_installments(): void
    {
        $user = $this->makeUser();
        $deuda = DeudaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Préstamo pagado',
            'sistema' => 'frances',
            'monto_original' => 1000,
            'plazo_meses' => 12,
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
        ]);
        CuotaModel::create([
            'deuda_id' => $deuda->id,
            'numero_cuota' => 1,
            'fecha_vencimiento' => now()->addDay()->toDateString(),
            'cuota_total' => 100,
            'saldo_restante' => 0,
            'pagada' => true,
        ]);

        $this->artisan('notificaciones:cuotas-deuda');

        $this->assertEquals(0, $user->notifications()->count());
    }

    public function test_cuotas_command_ignores_inactive_debts(): void
    {
        $user = $this->makeUser();
        $deuda = DeudaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Préstamo cancelado',
            'sistema' => 'frances',
            'monto_original' => 1000,
            'plazo_meses' => 12,
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'cancelada',
        ]);
        CuotaModel::create([
            'deuda_id' => $deuda->id,
            'numero_cuota' => 1,
            'fecha_vencimiento' => now()->addDay()->toDateString(),
            'cuota_total' => 100,
            'saldo_restante' => 900,
            'pagada' => false,
        ]);

        $this->artisan('notificaciones:cuotas-deuda');

        $this->assertEquals(0, $user->notifications()->count());
    }

    public function test_cuotas_command_does_not_duplicate_on_second_run(): void
    {
        $user = $this->makeUser();
        $deuda = DeudaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Préstamo test',
            'sistema' => 'frances',
            'monto_original' => 1000,
            'plazo_meses' => 12,
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
        ]);
        CuotaModel::create([
            'deuda_id' => $deuda->id,
            'numero_cuota' => 1,
            'fecha_vencimiento' => now()->addDay()->toDateString(),
            'cuota_total' => 100,
            'saldo_restante' => 900,
            'pagada' => false,
        ]);

        $this->artisan('notificaciones:cuotas-deuda');
        $this->artisan('notificaciones:cuotas-deuda');

        $this->assertEquals(1, $user->notifications()->count());
    }

    // ─── Presupuesto (síncrono) ────────────────────────────────────────

    public function test_creating_movimiento_over_threshold_creates_notification(): void
    {
        Notification::fake();

        $user = $this->makeUser();
        $token = $user->createToken('test')->plainTextToken;

        $tipoMov = \App\Models\TipoMovimientoModel::forceCreate(['nombre' => 'Egreso']);
        $concepto = \App\Models\ConceptoModel::create([
            'user_id' => $user->id,
            'nombre' => 'Comida',
            'tipo_movimiento_id' => $tipoMov->id,
            'color' => '#ff0000',
        ]);
        $tipoCuenta = \App\Models\TipoCuentaModel::create(['nombre' => 'Efectivo']);
        $cuenta = \App\Models\CuentaModel::create([
            'user_id' => $user->id,
            'nombre' => 'Cuenta test',
            'tipo_cuenta_id' => $tipoCuenta->id,
            'saldo' => 1000,
            'saldo_inicial' => 1000,
            'fecha_creacion' => now()->toDateString(),
            'activa' => true,
        ]);
        \App\Models\PresupuestoModel::create([
            'user_id' => $user->id,
            'concepto_id' => $concepto->id,
            'monto' => 100,
            'ventana' => 'mensual',
            'umbrales' => [50, 90],
            'activo' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/movimientos', [
            'concepto_id' => $concepto->id,
            'cuenta_origen_id' => $cuenta->id,
            'monto' => 60,
        ]);

        $response->assertStatus(201);
        Notification::assertSentTo($user, PresupuestoUmbralNotification::class);
    }
}
