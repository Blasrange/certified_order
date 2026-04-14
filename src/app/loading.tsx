import { SystemLoadingOverlay } from '@/components/ui/system-loading-overlay';

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <SystemLoadingOverlay
        fixed={false}
        title="Cargando página..."
        description="Estamos preparando el contenido solicitado."
      />
    </div>
  );
}