"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  PlusCircle, 
  Pencil, 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  X,
  ShieldCheck,
  Briefcase,
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
import { Switch } from "@/components/ui/switch";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { Owner } from "@/lib/types";
import { mockOwners } from "@/lib/data";
import { persistOwners } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const OwnerForm = ({ owner, onSave, onCancel }: { owner: Partial<Owner> | null, onSave: (owner: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Owner>>({ 
    isActive: true, 
    ...owner 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex flex-col h-full">
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 py-2 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Nombre de la empresa <span className="text-red-500">*</span></Label>
          <Input 
            id="name" 
            value={formData.name || ''} 
            onChange={handleChange} 
            placeholder="Ej: Empresa de ejemplo SAS"
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
            required 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">NIT / RUT <span className="text-red-500">*</span></Label>
          <Input 
            id="nit" 
            value={formData.nit || ''} 
            onChange={handleChange} 
            placeholder="Ej: 901.123.456-7"
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
            required 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Correo corporativo <span className="text-red-500">*</span></Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email || ''} 
            onChange={handleChange} 
            placeholder="Ej: contacto@empresa.com"
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
            required 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Ciudad <span className="text-red-500">*</span></Label>
          <Input 
            id="city" 
            value={formData.city || ''} 
            onChange={handleChange} 
            placeholder="Ej: Bogotá D.C."
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
            required 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Dirección fiscal <span className="text-red-500">*</span></Label>
          <Input 
            id="address" 
            value={formData.address || ''} 
            onChange={handleChange} 
            placeholder="Ej: Calle 100 # 15-20, Piso 8"
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
            required 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Teléfono de contacto</Label>
          <Input 
            id="phone" 
            value={formData.phone || ''} 
            onChange={handleChange} 
            placeholder="Ej: 601 7456789"
            className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2 xl:col-span-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold text-slate-700">Entidad habilitada</Label>
            <span className="text-[10px] text-slate-400 font-medium">Define si puede operar en el sistema</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} />
            <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
              formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
            )}>
              {formData.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-8 gap-3 border-t pt-6">
        <Button type="button" variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
          <X className="size-4" /> Cancelar
        </Button>
        <Button type="submit" className="dialog-btn-primary">
          <Save className="size-4 mr-2" /> Guardar Propietario
        </Button>
      </DialogFooter>
    </form>
  );
};

const OwnersPanel = () => {
  const { toast } = useToast();
  const { currentUser, refreshCurrentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Partial<Owner> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pendingOwnerNitRef = useRef<string | null>(null);
  const pendingOwnerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (appData.loading) {
      return;
    }

    if (pendingOwnerNitRef.current || pendingOwnerIdRef.current) {
      const ownerExistsInBootstrap = appData.owners.some((owner) =>
        owner.nit === pendingOwnerNitRef.current || owner.id === pendingOwnerIdRef.current
      );

      if (!ownerExistsInBootstrap) {
        return;
      }

      pendingOwnerNitRef.current = null;
      pendingOwnerIdRef.current = null;
    }

    setOwners(appData.owners.length > 0 ? appData.owners : mockOwners);
  }, [appData.loading, appData.owners]);

  const handleSave = async (data: any) => {
    const duplicateNit = owners.find(o => 
      o.nit.trim().toLowerCase() === data.nit.trim().toLowerCase() && o.id !== data.id
    );

    if (duplicateNit) {
      toast({
        variant: "destructive",
        title: "NIT ya registrado",
        description: `El NIT ${data.nit} ya pertenece a ${duplicateNit.name}.`,
      });
      return;
    }

    const updated = data.id 
      ? owners.map(o => o.id === data.id ? { ...o, ...data } : o) 
      : [{ ...data, id: `OWNER-${Date.now()}` }, ...owners];

    pendingOwnerNitRef.current = String(data.nit || '').trim();
    pendingOwnerIdRef.current = String(data.id || updated[0]?.id || '').trim() || null;
    setOwners(updated);
    setIsDialogOpen(false);
    setEditingOwner(null);

    try {
      await persistOwners(updated);
      await refreshCurrentUser();
      await appData.refresh();
      toast({
        title: data.id ? "Propietario actualizado" : "Propietario creado",
        description: `La información de ${data.name} fue guardada correctamente en la base de datos.`,
      });
    } catch (error) {
      console.error('No se pudo sincronizar propietarios.', error);
      pendingOwnerNitRef.current = null;
      pendingOwnerIdRef.current = null;
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "Los datos del propietario se actualizaron en esta sesión, pero no fue posible enviarlos a la base de datos." });
    }
  };

  const toggleStatus = async (owner: Owner) => {
    const newStatus = !owner.isActive;
    const updated = owners.map(o => o.id === owner.id ? { ...o, isActive: newStatus } : o);
    setOwners(updated);
    try {
      await persistOwners(updated);
      await refreshCurrentUser();
      await appData.refresh();
      toast({
        title: newStatus ? "Propietario activado" : "Propietario desactivado",
        description: `El estado de ${owner.name} fue actualizado correctamente.`,
      });
    } catch (error) {
      console.error('No se pudo sincronizar propietarios.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "El cambio de estado se aplicó en pantalla, pero no fue posible sincronizarlo con la base de datos." });
    }
  };

  const filtered = useMemo(() => 
    owners.filter(o => 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [owners, searchTerm]
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => 
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filtered, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      {/* Header con búsqueda - consistente con otros paneles */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre, NIT o correo..." 
                className="pl-10 h-10 w-96 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button 
            onClick={() => { setEditingOwner({ isActive: true }); setIsDialogOpen(true); }} 
            className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
          >
            <PlusCircle className="size-4" /> Nuevo Propietario
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de propietarios - mejorada */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa / NIT</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <Building2 className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay propietarios registrados</p>
                      <p className="text-xs text-slate-400 mt-1">Haz clic en "Nuevo Propietario" para agregar</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(o => (
                  <TableRow key={o.id} className={cn("group hover:bg-slate-50/50 transition-colors border-b border-slate-50", !o.isActive && "opacity-60")}>
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800 leading-tight">{o.name}</span>
                          <span className="text-[10px] font-mono text-primary font-semibold mt-0.5">{o.nit}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3 text-slate-400" />
                          <span className="text-[11px] font-medium text-slate-600">{o.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3 text-slate-400" />
                          <span className="text-[11px] font-medium text-slate-500">{o.phone || 'No registrado'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-primary" />
                          <span className="text-[11px] font-semibold text-slate-700">{o.city}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px]">{o.address}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch 
                          checked={o.isActive} 
                          onCheckedChange={() => toggleStatus(o)} 
                        />
                        <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                          o.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {o.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200" 
                        onClick={() => { setEditingOwner(o); setIsDialogOpen(true); }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
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

      {/* Modal - consistente con el resto del sistema */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <Briefcase className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingOwner?.id ? 'Editar' : 'Nuevo'} Propietario
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestión de identidades corporativas operativas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            <OwnerForm owner={editingOwner} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnersPanel;