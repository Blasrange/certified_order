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
  ChevronDown,
  Check,
  GitCompare,
  Building2,
  ScanBarcode,
  Keyboard,
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
import type { AppRole, GroupedOrder, MappingProfile, OrderGroup, User, Store, Customer, Material, Owner } from "@/lib/types";
import { mockCustomers, mockMaterials, mockUsers, mockStores, mockOwners, mockRoles } from "@/lib/data";
import { persistGroupedProcesses } from "@/lib/app-data-client";
import { useFilteredAppData } from "../../hooks/use-filtered-app-data";
import OrderViewModal from "./OrderViewModal";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface OrdersPanelProps {
  externalView?: 'list' | 'detail';
  onViewChange?: (view: 'list' | 'detail', name?: string) => void;
}

type ImportPreviewRow = {
  id: string;
  pedidoId: string;
  nit: string;
  storeInput: string;
  storeLabel: string;
  sku: string;
  skuLabel: string;
  customerExists: boolean;
  storeExists: boolean;
  skuExists: boolean;
};

const normalizeId = (val: any) => {
  if (val === undefined || val === null) return "";
  return String(val).trim().toLowerCase();
};

const normalizeExcelValue = (val: any) => {
  if (val === undefined || val === null) return "";

  return String(val)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.0+$/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
};

const normalizeDocumentLikeValue = (val: any) => {
  return normalizeExcelValue(val).replace(/[^a-z0-9]/g, "");
};

const normalizeRoleValue = (val: string | undefined | null) => normalizeId(val);

const resolveStoreForImportRow = (
  storesSource: Store[],
  normalizedNit: string,
  normalizedStoreCode: string,
) => {
  const storesForCustomer = storesSource.filter(
    (store) => normalizeDocumentLikeValue(store.customerNit) === normalizedNit,
  );

  return storesForCustomer.find(
    (store) => normalizeDocumentLikeValue(store.code) === normalizedStoreCode,
  )
    || storesSource.find((store) => normalizeDocumentLikeValue(store.code) === normalizedStoreCode)
    || (storesForCustomer.length === 1 ? storesForCustomer[0] : undefined);
};

const filterBootstrapDataForUser = (
  data: {
    owners: Owner[];
    customers: Customer[];
    stores: Store[];
    materials: Material[];
  },
  currentUser: User | null,
) => {
  if (!currentUser) {
    return {
      owners: [] as Owner[],
      customers: [] as Customer[],
      stores: [] as Store[],
      materials: [] as Material[],
    };
  }

  if (currentUser.isSystemAdmin || currentUser.role === 'admin') {
    return data;
  }

  const allowedOwnerIds = new Set((currentUser.ownerIds || []).filter(Boolean));

  return {
    owners: data.owners.filter((owner) => allowedOwnerIds.has(owner.id)),
    customers: data.customers.filter((customer) => customer.ownerId && allowedOwnerIds.has(customer.ownerId)),
    stores: data.stores.filter((store) => store.ownerId && allowedOwnerIds.has(store.ownerId)),
    materials: data.materials.filter((material) => material.ownerId && allowedOwnerIds.has(material.ownerId)),
  };
};

