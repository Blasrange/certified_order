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

const APP_MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="size-4" />, allowed: ['view'] },
  { id: 'orders', name: 'Pedidos Maestro', icon: <Package className="size-4" />, allowed: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
  { id: 'tasks', name: 'Mis Tareas', icon: <ClipboardList className="size-4" />, allowed: ['view', 'edit'] },
  { id: 'referrals', name: 'Remisiones', icon: <Truck className="size-4" />, allowed: ['view', 'export', 'print'] },
  { id: 'owners', name: 'Propietarios', icon: <Building2 className="size-4" />, allowed: ['view', 'create', 'edit'] },
  { id: 'mapping', name: 'Homologación', icon: <GitCompare className="size-4" />, allowed: ['view', 'create', 'edit'] },
  { id: 'directory', name: 'Directorio Maestro', icon: <Users2 className="size-4" />, allowed: ['view', 'create', 'edit', 'import'] },
  { id: 'materials', name: 'Catálogo Materiales', icon: <FileText className="size-4" />, allowed: ['view', 'create', 'edit', 'import'] },
  { id: 'users', name: 'Usuarios', icon: <ShieldCheck className="size-4" />, allowed: ['view', 'create', 'edit'] },
  { id: 'roles', name: 'Roles y Permisos', icon: <Settings2 className="size-4" />, allowed: ['view', 'create', 'edit'] },
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
      // Solo contar permisos que pertenecen al módulo Y están en true
      const assignedInModule = moduleInfo.allowed.filter(key => (mp.permissions as any)[key] === true).length;
      return acc + assignedInModule;
    }, 0) || 0;
  }, [formData.permissions]);

  return (
    <div className="flex flex-col h-full">
      {/* Role Identity Info */}
      <div className="px-8 pb-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Nombre del Rol <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
              className="rounded-full border-slate-200 h-12 px-6 font-bold bg-slate-50 shadow-inner"
              placeholder="Ej: Supervisor Logístico"
              required
            />
          </div>
          <div className="flex items-center justify-between px-6 h-12 bg-slate-50 border border-slate-100 rounded-full shadow-inner">
            <span className="text-[11px] font-bold text-slate-500">Estado habilitado</span>
            <div className="flex items-center gap-3">
              <Switch 
                checked={formData.isActive} 
                onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} 
                className="scale-75" 
              />
              <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                {formData.isActive ? 'activo' : 'inactivo'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 px-8">
        <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-primary">{APP_MODULES.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulos Validados</span>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-800">{totalFunctions}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Funciones Activas</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-primary">{totalAssigned}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Habilitadas</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 px-8 mb-6">
        <div className="relative group flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
          <Input 
            placeholder="Filtrar por módulo operativo..." 
            className="h-11 pl-11 rounded-full bg-slate-50 border-none font-medium shadow-inner" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleSelectAll(true)} 
            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] h-11 px-6 gap-2"
          >
            <CheckCircle2 className="size-4" /> SELECCIONAR TODO
          </Button>
          <Button 
            onClick={() => handleSelectAll(false)} 
            className="rounded-full bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] h-11 px-6 gap-2"
          >
            <X className="size-4" /> LIMPIAR
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((mp) => {
            const moduleInfo = APP_MODULES.find(m => m.id === mp.moduleId);
            if (!moduleInfo) return null;

            const perms = mp.permissions;
            const allowed = moduleInfo.allowed;
            const isComplete = allowed.every((key: any) => (perms as any)[key]);

            return (
              <Card key={mp.moduleId} className={cn("border-slate-100 shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all", !perms.view && "opacity-75")}>
                <CardContent className="p-0">
                  <div className={cn("p-4 flex items-center justify-between border-b transition-colors", perms.view ? "bg-slate-50/50" : "bg-slate-100/30")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("size-8 rounded-xl border flex items-center justify-center shadow-sm", perms.view ? "bg-white border-slate-100 text-primary" : "bg-slate-50 border-transparent text-slate-300")}>
                        {moduleInfo.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{mp.moduleName}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Capacidades</span>
                      </div>
                    </div>
                    {isComplete && perms.view ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 shadow-none text-[8px] font-black gap-1 uppercase">
                        <Check className="size-2.5" /> Full
                      </Badge>
                    ) : null}
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      {allowed.includes('view') && (
                        <div className="flex items-center gap-2">
                          <Checkbox id={`${mp.moduleId}-view`} checked={perms.view} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'view')} className="rounded-md border-slate-200" />
                          <Label htmlFor={`${mp.moduleId}-view`} className="text-[10px] font-bold text-slate-500 cursor-pointer flex items-center gap-1.5"><Eye className="size-3" /> Ver</Label>
                        </div>
                      )}
                      {allowed.includes('create') && (
                        <div className={cn("flex items-center gap-2", !perms.view && "opacity-30 pointer-events-none")}>
                          <Checkbox id={`${mp.moduleId}-create`} checked={perms.create} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'create')} className="rounded-md border-slate-200" />
                          <Label htmlFor={`${mp.moduleId}-create`} className="text-[10px] font-bold text-slate-500 cursor-pointer flex items-center gap-1.5"><PlusCircle className="size-3" /> Nuevo</Label>
                        </div>
                      )}
                      {allowed.includes('edit') && (
                        <div className={cn("flex items-center gap-2", !perms.view && "opacity-30 pointer-events-none")}>
                          <Checkbox id={`${mp.moduleId}-edit`} checked={perms.edit} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'edit')} className="rounded-md border-slate-200" />
                          <Label htmlFor={`${mp.moduleId}-edit`} className="text-[10px] font-bold text-slate-500 cursor-pointer flex items-center gap-1.5"><Pencil className="size-3" /> Editar</Label>
                        </div>
                      )}
                      {allowed.includes('delete') && (
                        <div className={cn("flex items-center gap-2", !perms.view && "opacity-30 pointer-events-none")}>
                          <Checkbox id={`${mp.moduleId}-delete`} checked={perms.delete} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'delete')} className="rounded-md border-slate-200" />
                          <Label htmlFor={`${mp.moduleId}-delete`} className="text-[10px] font-bold text-red-400 cursor-pointer flex items-center gap-1.5"><X className="size-3" /> Eliminar</Label>
                        </div>
                      )}
                    </div>

                    {(allowed.includes('import') || allowed.includes('export') || allowed.includes('print')) && (
                      <div className={cn("pt-3 border-t border-slate-50 grid grid-cols-2 gap-y-3 gap-x-2", !perms.view && "opacity-30 pointer-events-none")}>
                        {allowed.includes('import') && (
                          <div className="flex items-center gap-2">
                            <Checkbox id={`${mp.moduleId}-import`} checked={perms.import} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'import')} className="rounded-md border-primary/30" />
                            <Label htmlFor={`${mp.moduleId}-import`} className="text-[10px] font-black text-primary/70 cursor-pointer flex items-center gap-1.5"><GitCompare className="size-3" /> Importar</Label>
                          </div>
                        )}
                        {allowed.includes('export') && (
                          <div className="flex items-center gap-2">
                            <Checkbox id={`${mp.moduleId}-export`} checked={perms.export} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'export')} className="rounded-md border-primary/30" />
                            <Label htmlFor={`${mp.moduleId}-export`} className="text-[10px] font-black text-primary/70 cursor-pointer flex items-center gap-1.5"><FileText className="size-3" /> Exportar</Label>
                          </div>
                        )}
                        {allowed.includes('print') && (
                          <div className="flex items-center gap-2">
                            <Checkbox id={`${mp.moduleId}-print`} checked={perms.print} onCheckedChange={() => handleTogglePermission(mp.moduleId, 'print')} className="rounded-md border-primary/30" />
                            <Label htmlFor={`${mp.moduleId}-print`} className="text-[10px] font-black text-primary/70 cursor-pointer flex items-center gap-1.5"><Truck className="size-3" /> Imprimir</Label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <DialogFooter className="p-8 bg-slate-50/50 border-t mt-auto shrink-0 gap-3">
        <div className="flex-1 flex items-center gap-2 text-amber-600">
          <Settings2 className="size-4" />
          <span className="text-[9px] font-bold uppercase tracking-tighter italic">Seguridad Basada en Roles (RBAC)</span>
        </div>
        <Button variant="ghost" onClick={onCancel} className="rounded-full font-bold h-12 px-8 bg-white border border-slate-200 text-slate-600 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button 
          onClick={() => onSave(formData)} 
          disabled={!formData.name}
          className="bg-primary text-white rounded-full font-black h-12 px-10 shadow-xl shadow-primary/20 gap-2 uppercase text-[10px] tracking-widest"
        >
          <Save className="size-5" /> Aplicar Configuración
        </Button>
      </DialogFooter>
    </div>
  );
};

