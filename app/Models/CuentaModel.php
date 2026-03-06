<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuentaModel extends Model
{
    protected $table = 'cuentas';

    protected $primaryKey = 'id';

    protected $fillable = ['nombre', 'tipo_cuenta', 'saldo', 'activa'];

    protected $casts = [
                        'saldo'=>'float',
                        'activa'=>'bool'
                        ];

    public $timestamps = true;

    const CREATED_AT = 'fecha_creacion';
    const UPDATED_AT = null;

    public function movimientosIngreso(){
        return $this->hasMany(MovimientoModel::class,'cuenta_destino_id');
    }

    public function movimientosEgreso(){
        return $this->hasMany(MovimientoModel::class,'cuenta_origen_id');
    }


}
