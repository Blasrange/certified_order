"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PlusCircle, 
  Pencil, 
  Search, 
  ShieldCheck, 
  Save, 
  X,
  CheckCircle2,
  Settings2,
  LayoutDashboard,
  Package,
  ClipboardList,
  Truck,
  Building2,
  GitCompare,
  FileText,
  Users2,
  Check,
  SearchIcon,
  Eye,
  Sparkles,
  Crown,
  Zap,
  Lock,
  Unlock,
  Star,
  Shield,
  Award,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { mockRoles } from "@/lib/data";
import { persistRoles } from "@/lib/app-data-client";
import type { AppRole, ModulePermissions } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const APP_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="size-4" />, allowed: ['view'], color: 'from-blue-500 to-cyan-500' },
  { id: 'orders', name: 'Pedidos Maestro', icon: <Package className="size-4" />, allowed: ['view', 'create', 'edit', 'delete', 'import', 'export'], color: 'from-indigo-500 to-purple-500' },
  { id: 'tasks', name: 'Mis Tareas', icon: <ClipboardList className="size-4" />, allowed: ['view', 'edit'], color: 'from-emerald-500 to-teal-500' },
  { id: 'referrals', name: 'Remisiones', icon: <Truck className="size-4" />, allowed: ['view', 'export', 'print'], color: 'from-orange-500 to-amber-500' },
  { id: 'owners', name: 'Propietarios', icon: <Building2 className="size-4" />, allowed: ['view', 'create', 'edit'], color: 'from-rose-500 to-pink-500' },
  { id: 'mapping', name: 'Homologación', icon: <GitCompare className="size-4" />, allowed: ['view', 'create', 'edit'], color: 'from-violet-500 to-purple-500' },
  { id: 'directory', name: 'Directorio Maestro', icon: <Users2 className="size-4" />, allowed: ['view', 'create', 'edit', 'import'], color: 'from-cyan-500 to-blue-500' },
  { id: 'materials', name: 'Catálogo Materiales', icon: <FileText className="size-4" />, allowed: ['view', 'create', 'edit', 'import'], color: 'from-lime-500 to-green-500' },
  { id: 'users', name: 'Usuarios', icon: <ShieldCheck className="size-4" />, allowed: ['view', 'create', 'edit'], color: 'from-red-500 to-rose-500' },
  { id: 'roles', name: 'Roles y Permisos', icon: <Settings2 className="size-4" />, allowed: ['view', 'create', 'edit'], color: 'from-slate-600 to-slate-800' },
];

