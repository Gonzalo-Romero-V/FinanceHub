<?php
use Illuminate\Support\Facades\Route;

// Hola Mundo API
Route::get('/', function () {
    return response()->json(['message' => 'Hello from API']);
});

// Rutas de cuentas
Route::prefix('cuentas')->group(function(){
    require __DIR__ . '/cuentas/CuentasRouter.php'; 
});

// Rutas de conceptos
Route::prefix('conceptos')->group(function(){
    require __DIR__. '/conceptos/ConceptosRouter.php';
});

// Rutas de movimientos
Route::prefix('movimientos')->group(function(){
    require __DIR__. '/movimientos/MovimientosRouter.php';
});

// Rutas de tipo_movimiento
Route::prefix('tipos-movimiento')->group(function(){
    require __DIR__. '/tipo_movimiento/TiposMovimientoRouter.php';
});