// Modal de selección de propietario
const OwnerSelectionModal = ({ 
  owners, 
  selectedId, 
  onConfirm, 
  onCancel 
}: { 
  owners: Owner[], 
  selectedId: string | null, 
  onConfirm: (id: string) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedId);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSelectOwner = (ownerId: string) => {
    setTempSelectedId(ownerId);
  };

  const filteredOwners = useMemo(() => {
    return owners.filter(o => 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.nit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [owners, searchTerm]);

  const totalPages = Math.ceil(filteredOwners.length / itemsPerPage);
  const paginatedOwners = useMemo(() => 
    filteredOwners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredOwners, currentPage, itemsPerPage]);

  const handleConfirm = () => {
    if (tempSelectedId) {
      onConfirm(tempSelectedId);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                Seleccionar propietario
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecciona el propietario del proceso
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre o NIT..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                      Sel.
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Nombre / NIT
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Contacto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOwners.map((owner) => {
                    const isSelected = tempSelectedId === owner.id;
                    return (
                      <TableRow 
                        key={owner.id} 
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => handleSelectOwner(owner.id)}
                      >
                        <TableCell className="pl-5 py-3">
                          <div className={cn(
                            "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="size-3 text-white" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-slate-800")}>
                              {owner.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">NIT: {owner.nit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600">{owner.email || 'No registrado'}</span>
                            <span className="text-[10px] text-slate-400">{owner.phone || 'Sin teléfono'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedOwners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Building2 className="size-10 mb-2 text-slate-300" />
                          <p className="text-sm font-medium">No se encontraron propietarios</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredOwners.length}
                pageSize={itemsPerPage}
                onPageSizeChange={setItemsPerPage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 gap-3">
          <Button variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!tempSelectedId}
            className="dialog-btn-primary"
          >
            <Check className="size-4 mr-2" /> Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Modal de selección de plantilla de homologación
const MappingProfileSelectionModal = ({ 
  profiles, 
  selectedId, 
  onConfirm, 
  onCancel 
}: { 
  profiles: MappingProfile[], 
  selectedId: string | null, 
  onConfirm: (id: string) => void, 
  onCancel: () => void 
}) => {
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedId);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSelectProfile = (profileId: string) => {
    setTempSelectedId(profileId);
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = useMemo(() => 
    filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredProfiles, currentPage, itemsPerPage]);

  const handleConfirm = () => {
    if (tempSelectedId) {
      onConfirm(tempSelectedId);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden bg-white shadow-xl border border-slate-100">
        <DialogHeader className="p-6 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
              <GitCompare className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                Seleccionar plantilla
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecciona la plantilla de homologación para la importación
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar plantilla..." 
              className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                      Sel.
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Nombre
                    </TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProfiles.map((profile) => {
                    const isSelected = tempSelectedId === profile.id;
                    return (
                      <TableRow 
                        key={profile.id} 
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-50",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => handleSelectProfile(profile.id)}
                      >
                        <TableCell className="pl-5 py-3">
                          <div className={cn(
                            "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="size-3 text-white" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-slate-800")}>
                              {profile.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", 
                            profile.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                          )}>
                            {profile.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedProfiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <GitCompare className="size-10 mb-2 text-slate-300" />
                          <p className="text-sm font-medium">No se encontraron plantillas</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredProfiles.length}
                pageSize={itemsPerPage}
                onPageSizeChange={setItemsPerPage}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 gap-3">
          <Button variant="ghost" onClick={onCancel} className="dialog-btn-secondary">
            <X className="size-4" /> Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!tempSelectedId}
            className="dialog-btn-primary"
          >
            <Check className="size-4 mr-2" /> Confirmar selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OrdersPanel = ({ externalView, onViewChange }: OrdersPanelProps) => {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const appData = useFilteredAppData(currentUser);
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
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  
  // Estados para modales
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (externalView) {
      setView(externalView);
      if (externalView === 'list') {
        setSelectedProcessId(null);
      }
    }
  }, [externalView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearchTerm]);

  useEffect(() => {
    setProcesses(appData.groupedProcesses);
    setMappingProfiles(appData.mappingProfiles);
    setAvailableUsers(appData.users.length > 0 ? appData.users : mockUsers);
    setRoles(appData.roles.length > 0 ? appData.roles : mockRoles);
    setStores(appData.stores.length > 0 ? appData.stores : mockStores);
    setCustomers(appData.customers.length > 0 ? appData.customers : mockCustomers);
    setMaterials(appData.materials.length > 0 ? appData.materials : mockMaterials);
    setOwners(appData.owners.length > 0 ? appData.owners : mockOwners);
  }, [appData]);

  const saveToStorage = (updatedProcesses: GroupedOrder[]) => {
    setProcesses(updatedProcesses);
    void persistGroupedProcesses(updatedProcesses)
      .then((syncedProcesses) => {
        if (Array.isArray(syncedProcesses)) {
          setProcesses(syncedProcesses);
        }
        void appData.refresh();
      })
      .catch((error) => {
        console.error('No se pudo sincronizar procesos.', error);
        toast({ variant: "destructive", title: "Sincronización pendiente", description: "Los cambios del proceso se aplicaron localmente, pero no fue posible sincronizarlos con la base de datos." });
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

  const roleById = useMemo(
    () => new Map(roles.map((role) => [normalizeRoleValue(role.id), role])),
    [roles]
  );

  const resolveRoleLabel = useCallback(
    (roleValue: string | undefined) => {
      const normalizedRole = normalizeRoleValue(roleValue);
      const role =
        roleById.get(normalizedRole) ||
        roles.find((item) => normalizeRoleValue(item.name) === normalizedRole);

      return role?.name || roleValue || 'Sin rol';
    },
    [roleById, roles]
  );

  const canAssignToOrder = useCallback(
    (user: User) => {
      if (!user.isActive) {
        return false;
      }

      const normalizedRole = normalizeRoleValue(user.role);
      if (normalizedRole === 'admin' || normalizedRole === 'certificador') {
        return true;
      }

      const role =
        roleById.get(normalizedRole) ||
        roles.find((item) => normalizeRoleValue(item.name) === normalizedRole);

      if (!role?.isActive) {
        return false;
      }

      const normalizedRoleName = normalizeRoleValue(role.name);
      if (normalizedRoleName === 'administrador' || normalizedRoleName === 'certificador') {
        return true;
      }

      return role.permissions.some(
        (permission) =>
          permission.moduleId === 'tasks' &&
          (permission.permissions.view || permission.permissions.edit)
      );
    },
    [roleById, roles]
  );

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
    type: "Nacional" as "Nacional" | "Exportación",
    operationMode: "automatic-quantity" as "manual" | "automatic-blind" | "automatic-quantity",
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
      toast({ title: "Proceso actualizado", description: `La información del proceso ${headerData.name} fue guardada correctamente.` });
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
      toast({ title: "Proceso creado", description: `El proceso ${headerData.name} fue creado correctamente.` });
    }
    
    saveToStorage(updated);
    setIsCreateModalOpen(false);
    setEditingProcessId(null);
    setHeaderData({
      name: "",
      type: "Nacional",
      operationMode: "automatic-quantity",
      certificationDate: format(new Date(), 'yyyy-MM-dd'),
      ownerId: owners[0]?.id || "",
      notes: "",
      hasBalances: false,
    });
  };

  const handleDeleteProcess = (processId: string) => {
    const updated = processes.filter(p => p.id !== processId);
    saveToStorage(updated);
    toast({ title: "Proceso eliminado", description: "El proceso y sus tareas asociadas fueron eliminados correctamente." });
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
      operationMode: p.operationMode || 'automatic-quantity',
      ownerId: p.ownerId || "",
      certificationDate: p.certificationDate,
      notes: p.notes || "",
      hasBalances: p.hasBalances,
    });
    setIsCreateModalOpen(true);
  };

  const handleOwnerConfirm = (ownerId: string) => {
    setHeaderData(prev => ({ ...prev, ownerId }));
    setIsOwnerModalOpen(false);
  };

  const handleProfileConfirm = (profileId: string) => {
    setSelectedProfileId(profileId);
    setIsProfileModalOpen(false);
  };

  const selectedOwner = owners.find(o => o.id === headerData.ownerId);
  const selectedProfile = mappingProfiles.find(p => p.id === selectedProfileId);

  const buildImportPreview = useCallback(async (selectedFile: File, profileId: string) => {
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!profileId) {
        setPreviewOrdersCount(jsonData.length);
        setImportPreviewRows([]);
        return;
      }

      const profile = mappingProfiles.find((item) => item.id === profileId);
      if (!profile) {
        setPreviewOrdersCount(jsonData.length);
        setImportPreviewRows([]);
        return;
      }

      const pedidoField = profile.fields.pedido;
      const uniquePedidos = new Set(jsonData.map((row: any) => String(row[pedidoField] || '')));
      setPreviewOrdersCount(uniquePedidos.size);

      const previewRows = jsonData.slice(0, 12).map((row: any, index) => {
        const pedidoId = String(row[profile.fields.pedido] || 'S/N').trim();
        const nit = String(row[profile.fields.nit] || 'S/N').trim();
        const sku = String(row[profile.fields.sku] || '').trim();
        const storeInput = String(row[profile.fields.codigoTienda] || '').trim();

        const normalizedNit = normalizeDocumentLikeValue(nit);
        const normalizedStoreCode = normalizeDocumentLikeValue(storeInput);

        const customer = customers.find((item) => normalizeDocumentLikeValue(item.nit) === normalizedNit);
        const matchedStore = resolveStoreForImportRow(stores, normalizedNit, normalizedStoreCode);
        const material = materials.find((item) => normalizeId(item.code) === normalizeId(sku));

        return {
          id: `${pedidoId}-${sku}-${index}`,
          pedidoId,
          nit,
          storeInput,
          storeLabel: matchedStore ? `${matchedStore.name} (${matchedStore.code})` : 'No encontrado',
          sku,
          skuLabel: material ? material.description : 'No encontrado',
          customerExists: Boolean(customer),
          storeExists: Boolean(matchedStore),
          skuExists: Boolean(material),
        } satisfies ImportPreviewRow;
      });

      setImportPreviewRows(previewRows);
    } catch (error) {
      console.error('Error al construir la previsualización de importación.', error);
      setPreviewOrdersCount(0);
      setImportPreviewRows([]);
    }
  }, [customers, mappingProfiles, materials, stores]);

  useEffect(() => {
    if (!file) {
      setPreviewOrdersCount(0);
      setImportPreviewRows([]);
      return;
    }

    void buildImportPreview(file, selectedProfileId);
  }, [buildImportPreview, file, selectedProfileId]);

  const handleImportExcel = async () => {
    if (!file || !selectedProfileId) {
      toast({ variant: "destructive", title: "Datos incompletos para importar", description: "Selecciona una plantilla de homologación y un archivo Excel antes de continuar." });
      return;
    }

    setIsLoading(true);
    const profile = mappingProfiles.find(p => p.id === selectedProfileId);
    if (!profile) { setIsLoading(false); return; }

    let storesSource = stores;
    let customersSource = customers;
    let materialsSource = materials;

    try {
      const bootstrapResponse = await fetch('/api/app-data/bootstrap', { cache: 'no-store' });
      const bootstrapPayload = (await bootstrapResponse.json().catch(() => null)) as {
        owners?: Owner[];
        customers?: Customer[];
        stores?: Store[];
        materials?: Material[];
        error?: string;
      } | null;

      if (!bootstrapResponse.ok) {
        throw new Error(bootstrapPayload?.error || 'No se pudieron cargar las tablas maestras para validar la importación.');
      }

      const filteredMasterData = filterBootstrapDataForUser(
        {
          owners: bootstrapPayload?.owners || [],
          customers: bootstrapPayload?.customers || [],
          stores: bootstrapPayload?.stores || [],
          materials: bootstrapPayload?.materials || [],
        },
        currentUser,
      );

      storesSource = filteredMasterData.stores;
      customersSource = filteredMasterData.customers;
      materialsSource = filteredMasterData.materials;
    } catch (error) {
      console.error('No se pudieron recargar las tablas maestras antes de importar.', error);
    }

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

          const normalizedNit = normalizeDocumentLikeValue(nit);
          const normalizedStoreCode = normalizeDocumentLikeValue(storeCodeInExcel);

          const customer = customersSource.find(c => normalizeDocumentLikeValue(c.nit) === normalizedNit);
          if (!customer) invalidCustomers.add(nit);

          const matchedStore = resolveStoreForImportRow(storesSource, normalizedNit, normalizedStoreCode);

          if (!matchedStore) invalidStores.add(`NIT:${nit}-PTO:${storeCodeInExcel}`);

          const material = materialsSource.find(m => normalizeId(m.code) === normalizeId(sku));
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
          toast({ variant: "destructive", title: "Pedido ya registrado", description: `El pedido ${Array.from(duplicatedPedidoIds)[0]} ya existe en el proceso o en otro proceso cargado.` });
          setIsLoading(false); return;
        }

        if (missingSkus.size > 0 || invalidCustomers.size > 0 || invalidStores.size > 0) {
          const skuError = missingSkus.size > 0 ? `SKUs faltantes: ${Array.from(missingSkus).slice(0, 5).join(", ")}.` : "";
          const custError = invalidCustomers.size > 0 ? `Clientes no encontrados por NIT.` : "";
          const storeError = invalidStores.size > 0 ? `Puntos de entrega no encontrados: ${Array.from(invalidStores).slice(0, 3).join(" | ")}.` : "";
          toast({ variant: "destructive", title: "Inconsistencias en los datos importados", description: `${skuError} ${custError} ${storeError} Revisa las tablas maestras antes de volver a importar.`.trim() });
          setIsLoading(false); return;
        }

        const newOrders = Array.from(groupedMap.values());
        if (selectedProcessId) {
          const updated = processes.map(p => 
            p.id === selectedProcessId ? { ...p, orders: [...p.orders, ...newOrders], status: 'in-progress' as const } : p
          );
          saveToStorage(updated);
          toast({ title: "Pedidos importados", description: `Se vincularon ${newOrders.length} pedidos al proceso seleccionado.` });
        }
        
        setFile(null);
        setPreviewOrdersCount(0);
        setImportPreviewRows([]);
        setSelectedProfileId("");
        setIsImportModalOpen(false);
      } catch (err) {
        toast({ variant: "destructive", title: "No fue posible procesar el archivo", description: "Verifica la estructura del Excel y la plantilla seleccionada antes de intentarlo nuevamente." });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { 
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }, maxFiles: 1 });

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setFile(null);
    setPreviewOrdersCount(0);
    setImportPreviewRows([]);
    setSelectedProfileId("");
  };

  const handleResetImportedFile = () => {
    setFile(null);
    setPreviewOrdersCount(0);
    setImportPreviewRows([]);
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
    toast({ title: "Pedido eliminado", description: `El pedido ${orderId} fue retirado correctamente del proceso.` });
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
    toast({ title: "Responsable asignado", description: "La certificación quedó asignada correctamente al usuario seleccionado." });
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
    toast({ title: "Asignación eliminada", description: "La certificación quedó sin responsable asignado." });
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

  const activeCertifiers = useMemo(
    () => availableUsers.filter(canAssignToOrder),
    [availableUsers, canAssignToOrder]
  );
  const activeMappingProfiles = useMemo(() => mappingProfiles.filter(p => p.isActive), [mappingProfiles]);

  const isCurrentOrderLocked = selectedOrderGroup?.isFinalized || false;

  return (
    <div className="space-y-4">
      {view === 'list' ? (
        <>
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar proceso por ID o nombre..." 
                    className="pl-10 h-10 w-80 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>
              <Button 
                onClick={() => {
                  setEditingProcessId(null);
                  setHeaderData({
                    name: "",
                    type: "Nacional",
                    operationMode: "automatic-quantity",
                    certificationDate: format(new Date(), 'yyyy-MM-dd'),
                    ownerId: owners[0]?.id || "",
                    notes: "",
                    hasBalances: false,
                  });
                  setIsCreateModalOpen(true);
                }} 
                className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
              >
                <PlusCircle className="h-4 w-4" /> Nuevo proceso
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm overflow-hidden bg-white rounded-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID / Nombre</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Propietario</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Creación</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                    <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[150px]">Progreso</TableHead>
                    <TableHead className="pr-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProcesses.map((p) => {
                    const owner = owners.find(o => o.id === p.ownerId);
                    const isLocked = p.status !== 'pending';
                    
                    return (
                      <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="pl-6 py-4">
                          <div className="text-sm font-bold text-slate-800">{p.name}</div>
                          <div className="mt-1 text-[10px] font-semibold text-primary">
                            {p.dbId ? `ID interno #${p.dbId}` : 'ID interno pendiente de sincronización'}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="size-3.5 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600">{owner?.name || 'Sin asignar'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-xs font-semibold text-slate-500">{format(new Date(p.creationDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-primary">{Math.round(p.progress)}%</span>
                            </div>
                            <Progress value={p.progress} className="h-1.5 bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {isLocked ? (
                              <div className="h-8 w-8 flex items-center justify-center text-slate-400">
                                <Lock className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10" 
                                        onClick={() => handleEditProcess(p)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
                                    <div className="p-6 pt-8 text-center">
                                      <div className="size-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
                                        <AlertTriangle className="size-8" />
                                      </div>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold text-slate-800">
                                          ¿Eliminar proceso?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm text-slate-500 mt-2">
                                          Esta acción eliminará permanentemente <strong className="text-slate-700">{p.name}</strong> y todos sus pedidos asociados.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                    </div>
                                    <AlertDialogFooter className="p-4 bg-slate-50 border-t flex-row gap-2">
                                      <AlertDialogCancel className="flex-1 h-10 rounded-xl font-medium border border-slate-200 hover:bg-slate-100">
                                        <X className="size-5" />Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteProcess(p.id)} 
                                        className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 font-medium"
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" 
                                    onClick={() => handleEnterDetail(p)}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ingresar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredProcesses.length} 
                pageSize={itemsPerPage} 
                onPageSizeChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </CardContent>
          </Card>
        </>
      ) : activeProcess ? (
        <div className="space-y-4">
          {/* Primera fila - Info del proceso y estadísticas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-slate-100 shadow-sm rounded-xl bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{activeProcess.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {activeProcess.dbId ? `ID interno #${activeProcess.dbId}` : 'ID interno pendiente de sincronización'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-8 w-8 rounded-lg hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Creador</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{activeProcess.createdBy?.name || "Admin"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Equipo</p>
                    {activeProcessTeam.length === 0 ? (
                      <p className="text-sm text-slate-400 italic mt-0.5">Sin asignar</p>
                    ) : activeProcessTeam.length === 1 ? (
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{activeProcessTeam[0].name}</p>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-semibold text-primary cursor-help mt-0.5">{activeProcessTeam.length} usuarios</p>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white border border-slate-100 shadow-lg p-3 rounded-xl">
                            <div className="space-y-2">
                              {activeProcessTeam.map(u => (
                                <div key={u.id} className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{u.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-slate-700">{u.name}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{format(new Date(activeProcess.certificationDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Solicitadas</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{activeProcess.orders.reduce((acc, o) => acc + o.totalQuantity, 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm rounded-xl bg-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-full",
                    activeProcess.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {activeProcess.status === 'completed' ? 'Completado' : 'En progreso'}
                  </Badge>
                  <span className="text-2xl font-bold text-primary">{Math.round(activeProcess.progress)}%</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Unid. Listas</p>
                    <p className="text-base font-bold text-emerald-600 mt-1">{processStats?.unitsListas.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Unid. Parcial</p>
                    <p className="text-base font-bold text-amber-600 mt-1">{processStats?.unitsParcial.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Unid. Pend.</p>
                    <p className="text-base font-bold text-red-500 mt-1">{processStats?.unitsPendiente.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Cajas Listas</p>
                    <p className="text-base font-bold text-emerald-600 mt-1">{processStats?.certifiedBoxesCount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Cajas Parcial</p>
                    <p className="text-base font-bold text-amber-600 mt-1">{processStats?.partialBoxesCount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Cajas Pend.</p>
                    <p className="text-base font-bold text-red-500 mt-1">{processStats?.pendingBoxes.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por pedido, cliente o NIT..." 
                    className="pl-10 h-10 w-80 bg-slate-50 border-slate-200 text-sm font-medium rounded-xl" 
                    value={orderSearchTerm} 
                    onChange={(e) => setOrderSearchTerm(e.target.value)} 
                  />
                </div>
              </div>
              <Button 
                onClick={() => setIsImportModalOpen(true)} 
                className="bg-gradient-to-r from-[#1d57b7] to-[#1a4a9e] text-white shadow-md shadow-primary/20 gap-2 px-5 rounded-xl h-10 text-sm font-semibold"
              >
                <FileSpreadsheet className="h-4 w-4" /> Importar pedidos
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="pl-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Pedido / PO</TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Orden</TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / NIT</TableHead>
                    <TableHead className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Punto de Venta</TableHead>
                    <TableHead className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Unidades / Cajas</TableHead>
                    <TableHead className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="pr-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order, idx) => (
                    <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <TableCell className="pl-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-600">{order.id}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-xs font-semibold text-slate-600">#{order.orderNumber}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{order.customerName}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIT: {order.nit}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{order.storeName}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Cód: {order.storeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{order.totalQuantity.toLocaleString()}</p>
                          <p className="text-[10px] font-semibold text-primary mt-0.5">{order.totalBoxes} cajas</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full", 
                          (order.status === 'pending' || order.status === 'cancelled') ? "bg-red-50 text-red-600 border border-red-100" : 
                          order.status === 'partial' ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                          "bg-emerald-50 text-emerald-600 border border-emerald-100")}>
                          {order.status === 'cancelled' ? 'Anulado' : (order.isFinalized ? 'Finalizado' : order.status === 'partial' ? 'Parcial' : 'Pendiente')}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                                  onClick={() => { setSelectedOrderGroup(order); setIsGestionOpen(true); }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalles</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                                  onClick={() => { setSelectedOrderGroup(order); setIsAssignOpen(true); }}
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Asignar responsable</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                disabled={order.status !== 'pending'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
                              <div className="p-6 pt-8 text-center">
                                <div className="size-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
                                  <AlertTriangle className="size-8" />
                                </div>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl font-bold text-slate-800">
                                    ¿Eliminar pedido?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-slate-500 mt-2">
                                    Se desvinculará el pedido <strong className="text-slate-700">{order.id}</strong> de este proceso.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                              </div>
                              <AlertDialogFooter className="p-4 bg-slate-50 border-t flex-row gap-2">
                                <AlertDialogCancel className="flex-1 h-10 rounded-xl font-medium border border-slate-200 hover:bg-slate-50">
                                  <X className="size-5" /> Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteOrder(order.id)} 
                                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 font-medium"
                                >
                                  Eliminar
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
          
          <Card className="border border-slate-100 shadow-sm bg-white rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <DataTablePagination 
                totalRows={filteredOrders.length} 
                pageSize={orderItemsPerPage} 
                onPageSizeChange={(v) => { setOrderItemsPerPage(v); setOrderCurrentPage(1); }} 
                currentPage={orderCurrentPage} 
                totalPages={orderTotalPages} 
                onPageChange={setOrderCurrentPage} 
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Modal de creación de proceso - con modal de propietario */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="flex w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-xl">
          <DialogHeader className="shrink-0 p-4 pb-2 sm:px-5 sm:pt-5 sm:pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <PackagePlus className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {editingProcessId ? 'Editar' : 'Nuevo'} proceso
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configura la cabecera del proceso maestro
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nombre del proceso <span className="text-red-500">*</span></Label>
                <Input 
                  value={headerData.name} 
                  onChange={(e) => setHeaderData(f => ({...f, name: e.target.value}))} 
                  placeholder="Ej: Despachos Lunes" 
                  className="h-10 rounded-xl border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Propietario <span className="text-red-500">*</span></Label>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsOwnerModalOpen(true)}
                  className="w-full h-10 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="size-4 text-primary/70" />
                    <span className="text-sm font-medium text-slate-700">
                      {selectedOwner?.name || "Seleccionar propietario"}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-slate-400" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Fecha certificación <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={headerData.certificationDate} 
                  onChange={(e) => setHeaderData(f => ({...f, certificationDate: e.target.value}))} 
                  className="h-10 rounded-xl" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo envío <span className="text-red-500">*</span></Label>
                <Select value={headerData.type} onValueChange={(v: any) => setHeaderData(f => ({...f, type: v}))}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Nacional">Nacional</SelectItem>
                    <SelectItem value="Exportación">Exportación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-[linear-gradient(135deg,_#f8fbff_0%,_#ffffff_48%,_#f8fafc_100%)] p-3.5 shadow-sm">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Modo operativo del proceso <span className="text-red-500">*</span></Label>
                  <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                    Esta configuración se aplicará a todas las certificaciones del proceso y se mantendrá fija durante su operación.
                  </p>
                </div>
                <Badge className="w-fit rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {headerData.operationMode === 'manual'
                    ? 'Modo manual fijo'
                    : headerData.operationMode === 'automatic-blind'
                      ? 'Automático ciego'
                      : 'Automático con cantidades'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2.5 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setHeaderData((current) => ({ ...current, operationMode: 'automatic-blind' }))}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    headerData.operationMode === 'automatic-blind'
                      ? "border-primary bg-white shadow-md shadow-primary/10 ring-2 ring-primary/10"
                      : "border-slate-200 bg-white/80 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ScanBarcode className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">Automático ciego</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Solo escaneo. No muestra cantidades por SKU durante la operación.</p>
                      </div>
                    </div>
                    <div className={cn(
                      "mt-0.5 size-3.5 rounded-full border-2 shrink-0",
                      headerData.operationMode === 'automatic-blind' ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                    )} />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderData((current) => ({ ...current, operationMode: 'automatic-quantity' }))}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    headerData.operationMode === 'automatic-quantity'
                      ? "border-sky-500 bg-white shadow-md shadow-sky-100 ring-2 ring-sky-100"
                      : "border-slate-200 bg-white/80 hover:border-sky-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                        <Package className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">Automático con cantidades</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Solo escaneo, pero mostrando cantidades e información del SKU.</p>
                      </div>
                    </div>
                    <div className={cn(
                      "mt-0.5 size-3.5 rounded-full border-2 shrink-0",
                      headerData.operationMode === 'automatic-quantity' ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                    )} />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderData((current) => ({ ...current, operationMode: 'manual' }))}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    headerData.operationMode === 'manual'
                      ? "border-emerald-500 bg-white shadow-md shadow-emerald-100 ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white/80 hover:border-emerald-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Keyboard className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">Manual</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">La certificación trabajará siempre con digitación manual y validación directa en pantalla.</p>
                      </div>
                    </div>
                    <div className={cn(
                      "mt-0.5 size-3.5 rounded-full border-2 shrink-0",
                      headerData.operationMode === 'manual' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                    )} />
                  </div>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Notas / Observaciones</Label>
              <Textarea 
                placeholder="Detalles adicionales..." 
                value={headerData.notes} 
                onChange={(e) => setHeaderData(f => ({...f, notes: e.target.value}))} 
                className="rounded-xl border-slate-200 min-h-[64px]" 
              />
            </div>
            </div>
          </div>
          
          <DialogFooter className="shrink-0 border-t bg-slate-50 p-4 gap-2 sm:px-5 sm:py-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="dialog-btn-secondary">
              <X className="size-5" /> Cancelar
            </Button>
            <Button onClick={handleCreateOrUpdateProcess} className="dialog-btn-primary">
              <Save className="h-4 w-4 mr-2" /> {editingProcessId ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de importación - con modal de plantilla */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] rounded-2xl p-0 overflow-hidden bg-white shadow-xl flex flex-col w-[calc(100vw-1rem)]">
          <DialogHeader className="shrink-0 p-4 pb-2 sm:px-5 sm:pt-5 sm:pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">Importar pedidos</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">Carga masiva desde Excel</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-4 py-3 sm:px-5 sm:py-4 flex-1 overflow-hidden">
            <div className="space-y-3 h-full min-h-0 flex flex-col">
            <div className="space-y-1.5 shrink-0">
              <Label className="text-xs font-semibold text-slate-700">Plantilla de homologación</Label>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsProfileModalOpen(true)}
                className="w-full h-10 rounded-xl border-slate-200 bg-white px-4 justify-between hover:bg-slate-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <GitCompare className="size-4 text-primary/70" />
                  <span className="text-sm font-medium text-slate-700">
                    {selectedProfile?.name || "Seleccionar plantilla"}
                  </span>
                </div>
                <ChevronDown className="size-4 text-slate-400" />
              </Button>
            </div>
            
            {!file ? (
              <div {...getRootProps()} className="shrink-0 border-2 border-dashed border-slate-200 bg-slate-50 hover:border-primary/50 p-6 text-center rounded-xl transition-all cursor-pointer">
                <input {...getInputProps()} />
                <UploadCloud className="size-7 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">Arrastra o haz clic para subir</p>
                <p className="text-[10px] text-slate-400 mt-1">.xlsx</p>
              </div>
            ) : (
              <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                    <p className="text-[10px] text-slate-400">Archivo cargado correctamente. El área de carga se oculta para dejar más espacio a la validación.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={handleResetImportedFile} className="h-8 rounded-xl border-slate-200 text-xs font-semibold shrink-0">
                  Reemplazar archivo
                </Button>
              </div>
            )}

            {file && previewOrdersCount > 0 && (
              <div className="shrink-0 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">{previewOrdersCount} pedidos detectados</span>
                </div>
                <Badge className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full">Listo</Badge>
              </div>
            )}

            {file && !selectedProfileId && (
              <Alert className="shrink-0 rounded-xl bg-amber-50 border-amber-100 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-xs font-bold text-amber-700">Selecciona una plantilla</AlertTitle>
                <AlertDescription className="text-[10px] text-amber-600">
                  Para validar SKU y punto de entrega en la tabla previa, primero selecciona la plantilla de homologación.
                </AlertDescription>
              </Alert>
            )}

            {importPreviewRows.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white flex-1 min-h-0 flex flex-col">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Previsualización de validación</p>
                    <p className="text-[10px] text-slate-400">Se muestran las primeras {importPreviewRows.length} filas del archivo con validación de SKU y tienda.</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-none">SKU OK: {importPreviewRows.filter((row) => row.skuExists).length}</Badge>
                    <Badge className="bg-sky-50 text-sky-700 border border-sky-100 shadow-none">Tienda OK: {importPreviewRows.filter((row) => row.storeExists).length}</Badge>
                  </div>
                </div>
                <div className="flex-1 min-h-[220px] max-h-[42vh] overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="pl-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pedido</TableHead>
                        <TableHead className="py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIT</TableHead>
                        <TableHead className="py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tienda Excel</TableHead>
                        <TableHead className="py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado tienda</TableHead>
                        <TableHead className="py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU</TableHead>
                        <TableHead className="pr-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado SKU</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreviewRows.map((row) => (
                        <TableRow key={row.id} className="border-b border-slate-50 align-top">
                          <TableCell className="pl-4 py-2.5">
                            <div className="text-xs font-bold text-slate-700">{row.pedidoId}</div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-[11px] font-medium text-slate-600">{row.nit}</div>
                            <Badge className={cn(
                              "mt-1 border shadow-none text-[9px] px-2 py-0.5 rounded-full",
                              row.customerExists ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100",
                            )}>
                              {row.customerExists ? 'Cliente OK' : 'Cliente no existe'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-[11px] font-semibold text-slate-700">{row.storeInput || 'S/N'}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{row.storeLabel}</div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge className={cn(
                              "border shadow-none text-[9px] px-2 py-0.5 rounded-full",
                              row.storeExists ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100",
                            )}>
                              {row.storeExists ? 'Tienda OK' : 'Tienda no existe'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-[11px] font-semibold text-slate-700">{row.sku || 'S/N'}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{row.skuLabel}</div>
                          </TableCell>
                          <TableCell className="pr-4 py-2.5">
                            <Badge className={cn(
                              "border shadow-none text-[9px] px-2 py-0.5 rounded-full",
                              row.skuExists ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100",
                            )}>
                              {row.skuExists ? 'SKU OK' : 'SKU no existe'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            </div>
          </div>
          
          <DialogFooter className="shrink-0 p-4 sm:px-5 sm:py-4 bg-slate-50 border-t gap-2">
            <Button variant="ghost" onClick={handleCloseImportModal} className="dialog-btn-secondary">
              <X className="size-5" /> Cancelar
            </Button>
            <Button onClick={handleImportExcel} disabled={isLoading || !file || !selectedProfileId} className="dialog-btn-primary">
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} 
              Importar
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
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white shadow-xl">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <UserCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-slate-800">Asignar responsable</DialogTitle>
                  {isCurrentOrderLocked && <Lock className="size-3.5 text-red-500" />}
                </div>
                <DialogDescription className="text-xs text-slate-500">Selecciona el operario para este pedido</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-4 space-y-4">
            {isCurrentOrderLocked && (
              <Alert className="rounded-xl bg-red-50 border-red-100">
                <Lock className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-xs font-bold text-red-700">Certificación cerrada</AlertTitle>
                <AlertDescription className="text-[10px] text-red-600">
                  No se permite cambio de responsable por integridad de trazabilidad.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Responsable actual</Label>
              {selectedOrderGroup?.assignedTo?.[0] ? (
                (() => {
                  const u = availableUsers.find(user => user.id === selectedOrderGroup.assignedTo![0]);
                  return (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{u?.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{u?.name}</p>
                          <p className="text-[10px] text-slate-400">{resolveRoleLabel(u?.role)}</p>
                        </div>
                      </div>
                      {!isCurrentOrderLocked && (
                        <Button variant="ghost" size="sm" onClick={handleClearAssignment} className="text-red-500 hover:text-red-600 h-8">
                          <UserMinus className="h-3.5 w-3.5 mr-1" /> Quitar
                        </Button>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                  <UserIcon className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Sin responsable asignado</p>
                </div>
              )}
            </div>

            {!isCurrentOrderLocked && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Nuevo responsable</Label>
                <Select 
                  value={selectedOrderGroup?.assignedTo?.[0] || ""} 
                  onValueChange={handleDirectAssign}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Seleccionar operario..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[280px]">
                    {activeCertifiers.map(u => {
                      const pendingCount = getUserPendingTasks(u.id);
                      return (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">{u.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{u.name}</span>
                                <span className="text-[10px] text-slate-400">{resolveRoleLabel(u.role)}</span>
                              </div>
                            </div>
                            {pendingCount > 0 && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 ml-2">
                                {pendingCount} pend.
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button onClick={() => setIsAssignOpen(false)} className="dialog-btn-secondary w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de selección de propietario */}
      {isOwnerModalOpen && (
        <OwnerSelectionModal 
          owners={owners}
          selectedId={headerData.ownerId || null}
          onConfirm={handleOwnerConfirm}
          onCancel={() => setIsOwnerModalOpen(false)}
        />
      )}

      {/* Modal de selección de plantilla */}
      {isProfileModalOpen && (
        <MappingProfileSelectionModal 
          profiles={activeMappingProfiles}
          selectedId={selectedProfileId || null}
          onConfirm={handleProfileConfirm}
          onCancel={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrdersPanel;