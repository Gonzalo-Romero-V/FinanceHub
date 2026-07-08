<?php

namespace App\Http\Controllers;

use App\Models\CuentaModel;
use App\Models\CuotaModel;
use App\Models\MovimientoModel;
use App\Models\ReconciliacionModel;
use App\Models\UserSettingsModel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BalanceController
{
    /**
     * GET /balance
     *
     * Retorna un resumen financiero del patrimonio del usuario:
     * - Lista de cuentas con saldo actual
     * - Patrimonio total (activos menos cuentas pasivas y deudas activas)
     * - Total ingresos y egresos de todos los movimientos del usuario
     */
    public function index()
    {
        $userId = auth()->id();

        $cuentas = CuentaModel::with('tipoCuenta')
            ->where('user_id', $userId)
            ->where('activa', true)
            ->get();

        $totalActivos = $cuentas
            ->filter(fn ($cuenta) => $cuenta->tipoCuenta?->nombre === 'Activo')
            ->sum('saldo');

        $totalPasivosCuentas = $cuentas
            ->filter(fn ($cuenta) => $cuenta->tipoCuenta?->nombre === 'Pasivo')
            ->sum('saldo');

        // DeudaModel no tiene una columna saldo_pendiente: DeudaController lo
        // calcula como la suma de las cuotas no pagadas. Replicamos esa regla
        // en la base de datos y solo para deudas activas del usuario.
        $totalDeudasActivas = CuotaModel::where('pagada', false)
            ->whereHas('deuda', fn ($query) => $query
                ->where('user_id', $userId)
                ->where('estado', 'activa'))
            ->sum('cuota_total');

        $totalPasivos = $totalPasivosCuentas + $totalDeudasActivas;
        $patrimonioTotal = $totalActivos - $totalPasivos;

        // Última reconciliación por cuenta y estado de recordatorio
        $ultimasReconciliaciones = ReconciliacionModel::where('user_id', $userId)
            ->whereIn('cuenta_id', $cuentas->pluck('id'))
            ->select('cuenta_id', DB::raw('MAX(fecha) as ultima_fecha'))
            ->groupBy('cuenta_id')
            ->pluck('ultima_fecha', 'cuenta_id');

        $settings = UserSettingsModel::where('user_id', $userId)->first();
        $proximaGlobal = $settings?->reconciliacion_proxima;
        $alertaVencida = $proximaGlobal && Carbon::parse($proximaGlobal)->isPast();

        // Totales de ingresos y egresos agrupados desde los movimientos
        // Ingreso: suma de montos donde la cuenta_destino pertenece al usuario y el tipo es Ingreso
        $totalIngresos = MovimientoModel::with('concepto.tipoMovimiento')
            ->whereHas('cuentaDestino', fn ($q) => $q->where('user_id', $userId))
            ->whereHas('concepto.tipoMovimiento', fn ($q) => $q->where('nombre', 'Ingreso'))
            ->sum('monto');

        $totalEgresos = MovimientoModel::with('concepto.tipoMovimiento')
            ->whereHas('cuentaOrigen', fn ($q) => $q->where('user_id', $userId))
            ->whereHas('concepto.tipoMovimiento', fn ($q) => $q->where('nombre', 'Egreso'))
            ->sum('monto');

        return response()->json([
            'mensaje' => 'Balance general del usuario',
            'patrimonio_total' => round((float) $patrimonioTotal, 2),
            'total_activos' => round((float) $totalActivos, 2),
            'total_pasivos' => round((float) $totalPasivos, 2),
            'total_ingresos' => round((float) $totalIngresos, 2),
            'total_egresos' => round((float) $totalEgresos, 2),
            'proxima_reconciliacion' => $proximaGlobal,
            'alerta_reconciliacion' => $alertaVencida,
            'cuentas' => $cuentas->map(fn ($c) => [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'tipo' => $c->tipoCuenta?->nombre ?? 'N/A',
                'saldo' => round((float) $c->saldo, 2),
                'saldo_inicial' => round((float) $c->saldo_inicial, 2),
                'ultima_reconciliacion' => $ultimasReconciliaciones[$c->id] ?? null,
            ]),
        ], 200);
    }
}
