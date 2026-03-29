<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConceptosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userId = 1; // Asigna al usuario que ya existe en la tabla users

        $conceptos = [
            ['nombre' => 'Alimentación', 'tipo_movimiento_id' => 2, 'user_id' => $userId], // Egreso
            ['nombre' => 'Transporte', 'tipo_movimiento_id' => 2, 'user_id' => $userId],
            ['nombre' => 'Salario', 'tipo_movimiento_id' => 1, 'user_id' => $userId], // Ingreso
            ['nombre' => 'Transferencia Interna', 'tipo_movimiento_id' => 3, 'user_id' => $userId] // Transferencia
        ];

        foreach ($conceptos as $concepto) {
            DB::table('conceptos')->insert($concepto);
        }
    }
}