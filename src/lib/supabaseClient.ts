import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { UserRole, UserSession } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let cachedConfig: { supabaseUrl?: string; supabaseAnonKey?: string } | null = null;

export async function initSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;

  let url = (import.meta as any).env?.VITE_SUPABASE_URL;
  let anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        cachedConfig = await res.json();
        url = cachedConfig?.supabaseUrl || url;
        anonKey = cachedConfig?.supabaseAnonKey || anonKey;
      }
    } catch (e) {
      // server config fetch fallback
    }
  }

  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err: any) {
      console.warn('Failed to initialize Supabase client:', err.message);
    }
  }

  return supabaseInstance;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  return supabaseInstance;
}

export async function getAuthToken(): Promise<string | null> {
  const localToken = localStorage.getItem('auth_token');
  if (localToken) return localToken;

  if (supabaseInstance) {
    try {
      const { data } = await supabaseInstance.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch (e) {
      // ignore
    }
  }
  return localStorage.getItem('supabase_auth_token') || localStorage.getItem('demo_auth_token') || null;
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('supabase_auth_token');
  localStorage.removeItem('demo_auth_token');
  if (supabaseInstance) {
    supabaseInstance.auth.signOut().catch(() => {});
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export async function getCurrentUserSession(): Promise<UserSession | null> {
  try {
    const res = await fetchWithAuth('/api/auth/session');
    if (!res.ok) {
      if (res.status === 401) return null;
      throw new Error('Failed to fetch session');
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}
