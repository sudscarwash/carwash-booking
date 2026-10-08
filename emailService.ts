/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config();

export type EmailProvider = 'RESEND' | 'GMAIL_SMTP' | 'SANDBOX_CONSOLE';

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  status: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'HELD_QUOTA' | 'SKIPPED';
  provider: EmailProvider;
  errorDetails?: string;
}

export interface EmailNotificationSettings {
  // Master ON/OFF toggle for transactional notifications
  // (NOTE: Critical Auth emails like Verification OTP & Password Reset ALWAYS bypass this to protect account access)
  masterEnabled: boolean;
  // Granular notification toggles
  notifyBookingConfirmed: boolean;
  notifyWashCompleted: boolean;
  notifyBookingCancelled: boolean;
  notifyDailyOwnerDigest: boolean;
  // Active email delivery provider
  activeProvider: EmailProvider;
  // Daily Quota Tracking & Circuit Breaker Limits
  dailyQuotaLimit: number;       // Resend free = 100, Gmail free = 500
  reservedAuthQuota: number;     // Buffer strictly reserved for OTP / Verification (e.g., 25)
  // Optional custom credentials (overrides process.env if provided in UI)
  gmailUser?: string;
  gmailAppPassword?: string;
  resendApiKey?: string;
  emailFromAddress?: string;
  replyToAddress?: string;
}

interface DailyQuotaTracker {
  date: string; // YYYY-MM-DD
  totalSent: number;
  authSent: number;
  notificationsSent: number;
  notificationsHeld: number;
}

const SETTINGS_FILE_PATH = path.resolve(process.cwd(), 'data', 'email_settings.json');
const LOGS_FILE_PATH = path.resolve(process.cwd(), 'data', 'email_logs.json');
const MAX_LOGS = 100;

function loadPersistedLogs(): EmailLogEntry[] {
  try {
    if (fs.existsSync(LOGS_FILE_PATH)) {
      const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[EmailService] Error loading email logs from disk:', err);
  }
  return [];
}

const emailLogsMemory: EmailLogEntry[] = loadPersistedLogs();

// Daily tracker memory
let dailyTracker: DailyQuotaTracker = {
  date: new Date().toISOString().slice(0, 10),
  totalSent: 0,
  authSent: 0,
  notificationsSent: 0,
  notificationsHeld: 0,
};

function ensureTodayTracker(): DailyQuotaTracker {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyTracker.date !== today) {
    dailyTracker = {
      date: today,
      totalSent: 0,
      authSent: 0,
      notificationsSent: 0,
      notificationsHeld: 0,
    };
  }
  return dailyTracker;
}

// Default settings
const DEFAULT_SETTINGS: EmailNotificationSettings = {
  masterEnabled: true,
  notifyBookingConfirmed: true,  // Enabled by default so booking confirmations dispatch & log
  notifyWashCompleted: true,     // Default on: "Car Ready for Pick Up" has highest customer value
  notifyBookingCancelled: true,  // Default on: Urgent cancellation alerts
  notifyDailyOwnerDigest: false,
  activeProvider: (process.env.EMAIL_PROVIDER as EmailProvider) || (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS
    ? 'GMAIL_SMTP'
    : (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('your_') && !process.env.RESEND_API_KEY.startsWith('re_12345') ? 'RESEND' : 'SANDBOX_CONSOLE')),
  dailyQuotaLimit: (process.env.EMAIL_PROVIDER === 'GMAIL_SMTP' || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS) ? 500 : 100,
  reservedAuthQuota: 25,
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'AutoShine BN <onboarding@resend.dev>',
  replyToAddress: process.env.EMAIL_REPLY_TO || '',
};

let cachedSettings: EmailNotificationSettings = { ...DEFAULT_SETTINGS };

// Load settings from persistent storage
export function getEmailSettings(): EmailNotificationSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('[EmailService] Error loading email settings from disk:', err);
  }
  return cachedSettings;
}

