<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CuentaController;


// CREAR       C
Route::post('/', [CuentaController::class,'store']);

// LISTAR      R 
Route::get('/', [CuentaController::class,'index']);

// BUSCAR      R 
Route::get('/{id}', [CuentaController::class,'show']);

// EDITAR      U
Route::patch('/{id}', [CuentaController::class,'update']);

// ELMIMINAR   D
Route::delete('/{id}', [CuentaController::class,'destroy']);
