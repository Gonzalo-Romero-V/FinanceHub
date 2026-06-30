<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PresupuestoController;

Route::get('/', [PresupuestoController::class, 'index']);
Route::post('/', [PresupuestoController::class, 'store']);
Route::get('/{id}', [PresupuestoController::class, 'show']);
Route::patch('/{id}', [PresupuestoController::class, 'update']);
Route::delete('/{id}', [PresupuestoController::class, 'destroy']);
