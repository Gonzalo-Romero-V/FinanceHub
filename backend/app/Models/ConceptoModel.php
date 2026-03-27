<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConceptoModel extends Model
{
    protected $table = 'conceptos';
    
    protected $primaryKey = 'id';

    protected $fillable = [
        'nombre',
        'tipo_movimiento_id'
    ];

    public $timestamps = false;


    public function tipoMovimiento(){
        return $this->belongsTo(TipoMovimientoModel::class, 'tipo_movimiento_id');
    }

    public function movimientos(){
        return $this->hasMany(MovientoModel::class,'concepto_id');
    }
}