// Save settings to persistent storage
export function updateEmailSettings(updates: Partial<EmailNotificationSettings>): EmailNotificationSettings {
  const current = getEmailSettings();
  cachedSettings = {
    ...current,
    ...updates,
    // Keep quota limit reasonable
    dailyQuotaLimit: updates.dailyQuotaLimit ? Math.max(10, updates.dailyQuotaLimit) : current.dailyQuotaLimit,
    reservedAuthQuota: updates.reservedAuthQuota !== undefined ? Math.max(5, updates.reservedAuthQuota) : current.reservedAuthQuota,
  };

  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(cachedSettings, null, 2), 'utf-8');
    console.log('[EmailService] Updated and persisted email settings.');
  } catch (err) {
    console.error('[EmailService] Failed to save email settings to disk:', err);
  }

  return cachedSettings;
}

// Initialize on module load
getEmailSettings();

export function getQuotaStatus() {
  const tracker = ensureTodayTracker();
  const settings = getEmailSettings();
  const remaining = Math.max(0, settings.dailyQuotaLimit - tracker.totalSent);
  const authSafeRemaining = Math.max(0, (settings.dailyQuotaLimit - settings.reservedAuthQuota) - tracker.totalSent);

  return {
    date: tracker.date,
    totalSentToday: tracker.totalSent,
    authSentToday: tracker.authSent,
    notificationsSentToday: tracker.notificationsSent,
    notificationsHeldToday: tracker.notificationsHeld,
    dailyQuotaLimit: settings.dailyQuotaLimit,
    reservedAuthQuota: settings.reservedAuthQuota,
    remainingTotal: remaining,
    remainingForNotifications: authSafeRemaining,
    activeProvider: settings.activeProvider,
    hasResendKey: !!(settings.resendApiKey || process.env.RESEND_API_KEY),
    hasGmailConfig: !!((settings.gmailUser || process.env.GMAIL_USER || process.env.SMTP_USER) && (settings.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS)),
    masterEnabled: settings.masterEnabled,
  };
}

export function getEmailLogs(): EmailLogEntry[] {
  return [...emailLogsMemory];
}

