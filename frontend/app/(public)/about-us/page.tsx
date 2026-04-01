import {
  Wallet,
  ArrowRightLeft,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
export default function Tutorial() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 bg-background text-foreground">
      
      {/* HEADER PRINCIPAL */}
      <div className="mb-16 space-y-6 text-center md:text-left">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 small text-primary mb-4">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-1 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-1" />
          </span>
          Nosotros
        </div>

        <Logo />

        <p className="body text-muted-foreground max-w-2xl">
          Domina tu flujo de caja con un sistema diseñado para la precisión y la rapidez.
          Registro inteligente asistido por IA.
        </p>
      </div>

      <div className="grid gap-12">

        {/* VISIÓN GENERAL */}
        <section className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12">
          <div className="relative z-10 space-y-4">
            <h2 className="h2 flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Visión general
            </h2>

            <p className="body text-muted-foreground">
              FinanceHub no es solo una hoja de cálculo; es un ecosistema donde tus{" "}
              <span className="font-semibold text-foreground">cuentas</span>,{" "}
              <span className="font-semibold text-foreground">conceptos</span> y{" "}
              <span className="font-semibold text-foreground">movimientos</span>{" "}
              se sincronizan para darte una lectura real de tu salud financiera.
            </p>
          </div>

          <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-primary/5 rounded-full blur-3xl" />
        </section>

        {/* GRID PRINCIPAL */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* CUENTAS */}
          <section className="group rounded-2xl border bg-card p-6 transition hover:border-primary/20 hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <Wallet size={24} />
            </div>

            <h2 className="h3 mb-3">Cuentas</h2>

            <p className="body text-muted-foreground mb-6">
              El origen y destino de tus recursos. Desde efectivo hasta billeteras cripto.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <span className="h-2 w-2 rounded-full bg-chart-2" />
                <div>
                  <p className="small font-semibold">Activas</p>
                  <p className="xs text-muted-foreground">Saldos y ahorros</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <div>
                  <p className="small font-semibold">Pasivas</p>
                  <p className="xs text-muted-foreground">Deudas</p>
                </div>
              </div>
            </div>
          </section>

          {/* FLUJOS */}
          <section className="group rounded-2xl border bg-card p-6 transition hover:border-primary/20 hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <ArrowRightLeft size={24} />
            </div>

            <h2 className="h3 mb-3">Flujos de Dinero</h2>

            <p className="body text-muted-foreground mb-4">
              Cada transacción se categoriza para mantener trazabilidad total.
            </p>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 small">
                <ArrowUpRight className="w-4 h-4 text-chart-2" />
                <span className="font-medium">Ingreso</span>
              </li>

              <li className="flex items-center gap-2 small">
                <ArrowDownLeft className="w-4 h-4 text-destructive" />
                <span className="font-medium">Egreso</span>
              </li>

              <li className="flex items-center gap-2 small">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <span className="font-medium">Transferencia</span>
              </li>
            </ul>
          </section>
        </div>

        {/* CONCEPTOS + DASHBOARD */}
        <div className="grid md:grid-cols-2 gap-12 py-8 border-y border-border/50">
          <section className="space-y-4">
            <h2 className="h3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Conceptos Personalizados
            </h2>

            <p className="body text-muted-foreground">
              Clasifica tus gastos e ingresos con el nivel de detalle que necesites.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="h3 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Dashboard Inteligente
            </h2>

            <p className="body text-muted-foreground">
              Visualiza patrones y balance mensual en segundos.
            </p>
          </section>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 p-8 rounded-2xl bg-primary text-primary-foreground text-center dark:bg-brand-1">
        <h3 className="h3 mb-2 dark:text-foreground">¿Listo para empezar?</h3>
        <p className="small dark:text-foreground/80">
          Registra tu primer movimiento y deja que FinanceHub haga el trabajo pesado.
        </p>
      </div>
    </section>
  );
}