const RolePermissionsEditor = ({ role, onSave, onCancel }: { role: Partial<AppRole> | null, onSave: (role: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<AppRole>>(() => {
    const mergedPermissions = APP_MODULES.map(m => {
      const existing = role?.permissions?.find(p => p.moduleId === m.id);
      return {
        moduleId: m.id,
        moduleName: m.name,
        permissions: {
          view: !!existing?.permissions?.view,
          create: !!existing?.permissions?.create,
          edit: !!existing?.permissions?.edit,
          delete: !!existing?.permissions?.delete,
          import: !!existing?.permissions?.import,
          export: !!existing?.permissions?.export,
          print: !!existing?.permissions?.print,
        }
      };
    });

    return {
      id: role?.id,
      name: role?.name || '',
      description: role?.description || '',
      isActive: role?.isActive ?? true,
      permissions: mergedPermissions,
    };
  });

  const [searchTerm, setSearchTerm] = useState("");

  const handleTogglePermission = (moduleId: string, permKey: keyof ModulePermissions['permissions']) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions?.map(mp => {
        if (moduleId === mp.moduleId) {
          return {
            ...mp,
            permissions: { ...mp.permissions, [permKey]: !mp.permissions[permKey] }
          };
        }
        return mp;
      })
    }));
  };

  const handleSelectAll = (select: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions?.map(mp => {
        const moduleInfo = APP_MODULES.find(m => m.id === mp.moduleId);
        const newPerms = { ...mp.permissions };
        moduleInfo?.allowed.forEach((key: any) => {
          (newPerms as any)[key] = select;
        });
        return { ...mp, permissions: newPerms };
      })
    }));
  };

  const filteredModules = useMemo(() => {
    return formData.permissions?.filter(mp => 
      mp.moduleName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [formData.permissions, searchTerm]);

  const totalFunctions = useMemo(() => {
    return APP_MODULES.reduce((acc, m) => acc + m.allowed.length, 0);
  }, []);

  const totalAssigned = useMemo(() => {
    return formData.permissions?.reduce((acc, mp) => {
      const moduleInfo = APP_MODULES.find(m => m.id === mp.moduleId);
      if (!moduleInfo) return acc;
      const assignedInModule = moduleInfo.allowed.filter(key => (mp.permissions as any)[key] === true).length;
      return acc + assignedInModule;
    }, 0) || 0;
  }, [formData.permissions]);

  const completionPercentage = (totalAssigned / totalFunctions) * 100;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 mx-6 mt-6 rounded-2xl shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%239C92AC\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}} />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur rounded-2xl">
                <Shield className="size-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Editor de Seguridad Avanzado</h3>
                <p className="text-sm text-white/60 mt-0.5">Configuración granular de permisos RBAC</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{APP_MODULES.length}</div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Módulos</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalFunctions}</div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Funciones</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{totalAssigned}</div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Habilitadas</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Configuración del Rol</span>
              <span className="text-xs font-bold text-white">{Math.round(completionPercentage)}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role Identity Info */}
      <div className="px-6 pt-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Crown className="size-3.5 text-amber-500" /> Nombre del rol <span className="text-red-500">*</span>
            </Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
              className="rounded-xl border-slate-200 h-12 px-5 text-sm font-medium bg-white shadow-sm focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: Supervisor Logístico"
              required
            />
          </div>
          <div className="flex items-center justify-between px-5 h-12 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              {formData.isActive ? <Unlock className="size-3.5 text-emerald-500" /> : <Lock className="size-3.5 text-red-500" />}
              Estado del rol
            </span>
            <div className="flex items-center gap-3">
              <Switch 
                checked={formData.isActive} 
                onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} 
              />
              <Badge className={cn("text-[9px] font-bold px-2.5 py-0.5 rounded-full border", 
                formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
              )}>
                {formData.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4 px-6 pb-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Buscar módulo..." 
            className="h-10 pl-10 rounded-xl bg-white border-slate-200 text-sm font-medium" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleSelectAll(true)} 
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-xs h-10 px-5 gap-2 shadow-md"
          >
            <Sparkles className="size-3.5" /> Seleccionar todo
          </Button>
          <Button 
            onClick={() => handleSelectAll(false)} 
            variant="outline"
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs h-10 px-5 gap-2"
          >
            <X className="size-3.5" /> Limpiar todo
          </Button>
        </div>
      </div>

      {/* Permissions Grid */}
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((mp) => {
            const moduleInfo = APP_MODULES.find(m => m.id === mp.moduleId);
            if (!moduleInfo) return null;

            const perms = mp.permissions;
            const allowed = moduleInfo.allowed;
            const isComplete = allowed.every((key: any) => (perms as any)[key]);
            const hasView = perms.view;

            return (
              <div 
                key={mp.moduleId} 
                className={cn(
                  "group relative rounded-xl transition-all duration-300",
                  hasView ? "bg-white border border-slate-200 shadow-sm hover:shadow-md" : "bg-slate-50 border border-slate-100 opacity-75"
                )}
              >
                {/* Module Header */}
                <div className={cn(
                  "p-4 rounded-t-xl border-b transition-colors",
                  hasView ? "bg-gradient-to-r from-primary/5 to-transparent" : "bg-slate-100/50"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl bg-gradient-to-br shadow-sm",
                        moduleInfo.color,
                        hasView ? "text-white" : "text-slate-400 bg-slate-200"
                      )}>
                        {moduleInfo.icon}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800">{mp.moduleName}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isComplete && hasView && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-bold px-1.5 py-0 rounded">
                              <Star className="size-2.5 mr-0.5" /> Full access
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {allowed.includes('view') && (
                      <div className="flex items-center gap-1.5">
                        <Checkbox 
                          id={`${mp.moduleId}-view`} 
                          checked={perms.view} 
                          onCheckedChange={() => handleTogglePermission(mp.moduleId, 'view')} 
                          className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions List */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {allowed.includes('create') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-create`}
                        label="Crear"
                        checked={perms.create}
                        disabled={!hasView}
                        icon={<PlusCircle className="size-3" />}
                        onChange={() => handleTogglePermission(mp.moduleId, 'create')}
                      />
                    )}
                    {allowed.includes('edit') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-edit`}
                        label="Editar"
                        checked={perms.edit}
                        disabled={!hasView}
                        icon={<Pencil className="size-3" />}
                        onChange={() => handleTogglePermission(mp.moduleId, 'edit')}
                      />
                    )}
                    {allowed.includes('delete') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-delete`}
                        label="Eliminar"
                        checked={perms.delete}
                        disabled={!hasView}
                        icon={<X className="size-3" />}
                        variant="danger"
                        onChange={() => handleTogglePermission(mp.moduleId, 'delete')}
                      />
                    )}
                    {allowed.includes('import') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-import`}
                        label="Importar"
                        checked={perms.import}
                        disabled={!hasView}
                        icon={<GitCompare className="size-3" />}
                        onChange={() => handleTogglePermission(mp.moduleId, 'import')}
                      />
                    )}
                    {allowed.includes('export') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-export`}
                        label="Exportar"
                        checked={perms.export}
                        disabled={!hasView}
                        icon={<FileText className="size-3" />}
                        onChange={() => handleTogglePermission(mp.moduleId, 'export')}
                      />
                    )}
                    {allowed.includes('print') && (
                      <PermissionCheckbox
                        id={`${mp.moduleId}-print`}
                        label="Imprimir"
                        checked={perms.print}
                        disabled={!hasView}
                        icon={<Truck className="size-3" />}
                        onChange={() => handleTogglePermission(mp.moduleId, 'print')}
                      />
                    )}
                  </div>
                </div>

                {/* Decorative element */}
                {hasView && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap className="size-3 text-primary/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <DialogFooter className="p-6 bg-white border-t border-slate-100 mt-auto shrink-0 gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Shield className="size-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Seguridad basada en roles (RBAC)</span>
        </div>
        <Button variant="outline" onClick={onCancel} className="dialog-btn-secondary">
          <X className="size-4" /> Cancelar
        </Button>
        <Button 
          onClick={() => onSave(formData)} 
          disabled={!formData.name}
          className="dialog-btn-primary"
        >
          <Save className="size-4 mr-2" /> Guardar configuración
        </Button>
      </DialogFooter>
    </div>
  );
};

// Componente auxiliar para checkboxes de permisos
const PermissionCheckbox = ({ id, label, checked, disabled, icon, variant = 'default', onChange }: any) => (
  <div className={cn("flex items-center gap-2", disabled && "opacity-50")}>
    <Checkbox 
      id={id} 
      checked={checked} 
      onCheckedChange={onChange} 
      disabled={disabled}
      className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
    />
    <Label 
      htmlFor={id} 
      className={cn(
        "text-[10px] font-semibold cursor-pointer flex items-center gap-1.5",
        variant === 'danger' && checked ? "text-red-600" : "text-slate-600"
      )}
    >
      {icon} {label}
    </Label>
  </div>
);

const RolesPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<AppRole> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setRoles(appData.roles.length > 0 ? appData.roles : mockRoles);
  }, [appData.roles]);

  const saveToStorage = (updated: AppRole[]) => {
    setRoles(updated);
    void persistRoles(updated).catch((error) => {
      console.error('No se pudo sincronizar roles.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "Los cambios en roles quedaron guardados localmente, pero no fue posible sincronizarlos con la base de datos." });
    });
    void appData.refresh();
  };

  const handleSaveRole = (data: any) => {
    if (!data.name) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "El nombre del rol es obligatorio." });
      return;
    }

    let updated;
    if (data.id && roles.some(r => r.id === data.id)) {
      updated = roles.map(r => r.id === data.id ? { ...r, ...data } : r);
      toast({ title: "Rol actualizado", description: `La configuración del rol ${data.name} fue guardada correctamente.` });
    } else {
      const newRole = { 
        ...data, 
        id: `ROLE-${Date.now()}`, 
        createdAt: new Date().toISOString() 
      };
      updated = [newRole, ...roles];
      toast({ title: "Rol creado", description: `El rol ${data.name} fue creado correctamente.` });
    }
    saveToStorage(updated);
    setIsDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    const updated = roles.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    const changedRole = updated.find((role) => role.id === id);
    saveToStorage(updated);
    toast({
      title: changedRole?.isActive ? "Rol activado" : "Rol desactivado",
      description: changedRole ? `El estado del rol ${changedRole.name} fue actualizado correctamente.` : "El estado del rol fue actualizado correctamente.",
    });
  };

  const filteredRoles = useMemo(() => 
    roles.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())), 
    [roles, searchTerm]
  );

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = useMemo(() => 
    filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredRoles, currentPage, itemsPerPage]
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre de rol..." 
                className="pl-10 h-10 w-80 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button 
            onClick={() => { setEditingRole({ isActive: true }); setIsDialogOpen(true); }} 
            className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
          >
            <PlusCircle className="size-4" /> Nuevo rol
          </Button>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {paginatedRoles.map((role) => {
          const modulesCount = role.permissions?.filter(p => p.permissions.view).length || 0;
          const completeness = (modulesCount / APP_MODULES.length) * 100;

          return (
            <Card 
              key={role.id} 
              className={cn(
                "group overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-xl flex flex-col",
                !role.isActive && "opacity-60"
              )}
            >
              {/* Card Header */}
              <div className="relative p-5 pb-3 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className={cn(
                    "p-2.5 rounded-xl bg-gradient-to-br shadow-sm",
                    role.isActive ? "from-primary/20 to-primary/10 text-primary" : "from-slate-100 to-slate-50 text-slate-400"
                  )}>
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={role.isActive} 
                      onCheckedChange={() => toggleStatus(role.id)} 
                    />
                    <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                      role.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {role.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-slate-800 tracking-tight">
                  {role.name}
                </CardTitle>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {role.description || "Perfil de seguridad configurado para gestión de accesos granulares."}
                </p>
              </div>

              {/* Card Content */}
              <CardContent className="p-5 space-y-4 flex-1">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[9px] text-slate-400 uppercase tracking-wider">Cobertura</span>
                    <span className="text-[10px] font-bold text-primary">{modulesCount}/{APP_MODULES.length} módulos</span>
                  </div>
                  <Progress value={completeness} className="h-1.5 bg-slate-100 rounded-full" />
                </div>
                
                <Button 
                  className="w-full h-9 rounded-lg font-semibold text-xs bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2" 
                  onClick={() => { setEditingRole(role); setIsDialogOpen(true); }}
                >
                  <Settings2 className="size-3.5" /> Configurar permisos
                </Button>
              </CardContent>

              {/* Decorative badge */}
              {completeness === 100 && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-bold px-1.5 py-0 rounded-full">
                    <Award className="size-2.5 inline mr-0.5" /> Full
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
        
        {paginatedRoles.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
            <ShieldCheck className="size-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">No hay roles de seguridad configurados</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en "Nuevo rol" para crear uno</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredRoles.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
          <CardContent className="p-0">
            <DataTablePagination 
              totalRows={filteredRoles.length} 
              pageSize={itemsPerPage} 
              onPageSizeChange={setItemsPerPage} 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </CardContent>
        </Card>
      )}

      {/* Modal Editor */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border border-slate-100">
          <RolePermissionsEditor 
            role={editingRole} 
            onSave={handleSaveRole} 
            onCancel={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPanel;