<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushSubscriptionModel extends Model
{
    protected $table = 'push_subscriptions';

    protected $fillable = [
        'user_id',
        'tipo',
        'identificador',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}
