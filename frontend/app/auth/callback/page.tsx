"use client"

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  
  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      void loginWithToken(token);
    } else {
      router.push("/login?error=no_token");
    }
  }, [loginWithToken, router, searchParams]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-1"></div>
        <p className="text-muted-foreground">Completando autenticación...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-1"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
