'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import loginBackground from '../login.png';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';

const inputClassName =
  'h-12 rounded-xl border-slate-200 bg-white/95 pl-11 pr-11 text-base font-medium text-slate-700 placeholder:text-slate-400 transition-all duration-200 ease-out focus:border-[#1d57b7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d57b7]/20 focus:shadow-md';

const primaryButtonClassName =
  'group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-base font-semibold normal-case text-white shadow-lg shadow-[#1d57b7]/30 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-[#1d57b7]/40 hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70';

const secondaryButtonClassName =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-base font-medium normal-case text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 active:scale-[0.99]';

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageContent />
    </React.Suspense>
  );
}

function RegisterPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 font-sans">
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-white/80 backdrop-blur-sm px-12 py-10 shadow-xl ring-1 ring-slate-200/50">
        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1d57b7] to-[#153f7a] text-white shadow-md animate-pulse">
          <AppLogo className="size-8" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-800">Certificador</p>
          <p className="mt-1 text-sm text-slate-500">Cargando formulario...</p>
        </div>
      </div>
    </main>
  );
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const [username, setUsername] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const router = useRouter();
  const { currentUser, updatePassword } = useAuth();
  const { toast } = useToast();

  const mode = searchParams.get('mode');
  const token = searchParams.get('token') || '';
  const isPasswordChangeMode = mode === 'change-password';
  const isEmailResetMode = mode === 'recover-email' && Boolean(token);
  const isRecoveryRequestMode = !isPasswordChangeMode && !isEmailResetMode;

  React.useEffect(() => {
    if (isPasswordChangeMode && currentUser?.loginId) {
      setUsername(currentUser.loginId);
    }
  }, [currentUser, isPasswordChangeMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPasswordChangeMode) {
      if (!currentUser) {
        toast({
          variant: 'destructive',
          title: 'Sesión no disponible',
          description: 'Vuelve a iniciar sesión para actualizar tu contraseña inicial.',
        });
        router.push('/login');
        return;
      }

      if (newPassword.length < 8) {
        toast({
          variant: 'destructive',
          title: 'Contraseña muy corta',
          description: 'La nueva clave debe tener al menos 8 caracteres.',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'Las contraseñas no coinciden',
          description: 'Confirma nuevamente la clave para continuar.',
        });
        return;
      }

      setIsLoading(true);

      try {
        await updatePassword(newPassword);
        toast({
          title: 'Contraseña actualizada correctamente',
          description: 'Tu nueva contraseña quedó registrada. Ya puedes continuar con el portal operativo.',
        });
        router.push('/home');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'No se pudo actualizar la contraseña',
          description:
            error instanceof Error
              ? error.message
              : 'Ocurrió un problema al guardar la nueva contraseña.',
        });
      } finally {
        setIsLoading(false);
      }

      return;
    }

    if (isEmailResetMode) {
      if (newPassword.length < 8) {
        toast({
          variant: 'destructive',
          title: 'Contraseña muy corta',
          description: 'La nueva clave debe tener al menos 8 caracteres.',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'Las contraseñas no coinciden',
          description: 'Confirma nuevamente la clave para continuar.',
        });
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/auth/recover/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            password: newPassword,
          }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || 'No se pudo restablecer la contraseña.');
        }

        toast({
          title: 'Contraseña restablecida correctamente',
          description: 'El cambio se realizó con éxito. Ya puedes iniciar sesión con tu nueva clave.',
        });
        router.push('/login');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'No se pudo actualizar la clave',
          description:
            error instanceof Error
              ? error.message
              : 'Ocurrió un problema al validar el enlace de recuperación.',
        });
      } finally {
        setIsLoading(false);
      }

      return;
    }

    const cleanUsername = username.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanUsername || !cleanPhone) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Ingresa tu usuario y tu número de teléfono para solicitar el correo de recuperación.',
      });
      return;
    }

    if (cleanPhone.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Teléfono inválido',
        description: 'Ingresa un número de teléfono válido registrado en tu cuenta.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/recover/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername, phone: cleanPhone }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar el correo de recuperación.');
      }

      toast({
        title: 'Solicitud de recuperación enviada',
        description: 'Si el usuario y el teléfono coinciden con un registro activo, recibirás un enlace de recuperación en el correo asociado.',
      });
      setUsername('');
      setPhone('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo enviar el correo',
        description:
          error instanceof Error
            ? error.message
            : 'Verifica la configuración SMTP e inténtalo nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const title = isPasswordChangeMode
    ? 'Actualizar contraseña'
    : 'Restablecer contraseña';

  const description = isPasswordChangeMode
    ? 'Ingresa tu nueva contraseña para continuar'
    : isEmailResetMode
      ? 'Define tu nueva contraseña para continuar'
      : 'Ingresa tus datos para continuar';

  const buttonText = isPasswordChangeMode || isEmailResetMode
    ? 'Guardar contraseña'
    : 'Restablecer';

  const loadingText = isPasswordChangeMode || isEmailResetMode ? 'Guardando' : 'Enviando';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 font-sans">
      <div className="mx-auto flex w-full max-w-[1100px] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200/50">
        {/* Left column - Image */}
        <section className="relative hidden w-[40%] overflow-hidden lg:block">
          <Image
            src={loginBackground}
            alt="Centro logístico"
            fill
            priority
            className="object-cover object-center scale-105 transition-transform duration-700 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a3a]/80 via-[#1d57b7]/40 to-[#1d57b7]/20 backdrop-blur-[1px]" />

          <div className="relative z-10 flex h-full flex-col justify-end p-8 xl:p-10">
            <div className="max-w-xs text-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
                  <AppLogo className="size-6 text-white" />
                </div>
                <span className="text-sm font-semibold tracking-wide text-white/80">CCL</span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
                Certificador
              </h1>
              <div className="h-1 w-16 bg-white/50 rounded-full mt-3 mb-3" />
              <p className="text-sm text-white/80 leading-relaxed xl:text-base">
                Sistema de certificación logística
              </p>
            </div>
          </div>
        </section>

        {/* Right column - Form */}
        <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-10 xl:px-12">
          <div className="w-full max-w-[400px]">
            {/* Mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white shadow-md shadow-[#1d57b7]/30">
                <AppLogo className="size-7" />
              </div>
            </div>

            {/* Header */}
            <div className="text-center">
              <div className="mx-auto hidden size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white shadow-md lg:flex">
                <AppLogo className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                {title}
              </h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                {description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {isRecoveryRequestMode ? (
                <>
                  <div>
                    <Label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">
                      Usuario
                    </Label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#1d57b7]" />
                      <Input
                        id="username"
                        placeholder="CC1050067497"
                        disabled={isLoading}
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-700">
                      Teléfono registrado
                    </Label>
                    <div className="relative">
                      <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#1d57b7]" />
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="3001234567"
                        disabled={isLoading}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-[#d8e6ff] bg-gradient-to-r from-[#f4f8ff] to-white px-5 py-4 text-sm text-slate-700 shadow-sm">
                    {isPasswordChangeMode ? (
                      <>
                        Estás actualizando la clave del usuario{' '}
                        <span className="font-bold text-[#1d57b7]">{currentUser?.loginId || username}</span>
                        {' '}para completar tu primer ingreso.
                      </>
                    ) : (
                      'El enlace fue validado desde tu correo. Ahora define la nueva contraseña para completar el restablecimiento.'
                    )}
                  </div>

                  <div>
                    <Label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-slate-700">
                      Nueva contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#1d57b7]" />
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        disabled={isLoading}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((value) => !value)}
                        className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1d57b7]/30"
                        aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                      >
                        {showNewPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                      Confirmar contraseña
                    </Label>
                    <div className="relative">
                      <CheckCircle2 className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#1d57b7]" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repite tu contraseña"
                        disabled={isLoading}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1d57b7]/30"
                        aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                      >
                        {showConfirmPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className={primaryButtonClassName} disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {loadingText}
                  </span>
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              <Link href="/login" className={secondaryButtonClassName}>
                <ArrowLeft className="size-5" />
                <span>Cancelar</span>
              </Link>
            </form>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} Corporación Colombiana de Logística
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}