export function clearEmailLogs(): void {
  emailLogsMemory.length = 0;
  try {
    if (fs.existsSync(LOGS_FILE_PATH)) {
      fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[EmailService] Failed to clear email logs on disk:', err);
  }
}

export function recordEmailLog(entry: Omit<EmailLogEntry, 'id' | 'timestamp'>) {
  const log: EmailLogEntry = {
    ...entry,
    id: `log_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  emailLogsMemory.unshift(log);
  if (emailLogsMemory.length > MAX_LOGS) {
    emailLogsMemory.pop();
  }

  try {
    const dir = path.dirname(LOGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify(emailLogsMemory, null, 2), 'utf-8');
  } catch (err) {
    console.error('[EmailService] Failed to persist email logs to disk:', err);
  }
}

export function formatResendFromAddress(rawFrom?: string): string {
  let from = (rawFrom || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev').trim();

  if (from.endsWith('@resend.com')) {
    from = from.replace('@resend.com', '@resend.dev');
  }

  const bracketMatch = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (bracketMatch) {
    const displayName = bracketMatch[1].replace(/["']/g, '').trim() || 'AutoShine BN';
    const emailAddress = bracketMatch[2].trim();
    return `${displayName} <${emailAddress}>`;
  }

  if (from.includes('@')) {
    return `AutoShine BN <${from}>`;
  }

  return 'AutoShine BN <onboarding@resend.dev>';
}

async function dispatchGmailDirect(
  to: string,
  subject: string,
  html: string,
  isAuthOrCritical: boolean,
  settings: EmailNotificationSettings,
  tracker: DailyQuotaTracker
): Promise<boolean> {
  const gmailUser = settings.gmailUser || process.env.GMAIL_USER || process.env.SMTP_USER || 'suds.carwash.app@gmail.com';
  const gmailPass = settings.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!gmailPass) {
    console.warn('[EmailService] Gmail SMTP selected but no App Password configured. Falling back to Sandbox Simulation.');
    recordEmailLog({
      to,
      from: `AutoShine BN <${gmailUser}>`,
      subject,
      html,
      status: 'SIMULATED',
      provider: 'SANDBOX_CONSOLE',
      errorDetails: 'No Gmail App Password provided in settings or GMAIL_APP_PASSWORD env.',
    });
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass.replace(/\s+/g, ''),
      },
    });

    const senderFrom = (settings.emailFromAddress && settings.emailFromAddress.trim())
      ? formatResendFromAddress(settings.emailFromAddress)
      : `AutoShine BN <${gmailUser}>`;

    const mailOptions: Record<string, any> = {
      from: senderFrom,
      to,
      subject,
      html,
    };

    if (settings.replyToAddress && settings.replyToAddress.trim()) {
      mailOptions.replyTo = settings.replyToAddress.trim();
    }

    await transporter.sendMail(mailOptions);

    tracker.totalSent++;
    if (isAuthOrCritical) tracker.authSent++; else tracker.notificationsSent++;

    console.log(`[EmailService] ✅ Email dispatched via Free Gmail SMTP to ${to} (${tracker.totalSent}/${settings.dailyQuotaLimit} today)`);

    recordEmailLog({
      to,
      from: senderFrom,
      subject,
      html,
      status: 'DELIVERED',
      provider: 'GMAIL_SMTP',
    });
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[EmailService] ❌ Gmail SMTP dispatch failed:', err);
    recordEmailLog({
      to,
      from: senderFrom,
      subject,
      html,
      status: 'FAILED',
      provider: 'GMAIL_SMTP',
      errorDetails: `Gmail SMTP Error: ${errorMsg}`,
    });
    return false;
  }
}

async function dispatchResendDirect(
  to: string,
  subject: string,
  html: string,
  isAuthOrCritical: boolean,
  settings: EmailNotificationSettings,
  tracker: DailyQuotaTracker
): Promise<boolean> {
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
  const formattedFrom = formatResendFromAddress(settings.emailFromAddress || process.env.EMAIL_FROM_ADDRESS);

  if (!apiKey || apiKey.startsWith('your_') || apiKey.startsWith('re_12345')) {
    console.log('📬 [EMAIL SERVICE SIMULATOR - RESEND OFFLINE FALLBACK]');
    recordEmailLog({
      to,
      from: formattedFrom,
      subject,
      html,
      status: 'SIMULATED',
      provider: 'SANDBOX_CONSOLE',
    });
    return true;
  }

  try {
    const emailPayload: Record<string, any> = {
      from: formattedFrom,
      to: [to],
      subject,
      html,
    };

    if (settings.replyToAddress && settings.replyToAddress.trim()) {
      emailPayload.reply_to = settings.replyToAddress.trim();
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [EmailService] Resend API Error (${response.status}): ${errorText}`);

      recordEmailLog({
        to,
        from: formattedFrom,
        subject,
        html,
        status: 'FAILED',
        provider: 'RESEND',
        errorDetails: `Resend Error (${response.status}): ${errorText}`,
      });
      return false;
    }

    tracker.totalSent++;
    if (isAuthOrCritical) tracker.authSent++; else tracker.notificationsSent++;

    recordEmailLog({
      to,
      from: formattedFrom,
      subject,
      html,
      status: 'DELIVERED',
      provider: 'RESEND',
    });
    console.log(`[EmailService] ✅ Email dispatched via Resend to ${to} (${tracker.totalSent}/${settings.dailyQuotaLimit} today)`);
    return true;
  } catch (error: any) {
    console.error('[EmailService] Failed to send email via Resend:', error);
    recordEmailLog({
      to,
      from: formattedFrom,
      subject,
      html,
      status: 'FAILED',
      provider: 'RESEND',
      errorDetails: error?.message || String(error),
    });
    return false;
  }
}

/**
 * Universal email dispatcher:
 * - Supports Gmail Free SMTP (500/day limit, 0 cost)
 * - Supports Resend API (100/day free limit)
 * - Protects Auth OTPs with the Quota Circuit Breaker
 * - Automatic Failover between providers if one fails or hits quota
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  isAuthOrCritical: boolean = false
): Promise<boolean> {
  const settings = getEmailSettings();
  const tracker = ensureTodayTracker();

  // 1. Quota Circuit Breaker: If non-critical notification, verify master toggle and quota buffer
  if (!isAuthOrCritical) {
    if (!settings.masterEnabled) {
      console.log(`[EmailService] Notification held: Master Email Notifications switch is OFF (To: ${to}, Subject: "${subject}")`);
      tracker.notificationsHeld++;
      recordEmailLog({
        to,
        from: 'System <notifications@autoshinebn.com>',
        subject,
        html,
        status: 'HELD_QUOTA',
        provider: settings.activeProvider,
        errorDetails: 'Skipped: Master Email Notifications toggle is turned OFF to save quota.',
      });
      return false;
    }

    const availableForNotifs = (settings.dailyQuotaLimit - settings.reservedAuthQuota);
    if (tracker.totalSent >= availableForNotifs) {
      console.warn(`[EmailService] 🛑 Quota Circuit Breaker Triggered: Total sent today (${tracker.totalSent}/${settings.dailyQuotaLimit}) reached notification threshold (${availableForNotifs}). Holding non-essential notification to preserve Auth OTPs!`);
      tracker.notificationsHeld++;
      recordEmailLog({
        to,
        from: 'System <notifications@autoshinebn.com>',
        subject,
        html,
        status: 'HELD_QUOTA',
        provider: settings.activeProvider,
        errorDetails: `Quota Guard: Held to preserve reserved ${settings.reservedAuthQuota} Auth/OTP emails. Daily sent: ${tracker.totalSent}/${settings.dailyQuotaLimit}`,
      });
      return false;
    }
  }

  // Determine active provider
  const provider = settings.activeProvider;

  // 2. Dispatch via Free Gmail SMTP (Nodemailer)
  if (provider === 'GMAIL_SMTP') {
    const success = await dispatchGmailDirect(to, subject, html, isAuthOrCritical, settings, tracker);
    if (success) {
      return true;
    }

    // Automatic Failover: Try Resend backup if Gmail failed
    const resendApiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
    if (resendApiKey && !resendApiKey.startsWith('your_') && !resendApiKey.startsWith('re_12345')) {
      console.log('[EmailService] 🔄 Auto-Failover: Gmail SMTP failed. Attempting delivery via backup Resend API...');
      return await dispatchResendDirect(to, subject, html, isAuthOrCritical, settings, tracker);
    }
    return false;
  }

  // 3. Dispatch via Resend API
  if (provider === 'RESEND') {
    const success = await dispatchResendDirect(to, subject, html, isAuthOrCritical, settings, tracker);
    if (success) {
      return true;
    }

    // Automatic Failover: Try Gmail SMTP backup if Resend failed or quota exhausted
    const gmailPass = settings.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    if (gmailPass) {
      console.log('[EmailService] 🔄 Auto-Failover: Resend error/quota reached. Attempting delivery via backup Gmail SMTP...');
      return await dispatchGmailDirect(to, subject, html, isAuthOrCritical, settings, tracker);
    }
    return false;
  }

  // 4. Default / Sandbox Fallback
  console.log('📬 [EMAIL SERVICE SIMULATOR - SANDBOX MODE]');
  recordEmailLog({
    to,
    from: 'AutoShine BN <sandbox@autoshinebn.dev>',
    subject,
    html,
    status: 'SIMULATED',
    provider: 'SANDBOX_CONSOLE',
  });
  return true;
}

/**
 * Send a 6-digit OTP code for Email Verification upon Registration (Critical Auth)
 */
export async function sendEmailVerificationOTP(email: string, name: string, code: string): Promise<boolean> {
  const subject = `Your Verification Code: ${code} - Autoshine BN`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Account Email Verification</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Verify Your Email Address</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Thank you for signing up for Autoshine BN! Please use the 6-digit verification code below to verify your email address and activate your account:</p>
      
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 12px; text-align: center; margin: 28px 0;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0284c7;">${code}</span>
        <p style="color: #0369a1; font-size: 12px; margin: 8px 0 0 0; font-weight: 600;">This verification code is valid for 15 minutes.</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">If you did not create an account on Autoshine BN, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html, true);
}

/**
 * Send a 6-digit OTP code for password reset (Critical Auth)
 */
