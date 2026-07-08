<?php

namespace Tests\Feature;

use App\Models\ConceptoModel;
use App\Models\TipoMovimientoModel;
use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConceptoHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): UserModel
    {
        return UserModel::create([
            'name' => 'Test', 'email' => 'test' . uniqid() . '@example.com',
            'password' => 'password123', 'email_verified_at' => now(), 'role' => 'user',
        ]);
    }

    private function tipo(string $nombre): TipoMovimientoModel
    {
        return TipoMovimientoModel::where('nombre', $nombre)->first()
            ?? TipoMovimientoModel::forceCreate(['nombre' => $nombre]);
    }

    public function test_puede_editar_el_color_de_un_concepto_de_sistema(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $tipo = $this->tipo('Egreso');

        $concepto = ConceptoModel::create([
            'nombre' => 'Deuda auto-generada', 'tipo_movimiento_id' => $tipo->id,
            'user_id' => $user->id, 'es_sistema' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$concepto->id}", ['color' => '#ef4444']);

        $response->assertOk();
        $this->assertDatabaseHas('conceptos', ['id' => $concepto->id, 'color' => '#ef4444']);
    }

    public function test_rechaza_cambiar_el_nombre_de_un_concepto_de_sistema(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $tipo = $this->tipo('Egreso');

        $concepto = ConceptoModel::create([
            'nombre' => 'Deuda auto-generada', 'tipo_movimiento_id' => $tipo->id,
            'user_id' => $user->id, 'es_sistema' => true,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$concepto->id}", ['nombre' => 'Otro nombre']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('conceptos', ['id' => $concepto->id, 'nombre' => 'Deuda auto-generada']);
    }

    public function test_puede_convertir_una_categoria_en_subcategoria_de_otra_y_hereda_el_tipo(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $egreso = $this->tipo('Egreso');
        $ingreso = $this->tipo('Ingreso');

        $nuevoPadre = ConceptoModel::create([
            'nombre' => 'Alimentación', 'tipo_movimiento_id' => $egreso->id, 'user_id' => $user->id,
        ]);
        $aReasignar = ConceptoModel::create([
            'nombre' => 'Freelance', 'tipo_movimiento_id' => $ingreso->id, 'user_id' => $user->id,
            'color' => '#3b82f6',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$aReasignar->id}", ['parent_id' => $nuevoPadre->id]);

        $response->assertOk();
        $this->assertDatabaseHas('conceptos', [
            'id' => $aReasignar->id,
            'parent_id' => $nuevoPadre->id,
            'tipo_movimiento_id' => $egreso->id, // heredado del nuevo padre
            'color' => null, // los hijos no guardan color propio
        ]);
    }

    public function test_rechaza_convertir_en_subcategoria_un_concepto_que_ya_tiene_hijos(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $tipo = $this->tipo('Egreso');

        $conPadreYaHijos = ConceptoModel::create([
            'nombre' => 'Alimentación', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
        ]);
        ConceptoModel::create([
            'nombre' => 'Restaurantes', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
            'parent_id' => $conPadreYaHijos->id,
        ]);
        $otraRaiz = ConceptoModel::create([
            'nombre' => 'Transporte', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$conPadreYaHijos->id}", ['parent_id' => $otraRaiz->id]);

        $response->assertStatus(422);
    }

    public function test_rechaza_asignarse_a_si_mismo_como_padre(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $tipo = $this->tipo('Egreso');

        $concepto = ConceptoModel::create([
            'nombre' => 'Alimentación', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$concepto->id}", ['parent_id' => $concepto->id]);

        $response->assertStatus(422);
    }

    public function test_puede_promover_una_subcategoria_a_categoria_principal(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('t')->plainTextToken;
        $tipo = $this->tipo('Egreso');

        $padre = ConceptoModel::create([
            'nombre' => 'Alimentación', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
        ]);
        $hijo = ConceptoModel::create([
            'nombre' => 'Restaurantes', 'tipo_movimiento_id' => $tipo->id, 'user_id' => $user->id,
            'parent_id' => $padre->id,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/conceptos/{$hijo->id}", ['parent_id' => null, 'color' => '#22c55e']);

        $response->assertOk();
        $this->assertDatabaseHas('conceptos', [
            'id' => $hijo->id, 'parent_id' => null, 'color' => '#22c55e',
        ]);
    }
}
