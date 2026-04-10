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
 * Diseño unificado con el estándar de la plataforma (Tarjetas separadas).
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-slate-50 rounded-[2.5rem]">
        {/* Header con información de cliente y progreso */}
        <DialogHeader className="p-8 pb-6 bg-white border-b shrink-0">
          <div className="flex justify-between items-start gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <FileText className="size-8" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">
                    Consulta de Pedido {orderGroup.id}
                  </DialogTitle>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary px-3">Pedido #{orderGroup.orderNumber}</Badge>
                    <Badge className={cn("text-[9px] font-black px-3 py-1 uppercase", 
                      (orderGroup.status === 'pending' || orderGroup.status === 'cancelled') ? "bg-red-50 text-red-600" : 
                      orderGroup.status === 'partial' ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600")}>
                      {orderGroup.isFinalized ? 'Finalizado' : (orderGroup.status === 'pending' ? 'Pendiente' : orderGroup.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-10 pl-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Building2 className="size-5" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Socio Comercial</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{orderGroup.customerName}</span>
                      <Badge variant="outline" className="text-[9px] font-mono border-slate-200 text-slate-400 bg-slate-50">NIT: {orderGroup.nit}</Badge>
                    </div>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><StoreIcon className="size-5" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Punto de Entrega</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{orderGroup.storeName}</span>
                      <Badge variant="outline" className="text-[9px] font-mono border-slate-200 text-slate-400 bg-slate-50">COD: {orderGroup.storeCode}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-inner shrink-0">
              <div className="flex flex-col items-center px-6 border-r border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cajas</span>
                <span className="text-2xl font-black text-primary">{orderGroup.totalBoxes}</span>
              </div>
              <div className="flex flex-col items-center px-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800">{verifiedTotal}</span>
                  <span className="text-xs font-bold text-slate-300">/ {requestedTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo del Modal con tarjetas separadas para Tabla y Paginación */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 gap-0">
          <Card className="border border-muted/20 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col flex-1">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-muted/5 h-14 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="pl-8 text-[11px] font-black text-slate-800 uppercase">Sku / Código</TableHead>
                      <TableHead className="text-[11px] font-black text-slate-800 uppercase">Descripción Técnica</TableHead>
                      <TableHead className="text-[11px] font-black text-slate-800 uppercase">Lote</TableHead>
                      <TableHead className="text-center text-[11px] font-black text-slate-400 uppercase">Unid. Solicitadas</TableHead>
                      <TableHead className="text-center text-[11px] font-black text-primary uppercase">Unid. Certificadas</TableHead>
                      <TableHead className="text-center text-[11px] font-black text-slate-400 uppercase">Cajas Solicitadas</TableHead>
                      <TableHead className="text-center text-[11px] font-black text-primary uppercase">Cajas Certificadas</TableHead>
                      <TableHead className="pr-8 text-right text-[11px] font-black text-slate-800 uppercase">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item, idx) => {
                      const factor = item.boxFactor || 1;
                      // Cálculo de cajas solicitado con decimales como pidió el usuario (ej. 1.333)
                      const reqBoxesRaw = item.quantity / factor;
                      const reqBoxesDisplay = reqBoxesRaw % 1 === 0 ? reqBoxesRaw.toString() : reqBoxesRaw.toFixed(3);
                      
                      // Cálculo de cajas certificado con redondeo superior (ej. 1 full + saldo = 2 cajas)
                      const certBoxes = Math.ceil(item.verifiedQuantity / factor);
                      
                      return (
                        <TableRow key={idx} className="h-16 border-b transition-colors hover:bg-slate-50/50">
                          <TableCell className="pl-8 font-mono font-bold text-[11px] text-primary">{item.productCode}</TableCell>
                          <TableCell className="font-bold text-[11px] text-slate-600 truncate max-w-[250px] uppercase">{item.description}</TableCell>
                          <TableCell className="font-mono text-[10px] font-bold text-slate-400 uppercase">{item.batch || 'N/A'}</TableCell>
                          <TableCell className="text-center font-bold text-[12px] text-slate-400">{item.quantity}</TableCell>
                          <TableCell className="text-center font-black text-[12px] text-slate-800">{item.verifiedQuantity}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-slate-400">
                              <Layers className="size-3" />
                              <span className="font-bold text-[12px]">{reqBoxesDisplay}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5 text-primary">
                              <Package className="size-3" />
                              <span className="font-black text-[12px]">{certBoxes}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                             <Badge variant="outline" className={cn("text-[9px] font-black h-5 border-none lowercase", 
                               item.status === 'verified' ? "bg-emerald-100 text-emerald-700" : 
                               item.status === 'partial' ? "bg-amber-100 text-amber-700" : 
                               "bg-red-100 text-red-700")}>
                               {item.status}
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

          {/* Tarjeta de Paginación Separada (Consistencia con el sistema) */}
          <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden mt-4 shrink-0">
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
          
          <div className="flex justify-end items-center shrink-0 mt-6 h-14">
             <Button onClick={onClose} className="rounded-full bg-slate-800 hover:bg-slate-900 text-white font-black px-12 h-full shadow-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs gap-3">
               <X className="size-5" /> CERRAR VISTA INFORMATIVA
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderViewModal;