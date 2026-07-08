<?php

namespace App\Services;

use App\Models\PushSubscriptionModel;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Kreait\Firebase\Messaging\CloudMessage;

/**
 * Envía un push real vía FCM a cada suscripción 'fcm' del usuario. Mismo
 * patrón que WebPushSender: silencioso (no rompe la request que dispara la
 * notificación) si Firebase no está configurado o si el envío falla.
 */
class FcmSender
{
    /**
     * OJO: $messaging NO lleva el tipo `Messaging` en la firma a propósito
     * — si lo tuviera, el contenedor de Laravel intenta resolverlo (y por
     * lo tanto instanciar el Factory de Firebase) apenas se construye
     * FcmSender, aunque el valor por default sea null. Como el Factory
     * explota si no hay credenciales configuradas, eso rompía CUALQUIER
     * notificación (incluso solo-database) en cuanto FcmChannel entraba en
     * el via(), aunque nunca se llegara a usar Firebase de verdad. Sin el
     * tipo, el contenedor no intenta resolver nada y usa null tal cual.
     * Solo se pasa un valor real en los tests (mock).
     */
    public function __construct(private mixed $messaging = null)
    {
    }

    private function client(): ?Messaging
    {
        if ($this->messaging instanceof Messaging) return $this->messaging;

        if (!env('FIREBASE_CREDENTIALS') && !env('GOOGLE_APPLICATION_CREDENTIALS')) {
            return null;
        }

        try {
            return app(Messaging::class);
        } catch (\Throwable $e) {
            Log::warning('FcmSender: Firebase no está configurado, se omite el envío.', ['error' => $e->getMessage()]);
            return null;
        }
    }

    public function sendToUser(int $userId, string $title, string $body, array $data = []): void
    {
        $messaging = $this->client();
        if (!$messaging) return;

        $subscriptions = PushSubscriptionModel::where('user_id', $userId)->where('tipo', 'fcm')->get();
        if ($subscriptions->isEmpty()) return;

        foreach ($subscriptions as $sub) {
            $message = CloudMessage::new()
                ->withToken($sub->identificador)
                ->withNotification(['title' => $title, 'body' => $body])
                ->withData(array_map('strval', $data));

            try {
                $messaging->send($message);
            } catch (NotFound $e) {
                // Token ya no es válido (app desinstalada, etc.) — se limpia.
                $sub->delete();
            } catch (\Throwable $e) {
                Log::warning('FcmSender: fallo al enviar push.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            }
        }
    }
}
