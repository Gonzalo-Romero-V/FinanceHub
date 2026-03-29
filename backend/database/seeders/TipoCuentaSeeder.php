<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoCuentaSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = ['Activo', 'Pasivo'];

        foreach ($tipos as $tipo) {
            DB::table('tipos_cuenta')->insert([
                'nombre' => $tipo
            ]);
        }
    }
}