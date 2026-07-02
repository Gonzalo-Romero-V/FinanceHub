<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DeudaController;

Route::get('/', [DeudaController::class, 'index']);
Route::post('/', [DeudaController::class, 'store']);
Route::get('/{id}', [DeudaController::class, 'show']);
Route::patch('/{id}', [DeudaController::class, 'update']);
Route::delete('/{id}', [DeudaController::class, 'destroy']);
Route::post('/{deudaId}/cuotas/{cuotaId}/pagar', [DeudaController::class, 'pagarCuota']);
