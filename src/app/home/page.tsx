
"use client";

import * as React from "react";
import WelcomePanel from "@/components/panels/welcome";
import AppShell from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleViewChange = (view: string) => {
    // Navegación directa basada en las nuevas rutas de NextJS
    router.push(`/${view}`);
  };

  return (
    <AppShell>
      <WelcomePanel onViewChange={handleViewChange} />
    </AppShell>
  );
}