export async function sendPasswordResetOTP(email: string, name: string, code: string): Promise<boolean> {
  const subject = `Your Password Reset Code: ${code} - Autoshine BN`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Premium Car Wash Booking System</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Reset Your Password</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">We received a request to reset your password. Use the verification code below to set up a new password for your account.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center; margin: 28px 0;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0284c7;">${code}</span>
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0; font-weight: 500;">This verification code is valid for exactly 15 minutes.</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html, true);
}

/**
 * Send a 6-digit OTP code for Administrator 2FA Login (Critical Auth)
 */
export async function sendAdminLoginOtp(email: string, name: string, code: string): Promise<boolean> {
  const subject = `🔐 [Admin Security Alert] Verification Code: ${code} - Autoshine BN`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fecaca; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 10px 18px; margin-bottom: 8px;">
          <span style="color: #dc2626; font-size: 13px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">ADMINISTRATOR TWO-FACTOR AUTHENTICATION</span>
        </div>
        <h1 style="color: #0f172a; margin: 8px 0 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN Platform</h1>
      </div>
      <hr style="border: none; border-top: 1px solid #fee2e2; margin: 20px 0;" />
      <h2 style="color: #991b1b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Admin Login Verification</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">An administrative session was initiated for your administrator account (<code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${email}</code>). To protect platform security, please enter the following 6-digit one-time passkey:</p>
      
      <div style="background-color: #fff1f2; border: 2px dashed #f43f5e; padding: 24px; border-radius: 14px; text-align: center; margin: 24px 0;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #e11d48; display: block;">${code}</span>
        <p style="color: #be123c; font-size: 12px; margin: 10px 0 0 0; font-weight: 600;">Valid for 10 minutes &bull; Single-use security token</p>
      </div>

      <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
          <strong>Security Notice:</strong> Never share this code with anyone. Autoshine BN staff will never request your 2FA verification passkey.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN Security Operations.</p>
      </div>
    </div>
  `;
  return sendEmail(email, subject, html, true);
}

/**
 * Send Welcome & Registration Confirmation Email (Critical Auth - supplies initial temporary credentials)
 */
export async function sendRegistrationWelcomeEmail(options: {
  email: string;
  name: string;
  role: string;
  businessName?: string;
  initialPassword?: string;
}): Promise<boolean> {
  const isEmployee = options.role === 'EMPLOYEE';
  const isOwner = options.role === 'OWNER';
  const isSpecial = options.role === 'SPECIAL';
  const isAdmin = options.role === 'ADMIN';

  let roleTitle = 'Customer Account';
  let welcomeHeadline = 'Welcome to Autoshine BN!';
  let welcomeBody = 'Your customer account has been successfully verified. You are all set to book premium car wash appointments across Brunei!';

  if (isEmployee) {
    roleTitle = 'Staff / Employee Account';
    welcomeHeadline = 'Welcome to the Team!';
    welcomeBody = `You have been added as an authorized staff member for ${options.businessName || 'your car wash location'}.`;
  } else if (isOwner) {
    roleTitle = 'Car Wash Owner Account';
    welcomeHeadline = 'Welcome, Business Partner!';
    welcomeBody = `Your owner portal for ${options.businessName || 'your car wash business'} is now active. You can manage slots, review appointments, and track revenue.`;
  } else if (isSpecial) {
    roleTitle = 'VIP / Special Partner Account';
    welcomeHeadline = 'Welcome, VIP Partner!';
    welcomeBody = 'Your VIP Partner account is now active with prioritized booking capabilities.';
  } else if (isAdmin) {
    roleTitle = 'Platform Administrator Account';
    welcomeHeadline = 'Admin Access Granted';
    welcomeBody = 'Your system administrator account has been provisioned on Autoshine BN.';
  }

  const subject = `Welcome to Autoshine BN - ${roleTitle} Verified & Active!`;

  const passwordNote = options.initialPassword
    ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">Your Initial Login Password:</p>
        <p style="margin: 6px 0 0 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #15803d;">${options.initialPassword}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #166534;">For security, please change your password after logging in.</p>
      </div>
    `
    : '';

  const businessNote = options.businessName
    ? `<p style="font-size: 14px; color: #334155; margin: 4px 0;">Location: <strong>${options.businessName}</strong></p>`
    : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Brunei's Premier Car Wash Platform</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">${welcomeHeadline}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${options.name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">${welcomeBody}</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 600;">Account Profile:</p>
        <p style="margin: 6px 0 2px 0; font-size: 14px; color: #0f172a;">Role: <strong>${roleTitle}</strong></p>
        <p style="margin: 2px 0 0 0; font-size: 14px; color: #0f172a;">Email: <strong>${options.email}</strong></p>
        <p style="margin: 2px 0 0 0; font-size: 14px; color: #10b981;">Status: <strong>✅ Active & Verified</strong></p>
        ${businessNote}
      </div>

      ${passwordNote}

      <div style="text-align: center; margin: 28px 0;">
        <a href="https://autoshinebn.com" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">Go to Autoshine BN Dashboard &rarr;</a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">If you ever have questions, contact our platform support.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(options.email, subject, html, true);
}

