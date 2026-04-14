"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Activity,
  Truck,
  ClipboardCheck,
  Layers,
  History,
  LayoutDashboard,
  Boxes,
  Users2,
  Database,
  CircleAlert,
  CheckCheck,
  CalendarClock,
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";
import type { Customer, GroupedOrder, MappingProfile, Material, OrderGroup, Owner, Store, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type DashboardSnapshot = {
  processes: GroupedOrder[];
  orders: OrderGroup[];
  owners: Owner[];
  customers: Customer[];
  stores: Store[];
  materials: Material[];
  users: User[];
  mappingProfiles: MappingProfile[];
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  highlight,
}: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  description: string, 
  highlight?: string,
}) => (
  <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-200 group">
    <CardContent className="p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 tracking-wide">{title}</span>
        <div className="size-9 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 transition-all duration-200 group-hover:scale-105 group-hover:text-primary">
          {icon}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-3xl font-black tracking-tight text-slate-800">{value}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {highlight && (
            <span className="text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/5 text-primary">
              {highlight}
            </span>
          )}
          <p className="text-[11px] font-medium text-slate-400">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

type ActivityItem = {
  id: string;
  type: "completed-order" | "created-process" | "completed-process";
  title: string;
  description: string;
  timestamp: string;
};

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "completed-order":
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case "completed-process":
      return <CheckCheck className="size-3.5 text-primary" />;
    default:
      return <Layers className="size-3.5 text-slate-500" />;
  }
};

