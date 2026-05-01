<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoCuentaModel extends Model
{
    protected $table = 'tipos_cuenta';
    protected $primaryKey = 'id';

    protected $fillable = ['nombre'];

    public $timestamps = false;

    public function cuentas()
    {
        return $this->hasMany(CuentaModel::class, 'tipo_cuenta_id');
    }
}