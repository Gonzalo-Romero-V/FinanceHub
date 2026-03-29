<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TestGoogleRedirect extends Command
{
    // Nombre del comando que usarás en consola
    protected $signature = 'test:google-redirect';

    // Descripción del comando
    protected $description = 'Muestra el redirect URI de Google configurado en Laravel';

    public function handle()
    {
        // Imprime la URL de redirect de Google
        $this->info(config('services.google.redirect'));
    }
}