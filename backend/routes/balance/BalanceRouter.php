<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BalanceController;

Route::get('/', [BalanceController::class, 'index']);
