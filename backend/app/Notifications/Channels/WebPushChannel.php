<?php

namespace App\Notifications\Channels;

use App\Services\WebPushSender;
use Illuminate\Notifications\Notification;

class WebPushChannel
{
    public function __construct(private WebPushSender $sender)
    {
    }

    public function send($notifiable, Notification $notification): void
    {
        if (!method_exists($notification, 'toWebPush')) return;

        $payload = $notification->toWebPush($notifiable);
        if (!$payload) return;

        $this->sender->sendToUser(
            $notifiable->getKey(),
            $payload['title'],
            $payload['body'],
            $payload['data'] ?? [],
        );
    }
}
