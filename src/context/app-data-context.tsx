"use client";

import * as React from "react";

import { useAuth } from "@/context/auth-context";
import { toast } from "@/hooks/use-toast";
import type { AppBootstrapData } from "@/lib/app-data-types";
import type { User } from "@/lib/types";

type RefreshOptions = {
  notify?: boolean;
};

type AppDataContextValue = AppBootstrapData & {
  loading: boolean;
  refreshing: boolean;
  refresh: (options?: RefreshOptions) => Promise<void>;
};

const BOOTSTRAP_TTL_MS = 30_000;

const emptyData: AppBootstrapData = {
  owners: [],
  customers: [],
  stores: [],
  materials: [],
  mappingProfiles: [],
  roles: [],
  users: [],
  groupedProcesses: [],
};

const AppDataContext = React.createContext<AppDataContextValue | undefined>(undefined);

const filterByOwners = (data: AppBootstrapData, currentUser: User | null): AppBootstrapData => {
  if (!currentUser) {
    return emptyData;
  }

  if (currentUser.isSystemAdmin || currentUser.role === "admin") {
    return data;
  }

  const allowedOwnerIds = new Set((currentUser.ownerIds || []).filter(Boolean));

  if (allowedOwnerIds.size === 0) {
    return {
      ...data,
      owners: [],
      customers: [],
      stores: [],
      materials: [],
      groupedProcesses: [],
    };
  }

  return {
    ...data,
    owners: data.owners.filter((owner) => allowedOwnerIds.has(owner.id)),
    customers: data.customers.filter((customer) => customer.ownerId && allowedOwnerIds.has(customer.ownerId)),
    stores: data.stores.filter((store) => store.ownerId && allowedOwnerIds.has(store.ownerId)),
    materials: data.materials.filter((material) => material.ownerId && allowedOwnerIds.has(material.ownerId)),
    groupedProcesses: data.groupedProcesses
      .filter((process) => process.ownerId && allowedOwnerIds.has(process.ownerId))
      .map((process) => ({
        ...process,
        orders: process.orders.filter((order) => {
          if (order.ownerId) {
            return allowedOwnerIds.has(order.ownerId);
          }

          return process.ownerId ? allowedOwnerIds.has(process.ownerId) : false;
        }),
      })),
  };
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [data, setData] = React.useState<AppBootstrapData>(emptyData);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const lastLoadedAtRef = React.useRef(0);
  const inFlightRefreshRef = React.useRef<Promise<void> | null>(null);
  const hasLoadedOnceRef = React.useRef(false);
  const lastRefreshSignatureRef = React.useRef<string>(JSON.stringify(emptyData));
  const lastToastAtRef = React.useRef(0);

  const notifyRefresh = React.useCallback((title: string, description: string, variant?: "destructive") => {
    const now = Date.now();
    if (now - lastToastAtRef.current < 4000) {
      return;
    }

    lastToastAtRef.current = now;
    toast({ title, description, variant });
  }, []);

  const refresh = React.useCallback(async (options?: RefreshOptions) => {
    if (!currentUser) {
      setData(emptyData);
      setLoading(false);
      setRefreshing(false);
      lastLoadedAtRef.current = 0;
      hasLoadedOnceRef.current = false;
      lastRefreshSignatureRef.current = JSON.stringify(emptyData);
      return;
    }

    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const refreshPromise = (async () => {
      try {
        const response = await fetch("/api/app-data/bootstrap", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as AppBootstrapData | { error?: string } | null;

        if (!response.ok) {
          throw new Error((payload as { error?: string } | null)?.error || "No se pudo cargar la información del sistema.");
        }

        const nextData = filterByOwners(payload as AppBootstrapData, currentUser);
        const nextSignature = JSON.stringify(nextData);
        const changed = nextSignature !== lastRefreshSignatureRef.current;

        setData(nextData);
        lastLoadedAtRef.current = Date.now();
        lastRefreshSignatureRef.current = nextSignature;

        if (options?.notify && hasLoadedOnceRef.current && changed) {
          notifyRefresh("Sistema actualizado", "La información se recargó correctamente sin interrumpir tu trabajo.");
        }

        hasLoadedOnceRef.current = true;
      } catch (error) {
        console.error("No se pudo cargar la información desde la base de datos.", error);

        if (!hasLoadedOnceRef.current) {
          setData(emptyData);
        }

        notifyRefresh(
          "Actualización pendiente",
          hasLoadedOnceRef.current
            ? "No fue posible actualizar en este momento. Se mantiene la última información disponible."
            : "No se pudo cargar la información del sistema. Intenta nuevamente.",
          "destructive",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, [currentUser, notifyRefresh]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const maybeRefresh = () => {
      if (Date.now() - lastLoadedAtRef.current < BOOTSTRAP_TTL_MS) {
        return;
      }

      void refresh({ notify: true });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        maybeRefresh();
      }
    };

    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const value = React.useMemo<AppDataContextValue>(() => ({
    ...data,
    loading,
    refreshing,
    refresh,
  }), [data, loading, refreshing, refresh]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppDataContext() {
  const context = React.useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppDataContext debe usarse dentro de AppDataProvider.");
  }

  return context;
}