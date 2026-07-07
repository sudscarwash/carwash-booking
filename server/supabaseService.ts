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
    const isServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceKey) {
      console.log('[Supabase Auth] Registering user via Admin API (bypassing email confirmation)...');
      const { data, error } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
        }
      });

      if (error) {
        // If the user already exists in Supabase, try to retrieve their ID
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
          console.log('[Supabase Auth] User already exists in Supabase. Retrieving existing ID...');
          const { data: listData, error: listError } = await supabaseClient.auth.admin.listUsers();
          if (!listError && listData?.users) {
            const existingUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (existingUser) {
              return existingUser.id;
            }
          }
        }
        console.error('[Supabase Auth] Admin createUser error:', error.message);
        throw new Error(error.message);
      }

      return data.user?.id || null;
    } else {
      console.log('[Supabase Auth] Registering user via standard signUp API (fallback)...');
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
    }
  } catch (err: any) {
    console.error('[Supabase Auth] Failed to register user:', err);
    throw err;
  }
}

/**
 * Administrative update of user password in Supabase
 */
export async function updateSupabasePassword(email: string, newPassword: string): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    const isServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceKey) {
      console.log(`[Supabase Auth] Admin updating password for ${email}...`);
      // Find the user by email first
      const { data: listData, error: listError } = await supabaseClient.auth.admin.listUsers();
      if (listError || !listData?.users) {
        throw new Error(listError?.message || 'Failed to retrieve Supabase user list');
      }

      const user = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        console.warn(`[Supabase Auth] No user found in Supabase Auth matching email ${email}`);
        return false;
      }

      // Update password using admin API
      const { error } = await supabaseClient.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) {
        console.error('[Supabase Auth] Admin updateUserById error:', error.message);
        throw new Error(error.message);
      }

      console.log(`[Supabase Auth] Successfully updated password for ${email} in Supabase Auth.`);
      return true;
    }
    return false;
  } catch (err: any) {
    console.error('[Supabase Auth] Admin password update failed:', err);
    return false;
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
