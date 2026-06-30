<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PresupuestoModel;
use App\Models\ConceptoModel;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonImmutable;
use Exception;

class PresupuestoController
{
    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function clientTimezone(Request $request): string
    {
        $tz = (string) $request->header('X-Client-Timezone', 'UTC');
        try {
            new \DateTimeZone($tz);
            return $tz;
        } catch (Exception $e) {
            return 'UTC';
        }
    }

    /**
     * Devuelve [inicio_utc, fin_utc] del período calendario activo en la TZ del cliente.
     */
    private function periodoActual(string $ventana, string $tz): array
    {
        $now = CarbonImmutable::now($tz);
        return match ($ventana) {
            'diario'  => [
                $now->startOfDay()->setTimezone('UTC'),
                $now->endOfDay()->setTimezone('UTC'),
            ],
            'semanal' => [
                $now->startOfWeek()->setTimezone('UTC'),
                $now->endOfWeek()->setTimezone('UTC'),
            ],
            'anual'   => [
                $now->startOfYear()->setTimezone('UTC'),
                $now->endOfYear()->setTimezone('UTC'),
            ],
            default   => [ // 'mensual'
                $now->startOfMonth()->setTimezone('UTC'),
                $now->endOfMonth()->setTimezone('UTC'),
            ],
        };
    }

    /**
     * Suma los movimientos del concepto (y sus hijos) dentro del período activo.
     * El presupuesto en un concepto raíz agrega automáticamente todos sus hijos.
     */
    private function consumoActual(PresupuestoModel $presupuesto, string $tz): float
    {
        [$inicio, $fin] = $this->periodoActual($presupuesto->ventana, $tz);

        return (float) DB::table('movimientos as m')
            ->join('conceptos as c', 'm.concepto_id', '=', 'c.id')
            ->where(function ($q) use ($presupuesto) {
                $q->where('c.id', $presupuesto->concepto_id)
                  ->orWhere('c.parent_id', $presupuesto->concepto_id);
            })
            ->where('c.user_id', $presupuesto->user_id)
            ->whereBetween('m.fecha', [$inicio, $fin])
            ->sum('m.monto');
    }

    /**
     * Agrega campos computados (consumo, porcentaje, período) al array del modelo.
     */
    private function enriquecer(PresupuestoModel $presupuesto, string $tz): array
    {
        [$inicio, $fin] = $this->periodoActual($presupuesto->ventana, $tz);
        $consumo = $this->consumoActual($presupuesto, $tz);
        $pct = $presupuesto->monto > 0
            ? round(($consumo / $presupuesto->monto) * 100, 1)
            : 0.0;

        return array_merge($presupuesto->toArray(), [
            'concepto'   => $presupuesto->concepto,
            'consumo'    => $consumo,
            'porcentaje' => $pct,
            'periodo'    => [
                'inicio' => $inicio->toIso8601String(),
                'fin'    => $fin->toIso8601String(),
            ],
        ]);
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $userId = auth()->id();
        $tz = $this->clientTimezone($request);

        $presupuestos = PresupuestoModel::with('concepto.tipoMovimiento')
            ->where('user_id', $userId)
            ->orderBy('id', 'desc')
            ->get();

        $data = $presupuestos->map(fn($p) => $this->enriquecer($p, $tz))->values();

        return response()->json(['data' => $data], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'concepto_id' => 'required|integer',
            'monto'       => 'required|numeric|min:0.01',
            'ventana'     => 'required|in:diario,semanal,mensual,anual',
            'umbrales'    => 'sometimes|array|min:1',
            'umbrales.*'  => 'integer|min:1|max:100',
            'activo'      => 'sometimes|boolean',
        ]);

        $userId = auth()->id();

        // El concepto debe pertenecer al usuario y no ser del sistema
        ConceptoModel::where('id', $request->concepto_id)
            ->where('user_id', $userId)
            ->where('es_sistema', false)
            ->firstOrFail();

        $existe = PresupuestoModel::where('user_id', $userId)
            ->where('concepto_id', $request->concepto_id)
            ->where('ventana', $request->ventana)
            ->exists();

        if ($existe) {
            return response()->json([
                'mensaje' => 'Ya existe un presupuesto para este concepto y ventana de tiempo.',
            ], 422);
        }

        $presupuesto = PresupuestoModel::create([
            'user_id'     => $userId,
            'concepto_id' => $request->concepto_id,
            'monto'       => (float) $request->monto,
            'ventana'     => $request->ventana,
            'umbrales'    => $request->input('umbrales', [50, 75, 90]),
            'activo'      => $request->input('activo', true),
        ]);

        $presupuesto->load('concepto.tipoMovimiento');
        $tz = $this->clientTimezone($request);

        return response()->json([
            'mensaje' => 'Presupuesto creado exitosamente.',
            'data'    => $this->enriquecer($presupuesto, $tz),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $userId = auth()->id();
        $tz = $this->clientTimezone($request);

        $presupuesto = PresupuestoModel::with('concepto.tipoMovimiento')
            ->where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        return response()->json([
            'data' => $this->enriquecer($presupuesto, $tz),
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'monto'      => 'sometimes|numeric|min:0.01',
            'ventana'    => 'sometimes|in:diario,semanal,mensual,anual',
            'umbrales'   => 'sometimes|array|min:1',
            'umbrales.*' => 'integer|min:1|max:100',
            'activo'     => 'sometimes|boolean',
        ]);

        $userId = auth()->id();

        $presupuesto = PresupuestoModel::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        // Si cambia la ventana, verificar que no genere duplicado
        if ($request->has('ventana') && $request->ventana !== $presupuesto->ventana) {
            $existe = PresupuestoModel::where('user_id', $userId)
                ->where('concepto_id', $presupuesto->concepto_id)
                ->where('ventana', $request->ventana)
                ->where('id', '!=', $id)
                ->exists();

            if ($existe) {
                return response()->json([
                    'mensaje' => 'Ya existe un presupuesto para este concepto y ventana de tiempo.',
                ], 422);
            }
        }

        $datos = $request->only('monto', 'ventana', 'umbrales', 'activo');

        if (empty($datos)) {
            return response()->json(['mensaje' => 'No se enviaron campos para actualizar.'], 400);
        }

        $presupuesto->update($datos);
        $presupuesto->load('concepto.tipoMovimiento');
        $tz = $this->clientTimezone($request);

        return response()->json([
            'mensaje' => 'Presupuesto actualizado exitosamente.',
            'data'    => $this->enriquecer($presupuesto, $tz),
        ], 200);
    }

    public function destroy($id)
    {
        $userId = auth()->id();

        $presupuesto = PresupuestoModel::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $presupuesto->delete();

        return response()->json([
            'mensaje' => 'Presupuesto eliminado exitosamente.',
        ], 200);
    }
}
