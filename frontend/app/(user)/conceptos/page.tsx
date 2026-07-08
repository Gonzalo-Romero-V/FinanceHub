"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConceptoTree } from "@/components/custom/concepto-tree";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading, PageError } from "@/components/custom/page-state";
import { ConceptoForm } from "@/components/forms/concepto-form";
import { ConfirmDeleteModal } from "@/components/forms/confirm-delete-modal";
import { CoachMark } from "@/components/onboarding/coach-mark";

import { useAuth } from "@/lib/auth/context";
import {
  listConceptos,
  deleteConcepto,
  type Concepto,
} from "@/lib/api/conceptos";

export default function ConceptosPage() {
  const { token } = useAuth();
  const [tree, setTree] = useState<Concepto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Concepto | null>(null);
  const [deleteItem, setDeleteItem] = useState<Concepto | null>(null);
  const [addChildParent, setAddChildParent] = useState<Concepto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchConceptos = useCallback(async () => {
    if (!token) { setIsLoading(false); setError("Usuario no autenticado."); return; }
    setIsLoading(true);
    try {
      const res = await listConceptos(token);
      setTree(Array.isArray(res.tree) ? res.tree : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConceptos(); }, [fetchConceptos]);

  const handleDelete = async () => {
    if (!deleteItem || !token) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteConcepto(token, deleteItem.id);
      setDeleteItem(null);
      fetchConceptos();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (c: Concepto) => setEditItem(c);
  const handleAddChild = (parent: Concepto) => {
    setAddChildParent(parent);
    setShowCreate(true);
  };

  if (isLoading) return <PageLoading />;
  if (error) return <PageError message={error} />;

  const renderSection = (
    title: string,
    tipo: string,
    Icon: LucideIcon,
    colorClass: string,
  ) => {
    const raices = tree.filter(
      (c) => (c.tipo_movimiento?.nombre ?? "") === tipo,
    );

    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2 p-2 md:px-4">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground">({raices.length})</span>
        </div>
        <ConceptoTree
          conceptos={raices}
          colorClass={colorClass}
          onEdit={handleEdit}
          onDelete={(c) => { setDeleteError(null); setDeleteItem(c); }}
          onAddChild={handleAddChild}
        />
      </section>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Conceptos"
        description="Gestiona categorías y subcategorías. Asigna colores para identificarlas en todo el sistema."
        action={
          <Button
            className="small bg-brand-1 hover:bg-brand-1/90 text-white gap-2"
            onClick={() => { setAddChildParent(null); setShowCreate(true); }}
          >
            <Plus className="h-4 w-4" />
            Nuevo Concepto
          </Button>
        }
      />

      <CoachMark
        id="conceptos_subcategorias"
        text="Cada categoría puede desglosarse en subcategorías propias — toca el + junto a una categoría (ej. 'Comida' → 'Restaurantes', 'Supermercado'). Heredan el color y el tipo de la categoría padre."
        guideHref="/help"
      >
        <div className="space-y-10">
          {renderSection("Ingresos", "Ingreso", ArrowDownLeft, "text-chart-2")}
          {renderSection("Transferencias", "Transferencia", ArrowRightLeft, "text-brand-1")}
          {renderSection("Egresos", "Egreso", ArrowUpRight, "text-destructive")}
        </div>
      </CoachMark>

      {/* Modal crear / crear hijo */}
      <ConceptoForm
        open={showCreate}
        onClose={() => { setShowCreate(false); setAddChildParent(null); }}
        onSuccess={fetchConceptos}
        defaultParentId={addChildParent?.id ?? null}
      />

      {/* Modal editar */}
      <ConceptoForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSuccess={() => { setEditItem(null); fetchConceptos(); }}
        editItem={
          editItem
            ? {
                id: editItem.id,
                nombre: editItem.nombre,
                tipo_movimiento: editItem.tipo_movimiento?.nombre ?? "",
                parent_id: editItem.parent_id,
                color: editItem.color,
              }
            : null
        }
      />

      {/* Modal eliminar */}
      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => { setDeleteItem(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        itemName={deleteItem?.nombre}
        isLoading={isDeleting}
        errorMessage={deleteError ?? undefined}
      />
    </PageShell>
  );
}
