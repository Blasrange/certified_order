"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PlusCircle, 
  Search, 
  Save, 
  Settings2,
  AlertCircle,
  X,
  GitCompare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { persistMappingProfiles } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import type { MappingProfile } from "@/lib/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

const MappingPanel = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<MappingProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<MappingProfile> | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem('mappingProfiles');
    if (saved) setProfiles(JSON.parse(saved));
  }, []);

  const saveToStorage = (updatedProfiles: MappingProfile[]) => {
    setProfiles(updatedProfiles);
    void persistMappingProfiles(updatedProfiles).catch((error) => {
      console.error('No se pudo sincronizar homologaciones.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "La plantilla se guardo localmente, pero no se pudo subir a la base de datos." });
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile?.name) return;

    const profileToSave = {
      ...editingProfile,
      id: editingProfile.id || `MAP-${Date.now()}`,
      isActive: editingProfile.isActive ?? true,
      fields: editingProfile.fields || {
        pedido: "", nit: "", sku: "", cantidad: "", 
        orden: "", lote: "", vencimiento: "", fabricacion: "",
        codigoTienda: ""
      }
    } as MappingProfile;

    const updated = editingProfile.id 
      ? profiles.map(p => p.id === profileToSave.id ? profileToSave : p)
      : [profileToSave, ...profiles];

    saveToStorage(updated);
    setIsDialogOpen(false);
    setEditingProfile(null);
    toast({ title: "Plantilla guardada" });
  };

  const toggleStatus = (id: string) => {
    const updated = profiles.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    saveToStorage(updated);
  };

  const filteredProfiles = useMemo(() => 
    profiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [profiles, searchTerm]
  );

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = useMemo(() => 
    filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredProfiles, currentPage, itemsPerPage]);

  const fieldOrder = [
    { key: "pedido", label: "Pedido / Po" },
    { key: "nit", label: "Nit / Identificación" },
    { key: "sku", label: "Sku / Código" },
    { key: "cantidad", label: "Cantidad / Unidades" },
    { key: "orden", label: "N° Orden interna" },
    { key: "lote", label: "Lote / Batch" },
    { key: "vencimiento", label: "Fecha vencimiento" },
    { key: "fabricacion", label: "Fecha fabricación" },
    { key: "codigoTienda", label: "Código de Tienda" },
  ];

  const getCompleteness = (fields: any) => {
    if (!fields) return 0;
    const filled = Object.values(fields).filter(v => !!v).length;
    return (filled / fieldOrder.length) * 100;
  };

  return (
    <div className="space-y-6">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar plantillas..." 
                className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <Button 
            onClick={() => { setEditingProfile({ isActive: true, fields: { pedido: "", nit: "", sku: "", cantidad: "", orden: "", lote: "", vencimiento: "", fabricacion: "", codigoTienda: "" } }); setIsDialogOpen(true); }}
            className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white"
          >
            <PlusCircle className="h-4 w-4" /> Nueva homologación
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedProfiles.map((profile) => {
          const completeness = getCompleteness(profile.fields);
          return (
            <Card key={profile.id} className={cn("group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-[2.5rem] flex flex-col h-fit", !profile.isActive && "opacity-60")}>
              <CardHeader className="pb-2 pt-8 px-8 bg-muted/5 border-b relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-3 rounded-2xl", profile.isActive ? "bg-primary/10 text-primary" : "bg-slate-200")}>
                    <GitCompare className="size-6" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={profile.isActive} onCheckedChange={() => toggleStatus(profile.id)} className="scale-75" />
                    <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", profile.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                      {profile.isActive ? 'activo' : 'inactivo'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tighter">{profile.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-6 space-y-6">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-end"><span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Integridad</span><span className="text-xs font-black">{Math.round(completeness)}%</span></div>
                  <Progress value={completeness} className="h-2 bg-slate-100 rounded-full" />
                </div>
                <Button className="w-full h-12 rounded-2xl font-black text-xs bg-primary text-white shadow-xl shadow-primary/20" onClick={() => { setEditingProfile(profile); setIsDialogOpen(true); }}>Configurar mapeo</Button>
              </CardContent>
            </Card>
          );
        })}
        {paginatedProfiles.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-muted-foreground italic font-bold opacity-30">
            No se encontraron plantillas de homologación.
          </div>
        )}
      </div>

      <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-6">
        <CardContent className="p-0">
          <DataTablePagination 
            totalRows={filteredProfiles.length}
            pageSize={itemsPerPage}
            onPageSizeChange={setItemsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[2.5rem] p-0 bg-white border-none shadow-3xl overflow-hidden">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Settings2 className="size-8" /></div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">Homologación técnica</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Mapeo de columnas del archivo excel.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSave} className="p-8 pt-6 space-y-8">
            <div className="grid grid-cols-3 gap-6 items-end">
              <div className="col-span-2 space-y-2">
                <Label className="text-[11px] font-bold text-slate-700 pl-4">Nombre de la plantilla <span className="text-red-500">*</span></Label>
                <Input value={editingProfile?.name || ""} onChange={(e) => setEditingProfile(p => ({...p, name: e.target.value}))} className="rounded-full border-slate-200 h-12 px-6 font-bold bg-slate-50 shadow-inner" required />
              </div>
              <div className="flex items-center justify-between px-6 h-12 bg-slate-50 border border-slate-100 rounded-full shadow-inner">
                <span className="text-[11px] font-bold text-slate-500">Estado</span>
                <div className="flex items-center gap-3">
                  <Switch checked={editingProfile?.isActive ?? true} onCheckedChange={(v) => setEditingProfile(p => ({...p, isActive: v}))} className="scale-75" />
                  <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", (editingProfile?.isActive ?? true) ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                    {(editingProfile?.isActive ?? true) ? 'activo' : 'inactivo'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-x-4 gap-y-5">
              {fieldOrder.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 pl-4">{label} <span className="text-red-500">*</span></Label>
                  <Input value={(editingProfile?.fields as any)?.[key] || ""} onChange={(e) => setEditingProfile(p => ({ ...p, fields: { ...(p?.fields || {}), [key]: e.target.value } as any }))} className="rounded-full border-slate-200 h-11 px-5 text-xs font-medium shadow-sm" placeholder="Encabezado excel" required />
                </div>
              ))}
            </div>

            <DialogFooter className="mt-8 gap-4 border-t pt-6 bg-slate-50/30 -mx-8 px-8 -mb-8 pb-8 pt-8">
              <div className="flex-1 flex items-center gap-2"><AlertCircle className="size-4 text-amber-500" /><p className="text-[10px] text-muted-foreground font-bold">El sistema recuperará los nombres del directorio usando el NIT y Código.</p></div>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary">Cancelar</Button>
              <Button type="submit" className="min-w-[180px] h-12 rounded-full font-black bg-primary text-white shadow-xl shadow-primary/20 gap-2"><Save className="size-5" /> Guardar plantilla</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MappingPanel;