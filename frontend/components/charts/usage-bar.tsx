interface UsageBarProps {
  used: number;
  limit: number;
}

/** Barra angosta de "consultas usadas hoy / límite diario", debajo del botón de generar. */
export function UsageBar({ used, limit }: UsageBarProps) {
  if (limit <= 0) return null;

  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between xs text-muted-foreground">
        <span>Consultas al asistente hoy</span>
        <span className={atLimit ? "font-semibold text-destructive" : undefined}>
          {used}/{limit}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            atLimit ? "bg-destructive" : "bg-brand-1"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
