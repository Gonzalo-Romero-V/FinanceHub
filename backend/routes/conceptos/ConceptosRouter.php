<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ConceptoController;


// CREAR       C
Route::post('/', [ConceptoController::class,'store']);

// LISTAR      R 
Route::get('/', [ConceptoController::class,'index']);

// BUSCAR      R 
Route::get('/{id}', [ConceptoController::class,'show']);

// EDITAR      U
Route::patch('/{id}', [ConceptoController::class,'update']);

// ELMIMINAR   D
Route::delete('/{id}', [ConceptoController::class,'destroy']);
