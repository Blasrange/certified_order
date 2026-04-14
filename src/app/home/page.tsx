
"use client";

import * as React from "react";
import WelcomePanel from "@/components/panels/welcome";
import AppShell from "@/components/layout/AppShell";
import { useRouter } from "next/navigation";
import { SystemLoadingOverlay } from '@/components/ui/system-loading-overlay';

export default function HomePage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleViewChange = (view: string) => {
    setIsNavigating(true);
    router.push(`/${view}`);
  };

  return (
    <AppShell>
      {isNavigating && (
        <SystemLoadingOverlay
          title="Abriendo módulo..."
          description="Estamos cargando la opción seleccionada."
        />
      )}
      <WelcomePanel onViewChange={handleViewChange} />
    </AppShell>
  );
}
