"use client";

import type {
  AppRole,
  Customer,
  GroupedOrder,
  MappingProfile,
  Material,
  Owner,
  Store,
  User,
} from "@/lib/types";
import type { AppBootstrapData } from "@/lib/app-data-types";

const CACHE_KEYS = {
  owners: "owners",
  customers: "customers",
  stores: "stores",
  materials: "materials",
  mappingProfiles: "mappingProfiles",
  roles: "appRoles",
  users: "users",
  groupedProcesses: "groupedProcesses",
} as const;

const writeCache = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const writeBootstrapCache = (data: AppBootstrapData) => {
  writeCache(CACHE_KEYS.owners, data.owners);
  writeCache(CACHE_KEYS.customers, data.customers);
  writeCache(CACHE_KEYS.stores, data.stores);
  writeCache(CACHE_KEYS.materials, data.materials);
  writeCache(CACHE_KEYS.mappingProfiles, data.mappingProfiles);
  writeCache(CACHE_KEYS.roles, data.roles);
  writeCache(CACHE_KEYS.users, data.users);
  writeCache(CACHE_KEYS.groupedProcesses, data.groupedProcesses);
};

const postSnapshot = async (resource: string, data: unknown) => {
  const response = await fetch("/api/app-data/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource, data }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `No se pudo sincronizar ${resource}.`);
  }
};

export const hydrateLocalCacheFromDatabase = async () => {
  const response = await fetch("/api/app-data/bootstrap", {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "No se pudo cargar la cache inicial desde la base de datos.");
  }

  const data = (await response.json()) as AppBootstrapData;
  writeBootstrapCache(data);
  return data;
};

export const persistOwners = async (owners: Owner[]) => {
  writeCache(CACHE_KEYS.owners, owners);
  await postSnapshot("owners", owners);
};

export const persistCustomers = async (customers: Customer[]) => {
  writeCache(CACHE_KEYS.customers, customers);
  await postSnapshot("customers", customers);
};

export const persistStores = async (stores: Store[]) => {
  writeCache(CACHE_KEYS.stores, stores);
  await postSnapshot("stores", stores);
};

export const persistMaterials = async (materials: Material[]) => {
  writeCache(CACHE_KEYS.materials, materials);
  await postSnapshot("materials", materials);
};

export const persistMappingProfiles = async (profiles: MappingProfile[]) => {
  writeCache(CACHE_KEYS.mappingProfiles, profiles);
  await postSnapshot("mappingProfiles", profiles);
};

export const persistRoles = async (roles: AppRole[]) => {
  writeCache(CACHE_KEYS.roles, roles);
  await postSnapshot("roles", roles);
};

export const persistUsers = async (users: User[]) => {
  writeCache(CACHE_KEYS.users, users);
  await postSnapshot("users", users);
};

export const persistGroupedProcesses = async (processes: GroupedOrder[]) => {
  writeCache(CACHE_KEYS.groupedProcesses, processes);
  await postSnapshot("groupedProcesses", processes);
};
