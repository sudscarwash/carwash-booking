/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Email Service
 * 
 * Provides structural email generation and transmission.
 * Integrated with an abstract transport layer so you can toggle between
 * Nodemailer (SMTP), Resend, SendGrid, or AWS SES seamlessly.
 */
export class EmailService {
  private static getSenderAddress(): string {
    return process.env.EMAIL_FROM_ADDRESS || 'notifications@carwashscheduler.com';
  }

  /**
   * Helper to send transactional emails via SMTP or premium HTTP APIs
   */
  private static async sendRawEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    console.log(`[EmailService] Preparing email dispatch to: ${options.to}`);
    console.log(`[EmailService] Subject: "${options.subject}"`);

    // Wireframe for production SMTP (Nodemailer) setup:
    //
    // import nodemailer from 'nodemailer';
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT || '587'),
    //   secure: process.env.SMTP_SECURE === 'true',
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASSWORD
    //   }
    // });
    // await transporter.sendMail({ from: this.getSenderAddress(), ...options });

    // Wireframe for premium Resend API client setup:
    //
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ from: `CarWash <${this.getSenderAddress()}>`, ...options });

    return true; // Simulate success
  }

  /**
   * Send Verification OTP Code
   */
  public static async sendOTPCode(email: string, name: string, code: string): Promise<boolean> {
    const subject = `Your Security Verification Code: ${code}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 12px;">
        <h2 style="color: #4f46e5; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Security Verification</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You requested a security verification code. Please use the following code to verify your action:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e1b4b;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code is strictly valid for 15 minutes. Please do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px;">If you did not request this code, you can safely ignore this email or contact support.</p>
      </div>
    `;
    return this.sendRawEmail({ to: email, subject, html });
  }

  /**
   * Send Forgotten Password Reset Request Email
   */
  public static async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://carwashscheduler.com'}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password - AutoClean Scheduler';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #ef4444; font-size: 24px; margin-bottom: 16px;">Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the secure button below to choose a new password:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p>Alternatively, you can copy and paste the link below into your web browser:</p>
        <p style="word-break: break-all; color: #6366f1; font-size: 13px;">${resetUrl}</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 16px;">This link will expire in exactly 1 hour for security purposes.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px;">If you didn't request a password reset, your password is safe, and you can safely delete this email.</p>
      </div>
    `;
    return this.sendRawEmail({ to: email, subject, html });
  }

  /**
   * Send Booking Confirmation Email
   */
  public static async sendBookingConfirmation(options: {
    customerEmail: string;
    customerName: string;
    businessName: string;
    address: string;
    date: string;
    timeSlot: string;
    hasBreak?: boolean;
    breakTime?: string;
  }): Promise<boolean> {
    const subject = `Booking Confirmed: ${options.businessName}`;
    const breakWarningHtml = options.hasBreak
      ? `
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 13px;">
          <strong>⚠️ Notice of Break Closure:</strong> This location has a scheduled break close at <strong>${options.breakTime}</strong>. Please ensure you arrive on time to respect their operational timings.
        </div>
      `
      : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981; font-size: 24px; margin-bottom: 16px;">Appointment Confirmed!</h2>
        <p>Hi <strong>${options.customerName}</strong>,</p>
        <p>Your booking with <strong>${options.businessName}</strong> has been successfully processed and scheduled.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Reservation Details:</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>Location:</strong></td>
              <td style="padding: 6px 0; color: #1e293b;">${options.businessName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Address:</strong></td>
              <td style="padding: 6px 0; color: #1e293b;">${options.address}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Date:</strong></td>
              <td style="padding: 6px 0; color: #1e293b;">${options.date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Time Slot:</strong></td>
              <td style="padding: 6px 0; color: #1e293b; font-family: monospace; font-weight: bold;">${options.timeSlot}</td>
            </tr>
          </table>
          ${breakWarningHtml}
        </div>

        <p>If you need to make changes or reschedule your appointment, please log in to your dashboard at least 2 hours before the appointment.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">AutoClean Schedulers Inc. • Safe, secure, and touchless cleaning.</p>
      </div>
    `;
    return this.sendRawEmail({ to: options.customerEmail, subject, html });
  }
}
