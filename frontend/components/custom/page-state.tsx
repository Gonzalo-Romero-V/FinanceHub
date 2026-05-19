import { Loader2 } from "lucide-react";

import { PageShell } from "@/components/custom/page-shell";

export function PageLoading({ label = "Cargando..." }: { label?: string }) {
  return (
    <PageShell maxWidth="4xl" className="py-20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
        <p className="small">{label}</p>
      </div>
    </PageShell>
  );
}

export function PageError({ message, title = "Error" }: { message: string; title?: string }) {
  return (
    <PageShell maxWidth="4xl" className="py-20 text-center">
      <h2 className="h2 text-destructive">{title}</h2>
      <p className="body text-muted-foreground">{message}</p>
    </PageShell>
  );
}
