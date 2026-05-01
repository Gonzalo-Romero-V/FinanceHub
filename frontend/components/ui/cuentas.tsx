"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Cuenta = {
  id: number;
  nombre: string;
  tipo_cuenta: string;
  saldo: number;
  fecha_creacion: string;
  activa: boolean;
};

export function CuentasTableTest() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [cuentaActual, setCuentaActual] = useState(1);
  const [maxCuentas, setMaxCuentas] = useState(1);

  // Obtener total de cuentas
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
    fetch(`${baseUrl}/cuentas`)
      .then(res => res.json())
      .then(json => {
        if (json.data && Array.isArray(json.data)) {
          setMaxCuentas(json.data.length);
        }
      });
  }, []);

  // Obtener cuenta actual
  useEffect(() => {
    setIsTransitioning(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

    fetch(`${baseUrl}/cuentas/`)
      .then(res => res.json())
      .then(json => {
        const dataToNormalize = json.data;
        const normalizado = Array.isArray(dataToNormalize)
          ? dataToNormalize
          : dataToNormalize ? [dataToNormalize] : [];

        setCuentas(normalizado);
        setLoadingInicial(false);
        setIsTransitioning(false);
      });
  }, [cuentaActual]);

  if (loadingInicial) {
    return <p className="body text-muted-foreground">Cargando cuentas...</p>;
  }

  return (
    <>
      <table className="w-full border-collapse">
        <tbody
          className={`transition-opacity duration-200 ${
            isTransitioning ? "opacity-50" : "opacity-100"
          }`}
        >
          {cuentas.map((cuenta) => (
            <tr key={cuenta.id}>
              <td className="p-2">
                <div className="rounded-xl border bg-card p-4 flex justify-between">
                  
                  <div>
                    <div className="h3">{cuenta.nombre}</div>
                    <div className="small text-muted-foreground">
                      {cuenta.tipo_cuenta}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`h3 ${
                        cuenta.tipo_cuenta === "activo"
                          ? "text-brand-1"
                          : "text-destructive"
                      }`}
                    >
                      ${cuenta.saldo.toFixed(2)}
                    </div>
                    <div className="xs text-muted-foreground">
                      {cuenta.activa ? "Activa" : "Inactiva"}
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          disabled={cuentaActual === 1 || isTransitioning}
          onClick={() => setCuentaActual(c => c - 1)}
        >
          Anterior
        </Button>

        <Button
          disabled={cuentaActual === maxCuentas || isTransitioning}
          onClick={() => setCuentaActual(c => c + 1)}
        >
          Siguiente
        </Button>
      </div>
    </>
  );
}
