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
import type { GroupedOrder, OrderGroup, User } from "@/lib/types";
import { mockUsers } from "@/lib/data";
import { persistGroupedProcesses } from "@/lib/app-data-client";
import CertificationModal from "./CertificationModal";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

const TasksPanel = () => {
  const { currentUser } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState<(OrderGroup & { processName: string; processId: string })[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderGroup | null>(null);
  const [isCertifyOpen, setIsCertifyOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadTasks = () => {
    if (typeof window === 'undefined' || !currentUser) return;
    
    const savedUsers = localStorage.getItem('users');
    setAvailableUsers(savedUsers ? JSON.parse(savedUsers) : mockUsers);

    const saved = localStorage.getItem('groupedProcesses');
    if (saved) {
      const allProcesses: GroupedOrder[] = JSON.parse(saved);
      const orders: (OrderGroup & { processName: string; processId: string })[] = [];
      
      allProcesses.forEach(process => {
        process.orders.forEach(order => {
          const assignments = Array.isArray(order.assignedTo) ? order.assignedTo : [];

          // Filtro: Solo mostrar si está asignado al usuario actual Y NO está finalizado Y NO está anulado
          const isAssigned = assignments.includes(currentUser.id);
          const isNotFinalized = !order.isFinalized;
          const isNotCancelled = order.status !== 'cancelled';

          if (isAssigned && isNotFinalized && isNotCancelled) {
            orders.push({
              ...order,
              assignedTo: assignments,
              processName: process.name,
              processId: process.id
            });
          }
        });
      });

      // Ordenar por prioridad de estado (pendientes primero)
      orders.sort((a, b) => {
        const priority: Record<string, number> = { 'pending': 1, 'partial': 2 };
        return (priority[a.status] || 3) - (priority[b.status] || 3);
      });

      setAssignedOrders(orders);
    } else {
      setAssignedOrders([]);
    }
  };

  useEffect(() => {
    loadTasks();
    window.addEventListener('storage', loadTasks);
    return () => window.removeEventListener('storage', loadTasks);
  }, [currentUser]);

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
    const saved = localStorage.getItem('groupedProcesses');
    if (saved) {
      const allProcesses: GroupedOrder[] = JSON.parse(saved);
      const updatedProcesses = allProcesses.map(process => {
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
      void persistGroupedProcesses(updatedProcesses).catch((error) => {
        console.error('No se pudo sincronizar tareas certificadas.', error);
      });
      loadTasks();
      setSelectedOrder(updatedOrder);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tareas activas..." 
                className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
            <Clock className="size-3.5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {filteredTasks.length} Tareas Pendientes
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
        {paginatedTasks.map((order, idx) => {
          const total = order.items.reduce((acc, i) => acc + i.quantity, 0);
          const verified = order.items.reduce((acc, i) => acc + i.verifiedQuantity, 0);
          const progress = total > 0 ? (verified / total) * 100 : 0;

          return (
            <Card key={idx} className={cn("group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-3xl flex flex-col h-fit w-full")}>
              <CardHeader className="pb-2 pt-6 px-8 bg-muted/5 border-b flex flex-row items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest truncate max-w-full block w-fit">
                    {order.processName}
                  </Badge>
                  <CardTitle className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">
                    Orden #{order.orderNumber}
                  </CardTitle>
                </div>
                <Button 
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-2xl shadow-xl transition-transform hover:scale-105 bg-primary text-white shadow-primary/20"
                  onClick={() => { setSelectedOrder(order); setIsCertifyOpen(true); }}
                >
                  <Eye className="size-5" />
                </Button>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-6 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <Badge className={cn("px-3 py-1 text-[9px] font-black border shadow-none uppercase tracking-widest",
                    order.status === 'pending' ? "text-red-600 bg-red-50 border-red-100" :
                    order.status === 'partial' ? "text-amber-600 bg-amber-50 border-amber-100" : "text-slate-600 bg-slate-50"
                  )}>
                    {order.status === 'pending' ? 'Pendiente' : 'En Pausa'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground flex items-center gap-1.5"><Hash className="size-3" /> Pedido</span>
                      <p className="text-xs font-black text-slate-700 truncate">{order.id}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <span className="text-[9px] font-black text-muted-foreground flex items-center justify-end gap-1.5"><Tag className="size-3" /> Cliente</span>
                      <p className="text-xs font-bold text-slate-600 truncate">{order.customerName}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-2">
                  <Users2 className="size-3.5 text-primary opacity-70" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Responsable</span>
                    <span className="text-[10px] font-bold text-slate-700">{currentUser?.name}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-muted/20">
                  <div className="flex justify-between items-end">
                    <span className="font-black text-[9px] text-slate-600 tracking-tight">{order.totalBoxes} Cajas Totales</span>
                    <span className="text-primary font-black text-xs tracking-tighter">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-slate-100 rounded-full" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {paginatedTasks.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-muted-foreground italic font-bold opacity-30">
            No tienes tareas de certificación activas actualmente.
          </div>
        )}
      </div>

      <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
        <CardContent className="p-0">
           <DataTablePagination totalRows={filteredTasks.length} pageSize={itemsPerPage} onPageSizeChange={setItemsPerPage} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      {selectedOrder && (
         <CertificationModal isOpen={isCertifyOpen} onClose={() => setIsCertifyOpen(false)} orderGroup={selectedOrder} onSave={handleUpdateOrder} />
      )}
    </div>
  );
};

export default TasksPanel;