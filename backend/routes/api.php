<?php

use Illuminate\Support\Facades\Route;

// =====================
// PUBLICAS
// =====================

// Test
Route::get('/', function () {
    return response()->json(['message' => 'Hello from API']);
});

// Alias for Google OAuth callback matching the GOOGLE_REDIRECT env variable
Route::get('/login/google/callback', [\App\Http\Controllers\AuthController::class, 'handleGoogleCallback']);

// AUTH (public + protected dentro del router)
Route::prefix('auth')->group(function () {
    require __DIR__ . '/auth/AuthRouter.php';
});


// =====================
// PROTEGIDAS
// =====================

Route::middleware('auth:sanctum')->group(function () {

    // =====================
    // CUENTAS
    // =====================
    Route::prefix('cuentas')->group(function () {
        require __DIR__ . '/cuentas/CuentasRouter.php';
    });

    // =====================
    // CONCEPTOS
    // =====================
    Route::prefix('conceptos')->group(function () {
        require __DIR__ . '/conceptos/ConceptosRouter.php';
    });

    // =====================
    // MOVIMIENTOS
    // =====================
    Route::prefix('movimientos')->group(function () {
        require __DIR__ . '/movimientos/MovimientosRouter.php';
    });

    // =====================
    // TIPOS MOVIMIENTO
    // =====================
    Route::prefix('tipos-movimiento')->group(function () {
        require __DIR__ . '/tipo_movimiento/TiposMovimientoRouter.php';
    });


    // =====================
    // USERS
    // =====================
    Route::prefix('users')->group(function () {
        require __DIR__ . '/users/UsersRouter.php';
    });

});