<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TiposMovimientoSeeder extends Seeder
{

    public function run(): void
    {
        $tipos = ['Ingreso', 'Egreso', 'Transferencia'];
        foreach ($tipos as $tipo) {
            DB::table('tipos_movimiento')->insert([
                'nombre' => $tipo
            ]);
        }
    }
}




