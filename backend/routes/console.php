<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Requiere que el cron real del servidor llame a `php artisan schedule:run`
// cada minuto (estándar de Laravel) — sin eso, esto no dispara solo.
Schedule::command('notificaciones:reconciliaciones')->dailyAt('08:00');
Schedule::command('notificaciones:cuotas-deuda')->dailyAt('08:00');
