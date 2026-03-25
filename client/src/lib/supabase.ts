import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _configured = false;
let _initPromise: Promise<void> | null = null;

async function initSupabase() {
  try {
    const res = await fetch("/api/config/supabase");
    if (!res.ok) return;
    const { url, anonKey } = await res.json();
    if (url && anonKey) {
      _supabase = createClient(url, anonKey);
      _configured = true;
    }
  } catch {
    // Supabase not configured
  }
}

export function getSupabaseInitPromise(): Promise<void> {
  if (!_initPromise) {
    _initPromise = initSupabase();
  }
  return _initPromise;
}

export function getSupabase(): SupabaseClient | null {
  return _supabase;
}

export function isSupabaseConfigured(): boolean {
  return _configured;
}

getSupabaseInitPromise();
