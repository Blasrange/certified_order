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
  'h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 shadow-none transition focus-visible:border-[#1d57b7] focus-visible:ring-[#1d57b7]/20';

const primaryButtonClassName =
  'h-10 w-full rounded-xl bg-[#1d57b7] text-sm font-semibold normal-case text-white shadow-none transition-all hover:bg-[#184a9b] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-80';

const secondaryButtonClassName =
  'flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium normal-case text-slate-500 transition-all hover:bg-slate-50 active:scale-[0.99]';

export default function RegisterPage() {
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
        updatePassword(newPassword);
        toast({
          title: 'Contraseña actualizada',
          description: 'Ya puedes continuar con el portal operativo.',
        });
        router.push('/home');
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

        window.localStorage.removeItem('currentUser');
        toast({
          title: 'Contraseña restablecida',
          description: 'Ya puedes iniciar sesión con tu nueva clave.',
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
        title: 'Correo enviado',
        description: 'Si el usuario y el teléfono coinciden, recibirás un enlace de recuperación en el correo registrado.',
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
    <main className="min-h-screen bg-[#f3f5f9] p-3 sm:p-4 lg:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[980px] overflow-hidden rounded-[22px] bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.22)] sm:min-h-[560px]">
        <section className="relative hidden w-[38%] overflow-hidden lg:block">
          <Image
            src={loginBackground}
            alt="Centro logístico"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,67,143,0.42)_0%,rgba(30,58,110,0.7)_100%)]" />

          <div className="relative z-10 flex h-full flex-col justify-end p-5 xl:p-6">
            <div className="max-w-xs text-white">
              <h1 className="text-[1.8rem] font-bold leading-tight tracking-[-0.03em] xl:text-[2.15rem]">Certificador</h1>
              <p className="mt-2 text-xs text-white/90 xl:text-sm">
                sistema de certificación logística
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-5 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full max-w-[360px]">
            <div className="mb-4 flex justify-center lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f0ff] text-[#1d57b7]">
                <AppLogo className="size-7" />
              </div>
            </div>

            <div className="text-center">
              <div className="mx-auto hidden size-16 items-center justify-center rounded-full bg-[#edf3ff] text-[#1d57b7] lg:flex">
                <AppLogo className="size-8" />
              </div>
              <h2 className="mt-4 text-[1.9rem] font-bold tracking-[-0.04em] text-slate-900 sm:text-[1.8rem]">Certificador</h2>
              <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">{description}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              {isRecoveryRequestMode ? (
                <>
                  <div>
                    <Label htmlFor="username" className="sr-only">Usuario</Label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="username"
                        placeholder="Usuario"
                        disabled={isLoading}
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="sr-only">Teléfono registrado</Label>
                    <div className="relative">
                      <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="Teléfono registrado"
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
                  <div className="rounded-xl border border-[#d8e6ff] bg-[#f4f8ff] px-4 py-3 text-sm text-slate-600">
                    {isPasswordChangeMode ? (
                      <>
                        Estás actualizando la clave del usuario{' '}
                        <span className="font-black text-slate-800">{currentUser?.loginId || username}</span>
                        {' '}para completar tu primer ingreso.
                      </>
                    ) : (
                      'El enlace fue validado desde tu correo. Ahora define la nueva contraseña para completar el restablecimiento.'
                    )}
                  </div>

                  <div>
                    <Label htmlFor="new-password" className="sr-only">Nueva contraseña</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Nueva contraseña"
                        disabled={isLoading}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((value) => !value)}
                        className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-700"
                        aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                      >
                        {showNewPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="sr-only">Confirmar contraseña</Label>
                    <div className="relative">
                      <CheckCircle2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirmar contraseña"
                        disabled={isLoading}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-700"
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
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    {loadingText}
                  </span>
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </Button>

              <Link href="/login" className={secondaryButtonClassName}>
                <ArrowLeft className="size-5" />
                <span>Cancelar</span>
              </Link>
            </form>

          </div>
        </section>
      </div>
    </main>
  );
}
