"use client";

import { useAppDataContext } from "@/context/app-data-context";
import type { User } from "@/lib/types";

export function useFilteredAppData(_currentUser: User | null) {
  return useAppDataContext();
}