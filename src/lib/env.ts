const PLACEHOLDER_FRAGMENTS = [
  "your-project-id",
  "your-anon-key",
  "your-service-role-key",
  "localhost:5432/orderflow_db",
  "your-gemini-api-key",
  "your_jwt_secret_phrase_here",
  "your_api_key_here",
  "replace-with-a-long-random-secret",
  "your-email@gmail.com",
  "your-app-password",
  "no-reply@example.com",
];

const readValue = (value: string | undefined) => value?.trim() || "";

export const isPlaceholderValue = (value: string | undefined) => {
  const normalized = readValue(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return PLACEHOLDER_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment.toLowerCase())
  );
};

export type SupabaseEnvStatus = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  hasDatabaseUrl: boolean;
  urlIsPlaceholder: boolean;
  anonKeyIsPlaceholder: boolean;
  serviceRoleKeyIsPlaceholder: boolean;
  databaseUrlIsPlaceholder: boolean;
};

export const getSupabaseEnvStatus = (): SupabaseEnvStatus => {
  const url = readValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = readValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = readValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const databaseUrl = readValue(process.env.DATABASE_URL);

  return {
    url,
    anonKey,
    serviceRoleKey,
    databaseUrl,
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    hasDatabaseUrl: Boolean(databaseUrl),
    urlIsPlaceholder: isPlaceholderValue(url),
    anonKeyIsPlaceholder: isPlaceholderValue(anonKey),
    serviceRoleKeyIsPlaceholder: isPlaceholderValue(serviceRoleKey),
    databaseUrlIsPlaceholder: isPlaceholderValue(databaseUrl),
  };
};

export const getSupabasePublicUrl = () => {
  const { url, hasUrl, urlIsPlaceholder } = getSupabaseEnvStatus();

  if (!hasUrl || urlIsPlaceholder) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL no esta configurada con un valor real."
    );
  }

  return url;
};

export const getSupabaseAnonKey = () => {
  const { anonKey, hasAnonKey, anonKeyIsPlaceholder } = getSupabaseEnvStatus();

  if (!hasAnonKey || anonKeyIsPlaceholder) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY no esta configurada con un valor real."
    );
  }

  return anonKey;
};