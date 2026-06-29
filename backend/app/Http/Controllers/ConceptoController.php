<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConceptoModel;
use Exception;

class ConceptoController
{
    public function index()
    {
        $userId = auth()->id();

        // Cargar raíces con sus hijos y totales
        $raices = ConceptoModel::where('user_id', $userId)
            ->whereNull('parent_id')
            ->with([
                'tipoMovimiento',
                'children.tipoMovimiento',
            ])
            ->withSum(['movimientos as total_monto' => function ($q) use ($userId) {
                $q->whereHas('cuentaOrigen', fn($q2) => $q2->where('user_id', $userId));
            }], 'monto')
            ->get();

        // Inyectar total_monto a cada hijo
        foreach ($raices as $raiz) {
            foreach ($raiz->children as $hijo) {
                $hijo->loadSum(['movimientos as total_monto' => function ($q) use ($userId) {
                    $q->whereHas('cuentaOrigen', fn($q2) => $q2->where('user_id', $userId));
                }], 'monto');
            }
        }

        // También devolver subconceptos sueltos como lista flat para selectores
        $todos = ConceptoModel::where('user_id', $userId)
            ->with(['tipoMovimiento', 'parent'])
            ->get();

        return response()->json([
            'mensaje' => 'Lista de Conceptos',
            'data'    => $todos,     // lista flat para selectores (movimiento-form)
            'tree'    => $raices,    // árbol para la página de conceptos
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'             => 'required|string|max:255',
            'tipo_movimiento_id' => 'nullable|integer|exists:tipos_movimiento,id',
            'parent_id'          => 'nullable|integer|exists:conceptos,id',
            'color'              => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        try {
            $userId   = auth()->id();
            $parentId = $request->parent_id;
            $tipoId   = $request->tipo_movimiento_id;
            $color    = null;

            if ($parentId) {
                $parent = ConceptoModel::where('user_id', $userId)
                    ->whereNull('parent_id')          // padre debe ser raíz
                    ->where('es_sistema', false)       // no puede ser concepto de sistema
                    ->findOrFail($parentId);

                // Hereda el tipo del padre; ignora tipo_movimiento_id del body
                $tipoId = $parent->tipo_movimiento_id;
                $color  = null; // hijos no tienen color propio
            } else {
                if (!$tipoId) {
                    return response()->json(['mensaje' => 'tipo_movimiento_id es obligatorio para conceptos raíz'], 422);
                }
                $color = $request->color; // solo raíces guardan color
            }

            $concepto = ConceptoModel::create([
                'nombre'             => $request->nombre,
                'tipo_movimiento_id' => $tipoId,
                'user_id'            => $userId,
                'parent_id'          => $parentId,
                'color'              => $color,
            ]);

            $concepto->load(['tipoMovimiento', 'parent', 'children']);

            return response()->json([
                'mensaje' => 'Concepto creado exitosamente',
                'data'    => $concepto,
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'No se pudo crear el concepto',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        $data = ConceptoModel::where('user_id', auth()->id())
            ->with(['tipoMovimiento', 'parent', 'children'])
            ->findOrFail($id);

        return response()->json(['mensaje' => 'Concepto encontrado', 'data' => $data], 200);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre'             => 'sometimes|required|string|max:255',
            'tipo_movimiento_id' => 'nullable|integer|exists:tipos_movimiento,id',
            'parent_id'          => 'nullable|integer|exists:conceptos,id',
            'color'              => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        try {
            $userId   = auth()->id();
            $concepto = ConceptoModel::where('user_id', $userId)->findOrFail($id);

            if ($concepto->es_sistema) {
                return response()->json(['mensaje' => 'Los conceptos de sistema no se pueden modificar'], 403);
            }

            $updates = [];

            if ($request->has('nombre')) {
                $updates['nombre'] = $request->nombre;
            }

            // Cambio de color solo para raíces
            if ($request->has('color') && $concepto->isRoot()) {
                $updates['color'] = $request->color;
            }

            // Cambio de tipo solo para raíces sin hijos
            if ($request->has('tipo_movimiento_id') && $concepto->isRoot()) {
                if ($concepto->children()->exists()) {
                    return response()->json(['mensaje' => 'No se puede cambiar el tipo de un concepto que tiene subcategorías'], 422);
                }
                $updates['tipo_movimiento_id'] = $request->tipo_movimiento_id;
            }

            $concepto->update($updates);
            $concepto->load(['tipoMovimiento', 'parent', 'children']);

            return response()->json(['mensaje' => 'Concepto actualizado', 'data' => $concepto], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'No se pudo actualizar el concepto',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $userId   = auth()->id();
            $concepto = ConceptoModel::where('user_id', $userId)->findOrFail($id);

            if ($concepto->es_sistema) {
                return response()->json(['mensaje' => 'Los conceptos de sistema no se pueden eliminar'], 403);
            }

            if ($concepto->children()->exists()) {
                return response()->json([
                    'mensaje' => 'No se puede eliminar una categoría que tiene subcategorías. Eliminá primero las subcategorías.',
                ], 422);
            }

            $concepto->delete();

            return response()->json(['mensaje' => 'Concepto eliminado exitosamente'], 200);

        } catch (Exception $e) {
            return response()->json([
                'mensaje' => 'No se pudo eliminar el concepto',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
