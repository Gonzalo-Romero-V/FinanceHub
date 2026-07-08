<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        $greeting = $notifiable->name ? "Hola {$notifiable->name}," : 'Hola,';

        return (new MailMessage)
            ->subject('Confirma tu cuenta — FinanceHub')
            ->greeting($greeting)
            ->line('Gracias por registrarte en FinanceHub. Confirma tu email para poder iniciar sesión.')
            ->action('Confirmar email', $url)
            ->line('Este enlace vence en 60 minutos.')
            ->line('Si no creaste esta cuenta, puedes ignorar este email.');
    }
}
