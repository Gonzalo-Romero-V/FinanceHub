"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { type Concepto, childConceptoColor } from "@/lib/api/conceptos";

interface ConceptoTreeProps {
  conceptos: Concepto[];          // lista de raíces (ya con .children cargados)
  colorClass: string;             // color del encabezado de sección (chart-2, destructive, etc.)
  onEdit: (c: Concepto) => void;
  onDelete: (c: Concepto) => void;
  onAddChild: (parent: Concepto) => void;
}

const COLOR_DEFAULT = "#64748b";

export function ConceptoTree({
  conceptos,
  colorClass,
  onEdit,
  onDelete,
  onAddChild,
}: ConceptoTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const total = conceptos.reduce(
    (sum, c) =>
      sum +
      (Number(c.total_monto) || 0) +
      (c.children?.reduce((s, h) => s + (Number(h.total_monto) || 0), 0) ?? 0),
    0,
  );

  if (conceptos.length === 0) {
    return (
      <p className="xs text-muted-foreground text-center py-6">
        No hay conceptos en esta sección.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {conceptos.map((raiz, idx) => {
        const hasChildren = (raiz.children?.length ?? 0) > 0;
        const isOpen = !collapsed.has(raiz.id);
        const dotColor = raiz.color ?? COLOR_DEFAULT;
        const raizTotal =
          (Number(raiz.total_monto) || 0) +
          (raiz.children?.reduce((s, h) => s + (Number(h.total_monto) || 0), 0) ?? 0);

        return (
          <div key={raiz.id} className={idx > 0 ? "border-t border-border" : ""}>
            {/* Fila padre */}
            <div className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              {/* Toggle árbol */}
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toggle(raiz.id)}
                aria-label={isOpen ? "Colapsar" : "Expandir"}
              >
                {hasChildren ? (
                  isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                ) : (
                  <span className="w-4 h-4 block" />
                )}
              </button>

              {/* Dot de color */}
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
              />

              {/* Nombre */}
              <span className="flex-1 text-sm font-medium text-foreground truncate">
                {raiz.nombre}
                {hasChildren && (
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({raiz.children!.length})
                  </span>
                )}
              </span>

              {/* Total */}
              <span className="text-sm font-medium tabular-nums text-foreground/70 shrink-0">
                {formatCurrency(raizTotal)}
              </span>

              {/* Acciones */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                  onClick={() => onAddChild(raiz)}
                  title="Agregar subcategoría"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                  onClick={() => onEdit(raiz)}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(raiz)}
                  title={hasChildren ? "Eliminá primero las subcategorías" : "Eliminar"}
                  disabled={hasChildren}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Filas hijas */}
            {hasChildren && isOpen && (
              <div className="border-t border-border/50 bg-muted/10">
                {raiz.children!.map((hijo, hIdx) => (
                  <div
                    key={hijo.id}
                    className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors pl-12 ${
                      hIdx < raiz.children!.length - 1 ? "border-b border-border/30" : ""
                    }`}
                  >
                    {/* Dot suavizado */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: childConceptoColor(dotColor) }}
                    />

                    <span className="flex-1 text-sm text-foreground/80 truncate">
                      {hijo.nombre}
                    </span>

                    <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                      {formatCurrency(Number(hijo.total_monto) || 0)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10"
                        onClick={() => onEdit(hijo)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(hijo)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer con total */}
      <div className="border-t-2 border-border bg-muted/10 px-4 py-2.5 flex items-center justify-between">
        <span className="xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
        <span className={`text-sm font-bold ${colorClass}`}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
