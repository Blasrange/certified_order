'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { SystemLoadingOverlay } from '@/components/ui/system-loading-overlay';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const idleTimeoutRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async (reason?: 'idle-timeout') => {
    clearIdleTimeout();
    setCurrentUser(null);

    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
      console.error('No se pudo cerrar la sesión en el servidor.', error);
    }

    if (reason && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login?reason=idle-timeout');
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
    scheduleIdleLogout(now);
  }, [currentUser, scheduleIdleLogout]);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as { user?: User | null } | null;

      if (response.ok && payload?.user) {
        setCurrentUser(payload.user);
        lastActivityAtRef.current = Date.now();
        return payload.user;
      }

      setCurrentUser(null);
      return null;
    } catch (error) {
      console.error('No se pudo refrescar la sesión actual.', error);
      return null;
    }
  }, []);

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
    lastActivityAtRef.current = Date.now();
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
    lastActivityAtRef.current = Date.now();
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
      expireSessionIfNeeded();
    }, SESSION_CHECK_INTERVAL_MS);

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
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
        }
      }
    };

    const handleFocus = () => {
      if (!expireSessionIfNeeded()) {
        registerActivity();
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
  }, [clearIdleTimeout, currentUser, expireSessionIfNeeded, registerActivity, scheduleIdleLogout]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updatePassword, refreshCurrentUser, loading }}>
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

    useEffect(() => {
        if (!loading && !currentUser) {
            router.replace('/login');
        }
    }, [currentUser, loading, router]);

    if (loading) {
        return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <SystemLoadingOverlay
            fixed={false}
            title="Validando acceso..."
            description="Estamos verificando tu sesión para habilitar el portal."
          />
        </div>
        );
    }

    if (!currentUser) return null;

    return <>{children}</>;
};