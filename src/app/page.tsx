
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function RootPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        // Si hay sesión, ir al dashboard principal
        router.replace("/home");
      } else {
        // Si no hay sesión, el inicio es el login
        router.replace("/login");
      }
    }
  }, [currentUser, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-black text-primary animate-pulse">
      Validando seguridad...
    </div>
  );
}
