/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key if available for administrative actions (like checking users, creating without email confirmation if needed)
// fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseAuthEnabled = !!(supabaseUrl && supabaseKey);

export const supabaseClient = isSupabaseAuthEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

/**
 * Register a user on Supabase Auth
 * Returns the Supabase user ID if successful
 */
export async function registerSupabaseUser(email: string, password: string, name: string): Promise<string | null> {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      console.error('[Supabase Auth] Sign up error:', error.message);
      throw new Error(error.message);
    }

    return data.user?.id || null;
  } catch (err: any) {
    console.error('[Supabase Auth] Failed to register user:', err);
    throw err;
  }
}

/**
 * Authenticate a user with Supabase Auth
 */
export async function loginSupabaseUser(email: string, password: string): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Supabase Auth] Sign in error:', error.message);
      throw new Error(error.message);
    }

    return !!data.user;
  } catch (err: any) {
    console.error('[Supabase Auth] Failed to authenticate user:', err);
    throw err;
  }
}

/**
 * Trigger Supabase Password Reset Email
 */
export async function sendSupabasePasswordReset(email: string, redirectUrl: string): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[Supabase Auth] Reset password error:', error.message);
      throw new Error(error.message);
    }

    return true;
  } catch (err: any) {
    console.error('[Supabase Auth] Failed to send password reset:', err);
    throw err;
  }
}
