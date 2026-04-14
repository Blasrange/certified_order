"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ClipboardCheck, 
  Package, 
  Clock, 
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Tag,
  Hash,
  Eye,
  Users2,
  Ban
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";
import type { GroupedOrder, OrderGroup, User } from "@/lib/types";
import { mockUsers } from "@/lib/data";
import { persistGroupedProcesses } from "@/lib/app-data-client";
import CertificationModal from "./CertificationModal";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

const TasksPanel = () => {
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const [assignedOrders, setAssignedOrders] = useState<(OrderGroup & { processName: string; processId: string })[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderGroup | null>(null);
  const [isCertifyOpen, setIsCertifyOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadTasks = React.useCallback(() => {
    if (!currentUser) {
      setAssignedOrders([]);
      setAvailableUsers([]);
      return;
    }

    setAvailableUsers(appData.users.length > 0 ? appData.users : mockUsers);

    const orders: (OrderGroup & { processName: string; processId: string })[] = [];

    appData.groupedProcesses.forEach((process) => {
      process.orders.forEach((order) => {
        const assignments = Array.isArray(order.assignedTo) ? order.assignedTo : [];
        const isAssigned = assignments.includes(currentUser.id);
        const isNotFinalized = !order.isFinalized;
        const isNotCancelled = order.status !== 'cancelled';

        if (isAssigned && isNotFinalized && isNotCancelled) {
          orders.push({
            ...order,
            assignedTo: assignments,
            processName: process.name,
            processId: process.id,
          });
        }
      });
    });

    orders.sort((a, b) => {
      const priority: Record<string, number> = { pending: 1, partial: 2 };
      return (priority[a.status] || 3) - (priority[b.status] || 3);
    });

    setAssignedOrders(orders);
  }, [appData.groupedProcesses, appData.users, currentUser]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    return assignedOrders.filter(order => 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assignedOrders, searchTerm]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => 
    filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredTasks, currentPage, itemsPerPage]);

  const handleUpdateOrder = (updatedOrder: OrderGroup) => {
    const updatedProcesses = appData.groupedProcesses.map(process => {
      const orderIdx = process.orders.findIndex(o => o.id === updatedOrder.id && o.orderNumber === updatedOrder.orderNumber);
      if (orderIdx !== -1) {
        const newOrders = [...process.orders];
        newOrders[orderIdx] = updatedOrder;

        const activeOrders = newOrders.filter(o => o.status !== 'cancelled');
        const totalU = activeOrders.flatMap(o => o.items).reduce((acc, i) => acc + i.quantity, 0);
        const totalV = activeOrders.flatMap(o => o.items).reduce((acc, i) => acc + i.verifiedQuantity, 0);

        const allDone = newOrders.every(o => o.isFinalized || o.status === 'cancelled');

        return {
          ...process,
          orders: newOrders,
          progress: totalU > 0 ? (totalV / totalU) * 100 : (allDone ? 100 : 0),
          status: allDone ? 'completed' : 'in-progress'
        } as GroupedOrder;
      }
      return process;
    });

    void persistGroupedProcesses(updatedProcesses)
      .then(() => appData.refresh())
      .catch((error) => {
        console.error('No se pudo sincronizar tareas certificadas.', error);
      });
    setSelectedOrder(updatedOrder);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header con búsqueda - consistente con OrdersPanel */}
      <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar tareas activas por pedido, cliente o ID..." 
                className="pl-10 h-10 w-80 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <Clock className="size-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {filteredTasks.length} Tareas Pendientes
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid de tarjetas de tareas - mejorado */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
        {paginatedTasks.map((order, idx) => {
          const total = order.items.reduce((acc, i) => acc + i.quantity, 0);
          const verified = order.items.reduce((acc, i) => acc + i.verifiedQuantity, 0);
          const progress = total > 0 ? (verified / total) * 100 : 0;

          return (
            <Card 
              key={idx} 
              className={cn(
                "group overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-xl flex flex-col h-full"
              )}
            >
              <CardHeader className="pb-3 pt-5 px-5 bg-white border-b border-slate-100 flex flex-row items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Badge 
                    variant="outline" 
                    className="bg-primary/5 text-primary border-primary/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider truncate max-w-full block w-fit"
                  >
                    {order.processName}
                  </Badge>
                  <CardTitle className="text-sm font-bold text-slate-800 tracking-tight leading-tight truncate">
                    Orden #{order.orderNumber}
                  </CardTitle>
                </div>
                <Button 
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-lg shadow-md transition-all duration-200 hover:scale-105 bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-primary/20"
                  onClick={() => { setSelectedOrder(order); setIsCertifyOpen(true); }}
                >
                  <Eye className="size-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="px-5 pb-5 pt-4 space-y-4">
                {/* Estado */}
                <div className="flex justify-between items-center">
                  <Badge className={cn("px-2.5 py-0.5 text-[9px] font-bold rounded-full border",
                    order.status === 'pending' ? "bg-red-50 text-red-600 border-red-100" :
                    order.status === 'partial' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                    "bg-slate-50 text-slate-500 border-slate-100"
                  )}>
                    {order.status === 'pending' ? 'Pendiente' : 'En progreso'}
                  </Badge>
                </div>

                {/* Información del pedido */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                      <Hash className="size-3" /> Pedido
                    </span>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{order.id}</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[9px] font-semibold text-slate-400 flex items-center justify-end gap-1">
                      <Tag className="size-3" /> Cliente
                    </span>
                    <p className="text-[11px] font-semibold text-slate-600 truncate">{order.customerName}</p>
                  </div>
                </div>

                {/* Responsable */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
                  <Users2 className="size-3.5 text-primary/70" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Responsable</span>
                    <span className="text-[10px] font-semibold text-slate-700">{currentUser?.name}</span>
                  </div>
                </div>

                {/* Progreso */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-[9px] text-slate-500">{order.totalBoxes} Cajas totales</span>
                    <span className="text-primary font-bold text-[11px]">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-slate-100 rounded-full" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {paginatedTasks.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
            <ClipboardCheck className="size-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">No tienes tareas de certificación activas</p>
            <p className="text-xs text-slate-400 mt-1">Las tareas asignadas aparecerán aquí</p>
          </div>
        )}
      </div>

      {/* Paginación - consistente con OrdersPanel */}
      {filteredTasks.length > 0 && (
        <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
          <CardContent className="p-0">
            <DataTablePagination 
              totalRows={filteredTasks.length} 
              pageSize={itemsPerPage} 
              onPageSizeChange={setItemsPerPage} 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de certificación */}
      {selectedOrder && (
        <CertificationModal 
          isOpen={isCertifyOpen} 
          onClose={() => setIsCertifyOpen(false)} 
          orderGroup={selectedOrder} 
          onSave={handleUpdateOrder} 
        />
      )}
    </div>
  );
};

export default TasksPanel;