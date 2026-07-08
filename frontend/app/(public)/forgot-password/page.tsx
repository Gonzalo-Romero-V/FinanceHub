"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { forgotPasswordRequest } from "@/lib/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPasswordRequest(email);
      setSent(true);
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
            <CardTitle className="h2">¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription>
              Ingresá tu email y te mandamos un enlace para restablecerla.
            </CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent className="space-y-4">
              <div className="small p-3 rounded bg-chart-2/10 text-chart-2">
                Si el email existe en nuestro sistema, vas a recibir un enlace para restablecer tu
                contraseña. Revisá también la carpeta de spam.
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && <FormError message={error} />}
                <div className="space-y-1">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold bg-brand-1 hover:bg-brand-1/90 text-white"
                  size="lg"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
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
