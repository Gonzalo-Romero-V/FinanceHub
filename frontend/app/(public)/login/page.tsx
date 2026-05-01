"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/app/context/AuthContext"
import { loginRequest, registerRequest } from "@/lib/auth/api"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        const data = await loginRequest({ email, password })
        login(data.token, data.data)
      } else {
        const data = await registerRequest({ name, email, password })

        if (data.token) {
          login(data.token, data.data)
        } else {
          setIsLogin(true)
          setError("Registro exitoso. Por favor inicia sesión.")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión. Intenta nuevamente.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Redirigir al endpoint del backend que inicia el flujo de OAuth de Google
    window.location.href = `${apiUrl}/auth/google`
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Ingresa tus credenciales para acceder a tu cuenta" 
                : "Ingresa tus datos para registrarte en la plataforma"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                {!isLogin && (
                   <div className="space-y-1">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Ej. Juan Pérez" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    {isLogin && (
                      <Link 
                        href="#" 
                        className="text-xs font-medium text-primary hover:text-brand-1 hover:underline text-muted-foreground"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    )}
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full font-bold bg-brand-1 hover:bg-brand-1/90 text-white" size="lg">
                {loading ? "Cargando..." : (isLogin ? "Acceder" : "Registrarse")}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    O continuar con
                  </span>
                </div>
              </div>

              <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

            </CardContent>
            <CardFooter className="justify-center">
               <div className="text-sm text-muted-foreground">
                {isLogin ? "¿No tienes una cuenta? " : "¿Ya tienes una cuenta? "}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)} 
                  className="text-primary hover:text-brand-1 hover:underline font-medium focus:outline-none"
                >
                  {isLogin ? "Regístrate" : "Inicia sesión"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
