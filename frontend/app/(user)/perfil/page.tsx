"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/custom/page-shell";
import { PageHeader } from "@/components/custom/page-header";
import { PageLoading } from "@/components/custom/page-state";

import { useAuth } from "@/lib/auth/context";
import { updateUser, type UpdateUserPayload } from "@/lib/api/users";

interface ProfileFormState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

const EMPTY_PASSWORDS = { password: "", passwordConfirm: "" };

export default function PerfilPage() {
  const { user, token, loading, refreshSession } = useAuth();

  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    email: "",
    ...EMPTY_PASSWORDS,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: user.name ?? "", email: user.email ?? "" }));
  }, [user]);

  const isOAuth = Boolean(user?.provider);

  const initials = useMemo(() => {
    if (!user?.name) return "US";
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  const dirtyPayload = useMemo<UpdateUserPayload>(() => {
    if (!user) return {};
    const payload: UpdateUserPayload = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (trimmedName && trimmedName !== user.name) payload.name = trimmedName;
    if (trimmedEmail && trimmedEmail !== user.email) payload.email = trimmedEmail;
    if (form.password) payload.password = form.password;
    return payload;
  }, [form, user]);

  const hasChanges = Object.keys(dirtyPayload).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user || !token) {
      setError("Sesión no válida.");
      return;
    }

    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Email inválido.");
      return;
    }

    if (form.password || form.passwordConfirm) {
      if (form.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (form.password !== form.passwordConfirm) {
        setError("La confirmación de contraseña no coincide.");
        return;
      }
    }

    if (!hasChanges) {
      setError("No hay cambios para guardar.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(token, user.id, dirtyPayload);
      await refreshSession();
      setForm((f) => ({ ...f, ...EMPTY_PASSWORDS }));
      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) return <PageLoading label="Cargando perfil..." />;

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Mi perfil"
        description="Actualiza tus datos personales y la forma en que accedes a FinanceHub."
      />

      <div className="grid gap-6 md:grid-cols-[auto_1fr] items-start mb-8">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-1 text-2xl font-bold text-white shadow-md shadow-brand-1/20">
          {initials}
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="h3 text-foreground">{user.name}</h2>
            <p className="small text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge icon={ShieldCheck} label={`Rol: ${user.role ?? "user"}`} />
            <Badge
              icon={isOAuth ? CheckCircle2 : KeyRound}
              label={isOAuth ? `Conectado vía ${user.provider}` : "Cuenta con contraseña"}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormSection
          title="Datos personales"
          description="Estos datos identifican tu cuenta dentro de FinanceHub."
        >
          <Field
            id="profile-name"
            label="Nombre"
            icon={User}
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Tu nombre completo"
            disabled={isSaving}
          />
          <Field
            id="profile-email"
            type="email"
            label="Correo electrónico"
            icon={Mail}
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="correo@ejemplo.com"
            disabled={isSaving}
          />
        </FormSection>

        <FormSection
          title={isOAuth ? "Establecer contraseña" : "Cambiar contraseña"}
          description={
            isOAuth
              ? "Tu cuenta entra con un proveedor externo. Si configuras una contraseña, también podrás iniciar sesión con email + contraseña."
              : "Déjalo en blanco si no deseas cambiarla. Mínimo 6 caracteres."
          }
        >
          <Field
            id="profile-password"
            type="password"
            label="Nueva contraseña"
            icon={KeyRound}
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="••••••"
            disabled={isSaving}
            autoComplete="new-password"
          />
          <Field
            id="profile-password-confirm"
            type="password"
            label="Confirmar contraseña"
            icon={KeyRound}
            value={form.passwordConfirm}
            onChange={(v) => setForm((f) => ({ ...f, passwordConfirm: v }))}
            placeholder="••••••"
            disabled={isSaving}
            autoComplete="new-password"
          />
        </FormSection>

        {error && (
          <p className="small text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="small text-chart-2 bg-chart-2/10 border border-chart-2/20 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() =>
              setForm({ name: user.name, email: user.email, ...EMPTY_PASSWORDS })
            }
          >
            Descartar cambios
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="bg-brand-1 hover:bg-brand-1/90 text-white min-w-[140px]"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-5">
      <div>
        <h3 className="h3 text-foreground">{title}</h3>
        <p className="small text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
