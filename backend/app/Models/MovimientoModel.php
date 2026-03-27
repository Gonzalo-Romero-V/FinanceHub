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
        ];
    
    protected $casts = [
        'monto' => 'float',
    ];

    public $timestamps = true;
    const CREATED_AT = null;
    const UPDATED_AT = 'fecha';

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
