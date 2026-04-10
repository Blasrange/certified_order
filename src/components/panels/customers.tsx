
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, Search, Building2, MapPin, AlertTriangle } from "lucide-react";
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
import type { Customer } from "@/lib/types";
import { mockCustomers } from "@/lib/data";

const CustomerForm = ({ customer, onSave, onCancel }: { customer: Partial<Customer> | null, onSave: (customer: Omit<Customer, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState(customer || {});

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
      <div className="grid gap-5 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Nombre del Cliente</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Supermercado Central" className="bg-muted/30 border-none h-11" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nit" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">NIT / Identificación</Label>
          <Input id="nit" value={formData.nit || ''} onChange={handleChange} placeholder="Ej: 123456789-0" className="bg-muted/30 border-none h-11" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ciudad</Label>
            <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="bg-muted/30 border-none h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Dirección</Label>
            <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Calle 123 #45-67" className="bg-muted/30 border-none h-11" required />
          </div>
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold">Cancelar</Button>
        <Button type="submit" className="min-w-[120px] font-black">Guardar Cliente</Button>
      </DialogFooter>
    </form>
  );
};

const CustomersPanel = () => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customers');
      return saved ? JSON.parse(saved) : mockCustomers;
    }
    return mockCustomers;
  });

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSave = (customerData: Omit<Customer, 'id'> & { id?: string }) => {
    if (customerData.id) {
      setCustomers(customers.map(c => c.id === customerData.id ? { ...c, ...customerData } as Customer : c));
    } else {
      const newCustomer = { ...customerData, id: `CUST-${Date.now()}` } as Customer;
      setCustomers(prev => [newCustomer, ...prev]);
    }
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };
  
  const handleDelete = (customerId: string) => {
    setCustomers(customers.filter(c => c.id !== customerId));
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
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente por nombre o NIT..." 
                  className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs focus-visible:ring-1 focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <Button onClick={() => { setEditingCustomer({}); setIsDialogOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs tracking-tighter">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Cliente
            </Button>
        </CardContent>
      </Card>

      <Card className="border border-muted/20 shadow-sm overflow-hidden bg-white rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5 h-14">
              <TableRow>
                <TableHead className="pl-8 uppercase tracking-widest text-[10px] font-black">Cliente / NIT</TableHead>
                <TableHead className="uppercase tracking-widest text-[10px] font-black">Ubicación</TableHead>
                <TableHead className="uppercase tracking-widest text-[10px] font-black">Dirección</TableHead>
                <TableHead className="text-right pr-8 uppercase tracking-widest text-[10px] font-black">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-muted-foreground italic font-bold opacity-30">
                    No se encontraron clientes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="group hover:bg-muted/5 transition-colors border-b last:border-none">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800">{customer.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground tracking-tighter uppercase">NIT: {customer.nit}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {customer.city}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500">{customer.address}</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl"
                          onClick={() => { setEditingCustomer(customer); setIsDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
                            <div className="p-8 pt-10 text-center flex flex-col items-center">
                              <div className="size-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                                <AlertTriangle className="size-10" />
                              </div>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-3xl font-black tracking-tighter text-slate-800 text-center">
                                  ¿Confirmar Eliminación?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-bold text-slate-400 text-center mt-2 px-4">
                                  Esta acción eliminará permanentemente a <strong>{customer.name}</strong> del sistema. No se podrá recuperar.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                            </div>
                            <AlertDialogFooter className="p-8 bg-slate-50 border-t flex-row gap-3">
                              <AlertDialogCancel className="flex-1 h-12 rounded-full font-bold bg-white border-slate-200 text-slate-600 mt-0">
                                CANCELAR
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(customer.id)} 
                                className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 font-black text-white text-[10px] tracking-widest"
                              >
                                SÍ, ELIMINAR
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

      <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-none shadow-3xl rounded-3xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-3xl font-black tracking-tighter">{editingCustomer?.id ? "Editar" : "Nuevo"} Cliente</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Gestiona los datos maestros del socio comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-8">
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
