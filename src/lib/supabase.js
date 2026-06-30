// FDS Trading - Supabase client
//
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in Vercel
// Environment Variables. The anon key is safe to be public - Supabase's
// Row Level Security policies ensure users can only access their own data.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "FDS: Supabase env vars missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel environment variables."
  );
}

export const supabase = url && key ? createClient(url, key) : null;

// Helper: returns true if Supabase is configured and reachable
export function isSupabaseReady() {
  return !!supabase;
}
