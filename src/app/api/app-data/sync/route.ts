import { NextResponse } from "next/server";

import {
  syncCustomers,
  syncGroupedProcesses,
  syncMappingProfiles,
  syncMaterials,
  syncOwners,
  syncRoles,
  syncStores,
  syncUsers,
} from "@/lib/repositories/app-data.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { resource, data } = payload as {
      resource: string;
      data: unknown;
    };

    switch (resource) {
      case "owners":
        await syncOwners(data as any[]);
        break;
      case "customers":
        await syncCustomers(data as any[]);
        break;
      case "stores":
        await syncStores(data as any[]);
        break;
      case "materials":
        await syncMaterials(data as any[]);
        break;
      case "mappingProfiles":
        await syncMappingProfiles(data as any[]);
        break;
      case "roles":
        await syncRoles(data as any[]);
        break;
      case "users":
        await syncUsers(data as any[]);
        break;
      case "groupedProcesses":
        await syncGroupedProcesses(data as any[]);
        break;
      default:
        return NextResponse.json(
          { error: `Recurso no soportado: ${resource}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar con la base de datos.",
      },
      { status: 500 }
    );
  }
}
