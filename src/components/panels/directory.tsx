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

const CustomerForm = ({ customer, owners, onSave, onCancel }: { customer: Partial<Customer> | null, owners: Owner[], onSave: (customer: Omit<Customer, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    isActive: true,
    ownerId: owners[0]?.id || '',
    ...customer
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Customer, 'id'> & { id?: string });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="ownerId" className="text-[11px] font-bold text-slate-700 pl-4">Propietario <span className="text-red-500 font-bold">*</span></Label>
          <Select value={formData.ownerId} onValueChange={(v) => setFormData(p => ({...p, ownerId: v}))}>
            <SelectTrigger className="rounded-full border-slate-200 h-11 px-5 font-bold bg-white shadow-sm">
              <SelectValue placeholder="Dueño de carga..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-3xl">
              {owners.map(o => <SelectItem key={o.id} value={o.id} className="rounded-xl text-xs">{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[11px] font-bold text-slate-700 pl-4">Nombre del cliente <span className="text-red-500 font-bold">*</span></Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Supermercado Central" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nit" className="text-[11px] font-bold text-slate-700 pl-4">NIT / Identificación <span className="text-red-500 font-bold">*</span></Label>
          <Input id="nit" value={formData.nit || ''} onChange={handleChange} placeholder="Ej: 123456789-0" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-[11px] font-bold text-slate-700 pl-4">Teléfono <span className="text-red-500 font-bold">*</span></Label>
          <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 3101234567" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-[11px] font-bold text-slate-700 pl-4">Ciudad <span className="text-red-500 font-bold">*</span></Label>
          <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label htmlFor="address" className="text-[11px] font-bold text-slate-700 pl-4">Dirección fiscal <span className="text-red-500 font-bold">*</span></Label>
          <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Calle 123 #45-67" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="col-span-3 flex items-center justify-between p-4 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
          <div className="space-y-0.5 pl-2">
            <Label className="text-xs font-bold text-slate-800">Estado operativo</Label>
            <p className="text-[10px] text-slate-500 font-medium italic">Define si el cliente puede realizar transacciones en el sistema.</p>
          </div>
          <div className="flex items-center gap-3">
             <Switch checked={formData.isActive} onCheckedChange={handleSwitchChange} className="scale-75" />
             <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
               {formData.isActive ? 'activo' : 'inactivo'}
             </Badge>
          </div>
        </div>
      </div>
      <DialogFooter className="mt-8 gap-3 border-t pt-6 bg-slate-50/30 -mx-8 px-8 -mb-8 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary hover:bg-primary/20 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button type="submit" className="min-w-[180px] font-black rounded-full h-12 shadow-xl shadow-primary/20 bg-primary text-white gap-2">
          <Save className="size-5" /> Guardar cliente
        </Button>
      </DialogFooter>
    </form>
  );
};

const StoreForm = ({ store, customers, owners, onSave, onCancel }: { store: Partial<Store> | null, customers: Customer[], owners: Owner[], onSave: (store: Omit<Store, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<Store>>({
    isActive: true,
    ownerId: owners[0]?.id || '',
    ...store
  });
  const [nitSearch, setNitSearch] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCustomerChange = (nit: string) => {
    setFormData(prev => ({ ...prev, customerNit: nit }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.nit.includes(nitSearch) || 
      c.name.toLowerCase().includes(nitSearch.toLowerCase())
    );
  }, [customers, nitSearch]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Store, 'id'> & { id?: string });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="ownerId" className="text-[11px] font-bold text-slate-700 pl-4">Propietario <span className="text-red-500 font-bold">*</span></Label>
          <Select value={formData.ownerId} onValueChange={(v) => setFormData(p => ({...p, ownerId: v}))}>
            <SelectTrigger className="rounded-full border-slate-200 h-11 px-5 font-bold bg-white shadow-sm">
              <SelectValue placeholder="Dueño de carga..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-3xl">
              {owners.map(o => <SelectItem key={o.id} value={o.id} className="rounded-xl text-xs">{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[11px] font-bold text-slate-700 pl-4">Nombre de la tienda <span className="text-red-500 font-bold">*</span></Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Éxito Norte" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-[11px] font-bold text-slate-700 pl-4">Código interno <span className="text-red-500 font-bold">*</span></Label>
          <Input id="code" value={formData.code || ''} onChange={handleChange} placeholder="Ej: STO-001" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customerNit" className="text-[11px] font-bold text-slate-700 pl-4">Socio vinculado <span className="text-red-500 font-bold">*</span></Label>
          <Select value={formData.customerNit || ''} onValueChange={handleCustomerChange}>
            <SelectTrigger id="customerNit" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm bg-white">
              <SelectValue placeholder="Buscar cliente..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-3xl max-h-[250px]">
              <div className="p-2 border-b sticky top-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                <Input 
                  placeholder="Escribe NIT o nombre..." 
                  value={nitSearch} 
                  onChange={(e) => setNitSearch(e.target.value)}
                  className="h-8 text-[11px] rounded-lg border-slate-100"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              {filteredCustomers.map(c => (
                <SelectItem key={c.nit} value={c.nit} className="rounded-lg m-1 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">NIT: {c.nit}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-[11px] font-bold text-slate-700 pl-4">Ciudad <span className="text-red-500 font-bold">*</span></Label>
          <Input id="city" value={formData.city || ''} onChange={handleChange} placeholder="Ej: Bogotá" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-[11px] font-bold text-slate-700 pl-4">Teléfono</Label>
          <Input id="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 3101234567" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-700 pl-4">Estado punto</Label>
          <div className="flex items-center justify-between px-5 h-11 bg-slate-50 border border-slate-100 rounded-full shadow-inner">
             <div className="flex items-center gap-3 w-full">
               <Switch checked={formData.isActive} onCheckedChange={handleSwitchChange} className="scale-75" />
               <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                 {formData.isActive ? 'activo' : 'inactivo'}
               </Badge>
             </div>
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="address" className="text-[11px] font-bold text-slate-700 pl-4">Dirección exacta de despacho <span className="text-red-500 font-bold">*</span></Label>
          <Input id="address" value={formData.address || ''} onChange={handleChange} placeholder="Ej: Avenida 100 #15-30, Bodega 4" className="rounded-full border-slate-200 h-11 px-5 font-medium shadow-sm" required />
        </div>
      </div>
      <DialogFooter className="mt-8 gap-3 border-t pt-6 bg-slate-50/30 -mx-8 px-8 -mb-8 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary hover:bg-primary/20 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button type="submit" className="min-w-[180px] font-black rounded-full h-12 shadow-xl shadow-primary/20 bg-primary text-white gap-2">
          <Save className="size-5" /> Guardar tienda
        </Button>
      </DialogFooter>
    </form>
  );
};

const DirectoryPanel = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCust = localStorage.getItem('customers');
      const savedStores = localStorage.getItem('stores');
      const savedOwners = localStorage.getItem('owners');
      setCustomers(savedCust ? JSON.parse(savedCust) : mockCustomers);
      setStores(savedStores ? JSON.parse(savedStores) : mockStores);
      const parsedOwners = savedOwners ? JSON.parse(savedOwners) : mockOwners;
      setOwners(parsedOwners);
      setImportOwnerId(parsedOwners[0]?.id || "");
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('customers', JSON.stringify(customers));
      localStorage.setItem('stores', JSON.stringify(stores));
    }
  }, [customers, stores, isInitialized]);

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

  const syncDirectoryData = (nextCustomers: Customer[], nextStores: Store[]) => {
    void Promise.all([persistCustomers(nextCustomers), persistStores(nextStores)]).catch((error) => {
      console.error('No se pudo sincronizar directorio.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "El directorio se guardo localmente, pero no se pudo subir a la base de datos." });
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
    
    if (duplicate && !data.id) {
      toast({ 
        variant: "destructive", 
        title: "NIT duplicado", 
        description: `Ya existe un cliente con el NIT ${data.nit}. No se puede crear.` 
      });
      return;
    }

    if (data.id) {
      const updatedCustomers = customers.map(c => c.id === data.id ? { ...c, ...data } : c);
      const updatedStores = stores.map(s => s.customerNit === data.nit ? { ...s, isActive: data.isActive } : s);
      setCustomers(updatedCustomers);
      setStores(updatedStores);
      syncDirectoryData(updatedCustomers, updatedStores);
      toast({ title: "Socio actualizado" });
    } else {
      const updatedCustomers = [{ ...data, id: `CUST-${data.nit}`, isActive: data.isActive ?? true }, ...customers];
      setCustomers(updatedCustomers);
      syncDirectoryData(updatedCustomers, stores);
      toast({ title: "Socio comercial creado" });
    }
    setIsDialogOpen(false);
  };

  const handleSaveStore = (data: any) => {
    const code = String(data.code || '').trim().toLowerCase();
    const duplicate = stores.find(s => s.code.trim().toLowerCase() === code && s.id !== data.id);
    
    if (duplicate && !data.id) {
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
      toast({ title: "Punto de venta actualizado" });
    } else {
      const updatedStores = [{ ...data, id: `STORE-${data.code}`, isActive: data.isActive ?? true }, ...stores];
      setStores(updatedStores);
      syncDirectoryData(customers, updatedStores);
      toast({ title: "Punto de venta creado" });
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
      toast({ title: newStatus ? "cliente activado" : "cliente inactivado" });
    } else {
      const updatedStores = stores.map(s => s.id === item.id ? { ...s, isActive: newStatus } : s);
      setStores(updatedStores);
      syncDirectoryData(customers, updatedStores);
      toast({ title: `tienda ${newStatus ? 'activada' : 'inactivada'}` });
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsCustomers = XLSX.utils.json_to_sheet([{ NIT: "123456789-0", Nombre: "Cliente Ejemplo", Ciudad: "Bogotá", Direccion: "Calle 100", Telefono: "3100000000" }]);
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Clientes");
    const wsStores = XLSX.utils.json_to_sheet([{ Codigo: "STO-001", Nombre: "Tienda Norte", NIT_Cliente: "123456789-0", Ciudad: "Bogotá", Direccion: "Cra 15", Telefono: "3200000000" }]);
    XLSX.utils.book_append_sheet(wb, wsStores, "Tiendas");
    XLSX.writeFile(wb, "Plantilla_Directorio.xlsx");
    toast({ title: "Plantilla descargada" });
  };

  const handleImportExcel = () => {
    if (!file || !importOwnerId) {
      toast({ variant: "destructive", title: "Configuración incompleta", description: "Selecciona un propietario y carga un archivo." });
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
          toast({ variant: "destructive", title: "Archivo vacío", description: "No se encontraron datos válidos en las hojas 'Clientes' o 'Tiendas'." });
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
          description: `Clientes: ${custCreated} creados, ${custUpdated} actualizados. Tiendas: ${storeCreated} creadas, ${storeUpdated} actualizadas vinculadas al propietario seleccionado.`
        });
        setIsImportOpen(false);
        setFile(null);
      } catch (err) {
        toast({ variant: "destructive", title: "Error de lectura" });
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
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={`Filtrar ${activeTab === 'customers' ? 'clientes' : 'tiendas'}...`} 
                className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsImportOpen(true)} className="bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 font-black gap-2 px-6 rounded-lg h-9 text-xs shadow-none">
              <FileSpreadsheet className="size-4" /> Importar masivo
            </Button>
            <Button onClick={() => { setEditingItem({ type: activeTab as any, data: { isActive: true } }); setIsDialogOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white">
              <PlusCircle className="size-4" /> Añadir {activeTab === 'customers' ? 'cliente' : 'tienda'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="customers" className="w-full" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }}>
        <TabsList className="bg-slate-100/80 p-1.5 h-14 rounded-[1.5rem] grid grid-cols-2 w-full sm:w-[500px] mb-6 border border-slate-200/60 shadow-inner">
          <TabsTrigger 
            value="customers" 
            className="rounded-[1.1rem] font-black text-[11px] uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:scale-[0.98] gap-2"
          >
            <Building2 className="size-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger 
            value="stores" 
            className="rounded-[1.1rem] font-black text-[11px] uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:scale-[0.98] gap-2"
          >
            <StoreIcon className="size-4" />
            Tiendas
          </TabsTrigger>
        </TabsList>

        <Card className="border border-muted/20 shadow-sm bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/5 h-14">
                <TableRow>
                  <TableHead className="pl-8 text-[13px] font-black">{activeTab === 'customers' ? 'Socio comercial' : 'Punto de despacho'}</TableHead>
                  <TableHead className="text-[13px] font-black">Propietario</TableHead>
                  <TableHead className="text-[13px] font-black">Contacto</TableHead>
                  <TableHead className="text-[13px] font-black">Ubicación</TableHead>
                  <TableHead className="text-[13px] font-black">Estado</TableHead>
                  <TableHead className="text-right pr-8 text-[13px] font-black">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item: any) => {
                  const owner = owners.find(o => o.id === item.ownerId);
                  return (
                    <TableRow key={item.id} className={cn("group hover:bg-muted/5 border-b last:border-none transition-colors h-16", !item.isActive && "opacity-60")}>
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("size-9 rounded-xl flex items-center justify-center text-primary", item.isActive ? "bg-primary/10" : "bg-slate-200")}>
                            {activeTab === 'customers' ? <Building2 className="size-4" /> : <Building className="size-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] text-slate-600">{item.name}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">{activeTab === 'customers' ? 'NIT' : 'Código'}: {activeTab === 'customers' ? item.nit : item.code}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{owner?.name || 'S/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-600">{item.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600"><MapPin className="size-3 text-primary" /> {item.city}</div>
                          <span className="text-[9px] text-muted-foreground">{item.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Switch checked={item.isActive} onCheckedChange={() => toggleStatus(item, activeTab as any)} className="scale-75" />
                           <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", item.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{item.isActive ? 'activo' : 'inactivo'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary opacity-0 group-hover:opacity-100" onClick={() => { setEditingItem({ type: activeTab as any, data: item }); setIsDialogOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
          <CardContent className="p-0">
             <DataTablePagination totalRows={filteredItems.length} pageSize={itemsPerPage} onPageSizeChange={setItemsPerPage} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[850px] rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <DialogHeader className="p-8 pb-0">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                {editingItem?.type === 'customers' ? <Building2 className="size-6" /> : <StoreIcon className="size-6" />}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">{editingItem?.data?.id ? 'Editar' : 'Añadir'} {editingItem?.type === 'customers' ? 'socio comercial' : 'punto de venta'}</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">Gestión de datos maestros de distribución.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-8 pb-8 pt-6">
            {editingItem?.type === 'customers' ? (
              <CustomerForm customer={editingItem.data} owners={owners} onSave={handleSaveCustomer} onCancel={() => setIsDialogOpen(false)} />
            ) : (
              <StoreForm store={editingItem?.data} customers={customers} owners={owners} onSave={handleSaveStore} onCancel={() => setIsDialogOpen(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 bg-white border-none shadow-3xl overflow-hidden">
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-8 text-primary" />
                <DialogTitle className="text-3xl font-black tracking-tighter">Importación Masiva</DialogTitle>
              </div>
              <Button variant="ghost" onClick={handleDownloadTemplate} className="text-primary font-black text-[10px] tracking-widest bg-primary/5 rounded-xl px-4 h-10">
                <Download className="size-3.5 mr-2" /> Plantilla
              </Button>
            </div>
            <DialogDescription className="font-bold pt-2">Actualiza el directorio cargando un archivo excel con las hojas 'Clientes' y 'Tiendas'.</DialogDescription>
          </DialogHeader>
          <div className="px-8 pb-4 space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner space-y-4">
              <div className="flex items-center gap-3">
                <Briefcase className="size-5 text-primary" />
                <Label className="text-sm font-black text-slate-700 uppercase tracking-tighter">Asignar a Propietario</Label>
              </div>
              <Select value={importOwnerId} onValueChange={setImportOwnerId}>
                <SelectTrigger className="h-12 rounded-2xl bg-white border-slate-200 font-bold shadow-sm">
                  <SelectValue placeholder="Seleccione el propietario..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  {owners.map(o => (
                    <SelectItem key={o.id} value={o.id} className="rounded-xl m-1 text-xs">
                      {o.name} <span className="text-[10px] opacity-50 ml-2">({o.nit})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400 font-bold italic px-2">Todos los registros del Excel se vincularán a este propietario.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="size-4 text-primary" />
                  <span className="text-[11px] font-black uppercase text-slate-700">Hoja: Clientes</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Columnas requeridas:<br/>
                  <span className="text-primary">NIT, Nombre</span>, Ciudad, Direccion, Telefono.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <StoreIcon className="size-4 text-primary" />
                  <span className="text-[11px] font-black uppercase text-slate-700">Hoja: Tiendas</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Columnas requeridas:<br/>
                  <span className="text-primary">Codigo, Nombre, NIT_Cliente</span>, Ciudad, Direccion, Telefono.
                </p>
              </div>
            </div>

            <div {...getRootProps()} className={cn("border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all", file ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:border-primary/50")}>
              <input {...getInputProps()} />
              <div className="space-y-3">
                <UploadCloud className="size-10 mx-auto text-slate-300" />
                <p className="font-black text-slate-800 text-sm">{file ? file.name : "Suelta el archivo aquí o haz clic para seleccionar"}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Soporta formatos .xlsx y .xls</p>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2 text-red-600">
                  <AlertCircle className="size-4" />
                  <span className="text-xs font-black uppercase">Errores detectados</span>
                </div>
                <ul className="space-y-1">
                  {importErrors.map((err, i) => (
                    <li key={i} className="text-[10px] text-red-500 font-bold">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-3 border-t pt-6 bg-slate-50/30 p-8">
             <Button variant="ghost" onClick={() => { setIsImportOpen(false); setImportErrors([]); setFile(null); }} className="font-bold rounded-full h-12 flex-1 bg-primary/10 text-primary gap-2">
               <X className="size-5" /> Cancelar
             </Button>
             <Button onClick={handleImportExcel} disabled={!file || isLoading || !importOwnerId} className="bg-primary flex-[2] h-12 font-black rounded-full shadow-xl shadow-primary/20 text-white gap-2 hover:scale-[1.02] transition-transform">
               {isLoading ? <Loader2 className="animate-spin size-5" /> : <CheckCircle2 className="size-5" />} Procesar Directorio
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectoryPanel;
