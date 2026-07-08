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

            // Los conceptos de sistema solo permiten cambiar el color — el
            // color es puramente visual, el resto (nombre, jerarquía, tipo)
            // sigue protegido porque son auto-generados y otras partes del
            // sistema dependen de su identidad.
            if ($concepto->es_sistema) {
                $camposProtegidos = array_intersect(['nombre', 'parent_id', 'tipo_movimiento_id'], array_keys($request->all()));
                if (!empty($camposProtegidos)) {
                    return response()->json(['mensaje' => 'Los conceptos de sistema solo permiten cambiar el color'], 403);
                }
            }

            $updates = [];

            if ($request->has('nombre')) {
                $updates['nombre'] = $request->nombre;
            }

            $cambiaJerarquia = $request->has('parent_id');
            $nuevoParentId   = $cambiaJerarquia ? $request->parent_id : $concepto->parent_id;
            $seraRaiz        = is_null($nuevoParentId);

            if ($cambiaJerarquia) {
                if ($nuevoParentId == $concepto->id) {
                    return response()->json(['mensaje' => 'Un concepto no puede ser su propio padre'], 422);
                }

                if ($seraRaiz) {
                    $updates['parent_id'] = null;
                } else {
                    // Evita crear un 3er nivel: si ya tiene subcategorías
                    // propias, no puede a su vez convertirse en subcategoría.
                    if ($concepto->children()->exists()) {
                        return response()->json([
                            'mensaje' => 'No se puede convertir en subcategoría un concepto que ya tiene subcategorías propias',
                        ], 422);
                    }

                    $nuevoPadre = ConceptoModel::where('user_id', $userId)
                        ->whereNull('parent_id')
                        ->where('es_sistema', false)
                        ->find($nuevoParentId);

                    if (!$nuevoPadre) {
                        return response()->json(['mensaje' => 'La nueva categoría padre no es válida'], 422);
                    }

                    // Hereda el tipo del nuevo padre, igual que al crear.
                    $updates['parent_id']          = $nuevoParentId;
                    $updates['tipo_movimiento_id']  = $nuevoPadre->tipo_movimiento_id;
                    $updates['color']               = null; // los hijos no guardan color propio
                }
            }

            // Cambio de color: permitido si el concepto es (o va a ser, según
            // este mismo request) una raíz — así promover a raíz y elegir
            // color de una vez quedan en el mismo submit.
            if ($request->has('color') && $seraRaiz) {
                $updates['color'] = $request->color;
            }

            // Cambio de tipo solo para raíces sin hijos, y solo si no se está
            // reasignando jerarquía en el mismo request (eso ya resuelve el
            // tipo más arriba, heredado del nuevo padre).
            if ($request->has('tipo_movimiento_id') && $seraRaiz && !$cambiaJerarquia) {
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
                    'mensaje' => 'No se puede eliminar una categoría que tiene subcategorías. Elimina primero las subcategorías.',
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
