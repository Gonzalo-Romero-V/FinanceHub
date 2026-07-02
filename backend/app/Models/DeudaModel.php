<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeudaModel extends Model
{
    protected $table = 'deudas';

    protected $fillable = [
        'user_id',
        'nombre',
        'acreedor',
        'sistema',
        'monto_original',
        'plazo_meses',
        'fecha_inicio',
        'tasa_mensual',
        'cuota_directa',
        'total_informal',
        'notas',
        'estado',
    ];

    protected $casts = [
        'monto_original' => 'float',
        'tasa_mensual'   => 'float',
        'cuota_directa'  => 'float',
        'total_informal' => 'float',
        'plazo_meses'    => 'integer',
    ];

    public function cuotas()
    {
        return $this->hasMany(CuotaModel::class, 'deuda_id')->orderBy('numero_cuota');
    }

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}
