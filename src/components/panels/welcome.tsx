"use client";

import React, { useState, useEffect } from 'react';
import { AppLogo } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Users2, ShieldCheck, ClipboardCheck, ArrowRight, LayoutDashboard, Truck, Home } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useFilteredAppData } from '../../hooks/use-filtered-app-data';

interface WelcomePanelProps {
  onViewChange: (view: any) => void;
}

const WelcomePanel: React.FC<WelcomePanelProps> = ({ onViewChange }) => {
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      const allRoles = appData.roles;
      const currentRole = allRoles.find(r => r.id === currentUser.role);
      
      if (currentRole) {
        const allowed = currentRole.permissions
          .filter(p => p.permissions.view)
          .map(p => p.moduleId);
        setAllowedModules(allowed);
      }
    }
  }, [appData.roles, currentUser]);

  const quickActions = [
    { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard className="size-4" />, view: 'dashboard', color: 'from-[#1d57b7] to-[#3b82f6]', description: 'Resumen operativo' },
    { id: 'orders', title: 'Certificaciones', icon: <Package className="size-4" />, view: 'orders', color: 'from-blue-600 to-blue-500', description: 'Pedidos maestro' },
    { id: 'tasks', title: 'Mis Tareas', icon: <ClipboardCheck className="size-4" />, view: 'my-tasks', color: 'from-emerald-600 to-emerald-500', description: 'Asignaciones pendientes' },
    { id: 'referrals', title: 'Remisiones', icon: <Truck className="size-4" />, view: 'referrals', color: 'from-orange-500 to-amber-500', description: 'Despachos listos' },
    { id: 'directory', title: 'Directorio', icon: <Users2 className="size-4" />, view: 'directory', color: 'from-purple-600 to-purple-500', description: 'Clientes y tiendas' },
    { id: 'users', title: 'Seguridad', icon: <ShieldCheck className="size-4" />, view: 'users', color: 'from-slate-600 to-slate-500', description: 'Usuarios y roles' },
  ];

  const visibleActions = quickActions.filter(a => allowedModules.includes(a.id));

  // Obtener iniciales o nombre de bienvenida
  const firstName = currentUser?.name?.split(' ')[0] || 'Usuario';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section - consistente con el estilo del sistema */}
      <div className="text-center space-y-4">
        <div className="mx-auto size-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-sm">
          <AppLogo className="size-10" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            ¡Bienvenido, <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed mt-2">
            Has ingresado al ecosistema de certificación logística. Selecciona un módulo para comenzar.
          </p>
        </div>
      </div>

      {/* Quick Actions Grid - estilo consistente con TasksPanel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 w-full max-w-[90rem]">
        {visibleActions.length > 0 ? (
          visibleActions.map((action) => (
            <Card 
              key={action.view} 
              className="group border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer rounded-xl overflow-hidden"
              onClick={() => onViewChange(action.view)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
                <div className={cn(
                  "w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-200 text-white",
                  action.color
                )}>
                  {action.icon}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-slate-800 tracking-tight">{action.title}</h3>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{action.description}</p>
                </div>
                <ArrowRight className="size-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <ShieldCheck className="size-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-400">No tienes módulos habilitados</p>
            <p className="text-xs text-slate-400 mt-1">Contacta al administrador para asignar permisos a tu rol</p>
          </div>
        )}
      </div>

      {/* Footer Info - consistente */}
      {visibleActions.length > 0 && (
        <div className="text-center pt-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {visibleActions.length} módulo{visibleActions.length !== 1 ? 's' : ''} disponible{visibleActions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default WelcomePanel;