<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PushSubscriptionController;

Route::post('/', [PushSubscriptionController::class, 'store']);
Route::delete('/', [PushSubscriptionController::class, 'destroy']);
