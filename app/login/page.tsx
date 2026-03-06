"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {!isLogin && (
                 <div className="space-y-1">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" placeholder="Ej. Juan Pérez" />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="correo@ejemplo.com" />
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
                <Input id="password" type="password" />
              </div>
            </div>
            
            <Button className="w-full font-bold bg-brand-1 hover:bg-brand-1/90 text-white" size="lg">
              {isLogin ? "Acceder" : "Registrarse"}
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

            <Button variant="outline" className="w-full" type="button">
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
                onClick={() => setIsLogin(!isLogin)} 
                className="text-primary hover:text-brand-1 hover:underline font-medium focus:outline-none"
              >
                {isLogin ? "Regístrate" : "Inicia sesión"}
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