const RolesPanel = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<AppRole> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem('appRoles');
    setRoles(saved ? JSON.parse(saved) : mockRoles);
  }, []);

  const saveToStorage = (updated: AppRole[]) => {
    setRoles(updated);
    void persistRoles(updated).catch((error) => {
      console.error('No se pudo sincronizar roles.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "Los roles se guardaron localmente, pero no se pudo subir la actualizacion a la base de datos." });
    });
  };

  const handleSaveRole = (data: any) => {
    if (!data.name) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "El nombre del rol es obligatorio." });
      return;
    }

    let updated;
    if (data.id && roles.some(r => r.id === data.id)) {
      updated = roles.map(r => r.id === data.id ? { ...r, ...data } : r);
      toast({ title: "Rol actualizado", description: `El rol '${data.name}' ha sido sincronizado.` });
    } else {
      const newRole = { 
        ...data, 
        id: `ROLE-${Date.now()}`, 
        createdAt: new Date().toISOString() 
      };
      updated = [newRole, ...roles];
      toast({ title: "Nuevo rol definido", description: `Se ha creado el perfil '${data.name}'.` });
    }
    saveToStorage(updated);
    setIsDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    const updated = roles.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r);
    saveToStorage(updated);
    toast({ title: "Estado del rol actualizado" });
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre de rol..." 
                className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button onClick={() => { setEditingRole({ isActive: true }); setIsDialogOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white uppercase tracking-tighter">
            <PlusCircle className="size-4" /> Nuevo Perfil de Seguridad
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRoles.map((role) => {
          const modulesCount = role.permissions?.filter(p => p.permissions.view).length || 0;
          const completeness = (modulesCount / APP_MODULES.length) * 100;

          return (
            <Card key={role.id} className={cn("group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-[2.5rem] flex flex-col h-fit", !role.isActive && "opacity-60")}>
              <CardHeader className="pb-2 pt-8 px-8 bg-muted/5 border-b relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-3 rounded-2xl", role.isActive ? "bg-primary/10 text-primary" : "bg-slate-200")}>
                    <ShieldCheck className="size-6" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={role.isActive} onCheckedChange={() => toggleStatus(role.id)} className="scale-75" />
                    <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", role.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                      {role.isActive ? 'activo' : 'inactivo'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tighter">{role.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-6 space-y-6">
                <p className="text-[11px] font-medium text-slate-500 line-clamp-2 h-8">
                  {role.description || "Perfil de seguridad configurado para la gestión de accesos granulares del sistema."}
                </p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-end">
                    <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Habilitación</span>
                    <span className="text-xs font-black">{modulesCount}/{APP_MODULES.length} Módulos</span>
                  </div>
                  <Progress value={completeness} className="h-2 bg-slate-100 rounded-full" />
                </div>
                <Button className="w-full h-12 rounded-2xl font-black text-xs bg-primary text-white shadow-xl shadow-primary/20 gap-2" onClick={() => { setEditingRole(role); setIsDialogOpen(true); }}>
                  <Settings2 className="size-4" /> Configurar permisos
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {paginatedRoles.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-muted-foreground italic font-bold opacity-30">
            No se encontraron perfiles de seguridad.
          </div>
        )}
      </div>

      <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[1400px] h-[90vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <DialogHeader className="p-8 pb-2 shrink-0 bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Settings2 className="size-8" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">Editor de Seguridad</DialogTitle>
                  <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                    Configura la identidad del rol y las acciones permitidas por módulo operativo.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-white pt-6">
            <RolePermissionsEditor 
              role={editingRole} 
              onSave={handleSaveRole} 
              onCancel={() => setIsDialogOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPanel;