'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import loginBackground from '../login.png';
import { ArrowRight, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';

const inputClassName =
  'h-12 rounded-xl border-slate-200 bg-white/90 pl-11 pr-11 text-base font-medium text-slate-700 shadow-sm transition-all duration-200 focus:border-[#1d57b7] focus:bg-white focus:ring-2 focus:ring-[#1d57b7]/20 focus:shadow-md';

const primaryButtonClassName =
  'h-12 w-full rounded-xl bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-base font-semibold normal-case text-white shadow-lg shadow-[#1d57b7]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#1d57b7]/35 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberUsername, setRememberUsername] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const router = useRouter();
  const { login, currentUser, loading } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/home');
    }
  }, [currentUser, loading, router]);

  React.useEffect(() => {
    const savedUsername = window.localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberUsername(true);
    }
  }, []);

  const persistRememberedUsername = React.useCallback(() => {
    if (rememberUsername) {
      window.localStorage.setItem('rememberedUsername', username.trim().toUpperCase());
      return;
    }
    window.localStorage.removeItem('rememberedUsername');
  }, [rememberUsername, username]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedUser = login(username, password);
      persistRememberedUsername();

      if (loggedUser.isFirstLogin || password === 'temporary123') {
        toast({
          title: 'Primer ingreso detectado',
          description: 'Por favor actualiza tu contraseña para continuar.',
        });
        router.push('/register?mode=change-password');
        return;
      }

      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Bienvenido de nuevo.',
      });
      router.push('/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de acceso',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-5 rounded-2xl bg-white px-12 py-10 shadow-xl">
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1d57b7] to-[#153f7a] text-white shadow-md">
            <AppLogo className="size-8" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500">Conectando entorno seguro</p>
            <p className="mt-2 animate-pulse text-sm font-semibold text-[#1d57b7]">verificando sesión...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="mx-auto flex w-full max-w-[1200px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Left column - Image */}
        <section className="relative hidden w-[45%] overflow-hidden lg:block">
          <Image
            src={loginBackground}
            alt="Centro logístico"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a3a]/90 via-[#1d57b7]/60 to-[#1d57b7]/30" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <AppLogo className="size-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/80">CCL</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white leading-tight">
                  Corporación<br />
                  Colombiana de<br />
                  Logística
                </h1>
                <div className="h-1 w-20 bg-white/50 rounded-full" />
              </div>
              <p className="text-white/80 text-sm max-w-xs">
                Sistema integral de certificación logística para operaciones eficientes y seguras.
              </p>
            </div>
            
            <div className="text-white/40 text-xs">
              © {new Date().getFullYear()} CCL
            </div>
          </div>
        </section>

        {/* Right column - Form */}
        <section className="flex flex-1 items-center justify-center px-8 py-12 sm:px-10 lg:px-12 xl:px-14">
          <div className="w-full max-w-[440px]">
            {/* Mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white shadow-md">
                <AppLogo className="size-7" />
              </div>
            </div>

            {/* Header */}
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-slate-800">
                Bienvenido
              </h2>
              <p className="mt-2 text-slate-500 text-base">
                Accede a tu cuenta para continuar con tus operaciones en CCL.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">
                  Usuario
                </Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="username"
                    placeholder="CC1050067497"
                    autoComplete="username"
                    required
                    disabled={isSubmitting}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toUpperCase())}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:text-slate-600 hover:bg-slate-100"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-800">
                  <Checkbox
                    checked={rememberUsername}
                    onCheckedChange={(checked) => setRememberUsername(checked === true)}
                    disabled={isSubmitting}
                    className="rounded border-slate-300 data-[state=checked]:border-[#1d57b7] data-[state=checked]:bg-[#1d57b7]"
                  />
                  <span className="font-medium">Recuérdame</span>
                </label>
                <Link 
                  href="/register" 
                  className="text-sm font-semibold text-[#1d57b7] transition-all duration-200 hover:text-[#184a9b] hover:underline"
                >
                  ¿No recuerdas tu contraseña?
                </Link>
              </div>

              <Button type="submit" className={primaryButtonClassName} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-400">
                © {new Date().getFullYear()} Corporación Colombiana de Logística
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Versión: 1.0.1
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}