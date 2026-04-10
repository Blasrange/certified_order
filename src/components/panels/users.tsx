
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
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { User as UserType, AppRole, Owner } from "@/lib/types";
import { mockUsers, mockRoles, mockOwners } from "@/lib/data";
import { persistUsers } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getPrefix = (docType?: string) => {
  switch (docType) {
    case 'Cédula de ciudadanía': return 'CC';
    case 'Cédula de extranjería': return 'CE';
    case 'Pasaporte': return 'PA';
    default: return '';
  }
};

const UserForm = ({ user, roles, owners, onSave, onCancel }: { user: Partial<UserType> | null, roles: AppRole[], owners: Owner[], onSave: (user: any) => void, onCancel: () => void }) => {
  // Inicialización de estado robusta para evitar bucles en Select
  const [formData, setFormData] = useState<Partial<UserType>>(() => {
    const initialRole = user?.role || (roles.length > 0 ? roles[0].id : '');
    return {
      name: user?.name || '',
      email: user?.email || '',
      documentNumber: user?.documentNumber || '',
      phone: user?.phone || '',
      isActive: user?.isActive ?? true,
      documentType: user?.documentType || 'Cédula de ciudadanía',
      otpMethod: user?.otpMethod || 'email',
      role: initialRole,
      ownerIds: user?.ownerIds || [],
      id: user?.id || undefined
    };
  });

  const [ownerSearch, setOwnerSearch] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const currentPrefix = getPrefix(formData.documentType);
  const calculatedLoginId = `${currentPrefix}${formData.documentNumber || ''}`;

  const handleToggleOwner = (ownerId: string) => {
    setFormData(prev => {
      const current = prev.ownerIds || [];
      const isSelected = current.includes(ownerId);
      const updated = isSelected 
        ? current.filter(id => id !== ownerId) 
        : [...current, ownerId];
      return { ...prev, ownerIds: updated };
    });
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      ownerIds: owners.map(o => o.id)
    }));
  };

  const handleDeselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      ownerIds: []
    }));
  };

  const filteredOwners = useMemo(() => {
    return owners.filter(o => 
      o.name.toLowerCase().includes(ownerSearch.toLowerCase()) || 
      o.nit.includes(ownerSearch)
    );
  }, [owners, ownerSearch]);

  const selectedOwnersCount = formData.ownerIds?.length || 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, loginId: calculatedLoginId }); }} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-8 px-8 py-6">
          <div className="grid grid-cols-3 gap-x-4 gap-y-6">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Nombre completo <span className="text-red-500">*</span></Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Correo electrónico <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Tipo de documento <span className="text-red-500">*</span></Label>
              <Select value={formData.documentType || "Cédula de ciudadanía"} onValueChange={(v) => setFormData(p => ({...p, documentType: v}))}>
                <SelectTrigger className="rounded-full h-11 px-5 bg-white border-slate-200 text-xs font-bold shadow-sm">
                  <SelectValue placeholder="Tipo Doc..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  <SelectItem value="Cédula de ciudadanía" className="text-xs">Cédula de ciudadanía</SelectItem>
                  <SelectItem value="Cédula de extranjería" className="text-xs">Cédula de extranjería</SelectItem>
                  <SelectItem value="Pasaporte" className="text-xs">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">N° Identificación <span className="text-red-500">*</span></Label>
              <Input id="documentNumber" value={formData.documentNumber || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-slate-50 border-slate-200 shadow-inner" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Número de celular</Label>
              <Input id="phone" value={formData.phone || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Rol asignado <span className="text-red-500">*</span></Label>
              <Select value={formData.role || ""} onValueChange={(v: any) => setFormData(p => ({...p, role: v}))}>
                <SelectTrigger className="rounded-full h-11 px-5 bg-white border-slate-200 text-xs font-bold shadow-sm">
                  <SelectValue placeholder="Seleccione Rol..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Verificación OTP <span className="text-red-500">*</span></Label>
              <Select value={formData.otpMethod || "email"} onValueChange={(v: any) => setFormData(p => ({...p, otpMethod: v}))}>
                <SelectTrigger className="rounded-full h-11 px-5 bg-white border-slate-200 text-xs font-bold shadow-sm">
                  <SelectValue placeholder="Método..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  <SelectItem value="email" className="text-xs">Correo electrónico</SelectItem>
                  <SelectItem value="sms" className="text-xs">Mensaje SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 p-4 bg-primary/5 border border-primary/10 rounded-[1.5rem] flex items-center justify-between h-11 self-end mb-0.5">
               <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-white rounded-lg shadow-sm">
                   <Key className="size-4 text-primary" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Usuario de Ingreso</span>
                   <span className="text-sm font-black text-primary tracking-tight mt-0.5">{calculatedLoginId || 'Pendiente...'}</span>
                 </div>
               </div>
               <Badge className="bg-white text-primary border-primary/20 text-[8px] font-black px-2 rounded-lg shadow-sm">AUTO</Badge>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Propietarios Autorizados <span className="text-red-500">*</span></Label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-[1.5rem] border-slate-200 bg-white px-6 justify-between hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="size-5 text-primary opacity-70" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-black text-slate-700">
                          {selectedOwnersCount === 0 
                            ? "Ningún propietario seleccionado" 
                            : `${selectedOwnersCount} ${selectedOwnersCount === 1 ? 'Propietario seleccionado' : 'Propietarios seleccionados'}`}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Gestión multi-cliente</span>
                      </div>
                    </div>
                    <ChevronDown className="size-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0 rounded-[2rem] border-none shadow-3xl overflow-hidden" align="start">
                  <div className="p-4 border-b bg-slate-50/50 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <Input 
                        placeholder="Buscar cliente por nombre o NIT..." 
                        className="h-9 pl-9 rounded-xl border-slate-200 bg-white font-bold text-[11px]"
                        value={ownerSearch}
                        onChange={(e) => setOwnerSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[9px] font-black uppercase text-primary hover:bg-primary/5 rounded-lg flex-1"
                        onClick={handleSelectAll}
                      >
                        Marcar todos
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-lg flex-1"
                        onClick={handleDeselectAll}
                      >
                        Desmarcar todos
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <div className="p-2">
                      {filteredOwners.map((owner) => {
                        const isSelected = formData.ownerIds?.includes(owner.id);
                        return (
                          <div 
                            key={owner.id} 
                            onClick={(e) => { e.preventDefault(); handleToggleOwner(owner.id); }}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 group",
                              isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => handleToggleOwner(owner.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-lg border-slate-200 data-[state=checked]:bg-primary"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className={cn("text-[11px] font-black truncate", isSelected ? "text-primary" : "text-slate-700")}>{owner.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase">NIT: {owner.nit}</span>
                              </div>
                            </div>
                            {isSelected && <Check className="size-4 text-primary shrink-0" />}
                          </div>
                        );
                      })}
                      {filteredOwners.length === 0 && (
                        <div className="p-8 text-center opacity-30 italic font-bold text-xs">No hay resultados.</div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            
            {selectedOwnersCount === 0 && (
              <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5 px-2 bg-amber-50 py-2 rounded-xl border border-amber-100 animate-pulse">
                <ShieldCheck className="size-3" /> Precaución: El usuario no tendrá visibilidad de carga si no seleccionas al menos un propietario.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-full border border-slate-100 shadow-inner h-11 mt-2">
            <div className="flex items-center gap-3 pl-2">
              <Label className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Acceso habilitado</Label>
              <span className="text-[9px] text-slate-400 font-bold italic leading-none hidden sm:inline">Define si el usuario puede iniciar sesión en la plataforma</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.isActive || false} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} className="scale-75" />
              <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                {formData.isActive ? 'activo' : 'inactivo'}
              </Badge>
            </div>
          </div>
        </div>
      </ScrollArea>

      <DialogFooter className="shrink-0 gap-3 border-t pt-6 bg-slate-50/30 px-8 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary hover:bg-primary/20 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button type="submit" className="min-w-[180px] font-black rounded-full h-12 bg-primary text-white shadow-xl shadow-primary/20 gap-2 hover:scale-[1.02] transition-transform">
          <Save className="size-5" /> Guardar usuario
        </Button>
      </DialogFooter>
    </form>
  );
};

const UsersPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { 
    const savedUsers = localStorage.getItem('users'); 
    setUsers(savedUsers ? JSON.parse(savedUsers) : mockUsers); 

    const savedRoles = localStorage.getItem('appRoles');
    setRoles(savedRoles ? JSON.parse(savedRoles) : mockRoles);

    const savedOwners = localStorage.getItem('owners');
    setOwners(savedOwners ? JSON.parse(savedOwners) : mockOwners);
  }, []);

  const handleSave = async (data: any) => {
    const duplicateDocument = users.find(u => 
      u.documentNumber === data.documentNumber && u.id !== data.id
    );

    if (duplicateDocument) {
      toast({
        variant: "destructive",
        title: "Identificación duplicada",
        description: `El número ${data.documentNumber} ya está registrado con el usuario ${duplicateDocument.name}.`,
      });
      return;
    }

    const updated = data.id 
      ? users.map(u => u.id === data.id ? { ...u, ...data } : u) 
      : [{ 
          ...data, 
          id: `USER-${Date.now()}`, 
          avatar: `https://picsum.photos/seed/${Date.now()}/150/150`, 
          isFirstLogin: true, 
          password: 'temporary123' 
        }, ...users];
    
    setUsers(updated);
    try {
      await persistUsers(updated);
      toast({ title: "Seguridad actualizada", description: `El usuario ${data.name} fue guardado en la base de datos.` });
    } catch (error) {
      console.error('No se pudo sincronizar usuarios.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "El usuario se guardo localmente, pero no se pudo subir a la base de datos." });
    }
    setIsDialogOpen(false);
  };

  const toggleStatus = async (user: UserType) => {
    const newStatus = !user.isActive;
    const updated = users.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u);
    setUsers(updated);
    try {
      await persistUsers(updated);
      toast({ title: newStatus ? "usuario activado" : "usuario bloqueado", description: "El cambio fue guardado en la base de datos." });
    } catch (error) {
      console.error('No se pudo sincronizar usuarios.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "El cambio se aplico localmente, pero no se pudo subir a la base de datos." });
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

  const openNewUser = () => {
    setEditingUser({ isActive: true, ownerIds: [] });
    setIsDialogOpen(true);
  };

  const openEditUser = (user: UserType) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre, email, identificación o usuario..." 
                className="pl-10 h-9 w-96 bg-slate-50 border-none font-bold text-xs" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button onClick={openNewUser} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white uppercase tracking-tighter">
            <PlusCircle className="size-4" /> Nuevo usuario
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-muted/20 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5 h-14">
              <TableRow>
                <TableHead className="pl-8 font-black text-[13px]">Usuario / Ingreso</TableHead>
                <TableHead className="font-black text-[13px]">Identificación</TableHead>
                <TableHead className="font-black text-[13px]">Propietarios</TableHead>
                <TableHead className="font-black text-[13px]">Rol</TableHead>
                <TableHead className="text-center font-black text-[13px]">Estado</TableHead>
                <TableHead className="text-right pr-8 font-black text-[13px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground italic font-bold opacity-30">No se encontraron usuarios registrados.</TableCell>
                </TableRow>
              ) : (
                paginated.map(u => {
                  const roleName = roles.find(r => r.id === u.role)?.name || u.role;
                  const ownersCount = u.ownerIds?.length || 0;
                  return (
                    <TableRow key={u.id} className={cn("group hover:bg-muted/5 h-16 transition-colors border-b last:border-none", !u.isActive && "opacity-60")}>
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/10">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="bg-primary/5 text-primary font-black">{u.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-[11px] text-slate-700 leading-tight">{u.name}</span>
                            <span className="text-[10px] font-black text-primary tracking-tight mt-0.5">{u.loginId}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{u.documentType}</span>
                          <span className="text-[11px] font-mono font-bold text-slate-700">{u.documentNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-300" />
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-black h-5">
                            {ownersCount} {ownersCount === 1 ? 'PROPIETARIO' : 'PROPIETARIOS'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-black px-3 py-0.5 rounded-lg border-primary/20 bg-primary/5 text-primary uppercase tracking-widest">
                          {roleName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-3">
                           <Switch checked={u.isActive || false} onCheckedChange={() => toggleStatus(u)} className="scale-75" />
                           <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", u.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{u.isActive ? 'activo' : 'inactivo'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-primary/10" onClick={() => openEditUser(u)}>
                          <Pencil className="size-4" />
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

      <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[950px] w-full max-h-[92vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <DialogHeader className="p-8 pb-4 shrink-0 bg-white border-b">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <ShieldCheck className="size-8" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">Seguridad y acceso</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Gestión de identidades, permisos y propietarios autorizados.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isDialogOpen && (
              <UserForm 
                key={editingUser?.id || 'new-session'}
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
