<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MovimientoController;


// CREAR       C
Route::post('/', [MovimientoController::class,'store']);

// LISTAR      R 
Route::get('/', [MovimientoController::class,'index']);

// BUSCAR      R 
Route::get('/{id}', [MovimientoController::class,'show']);

// EDITAR      U
Route::patch('/{id}', [MovimientoController::class,'update']);

// ELMIMINAR   D
Route::delete('/{id}', [MovimientoController::class,'destroy']);