/**
 * Send Booking Confirmation Email (Toggleable Notification)
 */
export async function sendBookingConfirmationEmail(options: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  businessName: string;
  address: string;
  date: string;
  timeSlot: string;
  serviceName?: string;
  price?: number;
  paymentBank?: string;
  txnReference?: string;
}): Promise<boolean> {
  const settings = getEmailSettings();
  if (!settings.notifyBookingConfirmed) {
    console.log('[EmailService] Skipped booking confirmation email (toggle is OFF).');
    recordEmailLog({
      to: options.customerEmail,
      from: formatResendFromAddress(settings.emailFromAddress),
      subject: `Booking Confirmed: ${options.businessName} - Autoshine BN`,
      html: '<p>Skipped: "Booking Confirmed" notification is turned OFF in Admin Email Settings.</p>',
      status: 'SKIPPED',
      provider: settings.activeProvider,
      errorDetails: 'Skipped: "Booking Confirmed Email" toggle is switched OFF in Admin Settings.',
    });
    return false;
  }

  const subject = `Booking Confirmed: ${options.businessName} - Autoshine BN`;
  const formattedPrice = options.price ? `$${options.price.toFixed(2)}` : 'N/A';
  
  const paymentDetailsHtml = options.txnReference 
    ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Payment Information:</strong></p>
        <p style="margin: 2px 0; font-size: 13px; color: #334155;">Bank: ${options.paymentBank}</p>
        <p style="margin: 2px 0; font-size: 13px; color: #334155;">Reference ID: <code style="font-family: monospace; font-weight: bold; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px;">${options.txnReference}</code></p>
      </div>
    `
    : `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
        <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Payment Policy:</strong> Pay on-site at the car wash.</p>
      </div>
    `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Your Appointment is Confirmed!</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi <strong>${options.customerName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your booking with <strong>${options.businessName}</strong> has been successfully scheduled! Below are your appointment details:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 120px;">Booking ID:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${options.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Location:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${options.businessName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Address:</td>
            <td style="padding: 6px 0; color: #475569;">${options.address}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date:</td>
            <td style="padding: 6px 0; color: #0f172a;">${options.date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Time Slot:</td>
            <td style="padding: 6px 0; color: #10b981; font-weight: bold; font-size: 15px;">${options.timeSlot}</td>
          </tr>
          ${options.serviceName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service:</td>
            <td style="padding: 6px 0; color: #0f172a;">${options.serviceName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Amount:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${formattedPrice}</td>
          </tr>
        </table>
        
        ${paymentDetailsHtml}
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(options.customerEmail, subject, html, false);
}

/**
 * Send "Car Ready for Collection / Wash Completed" Email (Highest Utility Notification!)
 */
export async function sendWashCompletedEmail(options: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  businessName: string;
  vehiclePlate?: string;
  serviceName?: string;
  totalAmount?: number;
}): Promise<boolean> {
  const settings = getEmailSettings();
  if (!settings.notifyWashCompleted) {
    console.log('[EmailService] Skipped wash completed email (toggle is OFF).');
    recordEmailLog({
      to: options.customerEmail,
      from: formatResendFromAddress(settings.emailFromAddress),
      subject: `✨ Your Vehicle is Clean & Ready for Collection! - ${options.businessName}`,
      html: '<p>Skipped: "Wash Completed / Car Ready" notification is turned OFF in Admin Email Settings.</p>',
      status: 'SKIPPED',
      provider: settings.activeProvider,
      errorDetails: 'Skipped: "Wash Completed / Car Ready" toggle is switched OFF in Admin Settings.',
    });
    return false;
  }

  const subject = `✨ Your Vehicle is Clean & Ready for Collection! - ${options.businessName}`;
  const formattedPrice = options.totalAmount ? `$${options.totalAmount.toFixed(2)}` : undefined;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #bbf7d0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Wash Completed
        </div>
        <h1 style="color: #15803d; margin: 6px 0 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">Your Car is Ready!</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Autoshine BN Pick-Up Notification</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />

      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi <strong>${options.customerName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Great news! The team at <strong>${options.businessName}</strong> has completed washing and detailing your vehicle. It is clean, inspected, and ready for you to pick up.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 22px 0; font-size: 14px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #166534; font-weight: 600; width: 130px;">Car Wash:</td>
            <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${options.businessName}</td>
          </tr>
          ${options.vehiclePlate ? `
          <tr>
            <td style="padding: 5px 0; color: #166534; font-weight: 600;">License Plate:</td>
            <td style="padding: 5px 0; color: #0f172a; font-family: monospace; font-weight: bold; font-size: 15px;">${options.vehiclePlate}</td>
          </tr>
          ` : ''}
          ${options.serviceName ? `
          <tr>
            <td style="padding: 5px 0; color: #166534; font-weight: 600;">Service Rendered:</td>
            <td style="padding: 5px 0; color: #0f172a;">${options.serviceName}</td>
          </tr>
          ` : ''}
          ${formattedPrice ? `
          <tr>
            <td style="padding: 5px 0; color: #166534; font-weight: 600;">Total Amount:</td>
            <td style="padding: 5px 0; color: #15803d; font-weight: bold;">${formattedPrice}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 5px 0; color: #166534; font-weight: 600;">Status:</td>
            <td style="padding: 5px 0; color: #16a34a; font-weight: bold;">✅ Completed & Ready</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Please proceed to the counter to collect your keys. Thank you for booking with Autoshine BN!</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(options.customerEmail, subject, html, false);
}

