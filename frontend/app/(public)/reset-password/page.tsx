"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { resetPasswordRequest } from "@/lib/auth/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const linkInvalido = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordRequest({
        token,
        email,
        password,
        password_confirmation: passwordConfirm,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="h2">Restablecer contraseña</CardTitle>
            <CardDescription>Elige una nueva contraseña para tu cuenta.</CardDescription>
          </CardHeader>

          {linkInvalido ? (
            <CardContent>
              <FormError message="Este enlace no es válido. Pide uno nuevo desde “¿Olvidaste tu contraseña?”." />
            </CardContent>
          ) : done ? (
            <CardContent>
              <div className="small p-3 rounded bg-chart-2/10 text-chart-2">
                Contraseña restablecida. Te llevamos a iniciar sesión...
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && <FormError message={error} />}
                <div className="space-y-1">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="passwordConfirm">Confirmar contraseña</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold bg-brand-1 hover:bg-brand-1/90 text-white"
                  size="lg"
                >
                  {loading ? "Guardando..." : "Restablecer contraseña"}
                </Button>
              </CardContent>
            </form>
          )}

          <CardFooter className="justify-center">
            <Link href="/login" className="small text-muted-foreground hover:text-brand-1 hover:underline">
              Volver a iniciar sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
