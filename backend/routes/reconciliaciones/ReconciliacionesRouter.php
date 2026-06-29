<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReconciliacionController;

// HISTORIAL de reconciliaciones de una cuenta
Route::get('/{cuentaId}/reconciliaciones', [ReconciliacionController::class, 'index']);

// CREAR reconciliación (+ ajuste opcional)
Route::post('/{cuentaId}/reconciliar', [ReconciliacionController::class, 'store']);
