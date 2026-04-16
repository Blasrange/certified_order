import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseEnvStatus,
  getSupabasePublicUrl,
} from "@/lib/env";

export type SupabaseAuditActor = {
  appUserId?: number | string | null;
  authUserId?: string | null;
  userCode?: string | null;
  loginId?: string | null;
  userEmail?: string | null;
};

const getServerKey = () => {
  const env = getSupabaseEnvStatus();

  if (!env.hasServiceRoleKey || env.serviceRoleKeyIsPlaceholder) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no esta configurada con un valor real. Las rutas de servidor que cargan o sincronizan datos requieren esta clave."
    );
  }

  return env.serviceRoleKey;
};

const buildAuditHeaders = (actor?: SupabaseAuditActor) => {
  if (!actor) {
    return {};
  }

  const headers: Record<string, string> = {};

  if (actor.appUserId != null && actor.appUserId !== "") {
    headers["x-app-user-id"] = String(actor.appUserId);
  }

  if (actor.authUserId) {
    headers["x-app-auth-user-id"] = actor.authUserId;
  }

  if (actor.userCode) {
    headers["x-app-user-code"] = actor.userCode;
  }

  if (actor.loginId) {
    headers["x-app-user-login-id"] = actor.loginId;
  }

  if (actor.userEmail) {
    headers["x-app-user-email"] = actor.userEmail;
  }

  return headers;
};

export const createSupabaseAdminClient = (actor?: SupabaseAuditActor) =>
  createClient(getSupabasePublicUrl(), getServerKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: buildAuditHeaders(actor),
    },
  });

export const supabaseAdmin = createSupabaseAdminClient();
