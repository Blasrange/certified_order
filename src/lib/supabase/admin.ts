import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseAnonKey,
  getSupabaseEnvStatus,
  getSupabasePublicUrl,
} from "@/lib/env";

const getServerKey = () => {
  const env = getSupabaseEnvStatus();

  if (env.hasServiceRoleKey && !env.serviceRoleKeyIsPlaceholder) {
    return env.serviceRoleKey;
  }

  return getSupabaseAnonKey();
};

export const supabaseAdmin = createClient(
  getSupabasePublicUrl(),
  getServerKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
