<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserSettingsController;

// VER configuración del usuario
Route::get('/', [UserSettingsController::class, 'show']);

// ACTUALIZAR configuración
Route::patch('/', [UserSettingsController::class, 'update']);
