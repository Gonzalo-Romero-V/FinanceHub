<?php

namespace App\Models;

use App\Models\Concerns\SerializesDatesAsIso;
use Illuminate\Database\Eloquent\Model;

class ReconciliacionModel extends Model
{
    use SerializesDatesAsIso;

    protected $table = 'reconciliaciones';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'cuenta_id',
        'user_id',
        'saldo_real',
        'saldo_sistema',
        'diferencia',
        'movimiento_ajuste_id',
        'nota',
        'fecha',
    ];

    protected $casts = [
        'saldo_real'    => 'float',
        'saldo_sistema' => 'float',
        'diferencia'    => 'float',
        'fecha'         => 'datetime',
    ];

    public function cuenta()
    {
        return $this->belongsTo(CuentaModel::class, 'cuenta_id');
    }

    public function user()
    {
        return $this->belongsTo(UserModel::class, 'user_id');
    }

    public function movimientoAjuste()
    {
        return $this->belongsTo(MovimientoModel::class, 'movimiento_ajuste_id');
    }
}
