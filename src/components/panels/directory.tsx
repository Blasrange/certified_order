"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  PlusCircle, 
  Pencil, 
  Search, 
  MapPin, 
  Building2, 
  Phone, 
  Store as StoreIcon, 
  Building,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Info,
  Download,
  Save,
  Briefcase,
  FileText,
  ChevronDown,
  Check,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import type { Customer, Store, Owner } from "@/lib/types";
import { mockCustomers, mockStores, mockOwners } from "@/lib/data";
import { persistCustomers, persistStores } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

// Modal de selección de propietario
const OwnerSelectionModal = ({ 
  owners, 
  selectedId, 
  onConfirm, 
  onCancel 
}: { 
  owners: Owner[], 
  selectedId: string | null, 
  onConfirm: (id: string) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedId);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSelectOwner = (ownerId: string) => {
    setTempSelectedId(ownerId);
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

  const selectedOwner = owners.find(o => o.id === tempSelectedId);

  const handleConfirm = () => {
    if (tempSelectedId) {
      onConfirm(tempSelectedId);
    }
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
                Seleccionar propietario
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecciona el propietario al que pertenece este registro
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o NIT..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

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
                    const isSelected = tempSelectedId === owner.id;
                    return (
                      <TableRow 
                        key={owner.id} 
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => handleSelectOwner(owner.id)}
                      >
                        <TableCell className="pl-5 py-3">
                          <div className={cn(
                            "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="size-3 text-white" />}
                          </div>
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
            disabled={!tempSelectedId}
            className="rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
          >
            <Check className="size-4 mr-2" /> Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Modal de selección de cliente (Socio vinculado)
const CustomerSelectionModal = ({ 
  customers, 
  selectedNit, 
  onConfirm, 
  onCancel 
}: { 
  customers: Customer[], 
  selectedNit: string | null, 
  onConfirm: (nit: string) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedNit, setTempSelectedNit] = useState<string | null>(selectedNit);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSelectCustomer = (nit: string) => {
    setTempSelectedNit(nit);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.nit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => 
    filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredCustomers, currentPage, itemsPerPage]);

  const selectedCustomer = customers.find(c => c.nit === tempSelectedNit);

  const handleConfirm = () => {
    if (tempSelectedNit) {
      onConfirm(tempSelectedNit);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                Seleccionar socio vinculado
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecciona el cliente al que pertenece esta tienda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o NIT..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

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
                  {paginatedCustomers.map((customer) => {
                    const isSelected = tempSelectedNit === customer.nit;
                    return (
                      <TableRow 
                        key={customer.nit} 
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => handleSelectCustomer(customer.nit)}
                      >
                        <TableCell className="pl-5 py-3">
                          <div className={cn(
                            "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="size-3 text-white" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-slate-800")}>
                              {customer.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">NIT: {customer.nit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600">{customer.phone || 'No registrado'}</span>
                            <span className="text-[10px] text-slate-400">{customer.city || 'Sin ciudad'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Users className="size-10 mb-2 text-slate-300" />
                          <p className="text-sm font-medium">No se encontraron clientes</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
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
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 gap-3">
          <Button variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!tempSelectedNit}
            className="rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
          >
            <Check className="size-4 mr-2" /> Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomerForm = ({ customer, owners, onSave, onCancel }: { customer: Partial<Customer> | null, owners: Owner[], onSave: (customer: Omit<Customer, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    isActive: true,
    ownerId: owners[0]?.id || '',
    originalNit: customer?.originalNit || customer?.nit,
    ...customer
  });
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleOwnerConfirm = (ownerId: string) => {
    setFormData(prev => ({ ...prev, ownerId }));
    setIsOwnerModalOpen(false);
  };

  const selectedOwner = owners.find(o => o.id === formData.ownerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Customer, 'id'> & { id?: string });
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 py-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Propietario <span className="text-red-500">*</span></Label>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsOwnerModalOpen(true)}
              className="w-full h-11 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="size-4 text-primary/70" />
                <span className="text-sm font-medium text-slate-700">
                  {selectedOwner?.name || "Seleccionar propietario"}
                </span>
              </div>
              <ChevronDown className="size-4 text-slate-400" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Nombre del cliente <span className="text-red-500">*</span></Label>
            <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Supermercado Central" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nit" className="text-xs font-semibold text-slate-700">NIT / Identificación <span className="text-red-500">*</span></Label>
            <Input id="nit" value={formData.nit || ''} onChange={handleChange} placeholder="Ej: 123456789-0" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Teléfono <span className="text-red-500">*</span></Label>
            <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 3101234567" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold text-slate-700">Ciudad <span className="text-red-500">*</span></Label>
            <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Dirección fiscal <span className="text-red-500">*</span></Label>
            <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Calle 123 #45-67" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2 xl:col-span-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Estado operativo</Label>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Define si el cliente puede realizar transacciones</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.isActive} onCheckedChange={handleSwitchChange} />
              <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
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
            <Save className="size-4 mr-2" /> Guardar cliente
          </Button>
        </DialogFooter>
      </form>

      {isOwnerModalOpen && (
        <OwnerSelectionModal 
          owners={owners}
          selectedId={formData.ownerId || null}
          onConfirm={handleOwnerConfirm}
          onCancel={() => setIsOwnerModalOpen(false)}
        />
      )}
    </>
  );
};

const StoreForm = ({ store, customers, owners, onSave, onCancel }: { store: Partial<Store> | null, customers: Customer[], owners: Owner[], onSave: (store: Omit<Store, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Store>>({
    isActive: true,
    ownerId: owners[0]?.id || '',
    originalCode: store?.originalCode || store?.code,
    ...store
  });
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleOwnerConfirm = (ownerId: string) => {
    setFormData(prev => ({ ...prev, ownerId }));
    setIsOwnerModalOpen(false);
  };

  const handleCustomerConfirm = (nit: string) => {
    setFormData(prev => ({ ...prev, customerNit: nit }));
    setIsCustomerModalOpen(false);
  };

  const selectedOwner = owners.find(o => o.id === formData.ownerId);
  const selectedCustomer = customers.find(c => c.nit === formData.customerNit);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Store, 'id'> & { id?: string });
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 py-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Propietario <span className="text-red-500">*</span></Label>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsOwnerModalOpen(true)}
              className="w-full h-11 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="size-4 text-primary/70" />
                <span className="text-sm font-medium text-slate-700">
                  {selectedOwner?.name || "Seleccionar propietario"}
                </span>
              </div>
              <ChevronDown className="size-4 text-slate-400" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Nombre de la tienda <span className="text-red-500">*</span></Label>
            <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Éxito Norte" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs font-semibold text-slate-700">Código interno <span className="text-red-500">*</span></Label>
            <Input id="code" value={formData.code || ''} onChange={handleChange} placeholder="Ej: STO-001" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Socio vinculado <span className="text-red-500">*</span></Label>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsCustomerModalOpen(true)}
              className="w-full h-11 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-primary/70" />
                <span className="text-sm font-medium text-slate-700">
                  {selectedCustomer?.name || "Seleccionar cliente"}
                </span>
              </div>
              <ChevronDown className="size-4 text-slate-400" />
            </Button>
            {selectedCustomer && (
              <p className="text-[10px] text-slate-400 ml-2">NIT: {selectedCustomer.nit}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-semibold text-slate-700">Ciudad <span className="text-red-500">*</span></Label>
            <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Teléfono</Label>
            <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 3101234567" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Dirección exacta <span className="text-red-500">*</span></Label>
            <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Avenida 100 #15-30, Bodega 4" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2 xl:col-span-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Estado punto</Label>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Define si la tienda está operativa</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.isActive} onCheckedChange={handleSwitchChange} />
              <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
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
            <Save className="size-4 mr-2" /> Guardar tienda
          </Button>
        </DialogFooter>
      </form>

      {isOwnerModalOpen && (
        <OwnerSelectionModal 
          owners={owners}
          selectedId={formData.ownerId || null}
          onConfirm={handleOwnerConfirm}
          onCancel={() => setIsOwnerModalOpen(false)}
        />
      )}

      {isCustomerModalOpen && (
        <CustomerSelectionModal 
          customers={customers}
          selectedNit={formData.customerNit || null}
          onConfirm={handleCustomerConfirm}
          onCancel={() => setIsCustomerModalOpen(false)}
        />
      )}
    </>
  );
};

const DirectoryPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  useEffect(() => {
    setCustomers(appData.customers.length > 0 ? appData.customers : mockCustomers);
    setStores(appData.stores.length > 0 ? appData.stores : mockStores);
    const nextOwners = appData.owners.length > 0 ? appData.owners : mockOwners;
    setOwners(nextOwners);
    setImportOwnerId((current) => current || nextOwners[0]?.id || "");
  }, [appData.customers, appData.owners, appData.stores]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'customers' | 'stores', data: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("customers");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importOwnerId, setImportOwnerId] = useState<string>("");
  const [isImportOwnerModalOpen, setIsImportOwnerModalOpen] = useState(false);

  const syncDirectoryData = (nextCustomers: Customer[], nextStores: Store[]) => {
    void Promise.all([persistCustomers(nextCustomers), persistStores(nextStores)])
      .then(() => appData.refresh())
      .catch((error) => {
        console.error('No se pudo sincronizar directorio.', error);
        toast({ variant: "destructive", title: "Sincronización pendiente", description: "Los cambios del directorio se aplicaron en pantalla, pero no fue posible sincronizarlos con la base de datos." });
      });
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "customers") {
      return customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.nit.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return stores.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerNit?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [activeTab, customers, stores, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => 
    filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredItems, currentPage, itemsPerPage]);

  const handleSaveCustomer = (data: any) => {
    const nit = String(data.nit || '').trim().toLowerCase();
    const duplicate = customers.find(c => c.nit.trim().toLowerCase() === nit && c.id !== data.id);
    
    if (duplicate) {
      toast({ 
        variant: "destructive", 
        title: "NIT duplicado", 
        description: `Ya existe un cliente con el NIT ${data.nit}. No se puede crear.` 
      });
      return;
    }

    if (data.id) {
      const previousNit = String(data.originalNit || '').trim() || String(data.nit || '').trim();
      const nextNit = String(data.nit || '').trim();
      const updatedCustomers = customers.map(c => c.id === data.id ? { ...c, ...data } : c);
      const updatedStores = stores.map(s => s.customerNit === previousNit ? { ...s, customerNit: nextNit, isActive: data.isActive } : s);
      setCustomers(updatedCustomers);
      setStores(updatedStores);
      syncDirectoryData(updatedCustomers, updatedStores);
      toast({ title: "Cliente actualizado", description: `La información del cliente ${data.name} fue actualizada correctamente.` });
    } else {
      const updatedCustomers = [{ ...data, id: `CUST-${data.nit}`, isActive: data.isActive ?? true }, ...customers];
      setCustomers(updatedCustomers);
      syncDirectoryData(updatedCustomers, stores);
      toast({ title: "Cliente creado", description: `El cliente ${data.name} fue creado correctamente.` });
    }
    setIsDialogOpen(false);
  };

  const handleSaveStore = (data: any) => {
    const code = String(data.code || '').trim().toLowerCase();
    const duplicate = stores.find(s => s.code.trim().toLowerCase() === code && s.id !== data.id);
    
    if (duplicate) {
      toast({ 
        variant: "destructive", 
        title: "Código duplicado", 
        description: `Ya existe una tienda con el código ${data.code}. No se puede crear.` 
      });
      return;
    }

    if (data.id) {
      const updatedStores = stores.map(s => s.id === data.id ? { ...s, ...data } : s);
      setStores(updatedStores);
      syncDirectoryData(customers, updatedStores);
      toast({ title: "Punto de venta actualizado", description: `La información del punto ${data.name} fue actualizada correctamente.` });
    } else {
      const updatedStores = [{ ...data, id: `STORE-${data.code}`, isActive: data.isActive ?? true }, ...stores];
      setStores(updatedStores);
      syncDirectoryData(customers, updatedStores);
      toast({ title: "Punto de venta creado", description: `El punto de venta ${data.name} fue creado correctamente.` });
    }
    setIsDialogOpen(false);
  };

  const toggleStatus = (item: any, type: 'customers' | 'stores') => {
    const newStatus = !item.isActive;
    if (type === 'customers') {
      const updatedCustomers = customers.map(c => c.id === item.id ? { ...c, isActive: newStatus } : c);
      const updatedStores = stores.map(s => s.customerNit === item.nit ? { ...s, isActive: newStatus } : s);
      setCustomers(updatedCustomers);
      setStores(updatedStores);
      syncDirectoryData(updatedCustomers, updatedStores);
      toast({ title: newStatus ? "Cliente activado" : "Cliente desactivado", description: `El estado de ${item.name} fue actualizado correctamente.` });
    } else {
      const updatedStores = stores.map(s => s.id === item.id ? { ...s, isActive: newStatus } : s);
      setStores(updatedStores);
      syncDirectoryData(customers, updatedStores);
      toast({ title: newStatus ? "Punto de venta activado" : "Punto de venta desactivado", description: `El estado de ${item.name} fue actualizado correctamente.` });
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsCustomers = XLSX.utils.json_to_sheet([{ NIT: "123456789-0", Nombre: "Cliente Ejemplo", Ciudad: "Bogotá", Direccion: "Calle 100", Telefono: "3100000000" }]);
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");
    const wsStores = XLSX.utils.json_to_sheet([{ Codigo: "STO-001", Nombre: "Tienda Norte", NIT_Cliente: "123456789-0", Ciudad: "Bogotá", Direccion: "Cra 15", Telefono: "3200000000" }]);
    XLSX.utils.book_append_sheet(wb, wsStores, "Tiendas");
    XLSX.writeFile(wb, "Plantilla_Directorio.xlsx");
    toast({ title: "Plantilla descargada", description: "El archivo de ejemplo del directorio fue generado correctamente." });
  };

  const handleImportOwnerConfirm = (ownerId: string) => {
    setImportOwnerId(ownerId);
    setIsImportOwnerModalOpen(false);
  };

  const selectedImportOwner = owners.find(o => o.id === importOwnerId);

  const handleImportExcel = () => {
    if (!file || !importOwnerId) {
      toast({ variant: "destructive", title: "Datos incompletos para importar", description: "Selecciona un propietario y carga un archivo Excel antes de continuar." });
      return;
    }
    setIsLoading(true);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const newCustomers: Customer[] = [];
        const newStores: Store[] = [];
        const errors: string[] = [];

        if (workbook.SheetNames.includes("Clientes")) {
          const custData = XLSX.utils.sheet_to_json(workbook.Sheets["Clientes"]);
          custData.forEach((row: any, i) => {
            const nit = String(row['NIT'] || '').trim();
            const name = String(row['Nombre'] || '').trim();
            if (!nit || !name) { errors.push(`Hoja Clientes, Fila ${i+2}: NIT y Nombre son obligatorios.`); return; }
            newCustomers.push({ id: `CUST-${nit}`, nit, name, city: String(row['Ciudad'] || 'S/N'), address: String(row['Direccion'] || 'S/N'), phone: String(row['Telefono'] || ''), isActive: true, ownerId: importOwnerId });
          });
        }

        if (workbook.SheetNames.includes("Tiendas")) {
          const storeData = XLSX.utils.sheet_to_json(workbook.Sheets["Tiendas"]);
          storeData.forEach((row: any, i) => {
            const code = String(row['Codigo'] || '').trim();
            const name = String(row['Nombre'] || '').trim();
            const nit = String(row['NIT_Cliente'] || '').trim();
            if (!code || !name || !nit) { errors.push(`Hoja Tiendas, Fila ${i+2}: Código, Nombre y NIT_Cliente son obligatorios.`); return; }
            newStores.push({ id: `STORE-${code}`, code, name, customerNit: nit, city: String(row['Ciudad'] || 'S/N'), address: String(row['Direccion'] || 'S/N'), phone: String(row['Telefono'] || ''), isActive: true, ownerId: importOwnerId });
          });
        }

        if (errors.length > 0) { setImportErrors(errors); setIsLoading(false); return; }

        if (newCustomers.length === 0 && newStores.length === 0) {
          toast({ variant: "destructive", title: "Archivo sin información válida", description: "No se encontraron registros válidos en las hojas Clientes o Tiendas del archivo cargado." });
          setIsLoading(false);
          return;
        }

        let custCreated = 0;
        let custUpdated = 0;
        let storeCreated = 0;
        let storeUpdated = 0;

        const updatedCustomers = [...customers];
        newCustomers.forEach(nc => {
          const idx = updatedCustomers.findIndex(c => c.nit.trim().toLowerCase() === nc.nit.trim().toLowerCase());
          if (idx === -1) {
            updatedCustomers.push(nc);
            custCreated++;
          } else {
            updatedCustomers[idx] = { ...updatedCustomers[idx], ...nc, id: updatedCustomers[idx].id };
            custUpdated++;
          }
        });

        const updatedStores = [...stores];
        newStores.forEach(ns => {
          const idx = updatedStores.findIndex(s => s.code.trim().toLowerCase() === ns.code.trim().toLowerCase());
          if (idx === -1) {
            updatedStores.push(ns);
            storeCreated++;
          } else {
            updatedStores[idx] = { ...updatedStores[idx], ...ns, id: updatedStores[idx].id };
            storeUpdated++;
          }
        });

        setCustomers(updatedCustomers);
        setStores(updatedStores);
        syncDirectoryData(updatedCustomers, updatedStores);

        toast({ 
          title: "Importación finalizada", 
          description: `Clientes procesados: ${custCreated} creados y ${custUpdated} actualizados. Tiendas procesadas: ${storeCreated} creadas y ${storeUpdated} actualizadas.`
        });
        setIsImportOpen(false);
        setFile(null);
      } catch (err) {
        toast({ variant: "destructive", title: "No fue posible leer el archivo", description: "Verifica que el Excel no esté dañado y vuelve a intentarlo." });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { if (acceptedFiles.length > 0) setFile(acceptedFiles[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }, maxFiles: 1 });

  return (
    <div className="space-y-4">
      {/* Header con búsqueda - consistente */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={`Buscar ${activeTab === 'customers' ? 'clientes' : 'tiendas'} por nombre, NIT o código...`} 
                className="pl-10 h-10 w-96 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setIsImportOpen(true)} 
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-semibold gap-2 px-5 rounded-xl h-10 text-sm shadow-none transition-all duration-200"
            >
              <FileSpreadsheet className="size-4" /> Importar masivo
            </Button>
            <Button 
              onClick={() => { setEditingItem({ type: activeTab as any, data: { isActive: true } }); setIsDialogOpen(true); }} 
              className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
            >
              <PlusCircle className="size-4" /> Añadir {activeTab === 'customers' ? 'cliente' : 'tienda'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs - mejorados */}
      <Tabs defaultValue="customers" className="w-full" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }}>
        <TabsList className="bg-slate-100 p-1 h-12 rounded-xl grid grid-cols-2 w-full sm:w-[400px] mb-5 border border-slate-200">
          <TabsTrigger 
            value="customers" 
            className="rounded-lg font-semibold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm gap-2"
          >
            <Building2 className="size-3.5" />
            Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="stores" 
            className="rounded-lg font-semibold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm gap-2"
          >
            <StoreIcon className="size-3.5" />
            Tiendas
          </TabsTrigger>
        </TabsList>

        {/* Tabla de datos - mejorada */}
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {activeTab === 'customers' ? 'Socio comercial' : 'Punto de despacho'}
                  </TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Propietario</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</TableHead>
                  <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</TableHead>
                  <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item: any) => {
                  const owner = owners.find(o => o.id === item.ownerId);
                  return (
                    <TableRow key={item.id} className={cn("group hover:bg-slate-50/50 transition-colors border-b border-slate-50", !item.isActive && "opacity-60")}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("size-9 rounded-lg flex items-center justify-center", 
                            item.isActive ? "bg-gradient-to-br from-primary/10 to-primary/5 text-primary" : "bg-slate-100 text-slate-400"
                          )}>
                            {activeTab === 'customers' ? <Building2 className="size-4" /> : <Building className="size-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">{item.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {activeTab === 'customers' ? 'NIT' : 'Código'}: {activeTab === 'customers' ? item.nit : item.code}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600">{owner?.name || 'Sin asignar'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs font-medium text-slate-600">{item.phone || 'No registrado'}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <MapPin className="size-3 text-primary" />
                            <span className="text-xs font-semibold text-slate-700">{item.city}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">{item.address}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch 
                            checked={item.isActive} 
                            onCheckedChange={() => toggleStatus(item, activeTab as any)} 
                          />
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                            item.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                          )}>
                            {item.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200" 
                          onClick={() => { setEditingItem({ type: activeTab as any, data: item }); setIsDialogOpen(true); }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-80 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                        {activeTab === 'customers' ? <Building2 className="size-12 mb-3 text-slate-300" /> : <StoreIcon className="size-12 mb-3 text-slate-300" />}
                        <p className="text-sm font-medium">No hay {activeTab === 'customers' ? 'clientes' : 'tiendas'} registrados</p>
                        <p className="text-xs text-slate-400 mt-1">Haz clic en "Añadir" para crear uno nuevo</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Paginación */}
        {filteredItems.length > 0 && (
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredItems.length} 
                pageSize={itemsPerPage} 
                onPageSizeChange={setItemsPerPage} 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* Modal de formulario - consistente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                {editingItem?.type === 'customers' ? <Building2 className="size-5" /> : <StoreIcon className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingItem?.data?.id ? 'Editar' : 'Añadir'} {editingItem?.type === 'customers' ? 'socio comercial' : 'punto de venta'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestión de datos maestros de distribución
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            {editingItem?.type === 'customers' ? (
              <CustomerForm customer={editingItem.data} owners={owners} onSave={handleSaveCustomer} onCancel={() => setIsDialogOpen(false)} />
            ) : (
              <StoreForm store={editingItem?.data} customers={customers} owners={owners} onSave={handleSaveStore} onCancel={() => setIsDialogOpen(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de importación - consistente */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 bg-white shadow-xl border border-slate-100 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">Importación Masiva</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Actualiza el directorio cargando un archivo Excel
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleDownloadTemplate} 
                className="text-primary font-semibold text-xs bg-primary/10 hover:bg-primary/20 rounded-xl h-9 px-4 gap-1"
              >
                <Download className="size-3.5" /> Plantilla
              </Button>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-4 space-y-5">
            {/* Propietario - ahora con modal */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-primary" />
                <Label className="text-xs font-semibold text-slate-700">Asignar a propietario</Label>
              </div>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsImportOwnerModalOpen(true)}
                className="w-full h-11 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-4 text-primary/70" />
                  <span className="text-sm font-medium text-slate-700">
                    {selectedImportOwner?.name || "Seleccionar propietario"}
                  </span>
                </div>
                <ChevronDown className="size-4 text-slate-400" />
              </Button>
              <p className="text-[10px] text-slate-400 font-medium">Todos los registros se vincularán a este propietario</p>
            </div>

            {/* Información de columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="size-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-slate-700">Hoja: Clientes</span>
                </div>
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                  Columnas requeridas:<br/>
                  <span className="text-primary font-semibold">NIT, Nombre</span>, Ciudad, Direccion, Telefono
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <StoreIcon className="size-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-slate-700">Hoja: Tiendas</span>
                </div>
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                  Columnas requeridas:<br/>
                  <span className="text-primary font-semibold">Codigo, Nombre, NIT_Cliente</span>, Ciudad, Direccion, Telefono
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div {...getRootProps()} className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
              file ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:border-primary/50"
            )}>
              <input {...getInputProps()} />
              <div className="space-y-2">
                <UploadCloud className="size-8 mx-auto text-slate-400" />
                <p className="font-semibold text-sm text-slate-700">{file ? file.name : "Arrastra o haz clic para subir"}</p>
                <p className="text-[10px] text-slate-400 font-medium">Soporta .xlsx y .xls</p>
              </div>
            </div>

            {/* Errores */}
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2 text-red-600">
                  <AlertCircle className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase">Errores detectados</span>
                </div>
                <ul className="space-y-0.5">
                  {importErrors.map((err, i) => (
                    <li key={i} className="text-[9px] text-red-500 font-medium">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-slate-50 border-t gap-3">
            <Button 
              variant="ghost" 
              onClick={() => { setIsImportOpen(false); setImportErrors([]); setFile(null); }} 
              className="dialog-btn-secondary"
            >
              <X className="size-4" /> Cancelar
            </Button>
            <Button 
              onClick={handleImportExcel} 
              disabled={!file || isLoading || !importOwnerId} 
              className="dialog-btn-primary"
            >
              {isLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : <CheckCircle2 className="size-4 mr-2" />} 
              Procesar directorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de selección de propietario para importación */}
      {isImportOwnerModalOpen && (
        <OwnerSelectionModal 
          owners={owners}
          selectedId={importOwnerId || null}
          onConfirm={handleImportOwnerConfirm}
          onCancel={() => setIsImportOwnerModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DirectoryPanel;