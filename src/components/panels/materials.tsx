"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { 
  PlusCircle, 
  Pencil, 
  Search, 
  Package2, 
  Save,
  X,
  Barcode,
  Layers,
  Building2,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Loader2,
  CheckCircle2,
  Briefcase,
  AlertCircle,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import type { Material, UOM, Customer, Owner } from "@/lib/types";
import { mockMaterials, mockCustomers, mockOwners } from "@/lib/data";
import { hydrateLocalCacheFromDatabase, persistMaterials } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ALL_UNITS = ["Unidad", "Caja", "Pack"];

const buildMaterialFieldsFromUoms = (uoms: UOM[]) => {
  const primary = uoms.find((uom) => uom.eanType === "EAN13") || uoms[0];
  const secondary = uoms.find((uom) => uom.eanType === "EAN14") || uoms[1];

  return {
    primaryUnit: primary?.unit || undefined,
    secondaryUnit: secondary?.unit || undefined,
    barcode13: uoms.find((uom) => uom.eanType === "EAN13")?.eanValue || undefined,
    barcode14: uoms.find((uom) => uom.eanType === "EAN14")?.eanValue || undefined,
    embalaje: secondary?.numerator || undefined,
  };
};

const buildUomsFromMaterialSnapshot = (material: Partial<Material> | null) => {
  if (!material) {
    return [] as UOM[];
  }

  if ((material.uoms || []).length > 0) {
    return material.uoms || [];
  }

  const derivedUoms: UOM[] = [];

  if (material.primaryUnit && material.barcode13) {
    derivedUoms.push({
      id: `derived-${material.id || material.code || 'material'}-ean13`,
      unit: material.primaryUnit,
      eanType: 'EAN13',
      eanValue: material.barcode13,
      numerator: 1,
      denominator: 1,
      height: 0,
      width: 0,
      length: 0,
      weight: 0,
    });
  }

  if (material.secondaryUnit && material.barcode14) {
    derivedUoms.push({
      id: `derived-${material.id || material.code || 'material'}-ean14`,
      unit: material.secondaryUnit,
      eanType: 'EAN14',
      eanValue: material.barcode14,
      numerator: material.embalaje || 1,
      denominator: 1,
      height: 0,
      width: 0,
      length: 0,
      weight: 0,
    });
  }

  return derivedUoms;
};

