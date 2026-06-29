<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSettingsModel extends Model
{
    protected $table = 'user_settings';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'reconciliacion_frecuencia_dias',
        'reconciliacion_proxima',
    ];

    protected $casts = [
        'reconciliacion_frecuencia_dias' => 'integer',
        'reconciliacion_proxima'         => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}
