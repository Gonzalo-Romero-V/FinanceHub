<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoMovimientoModel extends Model
{

    protected $table = 'tipos_movimiento';

    protected $primaryKey = 'id';

    public $timestamps = false;

    public function conceptos(){
        return $this->hasMany(ConceptoModel::class, 'tipo_movimiento_id');
    }

    
}