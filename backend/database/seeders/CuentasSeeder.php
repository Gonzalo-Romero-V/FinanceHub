<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class CuentasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $cuentas = [
            ['nombre' => 'Efectivo', 'tipo_cuenta_id' => 1, 'saldo' => 0, 'activa' => true, 'user_id' => 1],
            ['nombre' => 'Banco Ejemplo', 'tipo_cuenta_id' => 2, 'saldo' => 0, 'activa' => true, 'user_id' => 1],
        ];
        foreach ($cuentas as $cuenta) {
            DB::table('cuentas')->insert($cuenta);
        }
    }
}