const DashboardPanel = () => {
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
  const snapshot = useMemo<DashboardSnapshot>(() => ({
    processes: appData.groupedProcesses,
    orders: appData.groupedProcesses.flatMap((process) => process.orders),
    owners: appData.owners,
    customers: appData.customers,
    stores: appData.stores,
    materials: appData.materials,
    users: appData.users,
    mappingProfiles: appData.mappingProfiles,
  }), [appData]);

  const computed = useMemo(() => {
    const today = new Date();
    const activeUsers = snapshot.users.filter((user) => user.isActive).length;
    const activeMaterials = snapshot.materials.filter((material) => material.isActive).length;
    const activeStores = snapshot.stores.filter((store) => store.isActive).length;
    const activeCustomers = snapshot.customers.filter((customer) => customer.isActive).length;
    const activeProcesses = snapshot.processes.filter((process) => process.status !== 'completed').length;

    const pendingOrders = snapshot.orders.filter((order) => !order.isFinalized && order.status === 'pending');
    const inProgressOrders = snapshot.orders.filter((order) => !order.isFinalized && order.status === 'partial');
    const completedOrders = snapshot.orders.filter((order) => order.isFinalized || order.status === 'verified');
    const cancelledOrders = snapshot.orders.filter((order) => order.status === 'cancelled');
    const assignedOrders = snapshot.orders.filter((order) => Array.isArray(order.assignedTo) && order.assignedTo.length > 0 && !order.isFinalized && order.status !== 'cancelled');
    const unassignedOrders = snapshot.orders.filter((order) => (!Array.isArray(order.assignedTo) || order.assignedTo.length === 0) && !order.isFinalized && order.status !== 'cancelled');
    const certifiedUnits = snapshot.orders.reduce((acc, order) => acc + order.items.reduce((sum, item) => sum + (Number(item.verifiedQuantity) || 0), 0), 0);
    const requestedUnits = snapshot.orders.reduce((acc, order) => acc + order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), 0);
    const boxesPlanned = snapshot.orders.reduce((acc, order) => acc + (order.totalBoxes || 0), 0);
    const completionRate = snapshot.orders.length > 0 ? (completedOrders.length / snapshot.orders.length) * 100 : 0;
    const executionRate = requestedUnits > 0 ? (certifiedUnits / requestedUnits) * 100 : 0;
    const processesCompletedToday = snapshot.processes.filter((process) => process.status === 'completed' && process.orders.some((order) => order.finalizedAt && format(new Date(order.finalizedAt), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))).length;
    const completedToday = completedOrders.filter((order) => order.finalizedAt && format(new Date(order.finalizedAt), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
    const myActiveTasks = currentUser
      ? snapshot.orders.filter((order) => Array.isArray(order.assignedTo) && order.assignedTo.includes(currentUser.id) && !order.isFinalized && order.status !== 'cancelled').length
      : 0;

    const businessDates: Date[] = [];
    let cursor = new Date(today);

    while (businessDates.length < 5) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDates.unshift(new Date(cursor));
      }

      cursor.setDate(cursor.getDate() - 1);
    }

    const weeklyChart = businessDates.map((baseDate) => {
      const dateKey = format(baseDate, 'yyyy-MM-dd');
      const dayOrders = completedOrders.filter((order) => order.finalizedAt && format(new Date(order.finalizedAt), 'yyyy-MM-dd') === dateKey);

      return {
        name: format(baseDate, 'EEE', { locale: es }),
        value: dayOrders.length,
        units: dayOrders.reduce((acc, order) => acc + order.items.reduce((sum, item) => sum + (Number(item.verifiedQuantity) || 0), 0), 0),
      };
    });

    const recentActivity: ActivityItem[] = [
      ...completedOrders
        .filter((order) => order.finalizedAt)
        .map((order) => ({
          id: `order-${order.id}-${order.orderNumber}`,
          type: 'completed-order' as const,
          title: 'Pedido certificado',
          description: `${order.customerName} · Orden ${order.orderNumber}`,
          timestamp: order.finalizedAt as string,
        })),
      ...snapshot.processes.map((process) => ({
        id: `process-${process.id}`,
        type: process.status === 'completed' ? 'completed-process' as const : 'created-process' as const,
        title: process.status === 'completed' ? 'Proceso completado' : 'Proceso creado',
        description: `${process.name} · ${process.orders.length} pedidos`,
        timestamp: process.status === 'completed'
          ? process.orders
              .map((order) => order.finalizedAt)
              .filter(Boolean)
              .sort()
              .at(-1) || process.creationDate
          : process.creationDate,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return {
      activeUsers,
      activeMaterials,
      activeStores,
      activeCustomers,
      activeProcesses,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      cancelledOrders,
      assignedOrders,
      unassignedOrders,
      certifiedUnits,
      requestedUnits,
      boxesPlanned,
      completionRate,
      executionRate,
      processesCompletedToday,
      completedToday,
      myActiveTasks,
      weeklyChart,
      recentActivity,
    };
  }, [currentUser, snapshot]);

  const masterCoverage = useMemo(() => {
    const buckets = [
      snapshot.owners.length > 0,
      snapshot.customers.length > 0,
      snapshot.stores.length > 0,
      snapshot.materials.length > 0,
      snapshot.mappingProfiles.length > 0,
      snapshot.users.length > 0,
    ];

    return (buckets.filter(Boolean).length / buckets.length) * 100;
  }, [snapshot]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#1d57b7]/10 to-[#3b82f6]/10 rounded-xl">
            <LayoutDashboard className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Resumen general</h2>
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-2 mt-0.5">
              <Activity className="size-3" /> Vista rápida del estado real de la operación y de los datos base del sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pedidos completados</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800">{Math.round(computed.completionRate)}%</span>
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unidades verificadas</span>
            <span className="text-2xl font-bold text-primary">{Math.round(computed.executionRate)}%</span>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Última actualización</span>
            <span className="text-sm font-bold text-slate-700">{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          title="Procesos abiertos"
          value={computed.activeProcesses.toString()}
          description={`${snapshot.processes.length} procesos registrados en total`}
          highlight={`${computed.processesCompletedToday} finalizados hoy`}
          icon={<Layers className="size-4" />}
        />
        <StatCard 
          title="Pedidos listos"
          value={computed.completedOrders.length.toString()}
          description={`${computed.completedToday.length} finalizados hoy`}
          highlight={`${snapshot.orders.length} pedidos cargados`}
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard 
          title="Pedidos en proceso"
          value={computed.inProgressOrders.length.toString()}
          description={`${computed.assignedOrders.length} ya tienen responsable asignado`}
          highlight={`${computed.myActiveTasks} están asignados a ti`}
          icon={<ClipboardCheck className="size-4" />}
        />
        <StatCard 
          title="Pedidos pendientes"
          value={computed.pendingOrders.length.toString()}
          description={`${computed.unassignedOrders.length} siguen sin responsable`}
          highlight={`${computed.cancelledOrders.length} anulados`}
          icon={<AlertCircle className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-5 min-w-0">
          <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-6 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Estado de los pedidos</CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-400">Resumen del flujo actual de la operación</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 border-slate-200 bg-slate-50 text-[9px] font-semibold uppercase tracking-wider">Datos actuales</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex flex-col gap-6">
              <div className="flex flex-col gap-5 py-2 lg:flex-row lg:items-center lg:justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-y-1/2 z-0" />
                
                {[
                  { label: 'Pendientes', count: computed.pendingOrders.length, color: 'bg-slate-700', text: 'text-slate-700', icon: Package },
                  { label: 'En proceso', count: computed.inProgressOrders.length, color: 'bg-primary', text: 'text-primary', icon: ClipboardCheck },
                  { label: 'Certificados', count: computed.completedOrders.length, color: 'bg-emerald-500', text: 'text-emerald-500', icon: Truck }
                ].map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center bg-white px-4">
                    <div className={cn("size-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3 transition-all duration-200 hover:scale-105 hover:shadow-xl", step.color)}>
                      <step.icon className="size-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-800 leading-none">{step.count}</p>
                      <p className={cn("text-[9px] font-semibold uppercase tracking-wider mt-1.5", step.text)}>{step.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidades por procesar</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{computed.requestedUnits.toLocaleString('es-CO')}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unidades verificadas</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-primary">{computed.certifiedUnits.toLocaleString('es-CO')}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cajas estimadas</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{computed.boxesPlanned.toLocaleString('es-CO')}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="size-3" /> Pedidos cerrados en los últimos 5 días hábiles
                  </h4>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={computed.weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white px-4 py-3 border border-slate-100 rounded-xl shadow-xl">
                                <p className="text-xl font-bold text-slate-800">{payload[0].value} pedidos cerrados</p>
                                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mt-1">{payload[0].payload.units} unidades verificadas</p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-6 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
                  <History className="size-4 text-slate-500" />
                </div>
                <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Últimos movimientos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4 pt-2">
                {computed.recentActivity.length > 0 ? (
                  computed.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 group">
                      <div className="size-8 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-slate-50 pb-3 group-last:border-none">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-700 truncate uppercase tracking-wide">{act.title}</p>
                          <span className="text-[9px] font-medium text-slate-300">{format(new Date(act.timestamp), 'dd/MM HH:mm')}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
                    <History className="size-10 mb-3 stroke-1" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider">Aún no hay movimientos registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Estado general del sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Datos base disponibles</span>
                  <Badge className="border-none bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-none rounded-full">
                    {Math.round(masterCoverage)}%
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-bold tracking-tight text-slate-800">{Math.round(masterCoverage)}%</p>
                  <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5"><Database className="size-3" /> estructura mínima cargada</p>
                </div>
                <Progress value={masterCoverage} className="h-2 rounded-full bg-slate-100" />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users2 className="size-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Usuarios activos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{computed.activeUsers}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Boxes className="size-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Materiales activos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{computed.activeMaterials}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck className="size-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Puntos activos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{computed.activeStores}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <CalendarClock className="size-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Clientes activos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{computed.activeCustomers}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Atención prioritaria</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {computed.unassignedOrders.length > 0
                          ? `${computed.unassignedOrders.length} pedidos aún no tienen responsable asignado.`
                          : 'Todos los pedidos activos tienen responsable asignado.'}
                      </p>
                    </div>
                    {computed.unassignedOrders.length > 0 ? (
                      <CircleAlert className="size-5 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCheck className="size-5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;