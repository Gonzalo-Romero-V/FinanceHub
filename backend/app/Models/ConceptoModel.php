<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConceptoModel extends Model
{
    protected $table = 'conceptos';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'tipo_movimiento_id',
        'user_id',
        'es_sistema',
        'parent_id',
        'color',
    ];

    protected $casts = [
        'es_sistema' => 'bool',
    ];

    public function tipoMovimiento()
    {
        return $this->belongsTo(TipoMovimientoModel::class, 'tipo_movimiento_id');
    }

    public function movimientos()
    {
        return $this->hasMany(MovimientoModel::class, 'concepto_id');
    }

    public function user()
    {
        return $this->belongsTo(UserModel::class);
    }

    public function parent()
    {
        return $this->belongsTo(ConceptoModel::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(ConceptoModel::class, 'parent_id');
    }

    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }
}
