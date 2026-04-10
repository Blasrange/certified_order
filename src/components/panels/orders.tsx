"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  Loader2,
  PlusCircle,
  Search,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
  Package,
  Calendar,
  Eye,
  UserPlus,
  Pencil,
  User as UserIcon,
  Users2,
  ClipboardList,
  Save,
  X,
  CheckCircle2,
  ShieldCheck,
  PackagePlus,
  FileCheck2,
  UserCheck,
  UserMinus,
  Lock,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GroupedOrder, MappingProfile, OrderGroup, User, Store, Customer, Material, Owner } from "@/lib/types";
import { mockCustomers, mockMaterials, mockUsers, mockStores, mockOwners } from "@/lib/data";
import { persistGroupedProcesses } from "@/lib/app-data-client";
import OrderViewModal from "./OrderViewModal";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface OrdersPanelProps {
  externalView?: 'list' | 'detail';
  onViewChange?: (view: 'list' | 'detail', name?: string) => void;
}

const normalizeId = (val: any) => {
  if (val === undefined || val === null) return "";
  return String(val).trim().toLowerCase();
};

const OrdersPanel = ({ externalView, onViewChange }: OrdersPanelProps) => {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGestionOpen, setIsGestionOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewOrdersCount, setPreviewOrdersCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderItemsPerPage, setOrderItemsPerPage] = useState(10);

  const [mappingProfiles, setMappingProfiles] = useState<MappingProfile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [processes, setProcesses] = useState<GroupedOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (externalView) {
      setView(externalView);
      if (externalView === 'list') {
        setSelectedProcessId(null);
      }
    }
  }, [externalView]);

  // Reiniciar página al buscar en la lista
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reiniciar página al buscar en detalle
  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearchTerm]);

  useEffect(() => {
    const loadMasterData = () => {
      if (typeof window !== 'undefined') {
        const savedProcesses = localStorage.getItem('groupedProcesses');
        if (savedProcesses) setProcesses(JSON.parse(savedProcesses));
        
        const savedMappings = localStorage.getItem('mappingProfiles');
        if (savedMappings) setMappingProfiles(JSON.parse(savedMappings));

        const savedUsers = localStorage.getItem('users');
        setAvailableUsers(savedUsers ? JSON.parse(savedUsers) : mockUsers);

        const savedStores = localStorage.getItem('stores');
        setStores(savedStores ? JSON.parse(savedStores) : mockStores);

        const savedCust = localStorage.getItem('customers');
        setCustomers(savedCust ? JSON.parse(savedCust) : mockCustomers);

        const savedMats = localStorage.getItem('materials');
        setMaterials(savedMats ? JSON.parse(savedMats) : mockMaterials);

        const savedOwners = localStorage.getItem('owners');
        setOwners(savedOwners ? JSON.parse(savedOwners) : mockOwners);
      }
    };
    loadMasterData();
    window.addEventListener('storage', loadMasterData);
    return () => window.removeEventListener('storage', loadMasterData);
  }, []);

  const saveToStorage = (updatedProcesses: GroupedOrder[]) => {
    setProcesses(updatedProcesses);
    void persistGroupedProcesses(updatedProcesses).catch((error) => {
      console.error('No se pudo sincronizar procesos.', error);
      toast({ variant: "destructive", title: "Sincronizacion pendiente", description: "Los cambios se aplicaron localmente, pero no se pudieron subir a la base de datos." });
    });
  };

  const activeProcess = useMemo(() => 
    processes.find(p => p.id === selectedProcessId) || null
  , [processes, selectedProcessId]);

  const activeProcessTeam = useMemo(() => {
    if (!activeProcess) return [];
    const teamIds = new Set<string>();
    activeProcess.orders.forEach(order => {
      if (Array.isArray(order.assignedTo)) {
        order.assignedTo.forEach(id => teamIds.add(id));
      }
    });
    return Array.from(teamIds).map(id => availableUsers.find(u => u.id === id)).filter(Boolean) as User[];
  }, [activeProcess, availableUsers]);

  const getUserPendingTasks = useCallback((userId: string) => {
    let count = 0;
    processes.forEach(p => {
      p.orders.forEach(o => {
        if (o.assignedTo?.includes(userId) && !o.isFinalized) {
          count++;
        }
      });
    });
    return count;
  }, [processes]);

  const processStats = useMemo(() => {
    if (!activeProcess) return null;
    
    let unitsListas = 0; 
    let unitsParcial = 0; 
    let unitsPendiente = 0;
    let certifiedBoxesCount = 0;
    let partialBoxesCount = 0;
    let pendingBoxes = 0;

    activeProcess.orders.forEach(order => {
      if (order.status === 'cancelled') return;
      order.items.forEach(item => {
        const factor = item.boxFactor || 1;
        const totalQty = item.quantity;
        const verifiedQty = item.verifiedQuantity;

        if (verifiedQty >= totalQty) {
          unitsListas += totalQty;
          certifiedBoxesCount += Math.ceil(totalQty / factor);
        } else if (verifiedQty > 0) {
          unitsParcial += verifiedQty;
          unitsPendiente += (totalQty - verifiedQty);
          
          const fullBoxesVerified = Math.floor(verifiedQty / factor);
          certifiedBoxesCount += fullBoxesVerified;
          partialBoxesCount += 1;
          
          const totalBoxesRequested = Math.ceil(totalQty / factor);
          pendingBoxes += Math.max(0, totalBoxesRequested - (fullBoxesVerified + 1));
        } else {
          unitsPendiente += totalQty;
          pendingBoxes += Math.ceil(totalQty / factor);
        }
      });
    });
    
    return {
      unitsListas,
      unitsParcial,
      unitsPendiente,
      certifiedBoxesCount,
      partialBoxesCount,
      pendingBoxes
    };
  }, [activeProcess]);

  const filteredProcesses = useMemo(() => {
    const filtered = processes.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => 
      new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );
  }, [processes, searchTerm]);

  const totalPages = Math.ceil(filteredProcesses.length / itemsPerPage);
  
  // Asegurar que la página actual no exceda el total si los filtros cambian
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredProcesses, totalPages, currentPage]);

  const paginatedProcesses = useMemo(() => 
    filteredProcesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredProcesses, currentPage, itemsPerPage]);

  const filteredOrders = useMemo(() => {
    if (!activeProcess) return [];
    const filtered = activeProcess.orders.filter(o => 
      o.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      o.nit.toLowerCase().includes(orderSearchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (a.isFinalized && !b.isFinalized) return 1;
      if (!a.isFinalized && b.isFinalized) return -1;
      const priority: Record<string, number> = { 'pending': 1, 'partial': 2, 'verified': 3, 'cancelled': 4 };
      return (priority[a.status] || 5) - (priority[b.status] || 5);
    });
  }, [activeProcess, orderSearchTerm]);

  const orderTotalPages = Math.ceil(filteredOrders.length / orderItemsPerPage);

  useEffect(() => {
    if (orderCurrentPage > orderTotalPages && orderTotalPages > 0) {
      setOrderCurrentPage(orderTotalPages);
    }
  }, [filteredOrders, orderTotalPages, orderCurrentPage]);

  const paginatedOrders = useMemo(() => 
    filteredOrders.slice((orderCurrentPage - 1) * orderItemsPerPage, orderCurrentPage * orderItemsPerPage)
  , [filteredOrders, orderCurrentPage, orderItemsPerPage]);

  const [headerData, setHeaderData] = useState({
    name: "",
    type: "Nacional" as const,
    certificationDate: format(new Date(), 'yyyy-MM-dd'),
    ownerId: owners[0]?.id || "",
    notes: "",
    hasBalances: false,
  });

  const handleCreateOrUpdateProcess = () => {
    if (!headerData.name || !headerData.ownerId) return;

    let updated;
    if (editingProcessId) {
      updated = processes.map(p => 
        p.id === editingProcessId ? { ...p, ...headerData } : p
      );
      toast({ title: "Proceso actualizado" });
    } else {
      const newProcess: GroupedOrder = {
        id: `CERT-${Date.now()}`,
        ...headerData,
        orders: [],
        status: 'pending',
        progress: 0,
        creationDate: new Date().toISOString(),
        createdBy: currentUser || undefined,
      };
      updated = [newProcess, ...processes];
      toast({ title: "Proceso creado" });
    }
    
    saveToStorage(updated);
    setIsCreateModalOpen(false);
    setEditingProcessId(null);
    setHeaderData({
      name: "",
      type: "Nacional",
      certificationDate: format(new Date(), 'yyyy-MM-dd'),
      ownerId: owners[0]?.id || "",
      notes: "",
      hasBalances: false,
    });
  };

  const handleDeleteProcess = (processId: string) => {
    const updated = processes.filter(p => p.id !== processId);
    saveToStorage(updated);
    toast({ variant: "destructive", title: "Proceso y tareas eliminadas" });
  };

  const handleEditProcess = (p: GroupedOrder) => {
    if (p.status !== 'pending') {
      toast({ 
        variant: "destructive", 
        title: "Edición bloqueada", 
        description: "No se puede editar un proceso que ya tiene pedidos en curso o finalizados." 
      });
      return;
    }
    setEditingProcessId(p.id);
    setHeaderData({
      name: p.name,
      type: p.type,
      ownerId: p.ownerId || "",
      certificationDate: p.certificationDate,
      notes: p.notes || "",
      hasBalances: p.hasBalances,
    });
    setIsCreateModalOpen(true);
  };

  const handleImportExcel = async () => {
    if (!file || !selectedProfileId) {
      toast({ variant: "destructive", title: "Datos faltantes", description: "Selecciona una plantilla y un archivo." });
      return;
    }

    setIsLoading(true);
    const profile = mappingProfiles.find(p => p.id === selectedProfileId);
    if (!profile) { setIsLoading(false); return; }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const mf = profile.fields;
        const groupedMap = new Map<string, OrderGroup>();
        
        const missingSkus = new Set<string>();
        const invalidCustomers = new Set<string>();
        const invalidStores = new Set<string>();
        const duplicatedPedidoIds = new Set<string>();

        const allExistingOrders = processes.flatMap(p => p.orders);

        jsonData.forEach((row: any) => {
          const pedidoId = String(row[mf.pedido] || 'S/N').trim();
          const ordenNum = String(row[mf.orden] || 'S/N').trim();
          const nit = String(row[mf.nit] || 'S/N').trim();
          const sku = String(row[mf.sku] || '').trim();
          const qty = Number(row[mf.cantidad] || 0);
          const storeCodeInExcel = String(row[mf.codigoTienda] || '').trim();

          const isDuplicate = allExistingOrders.some(eo => normalizeId(eo.id) === normalizeId(pedidoId));
          if (isDuplicate) duplicatedPedidoIds.add(pedidoId);

          const customer = customers.find(c => normalizeId(c.nit) === normalizeId(nit));
          if (!customer) invalidCustomers.add(nit);

          const matchedStore = stores.find(s => 
            normalizeId(s.customerNit) === normalizeId(nit) && 
            normalizeId(s.code) === normalizeId(storeCodeInExcel)
          );
          if (!matchedStore) invalidStores.add(`NIT:${nit}-PTO:${storeCodeInExcel}`);

          const material = materials.find(m => normalizeId(m.code) === normalizeId(sku));
          if (!material) missingSkus.add(sku);

          const key = pedidoId;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              id: pedidoId,
              orderNumber: ordenNum,
              customerName: customer?.name || `CLIENTE NO EXISTE (${nit})`,
              nit: nit,
              storeName: matchedStore?.name || `PUNTO NO EXISTE (${storeCodeInExcel})`,
              storeCode: matchedStore?.code || storeCodeInExcel || 'S/N',
              totalQuantity: 0,
              totalBoxes: 0,
              status: 'pending',
              items: []
            });
          }

          const group = groupedMap.get(key)!;
          
          let factor = 1;
          if (material) {
            const boxUom = material.uoms?.find(u => u.unit === 'Caja');
            factor = boxUom?.numerator || material.embalaje || 1;
          }
          
          const boxes = Math.ceil(qty / factor);

          group.totalQuantity += qty;
          group.totalBoxes += boxes;
          group.items.push({
            productCode: sku,
            description: material?.description || "MATERIAL NO EXISTE",
            batch: String(row[mf.lote] || 'N/A').trim(),
            expiryDate: String(row[mf.vencimiento] || 'N/A').trim(),
            productionDate: String(row[mf.fabricacion] || 'N/A').trim(),
            quantity: qty,
            verifiedQuantity: 0,
            boxes,
            boxFactor: factor,
            status: 'pending'
          });
        });

        if (duplicatedPedidoIds.size > 0) {
          toast({ variant: "destructive", title: "Pedido ya registrado", description: `El número de pedido ${Array.from(duplicatedPedidoIds)[0]} ya existe.` });
          setIsLoading(false); return;
        }

        if (missingSkus.size > 0 || invalidCustomers.size > 0 || invalidStores.size > 0) {
          const skuError = missingSkus.size > 0 ? `SKUs faltantes: ${Array.from(missingSkus).slice(0, 5).join(", ")}.` : "";
          const custError = invalidCustomers.size > 0 ? `Clientes no encontrados por NIT.` : "";
          toast({ variant: "destructive", title: "Error de integridad de datos", description: `${skuError} ${custError} Verifique las maestras.` });
          setIsLoading(false); return;
        }

        const newOrders = Array.from(groupedMap.values());
        if (selectedProcessId) {
          const updated = processes.map(p => 
            p.id === selectedProcessId ? { ...p, orders: [...p.orders, ...newOrders], status: 'in-progress' } : p
          );
          saveToStorage(updated);
          toast({ title: "Importación exitosa", description: `${newOrders.length} pedidos vinculados al proceso.` });
        }
        
        setFile(null);
        setPreviewOrdersCount(0);
        setSelectedProfileId("");
        setIsImportModalOpen(false);
      } catch (err) {
        toast({ variant: "destructive", title: "Fallo crítico en procesamiento de archivo" });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { 
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (selectedProfileId) {
            const profile = mappingProfiles.find(p => p.id === selectedProfileId);
            if (profile) {
              const pedidoField = profile.fields.pedido;
              const uniquePedidos = new Set(jsonData.map((row: any) => String(row[pedidoField] || '')));
              setPreviewOrdersCount(uniquePedidos.size);
            } else {
              setPreviewOrdersCount(jsonData.length);
            }
          } else {
            setPreviewOrdersCount(jsonData.length);
          }
        } catch (err) {
          console.error("Error al previsualizar archivo", err);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  }, [selectedProfileId, mappingProfiles]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }, maxFiles: 1 });

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setFile(null);
    setPreviewOrdersCount(0);
    setSelectedProfileId("");
  };

  const handleDeleteOrder = (orderId: string) => {
    if (!selectedProcessId) return;
    const updated = processes.map(p => {
      if (p.id === selectedProcessId) {
        const newOrders = p.orders.filter(o => o.id !== orderId);
        const totalU = newOrders.flatMap(o => o.items).reduce((acc, i) => acc + i.quantity, 0);
        const totalV = newOrders.flatMap(o => o.items).reduce((acc, i) => acc + i.verifiedQuantity, 0);
        return { ...p, orders: newOrders, progress: totalU > 0 ? (totalV / totalU) * 100 : 0 };
      }
      return p;
    });
    saveToStorage(updated);
    toast({ variant: "destructive", title: "Pedido eliminado" });
  };

  const handleDirectAssign = (userId: string) => {
    if (!selectedProcessId || !selectedOrderGroup) return;
    
    if (selectedOrderGroup.isFinalized) {
      toast({ 
        variant: "destructive", 
        title: "Acceso denegado", 
        description: "No se puede cambiar el responsable de una certificación cerrada." 
      });
      return;
    }

    const updated = processes.map(p => {
      if (p.id === selectedProcessId) {
        const newOrders = p.orders.map(o => {
          if (o.id === selectedOrderGroup.id) {
            return { ...o, assignedTo: [userId] };
          }
          return o;
        });
        return { ...p, orders: newOrders };
      }
      return p;
    });
    saveToStorage(updated);
    
    setSelectedOrderGroup(prev => prev ? { ...prev, assignedTo: [userId] } : null);
    toast({ title: "Responsable asignado correctamente" });
  };

  const handleClearAssignment = () => {
    if (!selectedProcessId || !selectedOrderGroup) return;
    
    if (selectedOrderGroup.isFinalized) {
      toast({ 
        variant: "destructive", 
        title: "Acceso denegado", 
        description: "No se puede desvincular el responsable de una certificación cerrada." 
      });
      return;
    }

    const updated = processes.map(p => {
      if (p.id === selectedProcessId) {
        const newOrders = p.orders.map(o => {
          if (o.id === selectedOrderGroup.id) {
            return { ...o, assignedTo: [] };
          }
          return o;
        });
        return { ...p, orders: newOrders };
      }
      return p;
    });
    saveToStorage(updated);
    setSelectedOrderGroup(prev => prev ? { ...prev, assignedTo: [] } : null);
    toast({ title: "Asignación eliminada" });
  };

  const handleEnterDetail = (p: GroupedOrder) => {
    setSelectedProcessId(p.id);
    setView('detail');
    if (onViewChange) {
      onViewChange('detail', p.name);
    }
  };

  const handleGoBack = () => {
    setView('list');
    setSelectedProcessId(null);
    if (onViewChange) {
      onViewChange('list');
    }
  };

  const activeCertifiers = useMemo(() => availableUsers.filter(u => (u.role === 'certificador' || u.role === 'admin') && u.isActive), [availableUsers]);
  const activeMappingProfiles = useMemo(() => mappingProfiles.filter(p => p.isActive), [mappingProfiles]);

  const isCurrentOrderLocked = selectedOrderGroup?.isFinalized || false;

  return (
    <div className="space-y-4">
      {view === 'list' ? (
        <>
          <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Filtrar procesos..." className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => { setEditingProcessId(null); setIsCreateModalOpen(true); }} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white">
                <PlusCircle className="h-4 w-4" /> Nuevo proceso
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-muted/20 shadow-sm overflow-hidden bg-white rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/5 h-14">
                  <TableRow>
                    <TableHead className="pl-8 text-[13px] font-black">Id / Nombre</TableHead>
                    <TableHead className="text-[13px] font-black">Propietario</TableHead>
                    <TableHead className="text-[13px] font-black">Creación</TableHead>
                    <TableHead className="text-[13px] font-black">Tipo</TableHead>
                    <TableHead className="text-[13px] font-black w-[150px]">Progreso</TableHead>
                    <TableHead className="text-right pr-8 text-[13px] font-black">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProcesses.map((p) => {
                    const owner = owners.find(o => o.id === p.ownerId);
                    const isLocked = p.status !== 'pending';
                    
                    return (
                      <TableRow key={p.id} className="group hover:bg-muted/5 border-b last:border-none transition-all">
                        <TableCell className="pl-8 py-5">
                          <div className="font-bold text-[11px] text-slate-600">{p.id}</div>
                          <div className="text-[11px] font-bold text-primary">{p.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="size-3.5 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{owner?.name || 'S/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-500">{format(new Date(p.creationDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge variant="outline" className="text-9px font-bold">{p.type}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-primary">{Math.round(p.progress)}%</span>
                            <Progress value={p.progress} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {isLocked ? (
                              <div className="h-9 w-9 flex items-center justify-center text-slate-600 bg-slate-50 rounded-xl">
                                <Lock className="h-4 w-4" />
                              </div>
                            ) : (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary" 
                                  onClick={() => handleEditProcess(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
                                    <div className="p-8 pt-10 text-center flex flex-col items-center">
                                      <div className="size-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                                        <AlertTriangle className="size-10" />
                                      </div>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-3xl font-black tracking-tighter text-slate-800 text-center">
                                          ¿Confirmar Eliminación?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm font-bold text-slate-400 text-center mt-2 px-4">
                                          Esta acción es irreversible. Se eliminará el proceso maestro <strong>{p.name}</strong> y todas sus vinculaciones.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                    </div>
                                    <AlertDialogFooter className="p-8 bg-slate-50 border-t flex-row gap-3">
                                      <AlertDialogCancel className="flex-1 h-12 rounded-full font-bold bg-white border-slate-200 text-slate-600 mt-0">
                                        CANCELAR
                                      </AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteProcess(p.id)} 
                                        className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 font-black text-white text-[10px] tracking-widest"
                                      >
                                        SÍ, ELIMINAR
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => handleEnterDetail(p)}><ChevronRight className="h-5 w-5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="border border-muted/20 shadow-sm bg-white rounded-2xl overflow-hidden mt-4">
             <CardContent className="p-0">
               <DataTablePagination totalRows={filteredProcesses.length} pageSize={itemsPerPage} onPageSizeChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
             </CardContent>
          </Card>
        </>
      ) : activeProcess ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-l-primary h-fit">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="text-lg font-black text-slate-800 truncate tracking-tighter">{activeProcess.name}</h3>
                  <Button variant="ghost" size="icon" onClick={handleGoBack} className="size-8 rounded-full hover:bg-slate-50"><X className="size-4" /></Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary opacity-70" />
                    <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 tracking-tighter uppercase">Creador</span><span className="text-xs font-bold text-slate-700 truncate">{activeProcess.createdBy?.name || "Admin"}</span></div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Users2 className="size-4 text-primary opacity-70" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 tracking-tighter uppercase">Responsable</span>
                      {activeProcessTeam.length === 0 ? (
                        <span className="text-xs font-bold text-slate-400 italic">Sin asignar</span>
                      ) : activeProcessTeam.length === 1 ? (
                        <span className="text-xs font-bold text-slate-700 truncate">{activeProcessTeam[0].name}</span>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs font-black text-primary uppercase tracking-tighter border-b border-primary/30 cursor-help hover:border-primary transition-colors">
                                multi usuarios
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-white border-none shadow-3xl p-3 rounded-2xl min-w-[180px]">
                              <div className="flex flex-col gap-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 mb-1">Equipo de certificación</p>
                                {activeProcessTeam.map(u => (
                                  <div key={u.id} className="flex items-center gap-2.5">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={u.avatar} />
                                      <AvatarFallback className="text-[8px] font-black bg-primary/5 text-primary">{u.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] font-bold text-slate-700">{u.name}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-slate-400" />
                    <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 tracking-tighter uppercase">Fecha</span><span className="text-xs font-bold text-slate-700">{format(new Date(activeProcess.certificationDate), 'dd/MM/yyyy')}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-slate-400" />
                    <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 tracking-tighter uppercase">Solicitadas</span><span className="text-xs font-black text-slate-800">{activeProcess.orders.reduce((acc, o) => acc + o.totalQuantity, 0).toLocaleString()}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-l-slate-800 h-fit">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("px-3 py-0.5 text-[9px] font-bold uppercase", activeProcess.status === 'completed' ? "bg-green-500 text-white" : "bg-amber-500 text-white")}>{activeProcess.status}</Badge>
                  <span className="text-xl font-black text-primary tracking-tighter">{Math.round(activeProcess.progress)}%</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-3 border-t border-slate-50">
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Unid. Listas</span><span className="text-sm font-black text-slate-800">{processStats?.unitsListas.toLocaleString()}</span></div>
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Unid. Parcial</span><span className="text-sm font-black text-slate-800">{processStats?.unitsParcial.toLocaleString()}</span></div>
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Unid. Pend.</span><span className="text-sm font-black text-slate-800">{processStats?.unitsPendiente.toLocaleString()}</span></div>
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cajas Listas</span><span className="text-sm font-black text-primary">{processStats?.certifiedBoxesCount.toLocaleString()}</span></div>
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cajas Parcial</span><span className="text-sm font-black text-amber-600">{processStats?.partialBoxesCount.toLocaleString()}</span></div>
                   <div className="flex flex-col gap-0.5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cajas Pend.</span><span className="text-sm font-black text-red-600">{processStats?.pendingBoxes.toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Filtrar pedidos vinculados..." className="pl-10 h-9 w-80 bg-slate-50 border-none font-bold text-xs" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => setIsImportModalOpen(true)} className="bg-primary font-black shadow-md shadow-primary/20 gap-2 px-6 rounded-lg h-9 text-xs text-white uppercase tracking-tighter">
                <FileSpreadsheet className="h-4 w-4" /> Cargar excel de pedidos
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10 h-12">
                  <TableRow>
                    <TableHead className="pl-6 text-[13px] font-black">Pedido / Po</TableHead>
                    <TableHead className="text-[13px] font-black">N° orden</TableHead>
                    <TableHead className="text-[13px] font-black">Cliente / NIT</TableHead>
                    <TableHead className="text-[13px] font-black">Punto / Código</TableHead>
                    <TableHead className="text-center text-[13px] font-black">Unidades / Cajas</TableHead>
                    <TableHead className="text-center text-[13px] font-black">Estado</TableHead>
                    <TableHead className="pr-6 text-right text-[13px] font-black">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order, idx) => (
                    <TableRow key={idx} className="group hover:bg-muted/5 h-16 transition-all">
                      <TableCell className="pl-6 font-bold text-[11px] text-slate-600">{order.id}</TableCell>
                      <TableCell className="font-bold text-[11px] text-slate-600">#{order.orderNumber}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px] text-slate-600 truncate max-w-[150px]">{order.customerName}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">NIT: {order.nit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px] text-slate-600 truncate max-w-[150px]">{order.storeName}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">PTO: {order.storeCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[12px] font-bold text-slate-600">{order.totalQuantity}</span>
                          <span className="text-[10px] font-bold text-primary tracking-tighter mt-0.5">({order.totalBoxes} Cajas)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-black px-2 uppercase border shadow-none", 
                          (order.status === 'pending' || order.status === 'cancelled') ? "text-red-600 bg-red-50 border-red-100" : 
                          order.status === 'partial' ? "text-amber-600 bg-amber-50 border-amber-100" : 
                          "text-green-600 bg-green-50 border-green-100")}>
                          {order.status === 'cancelled' ? 'anulado' : (order.isFinalized ? 'finalizado' : order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedOrderGroup(order); setIsGestionOpen(true); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setSelectedOrderGroup(order); setIsAssignOpen(true); }}><UserPlus className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={order.status !== 'pending'}><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[400px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white">
                              <div className="p-8 pt-10 text-center flex flex-col items-center">
                                <div className="size-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                                  <AlertTriangle className="size-10" />
                                </div>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-3xl font-black tracking-tighter text-slate-800 text-center">
                                    ¿Eliminar Pedido?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm font-bold text-slate-400 text-center mt-2 px-4">
                                    Se desvinculará el pedido <strong>{order.id}</strong> de este proceso maestro de forma permanente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                              </div>
                              <AlertDialogFooter className="p-8 bg-slate-50 border-t flex-row gap-3">
                                <AlertDialogCancel className="flex-1 h-12 rounded-full font-bold bg-white border-slate-200 text-slate-600 mt-0">
                                  CANCELAR
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOrder(order.id)} 
                                  className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 font-black text-white text-[10px] tracking-widest"
                                >
                                  SÍ, ELIMINAR
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="border border-muted/20 shadow-sm bg-white rounded-xl overflow-hidden mt-4">
             <CardContent className="p-0">
               <DataTablePagination totalRows={filteredOrders.length} pageSize={orderItemsPerPage} onPageSizeChange={(v) => { setOrderItemsPerPage(v); setOrderCurrentPage(1); }} currentPage={orderCurrentPage} totalPages={orderTotalPages} onPageChange={setOrderCurrentPage} />
             </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
           <DialogHeader className="p-8 pb-4">
             <div className="flex items-center gap-4">
                <div className="size-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <PackagePlus className="size-8" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">
                    {editingProcessId ? 'Editar' : 'Nuevo'} proceso maestro
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                    Contenedor para la gestión y trazabilidad de pedidos.
                  </DialogDescription>
                </div>
             </div>
           </DialogHeader>
           <div className="px-8 py-6 space-y-6">
              <div className="grid grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Nombre del proceso <span className="text-red-500">*</span></Label>
                  <input 
                    value={headerData.name} 
                    onChange={(e) => setHeaderData(f => ({...f, name: e.target.value}))} 
                    placeholder="Ej: Despachos Lunes" 
                    className="flex h-11 w-full rounded-full border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Propietario <span className="text-red-500">*</span></Label>
                  <Select value={headerData.ownerId} onValueChange={(v) => setHeaderData(f => ({...f, ownerId: v}))}>
                    <SelectTrigger className="rounded-full h-11 px-5 border-slate-200 font-bold bg-white shadow-sm">
                      <SelectValue placeholder="Dueño carga..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                      {owners.map(o => <SelectItem key={o.id} value={o.id} className="rounded-xl text-xs">{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Fecha certificación <span className="text-red-500">*</span></Label>
                  <input 
                    type="date" 
                    value={headerData.certificationDate} 
                    onChange={(e) => setHeaderData(f => ({...f, certificationDate: e.target.value}))} 
                    className="flex h-11 w-full rounded-full border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Tipo envío <span className="text-red-500">*</span></Label>
                  <Select value={headerData.type} onValueChange={(v: any) => setHeaderData(f => ({...f, type: v}))}>
                    <SelectTrigger className="rounded-full h-11 px-5 border-slate-200 font-bold bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                      <SelectItem value="Nacional" className="text-xs">Nacional</SelectItem>
                      <SelectItem value="Exportación" className="text-xs">Exportación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Nota / Observaciones</Label>
                <Textarea 
                  placeholder="Detalles adicionales del proceso..." 
                  value={headerData.notes} 
                  onChange={(e) => setHeaderData(f => ({...f, notes: e.target.value}))} 
                  className="rounded-[1.5rem] border-slate-200 font-medium bg-white shadow-sm min-h-[100px]" 
                />
              </div>
           </div>
           <DialogFooter className="p-8 bg-slate-50/50 border-t mt-4 gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsCreateModalOpen(false)} 
                className="rounded-full font-bold h-12 px-8 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 gap-2"
              >
                <X className="size-5" /> Cancelar
              </Button>
              <Button 
                onClick={handleCreateOrUpdateProcess} 
                className="bg-primary text-white rounded-full font-black h-12 px-10 shadow-xl shadow-primary/20 uppercase tracking-widest text-[10px] gap-2 hover:scale-[1.02] transition-transform"
              >
                <Save className="size-5" /> {editingProcessId ? 'Actualizar' : 'Guardar'} cabecera
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary"><FileSpreadsheet className="size-8" /></div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tighter">Importar pedidos</DialogTitle>
                <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carga masiva con validación técnica.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-8 py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase">Plantilla de homologación</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="h-14 font-black rounded-3xl border-slate-200 shadow-sm"><SelectValue placeholder="Seleccione plantilla operativa..." /></SelectTrigger>
                <SelectContent className="rounded-2xl shadow-3xl">{activeMappingProfiles.map(p => <SelectItem key={p.id} value={p.id} className="rounded-xl m-1">{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div {...getRootProps()} className={cn("border-2 border-dashed p-12 text-center rounded-[2.5rem] transition-all cursor-pointer", file ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50")}>
              <input {...getInputProps()} />
              <div className="space-y-3">
                <UploadCloud className="size-10 mx-auto text-slate-300" />
                <p className="font-black text-slate-700">{file ? file.name : "Suelte el archivo de pedidos aquí"}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Formato Excel .xlsx</p>
              </div>
            </div>

            {file && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-inner animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Contenido del archivo</p>
                    <p className="text-sm font-black text-slate-800 mt-1">
                      {previewOrdersCount} {previewOrdersCount === 1 ? 'Pedido detectado' : 'Pedidos detectados'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary text-white font-black text-[9px] px-3 py-1 rounded-full shadow-sm">LISTO</Badge>
              </div>
            )}
          </div>
          <DialogFooter className="p-8 bg-slate-50/50 border-t gap-3">
             <Button 
               variant="ghost" 
               onClick={handleCloseImportModal} 
               className="rounded-full font-bold h-12 flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 gap-2"
             >
               <X className="size-5" /> Cancelar
             </Button>
             <Button onClick={handleImportExcel} disabled={isLoading || !file || !selectedProfileId} className="bg-primary text-white rounded-full font-black h-12 flex-[2] shadow-xl shadow-primary/20 gap-2 uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform">
               {isLoading ? <Loader2 className="animate-spin size-5" /> : <CheckCircle2 className="size-5" />} Iniciar validación y carga
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedOrderGroup && (
        <OrderViewModal 
          isOpen={isGestionOpen}
          onClose={() => setIsGestionOpen(false)}
          orderGroup={selectedOrderGroup}
        />
      )}

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden bg-white border-none shadow-3xl">
           <DialogHeader className="p-8 pb-4">
             <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <UserCheck className="size-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-3xl font-black tracking-tighter text-slate-800">Asignar Responsable</DialogTitle>
                    {isCurrentOrderLocked && <Lock className="size-5 text-red-500" />}
                  </div>
                  <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Selecciona el operario único para este pedido.
                  </DialogDescription>
                </div>
             </div>
           </DialogHeader>
           
           <div className="flex-1 bg-slate-50/50 px-8 py-6 space-y-8">
              {isCurrentOrderLocked && (
                <Alert variant="destructive" className="rounded-3xl border-none bg-red-50 text-red-800">
                  <Lock className="size-4" />
                  <AlertTitle className="font-black text-xs">Certificación Cerrada</AlertTitle>
                  <AlertDescription className="text-[10px] font-bold">
                    Este pedido ya ha sido certificado (Parcial o Completo). No se permite el cambio de responsable por integridad de la trazabilidad.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="size-3.5" /> Responsable asignado
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {selectedOrderGroup?.assignedTo?.[0] ? (
                    (() => {
                      const u = availableUsers.find(user => user.id === selectedOrderGroup.assignedTo![0]);
                      return (
                        <Card className={cn("border shadow-sm rounded-2xl overflow-hidden bg-white group/user border-l-4", isCurrentOrderLocked ? "border-slate-200 border-l-slate-400 opacity-80" : "border-primary/20 border-l-primary")}>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-primary/10">
                                <AvatarImage src={u?.avatar} />
                                <AvatarFallback className="text-lg font-black bg-primary/5 text-primary">{u?.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-base font-black text-slate-800 leading-none">{u?.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{u?.role}</span>
                              </div>
                            </div>
                            {!isCurrentOrderLocked && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                onClick={handleClearAssignment}
                              >
                                <UserMinus className="size-5" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-white border border-dashed border-slate-200 rounded-[2rem]">
                      <UserIcon className="size-10 text-slate-100 mb-3" />
                      <p className="text-[11px] font-bold text-slate-400 italic">Pedido sin asignar a operario.</p>
                    </div>
                  )}
                </div>
              </div>

              {!isCurrentOrderLocked && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-700 pl-4 uppercase tracking-tighter">Seleccionar nuevo operario</Label>
                    <div className="flex items-center gap-3">
                      <Select 
                        value={selectedOrderGroup?.assignedTo?.[0] || ""} 
                        onValueChange={(val) => handleDirectAssign(val)}
                        disabled={isCurrentOrderLocked}
                      >
                        <SelectTrigger className="h-14 flex-1 rounded-[1.5rem] border-slate-200 shadow-sm font-black px-6 bg-white">
                          <SelectValue placeholder="Elige un responsable..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-3xl max-h-[300px]">
                          {activeCertifiers.map(u => {
                            const pendingCount = getUserPendingTasks(u.id);
                            return (
                              <SelectItem key={u.id} value={u.id} className="rounded-xl m-1 p-2">
                                <div className="flex items-center justify-between w-full min-w-[300px]">
                                  <div className="flex items-center gap-3">
                                     <Avatar className="h-7 w-7"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name[0]}</AvatarFallback></Avatar>
                                     <div className="flex flex-col">
                                        <span className="font-bold text-xs">{u.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{u.role}</span>
                                     </div>
                                  </div>
                                  {pendingCount > 0 && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 text-[8px] font-black ml-4">
                                      {pendingCount} PENDIENTES
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
           </div>

           <DialogFooter className="p-8 bg-white border-t gap-3">
              <Button 
                onClick={() => setIsAssignOpen(false)}
                className="bg-primary text-white rounded-full font-black h-12 px-10 shadow-xl shadow-primary/20 uppercase tracking-widest text-[10px] gap-2 w-full"
              >
                <CheckCircle2 className="size-5" /> Finalizar Asignación
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPanel;
