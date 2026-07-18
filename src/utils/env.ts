import path from "path";

export type RuntimeDataProvider = "supabase" | "google-drive";

export const getRuntimeDataProvider = (rawValue?: string): RuntimeDataProvider => {
  const normalized = String(rawValue ?? process.env.VITE_DATA_PROVIDER ?? process.env.DATA_PROVIDER ?? "supabase")
    .trim()
    .toLowerCase();

  return normalized === "google-drive" ? "google-drive" : "supabase";
};

export const requiresLegacySupabaseConfig = (rawValue?: string): boolean => {
  return getRuntimeDataProvider(rawValue) === "supabase";
};

export const getPortValue = (portStr: string | undefined): number | undefined => {
  if (!portStr) {
    return 3000;
  }
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port <= 0 || port.toString() !== portStr.trim()) {
    return undefined;
  }
  return port;
};

export const validateProdEnvValue = (url: string | undefined, key: string | undefined): boolean => {
  // During the controlled migration, Supabase credentials are required only
  // when the legacy Supabase provider is selected. Google Drive mode must be
  // able to boot without fake/dummy Supabase credentials.
  if (!requiresLegacySupabaseConfig()) {
    return true;
  }

  if (!url || !key) {
    return false;
  }
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
};
