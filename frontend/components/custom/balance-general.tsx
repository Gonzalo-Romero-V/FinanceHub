"use client"

import { Card } from "@/components/ui/card"

interface BalanceGeneralProps {
  totalActivos: number;
  totalPasivos: number;
}

export function BalanceGeneral({ totalActivos, totalPasivos }: BalanceGeneralProps) {
  const balance = totalActivos - totalPasivos;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <Card className="p-8 mb-8 border-none shadow-md bg-card/50 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Izquierda: Texto Balance General */}
        <div className="flex flex-col">
          <span className="text-2xl md:text-3xl font-black tracking-tight text-muted-foreground uppercase">
            Balance General
          </span>
        </div>

        {/* Derecha: Números apilados */}
        <div className="flex flex-col items-end w-full md:w-auto">
          {/* Número Grande Principal */}
          <span className="text-5xl md:text-6xl font-black tracking-tighter text-brand-1 drop-shadow-sm leading-none mb-4">
            {formatCurrency(balance)}
          </span>
          
          {/* Totales secundarios debajo, alineados a la derecha */}
          <div className="flex flex-col sm:flex-row gap-x-8 gap-y-1 items-end sm:items-center">
            <div className="flex items-center gap-2">
              <span className="xs uppercase tracking-wider text-muted-foreground font-bold">Activos:</span>
              <span className="body text-chart-3 font-extrabold">
                {formatCurrency(totalActivos)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="xs uppercase tracking-wider text-muted-foreground font-bold">Pasivos:</span>
              <span className="body text-chart-7 font-extrabold">
                {formatCurrency(totalPasivos)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
