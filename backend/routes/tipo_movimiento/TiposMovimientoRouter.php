<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TipoMovimientoController;



// LISTAR      R 
Route::get('/', [TipoMovimientoController::class,'index']);

// BUSCAR      R 
Route::get('/{id}', [TipoMovimientoController::class,'show']);

