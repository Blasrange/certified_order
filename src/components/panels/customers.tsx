"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, Search, Building2, MapPin, AlertTriangle, Save, X } from "lucide-react";
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
import type { Customer, Store } from "@/lib/types";
import { mockCustomers, mockStores } from "@/lib/data";
import { persistCustomers, persistStores } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const CustomerForm = ({ customer, onSave, onCancel }: { customer: Partial<Customer> | null, onSave: (customer: Omit<Customer, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    originalNit: customer?.originalNit || customer?.nit,
    ...customer,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Customer, 'id'> & { id?: string });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Nombre del cliente <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Supermercado Central" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nit" className="text-xs font-semibold text-slate-700">NIT / Identificación <span className="text-red-500">*</span></Label>
          <Input id="nit" value={formData.nit || ''} onChange={handleChange} placeholder="Ej: 123456789-0" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold text-slate-700">Ciudad <span className="text-red-500">*</span></Label>
            <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Dirección <span className="text-red-500">*</span></Label>
            <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Calle 123 #45-67" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-8 gap-3 border-t pt-6">
        <Button type="button" variant="ghost" onClick={onCancel} className="dialog-btn-secondary"><X className="size-4" /> Cancelar</Button>
        <Button type="submit" className="dialog-btn-primary">
          <Save className="size-4 mr-2" /> Guardar cliente
        </Button>
      </DialogFooter>
    </form>
  );
};

const CustomersPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    setCustomers(appData.customers.length > 0 ? appData.customers : mockCustomers);
    setStores(appData.stores.length > 0 ? appData.stores : mockStores);
  }, [appData.customers, appData.stores]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSave = async (customerData: Omit<Customer, 'id'> & { id?: string }) => {
    const normalizedNit = String(customerData.nit || '').trim().toLowerCase();
    const duplicate = customers.find(customer => customer.nit.trim().toLowerCase() === normalizedNit && customer.id !== customerData.id);
    if (duplicate) {
      toast({ variant: "destructive", title: "NIT duplicado", description: `Ya existe un cliente con el NIT ${customerData.nit}.` });
      return;
    }

    const previousNit = String((customerData as Customer).originalNit || '').trim() || String(customerData.nit || '').trim();
    const nextNit = String(customerData.nit || '').trim();
    const updated = customerData.id
      ? customers.map(c => c.id === customerData.id ? { ...c, ...customerData } as Customer : c)
      : [{ ...customerData, id: `CUST-${Date.now()}` } as Customer, ...customers];
    const updatedStores = customerData.id
      ? stores.map(store => store.customerNit === previousNit ? { ...store, customerNit: nextNit } : store)
      : stores;

    setCustomers(updated);
    setStores(updatedStores);
    setIsDialogOpen(false);
    setEditingCustomer(null);

    try {
      await Promise.all([persistCustomers(updated), persistStores(updatedStores)]);
      await appData.refresh();
      toast({ title: customerData.id ? "Cliente actualizado" : "Cliente creado", description: `La información de ${customerData.name} fue guardada correctamente.` });
    } catch (error) {
      console.error('No se pudo sincronizar clientes.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "El cliente se actualizó en pantalla, pero no fue posible sincronizarlo con la base de datos." });
    }
  };
  
  const handleDelete = async (customerId: string) => {
    const updated = customers.filter(c => c.id !== customerId);
    setCustomers(updated);

    try {
      await persistCustomers(updated);
      await appData.refresh();
      toast({ title: "Cliente eliminado", description: "El cliente fue retirado correctamente del directorio." });
    } catch (error) {
      console.error('No se pudo sincronizar clientes.', error);
      toast({ variant: "destructive", title: "Sincronización pendiente", description: "La eliminación se aplicó en pantalla, pero no fue posible sincronizarla con la base de datos." });
    }
  };

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.nit.toLowerCase().includes(searchTerm.toLowerCase())
  ), [customers, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  const paginatedCustomers = useMemo(() => filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredCustomers, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      {/* Header con búsqueda - consistente con otros paneles */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cliente por nombre o NIT..." 
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
            onClick={() => { setEditingCustomer({}); setIsDialogOpen(true); }} 
            className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
          >
            <PlusCircle className="size-4" />
            Añadir cliente
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de clientes - mejorada */}
      <Card className="border border-slate-100 shadow-sm overflow-hidden bg-white rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / NIT</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <Building2 className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay clientes registrados</p>
                      <p className="text-xs text-slate-400 mt-1">Haz clic en "Añadir cliente" para crear uno nuevo</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{customer.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5">NIT: {customer.nit}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" />
                        <span className="text-xs font-semibold text-slate-600">{customer.city}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs font-medium text-slate-500">{customer.address}</span>
                    </TableCell>
                    <TableCell className="pr-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200"
                          onClick={() => { setEditingCustomer(customer); setIsDialogOpen(true); }}
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
                                  ¿Eliminar cliente?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-slate-500 text-center mt-2">
                                  Esta acción eliminará permanentemente a <strong className="text-slate-700">{customer.name}</strong> del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                            </div>
                            <AlertDialogFooter className="p-4 bg-slate-50 border-t flex-row gap-2">
                              <AlertDialogCancel className="flex-1 h-10 rounded-xl font-medium">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(customer.id)} 
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
      {filteredCustomers.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
          <CardContent className="p-0">
            <DataTablePagination 
              totalRows={filteredCustomers.length}
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
                <Building2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingCustomer?.id ? 'Editar' : 'Nuevo'} cliente
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestiona los datos maestros del socio comercial
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CustomerForm 
              customer={editingCustomer}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPanel;