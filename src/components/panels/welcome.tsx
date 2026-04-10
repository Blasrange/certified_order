"use client";

import React, { useState, useEffect } from 'react';
import { AppLogo } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Users2, ShieldCheck, ClipboardCheck, ArrowRight, LayoutDashboard, Truck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { AppRole } from '@/lib/types';
import { mockRoles } from '@/lib/data';

interface WelcomePanelProps {
  onViewChange: (view: any) => void;
}

const WelcomePanel: React.FC<WelcomePanelProps> = ({ onViewChange }) => {
  const { currentUser } = useAuth();
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      const savedRoles = localStorage.getItem('appRoles');
      const allRoles: AppRole[] = savedRoles ? JSON.parse(savedRoles) : mockRoles;
      const currentRole = allRoles.find(r => r.id === currentUser.role);
      
      if (currentRole) {
        const allowed = currentRole.permissions
          .filter(p => p.permissions.view)
          .map(p => p.moduleId);
        setAllowedModules(allowed);
      }
    }
  }, [currentUser]);

  const quickActions = [
    { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard className="size-5" />, view: 'dashboard', color: 'from-primary to-primary/80' },
    { id: 'orders', title: 'Certificaciones', icon: <Package className="size-5" />, view: 'orders', color: 'from-blue-500 to-blue-600' },
    { id: 'tasks', title: 'Mis Tareas', icon: <ClipboardCheck className="size-5" />, view: 'my-tasks', color: 'from-emerald-500 to-emerald-600' },
    { id: 'referrals', title: 'Remisiones', icon: <Truck className="size-5" />, view: 'referrals', color: 'from-orange-500 to-orange-600' },
    { id: 'directory', title: 'Directorio', icon: <Users2 className="size-5" />, view: 'directory', color: 'from-purple-500 to-purple-600' },
    { id: 'users', title: 'Seguridad', icon: <ShieldCheck className="size-5" />, view: 'users', color: 'from-slate-600 to-slate-700' },
  ];

  const visibleActions = quickActions.filter(a => allowedModules.includes(a.id));

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-10 animate-in fade-in zoom-in duration-500">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="mx-auto size-20 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-5">
          <AppLogo className="size-10" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          ¡Bienvenido, <span className="text-primary font-bold">{currentUser?.name.split(' ')[0]}</span>!
        </h1>
        <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
          Has ingresado al ecosistema de certificación logística. Selecciona un módulo para comenzar.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full max-w-[90rem]">
        {visibleActions.length > 0 ? (
          visibleActions.map((action) => (
            <Card 
              key={action.view} 
              className="group border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer rounded-xl overflow-hidden"
              onClick={() => onViewChange(action.view)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} text-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                  {action.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-gray-800 tracking-tight">{action.title}</h3>
                  <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Acceso Directo</p>
                </div>
                <ArrowRight className="size-3.5 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm text-gray-400 font-medium">No tienes módulos habilitados. Contacta al administrador para asignar permisos a tu rol.</p>
          </div>
        )}
      </div>

      {/* Additional Info - Optional */}
      {visibleActions.length > 0 && (
        <div className="text-center">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            {visibleActions.length} módulo{visibleActions.length !== 1 ? 's' : ''} disponible{visibleActions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default WelcomePanel;