<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserSettingsController;

// VER configuración del usuario
Route::get('/', [UserSettingsController::class, 'show']);

// ACTUALIZAR configuración
Route::patch('/', [UserSettingsController::class, 'update']);

// ONBOARDING (coach marks / carrusel de bienvenida)
Route::patch('/onboarding', [UserSettingsController::class, 'markOnboardingSeen']);
Route::post('/onboarding/reset', [UserSettingsController::class, 'resetOnboarding']);
