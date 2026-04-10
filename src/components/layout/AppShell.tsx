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
import type { AppRole } from "@/lib/types";
import { mockRoles } from "@/lib/data";

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
  const router = useRouter();
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = React.useState<string[]>([]);
  
  const activeView = React.useMemo(() => {
    const view = pathname.split("/")[1];
    return (view || "home") as View;
  }, [pathname]);

  const loadPermissions = React.useCallback(() => {
    if (currentUser) {
      const savedRoles = localStorage.getItem('appRoles');
      const allRoles: AppRole[] = savedRoles ? JSON.parse(savedRoles) : mockRoles;
      const currentRole = allRoles.find(r => r.id === currentUser.role);
      
      if (currentRole) {
        const allowedModules = currentRole.permissions
          .filter(p => p.permissions.view)
          .map(p => p.moduleId);
        setUserPermissions(allowedModules);
      }
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appRoles') {
        loadPermissions();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadPermissions]);

  React.useEffect(() => {
    if (activeView !== "home" && userPermissions.length > 0) {
      const moduleId = activeView === "my-tasks" ? "tasks" : activeView;
      if (!userPermissions.includes(moduleId)) {
        router.replace("/home");
      }
    }
  }, [activeView, userPermissions, router]);

  if (!currentUser) return null;

  const hasAccess = (moduleId: string) => userPermissions.includes(moduleId);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleViewChange = (view: View) => {
    router.push(`/${view}`);
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
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        {/* Top Navigation Bar - Modern & Clean */}
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="w-full px-6 flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => handleViewChange("home")}
              >
                <AppLogo className="size-6 text-primary transition-transform group-hover:scale-105" />
                <span className="text-sm font-medium tracking-tight text-gray-900">
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
                          "h-8 gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all",
                          ["dashboard", "orders", "my-tasks", "referrals"].includes(activeView) && "text-gray-900 bg-gray-100"
                        )}
                      >
                        <ClipboardCheck className="size-3.5" />
                        Operación
                        <ChevronDown className="size-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1 rounded-xl border border-gray-100 shadow-lg bg-white">
                      {hasAccess('dashboard') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("dashboard")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "dashboard" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <LayoutDashboard className="size-3.5" /> Dashboard
                        </DropdownMenuItem>
                      )}
                      {hasAccess('orders') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("orders")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "orders" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <Package className="size-3.5" /> Pedidos Maestro
                        </DropdownMenuItem>
                      )}
                      {hasAccess('tasks') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("my-tasks")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "my-tasks" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <ClipboardCheck className="size-3.5" /> Mis Tareas
                        </DropdownMenuItem>
                      )}
                      {hasAccess('referrals') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("referrals")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "referrals" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <Truck className="size-3.5" /> Remisiones
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
                          "h-8 gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all",
                          ["mapping", "directory", "materials", "users", "owners", "roles"].includes(activeView) && "text-gray-900 bg-gray-100"
                        )}
                      >
                        <Settings className="size-3.5" />
                        Administración
                        <ChevronDown className="size-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1 rounded-xl border border-gray-100 shadow-lg bg-white">
                      {hasAccess('owners') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("owners")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "owners" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <Briefcase className="size-3.5" /> Propietarios
                        </DropdownMenuItem>
                      )}
                      {hasAccess('mapping') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("mapping")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "mapping" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <GitCompare className="size-3.5" /> Homologación
                        </DropdownMenuItem>
                      )}
                      {(hasAccess('owners') || hasAccess('mapping')) && <DropdownMenuSeparator className="my-1" />}
                      {hasAccess('directory') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("directory")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "directory" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <Contact2 className="size-3.5" /> Directorio
                        </DropdownMenuItem>
                      )}
                      {hasAccess('materials') && (
                        <DropdownMenuItem 
                          onClick={() => handleViewChange("materials")} 
                          className={cn(
                            "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                            activeView === "materials" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                          )}
                        >
                          <FileText className="size-3.5" /> Catálogo Materiales
                        </DropdownMenuItem>
                      )}
                      {(hasAccess('users') || hasAccess('roles')) && (
                        <>
                          <DropdownMenuSeparator className="my-1" />
                          {hasAccess('users') && (
                            <DropdownMenuItem 
                              onClick={() => handleViewChange("users")} 
                              className={cn(
                                "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                                activeView === "users" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                              )}
                            >
                              <Users2 className="size-3.5" /> Usuarios
                            </DropdownMenuItem>
                          )}
                          {hasAccess('roles') && (
                            <DropdownMenuItem 
                              onClick={() => handleViewChange("roles")} 
                              className={cn(
                                "rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer",
                                activeView === "roles" ? "text-gray-900 bg-gray-50" : "text-gray-600"
                              )}
                            >
                              <ShieldCheck className="size-3.5" /> Roles y Permisos
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-xs font-medium text-gray-700 leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">{currentUser.role}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-gray-100 transition-all p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl border border-gray-100 shadow-lg bg-white">
                  <div className="flex items-center gap-3 p-3 pb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">{currentUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-900 leading-tight">{currentUser.name}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">{currentUser.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={() => handleViewChange("home")} 
                    className="rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer text-gray-600"
                  >
                    <Eye className="size-3.5" /> Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer text-gray-600">
                    <Settings className="size-3.5" /> Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="rounded-lg h-9 gap-2.5 text-[13px] font-medium cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <LogOut className="size-3.5" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Breadcrumbs Navigation - Minimal */}
        <div className="bg-white px-6 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <button 
            onClick={() => handleViewChange("home")}
            className="p-0.5 hover:bg-gray-100 rounded-md transition-colors group"
          >
            <HomeIcon className={cn(
              "size-3.5 transition-colors", 
              activeView === "home" ? "text-gray-700" : "text-gray-400 group-hover:text-gray-600"
            )} />
          </button>
          {activeView !== "home" && (
            <>
              <ChevronRight className="size-3 text-gray-300" />
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                {getCategoryName()}
              </span>
              
              {activeView === "orders" && ordersSubView === "detail" ? (
                <>
                  <ChevronRight className="size-3 text-gray-300" />
                  <span 
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700 cursor-pointer transition-colors uppercase tracking-wide"
                    onClick={() => onOrdersViewChange?.('list')}
                  >
                    Certificaciones
                  </span>
                  <ChevronRight className="size-3 text-gray-300" />
                  <span className="text-[11px] font-medium text-gray-900 truncate max-w-[250px]">
                    {selectedProcessName}
                  </span>
                </>
              ) : (
                <>
                  <ChevronRight className="size-3 text-gray-300" />
                  <span className="text-[11px] font-medium text-gray-900">
                    {getPageTitle()}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 w-full p-6">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}