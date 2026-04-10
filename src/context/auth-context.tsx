
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '@/lib/types';
import { mockRoles, mockUsers } from '@/lib/data';
import {
  hydrateLocalCacheFromDatabase,
  persistRoles,
  persistUsers,
} from '@/lib/app-data-client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => User;
  logout: () => void;
  updatePassword: (newPassword: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getPrefix = (docType?: string) => {
  switch (docType) {
    case 'Cédula de ciudadanía': return 'CC';
    case 'Cédula de extranjería': return 'CE';
    case 'Pasaporte': return 'PA';
    default: return '';
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }

        try {
          await hydrateLocalCacheFromDatabase();
        } catch (error) {
          console.warn('No se pudo hidratar la cache desde Supabase, se mantiene cache local.', error);
        }

        const savedUsersStr = localStorage.getItem('users');
        const currentUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
        const savedRolesStr = localStorage.getItem('appRoles');

        if (!savedRolesStr) {
          localStorage.setItem('appRoles', JSON.stringify(mockRoles));
          try {
            await persistRoles(mockRoles);
          } catch (error) {
            console.warn('No se pudieron sincronizar los roles base.', error);
          }
        }

        const adminExists = currentUsers.some(
          (user) => user.id === 'USER-ADMIN' || user.loginId === 'CC1000000001'
        );

        if (!adminExists) {
          localStorage.setItem('users', JSON.stringify([...mockUsers]));
          try {
            await persistUsers(mockUsers);
          } catch (error) {
            console.warn('No se pudo sincronizar el usuario administrador inicial.', error);
          }
        }
      } catch (error) {
        console.error('Could not initialize auth data', error);
      }

      setLoading(false);
    };

    void initializeAuth();
  }, []);

  const login = (username: string, password: string): User => {
    const savedUsersStr = localStorage.getItem('users');
    const usersSource = savedUsersStr ? JSON.parse(savedUsersStr) : mockUsers;
    
    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim();

    const user = usersSource.find((u: User) => {
      const calculatedLoginId = (u.loginId || `${getPrefix(u.documentType)}${u.documentNumber}`).toUpperCase();
      const matchesId = calculatedLoginId === cleanUsername;
      const matchesPass = u.password === cleanPassword;
      return matchesId && matchesPass;
    });

    if (user) {
      if (!user.isActive) {
        throw new Error('Tu cuenta está inactivada. Contacta al administrador.');
      }
      const userToStore = { ...user };
      delete userToStore.password;
      
      setCurrentUser(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      return user;
    } else {
      throw new Error('Credenciales inválidas. Verifique su usuario y contraseña.');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const updatePassword = (newPassword: string) => {
    if (!currentUser) return;
    
    const savedUsersStr = localStorage.getItem('users');
    const usersSource = savedUsersStr ? JSON.parse(savedUsersStr) : [...mockUsers];
    
    const updatedUsers = usersSource.map((u: any) => {
      if (u.id === currentUser.id) {
        return { ...u, password: newPassword, isFirstLogin: false };
      }
      return u;
    });

    localStorage.setItem('users', JSON.stringify(updatedUsers));
    void persistUsers(updatedUsers).catch((error) => {
      console.error('No se pudo sincronizar el cambio de contraseña con Supabase.', error);
    });
    
    const updatedCurrent = { ...currentUser, isFirstLogin: false };
    setCurrentUser(updatedCurrent);
    localStorage.setItem('currentUser', JSON.stringify(updatedCurrent));
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updatePassword, loading }}>
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
          <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verificando Seguridad...</span>
            </div>
          </div>
        );
    }

    if (!currentUser) return null;

    return <>{children}</>;
};
