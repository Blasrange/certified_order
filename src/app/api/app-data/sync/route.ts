import { cookies } from 'next/headers';
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
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth-session.server';
import { supabaseAdmin, type SupabaseAuditActor } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const normalizeHeader = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const resolveAuditActor = async (request: Request): Promise<SupabaseAuditActor | undefined> => {
  const userCode = normalizeHeader(request.headers.get("x-app-user-code"));
  const loginId = normalizeHeader(request.headers.get("x-app-user-login-id"));
  const userEmail = normalizeHeader(request.headers.get("x-app-user-email"))?.toLowerCase();

  if (!userCode && !loginId && !userEmail) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = await getSessionUser(sessionCookie);

    if (sessionUser?.loginId || sessionUser?.email) {
      return resolveAuditActor(
        new Request(request.url, {
          method: request.method,
          headers: {
            'x-app-user-code': sessionUser.id,
            'x-app-user-login-id': sessionUser.loginId || '',
            'x-app-user-email': sessionUser.email || '',
          },
        })
      );
    }
  }

  if (!userCode && !loginId && !userEmail) {
    return undefined;
  }

  const tryFindActor = async (column: "user_code" | "login_id" | "email", value?: string) => {
    if (!value) {
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("id, auth_user_id, user_code, login_id, email")
      .eq(column, value)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo resolver el actor de auditoria: ${error.message}`);
    }

    return data;
  };

  const actorRow =
    (await tryFindActor("user_code", userCode)) ||
    (await tryFindActor("login_id", loginId)) ||
    (await tryFindActor("email", userEmail));

  return {
    appUserId: actorRow?.id ?? null,
    authUserId: actorRow?.auth_user_id ?? null,
    userCode: actorRow?.user_code ?? userCode ?? null,
    loginId: actorRow?.login_id ?? loginId ?? null,
    userEmail: actorRow?.email ?? userEmail ?? null,
  };
};

export async function POST(request: Request) {
  try {
    const actor = await resolveAuditActor(request);
    const payload = await request.json();
    const { resource, data } = payload as {
      resource: string;
      data: unknown;
    };

    switch (resource) {
      case "owners":
        await syncOwners(data as any[], actor);
        break;
      case "customers":
        await syncCustomers(data as any[], actor);
        break;
      case "stores":
        await syncStores(data as any[], actor);
        break;
      case "materials":
        await syncMaterials(data as any[], actor);
        break;
      case "mappingProfiles":
        await syncMappingProfiles(data as any[], actor);
        break;
      case "roles":
        await syncRoles(data as any[], actor);
        break;
      case "users":
        await syncUsers(data as any[], actor);
        break;
      case "groupedProcesses":
        return NextResponse.json({
          ok: true,
          data: await syncGroupedProcesses(data as any[], actor),
        });
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
