import { Button } from "@/components/ui/button";

export default function MovimientosPage() {
    return (
            <section className="mx-auto max-w-4xl px-6 py-20 bg-background text-foreground">
                <h1 className="h1 mb-4">Movimientos</h1>
                <p className="body text-muted-foreground mb-8">
                    Aquí podrás registrar y gestionar todos tus movimientos financieros. 
                    Agrega ingresos, gastos, transferencias y observa cómo impactan en tu flujo de caja.
                </p>
                <table className="w-full table-auto border-collapse">
                    <thead>
                        <tr className="bg-secondary/50">
                            <th className="border px-4 py-2 text-left">Fecha</th>
                            <th className="border px-4 py-2 text-left">Concepto</th>
                            <th className="border px-4 py-2 text-right">Monto</th>
                            <th className="border px-4 py-2 text-left">Cuenta</th>
                            <th className="border px-4 py-2 text-left">Categoría</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border px-4 py-2">2024-06-01</td>
                            <td className="border px-4 py-2">Salario</td>
                            <td className="border px-4 py-2 text-right text-green-500">+ $3,000.00</td>
                            <td className="border px-4 py-2">Cuenta Corriente</td>
                            <td className="border px-4 py-2">Ingresos</td>
                        </tr>
                        <tr>
                            <td className="border px-4 py-2">2024-06-02</td>
                            <td className="border px-4 py-2">Renta</td>
                            <td className="border px-4 py-2 text-right text-red-500">- $1,200.00</td>
                            <td className="border px-4 py-2">Cuenta Corriente</td>
                            <td className="border px-4 py-2">Gastos</td>
                        </tr>
                        <tr>
                            <td className="border px-4 py-2">2024-06-03</td>
                            <td className="border px-4 py-2">Transferencia a Ahorros</td>
                            <td className="border px-4 py-2 text-right text-yellow-500">- $500.00</td>
                            <td className="border px-4 py-2">Cuenta Corriente</td>
                            <td className="border px-4 py-2">Transferencias</td>
                        </tr>
                    </tbody>
                </table>

                <Button className="small mt-4 hover:bg-brand-1 hover:text-white">Agregar Movimiento</Button>
            </section>
    )
}