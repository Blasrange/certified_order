"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  PlusCircle, 
  Pencil, 
  Search, 
  User,
  Mail,
  Save,
  X,
  ShieldCheck,
  Smartphone,
  Key,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  Users,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { User as UserType, AppRole, Owner } from "@/lib/types";
import { mockUsers, mockRoles, mockOwners } from "@/lib/data";
import { persistOwners, persistRoles, persistUsers } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const getPrefix = (docType?: string) => {
  switch (docType) {
    case 'Cédula de ciudadanía': return 'CC';
    case 'Cédula de extranjería': return 'CE';
    case 'Pasaporte': return 'PA';
    default: return '';
  }
};

const buildInitialUserFormData = (
  user: Partial<UserType> | null,
  roles: AppRole[]
): Partial<UserType> => {
  const fallbackRole = roles[0]?.id;

  return {
    name: user?.name || '',
    email: user?.email || '',
    documentNumber: user?.documentNumber || '',
    phone: user?.phone || '',
    isActive: user?.isActive ?? true,
    documentType: user?.documentType || 'Cédula de ciudadanía',
    otpMethod: user?.otpMethod || 'email',
    role: user?.role || fallbackRole || undefined,
    ownerIds: user?.ownerIds || [],
    id: user?.id || undefined,
  };
};

// Modal de selección de propietarios - con tabla paginada de 10 filas
const OwnerSelectionModal = ({ 
  owners, 
  selectedIds, 
  onConfirm, 
  onCancel 
}: { 
  owners: Owner[], 
  selectedIds: string[], 
  onConfirm: (ids: string[]) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleToggleOwner = (ownerId: string) => {
    setTempSelectedIds(prev => 
      prev.includes(ownerId) 
        ? prev.filter(id => id !== ownerId)
        : [...prev, ownerId]
    );
  };

  const handleSelectAll = () => {
    setTempSelectedIds(filteredOwners.map(o => o.id));
  };

  const handleDeselectAll = () => {
    setTempSelectedIds([]);
  };

  const filteredOwners = useMemo(() => {
    return owners.filter(o => 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.nit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [owners, searchTerm]);

  const totalPages = Math.ceil(filteredOwners.length / itemsPerPage);
  const paginatedOwners = useMemo(() => 
    filteredOwners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredOwners, currentPage, itemsPerPage]);

  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                Seleccionar propietarios
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecciona los propietarios que tendrán acceso a este usuario
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o NIT..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Botones de acción rápida */}
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-medium rounded-lg flex-1"
              onClick={handleSelectAll}
            >
              Seleccionar todos
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-medium rounded-lg flex-1"
              onClick={handleDeselectAll}
            >
              Deseleccionar todos
            </Button>
          </div>

          {/* Tabla de propietarios */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                      Sel.
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Nombre / NIT
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Contacto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOwners.map((owner) => {
                    const isSelected = tempSelectedIds.includes(owner.id);
                    return (
                      <TableRow 
                        key={owner.id} 
                        className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50"
                        onClick={() => handleToggleOwner(owner.id)}
                      >
                        <TableCell className="pl-5 py-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleToggleOwner(owner.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-slate-800")}>
                              {owner.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">NIT: {owner.nit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600">{owner.email || 'No registrado'}</span>
                            <span className="text-[10px] text-slate-400">{owner.phone || 'Sin teléfono'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedOwners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Building2 className="size-10 mb-2 text-slate-300" />
                          <p className="text-sm font-medium">No se encontraron propietarios</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Paginación - mismo estilo de la vista principal */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredOwners.length}
                pageSize={itemsPerPage}
                onPageSizeChange={setItemsPerPage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 gap-3">
          <Button variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="dialog-btn-primary"
          >
            <Check className="size-4 mr-2" /> Confirmar ({tempSelectedIds.length} seleccionados)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserForm = ({ user, roles, owners, onSave, onCancel }: { user: Partial<UserType> | null, roles: AppRole[], owners: Owner[], onSave: (user: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<UserType>>(() => buildInitialUserFormData(user, roles));
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  const handleSelectChange = <K extends keyof UserType>(field: K, value: UserType[K]) => {
    setFormData((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const currentPrefix = getPrefix(formData.documentType);
  const calculatedLoginId = `${currentPrefix}${formData.documentNumber || ''}`;

  const handleOwnerConfirm = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, ownerIds: selectedIds }));
    setIsOwnerModalOpen(false);
  };

  const selectedOwnersCount = formData.ownerIds?.length || 0;
  const selectedRole = formData.role || roles[0]?.id;
  const selectedOwnersList = owners.filter(o => formData.ownerIds?.includes(o.id));

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, role: selectedRole, loginId: calculatedLoginId }); }} className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <User className="size-3.5 text-slate-400" /> Nombre completo <span className="text-red-500">*</span>
                </Label>
                <Input id="name" value={formData.name || ''} onChange={handleChange} className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="size-3.5 text-slate-400" /> Correo electrónico <span className="text-red-500">*</span>
                </Label>
                <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" placeholder="ejemplo@correo.com" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de documento <span className="text-red-500">*</span></Label>
                <select
                  value={formData.documentType || 'Cédula de ciudadanía'}
                  onChange={(e) => handleSelectChange('documentType', e.target.value)}
                  className="rounded-xl h-11 px-4 text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                >
                  <option value="Cédula de ciudadanía">Cédula de ciudadanía</option>
                  <option value="Cédula de extranjería">Cédula de extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">N° Identificación <span className="text-red-500">*</span></Label>
                <Input id="documentNumber" value={formData.documentNumber || ''} onChange={handleChange} className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" placeholder="123456789" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Número de celular</Label>
                <Input id="phone" value={formData.phone || ''} onChange={handleChange} className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" placeholder="3001234567" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Rol asignado <span className="text-red-500">*</span></Label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleSelectChange('role', e.target.value)}
                  className="rounded-xl h-11 px-4 text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Verificación OTP <span className="text-red-500">*</span></Label>
                <select
                  value={formData.otpMethod || 'email'}
                  onChange={(e) => handleSelectChange('otpMethod', e.target.value as UserType['otpMethod'])}
                  className="rounded-xl h-11 px-4 text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                >
                  <option value="email">Correo electrónico</option>
                  <option value="sms">Mensaje SMS</option>
                </select>
              </div>
            </div>

            {/* Usuario generado */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Key className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Usuario de ingreso generado</p>
                  <p className="text-base font-bold text-primary font-mono mt-0.5">{calculatedLoginId || 'Pendiente...'}</p>
                </div>
                <Badge className="bg-white text-primary border-primary/20 text-[9px] font-semibold px-2 py-0.5 rounded-full">Automático</Badge>
              </div>
            </div>

            {/* Selección de propietarios */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Building2 className="size-3.5 text-slate-400" /> Propietarios autorizados <span className="text-red-500">*</span>
              </Label>

              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsOwnerModalOpen(true)}
                className="w-full h-12 rounded-xl border-slate-200 bg-white px-5 justify-between hover:bg-slate-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="size-4 text-primary/70" />
                  <span className="text-sm font-medium text-slate-700">
                    {selectedOwnersCount === 0 
                      ? "Ningún propietario seleccionado" 
                      : `${selectedOwnersCount} ${selectedOwnersCount === 1 ? 'propietario seleccionado' : 'propietarios seleccionados'}`}
                  </span>
                </div>
                <ChevronDown className="size-4 text-slate-400" />
              </Button>

              {/* Lista de propietarios seleccionados */}
              {selectedOwnersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedOwnersList.map(owner => (
                    <Badge key={owner.id} className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium px-2.5 py-1 rounded-full">
                      {owner.name}
                    </Badge>
                  ))}
                </div>
              )}

              {selectedOwnersCount === 0 && (
                <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1.5 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                  <ShieldCheck className="size-3" /> Precaución: El usuario no tendrá visibilidad sin al menos un propietario asignado.
                </p>
              )}
            </div>

            {/* Estado */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Acceso habilitado</Label>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Define si el usuario puede iniciar sesión</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formData.isActive || false} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} />
                <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                  formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                )}>
                  {formData.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 gap-3 border-t pt-5 bg-slate-50/50 px-6 pb-6">
          <Button type="button" variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button type="submit" className="dialog-btn-primary">
            <Save className="size-4 mr-2" /> Guardar usuario
          </Button>
        </DialogFooter>
      </form>

      {/* Modal de selección de propietarios */}
      {isOwnerModalOpen && (
        <OwnerSelectionModal 
          owners={owners}
          selectedIds={formData.ownerIds || []}
          onConfirm={handleOwnerConfirm}
          onCancel={() => setIsOwnerModalOpen(false)}
        />
      )}
    </>
  );
};

const UsersPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setUsers(appData.users.length > 0 ? appData.users : mockUsers);
    setRoles(appData.roles.length > 0 ? appData.roles : mockRoles);
    setOwners(appData.owners.length > 0 ? appData.owners : mockOwners);
  }, [appData.owners, appData.roles, appData.users]);

  const syncUserDependencies = async () => {
    await persistRoles(roles);
    if (owners.length > 0) {
      await persistOwners(owners);
    }
  };

  const handleSave = async (data: any) => {
    const normalizedOwnerIds = Array.from(new Set((data.ownerIds || []).filter(Boolean)));
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    const normalizedLoginId = String(data.loginId || `${getPrefix(data.documentType)}${data.documentNumber || ''}`).trim().toUpperCase();

    if (normalizedOwnerIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Propietarios requeridos",
        description: "Debes seleccionar al menos un propietario.",
      });
      return;
    }

    const duplicateDocument = users.find(u => 
      u.documentNumber === data.documentNumber && u.id !== data.id
    );
    const duplicateEmail = users.find(
      (u) => u.email.trim().toLowerCase() === normalizedEmail && u.id !== data.id
    );
    const duplicateLoginId = users.find(
      (u) => String(u.loginId || `${getPrefix(u.documentType)}${u.documentNumber || ''}`).trim().toUpperCase() === normalizedLoginId && u.id !== data.id
    );

    if (duplicateDocument) {
      toast({ variant: "destructive", title: "Identificación duplicada", description: `El número ${data.documentNumber} ya está registrado.` });
      return;
    }
    if (duplicateEmail) {
      toast({ variant: "destructive", title: "Correo duplicado", description: `El correo ${data.email} ya está registrado.` });
      return;
    }
    if (duplicateLoginId) {
      toast({ variant: "destructive", title: "Usuario duplicado", description: `El usuario ${normalizedLoginId} ya está registrado.` });
      return;
    }

    const normalizedData = { ...data, email: normalizedEmail, loginId: normalizedLoginId, ownerIds: normalizedOwnerIds };

    const updated = normalizedData.id 
      ? users.map(u => u.id === normalizedData.id ? { ...u, ...normalizedData } : u) 
      : [{ 
          ...normalizedData, 
          id: `USER-${Date.now()}`, 
          avatar: `https://picsum.photos/seed/${Date.now()}/150/150`, 
          isFirstLogin: true 
        }, ...users];

    setUsers(updated);
    setIsDialogOpen(false);
    setEditingUser(null);

    try {
      await syncUserDependencies();
      await persistUsers(updated);
      await appData.refresh();
      toast({
        title: normalizedData.id ? "Usuario actualizado" : "Usuario creado",
        description: `La información de ${normalizedData.name} fue guardada correctamente.`,
      });
    } catch (error) {
      console.error('No se pudo sincronizar usuarios.', error);
      setUsers(updated);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "El usuario quedó guardado localmente, pero no fue posible sincronizarlo con la base de datos." });
    }
  };

  const toggleStatus = async (user: UserType) => {
    const newStatus = !user.isActive;
    const updated = users.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u);
    try {
      await syncUserDependencies();
      await persistUsers(updated);
      await appData.refresh();
      setUsers(updated);
      toast({
        title: newStatus ? "Usuario activado" : "Usuario desactivado",
        description: `El estado de ${user.name} fue actualizado correctamente.`,
      });
    } catch (error) {
      console.error('No se pudo sincronizar usuarios.', error);
      setUsers(updated);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "El cambio de estado quedó guardado localmente, pero no fue posible sincronizarlo con la base de datos." });
    }
  };

  const filtered = useMemo(() => 
    users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.documentNumber?.includes(searchTerm) ||
      u.loginId?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => 
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filtered, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre, email, identificación o usuario..." 
                className="pl-10 h-10 w-96 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button 
            onClick={() => { setEditingUser({ isActive: true, ownerIds: [] }); setIsDialogOpen(true); }} 
            className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
          >
            <PlusCircle className="size-4" /> Nuevo usuario
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario / Ingreso</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Identificación</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Propietarios</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <User className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay usuarios registrados</p>
                      <p className="text-xs text-slate-400 mt-1">Haz clic en "Nuevo usuario" para crear uno</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(u => {
                  const roleName = roles.find(r => r.id === u.role)?.name || u.role;
                  const ownersCount = u.ownerIds?.length || 0;
                  return (
                    <TableRow key={u.id} className={cn("group hover:bg-slate-50/50 transition-colors border-b border-slate-50", !u.isActive && "opacity-60")}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg ring-2 ring-primary/10">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-bold text-sm">
                              {u.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">{u.name}</span>
                            <span className="text-[10px] font-mono text-primary font-semibold mt-0.5">{u.loginId}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{u.documentType}</span>
                          <span className="text-[11px] font-mono font-bold text-slate-700">{u.documentNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-400" />
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] font-bold rounded-full px-2 py-0.5">
                            {ownersCount} {ownersCount === 1 ? 'propietario' : 'propietarios'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                          {roleName}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch 
                            checked={u.isActive || false} 
                            onCheckedChange={() => toggleStatus(u)} 
                          />
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                            u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                          )}>
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200" 
                          onClick={() => { setEditingUser(u); setIsDialogOpen(true); }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación - 10 filas por página */}
      {filtered.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
          <CardContent className="p-0">
            <DataTablePagination 
              totalRows={filtered.length} 
              pageSize={itemsPerPage} 
              onPageSizeChange={setItemsPerPage} 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </CardContent>
        </Card>
      )}

      {/* Modal principal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl w-full max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2 shrink-0 bg-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingUser?.id ? 'Editar' : 'Nuevo'} usuario
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestión de identidades, permisos y propietarios autorizados
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isDialogOpen && (
              <UserForm 
                key={editingUser?.id || 'new'}
                user={editingUser} 
                roles={roles} 
                owners={owners}
                onSave={handleSave} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPanel;