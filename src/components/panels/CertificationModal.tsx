
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
      const savedManualMode = localStorage.getItem(`isManualMode_${orderGroup.id}`);
      const savedAutoMode = localStorage.getItem(`isAutoMode_${orderGroup.id}`);
      
      setIsManualMode(savedManualMode === 'true');
      setIsAutoMode(savedAutoMode !== 'false');
      
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
    if (orderGroup?.id) {
      localStorage.setItem(`isManualMode_${orderGroup.id}`, String(val));
    }
    if (!val) setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleAuto = (val: boolean) => {
    setIsAutoMode(val);
    if (orderGroup?.id) {
      localStorage.setItem(`isAutoMode_${orderGroup.id}`, String(val));
    }
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

    const savedMaterials = typeof window !== 'undefined' ? localStorage.getItem('materials') : null;
    const materialsSource: Material[] = savedMaterials ? JSON.parse(savedMaterials) : mockMaterials;

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
      toast({ title: `Empaque #${targetBox} listo. Preparando #${targetBox + 1}` });
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
    toast({ title: "Producto retirado del empaque" });
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
    toast({ title: "Certificación cerrada" });
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
      <DialogContent className="max-w-[95vw] w-[1500px] h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-slate-50 rounded-[2.5rem]">
        <DialogHeader className="p-8 pb-6 bg-white border-b relative shrink-0 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <ScanBarcode className="size-7" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-2xl font-black tracking-tighter text-slate-800">
                    Certificación {orderGroup.id}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary">Pedido #{orderGroup.orderNumber}</Badge>
                    <Badge className={cn("text-[8px] font-black px-2 py-0.5 uppercase", 
                      (orderGroup.status === 'pending' || orderGroup.status === 'cancelled') ? "bg-red-50 text-red-600" : 
                      orderGroup.status === 'partial' ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600")}>
                      {orderGroup.isFinalized ? 'Finalizado' : orderGroup.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-slate-100 mx-2" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-full border shadow-inner px-3 h-11">
                  <span className="text-[8px] font-black uppercase text-slate-400 mr-1 pl-1">Ref:</span>
                  <Button variant="ghost" size="icon" className="size-7 rounded-full bg-white border shadow-sm" onClick={() => setActiveBoxIndex(Math.max(1, activeBoxIndex - 1))}><ChevronLeft className="size-3.5"/></Button>
                  <Badge className="bg-primary px-3 h-7 rounded-full text-[10px] font-black uppercase shadow-md shadow-primary/20">Empaque #{activeBoxIndex}</Badge>
                  <Button variant="ghost" size="icon" className="size-7 rounded-full bg-white border shadow-sm" onClick={() => setActiveBoxIndex(activeBoxIndex + 1)}><ChevronRight className="size-3.5"/></Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 rounded-full text-primary bg-white border shadow-sm hover:bg-primary/5 ml-0.5" onClick={() => {
                          const maxBox = orderGroup.boxes?.length ? Math.max(...orderGroup.boxes.map(b => b.boxNumber)) : 0;
                          setActiveBoxIndex(maxBox + 1);
                        }}>
                          <Plus className="size-3.5"/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-[10px] font-bold">Nuevo Empaque</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-3 h-5 bg-white rounded-full border border-slate-100 shadow-sm min-w-[100px]">
                    <span className="text-[7px] font-black uppercase text-slate-400">Manual</span>
                    <Switch checked={isManualMode} onCheckedChange={handleToggleManual} className="scale-[0.45]" />
                  </div>
                  <div className="flex items-center justify-between px-3 h-5 bg-white rounded-full border border-slate-100 shadow-sm min-w-[100px]">
                    <div className="flex items-center gap-1">
                      <Zap className={cn("size-2", isAutoMode ? "text-primary fill-primary" : "text-slate-300")} />
                      <span className="text-[7px] font-black uppercase text-slate-400">Auto</span>
                    </div>
                    <Switch checked={isAutoMode} onCheckedChange={handleToggleAuto} className="scale-[0.45]" />
                  </div>
                </div>

                {!isManualMode && !isFinalized && (
                  <div className="relative">
                    <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-primary opacity-50" />
                    <input 
                      ref={inputRef} 
                      value={barcodeInput} 
                      onChange={(e) => setBarcodeInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleProcessBarcode(barcodeInput)} 
                      placeholder="Escanear en empaque activo..." 
                      className="h-11 w-96 rounded-full pl-12 pr-4 border-primary/30 border bg-white font-bold text-xs text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center bg-slate-50/80 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex flex-col items-center pr-6 border-r border-slate-200">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TOTAL EMPAQUES</span>
                <span className="text-xl font-black text-primary">{(orderGroup.boxes?.length || 0)}</span>
              </div>
              <div className="flex flex-col items-center pl-6">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">UNIDADES</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">{verifiedTotal}</span>
                  <span className="text-[10px] font-bold text-slate-300">/ {requestedTotal}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex items-center gap-8 pl-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Building2 className="size-4" /></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Cliente</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{orderGroup.customerName}</span>
                    <Badge variant="outline" className="text-[8px] font-mono border-slate-200 text-slate-400 bg-slate-50 uppercase">NIT: {orderGroup.nit}</Badge>
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><StoreIcon className="size-4" /></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Punto de Entrega</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{orderGroup.storeName}</span>
                    <Badge variant="outline" className="text-[8px] font-mono border-slate-200 text-slate-400 bg-slate-50 uppercase">CÓD: {orderGroup.storeCode}</Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[9px] font-black text-primary uppercase">Progreso certificación</span>
              <Badge className="bg-primary text-white font-black text-[10px] rounded-lg">{Math.round(progressPercent)}%</Badge>
            </div>
          </div>
          <div className="pt-2"><Progress value={progressPercent} className="h-1.5 rounded-full bg-slate-100" /></div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-8 gap-6">
          <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
            <div className="col-span-9 flex flex-col overflow-hidden">
              <Card className="border border-muted/20 shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col flex-1">
                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1">
                    <Table>
                      <TableHeader className="bg-muted/5 h-12 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="pl-8 text-[10px] font-black text-slate-800 uppercase">Sku / Código</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-800 uppercase">Descripción Técnica</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-800 uppercase">Lote</TableHead>
                          <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase w-24">Solicitado</TableHead>
                          <TableHead className="text-center text-[10px] font-black text-primary uppercase w-32">Certificado</TableHead>
                          <TableHead className="pr-8 text-right text-[10px] font-black text-slate-800 uppercase">Estado</TableHead>
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
                            <TableRow key={idx} className="h-14 border-b transition-colors hover:bg-slate-50/50">
                              <TableCell className="pl-8 font-mono font-bold text-[10px] text-primary">{group.productCode}</TableCell>
                              <TableCell className="font-bold text-[10px] text-slate-600 truncate max-w-[220px] uppercase">{group.description}</TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 cursor-help group/lot">
                                        <span className={cn("text-[10px] font-mono font-bold uppercase", hasMultipleLots ? "text-amber-600" : "text-slate-400")}>
                                          {hasMultipleLots ? "Múltiple Lote" : (group.lots[0]?.batch || 'N/A')}
                                        </span>
                                        {hasMultipleLots && <Info className="size-3 text-amber-400" />}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-white border-none shadow-3xl p-4 rounded-2xl">
                                      <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Desglose de Lotes</p>
                                        <div className="space-y-2">
                                          {group.lots.map((lot, i) => (
                                            <div key={i} className="flex items-center justify-between gap-6">
                                              <span className="text-[10px] font-mono font-bold text-slate-600">{lot.batch || 'N/A'}</span>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black bg-slate-50">{lot.verifiedQuantity} / {lot.quantity}</Badge>
                                                {lot.verifiedQuantity >= lot.quantity && <CheckCircle2 className="size-3 text-emerald-500" />}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-center font-bold text-[11px] text-slate-400">{group.totalQuantity}</TableCell>
                              <TableCell className="text-center">
                                {isManualMode && !isFinalized ? (
                                  <div className="flex flex-col items-center gap-1 py-1">
                                    <Input 
                                      type="number" 
                                      value={qtyInThisBox} 
                                      onChange={(e) => updateGroupQuantityManual(group.productCode, Number(e.target.value))} 
                                      disabled={isFull}
                                      className={cn(
                                        "w-20 h-8 text-center font-black rounded-lg border-primary bg-primary/5 focus:ring-primary/20 text-xs",
                                        isFull && "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200"
                                      )} 
                                    />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">TOTAL: {group.totalVerified}</span>
                                  </div>
                                ) : (
                                  <span className={cn("text-[11px] font-black", group.totalVerified >= group.totalQuantity ? "text-primary" : group.totalVerified > 0 ? "text-amber-600" : "text-slate-300")}>
                                    {group.totalVerified}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="pr-8 text-right">
                                 <Badge variant="outline" className={cn("text-[8px] font-black h-4 border-none lowercase", group.status === 'verified' ? "bg-emerald-100 text-emerald-700" : group.status === 'partial' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{group.status}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4 shrink-0">
                <CardContent className="p-0">
                  <DataTablePagination totalRows={totalGroups} pageSize={itemsPerPage} onPageSizeChange={setItemsPerPage} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
              <Card className="border border-muted/20 shadow-sm rounded-[2.5rem] bg-white flex flex-col flex-1 overflow-hidden">
                <CardHeader className="p-6 pb-4 shrink-0 border-b bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><Box className="size-5" /></div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800">Detalle Empaque</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-white text-[10px] font-bold border-slate-200">{(orderGroup.boxes?.length || 0)} Empaques</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 p-6">
                    {(!orderGroup.boxes || orderGroup.boxes.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
                        <ScanBarcode className="size-12 mb-4 text-slate-400" />
                        <p className="text-[10px] font-black uppercase text-center text-slate-500">Sin empaques.<br/>Empieza a certificar.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {[...orderGroup.boxes].sort((a,b) => a.boxNumber - b.boxNumber).map((box, i) => (
                          <div 
                            key={i} 
                            onClick={() => setActiveBoxIndex(box.boxNumber)}
                            className={cn(
                              "rounded-[1.5rem] border transition-all cursor-pointer group",
                              activeBoxIndex === box.boxNumber ? "bg-primary/5 border-primary shadow-md" : "bg-white border-slate-100 hover:border-primary/30"
                            )}
                          >
                            <div className="p-4 border-b border-inherit flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-[10px] font-black uppercase", activeBoxIndex === box.boxNumber ? "text-primary" : "text-slate-400")}>Empaque #{box.boxNumber}</span>
                                {activeBoxIndex === box.boxNumber && <Badge className="bg-primary text-[8px] font-black h-4 px-1.5 uppercase">Activo</Badge>}
                              </div>
                              <ArrowRightCircle className={cn("size-4 transition-transform", activeBoxIndex === box.boxNumber ? "text-primary" : "text-slate-200 opacity-0 group-hover:opacity-100")} />
                            </div>
                            <div className="p-4 space-y-3">
                              {box.items.map((bi, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 group/item">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-700 truncate">{bi.productCode}</span>
                                    <span className="text-[8px] font-mono text-slate-400 truncate">Lote: {bi.batch}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black text-[9px] px-2 h-5 shrink-0">{bi.quantity} U</Badge>
                                    {!isFinalized && (
                                      <Button 
                                        variant="ghost" size="icon" 
                                        className="size-6 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all"
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
          
          <div className="flex justify-end items-center mt-2 gap-6 h-16 shrink-0">
             {!isFinalized ? (
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="size-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-110 transition-transform flex items-center justify-center p-0 border-none">
                        <Settings2 className="size-7" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 border-none shadow-3xl rounded-2xl p-2 bg-white">
                      <DropdownMenuItem onClick={() => { toast({ title: "Guardado temporal" }); onClose(); }} className="h-12 rounded-xl cursor-pointer gap-3 font-bold text-slate-600">
                        <PauseCircle className="size-5" /> Pausar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleFinishStatus('partial')} className="h-12 rounded-xl cursor-pointer gap-3 font-bold text-amber-600">
                        <ClipboardList className="size-5" /> Finalizar Parcial
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFinishStatus('verified')} className="h-12 rounded-xl cursor-pointer gap-3 font-bold text-emerald-600">
                        <CheckCircle2 className="size-5" /> Finalizar 100%
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
             ) : (
               <Button onClick={onClose} className="rounded-full bg-slate-800 hover:bg-slate-900 text-white font-black px-12 h-12 shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-[10px] gap-3">
                 <X className="size-4" /> CERRAR VISTA OPERATIVA
               </Button>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificationModal;
