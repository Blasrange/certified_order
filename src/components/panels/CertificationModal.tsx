"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ScanBarcode, 
  PauseCircle, 
  ClipboardList, 
  CheckCircle2,
  Building2,
  Store as StoreIcon,
  Package,
  Settings2,
  Box,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  ArrowRightCircle,
  Info,
  Zap,
} from "lucide-react";
import type { OrderGroup, Material, OrderBox, OrderItem } from "@/lib/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockMaterials } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

interface CertificationModalProps {
  orderGroup: OrderGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: OrderGroup) => void;
}

interface GroupedSKUItem {
  productCode: string;
  description: string;
  totalQuantity: number;
  totalVerified: number;
  status: 'pending' | 'verified' | 'partial' | 'cancelled';
  lots: OrderItem[];
}

const CertificationModal: React.FC<CertificationModalProps> = ({ 
  orderGroup, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activeBoxIndex, setActiveBoxIndex] = useState(1);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const isFinalized = orderGroup?.isFinalized || false;

  useEffect(() => {
    if (isOpen && orderGroup?.id) {
      setIsManualMode(false);
      setIsAutoMode(true);
      
      setCurrentPage(1);
      setBarcodeInput("");
      if (orderGroup.boxes && orderGroup.boxes.length > 0) {
        const lastBox = Math.max(...orderGroup.boxes.map(b => b.boxNumber));
        setActiveBoxIndex(lastBox);
      } else {
        setActiveBoxIndex(1);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, orderGroup?.id]);

  const handleToggleManual = (val: boolean) => {
    setIsManualMode(val);
    if (!val) setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleAuto = (val: boolean) => {
    setIsAutoMode(val);
  };

  const groupedItems = useMemo(() => {
    if (!orderGroup) return [];
    
    const groups: Record<string, GroupedSKUItem> = {};
    
    orderGroup.items.forEach(item => {
      if (!groups[item.productCode]) {
        groups[item.productCode] = {
          productCode: item.productCode,
          description: item.description,
          totalQuantity: 0,
          totalVerified: 0,
          status: 'pending',
          lots: []
        };
      }
      
      const g = groups[item.productCode];
      g.totalQuantity += item.quantity;
      g.totalVerified += (item.verifiedQuantity || 0);
      g.lots.push(item);
    });

    return Object.values(groups).map(g => {
      if (g.totalVerified >= g.totalQuantity) g.status = 'verified';
      else if (g.totalVerified > 0) g.status = 'partial';
      else g.status = 'pending';
      return g;
    });
  }, [orderGroup]);

  if (!orderGroup) return null;

  const distributeSequential = (boxes: OrderBox[]): OrderItem[] => {
    const inventory = new Map<string, number>();
    boxes.forEach(b => {
      b.items.forEach(bi => {
        const key = `${bi.productCode}_${bi.batch || ''}`;
        inventory.set(key, (inventory.get(key) || 0) + bi.quantity);
      });
    });

    return orderGroup.items.map(it => {
      const key = `${it.productCode}_${it.batch || ''}`;
      const available = inventory.get(key) || 0;
      const taken = Math.min(available, it.quantity);
      inventory.set(key, available - taken);
      
      return {
        ...it,
        verifiedQuantity: taken,
        status: taken >= it.quantity ? 'verified' : taken > 0 ? 'partial' : 'pending'
      };
    });
  };

  const handleProcessBarcode = (code: string) => {
    if (!code.trim() || isFinalized) return;

    const materialsSource: Material[] = appData.materials.length > 0 ? appData.materials : mockMaterials;

    const material = materialsSource.find(m => 
      m.code === code || m.barcode13 === code || m.barcode14 === code || 
      (m.uoms && m.uoms.some(u => u.eanValue === code))
    );
    
    if (!material) {
      toast({ 
        variant: "destructive", 
        title: "Código no reconocido", 
        description: `El código ${code} no existe en la base maestra de materiales.` 
      });
      setBarcodeInput("");
      return;
    }

    const group = groupedItems.find(g => g.productCode === material.code);
    
    if (!group) {
      toast({ 
        variant: "destructive", 
        title: "SKU no solicitado", 
        description: `El material ${material.code} no forma parte de este pedido.` 
      });
      setBarcodeInput("");
      return;
    }

    if (group.totalVerified >= group.totalQuantity) {
      toast({ 
        variant: "destructive", 
        title: "Línea completa", 
        description: `El SKU ${material.code} ya alcanzó el 100% de lo solicitado.` 
      });
      setBarcodeInput("");
      return;
    }

    const availableLot = group.lots.find(l => l.verifiedQuantity < l.quantity);
    if (!availableLot) return;

    let increment = 1;
    let isFullCase = false;
    const uom = material.uoms?.find(u => u.eanValue === code);
    
    if (uom) {
      increment = uom.numerator;
      isFullCase = uom.eanType === 'EAN14';
    } else if (material.barcode14 === code) {
      increment = material.embalaje || availableLot.boxFactor || 1;
      isFullCase = true;
    }

    if (group.totalVerified + increment > group.totalQuantity) {
      const diff = group.totalQuantity - group.totalVerified;
      toast({ 
        variant: "destructive", 
        title: "Excede solicitado", 
        description: `El SKU ${material.code} solo admite ${diff} unidades más para completar el pedido.` 
      });
      setBarcodeInput("");
      return;
    }

    let targetBox = activeBoxIndex;
    
    if (isAutoMode) {
      const currentBoxContent = orderGroup.boxes?.find(b => b.boxNumber === targetBox);
      const isCurrentBoxOccupied = currentBoxContent && currentBoxContent.items.length > 0;

      if (isFullCase && isCurrentBoxOccupied) {
        targetBox = Math.max(...(orderGroup.boxes?.map(b => b.boxNumber) || [0]), activeBoxIndex) + 1;
      } 
      else if (!isFullCase && isCurrentBoxOccupied) {
        const containsFullCase = currentBoxContent.items.some(bi => {
          const matInfo = materialsSource.find(m => m.code === bi.productCode);
          return bi.quantity >= (matInfo?.embalaje || 9999);
        });
        if (containsFullCase) {
          targetBox = Math.max(...(orderGroup.boxes?.map(b => b.boxNumber) || [0]), activeBoxIndex) + 1;
        }
      }

      if (targetBox !== activeBoxIndex) {
        setActiveBoxIndex(targetBox);
      }
    }

    const targetBoxData = orderGroup.boxes?.find(b => b.boxNumber === targetBox);
    const currentQtyInBox = targetBoxData?.items.find(bi => 
      bi.productCode === availableLot.productCode && bi.batch === availableLot.batch
    )?.quantity || 0;

    updateLotQuantity(availableLot.productCode, availableLot.batch, currentQtyInBox + increment, targetBox);
    
    if (isAutoMode && isFullCase) {
      setActiveBoxIndex(targetBox + 1);
      toast({ title: `Empaque #${targetBox} completado`, description: `Se habilitó automáticamente el empaque #${targetBox + 1} para continuar la certificación.` });
    }

    setBarcodeInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const updateLotQuantity = (productCode: string, batch: string, newQtyInBox: number, targetBoxNumber?: number) => {
    if (!orderGroup || isFinalized) return;

    const boxToUse = targetBoxNumber || activeBoxIndex;
    const updatedBoxes = orderGroup.boxes ? JSON.parse(JSON.stringify(orderGroup.boxes)) : [];
    let boxIdx = updatedBoxes.findIndex((b: any) => b.boxNumber === boxToUse);
    
    if (boxIdx === -1) {
      updatedBoxes.push({ boxNumber: boxToUse, items: [] });
      boxIdx = updatedBoxes.length - 1;
    }

    const box = updatedBoxes[boxIdx];
    const boxItemIdx = box.items.findIndex((i: any) => i.productCode === productCode && i.batch === batch);

    if (boxItemIdx === -1) {
      if (newQtyInBox > 0) {
        const materialDesc = groupedItems.find(g => g.productCode === productCode)?.description || "...";
        box.items.push({ productCode, description: materialDesc, quantity: newQtyInBox, batch });
      }
    } else {
      if (newQtyInBox > 0) box.items[boxItemIdx].quantity = newQtyInBox;
      else box.items.splice(boxItemIdx, 1);
    }

    const cleanBoxes = updatedBoxes.filter((b: any) => b.items.length > 0);
    const redistributedItems = distributeSequential(cleanBoxes);

    const totalVerifiedGlobal = redistributedItems.reduce((acc, i) => acc + (Number(i.verifiedQuantity) || 0), 0);
    const totalRequestedGlobal = redistributedItems.reduce((acc, i) => acc + i.quantity, 0);
    const newStatus = totalVerifiedGlobal >= totalRequestedGlobal ? 'verified' : totalVerifiedGlobal > 0 ? 'partial' : 'pending';

    onSave({
      ...orderGroup,
      items: redistributedItems,
      boxes: cleanBoxes,
      status: newStatus
    });
  };

  const updateGroupQuantityManual = (productCode: string, newTotalInBox: number) => {
    const group = groupedItems.find(g => g.productCode === productCode);
    if (!group) return;

    const otherBoxesTotal = (orderGroup.boxes || [])
      .filter(b => b.boxNumber !== activeBoxIndex)
      .reduce((acc, b) => {
        const skuItemsInOther = b.items.filter(bi => bi.productCode === productCode);
        return acc + skuItemsInOther.reduce((sum, item) => sum + item.quantity, 0);
      }, 0);

    const totalSkuRequested = group.totalQuantity;
    const maxAllowedInThisBox = totalSkuRequested - otherBoxesTotal;

    let remainingToAssign = Math.max(0, newTotalInBox);
    if (remainingToAssign > maxAllowedInThisBox) {
      toast({ 
        variant: "destructive", 
        title: "Tope SKU alcanzado", 
        description: `El SKU ${productCode} solo admite ${maxAllowedInThisBox} unidades adicionales para no exceder lo solicitado.` 
      });
      remainingToAssign = maxAllowedInThisBox;
    }

    const updatedBoxes = orderGroup.boxes ? JSON.parse(JSON.stringify(orderGroup.boxes)) : [];
    let boxIdx = updatedBoxes.findIndex((b: any) => b.boxNumber === activeBoxIndex);
    
    if (boxIdx === -1) {
      updatedBoxes.push({ boxNumber: activeBoxIndex, items: [] });
      boxIdx = updatedBoxes.length - 1;
    }

    updatedBoxes[boxIdx].items = updatedBoxes[boxIdx].items.filter((bi: any) => bi.productCode !== productCode);

    const batchReqs = new Map<string, number>();
    group.lots.forEach(l => {
      const key = l.batch || '';
      batchReqs.set(key, (batchReqs.get(key) || 0) + l.quantity);
    });

    const batchUsedInOthers = new Map<string, number>();
    (orderGroup.boxes || [])
      .filter(b => b.boxNumber !== activeBoxIndex)
      .forEach(b => {
        b.items.filter(bi => bi.productCode === productCode).forEach(bi => {
          const key = bi.batch || '';
          batchUsedInOthers.set(key, (batchUsedInOthers.get(key) || 0) + bi.quantity);
        });
      });

    for (const [batch, totalRequestedForBatch] of batchReqs.entries()) {
      if (remainingToAssign <= 0) break;

      const used = batchUsedInOthers.get(batch) || 0;
      const batchAvailable = Math.max(0, totalRequestedForBatch - used);
      const toPut = Math.min(remainingToAssign, batchAvailable);

      if (toPut > 0) {
        updatedBoxes[boxIdx].items.push({
          productCode: group.productCode,
          description: group.description,
          quantity: toPut,
          batch: batch
        });
        remainingToAssign -= toPut;
      }
    }

    const cleanBoxes = updatedBoxes.filter((b: any) => b.items.length > 0);
    const redistributedItems = distributeSequential(cleanBoxes);

    const totalVerifiedGlobal = redistributedItems.reduce((acc, i) => acc + (Number(i.verifiedQuantity) || 0), 0);
    const totalRequestedGlobal = redistributedItems.reduce((acc, i) => acc + i.quantity, 0);
    const newStatus = totalVerifiedGlobal >= totalRequestedGlobal ? 'verified' : totalVerifiedGlobal > 0 ? 'partial' : 'pending';

    onSave({
      ...orderGroup,
      items: redistributedItems,
      boxes: cleanBoxes,
      status: newStatus
    });
  };

  const handleRemoveLotFromBox = (boxNumber: number, productCode: string, batch?: string) => {
    const prevActive = activeBoxIndex;
    setActiveBoxIndex(boxNumber);
    updateLotQuantity(productCode, batch || "", 0, boxNumber);
    setActiveBoxIndex(prevActive);
    toast({ title: "Producto retirado del empaque", description: `El SKU ${productCode} fue retirado correctamente de la caja ${boxNumber}.` });
  };

  const handleFinishStatus = (status: 'verified' | 'partial' | 'cancelled') => {
    if (!orderGroup) return;
    onSave({ 
      ...orderGroup, 
      status, 
      isFinalized: true, 
      finalizedAt: new Date().toISOString(), 
      totalBoxes: orderGroup.boxes?.length || 1 
    });
    onClose();
    toast({ title: "Certificación finalizada", description: "La certificación fue cerrada y su estado quedó actualizado correctamente." });
  };

  const totalGroups = groupedItems.length;
  const totalPages = Math.ceil(totalGroups / itemsPerPage);
  const paginatedGroups = useMemo(() => groupedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [groupedItems, currentPage, itemsPerPage]);

  const verifiedTotal = orderGroup.items.reduce((acc, i) => acc + (Number(i.verifiedQuantity) || 0), 0);
  const requestedTotal = orderGroup.items.reduce((acc, i) => acc + i.quantity, 0);
  const progressPercent = requestedTotal > 0 ? (verifiedTotal / requestedTotal) * 100 : 0;

  const currentBox = orderGroup.boxes?.find(b => b.boxNumber === activeBoxIndex);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1500px] h-[92vh] flex flex-col p-0 overflow-hidden border border-slate-100 shadow-2xl rounded-2xl bg-white">
        
        {/* Header - consistente con OrderViewModal y OrdersPanel */}
        <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-100 shrink-0 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#1d57b7]/10 to-[#3b82f6]/10 flex items-center justify-center text-primary shadow-sm">
                  <ScanBarcode className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                    Certificación {orderGroup.id}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-semibold border-primary/20 bg-primary/5 text-primary rounded-full px-2.5 py-0.5">
                      Pedido #{orderGroup.orderNumber}
                    </Badge>
                    <Badge className={cn("text-[8px] font-bold px-2.5 py-0.5 rounded-full border", 
                      (orderGroup.status === 'pending' || orderGroup.status === 'cancelled') ? "bg-red-50 text-red-600 border-red-100" : 
                      orderGroup.status === 'partial' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                      "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                      {orderGroup.isFinalized ? 'Finalizado' : orderGroup.status === 'partial' ? 'Parcial' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200" />

              {/* Navegación de empaques */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                    onClick={() => setActiveBoxIndex(Math.max(1, activeBoxIndex - 1))}
                  >
                    <ChevronLeft className="size-3.5"/>
                  </Button>
                  <Badge className="bg-primary px-3 h-7 rounded-lg text-[10px] font-bold shadow-sm shadow-primary/20">
                    Empaque #{activeBoxIndex}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                    onClick={() => setActiveBoxIndex(activeBoxIndex + 1)}
                  >
                    <ChevronRight className="size-3.5"/>
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 ml-0.5"
                          onClick={() => {
                            const maxBox = orderGroup.boxes?.length ? Math.max(...orderGroup.boxes.map(b => b.boxNumber)) : 0;
                            setActiveBoxIndex(maxBox + 1);
                          }}
                        >
                          <Plus className="size-3.5"/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white border border-slate-100 shadow-lg rounded-xl text-[10px] font-semibold">
                        Nuevo empaque
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Switches de modo */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Manual</span>
                    <Switch checked={isManualMode} onCheckedChange={handleToggleManual} className="scale-75" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                    <Zap className={cn("size-2.5", isAutoMode ? "text-primary" : "text-slate-300")} />
                    <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Auto</span>
                    <Switch checked={isAutoMode} onCheckedChange={handleToggleAuto} className="scale-75" />
                  </div>
                </div>

                {/* Input de escaneo */}
                {!isManualMode && !isFinalized && (
                  <div className="relative">
                    <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input 
                      ref={inputRef} 
                      value={barcodeInput} 
                      onChange={(e) => setBarcodeInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleProcessBarcode(barcodeInput)} 
                      placeholder="Escanear producto en empaque activo..." 
                      className="h-10 w-80 rounded-xl pl-10 pr-4 border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Panel de estadísticas compacto */}
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-center px-3">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Empaques</p>
                <p className="text-xl font-bold text-primary">{(orderGroup.boxes?.length || 0)}</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center px-3">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Unidades</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-bold text-emerald-600">{verifiedTotal}</span>
                  <span className="text-xs font-semibold text-slate-300">/{requestedTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info de cliente y tienda */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                  <Building2 className="size-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</p>
                  <p className="text-xs font-bold text-slate-700">{orderGroup.customerName}</p>
                  <p className="text-[9px] font-mono text-slate-400">NIT: {orderGroup.nit}</p>
                </div>
              </div>
              <div className="w-px h-7 bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                  <StoreIcon className="size-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Punto de venta</p>
                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{orderGroup.storeName}</p>
                  <p className="text-[9px] font-mono text-slate-400">Cód: {orderGroup.storeCode}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Progreso</span>
              <Badge className="bg-primary text-white font-bold text-[10px] rounded-full px-2.5 py-0.5">
                {Math.round(progressPercent)}%
              </Badge>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="pt-1">
            <Progress value={progressPercent} className="h-1.5 rounded-full bg-slate-100" />
          </div>
        </DialogHeader>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-5">
          <div className="grid grid-cols-12 gap-5 flex-1 overflow-hidden">
            
            {/* Columna izquierda - Tabla de SKUs */}
            <div className="col-span-9 flex flex-col overflow-hidden">
              <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col flex-1">
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1">
                    <Table>
                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                        <TableRow className="border-b border-slate-100">
                          <TableHead className="pl-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU / Código</TableHead>
                          <TableHead className="py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                          <TableHead className="py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lote</TableHead>
                          <TableHead className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24">Solicitado</TableHead>
                          <TableHead className="py-3 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider w-32">Certificado</TableHead>
                          <TableHead className="pr-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedGroups.map((group, idx) => {
                          const qtyInThisBox = currentBox?.items
                            .filter(bi => bi.productCode === group.productCode)
                            .reduce((acc, bi) => acc + bi.quantity, 0) || 0;
                          
                          const isFull = group.totalVerified >= group.totalQuantity;
                          const hasMultipleLots = group.lots.length > 1;

                          return (
                            <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                              <TableCell className="pl-5 py-3">
                                <span className="font-mono text-[11px] font-bold text-primary">{group.productCode}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <p className="text-[11px] font-medium text-slate-600 truncate max-w-[200px]">{group.description}</p>
                              </TableCell>
                              <TableCell className="py-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 cursor-help">
                                        <span className={cn("text-[10px] font-mono font-semibold", hasMultipleLots ? "text-amber-600" : "text-slate-400")}>
                                          {hasMultipleLots ? "Múltiple lote" : (group.lots[0]?.batch || 'N/A')}
                                        </span>
                                        {hasMultipleLots && <Info className="size-3 text-amber-400" />}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-white border border-slate-100 shadow-lg p-3 rounded-xl">
                                      <div className="space-y-2">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1.5 mb-1">Desglose de lotes</p>
                                        {group.lots.map((lot, i) => (
                                          <div key={i} className="flex items-center justify-between gap-4">
                                            <span className="text-[10px] font-mono font-semibold text-slate-600">{lot.batch || 'N/A'}</span>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-[9px] font-bold bg-slate-50 rounded-full">
                                                {lot.verifiedQuantity} / {lot.quantity}
                                              </Badge>
                                              {lot.verifiedQuantity >= lot.quantity && <CheckCircle2 className="size-3 text-emerald-500" />}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                <span className="text-[11px] font-semibold text-slate-500">{group.totalQuantity}</span>
                              </TableCell>
                              <TableCell className="py-3 text-center">
                                {isManualMode && !isFinalized ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Input 
                                      type="number" 
                                      value={qtyInThisBox} 
                                      onChange={(e) => updateGroupQuantityManual(group.productCode, Number(e.target.value))} 
                                      disabled={isFull}
                                      className={cn(
                                        "w-20 h-8 text-center font-bold rounded-lg border-primary/30 bg-primary/5 focus:ring-primary/20 text-xs",
                                        isFull && "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200"
                                      )} 
                                    />
                                    <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Total: {group.totalVerified}
                                    </span>
                                  </div>
                                ) : (
                                  <span className={cn("text-[11px] font-bold", 
                                    group.totalVerified >= group.totalQuantity ? "text-emerald-600" : 
                                    group.totalVerified > 0 ? "text-amber-600" : "text-slate-300"
                                  )}>
                                    {group.totalVerified}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="pr-5 py-3 text-right">
                                <Badge className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full border", 
                                  group.status === 'verified' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                                  group.status === 'partial' ? "bg-amber-50 text-amber-700 border-amber-100" : 
                                  "bg-red-50 text-red-700 border-red-100"
                                )}>
                                  {group.status === 'verified' ? 'Certificado' : group.status === 'partial' ? 'Parcial' : 'Pendiente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Paginación */}
              <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4 shrink-0">
                <CardContent className="p-0">
                  <DataTablePagination 
                    totalRows={totalGroups} 
                    pageSize={itemsPerPage} 
                    onPageSizeChange={setItemsPerPage} 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha - Detalle de empaques */}
            <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
              <Card className="border border-slate-100 shadow-sm rounded-xl bg-white flex flex-col flex-1 overflow-hidden">
                <CardHeader className="p-4 pb-3 shrink-0 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-primary">
                        <Box className="size-4" />
                      </div>
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Detalle Empaque
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold bg-slate-50 rounded-full">
                      {(orderGroup.boxes?.length || 0)} empaques
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {(!orderGroup.boxes || orderGroup.boxes.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-40 py-12">
                        <ScanBarcode className="size-10 text-slate-300 mb-3" />
                        <p className="text-[10px] font-semibold uppercase text-center text-slate-400">
                          Sin empaques.<br/>Empieza a certificar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...orderGroup.boxes].sort((a,b) => a.boxNumber - b.boxNumber).map((box, i) => (
                          <div 
                            key={i} 
                            onClick={() => setActiveBoxIndex(box.boxNumber)}
                            className={cn(
                              "rounded-xl border transition-all cursor-pointer",
                              activeBoxIndex === box.boxNumber ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-slate-100 hover:border-primary/30"
                            )}
                          >
                            <div className="p-3 border-b border-inherit flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] font-bold uppercase", 
                                  activeBoxIndex === box.boxNumber ? "text-primary" : "text-slate-500"
                                )}>
                                  Empaque #{box.boxNumber}
                                </span>
                                {activeBoxIndex === box.boxNumber && (
                                  <Badge className="bg-primary text-[8px] font-bold h-4 px-1.5 rounded-full uppercase">
                                    Activo
                                  </Badge>
                                )}
                              </div>
                              <ArrowRightCircle className={cn("size-3.5 transition-transform", 
                                activeBoxIndex === box.boxNumber ? "text-primary" : "text-slate-200"
                              )} />
                            </div>
                            <div className="p-3 space-y-2">
                              {box.items.map((bi, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 group/item">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[10px] font-bold text-slate-700 truncate">{bi.productCode}</span>
                                    <span className="text-[8px] font-mono text-slate-400 truncate">Lote: {bi.batch || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 h-5 rounded-full">
                                      {bi.quantity} U
                                    </Badge>
                                    {!isFinalized && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="size-6 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveLotFromBox(box.boxNumber, bi.productCode, bi.batch); }}
                                      >
                                        <X className="size-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end items-center mt-2 gap-4 shrink-0">
            {!isFinalized ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-primary rounded-xl h-10 px-6 font-semibold">
                    <Settings2 className="size-4" />
                    Acciones
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-slate-100 shadow-lg bg-white">
                  <DropdownMenuItem 
                    onClick={() => { toast({ title: "Avance guardado temporalmente", description: "La certificación quedó pausada con la información registrada hasta este momento." }); onClose(); }} 
                    className="rounded-lg h-10 gap-2.5 text-sm font-medium cursor-pointer text-slate-600"
                  >
                    <PauseCircle className="size-4" /> Pausar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={() => handleFinishStatus('partial')} 
                    className="rounded-lg h-10 gap-2.5 text-sm font-medium cursor-pointer text-amber-600 focus:bg-amber-50"
                  >
                    <ClipboardList className="size-4" /> Finalizar Parcial
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleFinishStatus('verified')} 
                    className="rounded-lg h-10 gap-2.5 text-sm font-medium cursor-pointer text-emerald-600 focus:bg-emerald-50"
                  >
                    <CheckCircle2 className="size-4" /> Finalizar 100%
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={onClose} 
                className="dialog-btn-secondary"
              >
                <X className="size-3.5" /> Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificationModal;