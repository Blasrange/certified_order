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
  ChevronDown,
  Check,
  Tag,
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
import { persistMaterials } from "@/lib/app-data-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const ALL_UNITS = ["Unidad", "Caja", "Pack"];
const PRODUCT_TYPES = ["Alimento", "Farmacia", "Equipo médico", "Fisiológica"," Medicada" ,"Otro"];

const fetchBootstrapData = async () => {
  const response = await fetch('/api/app-data/bootstrap', { cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as {
    materials?: Material[];
    customers?: Customer[];
    owners?: Owner[];
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo refrescar la información de materiales.');
  }

  return {
    materials: payload?.materials || [],
    customers: payload?.customers || [],
    owners: payload?.owners || [],
  };
};

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

// Modal de selección de propietarios
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
                Selecciona el propietario al que pertenece este material
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

// Modal de selección de tipo de producto
const ProductTypeSelectionModal = ({ 
  selectedType, 
  onConfirm, 
  onCancel 
}: { 
  selectedType: string, 
  onConfirm: (type: string) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedType, setTempSelectedType] = useState<string>(selectedType);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTypes = useMemo(() => {
    return PRODUCT_TYPES.filter(type => 
      type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleConfirm = () => {
    onConfirm(tempSelectedType);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
              <Tag className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                Seleccionar tipo de producto
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Elige la categoría del material
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar tipo..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <div className="divide-y divide-slate-100">
              {filteredTypes.map((type) => {
                const isSelected = tempSelectedType === type;
                return (
                  <div 
                    key={type}
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                    onClick={() => setTempSelectedType(type)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <Check className="size-3 text-white" />}
                      </div>
                      <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-slate-700")}>
                        {type}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredTypes.length === 0 && (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Tag className="size-10 mb-2 text-slate-300" />
                    <p className="text-sm font-medium">No se encontraron tipos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 gap-3">
          <Button variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
          >
            <Check className="size-4 mr-2" /> Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MaterialForm = ({ material, customers, owners, onSave, onCancel }: { material: Partial<Material> | null, customers: Customer[], owners: Owner[], onSave: (material: Omit<Material, 'id'> & { id?: string }) => void, onCancel: () => void }) => {
  const { toast } = useToast();
  const latestUomsRef = useRef<UOM[]>([]);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isProductTypeModalOpen, setIsProductTypeModalOpen] = useState(false);
  
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
        title: "Código EAN13 inválido",
        description: "Un código EAN13 debe tener exactamente 13 dígitos.",
      });
      return;
    }
    if (currentUom.eanType === 'EAN14' && value.length !== 14) {
      toast({
        variant: "destructive",
        title: "Código EAN14 inválido",
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

  const handleOwnerConfirm = (ownerId: string) => {
    setFormData(prev => ({ ...prev, ownerId }));
    setIsOwnerModalOpen(false);
  };

  const handleProductTypeConfirm = (productType: string) => {
    setFormData(prev => ({ ...prev, productType }));
    setIsProductTypeModalOpen(false);
  };

  const selectedOwner = owners.find(o => o.id === formData.ownerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nextUoms = [...latestUomsRef.current];
    const hasPendingUom = Boolean(String(currentUom.eanValue || '').trim() && String(currentUom.unit || '').trim());

    if (hasPendingUom) {
      const value = String(currentUom.eanValue || '').trim();
      if (currentUom.eanType === 'EAN13' && value.length !== 13) {
        toast({
          variant: "destructive",
          title: "Código EAN13 inválido",
          description: "Un código EAN13 debe tener exactamente 13 dígitos.",
        });
        return;
      }

      if (currentUom.eanType === 'EAN14' && value.length !== 14) {
        toast({
          variant: "destructive",
          title: "Código EAN14 inválido",
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
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
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
                <Label className="text-xs font-semibold text-slate-700">Descripción del material <span className="text-red-500">*</span></Label>
                <Input id="description" value={formData.description} onChange={handleChange} placeholder="Ej: Canigen Mha2" className="rounded-xl h-11 text-sm font-medium bg-white border-slate-200" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">SKU / Código maestro <span className="text-red-500">*</span></Label>
                <Input id="code" value={formData.code} onChange={handleChange} placeholder="Ej: 1004800245" className="rounded-xl h-11 text-sm font-mono font-medium bg-white border-slate-200" required />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de producto</Label>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsProductTypeModalOpen(true)}
                  className="w-full h-11 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="size-4 text-primary/70" />
                    <span className="text-sm font-medium text-slate-700">
                      {formData.productType || "Seleccionar tipo"}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2 xl:col-span-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Estado operativo</Label>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Define si el material está disponible</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData(p => ({...p, isActive: v}))} />
                  <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                    formData.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {formData.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
                <Layers className="size-4 text-primary" />
                <div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Unidades de medida (UOM)</span>
                  <p className="text-[9px] text-slate-500 font-medium">Configuración de factores de conversión</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[9px] font-semibold text-slate-500">Unidad</Label>
                    <Select value={currentUom.unit} onValueChange={(v) => setCurrentUom(p => ({...p, unit: v}))} disabled={availableUnits.length === 0}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 text-xs font-medium bg-white">
                        <SelectValue placeholder={availableUnits.length === 0 ? "N/A" : "Unidad..."} />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-md">
                        {availableUnits.map(unit => (
                          <SelectItem key={unit} value={unit} className="text-xs">{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[9px] font-semibold text-slate-500">Tipo EAN</Label>
                    <Select value={currentUom.eanType} onValueChange={(v) => setCurrentUom(p => ({...p, eanType: v}))}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200 text-xs font-medium bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-md">
                        <SelectItem value="EAN13">EAN13</SelectItem>
                        <SelectItem value="EAN14">EAN14</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[9px] font-semibold text-slate-500">Código de barras</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                      <Input value={currentUom.eanValue} onChange={(e) => setCurrentUom(p => ({...p, eanValue: e.target.value}))} placeholder="Ingresar código" className="h-9 rounded-lg pl-9 pr-3 text-xs font-mono bg-white border-slate-200" />
                    </div>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[9px] font-semibold text-slate-500">Num.</Label>
                    <Input type="number" value={currentUom.numerator} onChange={(e) => setCurrentUom(p => ({...p, numerator: Number(e.target.value)}))} className="h-9 rounded-lg px-3 text-xs text-center bg-white border-slate-200" />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[9px] font-semibold text-slate-500">Denom.</Label>
                    <Input type="number" value={currentUom.denominator} onChange={(e) => setCurrentUom(p => ({...p, denominator: Number(e.target.value)}))} className="h-9 rounded-lg px-3 text-xs text-center bg-white border-slate-200" />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddUom} 
                    disabled={availableUnits.length === 0 || !currentUom.eanValue}
                    className="col-span-3 h-9 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all"
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Añadir UOM
                  </Button>
                </div>

                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase pl-5 py-2">Unidad</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-center py-2">Num.</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase text-center py-2">Denom.</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2">EAN / Barcode</TableHead>
                        <TableHead className="text-right pr-5 py-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.uoms?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-xs font-medium text-slate-400 italic">No hay unidades configuradas</TableCell>
                        </TableRow>
                      ) : (
                        formData.uoms?.map(u => (
                          <TableRow key={u.id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-5 py-2">
                              <Badge variant="outline" className="text-[9px] font-semibold bg-slate-50 rounded-full">{u.unit}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600 text-center py-2">{u.numerator}</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600 text-center py-2">{u.denominator}</TableCell>
                            <TableCell className="font-mono text-[10px] font-semibold text-primary py-2">{u.eanValue}</TableCell>
                            <TableCell className="text-right pr-5 py-2">
                              <Button variant="ghost" size="icon" onClick={() => removeUom(u.id)} className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                <X className="size-3.5" />
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

        <DialogFooter className="shrink-0 gap-3 border-t pt-5 bg-slate-50/50 px-6 pb-6">
          <Button type="button" variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
            </Button>
          <Button type="submit" className="dialog-btn-primary">
            <Save className="size-4 mr-2" /> Guardar material
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

      {isProductTypeModalOpen && (
        <ProductTypeSelectionModal 
          selectedType={formData.productType || 'Alimento'}
          onConfirm={handleProductTypeConfirm}
          onCancel={() => setIsProductTypeModalOpen(false)}
        />
      )}
    </>
  );
};

const MaterialsPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isImportOwnerModalOpen, setIsImportOwnerModalOpen] = useState(false);

  useEffect(() => {
    setMaterials(appData.materials.length > 0 ? appData.materials : mockMaterials);
    setCustomers(appData.customers.length > 0 ? appData.customers : mockCustomers);
    const nextOwners = appData.owners.length > 0 ? appData.owners : mockOwners;
    setOwners(nextOwners);
    setImportOwnerId((current) => current || nextOwners[0]?.id || "");
  }, [appData.customers, appData.materials, appData.owners]);

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
    await appData.refresh();
  };

  const recoverMaterialsFromDatabase = async (
    expectedMaterials: Array<Partial<Material>>
  ) => {
    try {
      const data = await fetchBootstrapData();
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
        title: "SKU duplicado",
        description: `El código ${data.code} ya está registrado para otro material.`,
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
        toast({
          title: data.id ? "Material actualizado" : "Material creado",
          description: `El material ${data.description} fue guardado correctamente.`,
        });
      } catch (error) {
        console.error('No se pudo sincronizar materiales.', error);
        const recovered = await recoverMaterialsFromDatabase(changedMaterial ? [changedMaterial] : []);
        if (recovered) {
          toast({
            title: data.id ? "Material actualizado" : "Material creado",
            description: `El material ${data.description} fue guardado correctamente.`,
          });
          return;
        }

        toast({ variant: "destructive", title: "Sincronización pendiente", description: "El material quedó actualizado localmente, pero no fue posible sincronizarlo con la base de datos." });
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
      toast({ title: newStatus ? "Material activado" : "Material desactivado", description: `El estado del material ${material.description} fue actualizado correctamente.` });
    } catch (error) {
      console.error('No se pudo sincronizar materiales.', error);
      const recovered = await recoverMaterialsFromDatabase([updatedMaterial]);
      if (recovered) {
        toast({ title: newStatus ? "Material activado" : "Material desactivado", description: `El estado del material ${material.description} fue actualizado correctamente.` });
        return;
      }

      toast({ variant: "destructive", title: "Sincronización pendiente", description: "El cambio de estado quedó guardado localmente, pero no fue posible sincronizarlo con la base de datos." });
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
    toast({ title: "Plantilla descargada", description: "La plantilla de materiales se descargó correctamente." });
  };

  const handleImportOwnerConfirm = (ownerId: string) => {
    setImportOwnerId(ownerId);
    setIsImportOwnerModalOpen(false);
  };

  const selectedImportOwner = owners.find(o => o.id === importOwnerId);

  const handleImportExcel = () => {
    if (!file || !importOwnerId) {
      toast({
        variant: "destructive",
        title: "Propietario requerido para importar",
        description: "Debes seleccionar el propietario al que quedarán asociados los materiales importados.",
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
            title: "Códigos EAN inválidos",
            description: dimensionErrors[0],
          });
          setIsLoading(false);
          return;
        }

        if (processedMaterials.length === 0) {
          toast({ variant: "destructive", title: "Archivo sin datos válidos", description: "No se encontraron materiales válidos para importar en el archivo seleccionado." });
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
              title: "Importación de materiales completada", 
              description: `Se crearon ${createdCount} materiales y se actualizaron ${updatedCount} registros existentes.` 
            });
            setIsImportOpen(false);
            setFile(null);
          })
          .catch(async (error) => {
            console.error('No se pudo sincronizar materiales.', error);
            const recovered = await recoverMaterialsFromDatabase(processedMaterials);
            if (recovered) {
              toast({ 
                title: "Importación de materiales completada", 
                description: `Se crearon ${createdCount} materiales y se actualizaron ${updatedCount} registros existentes.` 
              });
              setIsImportOpen(false);
              setFile(null);
              return;
            }

            toast({ variant: "destructive", title: "Sincronización pendiente", description: "La importación quedó aplicada localmente, pero no fue posible sincronizar los materiales con la base de datos." });
          });
      } catch (err) {
        toast({ variant: "destructive", title: "No fue posible leer el archivo", description: "Verifica el formato del Excel e inténtalo nuevamente." });
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
      {/* Header con búsqueda - consistente */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar materiales por SKU o descripción..." 
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
              onClick={() => { setEditingMaterial({ isActive: true, uoms: [] }); setIsDialogOpen(true); }} 
              className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
            >
              <PlusCircle className="size-4" /> Añadir material
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de materiales - mejorada */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Código</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Propietario</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <Package2 className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay materiales registrados</p>
                      <p className="text-xs text-slate-400 mt-1">Haz clic en "Añadir material" para crear uno nuevo</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(m => {
                  const owner = owners.find(o => o.id === m.ownerId);
                  return (
                    <TableRow key={m.id} className={cn("group hover:bg-slate-50/50 transition-colors border-b border-slate-50", !m.isActive && "opacity-60")}>
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-primary">{m.code}</span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{m.productType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs font-semibold text-slate-700">{m.description}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-600">{owner?.name || 'Sin asignar'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch 
                            checked={m.isActive} 
                            onCheckedChange={() => toggleStatus(m)} 
                          />
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                            m.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                          )}>
                            {m.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all duration-200" 
                          onClick={() => { setEditingMaterial(m); setIsDialogOpen(true); }}
                        >
                          <Pencil className="size-3.5" />
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

      {/* Paginación */}
      {filtered.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
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
      )}

      {/* Modal de formulario - consistente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
          <DialogHeader className="p-6 pb-2 shrink-0 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                <Package2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                  {editingMaterial?.id ? 'Editar' : 'Nuevo'} material
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestión técnica y configuración logística de SKUs
                </DialogDescription>
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

      {/* Modal de importación - con modal de propietario */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 bg-white shadow-xl border border-slate-100 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">Importación masiva</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Actualiza el catálogo maestro cargando un archivo Excel
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
              <p className="text-[10px] text-slate-400 font-medium">Todos los productos se vincularán a este propietario</p>
            </div>

            {/* Información de columnas */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
              <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-primary">Columnas requeridas</span>
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed mt-1">
                  Sku, Descripcion, Tipo, NIT_Cliente, Embalaje, Unidad_Primaria, Unidad_Secundaria, EAN13, EAN14
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div {...getRootProps()} className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              file ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:border-primary/50"
            )}>
              <input {...getInputProps()} />
              <div className="space-y-2">
                <UploadCloud className="size-8 mx-auto text-slate-400" />
                <p className="font-semibold text-sm text-slate-700">{file ? file.name : "Arrastra o haz clic para subir"}</p>
                <p className="text-[10px] text-slate-400 font-medium">Soporta .xlsx</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-6 bg-slate-50 border-t gap-3">
            <Button 
              variant="ghost" 
              onClick={() => { setIsImportOpen(false); setFile(null); }} 
             className="dialog-btn-secondary"><X className="size-4" /> Cancelar
            </Button>
            <Button 
              onClick={handleImportExcel} 
              disabled={!file || isLoading || !importOwnerId} 
              className="rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition-all duration-200"
            >
              {isLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : <CheckCircle2 className="size-4 mr-2" />} 
              Procesar materiales
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

export default MaterialsPanel;