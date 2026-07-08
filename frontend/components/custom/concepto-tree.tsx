"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import { type Concepto, childConceptoColor } from "@/lib/api/conceptos";

interface ConceptoTreeProps {
  conceptos: Concepto[];          // lista de raíces con .children cargados
  colorClass: string;             // color del total footer (ej. "text-chart-2")
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
    <div className="w-full bg-background">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/30 backdrop-blur-sm z-10">
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-8" />
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold">
              Nombre
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70 font-bold text-right">
              Total
            </TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {conceptos.map((raiz) => {
            const hasChildren = (raiz.children?.length ?? 0) > 0;
            const isOpen = !collapsed.has(raiz.id);
            const dotColor = raiz.color ?? COLOR_DEFAULT;
            const raizTotal =
              (Number(raiz.total_monto) || 0) +
              (raiz.children?.reduce((s, h) => s + (Number(h.total_monto) || 0), 0) ?? 0);

            return [
              /* Fila padre */
              <TableRow key={`raiz-${raiz.id}`} className="group">
                <TableCell className="pr-0">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggle(raiz.id)}
                    aria-label={isOpen ? "Colapsar" : "Expandir"}
                  >
                    {hasChildren ? (
                      isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 block" />
                    )}
                  </button>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="text-sm font-medium text-foreground">{raiz.nombre}</span>
                    {hasChildren && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({raiz.children!.length})
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right tabular-nums text-sm font-medium text-foreground/70">
                  {formatCurrency(raizTotal)}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
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
                      title={hasChildren ? "Elimina primero las subcategorías" : "Eliminar"}
                      disabled={hasChildren}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>,

              /* Filas hijas */
              ...(hasChildren && isOpen
                ? raiz.children!.map((hijo) => (
                    <TableRow key={`hijo-${hijo.id}`} className="group bg-muted/10 hover:bg-muted/20">
                      <TableCell />
                      <TableCell className="pl-10">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: childConceptoColor(dotColor) }}
                          />
                          <span className="text-sm text-foreground/80">{hijo.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {formatCurrency(Number(hijo.total_monto) || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
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
                      </TableCell>
                    </TableRow>
                  ))
                : []),
            ];
          })}
        </TableBody>
      </Table>

      {/* Footer con total */}
      <div className="border-t-2 border-border bg-muted/10 px-4 py-2.5 flex items-center justify-between">
        <span className="xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
        <span className={`text-sm font-bold tabular-nums ${colorClass}`}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
