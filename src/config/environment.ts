/**
 * Environment Configuration & Production Guardrails
 * 
 * Manages detection of Production vs Development / Staging, controlling:
 * - Exposure of test accounts and 1-click persona switchers
 * - Visibility of the floating Role Switcher preview widget
 * - In-app OTP simulation banners vs live transactional email delivery
 * - Default visitor authentication state (Guest vs Demo User)
 */

const env = (import.meta as any).env || {};

// Explicit mode or Vite production check
export const IS_PRODUCTION: boolean = 
  env.VITE_APP_ENV === 'production' || 
  env.MODE === 'production' || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('run.app') && !window.location.hostname.includes('dev'));

// Allow explicit override in staging/preview if VITE_ENABLE_DEV_TOOLS is set to "true"
export const ENABLE_DEV_TOOLS: boolean = 
  env.VITE_ENABLE_DEV_TOOLS === 'true' || (!IS_PRODUCTION && env.VITE_ENABLE_DEV_TOOLS !== 'false');

// In production, demo accounts & 1-click test switchers must be disabled
export const SHOW_DEMO_ACCOUNTS: boolean = ENABLE_DEV_TOOLS;

// In-app OTP auto-fill banner is only visible in dev/staging when live email is not configured
export const SHOW_DEV_OTP_HELPER: boolean = ENABLE_DEV_TOOLS;

// Explicit toggle to allow or disable master bypass code (888888)
// Disabled by default for maximum security, can be enabled only if VITE_ALLOW_MASTER_OTP_BYPASS="true"
export const ALLOW_MASTER_OTP_BYPASS: boolean = 
  env.VITE_ALLOW_MASTER_OTP_BYPASS === 'true' || (!IS_PRODUCTION && env.VITE_ALLOW_MASTER_OTP_BYPASS !== 'false' && ENABLE_DEV_TOOLS);

// Mandatory Two-Factor Authentication (2FA) OTP for Super Admin sign-in
export const REQUIRE_ADMIN_2FA: boolean = 
  env.VITE_REQUIRE_ADMIN_2FA !== 'false';

// Check if live email credentials exist
export const HAS_LIVE_EMAIL_KEY: boolean = Boolean(
  env.VITE_RESEND_API_KEY && env.VITE_RESEND_API_KEY.trim() !== ''
);

// Check if live Supabase is configured
export const HAS_LIVE_SUPABASE: boolean = Boolean(
  env.VITE_SUPABASE_URL && 
  env.VITE_SUPABASE_URL.trim() !== '' && 
  !env.VITE_SUPABASE_URL.includes('[YOUR-PROJECT-ID]')
);

export const APP_CONFIG = {
  appName: 'FOODFINDR Brunei',
  appUrl: env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://foodfindr.bn'),
  isProduction: IS_PRODUCTION,
  enableDevTools: ENABLE_DEV_TOOLS,
  showDemoAccounts: SHOW_DEMO_ACCOUNTS,
  showDevOtpHelper: SHOW_DEV_OTP_HELPER,
  allowMasterOtpBypass: ALLOW_MASTER_OTP_BYPASS,
  requireAdmin2fa: REQUIRE_ADMIN_2FA,
  hasLiveEmailKey: HAS_LIVE_EMAIL_KEY,
  hasLiveSupabase: HAS_LIVE_SUPABASE,
  defaultDistrict: 'Brunei-Muara',
  currency: 'BND',
  currencySymbol: 'B$',
};
