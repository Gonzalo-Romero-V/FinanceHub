<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CuentaModel;

class BalanceController
{
    /**
     * GET /balance
     *
     * Retorna un resumen financiero del patrimonio del usuario:
     * - Lista de cuentas con saldo actual
     * - Patrimonio total (suma de saldos de todas las cuentas activas)
     * - Total ingresos y egresos de todos los movimientos del usuario
     */
    public function index()
    {
        $userId = auth()->id();

        $cuentas = CuentaModel::with('tipoCuenta')
            ->where('user_id', $userId)
            ->where('activa', true)
            ->get();

        $patrimonioTotal = $cuentas->sum('saldo');

        // Totales de ingresos y egresos agrupados desde los movimientos
        // Ingreso: suma de montos donde la cuenta_destino pertenece al usuario y el tipo es Ingreso
        $totalIngresos = \App\Models\MovimientoModel::with('concepto.tipoMovimiento')
            ->whereHas('cuentaDestino', fn($q) => $q->where('user_id', $userId))
            ->whereHas('concepto.tipoMovimiento', fn($q) => $q->where('nombre', 'Ingreso'))
            ->sum('monto');

        $totalEgresos = \App\Models\MovimientoModel::with('concepto.tipoMovimiento')
            ->whereHas('cuentaOrigen', fn($q) => $q->where('user_id', $userId))
            ->whereHas('concepto.tipoMovimiento', fn($q) => $q->where('nombre', 'Egreso'))
            ->sum('monto');

        return response()->json([
            'mensaje'          => 'Balance general del usuario',
            'patrimonio_total' => round((float) $patrimonioTotal, 2),
            'total_ingresos'   => round((float) $totalIngresos, 2),
            'total_egresos'    => round((float) $totalEgresos, 2),
            'cuentas'          => $cuentas->map(fn($c) => [
                'id'     => $c->id,
                'nombre' => $c->nombre,
                'tipo'   => $c->tipoCuenta?->nombre ?? 'N/A',
                'saldo'  => round((float) $c->saldo, 2),
            ]),
        ], 200);
    }
}
