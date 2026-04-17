"use client";

import React, { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2,
  Store as StoreIcon,
  X,
  FileText,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { OrderGroup } from "@/lib/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface OrderViewModalProps {
  orderGroup: OrderGroup | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MODAL DE CONSULTA DE PEDIDO (INFORMATIVO)
 * Diseño mejorado - consistente con los estilos del sistema
 */
const OrderViewModal: React.FC<OrderViewModalProps> = ({ 
  orderGroup, 
  isOpen, 
  onClose 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (!orderGroup) return null;

  const totalItems = orderGroup.items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    return orderGroup.items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [orderGroup.items, currentPage, itemsPerPage]);

  const verifiedTotal = orderGroup.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);
  const requestedTotal = orderGroup.items.reduce((acc, i) => acc + i.quantity, 0);
  
  const progressPercentage = requestedTotal > 0 ? (verifiedTotal / requestedTotal) * 100 : 0;

  // Color de estado
  const getStatusColor = () => {
    if (orderGroup.isFinalized) return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (orderGroup.status === 'partial') return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-red-50 text-red-700 border-red-100";
  };

  const getStatusIcon = () => {
    if (orderGroup.isFinalized) return <CheckCircle2 className="size-3.5" />;
    if (orderGroup.status === 'partial') return <Clock className="size-3.5" />;
    return <AlertCircle className="size-3.5" />;
  };

  const getStatusText = () => {
    if (orderGroup.isFinalized) return "Finalizado";
    if (orderGroup.status === 'partial') return "Parcial";
    return "Pendiente";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[92vh] w-[min(100vw-1rem,72rem)] max-w-[72rem] flex-col overflow-y-auto rounded-2xl border border-slate-100 bg-white p-0 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        
        {/* Header - consistente con OrdersPanel */}
        <DialogHeader className="shrink-0 space-y-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-br from-[#1d57b7]/10 to-[#3b82f6]/10 flex items-center justify-center text-primary">
                  <FileText className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                    Detalle del Pedido
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-semibold text-slate-500">{orderGroup.id}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-400">#{orderGroup.orderNumber}</span>
                  </div>
                </div>
              </div>
              
              {/* Info de cliente y tienda - estilo consistente */}
              <div className="flex flex-col gap-4 pl-1 sm:flex-row sm:items-center sm:gap-6">
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
                
                <div className="hidden h-7 w-px bg-slate-200 sm:block" />
                
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                    <StoreIcon className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Punto de venta</p>
                    <p className="max-w-[260px] truncate text-xs font-bold text-slate-700">{orderGroup.storeName}</p>
                    <p className="text-[9px] font-mono text-slate-400">Cód: {orderGroup.storeCode}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de estadísticas - estilo consistente con las cards */}
            <div className="grid shrink-0 grid-cols-3 gap-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 xl:min-w-[270px]">
              <div className="text-center px-3">
                <div className="px-3 py-3">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Cajas</p>
                  <p className="text-xl font-bold text-primary">{orderGroup.totalBoxes}</p>
                </div>
              </div>
              <div className="border-l border-slate-200 text-center px-3">
                <div className="px-3 py-3">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Unidades</p>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-bold text-emerald-600">{verifiedTotal}</span>
                    <span className="text-xs font-semibold text-slate-300">/{requestedTotal}</span>
                  </div>
                </div>
              </div>
              <div className="border-l border-slate-200 text-center px-3">
                <div className="px-3 py-3">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Estado</p>
                  <div className="mt-1 flex justify-center">
                    <Badge className={cn("text-[9px] font-bold px-2.5 py-0.5 rounded-full gap-1 border", getStatusColor())}>
                      {getStatusIcon()}
                      <span>{getStatusText()}</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Barra de progreso - consistente con la de OrdersPanel */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Progreso de certificación</span>
              <span className="text-[11px] font-bold text-primary">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#1d57b7] to-[#3b82f6] rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo del Modal - Tabla consistente con OrdersPanel */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {/* Tabla de items */}
          <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white flex flex-col flex-1">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="min-w-[940px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="pl-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU / Código</TableHead>
                      <TableHead className="py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción</TableHead>
                      <TableHead className="py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lote</TableHead>
                      <TableHead className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unid. Solicitadas</TableHead>
                      <TableHead className="py-3 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Unid. Certificadas</TableHead>
                      <TableHead className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cajas Solicitadas</TableHead>
                      <TableHead className="py-3 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cajas Certificadas</TableHead>
                      <TableHead className="pr-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item, idx) => {
                      const factor = item.boxFactor || 1;
                      const reqBoxesRaw = item.quantity / factor;
                      const reqBoxesDisplay = reqBoxesRaw % 1 === 0 ? reqBoxesRaw.toString() : reqBoxesRaw.toFixed(3);
                      const certBoxes = Math.ceil(item.verifiedQuantity / factor);
                      
                      const getItemStatusColor = () => {
                        if (item.status === 'verified') return "bg-emerald-50 text-emerald-700 border-emerald-100";
                        if (item.status === 'partial') return "bg-amber-50 text-amber-700 border-amber-100";
                        return "bg-red-50 text-red-700 border-red-100";
                      };
                      
                      const getItemStatusText = () => {
                        if (item.status === 'verified') return "Certificado";
                        if (item.status === 'partial') return "Parcial";
                        return "Pendiente";
                      };
                      
                      return (
                        <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                          <TableCell className="pl-5 py-3">
                            <span className="font-mono text-[11px] font-bold text-primary">{item.productCode}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-[11px] font-medium text-slate-600 truncate max-w-[200px]">{item.description}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-mono text-[10px] font-semibold text-slate-400">{item.batch || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="text-[12px] font-semibold text-slate-500">{item.quantity}</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="text-[12px] font-bold text-emerald-600">{item.verifiedQuantity}</span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Layers className="size-3 text-slate-400" />
                              <span className="text-[11px] font-semibold text-slate-500">{reqBoxesDisplay}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="size-3 text-emerald-500" />
                              <span className="text-[11px] font-bold text-emerald-600">{certBoxes}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-5 py-3 text-right">
                            <Badge className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full border", getItemStatusColor())}>
                              {getItemStatusText()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Paginación - consistente con OrdersPanel */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden shrink-0">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={totalItems} 
                pageSize={itemsPerPage} 
                onPageSizeChange={setItemsPerPage} 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </CardContent>
          </Card>
          
          {/* Botón cerrar - consistente con los botones del sistema */}
          <div className="mt-1 flex shrink-0 items-center justify-end">
            <Button 
              onClick={onClose} 
              className="dialog-btn-secondary"
            >
              <X className="size-3.5" /> Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderViewModal;