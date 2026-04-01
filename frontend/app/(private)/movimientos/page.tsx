"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/custom/custom-table";
import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";

// Definimos el tipo para un movimiento
interface Movimiento {
  id: number;
  fecha: string;
  concepto: string;
  monto: number;
  cuenta: string;
  tipo_movimiento: 'Ingreso' | 'Egreso' | 'Transferencia';
}

export default function MovimientosPage() {
  const { user, token } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovimientos = async () => {
      if (!token) {
        setIsLoading(false);
        setError("Usuario no autenticado.");
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await fetch(`${baseUrl}/movimientos`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Leemos el cuerpo de la respuesta UNA SOLA VEZ como texto.
          const errorText = await response.text();
          let errorMessage = errorText;
          try {
            // Intentamos interpretar el texto como JSON.
            const errorJson = JSON.parse(errorText);
            // Si es JSON y tiene una propiedad 'message', la usamos.
            errorMessage = errorJson.message || errorText;
          } catch (e) {
            // Si no es JSON, simplemente usamos el texto del error.
          }
          throw new Error(`Error ${response.status}: ${errorMessage}`);
        }

        const data = await response.json();
        
        const formattedData: Movimiento[] = data.map((item: any) => ({
          id: item.id,
          fecha: new Date(item.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          concepto: item.concepto?.nombre ?? 'N/A',
          monto: item.monto,
          cuenta: item.cuenta_origen?.nombre ?? 'N/A', 
          tipo_movimiento: item.concepto?.tipo_movimiento?.nombre ?? 'N/A',
        }));

        setMovimientos(formattedData);
      } catch (err: any) {
        setError(err.message || "Ocurrió un error inesperado.");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchMovimientos();
    }
  // CORRECCIÓN 1: La dependencia debe ser el token, no el usuario.
  }, [token]);



  const columns: (keyof Movimiento)[] = ['fecha', 'concepto', 'monto', 'cuenta', 'tipo_movimiento'];
  const columnHeaders: Record<keyof Movimiento, string> = {
    id: "ID",
    fecha: "Fecha",
    concepto: "Concepto",
    monto: "Monto",
    cuenta: "Cuenta",
    tipo_movimiento: "Tipo",
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="h2 text-destructive">Error</h2>
        <p className="body text-muted-foreground">{error}</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-12 md:py-16 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="h1 mb-2">Movimientos</h1>
          <p className="body text-muted-foreground max-w-2xl">
            Aquí podrás registrar y gestionar todos tus movimientos financieros.
            Filtra por fecha para analizar períodos específicos.
          </p>
        </div>
        <Button className="small mt-4 md:mt-0 hover:bg-brand-1 hover:text-white">
          Agregar Movimiento
        </Button>
      </div>

      <CustomTable<Movimiento>
        title="Historial de Movimientos"
        data={movimientos}
        columns={columns}
        columnHeaders={columnHeaders}
        rowsOnDisplay={8}
        dateFilter={true}
        dateFilterColumn="fecha"
      />
    </section>
  )
}