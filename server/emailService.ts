/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  status: 'DELIVERED' | 'SIMULATED' | 'FAILED';
  provider: 'RESEND' | 'SANDBOX_CONSOLE';
  errorDetails?: string;
}

const emailLogsMemory: EmailLogEntry[] = [];
const MAX_LOGS = 100;

export function getEmailLogs(): EmailLogEntry[] {
  return [...emailLogsMemory];
}

export function clearEmailLogs(): void {
  emailLogsMemory.length = 0;
}

function recordEmailLog(entry: Omit<EmailLogEntry, 'id' | 'timestamp'>) {
  const log: EmailLogEntry = {
    ...entry,
    id: `log_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  emailLogsMemory.unshift(log);
  if (emailLogsMemory.length > MAX_LOGS) {
    emailLogsMemory.pop();
  }
}

/**
 * Sends a transactional email using the Resend API.
 * If the RESEND_API_KEY is not configured or is a placeholder,
 * it falls back to printing the email to the console for development/sandbox testing.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  let rawFrom = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
  
  // Normalize resend.com -> resend.dev for Resend sandbox domain
  if (rawFrom.endsWith('@resend.com')) {
    rawFrom = rawFrom.replace('@resend.com', '@resend.dev');
  }
  const fromAddress = rawFrom;

  console.log(`[EmailService] Preparing email dispatch to: ${to}`);
  console.log(`[EmailService] Sender: Autoshine BN <${fromAddress}>`);
  console.log(`[EmailService] Subject: "${subject}"`);

  if (!apiKey || apiKey.startsWith('your_') || apiKey.startsWith('re_12345')) {
    console.log('========================================================');
    console.log('📬 [EMAIL SERVICE SIMULATOR - RESEND OFFLINE FALLBACK]');
    console.log(`To: ${to}`);
    console.log(`From: Autoshine BN <${fromAddress}>`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------------');
    console.log('HTML Content Preview:');
    console.log(html);
    console.log('========================================================');

    recordEmailLog({
      to,
      from: `Autoshine BN <${fromAddress}>`,
      subject,
      html,
      status: 'SIMULATED',
      provider: 'SANDBOX_CONSOLE'
    });

    return true; // Simulate successful delivery in sandbox
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Autoshine BN <${fromAddress}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('========================================================');
      console.error(`❌ [EmailService] Resend API Error (${response.status}): ${errorText}`);
      console.error('💡 [Resend Sandbox Tip]: If you are using Resend free sandbox tier without a custom verified domain, Resend ONLY delivers emails to the email address associated with your Resend account owner!');
      console.error('========================================================');

      recordEmailLog({
        to,
        from: `Autoshine BN <${fromAddress}>`,
        subject,
        html,
        status: 'FAILED',
        provider: 'RESEND',
        errorDetails: `Resend Error (${response.status}): ${errorText}`
      });

      return false;
    }

    const data = await response.json();
    console.log(`[EmailService] Email dispatched successfully via Resend. ID: ${data.id}`);

    recordEmailLog({
      to,
      from: `Autoshine BN <${fromAddress}>`,
      subject,
      html,
      status: 'DELIVERED',
      provider: 'RESEND'
    });

    return true;
  } catch (error: any) {
    console.error('[EmailService] Failed to send email via Resend:', error);

    recordEmailLog({
      to,
      from: `Autoshine BN <${fromAddress}>`,
      subject,
      html,
      status: 'FAILED',
      provider: 'RESEND',
      errorDetails: error?.message || String(error)
    });

    return false;
  }
}

/**
 * Send a 6-digit OTP code for Email Verification upon Registration
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
  return sendEmail(email, subject, html);
}

/**
 * Send a 6-digit OTP code for password reset
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
  return sendEmail(email, subject, html);
}

/**
 * Send Booking Confirmation Email
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
  const subject = `Booking Confirmed: ${options.businessName} - Autoshine BN`;
  const formattedPrice = options.price ? `$${options.price.toFixed(2)}` : 'N/A';
  
  const paymentDetailsHtml = options.txnReference 
    ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Payment Information:</strong></p>
        <p style="margin: 2px 0; font-size: 13px; color: #334155;">Bank: ${options.paymentBank}</p>
        <p style="margin: 2px 0; font-size: 13px; color: #334155;">Reference ID: <code style="font-family: monospace; font-weight: bold; background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px;">${options.txnReference}</code></p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #0284c7; font-weight: 500;">Your pre-payment receipt is currently being verified by our staff.</p>
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

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Need to reschedule or cancel? You can manage your booking inside your Autoshine BN dashboard up to 2 hours before the start time.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;
  return sendEmail(options.customerEmail, subject, html);
}

/**
 * Send Welcome & Registration Confirmation Email for new accounts (Customer, Owner, Employee)
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

  const roleTitle = isEmployee
    ? 'Staff / Employee Account'
    : isOwner
    ? 'Car Wash Owner Account'
    : 'Customer Account';

  const subject = `Welcome to Autoshine BN - ${roleTitle} Created!`;

  const passwordNote = options.initialPassword
    ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">Your Initial Login Password:</p>
        <p style="margin: 6px 0 0 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #15803d;">${options.initialPassword}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #166534;">For security, please change your password after your initial login.</p>
      </div>
    `
    : '';

  const businessNote = options.businessName
    ? `<p style="font-size: 14px; color: #334155; margin: 4px 0;">Assigned Location: <strong>${options.businessName}</strong></p>`
    : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Autoshine BN</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Welcome to the Platform</p>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Account Registration Confirmed</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${options.name}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">Your account on Autoshine BN has been successfully registered and verified with the email address: <strong>${options.email}</strong>.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 600;">Account Details:</p>
        <p style="margin: 6px 0 2px 0; font-size: 14px; color: #0f172a;">Account Type: <strong>${roleTitle}</strong></p>
        <p style="margin: 2px 0 0 0; font-size: 14px; color: #0f172a;">Registered Email: <strong>${options.email}</strong></p>
        ${businessNote}
      </div>

      ${passwordNote}

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">You can now log in to access your customized dashboard, manage bookings, and explore features.</p>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
      <div style="text-align: center;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Autoshine BN. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(options.email, subject, html);
}
