export type DataProvider = "supabase" | "google-drive";

const rawProvider = String((import.meta as any).env.VITE_DATA_PROVIDER || "supabase")
  .trim()
  .toLowerCase();

export const dataProvider: DataProvider = rawProvider === "google-drive" ? "google-drive" : "supabase";

export const isLegacySupabaseProvider = dataProvider === "supabase";
export const isGoogleDriveProvider = dataProvider === "google-drive";
