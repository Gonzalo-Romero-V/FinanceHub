<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimientoModel extends Model
{
    protected $table = 'movimientos';

    protected $primaryKey = 'id';

    protected $fillable = [
        'monto',
        'cuenta_origen_id',
        'cuenta_destino_id',
        'concepto_id',
        'nota',
        'fecha',
    ];

    protected $casts = [
        'monto' => 'float',
        'fecha' => 'datetime',
    ];

    // `fecha` se setea explícitamente en el controller al crear y queda inmutable
    // en updates. Desactivamos los timestamps automáticos de Eloquent.
    public $timestamps = false;

    public function concepto(){
        return $this->belongsTo(ConceptoModel::class, 'concepto_id');
    }

    public function cuentaOrigen(){
        return $this->belongsTo(CuentaModel::class, 'cuenta_origen_id');
    }

    public function cuentaDestino(){
        return $this->belongsTo(CuentaModel::class, 'cuenta_destino_id');
    }

}
