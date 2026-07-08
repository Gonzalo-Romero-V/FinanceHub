<?php

namespace Tests\Feature;

use App\Models\PushSubscriptionModel;
use App\Models\UserModel;
use App\Services\FcmSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Exception\Messaging\NotFound;
use Mockery;
use Tests\TestCase;

class FcmSenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_does_nothing_without_configured_credentials(): void
    {
        $user = UserModel::create([
            'name' => 'Test', 'email' => 'fcm1@example.com', 'password' => 'password123',
            'email_verified_at' => now(), 'role' => 'user',
        ]);
        PushSubscriptionModel::create([
            'user_id' => $user->id, 'tipo' => 'fcm', 'identificador' => 'token-abc', 'payload' => [],
        ]);

        // Sin FIREBASE_CREDENTIALS en el entorno de test: no debe explotar.
        $sender = new FcmSender();
        $sender->sendToUser($user->id, 'Título', 'Mensaje');

        $this->assertTrue(true); // llegar hasta acá sin excepción ya es la prueba
    }

    public function test_sends_to_each_fcm_subscription_and_ignores_web_ones(): void
    {
        $user = UserModel::create([
            'name' => 'Test', 'email' => 'fcm2@example.com', 'password' => 'password123',
            'email_verified_at' => now(), 'role' => 'user',
        ]);
        PushSubscriptionModel::create([
            'user_id' => $user->id, 'tipo' => 'fcm', 'identificador' => 'token-1', 'payload' => [],
        ]);
        PushSubscriptionModel::create([
            'user_id' => $user->id, 'tipo' => 'fcm', 'identificador' => 'token-2', 'payload' => [],
        ]);
        PushSubscriptionModel::create([
            'user_id' => $user->id, 'tipo' => 'web', 'identificador' => 'https://example.com/sub', 'payload' => [],
        ]);

        $messaging = Mockery::mock(Messaging::class);
        // Solo 2 llamadas: las 'fcm', la 'web' se ignora (le corresponde a WebPushSender).
        $messaging->shouldReceive('send')->twice();

        $sender = new FcmSender($messaging);
        $sender->sendToUser($user->id, 'Título', 'Mensaje');
    }

    public function test_prunes_subscription_on_not_found(): void
    {
        $user = UserModel::create([
            'name' => 'Test', 'email' => 'fcm3@example.com', 'password' => 'password123',
            'email_verified_at' => now(), 'role' => 'user',
        ]);
        PushSubscriptionModel::create([
            'user_id' => $user->id, 'tipo' => 'fcm', 'identificador' => 'token-expirado', 'payload' => [],
        ]);

        $messaging = Mockery::mock(Messaging::class);
        $messaging->shouldReceive('send')->andThrow(new NotFound('gone'));

        $sender = new FcmSender($messaging);
        $sender->sendToUser($user->id, 'Título', 'Mensaje');

        $this->assertDatabaseMissing('push_subscriptions', ['identificador' => 'token-expirado']);
    }
}
