<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Antes de esta migración no existía verificación de email obligatoria — se
 * agrega ahora, bloqueante SOLO para cuentas nuevas (ver AuthController::
 * login/register). Las cuentas ya existentes se "confirman" retroactivamente
 * acá para no dejarlas bloqueadas de un día para el otro por una regla que
 * no existía cuando se registraron.
 */
return new class extends Migration
{
    public function up(): void
    {
        // CURRENT_TIMESTAMP es SQL estándar (Postgres/SQLite/MySQL), a
        // diferencia de NOW() que Postgres soporta pero SQLite (usado en
        // tests) no.
        DB::table('users')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)')]);
    }

    public function down(): void
    {
        // Irreversible a propósito: no hay forma de distinguir qué filas
        // fueron confirmadas de verdad vs. backfilleadas acá.
    }
};
