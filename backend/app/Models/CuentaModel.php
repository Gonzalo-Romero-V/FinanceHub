<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\TipoCuentaModel;

class CuentaModel extends Model
{
    protected $table = 'cuentas';
    protected $primaryKey = 'id';

    protected $fillable = ['nombre', 'tipo_cuenta_id', 'saldo', 'activa', 'user_id'];

    protected $casts = [
        'saldo' => 'float',
        'activa' => 'bool'
    ];

    public $timestamps = true;
    const CREATED_AT = 'fecha_creacion';
    const UPDATED_AT = null;

    public function movimientosIngreso()
    {
        return $this->hasMany(MovimientoModel::class, 'cuenta_destino_id');
    }

    public function movimientosEgreso()
    {
        return $this->hasMany(MovimientoModel::class, 'cuenta_origen_id');
    }

    public function tipoCuenta()
    {
        return $this->belongsTo(TipoCuentaModel::class, 'tipo_cuenta_id');
    }

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }
}