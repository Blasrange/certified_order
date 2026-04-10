
"use client";

import React, { useState, useMemo, useEffect } from "react";
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
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 py-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Nombre de la Empresa <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">NIT / RUT <span className="text-red-500">*</span></Label>
          <Input id="nit" value={formData.nit || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-slate-50 border-slate-200 shadow-inner" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Correo corporativo <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Ciudad <span className="text-red-500">*</span></Label>
          <Input id="city" value={formData.city || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Dirección Fiscal <span className="text-red-500">*</span></Label>
          <Input id="address" value={formData.address || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" required />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Teléfono de contacto</Label>
          <Input id="phone" value={formData.phone || ''} onChange={handleChange} className="rounded-full h-11 px-5 text-xs font-bold bg-white border-slate-200 shadow-sm" />
        </div>

        <div className="col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-full border border-slate-100 shadow-inner h-11 self-end">
          <div className="flex items-center gap-3 pl-2">
            <Label className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Entidad Habilitada</Label>
            <span className="text-[9px] text-slate-400 font-bold italic leading-none hidden sm:inline">Define si este propietario puede operar en el sistema</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} className="scale-75" />
            <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
              {formData.isActive ? 'activo' : 'inactivo'}
            </Badge>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-12 gap-3 border-t pt-6 bg-slate-50/30 -mx-8 px-8 -mb-8 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary hover:bg-primary/20 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button type="submit" className="min-w-[180px] font-black rounded-full h-12 bg-primary text-white shadow-xl shadow-primary/20 gap-2 hover:scale-[1.02] transition-transform">
          <Save className="size-5" /> Guardar Propietario
        </Button>
      </DialogFooter>
    </form>
  );
};

const OwnersPanel = () => {
  const { toast } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Partial<Owner> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { 
    const saved = localStorage.getItem('owners'); 
    setOwners(saved ? JSON.parse(saved) : mockOwners); 
  }, []);

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
    
    setOwners(updated);
    try {
      await persistOwners(updated);
      toast({ title: "Propietario guardado", description: "El propietario fue guardado en la base de datos." });
    } catch (error) {
      console.error('No se pudo sincronizar propietarios.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "El propietario se guardo localmente, pero no se pudo subir a la base de datos." });
    }
    setIsDialogOpen(false);
  };

  const toggleStatus = async (owner: Owner) => {
    const newStatus = !owner.isActive;
    const updated = owners.map(o => o.id === owner.id ? { ...o, isActive: newStatus } : o);
    setOwners(updated);
    try {
      await persistOwners(updated);
      toast({ title: newStatus ? "Entidad activada" : "Entidad desactivada", description: "El cambio fue guardado en la base de datos." });
    } catch (error) {
      console.error('No se pudo sincronizar propietarios.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "El cambio se aplico localmente, pero no se pudo subir a la base de datos." });
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
    <div className="space-y-6">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar por nombre, NIT o correo..." 
                className="pl-10 h-9 w-96 bg-slate-50 border-none font-bold text-xs" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <Button onClick={() => { setEditingOwner({ isActive: true }); setIsDialogOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white uppercase tracking-tighter">
            <PlusCircle className="size-4" /> Nuevo Propietario
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-muted/20 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5 h-14">
              <TableRow>
                <TableHead className="pl-8 font-black text-[13px]">Empresa / NIT</TableHead>
                <TableHead className="font-black text-[13px]">Contacto</TableHead>
                <TableHead className="font-black text-[13px]">Ubicación</TableHead>
                <TableHead className="text-center font-black text-[13px]">Estado</TableHead>
                <TableHead className="text-right pr-8 font-black text-[13px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground italic font-bold opacity-30">No hay propietarios registrados.</TableCell>
                </TableRow>
              ) : (
                paginated.map(o => (
                  <TableRow key={o.id} className={cn("group hover:bg-muted/5 h-16 transition-colors border-b last:border-none", !o.isActive && "opacity-60")}>
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 className="size-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-[11px] text-slate-700 leading-tight">{o.name}</span>
                          <span className="text-[10px] font-black text-primary tracking-tight mt-0.5">{o.nit}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <Mail className="size-3" /> {o.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-1">
                          <Phone className="size-3" /> {o.phone || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                          <MapPin className="size-3 text-primary" /> {o.city}
                        </div>
                        <span className="text-[9px] text-slate-400 truncate max-w-[150px]">{o.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
                         <Switch checked={o.isActive} onCheckedChange={() => toggleStatus(o)} className="scale-75" />
                         <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", o.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{o.isActive ? 'activo' : 'inactivo'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-primary/10" onClick={() => { setEditingOwner(o); setIsDialogOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
        <DialogContent className="max-w-[850px] rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Briefcase className="size-8" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">{editingOwner?.id ? 'Editar' : 'Añadir'} Propietario</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Gestión de identidades corporativas operativas.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-8 pb-8 pt-6">
            <OwnerForm owner={editingOwner} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnersPanel;
