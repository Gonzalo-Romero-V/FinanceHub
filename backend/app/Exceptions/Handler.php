<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Illuminate\Auth\AuthenticationException;

class Handler extends ExceptionHandler
{
    // Nivel de reportes personalizados
    protected $levels = [];

    // Excepciones que no se reportan
    protected $dontReport = [];

    // Inputs que no se muestran en flashes
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    // Registro de callbacks
    public function register(): void
    {
        //
    }

    // Renderizar excepciones en JSON para tu API
    public function render($request, Throwable $exception)
    {
        if ($exception instanceof AuthenticationException) {
            return response()->json([
                'message' => 'No autenticado'
            ], 401);
        }

        return parent::render($request, $exception);
    }
}