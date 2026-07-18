import { createClient } from "@supabase/supabase-js";
import { isLegacySupabaseProvider } from "./config/dataProvider";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

// Supabase remains available only as the legacy provider during the controlled
// migration. New storage/auth work must target the selected provider boundary
// instead of assuming Supabase is always active.
export const isSupabaseConfigured = isLegacySupabaseProvider && !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const getAuthHeader = async (): Promise<Record<string, string>> => {
  if (!isSupabaseConfigured) return {};

  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    return { "Authorization": `Bearer ${data.session.access_token}` };
  }
  return {};
};
