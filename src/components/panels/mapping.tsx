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
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const MappingPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [profiles, setProfiles] = useState<MappingProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<MappingProfile> | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setProfiles(appData.mappingProfiles);
  }, [appData.mappingProfiles]);

  const saveToStorage = async (updatedProfiles: MappingProfile[]) => {
    setProfiles(updatedProfiles);
    try {
      await persistMappingProfiles(updatedProfiles);
      await appData.refresh();
    } catch (error) {
      console.error('No se pudo sincronizar homologaciones.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "La plantilla quedó guardada localmente, pero no fue posible sincronizarla con la base de datos." });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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

    await saveToStorage(updated);
    setIsDialogOpen(false);
    setEditingProfile(null);
    toast({
      title: editingProfile.id ? "Plantilla actualizada" : "Plantilla creada",
      description: `La plantilla ${profileToSave.name} quedó lista para usarse en las importaciones.`,
    });
  };

  const toggleStatus = async (id: string) => {
    const updated = profiles.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    await saveToStorage(updated);
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
    { key: "pedido", label: "Pedido / PO" },
    { key: "nit", label: "NIT / Identificación" },
    { key: "sku", label: "SKU / Código" },
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
    <div className="space-y-4">
      {/* Header con búsqueda - consistente con otros paneles */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar plantillas de homologación..." 
                className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <Button 
            onClick={() => { 
              setEditingProfile({ 
                isActive: true, 
                name: "",
                fields: { 
                  pedido: "", nit: "", sku: "", cantidad: "", 
                  orden: "", lote: "", vencimiento: "", fabricacion: "", 
                  codigoTienda: "" 
                } 
              }); 
              setIsDialogOpen(true); 
            }}
            className="h-10 w-full gap-2 rounded-xl bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 sm:w-auto"
          >
            <PlusCircle className="size-4" /> Nueva homologación
          </Button>
        </CardContent>
      </Card>

      {/* Grid de tarjetas de plantillas - mejorado */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
        {paginatedProfiles.map((profile) => {
          const completeness = getCompleteness(profile.fields);
          return (
            <Card 
              key={profile.id} 
              className={cn(
                "group overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-xl flex flex-col h-full",
                !profile.isActive && "opacity-60"
              )}
            >
              <CardHeader className="pb-3 pt-5 px-5 bg-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className={cn(
                    "p-2.5 rounded-lg",
                    profile.isActive ? "bg-gradient-to-br from-primary/10 to-primary/5 text-primary" : "bg-slate-100 text-slate-400"
                  )}>
                    <GitCompare className="size-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={profile.isActive} 
                      onCheckedChange={() => toggleStatus(profile.id)} 
                    />
                    <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                      profile.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                    )}>
                      {profile.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-slate-800 tracking-tight">
                  {profile.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="px-5 pb-5 pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">Integridad</span>
                    <span className="text-xs font-bold text-primary">{Math.round(completeness)}%</span>
                  </div>
                  <Progress value={completeness} className="h-1.5 bg-slate-100 rounded-full" />
                </div>
                
                <Button 
                  className="w-full h-10 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition-all duration-200" 
                  onClick={() => { setEditingProfile(profile); setIsDialogOpen(true); }}
                >
                  <Settings2 className="size-3.5 mr-2" /> Configurar mapeo
                </Button>
              </CardContent>
            </Card>
          );
        })}
        
        {paginatedProfiles.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
            <GitCompare className="size-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">No hay plantillas de homologación</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en "Nueva homologación" para crear una</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {filteredProfiles.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
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
      )}

      {/* Modal - consistente con OwnersPanel y otros */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <Settings2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingProfile?.id ? 'Editar' : 'Nueva'} homologación
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Mapeo de columnas del archivo Excel
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSave}>
            <div className="px-6 py-4 space-y-5">
              {/* Nombre y estado */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5 md:col-span-1 xl:col-span-4">
                  <Label className="text-xs font-semibold text-slate-700">
                    Nombre de la plantilla <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    value={editingProfile?.name || ""} 
                    onChange={(e) => setEditingProfile(p => ({...p, name: e.target.value}))} 
                    className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" 
                    placeholder="Ej: Plantilla Clientes Nacionales"
                    required 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1 xl:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Estado</Label>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 h-11">
                    <span className="text-xs font-medium text-slate-500">Activo</span>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingProfile?.isActive ?? true} 
                        onCheckedChange={(v) => setEditingProfile(p => ({...p, isActive: v}))} 
                      />
                      <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                        (editingProfile?.isActive ?? true) ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                      )}>
                        {(editingProfile?.isActive ?? true) ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Campos de mapeo */}
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-5">
                {fieldOrder.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      {label} <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      value={(editingProfile?.fields as any)?.[key] || ""} 
                      onChange={(e) => setEditingProfile(p => ({ 
                        ...p, 
                        fields: { ...(p?.fields || {}), [key]: e.target.value } as any 
                      }))} 
                      className="rounded-xl h-10 text-sm font-medium bg-white border-slate-200" 
                      placeholder="Nombre de la columna en Excel"
                      required 
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="p-6 bg-slate-50 border-t gap-3 mt-2">
              <div className="flex-1 flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-500" />
                <p className="text-[10px] font-medium text-slate-500">
                  El sistema validará los datos usando NIT y código de tienda
                </p>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)} 
                className="dialog-btn-secondary"
              >
                <X className="size-4" /> Cancelar
              </Button>
              <Button 
                type="submit" 
                className="dialog-btn-primary"
              >
                <Save className="size-4 mr-2" /> Guardar plantilla
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MappingPanel;