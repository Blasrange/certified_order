// components/AppShell.tsx (solo diseño, misma funcionalidad)

"use client";

import * as React from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users2,
  Package,
  FileText,
  LogOut,
  GitCompare,
  Contact2,
  ChevronDown,
  Settings,
  Eye,
  Home as HomeIcon,
  ChevronRight,
  Truck,
  Briefcase,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppLogo } from "@/components/icons";
import { useAuth, ProtectedRoute } from "@/context/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SystemLoadingOverlay } from "@/components/ui/system-loading-overlay";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

type View = "home" | "dashboard" | "my-tasks" | "orders" | "mapping" | "directory" | "materials" | "users" | "referrals" | "owners" | "roles";

interface AppShellProps {
  children: React.ReactNode;
  ordersSubView?: 'list' | 'detail';
  selectedProcessName?: string;
  onOrdersViewChange?: (view: 'list' | 'detail') => void;
}

export default function AppShell({ 
  children, 
  ordersSubView = 'list', 
  selectedProcessName = "",
  onOrdersViewChange 
}: AppShellProps) {
  const { currentUser, logout } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const router = useRouter();
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = React.useState<string[]>([]);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [pendingView, setPendingView] = React.useState<View | null>(null);
  
  const activeView = React.useMemo(() => {
    const view = pathname.split("/")[1];
    return (view || "home") as View;
  }, [pathname]);

  const loadPermissions = React.useCallback(() => {
    if (currentUser) {
      const allRoles = appData.roles;
      const currentRole = allRoles.find(r => r.id === currentUser.role);
      
      if (currentRole) {
        const allowedModules = currentRole.permissions
          .filter(p => p.permissions.view)
          .map(p => p.moduleId);
        setUserPermissions(allowedModules);
      }
    }
  }, [appData.roles, currentUser]);

  React.useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  React.useEffect(() => {
    if (activeView !== "home" && userPermissions.length > 0) {
      const moduleId = activeView === "my-tasks" ? "tasks" : activeView;
      if (!userPermissions.includes(moduleId)) {
        router.replace("/home");
      }
    }
  }, [activeView, userPermissions, router]);

  React.useEffect(() => {
    setIsNavigating(false);
    setPendingView(null);
  }, [pathname]);

  if (!currentUser) return null;

  const hasAccess = (moduleId: string) => userPermissions.includes(moduleId);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleViewChange = (view: View) => {
    if (view === activeView) {
      return;
    }

    setPendingView(view);
    setIsNavigating(true);
    router.push(`/${view}`);
  };

  const getLoadingLabel = () => {
    if (!pendingView) {
      return 'Cargando módulo...';
    }

    switch (pendingView) {
      case 'dashboard': return 'Abriendo dashboard...';
      case 'my-tasks': return 'Abriendo mis tareas...';
      case 'orders': return 'Abriendo certificaciones...';
      case 'mapping': return 'Abriendo homologación...';
      case 'directory': return 'Abriendo directorio...';
      case 'materials': return 'Abriendo materiales...';
      case 'users': return 'Abriendo usuarios...';
      case 'referrals': return 'Abriendo remisiones...';
      case 'owners': return 'Abriendo propietarios...';
      case 'roles': return 'Abriendo roles...';
      default: return 'Cargando módulo...';
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case "home": return "Inicio";
      case "dashboard": return "Resumen General";
      case "my-tasks": return "Mis Asignaciones";
      case "orders": return "Certificaciones Maestro";
      case "referrals": return "Remisiones de Despacho";
      case "mapping": return "Homologación de Plantillas";
      case "directory": return "Directorio Maestro";
      case "materials": return "Catálogo de Materiales";
      case "users": return "Seguridad y Accesos";
      case "owners": return "Propietarios";
      case "roles": return "Roles y Permisos";
      default: return "Inicio";
    }
  };

  const getCategoryName = () => {
    switch (activeView) {
      case "dashboard":
      case "my-tasks":
      case "orders":
      case "referrals":
        return "Operación";
      case "mapping":
      case "directory":
      case "materials":
      case "users":
      case "owners":
      case "roles":
        return "Administración";
      default:
        return "Principal";
    }
  };

  const canSeeOperation = hasAccess('dashboard') || hasAccess('orders') || hasAccess('tasks') || hasAccess('referrals');
  const canSeeAdmin = hasAccess('owners') || hasAccess('mapping') || hasAccess('directory') || hasAccess('materials') || hasAccess('users') || hasAccess('roles');

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {isNavigating && (
          <SystemLoadingOverlay
            title={getLoadingLabel()}
            description="Estamos preparando la vista seleccionada."
          />
        )}
        {/* Top Navigation Bar - Mejorado con Inter */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/98 backdrop-blur-md shadow-sm">
          <div className="w-full px-6 flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => handleViewChange("home")}
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
                  <AppLogo className="size-5" />
                </div>
                <span className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Certificador
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                {canSeeOperation && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={cn(
                          "h-9 gap-2 text-sm font-medium rounded-xl transition-all duration-200",
                          ["dashboard", "orders", "my-tasks", "referrals"].includes(activeView) 
                            ? "bg-slate-100 text-slate-900" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <ClipboardCheck className="size-4" />
                        Operación
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl border border-slate-200 shadow-xl bg-white">
                      {hasAccess('dashboard') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("dashboard")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "dashboard" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <LayoutDashboard className="size-4" /> Dashboard
                        </DropdownMenuItem>
                      )}
                      {hasAccess('orders') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("orders")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "orders" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Package className="size-4" /> Pedidos Maestro
                        </DropdownMenuItem>
                      )}
                      {hasAccess('tasks') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("my-tasks")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "my-tasks" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <ClipboardCheck className="size-4" /> Mis Tareas
                        </DropdownMenuItem>
                      )}
                      {hasAccess('referrals') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("referrals")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "referrals" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Truck className="size-4" /> Remisiones
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {canSeeAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={cn(
                          "h-9 gap-2 text-sm font-medium rounded-xl transition-all duration-200",
                          ["mapping", "directory", "materials", "users", "owners", "roles"].includes(activeView) 
                            ? "bg-slate-100 text-slate-900" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <Settings className="size-4" />
                        Administración
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl border border-slate-200 shadow-xl bg-white">
                      {hasAccess('owners') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("owners")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "owners" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Briefcase className="size-4" /> Propietarios
                        </DropdownMenuItem>
                      )}
                      {hasAccess('mapping') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("mapping")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "mapping" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <GitCompare className="size-4" /> Homologación
                        </DropdownMenuItem>
                      )}
                      {(hasAccess('owners') || hasAccess('mapping')) && <DropdownMenuSeparator className="my-1" />}
                      {hasAccess('directory') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("directory")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "directory" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Contact2 className="size-4" /> Directorio
                        </DropdownMenuItem>
                      )}
                      {hasAccess('materials') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("materials")} 
                          className={cn(
                            "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                            activeView === "materials" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <FileText className="size-4" /> Catálogo Materiales
                        </DropdownMenuItem>
                      )}
                      {(hasAccess('users') || hasAccess('roles')) && (
                        <>
                          <DropdownMenuSeparator className="my-1" />
                          {hasAccess('users') && (
                            <DropdownMenuItem 
                              onClick={() => handleViewChange("users")} 
                              className={cn(
                                "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                                activeView === "users" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <Users2 className="size-4" /> Usuarios
                            </DropdownMenuItem>
                          )}
                          {hasAccess('roles') && (
                            <DropdownMenuItem 
                              onClick={() => handleViewChange("roles")} 
                              className={cn(
                                "rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer transition-all duration-150",
                                activeView === "roles" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <ShieldCheck className="size-4" /> Roles y Permisos
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700 leading-tight">{currentUser.name}</span>
                <span className="text-xs text-slate-400">{currentUser.email}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100 transition-all duration-200 p-0 focus:ring-2 focus:ring-[#1d57b7]/30">
                    <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                      <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                      <AvatarFallback className="bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white text-sm font-semibold">
                        {currentUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl border border-slate-200 shadow-xl bg-white">
                  <div className="flex items-center gap-3 p-3 pb-2">
                    <Avatar className="h-10 w-10 ring-2 ring-[#1d57b7]/20">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-[#1d57b7] to-[#3b82f6] text-white text-sm font-semibold">
                        {currentUser.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 leading-tight">{currentUser.name}</span>
                      <span className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{currentUser.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="rounded-lg h-10 gap-3 text-sm font-medium cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 transition-all duration-150"
                  >
                    <LogOut className="size-4" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Breadcrumbs Navigation - Mejorado */}
        <div className="bg-white/80 backdrop-blur-sm px-6 py-3 border-b border-slate-200/80 flex items-center gap-2">
          <button 
            onClick={() => handleViewChange("home")}
            className="p-1 hover:bg-slate-100 rounded-lg transition-all duration-200 group"
          >
            <HomeIcon className={cn(
              "size-4 transition-all duration-200", 
              activeView === "home" ? "text-slate-700" : "text-slate-400 group-hover:text-slate-600"
            )} />
          </button>
          {activeView !== "home" && (
            <>
              <ChevronRight className="size-3.5 text-slate-300" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {getCategoryName()}
              </span>
              
              {activeView === "orders" && ordersSubView === "detail" ? (
                <>
                  <ChevronRight className="size-3.5 text-slate-300" />
                  <span 
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors uppercase tracking-wide"
                    onClick={() => onOrdersViewChange?.('list')}
                  >
                    Certificaciones
                  </span>
                  <ChevronRight className="size-3.5 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[300px]">
                    {selectedProcessName}
                  </span>
                </>
              ) : (
                <>
                  <ChevronRight className="size-3.5 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-800">
                    {getPageTitle()}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Main Content Area - Mejorado con padding y max-width optimizado */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}