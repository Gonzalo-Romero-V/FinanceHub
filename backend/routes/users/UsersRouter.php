<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;


// LISTAR (solo admin)
Route::get('/', [UserController::class, 'index']);

// BUSCAR
Route::get('/{id}', [UserController::class, 'show'])->where('id', '[0-9]+');

// ACTUALIZAR
Route::patch('/{id}', [UserController::class, 'update']);

// ELIMINAR
Route::delete('/{id}', [UserController::class, 'destroy']);