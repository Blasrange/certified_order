"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Truck,
  ClipboardCheck,
  Layers,
  ArrowRight,
  History,
  LayoutDashboard,
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
import type { GroupedOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const chartData = [
  { name: "Lun", value: 40, units: 450 },
  { name: "Mar", value: 30, units: 380 },
  { name: "Mie", value: 65, units: 820 },
  { name: "Jue", value: 45, units: 510 },
  { name: "Vie", value: 90, units: 1100 },
  { name: "Sab", value: 55, units: 640 },
  { name: "Dom", value: 80, units: 950 },
];

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendType = 'up'
}: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  description: string, 
  trend?: string,
  trendType?: 'up' | 'down'
}) => (
    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
              <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                {icon}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight text-slate-800">{value}</div>
              <div className="flex items-center gap-2">
                {trend && (
                  <span className={cn(
                    "text-[10px] font-bold flex items-center",
                    trendType === 'up' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {trendType === 'up' ? <ArrowUpRight className="h-3 w-3 mr-0.5"/> : <ArrowDownRight className="h-3 w-3 mr-0.5"/>}
                    {trend}
                  </span>
                )}
                <p className="text-[10px] font-medium text-slate-400 truncate">{description}</p>
              </div>
            </div>
        </CardContent>
    </Card>
);

const DashboardPanel = () => {
  const [data, setData] = useState<{
    processes: any[],
    stats: {
      pending: number,
      inProgress: number,
      completed: number,
      totalOrders: number,
      totalUnits: number,
      totalBoxes: number,
      efficiency: number
    },
    recentActivity: any[]
  }>({
    processes: [],
    stats: { pending: 0, inProgress: 0, completed: 0, totalOrders: 0, totalUnits: 0, totalBoxes: 0, efficiency: 0 },
    recentActivity: []
  });

  useEffect(() => {
    const loadDashboardData = () => {
      const saved = localStorage.getItem('groupedProcesses');
      if (saved) {
        const processes: any[] = JSON.parse(saved);
        const allOrders = processes.flatMap(p => p.orders);
        
        const pending = allOrders.filter(o => !o.isFinalized && o.status === 'pending').length;
        const inProgress = allOrders.filter(o => !o.isFinalized && o.status === 'partial').length;
        const completed = allOrders.filter(o => o.isFinalized).length;
        
        const activity = allOrders
          .filter(o => o.isFinalized)
          .sort((a, b) => new Date(b.finalizedAt || '').getTime() - new Date(a.finalizedAt || '').getTime())
          .slice(0, 10)
          .map(o => ({
            id: o.id,
            title: `Certificación Finalizada`,
            description: `${o.customerName}`,
            time: o.finalizedAt ? format(new Date(o.finalizedAt), 'HH:mm') : 'Hace poco',
            icon: <CheckCircle2 className="size-3.5 text-emerald-500" />
          }));

        setData({
          processes,
          stats: {
            pending,
            inProgress,
            completed,
            totalOrders: allOrders.length,
            totalUnits: allOrders.reduce((acc, o) => acc + o.totalQuantity, 0),
            totalBoxes: allOrders.reduce((acc, o) => acc + (o.totalBoxes || 0), 0),
            efficiency: allOrders.length > 0 ? (completed / allOrders.length) * 100 : 0
          },
          recentActivity: activity
        });
      }
    };
    
    loadDashboardData();
    window.addEventListener('storage', loadDashboardData);
    return () => window.removeEventListener('storage', loadDashboardData);
  }, []);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)] overflow-hidden animate-in fade-in duration-500">
        
        {/* Header Compacto */}
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <LayoutDashboard className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800">Control Operativo</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="size-3" /> Estado de planta en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end pr-8 border-r border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Efectividad Global</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800">{Math.round(data.stats.efficiency)}%</span>
                <TrendingUp className="size-3 text-emerald-500" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Turno Actual</span>
              <span className="text-xl font-black text-primary">{(new Date().getHours() < 14) ? 'AM' : 'PM'}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
            <StatCard 
                title="Procesos Maestros"
                value={data.processes.length.toString()}
                description="Contenedores hoy"
                trend="+2"
                icon={<Layers className="size-4" />}
            />
            <StatCard 
                title="Certificados"
                value={data.stats.completed.toString()}
                description="Pedidos listos"
                trend="Meta 85%"
                icon={<CheckCircle2 className="size-4" />}
            />
            <StatCard 
                title="En Validación"
                value={data.stats.inProgress.toString()}
                description="Carga en piso"
                icon={<Loader2 className="size-4 animate-spin" />}
            />
            <StatCard 
                title="Críticos"
                value={data.stats.pending.toString()}
                description="Sin iniciar"
                trendType="down"
                trend="Prioridad"
                icon={<AlertCircle className="size-4" />}
            />
        </div>

        {/* Main Section: Two Columns */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Left Column: Funnel & Chart */}
          <div className="flex-[2] flex flex-col gap-4">
            <Card className="border-none shadow-sm bg-white rounded-2xl flex-1 flex flex-col overflow-hidden">
              <CardHeader className="p-6 pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-lg font-black tracking-tight text-slate-800">Pipeline de Salidas</CardTitle>
                    <CardDescription className="text-[9px] font-bold text-slate-400 uppercase">Flujo logístico secuencial</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 border-slate-100 bg-slate-50 text-[9px] font-black uppercase">Vivo</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 flex flex-col flex-1">
                <div className="flex items-center justify-between gap-4 py-4 relative">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-slate-100 -translate-y-1/2 z-0" />
                  
                  {[
                    { label: 'Pendientes', count: data.stats.pending, color: 'bg-slate-800', text: 'text-slate-800' },
                    { label: 'En Proceso', count: data.stats.inProgress, color: 'bg-primary', text: 'text-primary' },
                    { label: 'Certificados', count: data.stats.completed, color: 'bg-emerald-500', text: 'text-emerald-500' }
                  ].map((step, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center bg-white px-4">
                      <div className={cn("size-12 rounded-xl flex items-center justify-center text-white shadow-lg mb-3", step.color)}>
                        {i === 0 ? <Package className="size-5" /> : i === 1 ? <ClipboardCheck className="size-5" /> : <Truck className="size-5" />}
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-slate-800 leading-none">{step.count}</p>
                        <p className={cn("text-[8px] font-black uppercase tracking-widest mt-1", step.text)}>{step.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-h-0 mt-4 border-t border-slate-50 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="size-3" /> Tendencia Semanal
                    </h4>
                  </div>
                  <div className="h-full max-h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-xl">
                                  <p className="text-lg font-black text-slate-800">{payload[0].value} Certificados</p>
                                  <p className="text-[9px] font-bold text-primary uppercase">{payload[0].payload.units} Unidades</p>
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

          {/* Right Column: Activity & Meta */}
          <div className="flex-1 flex flex-col gap-4">
            <Card className="border-none shadow-sm bg-white rounded-2xl flex-1 flex flex-col overflow-hidden">
              <CardHeader className="p-6 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 rounded-lg">
                    <History className="size-4 text-slate-400" />
                  </div>
                  <CardTitle className="text-lg font-black tracking-tight text-slate-800">Log Maestro</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 flex-1 overflow-y-auto pb-6 custom-scrollbar">
                <div className="space-y-4 pt-2">
                  {data.recentActivity.length > 0 ? (
                    data.recentActivity.map((act, i) => (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="size-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {act.icon}
                        </div>
                        <div className="flex-1 min-w-0 border-b border-slate-50 pb-3 group-last:border-none">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black text-slate-700 truncate uppercase">{act.title}</p>
                            <span className="text-[9px] font-bold text-slate-300">{act.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{act.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                      <History className="size-8 mb-2" />
                      <p className="text-[10px] font-black uppercase">Sin actividad</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-slate-900 rounded-2xl shrink-0 overflow-hidden text-white">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Avance Diario</span>
                    <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black shadow-none">META: 85%</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black tracking-tight">72%</p>
                    <p className="text-[10px] font-bold text-emerald-400 flex items-center"><TrendingUp className="size-3 mr-1" /> +5%</p>
                  </div>
                  <Progress value={72} className="h-1.5 bg-white/5 rounded-full" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Faltan {data.stats.pending} pedidos por cerrar</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
    </div>
  );
};

export default DashboardPanel;