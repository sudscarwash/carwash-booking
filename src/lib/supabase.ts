import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

function cleanEnvString(val?: string): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  // Strip accidental surrounding quotes (" or ') often pasted from env files
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}
function cleanSupabaseUrl(val?: string): string | undefined {
  let cleaned = cleanEnvString(val);
  if (!cleaned) return undefined;
  // If user accidentally included /rest/v1 or trailing slashes, normalize to root domain
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const supabaseUrl = cleanSupabaseUrl(env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvString(env.VITE_SUPABASE_ANON_KEY);

export const configuredSupabaseUrl = supabaseUrl;
export const configuredSupabaseAnonKey = supabaseAnonKey;

export function clearSupabaseStoredSession() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  } catch {}
}

// Check if credentials are valid and not placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('[YOUR-PROJECT-ID]') &&
  !supabaseUrl.includes('[PROJECT-REF]') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string | null;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

/**
 * Actively tests connectivity to Supabase by pinging the public.restaurants table
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      isConnected: false,
      url: supabaseUrl || null,
      error: 'Supabase credentials not configured in environment variables.',
      checkedAt: new Date().toISOString(),
    };
  }

  const startTime = Date.now();
  try {
    // Attempt a lightweight select from restaurants
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      let friendlyError = error.message;
      if (
        error.message.includes('schema cache') || 
        error.message.includes('does not exist') || 
        error.message.includes('relation "public.restaurants"')
      ) {
        friendlyError = `Connected to Supabase successfully (${latencyMs}ms)! However, the 'restaurants' table has not been created in your Supabase project yet. Go to your Supabase SQL Editor and run the table creation script.`;
      } else if (
        error.message.includes('Invalid API key') || 
        error.message.includes('JWT') || 
        error.code === '401' || 
        (error as any).status === 401
      ) {
        friendlyError = `Invalid API key (401 Unauthorized): Supabase rejected this key. This happens if the key was regenerated or has quotes around it in your Render settings. Go to Supabase Dashboard > Project Settings > API, copy the current 'anon public' key without quotes.`;
      }

      return {
        isConfigured: true,
        isConnected: false,
        url: supabaseUrl,
        latencyMs,
        error: friendlyError,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      url: supabaseUrl,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      url: supabaseUrl,
      latencyMs: Date.now() - startTime,
      error: err?.message || 'Network request failed.',
      checkedAt: new Date().toISOString(),
    };
  }
}
