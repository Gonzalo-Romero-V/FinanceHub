<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuotaModel extends Model
{
    public $timestamps = false;

    protected $table = 'cuotas';

    protected $fillable = [
        'deuda_id',
        'numero_cuota',
        'fecha_vencimiento',
        'cuota_total',
        'capital',
        'interes',
        'saldo_restante',
        'pagada',
        'fecha_pago',
        'movimiento_id',
    ];

    protected $casts = [
        'cuota_total'       => 'float',
        'capital'           => 'float',
        'interes'           => 'float',
        'saldo_restante'    => 'float',
        'pagada'            => 'boolean',
        'fecha_vencimiento' => 'date',
        'fecha_pago'        => 'datetime',
    ];

    public function deuda()
    {
        return $this->belongsTo(DeudaModel::class, 'deuda_id');
    }

    public function movimiento()
    {
        return $this->belongsTo(MovimientoModel::class, 'movimiento_id');
    }
}