const MaterialForm = ({ material, customers, owners, onSave, onCancel }: { material: Partial<Material> | null, customers: Customer[], owners: Owner[], onSave: (material: Omit<Material, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const { toast } = useToast();
  const latestUomsRef = useRef<UOM[]>([]);
  const [formData, setFormData] = useState<Partial<Material>>({
    description: '', 
    code: '', 
    productType: 'Alimento', 
    ownerId: owners[0]?.id || '',
    isActive: true, 
    uoms: [], 
    ...material
  });

  useEffect(() => {
    const derivedUoms = buildUomsFromMaterialSnapshot(material);

    setFormData({
      description: '',
      code: '',
      productType: 'Alimento',
      ownerId: owners[0]?.id || '',
      isActive: true,
      ...material,
      uoms: (material?.uoms && material.uoms.length > 0) ? material.uoms : derivedUoms,
    });
  }, [material, owners]);

  useEffect(() => {
    latestUomsRef.current = formData.uoms || [];
  }, [formData.uoms]);

  useEffect(() => {
    if (!formData.ownerId && owners.length > 0) {
      setFormData((prev) => ({ ...prev, ownerId: owners[0].id }));
    }
  }, [formData.ownerId, owners]);

  const availableUnits = useMemo(() => {
    return ALL_UNITS.filter(unit => !formData.uoms?.some(u => u.unit === unit));
  }, [formData.uoms]);

  const [currentUom, setCurrentUom] = useState<Partial<UOM>>({ 
    unit: availableUnits[0] || '', 
    eanType: 'EAN13', 
    eanValue: '', 
    numerator: 1, 
    denominator: 1,
  });

  useEffect(() => {
    if (availableUnits.length > 0 && !availableUnits.includes(currentUom.unit as string)) {
      setCurrentUom(prev => ({ ...prev, unit: availableUnits[0] }));
    } else if (availableUnits.length === 0) {
      setCurrentUom(prev => ({ ...prev, unit: '' }));
    }
  }, [availableUnits, currentUom.unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { id, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: id === "embalaje" ? (value === "" ? undefined : Number(value)) : value 
    })); 
  };

  const handleAddUom = () => {
    if (!currentUom.eanValue || !currentUom.unit) return;
    
    const value = currentUom.eanValue.trim();
    if (currentUom.eanType === 'EAN13' && value.length !== 13) {
      toast({
        variant: "destructive",
        title: "Dimensiones inválidas",
        description: "Un código EAN13 debe tener exactamente 13 dígitos.",
      });
      return;
    }
    if (currentUom.eanType === 'EAN14' && value.length !== 14) {
      toast({
        variant: "destructive",
        title: "Dimensiones inválidas",
        description: "Un código EAN14 debe tener exactamente 14 dígitos.",
      });
      return;
    }

    setFormData(prev => {
      const nextUoms = [...(prev.uoms || []), { ...currentUom, id: `UOM-${Date.now()}` } as UOM];
      latestUomsRef.current = nextUoms;
      return {
        ...prev,
        ...buildMaterialFieldsFromUoms(nextUoms),
        uoms: nextUoms,
      };
    });
    
    const nextUnits = availableUnits.filter(u => u !== currentUom.unit);
    setCurrentUom({ 
      unit: nextUnits[0] || '', 
      eanType: 'EAN13', 
      eanValue: '', 
      numerator: 1, 
      denominator: 1 
    });
  };

  const removeUom = (id: string) => {
    setFormData(prev => {
      const nextUoms = prev.uoms?.filter(u => u.id !== id) || [];
      latestUomsRef.current = nextUoms;
      return {
        ...prev,
        ...buildMaterialFieldsFromUoms(nextUoms),
        uoms: nextUoms,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextUoms = [...latestUomsRef.current];
    const hasPendingUom = Boolean(String(currentUom.eanValue || '').trim() && String(currentUom.unit || '').trim());

    if (hasPendingUom) {
      const value = String(currentUom.eanValue || '').trim();
      if (currentUom.eanType === 'EAN13' && value.length !== 13) {
        toast({
          variant: "destructive",
          title: "Dimensiones inválidas",
          description: "Un código EAN13 debe tener exactamente 13 dígitos.",
        });
        return;
      }

      if (currentUom.eanType === 'EAN14' && value.length !== 14) {
        toast({
          variant: "destructive",
          title: "Dimensiones inválidas",
          description: "Un código EAN14 debe tener exactamente 14 dígitos.",
        });
        return;
      }

      const alreadyExists = nextUoms.some((uom) => uom.unit === currentUom.unit);
      if (!alreadyExists) {
        nextUoms = [...nextUoms, { ...currentUom, id: `UOM-${Date.now()}` } as UOM];
      }
    }

    onSave({
      ...formData,
      ...buildMaterialFieldsFromUoms(nextUoms),
      uoms: nextUoms,
    } as any);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="space-y-6 px-8 py-6">
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
            <div className="col-span-1 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Propietario <span className="text-red-500">*</span></Label>
              <Select value={formData.ownerId} onValueChange={(v) => setFormData(p => ({...p, ownerId: v}))}>
                <SelectTrigger className="rounded-full border-slate-200 h-11 px-5 font-bold bg-white shadow-sm">
                  <SelectValue placeholder="Dueño carga..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  {owners.map(o => <SelectItem key={o.id} value={o.id} className="rounded-xl text-xs">{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Descripción del material <span className="text-red-500">*</span></Label>
              <Input id="description" value={formData.description} onChange={handleChange} placeholder="Ej: Canigen Mha2" className="rounded-full border-slate-200 h-11 px-5 font-bold bg-white shadow-sm" required />
            </div>
            <div className="col-span-1 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Sku / Código Maestro <span className="text-red-500">*</span></Label>
              <Input id="code" value={formData.code} onChange={handleChange} placeholder="Ej: 1004800245" className="rounded-full border-slate-200 h-11 px-5 font-mono font-bold bg-slate-50 shadow-inner" required />
            </div>
            
            <div className="col-span-1 space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Tipo de producto</Label>
              <Select value={formData.productType} onValueChange={(v) => setFormData(p => ({...p, productType: v}))}>
                <SelectTrigger className="rounded-full border-slate-200 h-11 px-5 font-bold bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">
                  <SelectItem value="Alimento" className="text-xs">Alimento</SelectItem>
                  <SelectItem value="Farmacia" className="text-xs">Farmacia</SelectItem>
                  <SelectItem value="Equipo" className="text-xs">Equipo médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-full border border-slate-100 shadow-inner h-11 self-end">
              <div className="flex items-center gap-3 pl-2">
                <Label className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Estado operativo</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} className="scale-75" />
                <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", formData.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                  {formData.isActive ? 'activo' : 'inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
              <Layers className="size-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest leading-tight">Unidades de medida (UOM)</span>
                <span className="text-[9px] text-slate-500 font-bold">Configuración de factores de conversión</span>
              </div>
            </div>

            <div className="border border-slate-100 rounded-[2rem] p-5 bg-slate-50/30 space-y-5">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[9px] font-black text-slate-500 pl-3 uppercase">Unidad</Label>
                  <Select value={currentUom.unit} onValueChange={(v) => setCurrentUom(p => ({...p, unit: v}))} disabled={availableUnits.length === 0}>
                    <SelectTrigger className="h-10 rounded-full border-slate-200 px-4 text-[11px] font-bold bg-white shadow-sm">
                      <SelectValue placeholder={availableUnits.length === 0 ? "N/A" : "Unidad..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      {availableUnits.map(unit => (
                        <SelectItem key={unit} value={unit} className="text-xs">{unit}</SelectItem>
                      ))}
                      {availableUnits.length === 0 && <div className="p-2 text-[10px] text-center font-bold text-slate-400 italic">No más unidades</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[9px] font-black text-slate-500 pl-3 uppercase">Tipo EAN</Label>
                  <Select value={currentUom.eanType} onValueChange={(v) => setCurrentUom(p => ({...p, eanType: v}))}>
                    <SelectTrigger className="h-10 rounded-full border-slate-200 px-4 text-[11px] font-bold bg-white shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      <SelectItem value="EAN13" className="text-xs">EAN13</SelectItem>
                      <SelectItem value="EAN14" className="text-xs">EAN14</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-[9px] font-black text-slate-500 pl-3 uppercase">Código de barras</Label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                    <Input value={currentUom.eanValue} onChange={(e) => setCurrentUom(p => ({...p, eanValue: e.target.value}))} placeholder="Ingresar código" className="h-10 rounded-full pl-9 pr-4 text-[11px] font-mono font-bold bg-white border-slate-200 shadow-sm" />
                  </div>
                </div>
                <div className="col-span-1.5 space-y-1">
                  <Label className="text-[9px] font-black text-slate-500 pl-3 uppercase">Num.</Label>
                  <Input type="number" value={currentUom.numerator} onChange={(e) => setCurrentUom(p => ({...p, numerator: Number(e.target.value)}))} className="h-10 rounded-full px-4 text-[11px] font-bold bg-white border-slate-200 shadow-sm text-center" />
                </div>
                <div className="col-span-1.5 space-y-1">
                  <Label className="text-[9px] font-black text-slate-500 pl-3 uppercase">Denom.</Label>
                  <Input type="number" value={currentUom.denominator} onChange={(e) => setCurrentUom(p => ({...p, denominator: Number(e.target.value)}))} className="h-10 rounded-full px-4 text-[11px] font-bold bg-white border-slate-200 shadow-sm text-center" />
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddUom} 
                  disabled={availableUnits.length === 0 || !currentUom.eanValue}
                  className="col-span-2 h-10 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-transform active:scale-95"
                >
                  <PlusCircle className="size-4 mr-1.5" /> Añadir
                </Button>
              </div>

              <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50 h-10">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase pl-6">Unidad</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Num.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Denom.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Ean / Barcode</TableHead>
                      <TableHead className="text-right pr-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.uoms?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-[10px] font-bold text-slate-400 italic">No hay unidades configuradas.</TableCell>
                      </TableRow>
                    ) : (
                      formData.uoms?.map(u => (
                        <TableRow key={u.id} className="h-12 hover:bg-slate-50/50">
                          <TableCell className="pl-6"><Badge variant="outline" className="text-[9px] font-black bg-slate-50">{u.unit}</Badge></TableCell>
                          <TableCell className="text-[11px] font-bold text-slate-600 text-center">{u.numerator}</TableCell>
                          <TableCell className="text-[11px] font-bold text-slate-600 text-center">{u.denominator}</TableCell>
                          <TableCell className="font-mono text-[10px] font-bold text-primary">{u.eanValue}</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" onClick={() => removeUom(u.id)} className="size-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <DialogFooter className="shrink-0 gap-3 border-t pt-6 bg-slate-50/30 px-8 pb-8">
        <Button type="button" variant="ghost" onClick={onCancel} className="font-bold rounded-full px-8 h-12 bg-primary/10 text-primary hover:bg-primary/20 gap-2">
          <X className="size-5" /> Cancelar
        </Button>
        <Button type="submit" className="min-w-[180px] font-black rounded-full h-12 bg-primary text-white shadow-xl shadow-primary/20 gap-2 hover:scale-[1.02] transition-transform">
          <Save className="size-5" /> Guardar material maestro
        </Button>
      </DialogFooter>
    </form>
  );
};

const MaterialsPanel = () => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('materials');
      const savedCust = localStorage.getItem('customers');
      const savedOwners = localStorage.getItem('owners');
      setMaterials(saved ? JSON.parse(saved) : mockMaterials);
      setCustomers(savedCust ? JSON.parse(savedCust) : mockCustomers);
      const parsedOwners = savedOwners ? JSON.parse(savedOwners) : mockOwners;
      setOwners(parsedOwners);
      setImportOwnerId(parsedOwners[0]?.id || "");
      setIsInitialized(true);

      void hydrateLocalCacheFromDatabase()
        .then((data) => {
          setMaterials(data.materials);
          setCustomers(data.customers);
          setOwners(data.owners);
          setImportOwnerId((current) => current || data.owners[0]?.id || "");
        })
        .catch((error) => {
          console.warn('No se pudo refrescar materiales desde la base de datos.', error);
        });
    }
  }, []);

  useEffect(() => { 
    if (isInitialized) {
      localStorage.setItem('materials', JSON.stringify(materials));
    }
  }, [materials, isInitialized]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importOwnerId, setImportOwnerId] = useState<string>("");

  const syncMaterialsData = async (materialsToSync: Material[]) => {
    await persistMaterials(materialsToSync);

    try {
      const data = await hydrateLocalCacheFromDatabase();
      setMaterials(data.materials);
      setCustomers(data.customers);
      setOwners(data.owners);
    } catch (error) {
      console.warn('La base guardo materiales, pero no se pudo refrescar la cache local.', error);
    }
  };

  const recoverMaterialsFromDatabase = async (
    expectedMaterials: Array<Partial<Material>>
  ) => {
    try {
      const data = await hydrateLocalCacheFromDatabase();
      setMaterials(data.materials);
      setCustomers(data.customers);
      setOwners(data.owners);

      return expectedMaterials.every((expectedMaterial) => {
        const matched = data.materials.find(
          (material) => material.code === expectedMaterial.code || material.id === expectedMaterial.id
        );

        if (!matched) {
          return false;
        }

        if (typeof expectedMaterial.isActive === "boolean" && matched.isActive !== expectedMaterial.isActive) {
          return false;
        }

        if (expectedMaterial.uoms && matched.uoms.length < expectedMaterial.uoms.length) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.warn('No se pudo verificar materiales en base despues del error.', error);
      return false;
    }
  };

  const handleSave = (data: any) => {
    if (!String(data.ownerId || '').trim()) {
      toast({
        variant: "destructive",
        title: "Propietario requerido",
        description: "Debes seleccionar un propietario para guardar el material.",
      });
      return;
    }

    const normalizedCode = String(data.code || '').trim().toLowerCase();
    const duplicate = materials.find(m => 
      m.code.trim().toLowerCase() === normalizedCode && 
      m.id !== data.id
    );

    if (duplicate) {
      toast({
        variant: "destructive",
        title: "SKU Duplicado",
        description: `El código de material ${data.code} ya existe en el sistema.`,
      });
      return;
    }

    let updated;
    if (data.id) {
      updated = materials.map(m => m.id === data.id ? { ...m, ...data } : m);
    } else {
      updated = [{ ...data, id: `MAT-${Date.now()}` }, ...materials];
    }
    const changedMaterial = updated.find((material) => material.code === data.code || material.id === data.id);
    setMaterials(updated);
    setIsDialogOpen(false);
    setEditingMaterial(null);

    void (async () => {
      try {
        await syncMaterialsData(changedMaterial ? [changedMaterial] : []);
        toast({ title: data.id ? "Material actualizado con éxito" : "Material creado con éxito" });
      } catch (error) {
        console.error('No se pudo sincronizar materiales.', error);
        const recovered = await recoverMaterialsFromDatabase(changedMaterial ? [changedMaterial] : []);
        if (recovered) {
          toast({ title: data.id ? "Material actualizado con éxito" : "Material creado con éxito" });
          return;
        }

        toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "Los materiales se guardaron localmente, pero no se pudo subir la actualizacion a la base de datos." });
      }
    })();
  };
  
  const toggleStatus = async (material: Material) => {
    const newStatus = !material.isActive;
    const updatedMaterial = { ...material, isActive: newStatus };
    const updated = materials.map(m => m.id === material.id ? updatedMaterial : m);
    setMaterials(updated);
    try {
      await syncMaterialsData([updatedMaterial]);
      toast({ title: newStatus ? "material activado" : "material inactivado" });
    } catch (error) {
      console.error('No se pudo sincronizar materiales.', error);
      const recovered = await recoverMaterialsFromDatabase([updatedMaterial]);
      if (recovered) {
        toast({ title: newStatus ? "material activado" : "material inactivado" });
        return;
      }

      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "Los materiales se guardaron localmente, pero no se pudo subir la actualizacion a la base de datos." });
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      {
        Sku: "1004800245",
        Descripcion: "CANIGEN MHA2PPI/L-QUINTUPLE NF",
        Tipo: "Alimento",
        NIT_Cliente: "123456789-1",
        Embalaje: 12,
        Unidad_Primaria: "Unidad",
        Unidad_Secundaria: "Caja",
        EAN13: "7701234567890",
        EAN14: "17701234567897"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Materiales");
    XLSX.writeFile(wb, "Plantilla_Maestra_Materiales.xlsx");
    toast({ title: "Plantilla descargada" });
  };

  const handleImportExcel = () => {
    if (!file || !importOwnerId) {
      toast({
        variant: "destructive",
        title: "Seleccione un propietario",
        description: "Es obligatorio asignar los materiales a una entidad operativa.",
      });
      return;
    }
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let updatedCount = 0;
        let createdCount = 0;
        const dimensionErrors: string[] = [];

        const processedMaterials: Material[] = jsonData.map((row: any, index: number) => {
          const skuCode = String(row.Sku || row.SKU || '').trim();
          const desc = String(row.Descripcion || row.Description || '').trim();
          const embalaje = Number(row.Embalaje || 1);
          
          const uoms: UOM[] = [];
          
          if (row.EAN13) {
            const ean13Val = String(row.EAN13).trim();
            if (ean13Val.length !== 13) {
              dimensionErrors.push(`Fila ${index + 2}: EAN13 debe tener 13 dígitos.`);
            }
            uoms.push({
              id: `UOM-1-${Date.now()}-${Math.random()}`,
              unit: String(row.Unidad_Primaria || 'Unidad'),
              eanType: 'EAN13',
              eanValue: ean13Val,
              numerator: 1,
              denominator: 1,
              height: 0, width: 0, length: 0, weight: 0
            });
          }
          
          if (row.EAN14) {
            const ean14Val = String(row.EAN14).trim();
            if (ean14Val.length !== 14) {
              dimensionErrors.push(`Fila ${index + 2}: EAN14 debe tener 14 dígitos.`);
            }
            uoms.push({
              id: `UOM-2-${Date.now()}-${Math.random()}`,
              unit: String(row.Unidad_Secundaria || 'Caja'),
              eanType: 'EAN14',
              eanValue: ean14Val,
              numerator: embalaje,
              denominator: 1,
              height: 0, width: 0, length: 0, weight: 0
            });
          }

          return {
            id: `MAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            code: skuCode,
            description: desc,
            productType: String(row.Tipo || 'Alimento').trim(),
            customerNit: String(row.NIT_Cliente || row.NIT || '').trim(),
            ownerId: importOwnerId,
            isActive: true,
            uoms: uoms,
            embalaje: embalaje,
            primaryUnit: String(row.Unidad_Primaria || 'Unidad'),
            secondaryUnit: String(row.Unidad_Secundaria || 'Caja'),
            barcode13: String(row.EAN13 || ''),
            barcode14: String(row.EAN14 || '')
          } as Material;
        }).filter(m => m.code && m.description);

        if (dimensionErrors.length > 0) {
          toast({
            variant: "destructive",
            title: "Error de dimensiones EAN",
            description: dimensionErrors[0],
          });
          setIsLoading(false);
          return;
        }

        if (processedMaterials.length === 0) {
          toast({ variant: "destructive", title: "Error", description: "No se encontraron datos válidos." });
          setIsLoading(false);
          return;
        }

        const updatedMaterials = [...materials];
        processedMaterials.forEach(nm => {
          const idx = updatedMaterials.findIndex(m => m.code.toLowerCase() === nm.code.toLowerCase());
          if (idx === -1) {
            updatedMaterials.push(nm);
            createdCount++;
          } else {
            updatedMaterials[idx] = { ...updatedMaterials[idx], ...nm, id: updatedMaterials[idx].id };
            updatedCount++;
          }
        });

        setMaterials(updatedMaterials);
        void syncMaterialsData(processedMaterials)
          .then(() => {
            toast({ 
              title: "Importación exitosa", 
              description: `Se crearon ${createdCount} materiales y se actualizaron ${updatedCount} existentes vinculados al propietario.` 
            });
            setIsImportOpen(false);
            setFile(null);
          })
          .catch(async (error) => {
            console.error('No se pudo sincronizar materiales.', error);
            const recovered = await recoverMaterialsFromDatabase(processedMaterials);
            if (recovered) {
              toast({ 
                title: "Importación exitosa", 
                description: `Se crearon ${createdCount} materiales y se actualizaron ${updatedCount} existentes vinculados al propietario.` 
              });
              setIsImportOpen(false);
              setFile(null);
              return;
            }

            toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "Los materiales se guardaron localmente, pero no se pudo subir la actualizacion a la base de datos." });
          });
      } catch (err) {
        toast({ variant: "destructive", title: "Error de lectura" });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { 
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]); 
  }, []);
  
  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }, 
    maxFiles: 1 
  });

  const filtered = useMemo(() => materials.filter(m => 
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.description.toLowerCase().includes(searchTerm.toLowerCase())
  ), [materials, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => 
    filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filtered, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar materiales por SKU o descripción..." 
                className="pl-10 h-9 w-96 bg-slate-50 border-none font-bold text-xs" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsImportOpen(true)} className="bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 font-black gap-2 px-6 rounded-lg h-9 text-xs shadow-none">
              <FileSpreadsheet className="size-4" /> Importar masivo
            </Button>
            <Button onClick={() => { setEditingMaterial({ isActive: true, uoms: [] }); setIsDialogOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white uppercase tracking-tighter">
              <PlusCircle className="size-4" /> Añadir material
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-muted/20 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/5 h-14">
              <TableRow>
                <TableHead className="pl-8 font-black text-[13px]">Sku / Código</TableHead>
                <TableHead className="font-black text-[13px]">Descripción del material</TableHead>
                <TableHead className="font-black text-[13px]">Propietario</TableHead>
                <TableHead className="text-center font-black text-[13px]">Estado</TableHead>
                <TableHead className="text-right pr-8 font-black text-[13px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground italic font-bold opacity-30">No se encontraron materiales.</TableCell>
                </TableRow>
              ) : (
                paginated.map(m => {
                  const owner = owners.find(o => o.id === m.ownerId);
                  return (
                    <TableRow key={m.id} className={cn("group hover:bg-muted/5 h-16 transition-colors border-b last:border-none", !m.isActive && "opacity-60")}>
                      <TableCell className="pl-8 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-black text-primary">{m.code}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{m.productType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-[11px] text-slate-600 max-w-[200px] truncate">
                        {m.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{owner?.name || 'S/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-3">
                           <Switch checked={m.isActive} onCheckedChange={() => toggleStatus(m)} className="scale-75" />
                           <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", m.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>{m.isActive ? 'activo' : 'inactivo'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-primary/10" onClick={() => { setEditingMaterial(m); setIsDialogOpen(true); }}>
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
          <DialogHeader className="p-8 pb-4 shrink-0 border-b">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Package2 className="size-8" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">Maestra de materiales</DialogTitle>
                <DialogDescription className="text-[10px] font-black text-muted-foreground tracking-widest uppercase leading-none">Gestión técnica y configuración logística de SKUs.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <MaterialForm 
              material={editingMaterial} 
              customers={customers}
              owners={owners}
              onSave={handleSave} 
              onCancel={() => setIsDialogOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 bg-white border-none shadow-3xl overflow-hidden">
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
            <DialogDescription className="font-bold pt-2">Actualiza el catálogo maestro cargando un archivo Excel con la estructura técnica requerida.</DialogDescription>
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
              <p className="text-[10px] text-slate-400 font-bold italic px-2">Todos los productos del Excel se vincularán a este propietario para efectos de inventario y trazabilidad.</p>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <AlertCircle className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-black uppercase text-primary">Columnas Requeridas</span>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                  Sku, Descripcion, Tipo, NIT_Cliente, Embalaje, Unidad_Primaria, Unidad_Secundaria, EAN13, EAN14.
                </p>
              </div>
            </div>

            <div {...getRootProps()} className={cn("border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all", file ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:border-primary/50")}>
              <input {...getInputProps()} />
              <div className="space-y-3">
                <UploadCloud className="size-10 mx-auto text-slate-300" />
                <p className="font-black text-slate-800 text-sm">{file ? file.name : "Suelta el archivo aquí o haz clic para seleccionar"}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Soporta formatos .xlsx</p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-3 border-t pt-6 bg-slate-50/30 p-8">
             <Button variant="ghost" onClick={() => { setIsImportOpen(false); setFile(null); }} className="font-bold rounded-full h-12 flex-1 bg-primary/10 text-primary gap-2">
               <X className="size-5" /> Cancelar
             </Button>
             <Button onClick={handleImportExcel} disabled={!file || isLoading || !importOwnerId} className="bg-primary flex-[2] h-12 font-black rounded-full shadow-xl shadow-primary/20 text-white gap-2 hover:scale-[1.02] transition-transform">
               {isLoading ? <Loader2 className="animate-spin size-5" /> : <CheckCircle2 className="size-5" />} Procesar Materiales
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPanel;
