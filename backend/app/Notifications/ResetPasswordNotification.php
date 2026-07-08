<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $url)
    {
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $greeting = $notifiable->name ? "Hola {$notifiable->name}," : 'Hola,';

        return (new MailMessage)
            ->subject('Restablece tu contraseña — FinanceHub')
            ->greeting($greeting)
            ->line('Recibimos una solicitud para restablecer la contraseña de tu cuenta.')
            ->action('Restablecer contraseña', $this->url)
            ->line('Este enlace vence en 60 minutos.')
            ->line('Si no pediste esto, puedes ignorar este email — tu contraseña actual sigue funcionando.');
    }
}
