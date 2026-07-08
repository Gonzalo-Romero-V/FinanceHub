<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;

class UserModel extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, MustVerifyEmailTrait;

    protected $table = 'users';

    /**
     * Campos asignables masivamente
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'provider',
        'provider_id',
        'role',
        'email_verified_at',
    ];

    /**
     * Campos ocultos en respuestas JSON
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Atributos calculados incluidos en la serialización.
     */
    protected $appends = [
        'has_password',
    ];

    /**
     * Casts automáticos
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * Indica si la cuenta ya tiene una contraseña propia seteada (puede ser
     * true en una cuenta Google que además configuró login híbrido). El
     * frontend lo usa para decidir si pedir "contraseña actual" al cambiarla.
     */
    public function getHasPasswordAttribute(): bool
    {
        return !is_null($this->attributes['password'] ?? null);
    }

    /**
     * Mutator: encripta password automáticamente
     */
    public function setPasswordAttribute($value)
    {
        if ($value) {
            $this->attributes['password'] = bcrypt($value);
        }
    }

    /**
     * Helpers de rol
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * Helper OAuth
     */
    public function isOAuth(): bool
    {
        return !is_null($this->provider);
    }

    /**
     * Envía el email de reset apuntando al frontend (no hay vistas Blade acá,
     * el backend es API-only) en vez del link web por defecto de Laravel.
     */
    public function sendPasswordResetNotification($token): void
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $url = $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($this->email);

        $this->notify(new ResetPasswordNotification($url));
    }

    /**
     * Envía el email de verificación con un link firmado que apunta directo
     * al backend (misma idea que el callback de Google: el link del email
     * pega acá, se valida, y de acá se redirige al frontend).
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification());
    }

    public function conceptos()
    {
        return $this->hasMany(ConceptoModel::class);
    }

    public function pushSubscriptions()
    {
        return $this->hasMany(PushSubscriptionModel::class, 'user_id');
    }
}