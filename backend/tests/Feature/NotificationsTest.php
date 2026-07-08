<?php

namespace Tests\Feature;

use App\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): UserModel
    {
        return UserModel::create([
            'name' => 'Test',
            'email' => 'test' . uniqid() . '@example.com',
            'password' => 'password123',
            'email_verified_at' => now(),
            'role' => 'user',
        ]);
    }

    private function seedNotification(UserModel $user, bool $read = false): DatabaseNotification
    {
        $notification = $user->notifications()->create([
            'id' => \Illuminate\Support\Str::uuid(),
            'type' => 'App\\Notifications\\ReconciliacionProximaNotification',
            'data' => ['titulo' => 'Reconciliación próxima', 'mensaje' => 'Tu cuenta X vence pronto'],
            'read_at' => $read ? now() : null,
        ]);

        return $notification;
    }

    public function test_lists_only_own_notifications_with_unread_count(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser();

        $this->seedNotification($user);
        $this->seedNotification($user, read: true);
        $this->seedNotification($other);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertEquals(1, $response->json('unread_count'));
    }

    public function test_mark_read_only_affects_own_notification(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser();
        $otherNotification = $this->seedNotification($other);

        $response = $this->actingAs($user)->patchJson("/api/notifications/{$otherNotification->id}/leida");

        $response->assertStatus(404);
        $this->assertNull($otherNotification->fresh()->read_at);
    }

    public function test_mark_read_marks_own_notification(): void
    {
        $user = $this->makeUser();
        $notification = $this->seedNotification($user);

        $response = $this->actingAs($user)->patchJson("/api/notifications/{$notification->id}/leida");

        $response->assertOk();
        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_mark_all_read(): void
    {
        $user = $this->makeUser();
        $this->seedNotification($user);
        $this->seedNotification($user);

        $this->actingAs($user)->patchJson('/api/notifications/leer-todas')->assertOk();

        $this->assertEquals(0, $user->unreadNotifications()->count());
    }

    public function test_register_push_subscription(): void
    {
        $user = $this->makeUser();

        $response = $this->actingAs($user)->postJson('/api/push-subscriptions', [
            'tipo' => 'web',
            'identificador' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'payload' => ['p256dh' => 'key', 'auth' => 'secret'],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'tipo' => 'web',
        ]);
    }

    public function test_registering_same_identificador_twice_updates_not_duplicates(): void
    {
        $user = $this->makeUser();
        $payload = [
            'tipo' => 'web',
            'identificador' => 'https://fcm.googleapis.com/fcm/send/dup',
            'payload' => ['p256dh' => 'key1', 'auth' => 'secret'],
        ];

        $this->actingAs($user)->postJson('/api/push-subscriptions', $payload)->assertCreated();
        $payload['payload']['p256dh'] = 'key2';
        $this->actingAs($user)->postJson('/api/push-subscriptions', $payload)->assertCreated();

        $this->assertEquals(1, \App\Models\PushSubscriptionModel::where('user_id', $user->id)->count());
    }

    public function test_delete_push_subscription(): void
    {
        $user = $this->makeUser();
        \App\Models\PushSubscriptionModel::create([
            'user_id' => $user->id,
            'tipo' => 'fcm',
            'identificador' => 'device-token-xyz',
            'payload' => [],
        ]);

        $this->actingAs($user)->deleteJson('/api/push-subscriptions', [
            'identificador' => 'device-token-xyz',
        ])->assertOk();

        $this->assertDatabaseMissing('push_subscriptions', ['identificador' => 'device-token-xyz']);
    }
}
