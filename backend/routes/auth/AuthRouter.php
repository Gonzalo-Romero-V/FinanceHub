<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

// PUBLICAS
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
Route::post('/resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('verification.verify');
Route::get('/google', [AuthController::class, 'redirectToGoogle']);
Route::get('/google/callback', [AuthController::class, 'handleGoogleCallback']);

// PROTEGIDAS
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});