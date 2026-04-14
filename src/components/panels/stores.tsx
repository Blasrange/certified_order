"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, Search, MapPin, Building, AlertTriangle, Save, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { Store } from "@/lib/types";
import { mockStores } from "@/lib/data";
import { persistStores } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const StoreForm = ({ store, onSave, onCancel }: { store: Partial<Store> | null, onSave: (store: Omit<Store, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    originalCode: store?.originalCode || store?.code,
    ...store,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Store, 'id'> & { id?: string });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Nombre de la tienda <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Éxito Norte" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-xs font-semibold text-slate-700">Código interno <span className="text-red-500">*</span></Label>
          <Input id="code" value={formData.code || ''} onChange={handleChange} placeholder="Ej: STO-001" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold text-slate-700">Ciudad <span className="text-red-500">*</span></Label>
            <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Dirección <span className="text-red-500">*</span></Label>
            <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Avenida 100 #15-30" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-8 gap-3 border-t pt-6">
        <Button type="button" variant="ghost" onClick={onCancel} className="dialog-btn-secondary"><X className="size-4" /> Cancelar</Button>
        <Button type="submit" className="dialog-btn-primary">
          <Save className="size-4 mr-2" /> Guardar tienda
        </Button>
      </DialogFooter>
    </form>
  );
};


const StoresPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    setStores(appData.stores.length > 0 ? appData.stores : mockStores);
  }, [appData.stores]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<Store> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSave = async (storeData: Omit<Store, 'id'> & { id?: string }) => {
    const normalizedCode = String(storeData.code || '').trim().toLowerCase();
    const duplicate = stores.find(store => store.code.trim().toLowerCase() === normalizedCode && store.id !== storeData.id);
    if (duplicate) {
      toast({ variant: "destructive", title: "Código duplicado", description: `Ya existe una tienda con el código ${storeData.code}.` });
      return;
    }

    const updated = storeData.id
      ? stores.map(s => s.id === storeData.id ? { ...s, ...storeData } as Store : s)
      : [{ ...storeData, id: `STORE-${Date.now()}` } as Store, ...stores];

    setStores(updated);
    setIsDialogOpen(false);
    setEditingStore(null);

    try {
      await persistStores(updated);
      await appData.refresh();
      toast({ title: storeData.id ? "Tienda actualizada" : "Tienda creada", description: `La tienda ${storeData.name} fue guardada correctamente.` });
    } catch (error) {
      console.error('No se pudo sincronizar tiendas.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "La tienda se actualizó en pantalla, pero no fue posible sincronizarla con la base de datos." });
    }
  };
  
  const handleDelete = async (storeId: string) => {
    const updated = stores.filter(s => s.id !== storeId);
    setStores(updated);

    try {
      await persistStores(updated);
      await appData.refresh();
      toast({ title: "Tienda eliminada", description: "La tienda fue retirada correctamente del catálogo." });
    } catch (error) {
      console.error('No se pudo sincronizar tiendas.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "La eliminación se aplicó en pantalla, pero no fue posible sincronizarla con la base de datos." });
    }
  };

  const filteredStores = useMemo(() => stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.code.toLowerCase().includes(searchTerm.toLowerCase())
  ), [stores, searchTerm]);

  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);

  const paginatedStores = useMemo(() => filteredStores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredStores, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      {/* Header con búsqueda - consistente con otros paneles */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar tienda por nombre o código..." 
                className="pl-10 h-10 w-96 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <Button 
            onClick={() => { setEditingStore({}); setIsDialogOpen(true); }} 
            className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
          >
            <PlusCircle className="size-4" />
            Añadir tienda
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de tiendas - mejorada */}
      <Card className="border border-slate-100 shadow-sm overflow-hidden bg-white rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre / Código</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ciudad</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <Building className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay tiendas registradas</p>
                      <p className="text-xs text-slate-400 mt-1">Haz clic en "Añadir tienda" para crear una nueva</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStores.map((store) => (
                  <TableRow key={store.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                          <Building className="size-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{store.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5">Cód: {store.code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" />
                        <span className="text-xs font-semibold text-slate-600">{store.city}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs font-medium text-slate-500">{store.address}</span>
                    </TableCell>
                    <TableCell className="pr-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200"
                          onClick={() => { setEditingStore(store); setIsDialogOpen(true); }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-100 shadow-xl bg-white">
                            <div className="p-6 pt-8 text-center flex flex-col items-center">
                              <div className="size-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                                <AlertTriangle className="size-8" />
                              </div>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-bold tracking-tight text-slate-800 text-center">
                                  ¿Eliminar tienda?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-slate-500 text-center mt-2">
                                  Esta acción eliminará permanentemente a <strong className="text-slate-700">{store.name}</strong> del catálogo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                            </div>
                            <AlertDialogFooter className="p-4 bg-slate-50 border-t flex-row gap-2">
                              <AlertDialogCancel className="flex-1 h-10 rounded-xl font-medium">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(store.id)} 
                                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 font-medium"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación */}
      {filteredStores.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
          <CardContent className="p-0">
            <DataTablePagination 
              totalRows={filteredStores.length}
              pageSize={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de formulario - consistente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <Building className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingStore?.id ? 'Editar' : 'Nueva'} tienda
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Información de contacto y localización del punto
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            <StoreForm
              store={editingStore}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoresPanel;