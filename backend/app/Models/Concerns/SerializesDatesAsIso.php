<?php

namespace App\Models\Concerns;

use DateTimeInterface;
use DateTimeZone;

/**
 * Fuerza la serialización JSON de columnas datetime a ISO 8601 UTC con sufijo Z.
 *
 * Sin este trait, Laravel emite "2026-05-19 03:15:00" sin información de zona,
 * y los clientes JavaScript (`new Date(...)`) interpretan ese string como hora
 * LOCAL, produciendo un desfase equivalente al offset del cliente.
 */
trait SerializesDatesAsIso
{
    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s.u\Z');
    }
}
