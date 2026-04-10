import "server-only";

import { getSupabaseAnonKey, getSupabaseEnvStatus, getSupabasePublicUrl } from "@/lib/env";

type SupabaseValidationResult = {
  ok: boolean;
  status: number;
  message: string;
  details: string[];
  metadata?: {
    projectUrl: string;
    databaseUrlConfigured: boolean;
    serviceRoleConfigured: boolean;
    authSettingsAvailable: boolean;
  };
};

export const validateSupabaseConnection = async (): Promise<SupabaseValidationResult> => {
  const env = getSupabaseEnvStatus();
  const details: string[] = [];

  if (!env.hasUrl) {
    details.push("Falta NEXT_PUBLIC_SUPABASE_URL en el .env.");
  } else if (env.urlIsPlaceholder) {
    details.push("NEXT_PUBLIC_SUPABASE_URL sigue con un placeholder.");
  }

  if (!env.hasAnonKey) {
    details.push("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en el .env.");
  } else if (env.anonKeyIsPlaceholder) {
    details.push("NEXT_PUBLIC_SUPABASE_ANON_KEY sigue con un placeholder.");
  }

  if (!env.hasDatabaseUrl) {
    details.push("DATABASE_URL no esta definida. Es opcional para lecturas REST, pero necesaria para acceso directo a Postgres o herramientas ORM.");
  } else if (env.databaseUrlIsPlaceholder) {
    details.push("DATABASE_URL sigue con un placeholder.");
  }

  if (!env.hasServiceRoleKey) {
    details.push("SUPABASE_SERVICE_ROLE_KEY no esta definida. Es opcional para el frontend, pero necesaria para operaciones administrativas desde servidor.");
  } else if (env.serviceRoleKeyIsPlaceholder) {
    details.push("SUPABASE_SERVICE_ROLE_KEY sigue con un placeholder.");
  }

  if (details.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "La configuracion de Supabase en .env aun no es valida.",
      details,
      metadata: {
        projectUrl: env.url,
        databaseUrlConfigured: env.hasDatabaseUrl && !env.databaseUrlIsPlaceholder,
        serviceRoleConfigured: env.hasServiceRoleKey && !env.serviceRoleKeyIsPlaceholder,
        authSettingsAvailable: false,
      },
    };
  }

  let projectUrl: URL;

  try {
    projectUrl = new URL(getSupabasePublicUrl());
  } catch {
    return {
      ok: false,
      status: 400,
      message: "NEXT_PUBLIC_SUPABASE_URL no tiene un formato de URL valido.",
      details: ["Usa un valor con formato https://tu-proyecto.supabase.co"],
    };
  }

  const anonKey = getSupabaseAnonKey();

  try {
    const response = await fetch(`${projectUrl.origin}/auth/v1/settings`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        message: "Supabase respondio, pero rechazo la configuracion enviada.",
        details: [
          `HTTP ${response.status} al consultar /auth/v1/settings.`,
          payload?.msg || payload?.message || "Revisa URL y anon key.",
        ],
        metadata: {
          projectUrl: projectUrl.origin,
          databaseUrlConfigured: env.hasDatabaseUrl && !env.databaseUrlIsPlaceholder,
          serviceRoleConfigured: env.hasServiceRoleKey && !env.serviceRoleKeyIsPlaceholder,
          authSettingsAvailable: false,
        },
      };
    }

    return {
      ok: true,
      status: 200,
      message: "La conexion basica con Supabase fue validada correctamente.",
      details: [
        "La URL publica y la anon key responden correctamente.",
        "Ya puedes empezar a cablear lecturas o escrituras desde server actions, route handlers o servicios.",
      ],
      metadata: {
        projectUrl: projectUrl.origin,
        databaseUrlConfigured: env.hasDatabaseUrl && !env.databaseUrlIsPlaceholder,
        serviceRoleConfigured: env.hasServiceRoleKey && !env.serviceRoleKeyIsPlaceholder,
        authSettingsAvailable: Boolean(payload),
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: "No fue posible alcanzar Supabase desde el servidor de Next.js.",
      details: [
        error instanceof Error ? error.message : "Error de red no identificado.",
        "Verifica conectividad saliente, URL del proyecto y credenciales activas.",
      ],
      metadata: {
        projectUrl: projectUrl.origin,
        databaseUrlConfigured: env.hasDatabaseUrl && !env.databaseUrlIsPlaceholder,
        serviceRoleConfigured: env.hasServiceRoleKey && !env.serviceRoleKeyIsPlaceholder,
        authSettingsAvailable: false,
      },
    };
  }
};