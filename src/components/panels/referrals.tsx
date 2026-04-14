"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Eye, 
  FileSpreadsheet, 
  Building2, 
  Store as StoreIcon,
  Package,
  Filter,
  Printer,
  Tag
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { GroupedOrder, OrderGroup, Owner } from "@/lib/types";
import { mockOwners } from "@/lib/data";
import { cn } from "@/lib/utils";
import OrderViewModal from "./OrderViewModal";
import PrintReferralModal from "./PrintReferralModal";
import PrintTagModal from "./PrintTagModal";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";

const ReferralsPanel = () => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [referrals, setReferrals] = useState<(OrderGroup & { processName: string; processId: string })[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderGroup | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = () => {
    const parsedOwners = appData.owners.length > 0 ? appData.owners : mockOwners;
    setOwners(parsedOwners);

    const orders: (OrderGroup & { processName: string; processId: string })[] = [];

    appData.groupedProcesses.forEach(process => {
      process.orders.forEach(order => {
        if (order.isFinalized && (order.status === 'verified' || order.status === 'partial')) {
          orders.push({
            ...order,
            ownerId: process.ownerId,
            processName: process.name,
            processId: process.id
          });
        }
      });
    });

    orders.sort((a, b) => {
      const dateA = a.finalizedAt ? new Date(a.finalizedAt).getTime() : 0;
      const dateB = b.finalizedAt ? new Date(b.finalizedAt).getTime() : 0;
      return dateB - dateA;
    });

    setReferrals(orders);
  };

  useEffect(() => {
    loadData();
  }, [appData.groupedProcesses, appData.owners]);

  const filteredReferrals = useMemo(() => {
    return referrals.filter(order => 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.nit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [referrals, searchTerm]);

  const handleExportConsolidated = () => {
    if (filteredReferrals.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay datos para exportar",
        description: "La lista de remisiones está vacía.",
      });
      return;
    }

    const exportData = filteredReferrals.flatMap(order => {
      return order.items.map(item => ({
        "Proceso Maestro": order.processName,
        "ID Pedido / PO": order.id,
        "N° Orden": order.orderNumber,
        "NIT Cliente": order.nit,
        "Nombre Cliente": order.customerName,
        "Punto Entrega": order.storeName,
        "Código Punto": order.storeCode,
        "SKU Producto": item.productCode,
        "Descripción Técnica": item.description,
        "Lote / Batch": item.batch || "N/A",
        "Fecha Vencimiento": item.expiryDate || "N/A",
        "Cant. Solicitada": item.quantity,
        "Cant. Certificada": item.verifiedQuantity,
        "Cajas Certificadas": Math.floor(item.verifiedQuantity / (item.boxFactor || 1)),
        "Estado Pedido": order.status === 'verified' ? 'COMPLETO' : 'PARCIAL',
        "Fecha Certificación": order.finalizedAt ? format(new Date(order.finalizedAt), 'dd/MM/yyyy HH:mm') : "N/A"
      }));
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Consolidado Remisiones");
    
    const fileName = `Consolidado_Remisiones_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Remisiones exportadas",
      description: `Se exportaron ${exportData.length} líneas de detalle logístico en el archivo consolidado.`,
    });
  };

  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = useMemo(() => 
    filteredReferrals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredReferrals, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header con búsqueda - consistente con OrdersPanel */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por Pedido, NIT o Cliente..." 
                className="pl-10 h-10 w-96 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
            >
              <Filter className="size-4" />
            </Button>
          </div>
          <Button 
            onClick={handleExportConsolidated}
            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-semibold gap-2 px-5 rounded-xl h-10 text-sm shadow-none transition-all duration-200"
          >
            <FileSpreadsheet className="size-4" /> Exportar Consolidado
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de remisiones - mejorada */}
      <Card className="border border-slate-100 shadow-sm overflow-hidden bg-white rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Pedido / PO</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Socio Comercial</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Punto Entrega</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Cajas</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado Cierre</TableHead>
                <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 font-medium">
                      <Package className="size-12 mb-3 text-slate-300" />
                      <p className="text-sm font-medium">No hay remisiones listas para despacho</p>
                      <p className="text-xs text-slate-400 mt-1">Las certificaciones finalizadas aparecerán aquí</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReferrals.map((order, idx) => {
                  const verifiedUnits = order.items.reduce((acc, i) => acc + (Number(i.verifiedQuantity) || 0), 0);
                  const totalUnits = order.items.reduce((acc, i) => acc + i.quantity, 0);
                  
                  return (
                    <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-primary uppercase">{order.id}</span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">#{order.orderNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <Building2 className="size-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] text-slate-700 truncate max-w-[180px]">{order.customerName}</span>
                            <span className="text-[9px] font-mono text-slate-400">NIT: {order.nit}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <StoreIcon className="size-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] text-slate-700 truncate max-w-[180px]">{order.storeName}</span>
                            <span className="text-[9px] font-mono text-slate-400">CÓD: {order.storeCode}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            <Package className="size-3.5 text-primary" />
                            <span className="text-sm font-bold text-slate-800">{order.totalBoxes}</span>
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                            {verifiedUnits}/{totalUnits} U
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className={cn("text-[9px] font-bold px-2.5 py-0.5 rounded-full border", 
                          order.status === 'verified' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                          "bg-amber-50 text-amber-700 border-amber-100")}>
                          {order.status === 'verified' ? 'Completo' : 'Parcial'}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Vista Previa de Pedido"
                            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Etiqueta Térmica"
                            className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsTagOpen(true);
                            }}
                          >
                            <Tag className="size-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Remisión de Despacho"
                            className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsPrintOpen(true);
                            }}
                          >
                            <Printer className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación - SIEMPRE visible, igual que en el original */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
        <CardContent className="p-0">
          <DataTablePagination 
            totalRows={filteredReferrals.length}
            pageSize={itemsPerPage}
            onPageSizeChange={setItemsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Modales */}
      {selectedOrder && (
        <OrderViewModal 
          orderGroup={selectedOrder}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {selectedOrder && (
        <PrintReferralModal 
          order={selectedOrder}
          owner={owners.find(o => o.id === selectedOrder.ownerId)}
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
        />
      )}

      {selectedOrder && (
        <PrintTagModal 
          order={selectedOrder}
          isOpen={isTagOpen}
          onClose={() => setIsTagOpen(false)}
        />
      )}
    </div>
  );
};

export default ReferralsPanel;