<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PresupuestoModel extends Model
{
    protected $table = 'presupuestos';

    protected $fillable = [
        'user_id',
        'concepto_id',
        'monto',
        'ventana',
        'umbrales',
        'activo',
    ];

    protected $casts = [
        'monto'   => 'float',
        'umbrales' => 'array',
        'activo'  => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    public function concepto()
    {
        return $this->belongsTo(ConceptoModel::class, 'concepto_id');
    }
}
