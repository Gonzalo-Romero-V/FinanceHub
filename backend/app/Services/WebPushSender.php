<?php

namespace App\Services;

use App\Models\PushSubscriptionModel;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Envía un push real vía Web Push (VAPID) a cada suscripción 'web' del
 * usuario. FCM ('fcm') todavía no tiene sender — ver PENDIENTES.md M4 sobre
 * el proyecto de Firebase pendiente; las suscripciones 'fcm' se ignoran acá
 * sin error hasta que exista.
 */
class WebPushSender
{
    private function client(): ?WebPush
    {
        $publicKey = config('services.vapid.public_key');
        $privateKey = config('services.vapid.private_key');
        $subject = config('services.vapid.subject');

        if (!$publicKey || !$privateKey || !$subject) {
            return null;
        }

        return new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
    }

    public function sendToUser(int $userId, string $title, string $body, array $data = []): void
    {
        $webPush = $this->client();
        if (!$webPush) {
            Log::warning('WebPushSender: VAPID no configurado, se omite el envío.');
            return;
        }

        $subscriptions = PushSubscriptionModel::where('user_id', $userId)->where('tipo', 'web')->get();
        if ($subscriptions->isEmpty()) return;

        $payload = json_encode(['title' => $title, 'body' => $body] + $data);

        foreach ($subscriptions as $sub) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $sub->identificador,
                    'keys' => $sub->payload['keys'] ?? [],
                ]),
                $payload,
            );
        }

        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess() && $report->isSubscriptionExpired()) {
                PushSubscriptionModel::where('identificador', $report->getEndpoint())->delete();
            }
        }
    }
}
