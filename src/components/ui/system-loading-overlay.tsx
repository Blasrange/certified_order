import { AppLogo } from '@/components/icons';

type SystemLoadingOverlayProps = {
  title?: string;
  description?: string;
  fixed?: boolean;
};

export function SystemLoadingOverlay({
  title = 'Cargando módulo...',
  description = 'Preparando tu entorno operativo',
  fixed = true,
}: SystemLoadingOverlayProps) {
  return (
    <div
      className={[
        fixed ? 'fixed inset-0 z-[120]' : 'absolute inset-0 z-20',
        'flex items-center justify-center overflow-hidden',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/8 backdrop-blur-[2px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(29,87,183,0.10),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(148,163,184,0.10),_transparent_34%)]" />

      <div className="relative flex w-[220px] flex-col items-center rounded-[28px] border border-white/55 bg-white/58 px-6 py-7 text-center shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.14))]" />
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

        <div className="relative mb-4 flex items-center justify-center">
          <span className="absolute -left-7 h-[3px] w-5 rounded-full bg-slate-400/40" />
          <span className="absolute -right-7 h-[3px] w-5 rounded-full bg-slate-400/40" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d57b7] via-[#2158ad] to-[#153f7a] shadow-[0_12px_26px_rgba(29,87,183,0.24)]">
            <div className="absolute inset-[1px] rounded-2xl border border-white/35" />
            <AppLogo className="relative size-8 text-white" />
          </div>
        </div>

        <div className="relative">
          <p className="text-lg font-semibold tracking-tight text-slate-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>

        <div className="relative mt-4 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#1d57b7] animate-bounce [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#1d57b7]/70 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#1d57b7]/45 animate-bounce" />
        </div>
      </div>
    </div>
  );
}