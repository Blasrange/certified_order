'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { SystemLoadingOverlay } from '@/components/ui/system-loading-overlay';

const LOGOUT_REASON_KEY = 'auth:logoutReason';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshCurrentUser: (options?: { preserveActivity?: boolean }) => Promise<User | null>;
  loading: boolean;
  lastActivityAt: number | null;
  idleTimeoutMs: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;
const SESSION_KEEP_ALIVE_MS = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const lastSessionSyncAtRef = useRef<number>(0);
  const keepAliveInFlightRef = useRef(false);

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async (reason?: 'idle-timeout') => {
    clearIdleTimeout();
    setCurrentUser(null);
    setLastActivityAt(null);
    lastSessionSyncAtRef.current = 0;

    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
      console.error('No se pudo cerrar la sesión en el servidor.', error);
    }

    if (reason && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
      window.location.assign('/login');
    }
  }, [clearIdleTimeout]);

  const logout = useCallback(() => {
    void performLogout();
  }, [performLogout]);

  const expireSessionIfNeeded = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!currentUser) {
      return false;
    }

    if (Date.now() - lastActivityAtRef.current < IDLE_TIMEOUT_MS) {
      return false;
    }

    void performLogout('idle-timeout');

    return true;
  }, [currentUser, performLogout]);

  const scheduleIdleLogout = useCallback((lastActivityAt: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    clearIdleTimeout();

    const remainingMs = IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt);
    if (remainingMs <= 0) {
      expireSessionIfNeeded();
      return;
    }

    idleTimeoutRef.current = window.setTimeout(() => {
      expireSessionIfNeeded();
    }, remainingMs);
  }, [clearIdleTimeout, expireSessionIfNeeded]);

  const registerActivity = useCallback(() => {
    if (typeof window === 'undefined' || !currentUser) {
      return;
    }

    const now = Date.now();
    lastActivityAtRef.current = now;
    setLastActivityAt(now);
    scheduleIdleLogout(now);
  }, [currentUser, scheduleIdleLogout]);

  const refreshCurrentUser = useCallback(async (options?: { preserveActivity?: boolean }) => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as { user?: User | null } | null;

      if (response.ok && payload?.user) {
        setCurrentUser(payload.user);
        const now = Date.now();
        if (!options?.preserveActivity) {
          lastActivityAtRef.current = now;
          setLastActivityAt(now);
        }
        lastSessionSyncAtRef.current = now;
        return payload.user;
      }

      setCurrentUser(null);
      setLastActivityAt(null);
      return null;
    } catch (error) {
      console.error('No se pudo refrescar la sesión actual.', error);
      return null;
    }
  }, []);

  const syncSessionIfNeeded = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser || keepAliveInFlightRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastActivityAtRef.current >= IDLE_TIMEOUT_MS) {
      return;
    }

    if (now - lastSessionSyncAtRef.current < SESSION_KEEP_ALIVE_MS) {
      return;
    }

    if (lastActivityAtRef.current <= lastSessionSyncAtRef.current) {
      return;
    }

    keepAliveInFlightRef.current = true;
    try {
      await refreshCurrentUser({ preserveActivity: true });
    } finally {
      keepAliveInFlightRef.current = false;
    }
  }, [currentUser, refreshCurrentUser]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshCurrentUser();
      } catch (error) {
        console.error('Could not initialize auth data', error);
      }

      setLoading(false);
    };

    void initializeAuth();
  }, [refreshCurrentUser]);

  const login = async (username: string, password: string): Promise<User> => {
    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim();

    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginId: cleanUsername,
        password: cleanPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; user?: User } | null;

    if (!response.ok || !payload?.user) {
      throw new Error(payload?.error || 'Credenciales inválidas. Verifique su usuario y contraseña.');
    }

    setCurrentUser(payload.user);
    const now = Date.now();
    lastActivityAtRef.current = now;
    lastSessionSyncAtRef.current = now;
    setLastActivityAt(now);
    return payload.user;
  };

  const updatePassword = async (newPassword: string) => {
    if (!currentUser?.loginId) {
      throw new Error('No hay una sesión válida para actualizar la contraseña.');
    }

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginId: currentUser.loginId,
        email: currentUser.email,
        password: newPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; user?: User } | null;

    if (!response.ok || !payload?.user) {
      throw new Error(payload?.error || 'No se pudo actualizar la contraseña.');
    }

    setCurrentUser(payload.user);
    const now = Date.now();
    lastActivityAtRef.current = now;
    lastSessionSyncAtRef.current = now;
    setLastActivityAt(now);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) {
      clearIdleTimeout();
      return;
    }

    if (expireSessionIfNeeded()) {
      return;
    }

    scheduleIdleLogout(lastActivityAtRef.current || Date.now());
    const sessionCheckInterval = window.setInterval(() => {
      if (!expireSessionIfNeeded()) {
        void syncSessionIfNeeded();
      }
    }, SESSION_CHECK_INTERVAL_MS);

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      registerActivity();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (!expireSessionIfNeeded()) {
          registerActivity();
          void syncSessionIfNeeded();
        }
      }
    };

    const handleFocus = () => {
      if (!expireSessionIfNeeded()) {
        registerActivity();
        void syncSessionIfNeeded();
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(sessionCheckInterval);
      clearIdleTimeout();
    };
  }, [clearIdleTimeout, currentUser, expireSessionIfNeeded, registerActivity, scheduleIdleLogout, syncSessionIfNeeded]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updatePassword, refreshCurrentUser, loading, lastActivityAt, idleTimeoutMs: IDLE_TIMEOUT_MS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

  const shouldRedirect = !loading && !currentUser;

    useEffect(() => {
    if (shouldRedirect) {
            router.replace('/login');
        }
  }, [router, shouldRedirect]);

  if (loading || shouldRedirect) {
        return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <SystemLoadingOverlay
            fixed={false}
      title={loading ? "Validando acceso..." : "Redirigiendo al inicio de sesión..."}
      description={loading ? "Estamos verificando tu sesión para habilitar el portal." : "No hay una sesión activa. Estamos enviándote al acceso seguro."}
          />
        </div>
        );
    }

    return <>{children}</>;
};