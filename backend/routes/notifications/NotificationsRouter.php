<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;

Route::get('/', [NotificationController::class, 'index']);
Route::patch('/{id}/leida', [NotificationController::class, 'markRead']);
Route::patch('/leer-todas', [NotificationController::class, 'markAllRead']);