/**
 * Send Booking Cancelled Email (Toggleable Notification)
 */
export async function sendBookingCancelledEmail(options: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  businessName: string;
  date: string;
  timeSlot: string;
  reason?: string;
}): Promise<boolean> {
  const settings = getEmailSettings();
  if (!settings.notifyBookingCancelled) {
    console.log('[EmailService] Skipped booking cancellation email (toggle is OFF).');
    recordEmailLog({
      to: options.customerEmail,
      from: formatResendFromAddress(settings.emailFromAddress),
      subject: `⚠️ Reservation Cancelled - ${options.businessName} (Autoshine BN)`,
      html: '<p>Skipped: "Booking Cancelled" notification is turned OFF in Admin Email Settings.</p>',
      status: 'SKIPPED',
      provider: settings.activeProvider,
      errorDetails: 'Skipped: "Booking Cancelled Email" toggle is switched OFF in Admin Settings.',
    });
    return false;
  }

  const subject = `⚠️ Reservation Cancelled - ${options.businessName} (Autoshine BN)`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fecaca; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #dc2626; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em;">Booking Cancelled</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Autoshine BN Notification</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />

      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hi <strong>${options.customerName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your booking at <strong>${options.businessName}</strong> on <strong>${options.date}</strong> (${options.timeSlot}) has been cancelled.</p>

      ${options.reason ? `
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 14px 18px; border-radius: 10px; margin: 18px 0; font-size: 13px; color: #991b1b;">
          <strong>Reason provided:</strong> ${options.reason}
        </div>
      ` : ''}

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">You are welcome to rebook another convenient time slot anytime on the Autoshine BN app.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(options.customerEmail, subject, html, false);
}
