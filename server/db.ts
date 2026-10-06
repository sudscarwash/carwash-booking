/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dns from 'node:dns';
// Force IPv4 DNS resolution first to bypass IPv6 ENETUNREACH errors in hosting environments (e.g., Render, Cloud Run, AIS)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { Role, BookingStatus, UserWithPassword, CarWash, Booking, AuditLog, WeeklySchedule, MapPreset, AppNotification, PlatformInfo, Review, ReviewSummary, CarWashMembershipConfig, CustomerMembership, MembershipPointsRule, MembershipPointsLedger, MembershipReward, MembershipRedemption, PointsTransactionType } from '../src/types.js';

let primaryDbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
let directDbUrl = process.env.DIRECT_URL || '';
let usePostgres = !!primaryDbUrl;
let postgresConnectionError: string | null = null;
let postgresConnected = false;
let activeConnectionUrl: string | null = primaryDbUrl || null;

let pgPool: pg.Pool | null = null;
let sqliteDb: Database.Database | null = null;

// Helper to mask credentials in connection URLs for logs and diagnostics
function maskDbUrl(url?: string | null): string {
  if (!url) return 'None';
  try {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
  } catch (e) {
    return 'Configured (Masked)';
  }
}

function parseHostAndPort(url?: string | null): { host: string | null; port: string | null } {
  if (!url) return { host: null, port: null };
  try {
    const match = url.match(/@([^:/]+)(?::(\d+))?/);
    if (match) {
      return { host: match[1], port: match[2] || '5432' };
    }
  } catch (e) {}
  return { host: null, port: null };
}

// Always initialize SQLite database safely as an emergency local fallback
const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.resolve(dataDir, 'carwash.db');

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  sqliteDb = new Database(dbPath);
  try {
    sqliteDb.pragma('journal_mode = WAL');
  } catch (pErr) {
    console.warn('[SQLite Pragma Warning]:', pErr);
  }
} catch (sqliteInitErr) {
  console.warn('[SQLite Init Fallback Notice]:', sqliteInitErr);
}

// Initialize PostgreSQL Pool with robust Supabase PgBouncer / Direct parameters
function createPgPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Bypass SSL certificate verification for hosted Supabase / Render / Neon
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });
}

if (usePostgres) {
  console.log('Initializing PostgreSQL database connection pool for Supabase...');
  console.log(`Primary URL: ${maskDbUrl(primaryDbUrl)}`);
  if (directDbUrl) {
    console.log(`Direct URL: ${maskDbUrl(directDbUrl)}`);
  }

  pgPool = createPgPool(primaryDbUrl);

  pgPool.on('error', (err) => {
    console.warn('[pgPool Idle Client Warning]:', err.message || err);
  });
} else {
  console.log('No DATABASE_URL or DIRECT_URL detected. Using local SQLite database at:', dbPath);
}

// Convert SQLite parameter and ignore queries into PostgreSQL-friendly SQL
function convertQueryToPg(sql: string): string {
  // Replace ? placeholders with $1, $2, etc.
  let index = 1;
  let result = sql.replace(/\?/g, () => `$${index++}`);

  // Replace camelCase and lowercase column names with snake_case column names for PostgreSQL compatibility
  const replacements: { [key: string]: string } = {
    passwordHash: 'password_hash',
    passwordhash: 'password_hash',
    isActive: 'is_active',
    isactive: 'is_active',
    isEmailVerified: 'is_email_verified',
    isemailverified: 'is_email_verified',
    businessId: 'business_id',
    businessid: 'business_id',
    createdAt: 'created_at',
    createdat: 'created_at',
    dateOfBirth: 'date_of_birth',
    dateofbirth: 'date_of_birth',
    profileImageUrl: 'profile_image_url',
    profileimageurl: 'profile_image_url',
    locationLat: 'location_lat',
    locationlat: 'location_lat',
    locationLng: 'location_lng',
    locationlng: 'location_lng',
    slotDuration: 'slot_duration',
    slotduration: 'slot_duration',
    capacityPerSlot: 'capacity_per_slot',
    capacityperslot: 'capacity_per_slot',
    ownerId: 'owner_id',
    ownerid: 'owner_id',
    carWashId: 'car_wash_id',
    carwashid: 'car_wash_id',
    customerId: 'customer_id',
    customerid: 'customer_id',
    customerName: 'customer_name',
    customername: 'customer_name',
    customerEmail: 'customer_email',
    customeremail: 'customer_email',
    timeSlot: 'time_slot',
    timeslot: 'time_slot',
    employeeId: 'employee_id',
    employeeid: 'employee_id',
    updatedAt: 'updated_at',
    updatedat: 'updated_at',
    paymentBank: 'payment_bank',
    paymentbank: 'payment_bank',
    txnReference: 'txn_reference',
    txnreference: 'txn_reference',
    receiptFilename: 'receipt_filename',
    receiptfilename: 'receipt_filename',
    serviceId: 'service_id',
    serviceid: 'service_id',
    serviceName: 'service_name',
    servicename: 'service_name',
    bibdAccountName: 'bibd_account_name',
    bibdaccountname: 'bibd_account_name',
    bibdAccountNo: 'bibd_account_no',
    bibdaccountno: 'bibd_account_no',
    bibdEnabled: 'bibd_enabled',
    bibdenabled: 'bibd_enabled',
    baiduriAccountName: 'baiduri_account_name',
    baiduriaccountname: 'baiduri_account_name',
    baiduriAccountNo: 'baiduri_account_no',
    baiduriaccountno: 'baiduri_account_no',
    baiduriEnabled: 'baiduri_enabled',
    baidurienabled: 'baiduri_enabled',
    bibdQrImageUrl: 'bibd_qr_image_url',
    bibdqrimageurl: 'bibd_qr_image_url',
    baiduriQrImageUrl: 'baiduri_qr_image_url',
    baiduriqrimageurl: 'baiduri_qr_image_url',
    customPaymentsJson: 'custom_payments_json',
    custompaymentsjson: 'custom_payments_json',
    paymentPolicy: 'payment_policy',
    paymentpolicy: 'payment_policy',
    servicesJson: 'services_json',
    servicesjson: 'services_json',
    scheduleOverridesJson: 'schedule_overrides_json',
    scheduleoverridesjson: 'schedule_overrides_json',
    userId: 'user_id',
    userid: 'user_id',
    userEmail: 'user_email',
    useremail: 'user_email',
    expiresAt: 'expires_at',
    expiresat: 'expires_at',
    logoUrl: 'logo_url',
    logourl: 'logo_url',
    openingHours: 'opening_hours',
    openinghours: 'opening_hours',
    isCustom: 'is_custom',
    iscustom: 'is_custom',
    bookingId: 'booking_id',
    bookingid: 'booking_id',
    isRead: 'is_read',
    isread: 'is_read',
    ownerReply: 'owner_reply',
    ownerreply: 'owner_reply',
    ownerReplyAt: 'owner_reply_at',
    ownerreplyat: 'owner_reply_at',
    ownerReplyBy: 'owner_reply_by',
    ownerreplyby: 'owner_reply_by',
    ownerNavigationEnabled: 'owner_navigation_enabled',
    ownernavigationenabled: 'owner_navigation_enabled',
    ownerQrCodeEnabled: 'owner_qr_code_enabled',
    ownerqrcodeenabled: 'owner_qr_code_enabled',
    membershipEnabled: 'membership_enabled',
    membershipenabled: 'membership_enabled',
    adminOtpRequired: 'admin_otp_required',
    adminotprequired: 'admin_otp_required',
    isFeatureEnabled: 'is_feature_enabled',
    isfeatureenabled: 'is_feature_enabled',
    isProgrammeActive: 'is_programme_active',
    isprogrammeactive: 'is_programme_active',
    programmeName: 'programme_name',
    programmename: 'programme_name',
    programmeDescription: 'programme_description',
    programmedescription: 'programme_description',
    pointsExpiryMonths: 'points_expiry_months',
    pointsexpirymonths: 'points_expiry_months',
    allowQrJoin: 'allow_qr_join',
    allowqrjoin: 'allow_qr_join',
    allowCounterJoin: 'allow_counter_join',
    allowcounterjoin: 'allow_counter_join',
    termsConditions: 'terms_conditions',
    termsconditions: 'terms_conditions',
    membershipNumber: 'membership_number',
    membershipnumber: 'membership_number',
    pointsBalance: 'points_balance',
    pointsbalance: 'points_balance',
    joinedAt: 'joined_at',
    joinedat: 'joined_at',
    joinMethod: 'join_method',
    joinmethod: 'join_method',
    consentGiven: 'consent_given',
    consentgiven: 'consent_given',
    consentTimestamp: 'consent_timestamp',
    consenttimestamp: 'consent_timestamp',
    termsVersion: 'terms_version',
    termsversion: 'terms_version',
    qrToken: 'qr_token',
    qrtoken: 'qr_token',
    pointsAwarded: 'points_awarded',
    pointsawarded: 'points_awarded',
    transactionType: 'transaction_type',
    transactiontype: 'transaction_type',
    redemptionId: 'redemption_id',
    redemptionid: 'redemption_id',
    performedById: 'performed_by_id',
    performedbyid: 'performed_by_id',
    performedByRole: 'performed_by_role',
    performedbyrole: 'performed_by_role',
    pointsCost: 'points_cost',
    pointscost: 'points_cost',
    rewardType: 'reward_type',
    rewardtype: 'reward_type',
    discountValue: 'discount_value',
    discountvalue: 'discount_value',
    eligibleServiceId: 'eligible_service_id',
    eligibleserviceid: 'eligible_service_id',
    redemptionCode: 'redemption_code',
    redemptioncode: 'redemption_code',
    rewardId: 'reward_id',
    rewardid: 'reward_id',
    rewardTitle: 'reward_title',
    rewardtitle: 'reward_title',
    pointsSpent: 'points_spent',
    pointsspent: 'points_spent',
    redemptionToken: 'redemption_token',
    redemptiontoken: 'redemption_token',
    redeemedAt: 'redeemed_at',
    redeemedat: 'redeemed_at',
    redeemedByStaffId: 'redeemed_by_staff_id',
    redeemedbystaffid: 'redeemed_by_staff_id',
  };

  // Perform whole-word replacements to avoid matching partial strings
  Object.keys(replacements).forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    result = result.replace(regex, replacements[key]);
  });

  // Map SQLite-specific "INSERT OR IGNORE" to PostgreSQL's "INSERT INTO ... ON CONFLICT (id) DO NOTHING"
  if (/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)/i.test(result)) {
    const tableName = RegExp.$1.toLowerCase();
    result = result.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    
    // Add primary key conflict targets
    if (
      tableName === 'users' ||
      tableName === 'car_washes' ||
      tableName === 'bookings' ||
      tableName === 'audit_logs' ||
      tableName === 'map_presets' ||
      tableName === 'notifications' ||
      tableName === 'reviews' ||
      tableName === 'car_wash_memberships_config' ||
      tableName === 'customer_memberships' ||
      tableName === 'membership_points_rules' ||
      tableName === 'membership_points_ledger' ||
      tableName === 'membership_rewards' ||
      tableName === 'membership_redemptions'
    ) {
      result += ' ON CONFLICT (id) DO NOTHING';
    }
  }

  return result;
}

let dbInitPromise: Promise<void> | null = null;

export function waitForDbReady(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = executeSeedFirestore();
  }
  return dbInitPromise;
}

async function ensureDbInitialized(): Promise<void> {
  if (usePostgres && !postgresConnected) {
    try {
      const p = waitForDbReady();
      await Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB init wait timeout')), 8000)),
      ]);
    } catch (e) {
      // Proceed to direct query attempt
    }
  }
}

// Low-level query execution helpers with automatic retry for hosted PostgreSQL (Supabase/PgBouncer)
async function runQueryAll(sql: string, params: any[] = []): Promise<any[]> {
  if (usePostgres) {
    await ensureDbInitialized();
    if (pgPool) {
      try {
        const pgSql = convertQueryToPg(sql);
        const res = await pgPool.query(pgSql, params);
        return res.rows;
      } catch (pgErr: any) {
        console.warn('[Postgres Query Warning - runQueryAll]:', pgErr.message || pgErr);
        // Wait 400ms and retry against Postgres once
        await new Promise((resolve) => setTimeout(resolve, 400));
        try {
          const pgSql = convertQueryToPg(sql);
          const res = await pgPool.query(pgSql, params);
          return res.rows;
        } catch (retryErr: any) {
          console.error('[Postgres Query Final Error - runQueryAll]:', retryErr.message || retryErr);
          if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
            throw retryErr;
          }
          if (!sqliteDb) throw retryErr;
          console.warn('[Postgres Fallback to SQLite]: Serving from local SQLite engine.');
          return sqliteDb.prepare(sql).all(...params);
        }
      }
    }
  }
  return sqliteDb!.prepare(sql).all(...params);
}

async function runQueryOne(sql: string, params: any[] = []): Promise<any | null> {
  if (usePostgres) {
    await ensureDbInitialized();
    if (pgPool) {
      try {
        const pgSql = convertQueryToPg(sql);
        const res = await pgPool.query(pgSql, params);
        return res.rows[0] || null;
      } catch (pgErr: any) {
        console.warn('[Postgres Query Warning - runQueryOne]:', pgErr.message || pgErr);
        await new Promise((resolve) => setTimeout(resolve, 400));
        try {
          const pgSql = convertQueryToPg(sql);
          const res = await pgPool.query(pgSql, params);
          return res.rows[0] || null;
        } catch (retryErr: any) {
          console.error('[Postgres Query Final Error - runQueryOne]:', retryErr.message || retryErr);
          if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
            throw retryErr;
          }
          if (!sqliteDb) throw retryErr;
          console.warn('[Postgres Fallback to SQLite]: Serving from local SQLite engine.');
          return sqliteDb.prepare(sql).get(...params) || null;
        }
      }
    }
  }
  return sqliteDb!.prepare(sql).get(...params) || null;
}

async function runQueryRun(sql: string, params: any[] = []): Promise<void> {
  if (usePostgres) {
    await ensureDbInitialized();
    if (pgPool) {
      try {
        const pgSql = convertQueryToPg(sql);
        await pgPool.query(pgSql, params);
        return;
      } catch (pgErr: any) {
        console.warn('[Postgres Query Warning - runQueryRun]:', pgErr.message || pgErr);
        await new Promise((resolve) => setTimeout(resolve, 400));
        try {
          const pgSql = convertQueryToPg(sql);
          await pgPool.query(pgSql, params);
          return;
        } catch (retryErr: any) {
          console.error('[Postgres Query Final Error - runQueryRun]:', retryErr.message || retryErr);
          if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
            throw retryErr;
          }
          if (!sqliteDb) throw retryErr;
          console.warn('[Postgres Fallback to SQLite]: Executing against local SQLite engine.');
          sqliteDb.prepare(sql).run(...params);
          return;
        }
      }
    }
  }
  sqliteDb!.prepare(sql).run(...params);
}

async function runExec(sql: string): Promise<void> {
  if (usePostgres) {
    // For Postgres, split and execute clean individual commands sequentially
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const statement of statements) {
      try {
        const pgSql = convertQueryToPg(statement);
        await pgPool!.query(pgSql);
      } catch (err: any) {
        if (!statement.includes('ALTER TABLE')) {
          console.warn('[Postgres Schema Warning]', err.message, 'on statement:', statement);
        }
      }
    }
  } else {
    sqliteDb!.exec(sql);
  }
}

// Mappers to transform raw table representation back to application TypeScript types
const mapUser = (row: any): UserWithPassword => {
  if (!row) return row;
  const isActiveVal = row.isActive !== undefined ? row.isActive : (row.is_active !== undefined ? row.is_active : row.isactive);
  const isEmailVerifiedVal = row.isEmailVerified !== undefined ? row.isEmailVerified : (row.is_email_verified !== undefined ? row.is_email_verified : row.isemailverified);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: isActiveVal === 1 || isActiveVal === true || isActiveVal === '1',
    isEmailVerified: isEmailVerifiedVal === undefined ? true : (isEmailVerifiedVal === 1 || isEmailVerifiedVal === true || isEmailVerifiedVal === '1'),
    businessId: row.businessId ?? row.business_id ?? row.businessid ?? undefined,
    passwordHash: row.passwordHash ?? row.password_hash ?? row.passwordhash ?? '',
    createdAt: row.createdAt ?? row.created_at ?? row.createdat ?? '',
    dateOfBirth: row.dateOfBirth ?? row.date_of_birth ?? row.dateofbirth ?? undefined,
    gender: row.gender ?? undefined,
    profileImageUrl: row.profileImageUrl ?? row.profile_image_url ?? row.profileimageurl ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
  };
};

export const generateSlug = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'wash';
};

/**
 * Generates a unique vanity slug for a car wash.
 * If "speedy-wash" already exists, it checks and creates "speedy-wash-2", "speedy-wash-3", etc.
 */
export async function getUniqueSlug(baseName: string, currentCarWashId?: string): Promise<string> {
  const baseSlug = generateSlug(baseName) || 'wash';
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    let existing;
    if (currentCarWashId) {
      existing = await runQueryOne(
        'SELECT id FROM car_washes WHERE LOWER(slug) = ? AND id != ?',
        [candidate.toLowerCase(), currentCarWashId]
      );
    } else {
      existing = await runQueryOne(
        'SELECT id FROM car_washes WHERE LOWER(slug) = ?',
        [candidate.toLowerCase()]
      );
    }
    if (!existing) {
      return candidate;
    }
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}

const mapCarWash = (row: any): CarWash => {
  if (!row) return row;
  const rawSlug = row.slug !== undefined ? row.slug : (row.slug ?? undefined);
  const slug = rawSlug || generateSlug(row.name || 'wash');
  const customPaymentsJson = row.customPaymentsJson ?? row.custom_payments_json ?? row.custompaymentsjson;
  let parsedCustom = [];
  try {
    if (customPaymentsJson) {
      parsedCustom = typeof customPaymentsJson === 'string' ? JSON.parse(customPaymentsJson) : customPaymentsJson;
    }
  } catch (e) {
    console.error("Error parsing customPaymentsJson:", e);
  }
  const servicesJson = row.servicesJson ?? row.services_json ?? row.servicesjson;
  let parsedServices = [];
  try {
    if (servicesJson) {
      parsedServices = typeof servicesJson === 'string' ? JSON.parse(servicesJson) : servicesJson;
    }
  } catch (e) {
    console.error("Error parsing servicesJson:", e);
  }
  const scheduleOverridesJson = row.scheduleOverridesJson ?? row.schedule_overrides_json ?? row.scheduleoverridesjson;
  let parsedOverrides = [];
  try {
    if (scheduleOverridesJson) {
      parsedOverrides = typeof scheduleOverridesJson === 'string' ? JSON.parse(scheduleOverridesJson) : scheduleOverridesJson;
    }
  } catch (e) {
    console.error("Error parsing scheduleOverridesJson:", e);
  }
  const isActiveVal = row.isActive !== undefined ? row.isActive : (row.is_active !== undefined ? row.is_active : row.isactive);
  const bibdEnabledVal = row.bibdEnabled !== undefined ? row.bibdEnabled : (row.bibd_enabled !== undefined ? row.bibd_enabled : row.bibdenabled);
  const baiduriEnabledVal = row.baiduriEnabled !== undefined ? row.baiduriEnabled : (row.baiduri_enabled !== undefined ? row.baiduri_enabled : row.baidurienabled);
  const ownerNavVal = row.ownerNavigationEnabled !== undefined 
    ? row.ownerNavigationEnabled 
    : (row.owner_navigation_enabled !== undefined ? row.owner_navigation_enabled : row.ownernavigationenabled);
  const ownerQrVal = row.ownerQrCodeEnabled !== undefined
    ? row.ownerQrCodeEnabled
    : (row.owner_qr_code_enabled !== undefined ? row.owner_qr_code_enabled : row.ownerqrcodeenabled);
  const membershipVal = row.membershipEnabled !== undefined
    ? row.membershipEnabled
    : (row.membership_enabled !== undefined ? row.membership_enabled : row.membershipenabled);
  const openingHours = row.openingHours ?? row.opening_hours ?? row.openinghours;

  return {
    id: row.id,
    name: row.name,
    slug,
    description: row.description ?? undefined,
    locationLat: Number(row.locationLat ?? row.location_lat ?? row.locationlat),
    locationLng: Number(row.locationLng ?? row.location_lng ?? row.locationlng),
    address: row.address,
    openingHours: typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours,
    slotDuration: Number(row.slotDuration ?? row.slot_duration ?? row.slotduration),
    capacityPerSlot: Number(row.capacityPerSlot ?? row.capacity_per_slot ?? row.capacityperslot),
    ownerId: row.ownerId ?? row.owner_id ?? row.ownerid,
    isActive: isActiveVal === 1 || isActiveVal === true || isActiveVal === '1',
    ownerNavigationEnabled: ownerNavVal !== undefined ? (ownerNavVal === 1 || ownerNavVal === true || ownerNavVal === '1') : true,
    ownerQrCodeEnabled: ownerQrVal !== undefined ? (ownerQrVal === 1 || ownerQrVal === true || ownerQrVal === '1') : false,
    membershipEnabled: membershipVal !== undefined ? (membershipVal === 1 || membershipVal === true || membershipVal === '1') : false,
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    phone: row.phone ?? undefined,
    instagram: row.instagram ?? undefined,
    logoUrl: row.logoUrl ?? row.logo_url ?? row.logourl ?? undefined,
    bibdAccountName: row.bibdAccountName ?? row.bibd_account_name ?? row.bibdaccountname ?? undefined,
    bibdAccountNo: row.bibdAccountNo ?? row.bibd_account_no ?? row.bibdaccountno ?? undefined,
    bibdEnabled: bibdEnabledVal === 1 || bibdEnabledVal === true || bibdEnabledVal === '1',
    baiduriAccountName: row.baiduriAccountName ?? row.baiduri_account_name ?? row.baiduriaccountname ?? undefined,
    baiduriAccountNo: row.baiduriAccountNo ?? row.baiduri_account_no ?? row.baiduriaccountno ?? undefined,
    baiduriEnabled: baiduriEnabledVal === 1 || baiduriEnabledVal === true || baiduriEnabledVal === '1',
    bibdQrImageUrl: row.bibdQrImageUrl ?? row.bibd_qr_image_url ?? row.bibdqrimageurl ?? undefined,
    baiduriQrImageUrl: row.baiduriQrImageUrl ?? row.baiduri_qr_image_url ?? row.baiduriqrimageurl ?? undefined,
    customPaymentsJson: customPaymentsJson ?? undefined,
    customPaymentMethods: parsedCustom,
    paymentPolicy: 'PAY_ON_SITE', // Always use Pay at Counter on site
    servicesJson: servicesJson ?? undefined,
    services: parsedServices,
    scheduleOverridesJson: scheduleOverridesJson ?? undefined,
    scheduleOverrides: parsedOverrides,
  };
};

const mapBooking = (row: any): Booking => {
  if (!row) return row;
  const rawPhone = row.customerPhone ?? row.customer_phone ?? row.customerphone ?? row.user_phone ?? row.userphone ?? undefined;
  const validPhone = rawPhone && String(rawPhone).trim() !== '' && String(rawPhone).trim().toUpperCase() !== 'NA' && String(rawPhone).trim().toUpperCase() !== 'N/A'
    ? String(rawPhone).trim()
    : (row.user_phone && String(row.user_phone).trim() !== '' && String(row.user_phone).trim().toUpperCase() !== 'NA' && String(row.user_phone).trim().toUpperCase() !== 'N/A' ? String(row.user_phone).trim() : undefined);

  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    customerName: row.customerName ?? row.customer_name ?? row.customername ?? row.user_name ?? 'Customer',
    customerEmail: row.customerEmail ?? row.customer_email ?? row.customeremail ?? row.user_email,
    customerPhone: validPhone,
    vehicleInfo: row.vehicleInfo ?? row.vehicle_info ?? row.vehicleinfo ?? undefined,
    bookingSource: (row.bookingSource ?? row.booking_source ?? row.bookingsource) || 'ONLINE',
    createdByRole: row.createdByRole ?? row.created_by_role ?? row.createdbyrole ?? undefined,
    createdByEmail: row.createdByEmail ?? row.created_by_email ?? row.createdbyemail ?? undefined,
    date: row.date,
    timeSlot: row.timeSlot ?? row.time_slot ?? row.timeslot,
    status: row.status,
    notes: row.notes ?? undefined,
    employeeId: row.employeeId ?? row.employee_id ?? row.employeeid ?? undefined,
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat,
    paymentBank: row.paymentBank ?? row.payment_bank ?? row.paymentbank ?? undefined,
    txnReference: row.txnReference ?? row.txn_reference ?? row.txnreference ?? undefined,
    receiptFilename: row.receiptFilename ?? row.receipt_filename ?? row.receiptfilename ?? undefined,
    serviceId: row.serviceId ?? row.service_id ?? row.serviceid ?? undefined,
    serviceName: row.serviceName ?? row.service_name ?? row.servicename ?? undefined,
    price: row.price !== undefined && row.price !== null ? Number(row.price) : undefined,
  };
};

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { open: '08:00', close: '18:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  tuesday: { open: '08:00', close: '18:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  wednesday: { open: '08:00', close: '18:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  thursday: { open: '08:00', close: '18:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  friday: { open: '08:00', close: '19:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  saturday: { open: '09:00', close: '17:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
  sunday: { open: '10:00', close: '16:00', isOpen: true, hasBreak: false, breakStart: '', breakEnd: '' },
};

// Seeding engine
async function executeSeedFirestore() {
  if (usePostgres) {
    let connected = false;
    // Attempt connecting to primary PostgreSQL pool (with up to 3 retries)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Supabase Connection] Testing connection (Attempt ${attempt}/3)...`);
        if (!pgPool && activeConnectionUrl) {
          pgPool = createPgPool(activeConnectionUrl);
        }
        if (pgPool) {
          const client = await pgPool.connect();
          client.release();
          connected = true;
          postgresConnected = true;
          postgresConnectionError = null;
          console.log(`✅ [Supabase PostgreSQL] Connection verified successfully to ${maskDbUrl(activeConnectionUrl)}!`);
          break;
        }
      } catch (err: any) {
        postgresConnectionError = err.message || String(err);
        console.warn(`[Supabase Connection Warning - Attempt ${attempt}/3]:`, postgresConnectionError);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
      }
    }

    // If primary failed and DIRECT_URL is configured, attempt connecting via DIRECT_URL
    if (!connected && directDbUrl && directDbUrl !== activeConnectionUrl) {
      try {
        console.log(`[Supabase Connection] Attempting failover to DIRECT_URL (${maskDbUrl(directDbUrl)})...`);
        if (pgPool) {
          try { await pgPool.end(); } catch (e) {}
        }
        activeConnectionUrl = directDbUrl;
        pgPool = createPgPool(directDbUrl);
        const client = await pgPool.connect();
        client.release();
        connected = true;
        postgresConnected = true;
        postgresConnectionError = null;
        console.log('✅ [Supabase PostgreSQL] Failover to DIRECT_URL succeeded!');
      } catch (directErr: any) {
        postgresConnectionError = directErr.message || String(directErr);
        console.warn('[Supabase Direct Connection Error]:', postgresConnectionError);
      }
    }

    if (!connected) {
      console.warn('⚠️ PostgreSQL connection could not be established immediately on boot.');
      console.warn('⚠️ Error details:', postgresConnectionError);
      console.log('ℹ️ Queries will automatically attempt live Postgres reconnection on demand, with local emergency SQLite caching.');
    }
  }

  // Initialize table schema structures safely
  await runExec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      businessId TEXT,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS car_washes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      locationLat REAL NOT NULL,
      locationLng REAL NOT NULL,
      address TEXT NOT NULL,
      openingHours TEXT NOT NULL,
      slotDuration INTEGER NOT NULL,
      capacityPerSlot INTEGER NOT NULL,
      ownerId TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      carWashId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      customerEmail TEXT NOT NULL,
      date TEXT NOT NULL,
      timeSlot TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      employeeId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      paymentBank TEXT,
      txnReference TEXT UNIQUE,
      receiptFilename TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS map_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      country TEXT NOT NULL,
      isCustom INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      bookingId TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_info (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      contact TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      address TEXT NOT NULL,
      companyName TEXT,
      description TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      carWashId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      customerEmail TEXT,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      ownerReply TEXT,
      ownerReplyAt TEXT,
      ownerReplyBy TEXT,
      bookingId TEXT
    );

    CREATE TABLE IF NOT EXISTS car_wash_memberships_config (
      id TEXT PRIMARY KEY,
      carWashId TEXT UNIQUE NOT NULL,
      isFeatureEnabled INTEGER NOT NULL DEFAULT 0,
      isProgrammeActive INTEGER NOT NULL DEFAULT 0,
      programmeName TEXT NOT NULL,
      programmeDescription TEXT,
      pointsExpiryMonths INTEGER NOT NULL DEFAULT 0,
      allowQrJoin INTEGER NOT NULL DEFAULT 1,
      allowCounterJoin INTEGER NOT NULL DEFAULT 1,
      termsConditions TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_memberships (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      carWashId TEXT NOT NULL,
      membershipNumber TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      pointsBalance INTEGER NOT NULL DEFAULT 0,
      joinedAt TEXT NOT NULL,
      joinMethod TEXT NOT NULL DEFAULT 'ONLINE_OPT_IN',
      consentGiven INTEGER NOT NULL DEFAULT 1,
      consentTimestamp TEXT NOT NULL,
      termsVersion TEXT DEFAULT '1.0',
      qrToken TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(customerId, carWashId)
    );

    CREATE TABLE IF NOT EXISTS membership_points_rules (
      id TEXT PRIMARY KEY,
      carWashId TEXT NOT NULL,
      serviceId TEXT NOT NULL,
      serviceName TEXT NOT NULL,
      pointsAwarded INTEGER NOT NULL DEFAULT 10,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(carWashId, serviceId)
    );

    CREATE TABLE IF NOT EXISTS membership_points_ledger (
      id TEXT PRIMARY KEY,
      membershipId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      carWashId TEXT NOT NULL,
      points INTEGER NOT NULL,
      transactionType TEXT NOT NULL,
      description TEXT NOT NULL,
      bookingId TEXT,
      redemptionId TEXT,
      performedById TEXT NOT NULL,
      performedByRole TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_rewards (
      id TEXT PRIMARY KEY,
      carWashId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      pointsCost INTEGER NOT NULL,
      rewardType TEXT NOT NULL DEFAULT 'FREE_SERVICE',
      discountValue REAL DEFAULT 0,
      eligibleServiceId TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_redemptions (
      id TEXT PRIMARY KEY,
      redemptionCode TEXT UNIQUE NOT NULL,
      membershipId TEXT NOT NULL,
      customerId TEXT NOT NULL,
      carWashId TEXT NOT NULL,
      rewardId TEXT NOT NULL,
      rewardTitle TEXT NOT NULL,
      pointsSpent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      redemptionToken TEXT UNIQUE NOT NULL,
      expiresAt TEXT,
      redeemedAt TEXT,
      redeemedByStaffId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_carwash ON bookings(carWashId);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customerId);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_memberships_carwash ON customer_memberships(carWashId);
    CREATE INDEX IF NOT EXISTS idx_memberships_customer ON customer_memberships(customerId);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // Dynamically add rich user profile columns and ensure all required core columns exist
  const alterColumns = [
    'ALTER TABLE car_washes ADD COLUMN membershipEnabled INTEGER DEFAULT 0',
    'ALTER TABLE membership_rewards ADD COLUMN maxRedemptionsPerMember INTEGER DEFAULT 0',
    'ALTER TABLE membership_rewards ADD COLUMN maxTotalSupply INTEGER DEFAULT 0',
    'ALTER TABLE membership_rewards ADD COLUMN claimCount INTEGER DEFAULT 0',
    'ALTER TABLE car_wash_memberships_config ADD COLUMN maxRedemptionsPerMemberPerDay INTEGER DEFAULT 0',
    'ALTER TABLE reviews ADD COLUMN ownerReply TEXT',
    'ALTER TABLE reviews ADD COLUMN ownerReplyAt TEXT',
    'ALTER TABLE reviews ADD COLUMN ownerReplyBy TEXT',
    'ALTER TABLE reviews ADD COLUMN bookingId TEXT',
    'ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN businessId TEXT',
    'ALTER TABLE users ADD COLUMN passwordHash TEXT',
    'ALTER TABLE users ADD COLUMN createdAt TEXT',
    'ALTER TABLE car_washes ADD COLUMN isActive INTEGER DEFAULT 1',
    'ALTER TABLE car_washes ADD COLUMN slug TEXT',
    'ALTER TABLE car_washes ADD COLUMN description TEXT',
    'ALTER TABLE car_washes ADD COLUMN locationLat REAL DEFAULT 4.8917',
    'ALTER TABLE car_washes ADD COLUMN locationLng REAL DEFAULT 114.9401',
    'ALTER TABLE car_washes ADD COLUMN address TEXT',
    'ALTER TABLE car_washes ADD COLUMN openingHours TEXT',
    'ALTER TABLE car_washes ADD COLUMN slotDuration INTEGER DEFAULT 30',
    'ALTER TABLE car_washes ADD COLUMN capacityPerSlot INTEGER DEFAULT 2',
    'ALTER TABLE car_washes ADD COLUMN ownerId TEXT',
    'ALTER TABLE users ADD COLUMN dateOfBirth TEXT',
    'ALTER TABLE users ADD COLUMN gender TEXT',
    'ALTER TABLE users ADD COLUMN profileImageUrl TEXT',
    'ALTER TABLE users ADD COLUMN address TEXT',
    'ALTER TABLE users ADD COLUMN phone TEXT',
    'ALTER TABLE car_washes ADD COLUMN phone TEXT',
    'ALTER TABLE car_washes ADD COLUMN instagram TEXT',
    'ALTER TABLE car_washes ADD COLUMN logoUrl TEXT',
    'ALTER TABLE car_washes ADD COLUMN bibdAccountName TEXT',
    'ALTER TABLE car_washes ADD COLUMN bibdAccountNo TEXT',
    'ALTER TABLE car_washes ADD COLUMN bibdEnabled INTEGER DEFAULT 0',
    'ALTER TABLE car_washes ADD COLUMN baiduriAccountName TEXT',
    'ALTER TABLE car_washes ADD COLUMN baiduriAccountNo TEXT',
    'ALTER TABLE car_washes ADD COLUMN baiduriEnabled INTEGER DEFAULT 0',
    'ALTER TABLE car_washes ADD COLUMN bibdQrImageUrl TEXT',
    'ALTER TABLE car_washes ADD COLUMN baiduriQrImageUrl TEXT',
    'ALTER TABLE car_washes ADD COLUMN customPaymentsJson TEXT',
    'ALTER TABLE car_washes ADD COLUMN paymentPolicy TEXT DEFAULT \'PRE_PAYMENT\'',
    'ALTER TABLE car_washes ADD COLUMN servicesJson TEXT',
    'ALTER TABLE car_washes ADD COLUMN scheduleOverridesJson TEXT',
    'ALTER TABLE car_washes ADD COLUMN ownerNavigationEnabled INTEGER DEFAULT 1',
    'ALTER TABLE car_washes ADD COLUMN ownerQrCodeEnabled INTEGER DEFAULT 0',
    'ALTER TABLE bookings ADD COLUMN carWashId TEXT',
    'ALTER TABLE bookings ADD COLUMN customerId TEXT',
    'ALTER TABLE bookings ADD COLUMN customerName TEXT',
    'ALTER TABLE bookings ADD COLUMN customerEmail TEXT',
    'ALTER TABLE bookings ADD COLUMN customerPhone TEXT',
    'ALTER TABLE bookings ADD COLUMN vehicleInfo TEXT',
    'ALTER TABLE bookings ADD COLUMN bookingSource TEXT DEFAULT \'ONLINE\'',
    'ALTER TABLE bookings ADD COLUMN createdByRole TEXT',
    'ALTER TABLE bookings ADD COLUMN createdByEmail TEXT',
    'ALTER TABLE bookings ADD COLUMN date TEXT',
    'ALTER TABLE bookings ADD COLUMN timeSlot TEXT',
    'ALTER TABLE bookings ADD COLUMN status TEXT',
    'ALTER TABLE bookings ADD COLUMN notes TEXT',
    'ALTER TABLE bookings ADD COLUMN employeeId TEXT',
    'ALTER TABLE bookings ADD COLUMN createdAt TEXT',
    'ALTER TABLE bookings ADD COLUMN updatedAt TEXT',
    'ALTER TABLE bookings ADD COLUMN paymentBank TEXT',
    'ALTER TABLE bookings ADD COLUMN txnReference TEXT',
    'ALTER TABLE bookings ADD COLUMN receiptFilename TEXT',
    'ALTER TABLE bookings ADD COLUMN serviceId TEXT',
    'ALTER TABLE bookings ADD COLUMN serviceName TEXT',
    'ALTER TABLE bookings ADD COLUMN price REAL DEFAULT 0',
    'ALTER TABLE platform_info ADD COLUMN companyName TEXT',
    'ALTER TABLE platform_info ADD COLUMN description TEXT',
    'ALTER TABLE platform_info ADD COLUMN adminOtpRequired INTEGER DEFAULT 1',
  ];

  // Try renaming un-underscored Postgres columns if present from legacy schemas
  if (usePostgres) {
    const renameQueries = [
      'ALTER TABLE platform_info RENAME COLUMN adminotprequired TO admin_otp_required',
      'ALTER TABLE bookings RENAME COLUMN carwashid TO car_wash_id',
      'ALTER TABLE bookings RENAME COLUMN customerid TO customer_id',
      'ALTER TABLE bookings RENAME COLUMN customername TO customer_name',
      'ALTER TABLE bookings RENAME COLUMN customeremail TO customer_email',
      'ALTER TABLE bookings RENAME COLUMN timeslot TO time_slot',
      'ALTER TABLE bookings RENAME COLUMN createdat TO created_at',
      'ALTER TABLE bookings RENAME COLUMN updatedat TO updated_at',
      'ALTER TABLE car_washes RENAME COLUMN locationlat TO location_lat',
      'ALTER TABLE car_washes RENAME COLUMN locationlng TO location_lng',
      'ALTER TABLE car_washes RENAME COLUMN slotduration TO slot_duration',
      'ALTER TABLE car_washes RENAME COLUMN capacityperslot TO capacity_per_slot',
      'ALTER TABLE car_washes RENAME COLUMN ownerid TO owner_id',
      'ALTER TABLE car_washes RENAME COLUMN openinghours TO opening_hours',
      'ALTER TABLE car_washes RENAME COLUMN servicesjson TO services_json',
      'ALTER TABLE car_washes RENAME COLUMN custompaymentsjson TO custom_payments_json',
      'ALTER TABLE car_washes RENAME COLUMN scheduleoverridesjson TO schedule_overrides_json',
      'ALTER TABLE car_washes RENAME COLUMN logourl TO logo_url',
      'ALTER TABLE car_washes RENAME COLUMN isactive TO is_active',
      'ALTER TABLE platform_info RENAME COLUMN companyname TO company_name',
      'ALTER TABLE platform_info RENAME COLUMN updatedat TO updated_at',
      'ALTER TABLE reviews RENAME COLUMN carwashid TO car_wash_id',
      'ALTER TABLE reviews RENAME COLUMN customerid TO customer_id',
      'ALTER TABLE reviews RENAME COLUMN customername TO customer_name',
      'ALTER TABLE reviews RENAME COLUMN customeremail TO customer_email',
      'ALTER TABLE reviews RENAME COLUMN createdat TO created_at',
      'ALTER TABLE reviews RENAME COLUMN updatedat TO updated_at',
      'ALTER TABLE reviews RENAME COLUMN ownerreply TO owner_reply',
      'ALTER TABLE reviews RENAME COLUMN ownerreplyat TO owner_reply_at',
      'ALTER TABLE reviews RENAME COLUMN ownerreplyby TO owner_reply_by',
      'ALTER TABLE reviews RENAME COLUMN bookingid TO booking_id',
    ];
    for (const renameSql of renameQueries) {
      try {
        await pgPool!.query(renameSql);
      } catch (e) {
        // Ignore if column doesn't exist or target already exists
      }
    }
  }

  for (const query of alterColumns) {
    try {
      if (usePostgres) {
        const pgSql = convertQueryToPg(query);
        await pgPool!.query(pgSql);
      } else {
        sqliteDb!.exec(query);
      }
    } catch (e: any) {
      // Safely ignore duplicate column / column already exists errors
      const isDuplicatePostgres = usePostgres && (e.code === '42701' || e.message?.includes('already exists'));
      const isDuplicateSqlite = !usePostgres && e.message?.includes('duplicate column name');
      if (!isDuplicatePostgres && !isDuplicateSqlite) {
        console.warn(`[Schema Alter Warning] Failed to run "${query}":`, e.message || e);
      }
    }
  }

  // Create standard unique index for transaction references on SQLite or Postgres
  try {
    if (usePostgres) {
      const indexSql = convertQueryToPg(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_txnReference ON bookings(txnReference)`);
      await pgPool!.query(indexSql);
    } else {
      sqliteDb!.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_txnReference ON bookings(txnReference)`);
    }
  } catch (e) {
    // ignore
  }

  // 🔒 Enable Row-Level Security (RLS) on all public PostgreSQL tables for Supabase Security compliance
  if (usePostgres && pgPool) {
    const rlsTables = [
      'password_resets',
      'users',
      'car_washes',
      'bookings',
      'audit_logs',
      'map_presets',
      'notifications',
      'platform_info',
      'reviews',
    ];
    for (const table of rlsTables) {
      try {
        await pgPool.query(`ALTER TABLE IF EXISTS "${table}" ENABLE ROW LEVEL SECURITY;`);
      } catch (rlsErr) {
        // Ignore if table does not exist yet or already enabled
      }
    }
  }

  console.log('Database schema structures and dynamic tables verified.');

  // Seed Default Autoshine Platform Info or migrate placeholder values
  try {
    const existingRow = await runQueryOne("SELECT * FROM platform_info WHERE id = 'autoshine_info'") as any;
    if (!existingRow) {
      console.log('Seeding default Autoshine Platform Info...');
      await runQueryRun(`
        INSERT INTO platform_info (id, email, contact, whatsapp, address, companyName, description, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'autoshine_info',
        'info@autoshinebn.com',
        '+673 8974459',
        '+673 8974459',
        'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318',
        'AUTOSHINE BN',
        "Brunei's premier car wash & auto detailing digital booking platform.",
        new Date().toISOString()
      ]);
    } else if (
      existingRow.email === 'support@autoshine.bn' || 
      existingRow.whatsapp === '+673 888 1234' || 
      existingRow.contact === '+673 888 1234' ||
      !existingRow.address ||
      existingRow.address === 'Bandar Seri Begawan, Brunei Darussalam'
    ) {
      console.log('Updating database platform_info with official Autoshine BN contact details...');
      if (usePostgres) {
        await runQueryRun(`
          UPDATE platform_info
          SET email = ?, contact = ?, whatsapp = ?, address = ?, company_name = ?, updated_at = ?
          WHERE id = 'autoshine_info'
        `, [
          'info@autoshinebn.com',
          '+673 8974459',
          '+673 8974459',
          'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318',
          'AUTOSHINE BN',
          new Date().toISOString()
        ]);
      } else {
        await runQueryRun(`
          UPDATE platform_info
          SET email = ?, contact = ?, whatsapp = ?, address = ?, companyName = ?, updatedAt = ?
          WHERE id = 'autoshine_info'
        `, [
          'info@autoshinebn.com',
          '+673 8974459',
          '+673 8974459',
          'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318',
          'AUTOSHINE BN',
          new Date().toISOString()
        ]);
      }
    }
  } catch (err) {
    console.error('Error seeding/updating default platform info:', err);
  }

  // Seed default Brunei location
  try {
    const hasBrunei = await runQueryOne("SELECT COUNT(*) AS count FROM car_washes WHERE id = 'cw_brunei'") as { count: any };
    const countVal = hasBrunei ? parseInt(hasBrunei.count, 10) : 0;
    if (countVal === 0) {
      console.log('Adding default Brunei location: Brunei Royal Auto Spa...');
      await runQueryRun(`
        INSERT INTO car_washes (id, name, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, ownerId, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'cw_brunei',
        'Brunei Royal Auto Spa',
        'Premium hand wash, ceramic shield protection, and interior luxury detailing in Bandar Seri Begawan. Utilizing water purification systems for the ultimate spot-free royal shine.',
        4.8917,
        114.9401,
        'Lot 1234, Jalan Gadong, Bandar Seri Begawan, Brunei BE1118',
        JSON.stringify(DEFAULT_SCHEDULE),
        30,
        2,
        'usr_owner',
        1,
        new Date().toISOString()
      ]);
    }

    // Normalize all car wash payment policies to PAY_ON_SITE & clean up legacy dev asset paths
    await runQueryRun("UPDATE car_washes SET paymentPolicy = 'PAY_ON_SITE'");
    await runQueryRun("UPDATE car_washes SET logoUrl = NULL WHERE logoUrl LIKE '/src/assets/%'");
    await runQueryRun("UPDATE car_washes SET slug = 'brunei-royal-auto-spa' WHERE id = 'cw_brunei' AND (slug IS NULL OR slug = '')");

    const defaultBruneiServices = [
      {
        id: 'srv_express_wash',
        name: 'Express Jet Wash & Towel Dry',
        price: 10.00,
        duration: 20,
        type: 'service',
        description: 'Fast exterior water jet foam rinse with soft microfiber hand dry. Ideal for a quick clean on the go.',
        isPopular: false
      },
      {
        id: 'srv_deluxe_wash',
        name: 'Deluxe Foam Wash, Wax & Tyre Shine',
        price: 25.00,
        duration: 60,
        type: 'service',
        description: 'Full exterior foam wash, spray wax protection, deep interior vacuum, dashboard wipe, and premium tyre shine.',
        isPopular: true
      },
      {
        id: 'srv_ceramic_detail',
        name: 'Premium Ceramic Coating & Deep Detailing',
        price: 45.00,
        duration: 90,
        type: 'service',
        description: 'Ultimate hand wash detailing with clay bar decontamination, hydrophobic ceramic spray sealant, and engine bay wipe.',
        isPopular: false
      },
      {
        id: 'addon_headlight',
        name: 'Headlight Polish & Lens Restoration',
        price: 15.00,
        duration: 15,
        type: 'addon',
        description: 'Professional headlight lens clarity restoration removing yellowing, cloudiness and hazing.',
        isPopular: false
      },
      {
        id: 'addon_tyre',
        name: 'Tyre Shine & Hydrophobic Rim Coating',
        price: 5.00,
        duration: 10,
        type: 'addon',
        description: 'Deep glossy tyre dressing and protective hydrophobic rim shine coat.',
        isPopular: false
      },
      {
        id: 'addon_windscreen',
        name: 'Windscreen Rain-Repellent Treatment',
        price: 8.00,
        duration: 10,
        type: 'addon',
        description: 'Hydrophobic glass coating that repels rain drops and improves driving visibility in heavy downpours.',
        isPopular: false
      },
      {
        id: 'addon_steam',
        name: 'Interior Steam Sanitization & Deodorizer',
        price: 12.00,
        duration: 20,
        type: 'addon',
        description: 'High-temperature steam treatment targeting AC vents, seats and carpets to eliminate bacteria and odors.',
        isPopular: false
      },
      {
        id: 'addon_engine',
        name: 'Engine Bay Degreasing & Dressing',
        price: 20.00,
        duration: 25,
        type: 'addon',
        description: 'Safe engine compartment degreasing and protective rubber/plastic dressing for a show-room shine.',
        isPopular: false
      },
      {
        id: 'prod_microfiber',
        name: 'Microfiber Detailing Towel Pack (3-pc)',
        price: 6.00,
        duration: 0,
        type: 'product',
        description: 'Ultra-soft 400GSM plush microfiber towels for scratch-free drying and interior wiping.',
        isPopular: false
      },
      {
        id: 'prod_shampoo',
        name: 'PH-Neutral Auto Wash Shampoo 500ml',
        price: 12.00,
        duration: 0,
        type: 'product',
        description: 'Concentrated high-foaming car wash soap safe for wax and ceramic coatings.',
        isPopular: false
      },
      {
        id: 'prod_ceramic_spray',
        name: 'Hydrophobic Ceramic Guard Spray 300ml',
        price: 18.00,
        duration: 0,
        type: 'product',
        description: 'Easy spray-on ceramic sealant providing 3 months of gloss and extreme water beading.',
        isPopular: false
      }
    ];

    await runQueryRun(
      "UPDATE car_washes SET servicesJson = ? WHERE id = 'cw_brunei' AND (servicesJson IS NULL OR servicesJson = '' OR servicesJson = '[]')",
      [JSON.stringify(defaultBruneiServices)]
    );

    // Loyalty & rewards remain inactive by default until explicitly enabled by Admin or Special User
    // Default membership config, points rules, and rewards template are seeded ready for activation
    const existingConfig = await runQueryOne("SELECT id FROM car_wash_memberships_config WHERE carWashId = 'cw_brunei'");
    if (!existingConfig) {
      const now = new Date().toISOString();
      await runQueryRun(`
        INSERT INTO car_wash_memberships_config (
          id, carWashId, isFeatureEnabled, isProgrammeActive, programmeName, programmeDescription,
          pointsExpiryMonths, allowQrJoin, allowCounterJoin, maxRedemptionsPerMemberPerDay, termsConditions, updatedAt
        ) VALUES (?, ?, 0, 0, ?, ?, 12, 1, 1, 2, ?, ?)
      `, [
        'mcfg_cw_brunei',
        'cw_brunei',
        'Brunei Royal VIP Club',
        'Earn points on every wash booking or bay visit. Redeem points for free foam washes, wax treatments, and exclusive savings.',
        'Points are non-transferable and valid for 12 months. Redemptions are subject to bay slot availability.',
        now
      ]);

      // Seed Points Rules for services
      const defaultRules = [
        { serviceId: 'srv_express_wash', name: 'Express Jet Wash & Towel Dry', pts: 10 },
        { serviceId: 'srv_deluxe_wash', name: 'Deluxe Foam Wash, Wax & Tyre Shine', pts: 25 },
        { serviceId: 'srv_ceramic_detail', name: 'Premium Ceramic Coating & Deep Detailing', pts: 50 },
      ];
      for (const r of defaultRules) {
        await runQueryRun(`
          INSERT INTO membership_points_rules (id, carWashId, serviceId, serviceName, pointsAwarded, isActive, createdAt, updatedAt)
          VALUES (?, 'cw_brunei', ?, ?, ?, 1, ?, ?)
        `, [`mpr_cw_brunei_${r.serviceId}`, r.serviceId, r.name, r.pts, now, now]);
      }

      // Seed Rewards Catalog with max limits
      const defaultRewards = [
        {
          id: 'mrw_tyre_shine',
          title: 'Free Tyre Shine & Hydrophobic Rim Gloss',
          description: 'Glossy tyre dressing and hydrophobic rim protection on your next visit.',
          pointsCost: 50,
          rewardType: 'FREE_ADDON',
          discountValue: 5,
          maxRedemptionsPerMember: 3,
        },
        {
          id: 'mrw_voucher_5',
          title: 'BND $5.00 Off Any Wash Service',
          description: 'Instant BND $5 cash deduction applied to any wash booking or counter ticket.',
          pointsCost: 100,
          rewardType: 'DISCOUNT_FIXED',
          discountValue: 5,
          maxRedemptionsPerMember: 5,
        },
        {
          id: 'mrw_free_express',
          title: 'Free Express Jet Wash',
          description: '100% complimentary Express Jet Wash & Microfiber Towel Hand Dry.',
          pointsCost: 150,
          rewardType: 'FREE_SERVICE',
          discountValue: 10,
          eligibleServiceId: 'srv_express_wash',
          maxRedemptionsPerMember: 2,
        },
        {
          id: 'mrw_free_deluxe',
          title: 'Free Deluxe Foam Wash & Spray Wax',
          description: '100% complimentary Deluxe Foam Wash, deep interior vacuum, and wax coat.',
          pointsCost: 250,
          rewardType: 'FREE_SERVICE',
          discountValue: 25,
          eligibleServiceId: 'srv_deluxe_wash',
          maxRedemptionsPerMember: 1,
        },
      ];

      for (const rw of defaultRewards) {
        await runQueryRun(`
          INSERT INTO membership_rewards (
            id, carWashId, title, description, pointsCost, rewardType, discountValue,
            eligibleServiceId, isActive, maxRedemptionsPerMember, maxTotalSupply, claimCount, createdAt, updatedAt
          ) VALUES (?, 'cw_brunei', ?, ?, ?, ?, ?, ?, 1, ?, 100, 0, ?, ?)
        `, [
          rw.id, rw.title, rw.description, rw.pointsCost, rw.rewardType, rw.discountValue,
          rw.eligibleServiceId || null, rw.maxRedemptionsPerMember || 0,
          now, now
        ]);
      }
    }
  } catch (err) {
    console.error('Error ensuring Brunei location is seeded:', err);
  }

  // Seed Map Presets
  try {
    const presetCount = await runQueryOne('SELECT COUNT(*) AS count FROM map_presets') as { count: any };
    const countVal = presetCount ? parseInt(presetCount.count, 10) : 0;
    if (countVal === 0) {
      console.log('Seeding map presets...');
      const presets = [
        { id: 'pre_bsb', name: 'Bandar Seri Begawan', lat: 4.8917, lng: 114.9401, country: 'Brunei', isCustom: 0 },
        { id: 'pre_gadong', name: 'Gadong BE1118', lat: 4.9015, lng: 114.9175, country: 'Brunei', isCustom: 0 },
        { id: 'pre_kb', name: 'Kuala Belait KA1131', lat: 4.5833, lng: 114.2333, country: 'Brunei', isCustom: 0 },
        { id: 'pre_tutong', name: 'Tutong TA1131', lat: 4.8021, lng: 114.6534, country: 'Brunei', isCustom: 0 },
        { id: 'pre_temburong', name: 'Temburong PA1131', lat: 4.7083, lng: 115.0667, country: 'Brunei', isCustom: 0 },
        { id: 'pre_miri', name: 'Miri (Sarawak)', lat: 4.3995, lng: 113.9914, country: 'Malaysia', isCustom: 0 },
        { id: 'pre_sf', name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'USA', isCustom: 0 },
      ];

      for (const p of presets) {
        await runQueryRun(`
          INSERT INTO map_presets (id, name, lat, lng, country, isCustom, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.name, p.lat, p.lng, p.country, p.isCustom, new Date().toISOString()]);
      }
    }
  } catch (err) {
    console.error('Error seeding map presets:', err);
  }

  const salt = bcrypt.genSaltSync(10);
  const timestamp = new Date().toISOString();

  const users: UserWithPassword[] = [
    {
      id: 'usr_admin',
      email: 'admin@carwash.com',
      name: 'System Admin',
      role: Role.ADMIN,
      isActive: true,
      passwordHash: bcrypt.hashSync('admin123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_admin_bn',
      email: 'admin@autoshinebn.com',
      name: 'System Admin (BN)',
      role: Role.ADMIN,
      isActive: true,
      passwordHash: bcrypt.hashSync('admin123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_owner',
      email: 'owner@carwash.com',
      name: 'Jack Owner',
      role: Role.OWNER,
      isActive: true,
      passwordHash: bcrypt.hashSync('owner123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_owner_bn',
      email: 'owner@autoshinebn.com',
      name: 'Jack Owner (BN)',
      role: Role.OWNER,
      isActive: true,
      passwordHash: bcrypt.hashSync('owner123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_customer',
      email: 'customer@carwash.com',
      name: 'Alex Customer',
      role: Role.CUSTOMER,
      isActive: true,
      passwordHash: bcrypt.hashSync('customer123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_customer_bn',
      email: 'customer@autoshinebn.com',
      name: 'Alex Customer (BN)',
      role: Role.CUSTOMER,
      isActive: true,
      passwordHash: bcrypt.hashSync('customer123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_employee',
      email: 'employee@carwash.com',
      name: 'Sam Employee',
      role: Role.EMPLOYEE,
      isActive: true,
      businessId: 'cw_brunei',
      passwordHash: bcrypt.hashSync('employee123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_employee_bn',
      email: 'employee@autoshinebn.com',
      name: 'Sam Employee (BN)',
      role: Role.EMPLOYEE,
      isActive: true,
      businessId: 'cw_brunei',
      passwordHash: bcrypt.hashSync('employee123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_special',
      email: 'special@carwash.com',
      name: 'Sarah Special',
      role: Role.SPECIAL,
      isActive: true,
      passwordHash: bcrypt.hashSync('special123', salt),
      createdAt: timestamp,
    },
    {
      id: 'usr_special_bn',
      email: 'special@autoshinebn.com',
      name: 'Sarah Special (BN)',
      role: Role.SPECIAL,
      isActive: true,
      passwordHash: bcrypt.hashSync('special123', salt),
      createdAt: timestamp,
    }
  ];

  try {
    for (const u of users) {
      await runQueryRun(`
        INSERT OR IGNORE INTO users (id, email, name, role, isActive, businessId, passwordHash, createdAt, isEmailVerified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [u.id, u.email, u.name, u.role, u.isActive ? 1 : 0, u.businessId || null, u.passwordHash, u.createdAt]);
      await runQueryRun(`UPDATE users SET passwordHash = ?, isActive = 1, isEmailVerified = 1 WHERE LOWER(email) = ?`, [u.passwordHash, u.email.toLowerCase()]);
    }
    // Automatically promote owner email if it exists
    await runQueryRun("UPDATE users SET role = ? WHERE LOWER(email) = 'qawi459@gmail.com'", [Role.ADMIN]);
  } catch (err) {
    console.error('Error ensuring testing credentials exist or promoting owner email:', err);
  }

  // Check if main seed data has already been loaded by verifying if Downtown location exists
  try {
    const hasDowntown = await runQueryOne("SELECT COUNT(*) AS count FROM car_washes WHERE id = 'cw_downtown'") as { count: any };
    const dtVal = hasDowntown ? parseInt(hasDowntown.count, 10) : 0;

    // Check if recent ledger records (from Dec 2025 to present) exist
    const recentBk = await runQueryOne("SELECT COUNT(*) AS count FROM bookings WHERE date >= '2025-12-01'") as { count: any };
    const recVal = recentBk ? parseInt(recentBk.count, 10) : 0;
    if (recVal < 20) {
      console.log('Seeding dynamic historical sales ledger dataset (Dec 2025 to present)...');
      await seedDecToPresentSampleData('ALL');
    }

    // Seed sample customer reviews if table is currently empty
    const revRow = await runQueryOne('SELECT COUNT(*) AS count FROM reviews') as { count: any };
    const revCount = revRow ? parseInt(revRow.count, 10) : 0;
    if (revCount === 0) {
      console.log('Seeding initial customer reviews and ratings...');
      const sampleReviews: Review[] = [
        {
          id: 'rev_sample_1',
          carWashId: 'cw_brunei_1',
          customerId: 'usr_cust_1',
          customerName: 'Haji Rahman',
          customerEmail: 'rahman@example.bn',
          rating: 5,
          comment: 'Exceptional ceramic shine service! My SUV looks brand new and the waiting lounge was very comfortable with complimentary tea. Highly recommended!',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          ownerReply: 'Terima kasih banyak Haji Rahman! We take great pride in our nano-ceramic finish and look forward to welcoming you back.',
          ownerReplyAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          ownerReplyBy: 'Autoshine Brunei (Owner)',
        },
        {
          id: 'rev_sample_2',
          carWashId: 'cw_brunei_1',
          customerId: 'usr_cust_2',
          customerName: 'Nurul Azira',
          customerEmail: 'nurul@example.bn',
          rating: 5,
          comment: 'Booking through the platform was super smooth. Arrived at my 11:30 AM slot, no waiting in line at all. Interior vacuuming was spotless!',
          createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        },
        {
          id: 'rev_sample_3',
          carWashId: 'cw_brunei_1',
          customerId: 'usr_cust_3',
          customerName: 'Mohd Faiz',
          customerEmail: 'faiz@example.bn',
          rating: 4,
          comment: 'Very good foam wash and tire gloss. Staff was attentive and friendly. Great value for money in Gadong.',
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          ownerReply: 'Thank you for your review Mohd Faiz! We appreciate your support and hope to see you again soon.',
          ownerReplyAt: new Date(Date.now() - 9 * 86400000).toISOString(),
          ownerReplyBy: 'Autoshine Brunei (Owner)',
        },
        {
          id: 'rev_sample_4',
          carWashId: 'cw_downtown',
          customerId: 'usr_cust_4',
          customerName: 'Marcus Vance',
          customerEmail: 'marcus@example.com',
          rating: 5,
          comment: 'Best hand wash in the city. Water-saving system is impressive and the hand wax finish lasted for weeks.',
          createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
        {
          id: 'rev_sample_5',
          carWashId: 'cw_bayside',
          customerId: 'usr_cust_5',
          customerName: 'Sarah Jenkins',
          customerEmail: 'sarah@example.com',
          rating: 4,
          comment: 'Express wash is super fast! Can get busy on weekends so definitely book ahead of time.',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        }
      ];

      for (const r of sampleReviews) {
        await saveReview(r);
      }
    }

    if (dtVal > 0) {
      console.log('Main seed data already loaded.');
      return;
    }
  } catch (e) {
    console.error('Error checking initial seed status:', e);
  }

  console.log('Seeding initial Car Wash Booking System database...');

  const carWashes: CarWash[] = [
    {
      id: 'cw_downtown',
      name: 'Downtown Crystal Clean',
      description: 'Premium hand wash, ceramic coating, and interior detailing in the heart of downtown. High-tech water-saving technology!',
      locationLat: 37.7749,
      locationLng: -122.4194,
      address: '455 Market St, San Francisco, CA 94105',
      openingHours: DEFAULT_SCHEDULE,
      slotDuration: 30,
      capacityPerSlot: 2,
      ownerId: 'usr_owner',
      isActive: true,
      createdAt: timestamp,
    },
    {
      id: 'cw_bayside',
      name: 'Bayside Express Wash',
      description: 'Quick touchless automated wash with free vacuums, tire shine, and express detailing lanes.',
      locationLat: 37.8080,
      locationLng: -122.4177,
      address: '2801 Jones St, San Francisco, CA 94133',
      openingHours: {
        ...DEFAULT_SCHEDULE,
        sunday: { open: '09:00', close: '15:00', isOpen: true }
      },
      slotDuration: 45,
      capacityPerSlot: 3,
      ownerId: 'usr_owner',
      isActive: true,
      createdAt: timestamp,
    },
    {
      id: 'cw_sunset',
      name: 'Sunset Eco-Detailing',
      description: '100% waterless eco-friendly wash, premium leather conditioning, and state-of-the-art steam cleaning system.',
      locationLat: 37.7599,
      locationLng: -122.4767,
      address: '1240 Noriega St, San Francisco, CA 94122',
      openingHours: {
        ...DEFAULT_SCHEDULE,
        saturday: { open: '08:00', close: '20:00', isOpen: true },
        sunday: { open: '08:00', close: '18:00', isOpen: true }
      },
      slotDuration: 60,
      capacityPerSlot: 1,
      ownerId: 'usr_owner',
      isActive: true,
      createdAt: timestamp,
    }
  ];

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const bookings: Booking[] = [
    {
      id: 'bk_1',
      carWashId: 'cw_downtown',
      customerId: 'usr_customer',
      customerName: 'Alex Customer',
      customerEmail: 'customer@carwash.com',
      date: today,
      timeSlot: '09:00 - 09:30',
      status: BookingStatus.COMPLETED,
      notes: 'Tesla Model Y. Premium hand wash requested.',
      employeeId: 'usr_employee',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'bk_2',
      carWashId: 'cw_downtown',
      customerId: 'usr_customer',
      customerName: 'Alex Customer',
      customerEmail: 'customer@carwash.com',
      date: tomorrow,
      timeSlot: '10:00 - 10:30',
      status: BookingStatus.PENDING,
      notes: 'Full interior detailing. Leather seats.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'bk_3',
      carWashId: 'cw_bayside',
      customerId: 'usr_customer',
      customerName: 'Alex Customer',
      customerEmail: 'customer@carwash.com',
      date: tomorrow,
      timeSlot: '11:15 - 12:00',
      status: BookingStatus.IN_PROGRESS,
      notes: 'Ceramic shield wash + vacuum.',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log_1',
      userId: 'usr_admin',
      userEmail: 'admin@carwash.com',
      action: 'SYSTEM_STARTUP',
      details: 'Car Wash Booking platform seeded and initialized.',
      timestamp: timestamp,
    }
  ];

  try {
    for (const cw of carWashes) {
      await runQueryRun(`
        INSERT INTO car_washes (id, name, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, ownerId, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cw.id,
        cw.name,
        cw.description || null,
        cw.locationLat,
        cw.locationLng,
        cw.address,
        JSON.stringify(cw.openingHours),
        cw.slotDuration,
        cw.capacityPerSlot,
        cw.ownerId,
        cw.isActive ? 1 : 0,
        cw.createdAt
      ]);
    }
    for (const b of bookings) {
      await runQueryRun(`
        INSERT INTO bookings (id, carWashId, customerId, customerName, customerEmail, date, timeSlot, status, notes, employeeId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        b.id,
        b.carWashId,
        b.customerId,
        b.customerName,
        b.customerEmail,
        b.date,
        b.timeSlot,
        b.status,
        b.notes || null,
        b.employeeId || null,
        b.createdAt,
        b.updatedAt
      ]);
    }
    for (const log of auditLogs) {
      await runQueryRun(`
        INSERT INTO audit_logs (id, userId, userEmail, action, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [log.id, log.userId, log.userEmail, log.action, log.details, log.timestamp]);
    }
    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Failed to seed database:', err);
  }

  // Auto-seed historical ledger dataset from Dec 2025 to present if table has < 15 records
  try {
    const existingBkCount = await runQueryOne('SELECT COUNT(*) AS count FROM bookings') as { count: any };
    const bkCountVal = existingBkCount ? parseInt(existingBkCount.count, 10) : 0;
    if (bkCountVal < 15) {
      console.log('Seeding sample ledger dataset from December 2025 to present for all locations...');
      await seedDecToPresentSampleData('ALL');
    }
  } catch (err) {
    console.error('Error auto-seeding sample ledger dataset:', err);
  }
}

export async function seedFirestoreIfEmpty(): Promise<void> {
  return waitForDbReady();
}

// User Operations
export async function getUsers(): Promise<UserWithPassword[]> {
  try {
    const rows = await runQueryAll('SELECT * FROM users');
    return rows.map(mapUser);
  } catch (error) {
    console.error('Database getUsers Error:', error);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  try {
    const row = await runQueryOne('SELECT * FROM users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    return row ? mapUser(row) : null;
  } catch (error) {
    console.error('Database getUserByEmail Error:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<UserWithPassword | null> {
  try {
    const row = await runQueryOne('SELECT * FROM users WHERE id = ?', [id]);
    return row ? mapUser(row) : null;
  } catch (error) {
    console.error('Database getUserById Error:', error);
    return null;
  }
}

export async function createUser(user: UserWithPassword): Promise<void> {
  try {
    let assignedRole = user.role;
    if (user.email.toLowerCase() === 'qawi459@gmail.com') {
      assignedRole = Role.ADMIN;
    }
    await runQueryRun(`
      INSERT INTO users (id, email, name, role, isActive, businessId, passwordHash, createdAt, dateOfBirth, gender, profileImageUrl, address, phone, isEmailVerified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      user.email,
      user.name,
      assignedRole,
      user.isActive ? 1 : 0,
      user.businessId || null,
      user.passwordHash,
      user.createdAt,
      user.dateOfBirth || null,
      user.gender || null,
      user.profileImageUrl || null,
      user.address || null,
      user.phone || null,
      user.isEmailVerified === false ? 0 : 1
    ]);
  } catch (error) {
    console.error('Database createUser Error:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<UserWithPassword>): Promise<void> {
  try {
    const columnMap = new Map<string, any>();

    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined) return;
      if (key === 'isActive' || key === 'isEmailVerified') {
        columnMap.set(key, val ? 1 : 0);
      } else {
        columnMap.set(key, val);
      }
    });

    if (columnMap.size === 0) return;

    const sets: string[] = [];
    const values: any[] = [];
    columnMap.forEach((val, col) => {
      sets.push(`${col} = ?`);
      values.push(val);
    });

    values.push(id);
    await runQueryRun(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
  } catch (error) {
    console.error('Database updateUser Error:', error);
    throw error;
  }
}

export async function updateUserIdAcrossTables(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  try {
    console.log(`[Database Sync] Merging user ID from ${oldId} to ${newId} across all tables...`);
    // 1. Update the main users table
    await runQueryRun('UPDATE users SET id = ? WHERE id = ?', [newId, oldId]);
    // 2. Update bookings associated with customerId or employeeId
    await runQueryRun('UPDATE bookings SET customerId = ? WHERE customerId = ?', [newId, oldId]);
    await runQueryRun('UPDATE bookings SET employeeId = ? WHERE employeeId = ?', [newId, oldId]);
    // 3. Update car washes owned by this user
    await runQueryRun('UPDATE car_washes SET ownerId = ? WHERE ownerId = ?', [newId, oldId]);
    // 4. Update audit logs
    await runQueryRun('UPDATE audit_logs SET userId = ? WHERE userId = ?', [newId, oldId]);
  } catch (err: any) {
    console.error(`[Database Sync] Failed to update user ID across tables from ${oldId} to ${newId}:`, err);
    throw err;
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await runQueryRun('DELETE FROM users WHERE id = ?', [id]);
  } catch (error) {
    console.error('Database deleteUser Error:', error);
    throw error;
  }
}

// CarWash Operations
export async function getCarWashes(): Promise<CarWash[]> {
  try {
    const rows = await runQueryAll('SELECT * FROM car_washes');
    return rows.map(mapCarWash);
  } catch (error) {
    console.error('Database getCarWashes Error:', error);
    return [];
  }
}

export async function getCarWashById(id: string): Promise<CarWash | null> {
  try {
    const row = await runQueryOne('SELECT * FROM car_washes WHERE id = ?', [id]);
    return row ? mapCarWash(row) : null;
  } catch (error) {
    console.error('Database getCarWashById Error:', error);
    return null;
  }
}

export async function getCarWashByIdOrSlug(identifier: string): Promise<CarWash | null> {
  try {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    // 1. Try by exact ID
    let row = await runQueryOne('SELECT * FROM car_washes WHERE id = ?', [identifier]);
    if (row) return mapCarWash(row);

    // 2. Try by exact slug
    row = await runQueryOne('SELECT * FROM car_washes WHERE LOWER(slug) = ?', [clean]);
    if (row) return mapCarWash(row);

    // 3. Fallback: match by slugified name from all records
    const all = await getCarWashes();
    const found = all.find((w) => 
      w.id.toLowerCase() === clean || 
      (w.slug && w.slug.toLowerCase() === clean) || 
      generateSlug(w.name).toLowerCase() === clean
    );
    return found || null;
  } catch (error) {
    console.error('Database getCarWashByIdOrSlug Error:', error);
    return null;
  }
}

export async function createCarWash(carWash: CarWash): Promise<void> {
  try {
    const slug = await getUniqueSlug(carWash.slug || carWash.name, carWash.id);
    const servicesStr = carWash.services ? JSON.stringify(carWash.services) : (carWash.servicesJson || '[]');
    const customPaymentsStr = carWash.customPaymentsJson || null;
    const ownerNavVal = carWash.ownerNavigationEnabled !== undefined ? (carWash.ownerNavigationEnabled ? 1 : 0) : 1;
    const ownerQrVal = carWash.ownerQrCodeEnabled !== undefined ? (carWash.ownerQrCodeEnabled ? 1 : 0) : 0;
    const membershipVal = carWash.membershipEnabled !== undefined ? (carWash.membershipEnabled ? 1 : 0) : 0;
    await runQueryRun(`
      INSERT INTO car_washes (
        id, name, slug, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, ownerId, isActive, createdAt, phone, instagram, paymentPolicy, logoUrl, bibdAccountName, bibdAccountNo, bibdEnabled, baiduriAccountName, baiduriAccountNo, baiduriEnabled, bibdQrImageUrl, baiduriQrImageUrl, customPaymentsJson, servicesJson, ownerNavigationEnabled, ownerQrCodeEnabled, membershipEnabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      carWash.id,
      carWash.name,
      slug,
      carWash.description || null,
      carWash.locationLat,
      carWash.locationLng,
      carWash.address,
      JSON.stringify(carWash.openingHours),
      carWash.slotDuration,
      carWash.capacityPerSlot,
      carWash.ownerId,
      carWash.isActive ? 1 : 0,
      carWash.createdAt,
      carWash.phone || null,
      carWash.instagram || null,
      carWash.paymentPolicy || 'PRE_PAYMENT',
      carWash.logoUrl || null,
      carWash.bibdAccountName || null,
      carWash.bibdAccountNo || null,
      carWash.bibdEnabled ? 1 : 0,
      carWash.baiduriAccountName || null,
      carWash.baiduriAccountNo || null,
      carWash.baiduriEnabled ? 1 : 0,
      carWash.bibdQrImageUrl || null,
      carWash.baiduriQrImageUrl || null,
      customPaymentsStr,
      servicesStr,
      ownerNavVal,
      ownerQrVal,
      membershipVal,
    ]);
  } catch (error) {
    console.error('Database createCarWash Error:', error);
    throw error;
  }
}

export async function updateCarWash(id: string, data: Partial<CarWash>): Promise<void> {
  try {
    const columnMap = new Map<string, any>();

    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined) return;

      if (key === 'slug') {
        const cleanSlug = generateSlug(String(val));
        columnMap.set('slug', cleanSlug);
        return;
      }
      if (key === 'customPaymentMethods') {
        return;
      }
      if (key === 'services') {
        columnMap.set('servicesJson', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'servicesJson') {
        columnMap.set('servicesJson', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'customPaymentsJson') {
        columnMap.set('customPaymentsJson', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'openingHours') {
        columnMap.set('openingHours', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'scheduleOverrides') {
        columnMap.set('scheduleOverridesJson', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'scheduleOverridesJson') {
        columnMap.set('scheduleOverridesJson', typeof val === 'string' ? val : JSON.stringify(val));
        return;
      }
      if (key === 'isActive' || key === 'bibdEnabled' || key === 'baiduriEnabled' || key === 'ownerNavigationEnabled' || key === 'ownerQrCodeEnabled' || key === 'membershipEnabled') {
        columnMap.set(key, val ? 1 : 0);
        return;
      }
      columnMap.set(key, val);
    });

    if (columnMap.size === 0) return;

    const sets: string[] = [];
    const values: any[] = [];

    columnMap.forEach((val, col) => {
      sets.push(`${col} = ?`);
      values.push(val);
    });

    values.push(id);
    const sql = `UPDATE car_washes SET ${sets.join(', ')} WHERE id = ?`;

    try {
      await runQueryRun(sql, values);
    } catch (dbErr: any) {
      console.warn('First attempt at updateCarWash failed, ensuring all columns exist and retrying...', dbErr?.message || dbErr);
      if (usePostgres) {
        const fixCols = [
          'ALTER TABLE car_washes ADD COLUMN location_lat REAL DEFAULT 4.8917',
          'ALTER TABLE car_washes ADD COLUMN location_lng REAL DEFAULT 114.9401',
          'ALTER TABLE car_washes ADD COLUMN address TEXT',
          'ALTER TABLE car_washes ADD COLUMN description TEXT',
          'ALTER TABLE car_washes ADD COLUMN opening_hours TEXT',
          'ALTER TABLE car_washes ADD COLUMN slot_duration INTEGER DEFAULT 30',
          'ALTER TABLE car_washes ADD COLUMN capacity_per_slot INTEGER DEFAULT 2',
          'ALTER TABLE car_washes ADD COLUMN owner_id TEXT',
          'ALTER TABLE car_washes ADD COLUMN services_json TEXT',
          'ALTER TABLE car_washes ADD COLUMN custom_payments_json TEXT',
          'ALTER TABLE car_washes ADD COLUMN logo_url TEXT',
          'ALTER TABLE car_washes ADD COLUMN phone TEXT',
          'ALTER TABLE car_washes ADD COLUMN instagram TEXT',
          'ALTER TABLE car_washes ADD COLUMN owner_navigation_enabled INTEGER DEFAULT 1',
        ];
        for (const colSql of fixCols) {
          try { await pgPool!.query(colSql); } catch (e) {}
        }
        // Retry execution
        await runQueryRun(sql, values);
      } else {
        throw dbErr;
      }
    }
  } catch (error) {
    console.error('Database updateCarWash Error:', error);
    throw error;
  }
}

export async function deleteCarWash(id: string): Promise<void> {
  try {
    await runQueryRun('DELETE FROM bookings WHERE carWashId = ?', [id]);
    await runQueryRun('UPDATE users SET businessId = NULL WHERE businessId = ?', [id]);
    await runQueryRun('DELETE FROM car_washes WHERE id = ?', [id]);
  } catch (error) {
    console.error('Database deleteCarWash Error:', error);
    throw error;
  }
}

// Booking Operations
export async function getBookings(): Promise<Booking[]> {
  try {
    const rows = await runQueryAll(`
      SELECT 
        b.*, 
        u.phone AS user_phone, 
        u.name AS user_name, 
        u.email AS user_email 
      FROM bookings b 
      LEFT JOIN users u ON b.customerId = u.id 
      ORDER BY b.createdAt DESC
    `);
    return rows.map(mapBooking);
  } catch (error) {
    console.error('Database getBookings Error:', error);
    return [];
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    const row = await runQueryOne(`
      SELECT 
        b.*, 
        u.phone AS user_phone, 
        u.name AS user_name, 
        u.email AS user_email 
      FROM bookings b 
      LEFT JOIN users u ON b.customerId = u.id 
      WHERE b.id = ?
    `, [id]);
    return row ? mapBooking(row) : null;
  } catch (error) {
    console.error('Database getBookingById Error:', error);
    return null;
  }
}

export async function createBooking(booking: Booking): Promise<void> {
  try {
    await runQueryRun(`
      INSERT OR IGNORE INTO bookings (
        id, carWashId, customerId, customerName, customerEmail, customerPhone, vehicleInfo, bookingSource, createdByRole, createdByEmail,
        date, timeSlot, status, notes, employeeId, 
        createdAt, updatedAt, paymentBank, txnReference, receiptFilename,
        serviceId, serviceName, price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      booking.id,
      booking.carWashId,
      booking.customerId,
      booking.customerName,
      booking.customerEmail,
      booking.customerPhone || null,
      booking.vehicleInfo || null,
      booking.bookingSource || 'ONLINE',
      booking.createdByRole || null,
      booking.createdByEmail || null,
      booking.date,
      booking.timeSlot,
      booking.status,
      booking.notes || null,
      booking.employeeId || null,
      booking.createdAt,
      booking.updatedAt,
      booking.paymentBank || null,
      booking.txnReference || null,
      booking.receiptFilename || null,
      booking.serviceId || null,
      booking.serviceName || null,
      booking.price || null
    ]);
  } catch (error) {
    console.error('Database createBooking Error:', error);
    throw error;
  }
}

export async function getBookingByTxnRef(txnReference: string): Promise<Booking | null> {
  try {
    const row = await runQueryOne(`
      SELECT 
        b.*, 
        u.phone AS user_phone, 
        u.name AS user_name, 
        u.email AS user_email 
      FROM bookings b 
      LEFT JOIN users u ON b.customerId = u.id 
      WHERE b.txnReference = ?
    `, [txnReference]);
    return row ? mapBooking(row) : null;
  } catch (error) {
    console.error('Database getBookingByTxnRef Error:', error);
    return null;
  }
}

export async function getCustomersForOwner(ownerId: string, isAdmin = false, carWashId?: string): Promise<any[]> {
  try {
    const carWashes = await getCarWashes();
    let ownedIds = isAdmin 
      ? carWashes.map(cw => cw.id) 
      : carWashes.filter(cw => cw.ownerId === ownerId).map(cw => cw.id);

    if (carWashId && carWashId !== 'ALL') {
      if (isAdmin || ownedIds.includes(carWashId)) {
        ownedIds = [carWashId];
      } else {
        return [];
      }
    }

    if (ownedIds.length === 0) {
      return [];
    }
    
    // Directly query indexed bookings scoped strictly to owner's authorized locations
    const placeholders = ownedIds.map(() => '?').join(',');
    const bookingRows = await runQueryAll(`
      SELECT 
        b.*, 
        u.phone AS user_phone, 
        u.name AS user_name, 
        u.email AS user_email,
        u.profileImageUrl AS user_profile_image_url
      FROM bookings b 
      LEFT JOIN users u ON b.customerId = u.id 
      WHERE b.carWashId IN (${placeholders})
      ORDER BY b.createdAt DESC
    `, ownedIds);
    const relevantBookings = bookingRows.map(mapBooking);

    // Get members explicitly enrolled in this car wash's VIP Loyalty / Membership
    const memberMap = new Map<string, CustomerMembership>();
    for (const cwId of ownedIds) {
      const members = await getCarWashMembers(cwId);
      for (const m of members) {
        if (m.customerId) {
          memberMap.set(m.customerId.toLowerCase(), m);
        }
      }
    }

    // Lookup users for profile enrichment (name, phone, email, avatar) ONLY for actual patrons
    const userMap = new Map<string, any>();
    for (const row of bookingRows) {
      if (row.customerId && !userMap.has(row.customerId.toLowerCase())) {
        userMap.set(row.customerId.toLowerCase(), {
          id: row.customerId,
          name: row.user_name,
          phone: row.user_phone,
          email: row.user_email,
          profileImageUrl: row.user_profile_image_url,
        });
      }
      if (row.customerEmail && !userMap.has(row.customerEmail.toLowerCase())) {
        userMap.set(row.customerEmail.toLowerCase(), {
          id: row.customerId,
          name: row.user_name || row.customerName,
          phone: row.user_phone || row.customerPhone,
          email: row.customerEmail,
          profileImageUrl: row.user_profile_image_url,
        });
      }
    }
    
    const customerMap = new Map<string, {
      id: string;
      customerId?: string;
      name: string;
      phone: string;
      email?: string;
      profileImageUrl?: string;
      vehicles: string[];
      totalBookings: number;
      completedBookings: number;
      totalSpent: number;
      lastBookingDate: string;
      firstLetter: string;
      isMember?: boolean;
      membershipNumber?: string;
      pointsBalance?: number;
    }>();

    // 1. Process customers with bookings at this owner's carwash
    for (const b of relevantBookings) {
      const rawName = (b.customerName || 'Customer').trim();
      const rawPhone = (b.customerPhone && String(b.customerPhone).trim().toUpperCase() !== 'NA' && String(b.customerPhone).trim().toUpperCase() !== 'N/A' ? String(b.customerPhone).trim() : '');
      const rawEmail = (b.customerEmail || '').trim().toLowerCase();

      // Find registered user profile if available for clean name/phone/avatar
      const regUser = (b.customerId && userMap.get(b.customerId.toLowerCase())) ||
                      (rawEmail && userMap.get(rawEmail));

      const effectiveName = (regUser && regUser.name ? regUser.name : rawName) || 'Customer';
      const effectivePhone = (regUser && regUser.phone && regUser.phone.toUpperCase() !== 'NA' && regUser.phone.toUpperCase() !== 'N/A' ? regUser.phone : rawPhone);
      const effectiveEmail = (regUser && regUser.email ? regUser.email : rawEmail);
      const profileImageUrl = regUser ? regUser.profileImageUrl : undefined;

      const key = (b.customerId || effectiveEmail || effectivePhone || effectiveName).toLowerCase();
      let existing = customerMap.get(key);

      if (!existing && b.customerId && customerMap.has(b.customerId.toLowerCase())) {
        existing = customerMap.get(b.customerId.toLowerCase());
      } else if (!existing && effectiveEmail && customerMap.has(effectiveEmail)) {
        existing = customerMap.get(effectiveEmail);
      } else if (!existing && effectivePhone && customerMap.has(effectivePhone.toLowerCase())) {
        existing = customerMap.get(effectivePhone.toLowerCase());
      }

      const bPrice = Number(b.price) || 0;
      const isCompleted = b.status === BookingStatus.COMPLETED;
      const vehicleStr = b.vehicleInfo ? b.vehicleInfo.trim() : '';

      // Check loyalty membership
      const membership = (b.customerId && memberMap.get(b.customerId.toLowerCase())) ||
                         (effectiveEmail && memberMap.get(effectiveEmail.toLowerCase()));

      if (!existing) {
        let letter = effectiveName.charAt(0).toUpperCase();
        if (!/^[A-Z]$/i.test(letter)) letter = '#';

        customerMap.set(key, {
          id: b.customerId || `guest_${key}`,
          customerId: b.customerId,
          name: effectiveName,
          phone: effectivePhone,
          email: effectiveEmail || undefined,
          profileImageUrl: profileImageUrl,
          vehicles: vehicleStr ? [vehicleStr] : [],
          totalBookings: 1,
          completedBookings: isCompleted ? 1 : 0,
          totalSpent: isCompleted ? bPrice : 0,
          lastBookingDate: b.date || '',
          firstLetter: letter,
          isMember: !!membership,
          membershipNumber: membership ? membership.membershipNumber : undefined,
          pointsBalance: membership ? membership.pointsBalance : undefined,
        });
      } else {
        existing.totalBookings += 1;
        if (isCompleted) {
          existing.completedBookings += 1;
          existing.totalSpent += bPrice;
        }
        if (effectivePhone && (!existing.phone || existing.phone.toUpperCase() === 'NA' || existing.phone.toUpperCase() === 'N/A')) {
          existing.phone = effectivePhone;
        }
        if (effectiveEmail && !existing.email) {
          existing.email = effectiveEmail;
        }
        if (vehicleStr && !existing.vehicles.includes(vehicleStr)) {
          existing.vehicles.push(vehicleStr);
        }
        if (b.date && b.date > existing.lastBookingDate) {
          existing.lastBookingDate = b.date;
        }
        if (membership) {
          existing.isMember = true;
          existing.membershipNumber = membership.membershipNumber;
          existing.pointsBalance = membership.pointsBalance;
        }
      }
    }

    // 2. Include customers who signed up / enrolled in this car wash's VIP loyalty membership
    // (even if they joined via counter QR or online and haven't booked their first appointment yet)
    for (const [mCustomerId, membership] of memberMap.entries()) {
      const existing = customerMap.get(mCustomerId) ||
                       (membership.customerEmail && customerMap.get(membership.customerEmail.toLowerCase()));

      if (!existing) {
        const regUser = userMap.get(mCustomerId);
        const name = (regUser && regUser.name) || membership.customerName || 'Loyalty Member';
        const phone = (regUser && regUser.phone && regUser.phone.toUpperCase() !== 'NA' ? regUser.phone : '') || membership.customerPhone || '';
        const email = (regUser && regUser.email) || membership.customerEmail || undefined;

        let letter = name.charAt(0).toUpperCase();
        if (!/^[A-Z]$/i.test(letter)) letter = '#';

        customerMap.set(mCustomerId, {
          id: mCustomerId,
          customerId: mCustomerId,
          name: name,
          phone: phone,
          email: email,
          profileImageUrl: regUser?.profileImageUrl,
          vehicles: [],
          totalBookings: 0,
          completedBookings: 0,
          totalSpent: 0,
          lastBookingDate: '',
          firstLetter: letter,
          isMember: true,
          membershipNumber: membership.membershipNumber,
          pointsBalance: membership.pointsBalance,
        });
      } else {
        existing.isMember = true;
        existing.membershipNumber = membership.membershipNumber;
        existing.pointsBalance = membership.pointsBalance;
      }
    }

    // 3. For Platform Administrators ONLY (Global Super-Admin view when no specific car wash is selected)
    // Regular owners NEVER see non-patron customers under any circumstance.
    if (isAdmin && !carWashId) {
      const allUsers = await getUsers();
      const registeredCustomers = allUsers.filter(u => u.role === Role.CUSTOMER || u.role === Role.SPECIAL);
      for (const u of registeredCustomers) {
        const key = (u.id || u.email || u.phone || u.name).toLowerCase();
        if (!customerMap.has(key) && (!u.id || !customerMap.has(u.id.toLowerCase()))) {
          let letter = (u.name || 'C').charAt(0).toUpperCase();
          if (!/^[A-Z]$/i.test(letter)) letter = '#';
          customerMap.set(key, {
            id: u.id,
            customerId: u.id,
            name: u.name || 'Customer',
            phone: u.phone && u.phone.toUpperCase() !== 'NA' ? u.phone : '',
            email: u.email,
            profileImageUrl: u.profileImageUrl,
            vehicles: [],
            totalBookings: 0,
            completedBookings: 0,
            totalSpent: 0,
            lastBookingDate: '',
            firstLetter: letter,
            isMember: false,
          });
        }
      }
    }

    return Array.from(customerMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
    );
  } catch (error) {
    console.error('getCustomersForOwner error:', error);
    return [];
  }
}

export async function syncUserBookings(userId: string, name?: string, phone?: string): Promise<void> {
  try {
    if (phone && phone.trim() !== '' && phone.trim().toUpperCase() !== 'NA') {
      await runQueryRun('UPDATE bookings SET customerPhone = ? WHERE customerId = ?', [phone.trim(), userId]);
    }
    if (name && name.trim() !== '') {
      await runQueryRun('UPDATE bookings SET customerName = ? WHERE customerId = ?', [name.trim(), userId]);
    }
  } catch (error) {
    console.error('Database syncUserBookings Error:', error);
  }
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  try {
    const columnMap = new Map<string, any>();

    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined) return;
      columnMap.set(key, val);
    });

    if (columnMap.size === 0) return;

    const sets: string[] = [];
    const values: any[] = [];

    columnMap.forEach((val, col) => {
      sets.push(`${col} = ?`);
      values.push(val);
    });

    values.push(id);
    await runQueryRun(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`, values);
  } catch (error) {
    console.error('Database updateBooking Error:', error);
    throw error;
  }
}

// Audit Logs
export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const rows = await runQueryAll('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    return rows as AuditLog[];
  } catch (error) {
    console.error('Database getAuditLogs Error:', error);
    return [];
  }
}

export async function addAuditLog(userId: string, email: string, action: string, details: string): Promise<void> {
  const logId = `log_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  try {
    await runQueryRun(`
      INSERT INTO audit_logs (id, userId, userEmail, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [logId, userId, email, action, details, timestamp]);
  } catch (error) {
    console.error('Database addAuditLog Error:', error);
  }
}

// Password Reset helpers
export interface PasswordReset {
  email: string;
  token: string;
  expiresAt: string;
}

export async function createPasswordReset(email: string, token: string, expiresAt: string): Promise<void> {
  try {
    await runQueryRun(`
      INSERT INTO password_resets (email, token, expiresAt)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET token = excluded.token, expiresAt = excluded.expiresAt
    `, [email, token, expiresAt]);
  } catch (error) {
    console.error('Database createPasswordReset Error:', error);
    throw error;
  }
}

export async function getPasswordResetByEmail(email: string): Promise<PasswordReset | null> {
  try {
    const row = await runQueryOne('SELECT * FROM password_resets WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (!row) return null;
    return {
      email: row.email,
      token: row.token,
      expiresAt: row.expiresAt ?? row.expires_at ?? row.expiresat ?? ''
    };
  } catch (error) {
    console.error('Database getPasswordResetByEmail Error:', error);
    return null;
  }
}

export async function getPasswordResetByToken(token: string): Promise<PasswordReset | null> {
  try {
    const row = await runQueryOne('SELECT * FROM password_resets WHERE token = ?', [token]);
    if (!row) return null;
    return {
      email: row.email,
      token: row.token,
      expiresAt: row.expiresAt ?? row.expires_at ?? row.expiresat ?? ''
    };
  } catch (error) {
    console.error('Database getPasswordResetByToken Error:', error);
    return null;
  }
}

export async function deletePasswordReset(email: string): Promise<void> {
  try {
    await runQueryRun('DELETE FROM password_resets WHERE email = ?', [email]);
  } catch (error) {
    console.error('Database deletePasswordReset Error:', error);
  }
}

export async function cleanupExpiredPasswordResets(): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    await runQueryRun('DELETE FROM password_resets WHERE expiresAt < ?', [nowIso]);
  } catch (error) {
    console.error('Database cleanupExpiredPasswordResets Error:', error);
  }
}

// Map Presets CRUD operations
export async function getMapPresets(): Promise<MapPreset[]> {
  try {
    const rows = await runQueryAll('SELECT * FROM map_presets ORDER BY createdAt DESC');
    return rows.map((row: any) => ({
      ...row,
      isCustom: row.isCustom === 1 || row.isCustom === true
    })) as MapPreset[];
  } catch (error) {
    console.error('Database getMapPresets Error:', error);
    return [];
  }
}

export async function createMapPreset(preset: MapPreset): Promise<void> {
  try {
    await runQueryRun(`
      INSERT INTO map_presets (id, name, lat, lng, country, isCustom, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      preset.id,
      preset.name,
      preset.lat,
      preset.lng,
      preset.country,
      preset.isCustom ? 1 : 0,
      preset.createdAt
    ]);
  } catch (error) {
    console.error('Database createMapPreset Error:', error);
    throw error;
  }
}

export async function deleteMapPreset(id: string): Promise<void> {
  try {
    await runQueryRun('DELETE FROM map_presets WHERE id = ?', [id]);
  } catch (error) {
    console.error('Database deleteMapPreset Error:', error);
    throw error;
  }
}

export function isUsingPostgres(): boolean {
  return usePostgres;
}

export function getPostgresConnectionError(): string | null {
  return postgresConnectionError;
}

export async function seedDecToPresentSampleData(targetCarWashId?: string): Promise<number> {
  const custNames = [
    'Haji Awang Yusof', 'Siti Nurhaliza Mohamad', 'Mohammad Rizwan Shah',
    'Dk Nurul Athirah', 'Brandon Lee', 'Sarah Tan', 'Ak Ahmad Zaki',
    'Pg Hj Mohd Shamrim', 'Norhaslinda Abdullah', 'Lim Wei Sheng',
    'Muhammad Faiz Hashim', 'Fiona Heng', 'Hajah Mariam Basir'
  ];

  const vehicles = [
    'Toyota Vios (BAA 1234)', 'Honda Civic (BAB 5678)', 'BMW X5 (BAC 8888)',
    'Mercedes A200 (BAD 9900)', 'Nissan X-Trail (BAE 4321)', 'Hyundai Creta (BAF 6789)',
    'Ford Ranger Raptor (BAG 1122)', 'Mazda CX-5 (BAH 3344)', 'Kia Carnival (BAI 5566)',
    'Subaru XV (BAJ 7788)'
  ];

  const services = [
    { name: 'Standard Executive Wash', price: 15.00, type: 'service' },
    { name: 'Full Interior Polish & Detail', price: 65.00, type: 'service' },
    { name: 'Nano Ceramic Shield Package', price: 150.00, type: 'service' },
    { name: 'Engine Bay Steam Clean', price: 35.00, type: 'service' },
    { name: 'Premium Car Fragrance Refill', price: 12.00, type: 'product' },
    { name: 'Microfiber Cloth & Detailing Kit', price: 25.00, type: 'product' },
    { name: 'Rain-X Glass Hydrophobic Coating', price: 28.00, type: 'service' }
  ];

  const timeSlots = [
    '08:30 - 09:00', '09:30 - 10:00', '10:30 - 11:00', '11:30 - 12:00',
    '14:00 - 14:30', '15:00 - 15:30', '16:00 - 16:30', '17:00 - 17:30'
  ];

  const sources: ('ONLINE' | 'PHONE' | 'WALK_IN')[] = ['ONLINE', 'PHONE', 'WALK_IN'];
  const banks = ['BIBD', 'Baiduri', null]; // null means Cash

  // Get list of carwash IDs to seed
  let targetIds: string[] = [];
  if (targetCarWashId && targetCarWashId !== 'ALL') {
    targetIds = [targetCarWashId];
  } else {
    try {
      const cwRows = await runQueryAll('SELECT id FROM car_washes') as { id: string }[];
      targetIds = cwRows && cwRows.length > 0 ? cwRows.map(c => c.id) : ['cw_brunei', 'cw_downtown', 'cw_bayside', 'cw_sunset'];
    } catch (e) {
      targetIds = ['cw_brunei', 'cw_downtown', 'cw_bayside', 'cw_sunset'];
    }
  }

  // Calculate dynamic months from Dec 2025 up to current year/month
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-12

  const months: { year: number; month: number; daysCount: number; count: number }[] = [];

  // Dec 2025
  months.push({ year: 2025, month: 12, daysCount: 31, count: 12 });

  // 2026 months up to current month
  let y = 2026;
  let m = 1;
  while (y < curYear || (y === curYear && m <= curMonth)) {
    const daysInM = new Date(y, m, 0).getDate();
    const count = (y === curYear && m === curMonth) ? 18 : Math.floor(10 + Math.random() * 8);
    months.push({ year: y, month: m, daysCount: daysInM, count });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  let addedCount = 0;

  for (const cwId of targetIds) {
    let globalIdx = 0;
    for (const mObj of months) {
      for (let i = 0; i < mObj.count; i++) {
        globalIdx++;
        // If current month, cap day at today's day of month or max 28
        const maxDay = (mObj.year === curYear && mObj.month === curMonth) ? Math.max(1, now.getDate()) : mObj.daysCount;
        const day = Math.floor(Math.random() * maxDay) + 1;
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(mObj.month).padStart(2, '0');
        const dateStr = `${mObj.year}-${monthStr}-${dayStr}`;

        const cust = custNames[(globalIdx + i) % custNames.length];
        const vehicle = vehicles[(globalIdx + i) % vehicles.length];
        const svc = services[(globalIdx + i) % services.length];
        const slot = timeSlots[(globalIdx + i) % timeSlots.length];
        const src = sources[(globalIdx + i) % sources.length];
        const bank = banks[(globalIdx + i) % banks.length];
        const txn = bank ? `${bank}-${Math.floor(100000 + Math.random() * 900000)}` : undefined;

        const bkId = `bk_smp_${cwId}_${mObj.year}${monthStr}${dayStr}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const timestamp = new Date(`${dateStr}T10:00:00.000Z`).toISOString();

        try {
          await createBooking({
            id: bkId,
            carWashId: cwId,
            customerId: `usr_cust_${(i % 10) + 1}`,
            customerName: cust,
            customerEmail: `${cust.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
            vehicleInfo: vehicle,
            bookingSource: src,
            date: dateStr,
            timeSlot: slot,
            status: BookingStatus.COMPLETED,
            paymentBank: bank || undefined,
            txnReference: txn,
            serviceId: `svc_${i % services.length}`,
            serviceName: svc.name,
            price: svc.price,
            createdAt: timestamp,
            updatedAt: timestamp,
            notes: `${svc.type === 'product' ? 'Over the counter product sale' : 'Completed service'} - ${vehicle}`
          });
          addedCount++;
        } catch (e) {
          // ignore duplicate
        }
      }
    }

    // Explicitly guarantee 5 entries for TODAY and 5 entries for YESTERDAY so current week/month views are never empty
    const todayStr = now.toISOString().split('T')[0];
    const yestDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = yestDate.toISOString().split('T')[0];

    for (const dStr of [todayStr, yestStr]) {
      for (let k = 0; k < 5; k++) {
        const cust = custNames[(k * 3) % custNames.length];
        const vehicle = vehicles[(k * 2) % vehicles.length];
        const svc = services[k % services.length];
        const slot = timeSlots[k % timeSlots.length];
        const bank = banks[k % banks.length];
        const txn = bank ? `${bank}-${Math.floor(100000 + Math.random() * 900000)}` : undefined;

        const bkId = `bk_now_${cwId}_${dStr.replace(/-/g, '')}_${k + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const timestamp = new Date(`${dStr}T${10 + k}:00:00.000Z`).toISOString();

        try {
          await createBooking({
            id: bkId,
            carWashId: cwId,
            customerId: `usr_cust_${k + 1}`,
            customerName: cust,
            customerEmail: `${cust.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
            vehicleInfo: vehicle,
            bookingSource: k % 2 === 0 ? 'WALK_IN' : 'ONLINE',
            date: dStr,
            timeSlot: slot,
            status: BookingStatus.COMPLETED,
            paymentBank: bank || undefined,
            txnReference: txn,
            serviceId: `svc_${k % services.length}`,
            serviceName: svc.name,
            price: svc.price,
            createdAt: timestamp,
            updatedAt: timestamp,
            notes: `Guaranteed recent transaction - ${svc.name}`
          });
          addedCount++;
        } catch (e) {
          // ignore duplicate
        }
      }
    }
  }

  return addedCount;
}

// Notifications Mapper & Database Methods
export const mapNotification = (row: any): AppNotification => {
  if (!row) return row;
  const isReadVal = row.isRead !== undefined ? row.isRead : (row.is_read !== undefined ? row.is_read : row.isread);
  return {
    id: row.id,
    userId: row.userId ?? row.user_id ?? row.userid,
    title: row.title,
    message: row.message,
    type: row.type,
    bookingId: row.bookingId ?? row.booking_id ?? row.bookingid ?? undefined,
    isRead: isReadVal === 1 || isReadVal === true || isReadVal === '1',
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
  };
};

export async function createNotification(n: AppNotification): Promise<void> {
  try {
    await runQueryRun(
      `INSERT INTO notifications (id, userId, title, message, type, bookingId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.userId, n.title, n.message, n.type, n.bookingId || null, n.isRead ? 1 : 0, n.createdAt]
    );
  } catch (err) {
    console.warn('Could not create notification:', err);
  }
}

export async function getNotificationsByUserId(userId: string): Promise<AppNotification[]> {
  try {
    const rows = await runQueryAll(
      `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
      [userId]
    );
    if (!Array.isArray(rows)) return [];
    return rows.map(mapNotification);
  } catch (err) {
    console.warn('Could not fetch notifications for user:', userId, err);
    return [];
  }
}

export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  try {
    await runQueryRun(
      `UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?`,
      [id, userId]
    );
  } catch (err) {
    console.warn('Could not mark notification as read:', err);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await runQueryRun(
      `UPDATE notifications SET isRead = 1 WHERE userId = ?`,
      [userId]
    );
  } catch (err) {
    console.warn('Could not mark all notifications as read:', err);
  }
}

// 🏢 Platform Global Information Operations
export async function getPlatformInfo(): Promise<PlatformInfo> {
  try {
    const row = await runQueryOne('SELECT * FROM platform_info WHERE id = ?', ['autoshine_info']);
    if (row) {
      const rawOtpVal = row.adminOtpRequired !== undefined ? row.adminOtpRequired : (row.admin_otp_required !== undefined ? row.admin_otp_required : row.adminotprequired);
      return {
        email: row.email ?? 'info@autoshinebn.com',
        contact: row.contact ?? '+673 8974459',
        whatsapp: row.whatsapp ?? '+673 8974459',
        address: row.address ?? 'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318',
        companyName: row.companyName ?? row.company_name ?? 'AUTOSHINE BN',
        description: row.description ?? "Brunei's premier car wash & auto detailing digital booking platform.",
        updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
        adminOtpRequired: rawOtpVal !== undefined ? (rawOtpVal === 1 || rawOtpVal === true || rawOtpVal === '1') : true,
      };
    }
  } catch (error) {
    console.error('Database getPlatformInfo Error:', error);
  }

  return {
    email: 'info@autoshinebn.com',
    contact: '+673 8974459',
    whatsapp: '+673 8974459',
    address: 'Unit 1, 1st Floor Block C, Kiarong Complex BSB BE1318',
    companyName: 'AUTOSHINE BN',
    description: "Brunei's premier car wash & auto detailing digital booking platform.",
    updatedAt: new Date().toISOString(),
    adminOtpRequired: true,
  };
}

export async function updatePlatformInfo(data: Partial<PlatformInfo>): Promise<PlatformInfo> {
  try {
    const current = await getPlatformInfo();
    const updated: PlatformInfo = {
      email: data.email !== undefined ? data.email.trim() : current.email,
      contact: data.contact !== undefined ? data.contact.trim() : current.contact,
      whatsapp: data.whatsapp !== undefined ? data.whatsapp.trim() : current.whatsapp,
      address: data.address !== undefined ? data.address.trim() : current.address,
      companyName: data.companyName !== undefined ? data.companyName.trim() : current.companyName,
      description: data.description !== undefined ? data.description.trim() : current.description,
      updatedAt: new Date().toISOString(),
      adminOtpRequired: data.adminOtpRequired !== undefined ? !!data.adminOtpRequired : (current.adminOtpRequired ?? true),
    };

    if (usePostgres) {
      await runQueryRun(`
        INSERT INTO platform_info (id, email, contact, whatsapp, address, company_name, description, updated_at, admin_otp_required)
        VALUES ('autoshine_info', ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          contact = EXCLUDED.contact,
          whatsapp = EXCLUDED.whatsapp,
          address = EXCLUDED.address,
          company_name = EXCLUDED.company_name,
          description = EXCLUDED.description,
          updated_at = EXCLUDED.updated_at,
          admin_otp_required = EXCLUDED.admin_otp_required
      `, [
        updated.email,
        updated.contact,
        updated.whatsapp,
        updated.address,
        updated.companyName || 'Autoshine BN',
        updated.description || '',
        updated.updatedAt,
        updated.adminOtpRequired ? 1 : 0
      ]);
    } else {
      await runQueryRun(`
        INSERT INTO platform_info (id, email, contact, whatsapp, address, companyName, description, updatedAt, adminOtpRequired)
        VALUES ('autoshine_info', ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          contact = excluded.contact,
          whatsapp = excluded.whatsapp,
          address = excluded.address,
          companyName = excluded.companyName,
          description = excluded.description,
          updatedAt = excluded.updatedAt,
          adminOtpRequired = excluded.adminOtpRequired
      `, [
        updated.email,
        updated.contact,
        updated.whatsapp,
        updated.address,
        updated.companyName || 'Autoshine BN',
        updated.description || '',
        updated.updatedAt,
        updated.adminOtpRequired ? 1 : 0
      ]);
    }

    return updated;
  } catch (error) {
    console.error('Database updatePlatformInfo Error:', error);
    throw error;
  }
}

export interface DatabaseDiagnostics {
  isPostgres: boolean;
  databaseType: 'supabase_postgresql' | 'sqlite';
  postgresConnected: boolean;
  postgresConnectionError: string | null;
  databaseUrlConfigured: boolean;
  directUrlConfigured: boolean;
  activeHost: string | null;
  activePort: string | null;
  storagePersistence: 'PERMANENT_CLOUD_SUPABASE' | 'EPHEMERAL_LOCAL_CONTAINER';
  poolStats: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } | null;
  lastCheckedAt: string;
  explanation: string;
}

export async function getDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  let isConnected = postgresConnected;
  let errorMsg = postgresConnectionError;

  if (usePostgres && pgPool) {
    try {
      const client = await pgPool.connect();
      client.release();
      isConnected = true;
      errorMsg = null;
      postgresConnected = true;
      postgresConnectionError = null;
    } catch (e: any) {
      isConnected = false;
      errorMsg = e.message || String(e);
      postgresConnected = false;
      postgresConnectionError = errorMsg;
    }
  }

  const { host, port } = parseHostAndPort(activeConnectionUrl);

  const persistence: 'PERMANENT_CLOUD_SUPABASE' | 'EPHEMERAL_LOCAL_CONTAINER' = 
    (usePostgres && isConnected) ? 'PERMANENT_CLOUD_SUPABASE' : 'EPHEMERAL_LOCAL_CONTAINER';

  let explanation = '';
  if (usePostgres && isConnected) {
    explanation = `Connected to permanent Supabase PostgreSQL database (${host}:${port}). All user accounts, car wash locations, services, and bookings are permanently retained across container restarts.`;
  } else if (usePostgres && !isConnected) {
    explanation = `DATABASE_URL is set but live connection test failed (${errorMsg || 'unknown'}). App is temporarily falling back to local SQLite, which is ephemeral on Google Cloud Run.`;
  } else {
    explanation = `DATABASE_URL is not set in environment. Running on local SQLite file. On Google Cloud Run serverless instances, local disk is ephemeral and resets on restart. Configure DATABASE_URL (Supabase port 6543) for permanent cloud persistence.`;
  }

  return {
    isPostgres: usePostgres,
    databaseType: (usePostgres && isConnected) ? 'supabase_postgresql' : 'sqlite',
    postgresConnected: isConnected,
    postgresConnectionError: errorMsg,
    databaseUrlConfigured: !!process.env.DATABASE_URL,
    directUrlConfigured: !!process.env.DIRECT_URL,
    activeHost: host,
    activePort: port,
    storagePersistence: persistence,
    poolStats: pgPool ? {
      totalCount: pgPool.totalCount,
      idleCount: pgPool.idleCount,
      waitingCount: pgPool.waitingCount,
    } : null,
    lastCheckedAt: new Date().toISOString(),
    explanation,
  };
}

// ⭐ Customer Ratings & Reviews Database Methods
export const mapReview = (row: any): Review => {
  if (!row) return row;
  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    customerName: row.customerName ?? row.customer_name ?? row.customername ?? 'Customer',
    customerEmail: row.customerEmail ?? row.customer_email ?? row.customeremail ?? undefined,
    rating: Number(row.rating || 5),
    comment: row.comment || '',
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat,
    bookingId: row.bookingId ?? row.booking_id ?? row.bookingid ?? undefined,
    ownerReply: row.ownerReply ?? row.owner_reply ?? row.ownerreply ?? undefined,
    ownerReplyAt: row.ownerReplyAt ?? row.owner_reply_at ?? row.ownerreplyat ?? undefined,
    ownerReplyBy: row.ownerReplyBy ?? row.owner_reply_by ?? row.ownerreplyby ?? undefined,
  };
};

export async function getReviewsByCarWash(carWashId: string): Promise<Review[]> {
  try {
    const rows = await runQueryAll(
      `SELECT * FROM reviews WHERE carWashId = ? ORDER BY createdAt DESC`,
      [carWashId]
    );
    if (!Array.isArray(rows)) return [];
    return rows.map(mapReview);
  } catch (err) {
    console.warn('Could not fetch reviews for car wash:', carWashId, err);
    return [];
  }
}

export async function getAllReviews(): Promise<Review[]> {
  try {
    const rows = await runQueryAll(`SELECT * FROM reviews ORDER BY createdAt DESC`);
    if (!Array.isArray(rows)) return [];
    return rows.map(mapReview);
  } catch (err) {
    console.warn('Could not fetch all reviews:', err);
    return [];
  }
}

export async function getReviewById(id: string): Promise<Review | null> {
  try {
    const row = await runQueryOne(`SELECT * FROM reviews WHERE id = ?`, [id]);
    return row ? mapReview(row) : null;
  } catch (err) {
    console.warn('Could not fetch review by id:', id, err);
    return null;
  }
}

export async function getCustomerReviewForCarWash(carWashId: string, customerId: string): Promise<Review | null> {
  try {
    const row = await runQueryOne(
      `SELECT * FROM reviews WHERE carWashId = ? AND customerId = ?`,
      [carWashId, customerId]
    );
    return row ? mapReview(row) : null;
  } catch (err) {
    console.warn('Could not fetch customer review:', carWashId, customerId, err);
    return null;
  }
}

export async function saveReview(review: Review): Promise<Review> {
  // Ensure 1 review per customer per car wash: check if existing
  const existing = await getCustomerReviewForCarWash(review.carWashId, review.customerId);
  const now = new Date().toISOString();

  if (existing) {
    // Update existing review while retaining any previous owner reply unless specified
    const updatedReview: Review = {
      ...existing,
      rating: review.rating,
      comment: review.comment,
      updatedAt: now,
      customerName: review.customerName || existing.customerName,
      customerEmail: review.customerEmail || existing.customerEmail,
      bookingId: review.bookingId || existing.bookingId,
    };

    await runQueryRun(
      `UPDATE reviews SET rating = ?, comment = ?, customerName = ?, customerEmail = ?, bookingId = ?, updatedAt = ? WHERE id = ?`,
      [
        updatedReview.rating,
        updatedReview.comment,
        updatedReview.customerName,
        updatedReview.customerEmail || null,
        updatedReview.bookingId || null,
        updatedReview.updatedAt,
        existing.id
      ]
    );
    return updatedReview;
  }

  // Create new review
  const newReview: Review = {
    ...review,
    id: review.id || `rev_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: review.createdAt || now,
    updatedAt: now,
  };

  await runQueryRun(
    `INSERT INTO reviews (id, carWashId, customerId, customerName, customerEmail, rating, comment, createdAt, updatedAt, ownerReply, ownerReplyAt, ownerReplyBy, bookingId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newReview.id,
      newReview.carWashId,
      newReview.customerId,
      newReview.customerName,
      newReview.customerEmail || null,
      newReview.rating,
      newReview.comment,
      newReview.createdAt,
      newReview.updatedAt,
      newReview.ownerReply || null,
      newReview.ownerReplyAt || null,
      newReview.ownerReplyBy || null,
      newReview.bookingId || null,
    ]
  );

  return newReview;
}

export async function deleteReview(id: string): Promise<boolean> {
  try {
    await runQueryRun(`DELETE FROM reviews WHERE id = ?`, [id]);
    return true;
  } catch (err) {
    console.warn('Could not delete review:', id, err);
    return false;
  }
}

export async function saveOwnerReply(id: string, reply: string, ownerName: string): Promise<Review | null> {
  const existing = await getReviewById(id);
  if (!existing) return null;

  const replyTimestamp = new Date().toISOString();
  await runQueryRun(
    `UPDATE reviews SET ownerReply = ?, ownerReplyAt = ?, ownerReplyBy = ? WHERE id = ?`,
    [reply.trim(), replyTimestamp, ownerName.trim(), id]
  );

  return {
    ...existing,
    ownerReply: reply.trim(),
    ownerReplyAt: replyTimestamp,
    ownerReplyBy: ownerName.trim(),
  };
}

export async function deleteOwnerReply(id: string): Promise<Review | null> {
  const existing = await getReviewById(id);
  if (!existing) return null;

  await runQueryRun(
    `UPDATE reviews SET ownerReply = NULL, ownerReplyAt = NULL, ownerReplyBy = NULL WHERE id = ?`,
    [id]
  );

  return {
    ...existing,
    ownerReply: undefined,
    ownerReplyAt: undefined,
    ownerReplyBy: undefined,
  };
}

export async function getReviewsSummaryForCarWash(carWashId: string): Promise<ReviewSummary> {
  const reviews = await getReviewsByCarWash(carWashId);
  const totalReviews = reviews.length;
  const ratingCounts: { [stars: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts,
    };
  }

  let totalScore = 0;
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    totalScore += r.rating;
  });

  const averageRating = Number((totalScore / totalReviews).toFixed(1));

  return {
    averageRating,
    totalReviews,
    ratingCounts,
  };
}

// ==========================================
// 🌟 MULTI-TENANT MEMBERSHIP & LOYALTY ENGINE
// ==========================================

const mapMembershipConfig = (row: any): CarWashMembershipConfig => {
  if (!row) return row;
  const isFeature = row.isFeatureEnabled !== undefined ? row.isFeatureEnabled : (row.is_feature_enabled !== undefined ? row.is_feature_enabled : row.isfeatureenabled);
  const isProgActive = row.isProgrammeActive !== undefined ? row.isProgrammeActive : (row.is_programme_active !== undefined ? row.is_programme_active : row.isprogrammeactive);
  const allowQr = row.allowQrJoin !== undefined ? row.allowQrJoin : (row.allow_qr_join !== undefined ? row.allow_qr_join : row.allowqrjoin);
  const allowCounter = row.allowCounterJoin !== undefined ? row.allowCounterJoin : (row.allow_counter_join !== undefined ? row.allow_counter_join : row.allowcounterjoin);

  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    isFeatureEnabled: isFeature === 1 || isFeature === true || isFeature === '1',
    isProgrammeActive: isProgActive === 1 || isProgActive === true || isProgActive === '1',
    programmeName: row.programmeName ?? row.programme_name ?? row.programmename ?? 'Rewards Programme',
    programmeDescription: row.programmeDescription ?? row.programme_description ?? row.programmedescription ?? undefined,
    pointsExpiryMonths: Number(row.pointsExpiryMonths ?? row.points_expiry_months ?? row.pointsexpirymonths ?? 0),
    allowQrJoin: allowQr === undefined || allowQr === 1 || allowQr === true || allowQr === '1',
    allowCounterJoin: allowCounter === undefined || allowCounter === 1 || allowCounter === true || allowCounter === '1',
    maxRedemptionsPerMemberPerDay: Number(row.maxRedemptionsPerMemberPerDay ?? row.max_redemptions_per_member_per_day ?? row.maxredemptionspermemberperday ?? 0),
    termsConditions: row.termsConditions ?? row.terms_conditions ?? row.termsconditions ?? undefined,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat ?? new Date().toISOString(),
  };
};

const mapCustomerMembership = (row: any): CustomerMembership => {
  if (!row) return row;
  const consent = row.consentGiven !== undefined ? row.consentGiven : (row.consent_given !== undefined ? row.consent_given : row.consentgiven);

  return {
    id: row.id,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    customerName: row.customerName ?? row.customer_name ?? row.customername ?? row.user_name ?? undefined,
    customerEmail: row.customerEmail ?? row.customer_email ?? row.customeremail ?? row.user_email ?? undefined,
    customerPhone: row.customerPhone ?? row.customer_phone ?? row.customerphone ?? row.user_phone ?? undefined,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    carWashName: row.carWashName ?? row.car_wash_name ?? row.carwashname ?? undefined,
    carWashLogo: row.carWashLogo ?? row.car_wash_logo ?? row.carwashlogo ?? row.logo_url ?? undefined,
    membershipNumber: row.membershipNumber ?? row.membership_number ?? row.membershipnumber,
    status: (row.status ?? 'ACTIVE') as any,
    pointsBalance: Number(row.pointsBalance ?? row.points_balance ?? row.pointsbalance ?? 0),
    joinedAt: row.joinedAt ?? row.joined_at ?? row.joinedat,
    joinMethod: (row.joinMethod ?? row.join_method ?? row.joinmethod ?? 'ONLINE_OPT_IN') as any,
    consentGiven: consent === 1 || consent === true || consent === '1',
    consentTimestamp: row.consentTimestamp ?? row.consent_timestamp ?? row.consenttimestamp,
    termsVersion: row.termsVersion ?? row.terms_version ?? row.termsversion ?? '1.0',
    qrToken: row.qrToken ?? row.qr_token ?? row.qrtoken,
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat,
  };
};

const mapPointsRule = (row: any): MembershipPointsRule => {
  if (!row) return row;
  const active = row.isActive !== undefined ? row.isActive : (row.is_active !== undefined ? row.is_active : row.isactive);
  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    serviceId: row.serviceId ?? row.service_id ?? row.serviceid,
    serviceName: row.serviceName ?? row.service_name ?? row.servicename,
    pointsAwarded: Number(row.pointsAwarded ?? row.points_awarded ?? row.pointsawarded ?? 10),
    isActive: active === 1 || active === true || active === '1',
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat,
  };
};

const mapPointsLedger = (row: any): MembershipPointsLedger => {
  if (!row) return row;
  const pts = Number(row.points ?? 0);
  const balAfter = row.balanceAfter !== undefined ? Number(row.balanceAfter) : (row.balance_after !== undefined ? Number(row.balance_after) : undefined);
  return {
    id: row.id,
    membershipId: row.membershipId ?? row.membership_id ?? row.membershipid,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    points: pts,
    pointsDelta: pts,
    balanceAfter: balAfter,
    transactionType: row.transactionType ?? row.transaction_type ?? row.transactiontype,
    description: row.description,
    bookingId: row.bookingId ?? row.booking_id ?? row.bookingid ?? undefined,
    redemptionId: row.redemptionId ?? row.redemption_id ?? row.redemptionid ?? undefined,
    performedById: row.performedById ?? row.performed_by_id ?? row.performedbyid,
    performedByRole: row.performedByRole ?? row.performed_by_role ?? row.performedbyrole,
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
  };
};

const mapReward = (row: any): MembershipReward => {
  if (!row) return row;
  const active = row.isActive !== undefined ? row.isActive : (row.is_active !== undefined ? row.is_active : row.isactive);
  const discountVal = row.discountValue !== undefined && row.discountValue !== null ? Number(row.discountValue ?? row.discount_value ?? row.discountvalue) : undefined;
  const maxPerMember = row.maxRedemptionsPerMember !== undefined ? Number(row.maxRedemptionsPerMember) : (row.max_redemptions_per_member !== undefined ? Number(row.max_redemptions_per_member) : undefined);
  const maxSupply = row.maxTotalSupply !== undefined ? Number(row.maxTotalSupply) : (row.max_total_supply !== undefined ? Number(row.max_total_supply) : undefined);
  const claims = row.claimCount !== undefined ? Number(row.claimCount) : (row.claim_count !== undefined ? Number(row.claim_count) : 0);

  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    title: row.title,
    description: row.description ?? undefined,
    pointsCost: Number(row.pointsCost ?? row.points_cost ?? row.pointscost ?? 100),
    rewardType: (row.rewardType ?? row.reward_type ?? row.rewardtype ?? 'FREE_SERVICE') as any,
    discountValue: discountVal,
    eligibleServiceId: row.eligibleServiceId ?? row.eligible_service_id ?? row.eligibleserviceid ?? undefined,
    maxRedemptionsPerMember: maxPerMember && maxPerMember > 0 ? maxPerMember : undefined,
    maxTotalSupply: maxSupply && maxSupply > 0 ? maxSupply : undefined,
    claimCount: claims,
    isActive: active === 1 || active === true || active === '1',
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
    updatedAt: row.updatedAt ?? row.updated_at ?? row.updatedat,
  };
};

const mapRedemption = (row: any): MembershipRedemption => {
  if (!row) return row;
  return {
    id: row.id,
    redemptionCode: row.redemptionCode ?? row.redemption_code ?? row.redemptioncode,
    membershipId: row.membershipId ?? row.membership_id ?? row.membershipid,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    customerName: row.customerName ?? row.customer_name ?? row.customername ?? row.user_name ?? undefined,
    customerEmail: row.customerEmail ?? row.customer_email ?? row.customeremail ?? row.user_email ?? undefined,
    customerPhone: row.customerPhone ?? row.customer_phone ?? row.customerphone ?? row.user_phone ?? undefined,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    carWashName: row.carWashName ?? row.car_wash_name ?? row.carwashname ?? undefined,
    rewardId: row.rewardId ?? row.reward_id ?? row.rewardid,
    rewardTitle: row.rewardTitle ?? row.reward_title ?? row.rewardtitle,
    pointsSpent: Number(row.pointsSpent ?? row.points_spent ?? row.pointsspent ?? 0),
    status: (row.status ?? 'PENDING') as any,
    redemptionToken: row.redemptionToken ?? row.redemption_token ?? row.redemptiontoken,
    expiresAt: row.expiresAt ?? row.expires_at ?? row.expiresat ?? undefined,
    redeemedAt: row.redeemedAt ?? row.redeemed_at ?? row.redeemedat ?? undefined,
    redeemedByStaffId: row.redeemedByStaffId ?? row.redeemed_by_staff_id ?? row.redeemedbystaffid ?? undefined,
    createdAt: row.createdAt ?? row.created_at ?? row.createdat,
  };
};

// 1. Programme Configuration
export async function getCarWashMembershipConfig(carWashId: string): Promise<CarWashMembershipConfig | null> {
  try {
    const cw = await runQueryOne('SELECT id, name, membershipEnabled, isActive FROM car_washes WHERE id = ?', [carWashId]);
    if (!cw) return null;
    const isFeature = Boolean(cw.membershipEnabled === 1 || cw.membership_enabled === 1 || cw.membershipEnabled === true);
    if (!isFeature) {
      return null;
    }

    const row = await runQueryOne('SELECT * FROM car_wash_memberships_config WHERE carWashId = ?', [carWashId]);
    if (!row) {
      return {
        id: `mcfg_${carWashId}`,
        carWashId,
        isFeatureEnabled: true,
        isProgrammeActive: true,
        programmeName: `${cw.name || 'AutoShine'} Rewards`,
        programmeDescription: 'Earn loyalty points for every wash and redeem exclusive services and gifts.',
        pointsExpiryMonths: 0,
        allowQrJoin: true,
        allowCounterJoin: true,
        termsConditions: 'Points are awarded upon service completion. Points belong strictly to this car wash and cannot be transferred or exchanged for cash.',
        updatedAt: new Date().toISOString(),
      };
    }
    const mapped = mapMembershipConfig(row);
    return {
      ...mapped,
      isFeatureEnabled: true,
      isProgrammeActive: mapped.isProgrammeActive !== false,
    };
  } catch (error) {
    console.error('Database getCarWashMembershipConfig Error:', error);
    return null;
  }
}

export async function upsertCarWashMembershipConfig(config: Partial<CarWashMembershipConfig> & { carWashId: string }): Promise<CarWashMembershipConfig> {
  const existing = await getCarWashMembershipConfig(config.carWashId);
  const now = new Date().toISOString();
  const id = existing?.id || `mcfg_${config.carWashId}`;
  const isFeatureEnabled = config.isFeatureEnabled !== undefined ? (config.isFeatureEnabled ? 1 : 0) : (existing?.isFeatureEnabled ? 1 : 0);
  const isProgrammeActive = config.isProgrammeActive !== undefined ? (config.isProgrammeActive ? 1 : 0) : (existing?.isProgrammeActive ? 1 : 0);
  const programmeName = config.programmeName || existing?.programmeName || 'Rewards Programme';
  const programmeDescription = config.programmeDescription ?? existing?.programmeDescription ?? null;
  const pointsExpiryMonths = config.pointsExpiryMonths !== undefined ? config.pointsExpiryMonths : (existing?.pointsExpiryMonths ?? 0);
  const allowQrJoin = config.allowQrJoin !== undefined ? (config.allowQrJoin ? 1 : 0) : (existing?.allowQrJoin !== false ? 1 : 1);
  const allowCounterJoin = config.allowCounterJoin !== undefined ? (config.allowCounterJoin ? 1 : 0) : (existing?.allowCounterJoin !== false ? 1 : 1);
  const maxRedemptionsPerMemberPerDay = config.maxRedemptionsPerMemberPerDay !== undefined ? config.maxRedemptionsPerMemberPerDay : (existing?.maxRedemptionsPerMemberPerDay ?? 0);
  const termsConditions = config.termsConditions ?? existing?.termsConditions ?? null;

  await runQueryRun(`
    INSERT INTO car_wash_memberships_config (
      id, carWashId, isFeatureEnabled, isProgrammeActive, programmeName, programmeDescription,
      pointsExpiryMonths, allowQrJoin, allowCounterJoin, maxRedemptionsPerMemberPerDay, termsConditions, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(carWashId) DO UPDATE SET
      isFeatureEnabled = excluded.isFeatureEnabled,
      isProgrammeActive = excluded.isProgrammeActive,
      programmeName = excluded.programmeName,
      programmeDescription = excluded.programmeDescription,
      pointsExpiryMonths = excluded.pointsExpiryMonths,
      allowQrJoin = excluded.allowQrJoin,
      allowCounterJoin = excluded.allowCounterJoin,
      maxRedemptionsPerMemberPerDay = excluded.maxRedemptionsPerMemberPerDay,
      termsConditions = excluded.termsConditions,
      updatedAt = excluded.updatedAt
  `, [
    id, config.carWashId, isFeatureEnabled, isProgrammeActive, programmeName, programmeDescription,
    pointsExpiryMonths, allowQrJoin, allowCounterJoin, maxRedemptionsPerMemberPerDay, termsConditions, now
  ]);

  // Keep car_washes.membershipEnabled synced
  await runQueryRun('UPDATE car_washes SET membershipEnabled = ? WHERE id = ?', [isFeatureEnabled, config.carWashId]);

  return {
    id,
    carWashId: config.carWashId,
    isFeatureEnabled: isFeatureEnabled === 1,
    isProgrammeActive: isProgrammeActive === 1,
    programmeName,
    programmeDescription: programmeDescription || undefined,
    pointsExpiryMonths,
    allowQrJoin: allowQrJoin === 1,
    allowCounterJoin: allowCounterJoin === 1,
    maxRedemptionsPerMemberPerDay,
    termsConditions: termsConditions || undefined,
    updatedAt: now,
  };
}

export async function setCarWashMembershipFeature(carWashId: string, isEnabled: boolean): Promise<void> {
  const flag = isEnabled ? 1 : 0;
  await runQueryRun('UPDATE car_washes SET membershipEnabled = ? WHERE id = ?', [flag, carWashId]);
  
  // Upsert config table
  const cfg = await getCarWashMembershipConfig(carWashId);
  const now = new Date().toISOString();
  if (cfg) {
    await runQueryRun('UPDATE car_wash_memberships_config SET isFeatureEnabled = ?, isProgrammeActive = ?, updatedAt = ? WHERE carWashId = ?', [flag, flag, now, carWashId]);
  } else {
    await upsertCarWashMembershipConfig({ carWashId, isFeatureEnabled: isEnabled, isProgrammeActive: isEnabled });
  }
}

// 2. Customer Memberships (Multi-Tenant)
export async function getCustomerMemberships(customerId: string): Promise<CustomerMembership[]> {
  try {
    const rows = await runQueryAll(`
      SELECT cm.*, cw.name AS car_wash_name, cw.logoUrl AS car_wash_logo
      FROM customer_memberships cm
      JOIN car_washes cw ON cm.carWashId = cw.id
      WHERE cm.customerId = ?
        AND cw.membershipEnabled = 1
        AND (cw.isActive = 1 OR cw.isActive IS NULL)
      ORDER BY cm.joinedAt DESC
    `, [customerId]);
    return rows.map(mapCustomerMembership);
  } catch (error) {
    console.error('Database getCustomerMemberships Error:', error);
    return [];
  }
}

export async function getCustomerMembership(customerId: string, carWashId: string): Promise<CustomerMembership | null> {
  try {
    const row = await runQueryOne(`
      SELECT cm.*, cw.name AS car_wash_name, cw.logoUrl AS car_wash_logo
      FROM customer_memberships cm
      JOIN car_washes cw ON cm.carWashId = cw.id
      WHERE cm.customerId = ? AND cm.carWashId = ?
        AND cw.membershipEnabled = 1
        AND (cw.isActive = 1 OR cw.isActive IS NULL)
    `, [customerId, carWashId]);
    if (!row) return null;
    return mapCustomerMembership(row);
  } catch (error) {
    console.error('Database getCustomerMembership Error:', error);
    return null;
  }
}

export async function getCustomerMembershipByToken(qrTokenOrNumber: string): Promise<CustomerMembership | null> {
  try {
    const clean = qrTokenOrNumber.trim();
    const row = await runQueryOne(`
      SELECT cm.*, cw.name AS car_wash_name, cw.logoUrl AS car_wash_logo,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM customer_memberships cm
      LEFT JOIN car_washes cw ON cm.carWashId = cw.id
      LEFT JOIN users u ON cm.customerId = u.id
      WHERE cm.qrToken = ? OR LOWER(cm.membershipNumber) = LOWER(?)
    `, [clean, clean]);
    if (!row) return null;
    return mapCustomerMembership(row);
  } catch (error) {
    console.error('Database getCustomerMembershipByToken Error:', error);
    return null;
  }
}

export async function getCustomerMembershipById(id: string): Promise<CustomerMembership | null> {
  try {
    const row = await runQueryOne(`
      SELECT cm.*, cw.name AS car_wash_name, cw.logoUrl AS car_wash_logo,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM customer_memberships cm
      LEFT JOIN car_washes cw ON cm.carWashId = cw.id
      LEFT JOIN users u ON cm.customerId = u.id
      WHERE cm.id = ?
    `, [id]);
    if (!row) return null;
    return mapCustomerMembership(row);
  } catch (error) {
    console.error('Database getCustomerMembershipById Error:', error);
    return null;
  }
}

export async function getCarWashMembers(carWashId: string, search?: string): Promise<CustomerMembership[]> {
  try {
    let sql = `
      SELECT cm.*, cw.name AS car_wash_name, cw.logoUrl AS car_wash_logo,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM customer_memberships cm
      LEFT JOIN car_washes cw ON cm.carWashId = cw.id
      LEFT JOIN users u ON cm.customerId = u.id
      WHERE cm.carWashId = ?
    `;
    const params: any[] = [carWashId];

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(cm.membershipNumber) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR u.phone LIKE ?)`;
      params.push(q, q, q, q);
    }

    sql += ` ORDER BY cm.joinedAt DESC`;
    const rows = await runQueryAll(sql, params);
    return rows.map(mapCustomerMembership);
  } catch (error) {
    console.error('Database getCarWashMembers Error:', error);
    return [];
  }
}

export async function joinCarWashMembership(customerId: string, carWashId: string, joinMethod: string = 'ONLINE_OPT_IN'): Promise<CustomerMembership> {
  // Check programme enablement
  const config = await getCarWashMembershipConfig(carWashId);
  if (!config || !config.isFeatureEnabled) {
    throw new Error('Membership programme is not enabled for this car wash.');
  }

  // Check existing membership
  const existing = await getCustomerMembership(customerId, carWashId);
  if (existing) {
    if (existing.status === 'ACTIVE') {
      return existing;
    }
    // Re-activate previously cancelled membership
    const now = new Date().toISOString();
    await runQueryRun(`
      UPDATE customer_memberships
      SET status = 'ACTIVE', updatedAt = ?, joinMethod = ?
      WHERE id = ?
    `, [now, joinMethod, existing.id]);
    return { ...existing, status: 'ACTIVE', updatedAt: now, joinMethod: joinMethod as any };
  }

  // Generate safe identifiers
  const carWash = await runQueryOne('SELECT name FROM car_washes WHERE id = ?', [carWashId]);
  const prefix = carWash?.name ? carWash.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() : 'MBR';
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const membershipNumber = `${prefix}-${randomSuffix}`;
  const qrToken = `mbr_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const membershipId = `mem_${Math.random().toString(36).substring(2, 9)}`;

  await runQueryRun(`
    INSERT INTO customer_memberships (
      id, customerId, carWashId, membershipNumber, status, pointsBalance,
      joinedAt, joinMethod, consentGiven, consentTimestamp, termsVersion, qrToken, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?, ?, 1, ?, '1.0', ?, ?, ?)
  `, [
    membershipId, customerId, carWashId, membershipNumber, now, joinMethod, now, qrToken, now, now
  ]);

  // Log audit
  const user = await runQueryOne('SELECT name, email FROM users WHERE id = ?', [customerId]);
  if (user) {
    await addAuditLog(customerId, user.email, 'JOIN_MEMBERSHIP', `Joined loyalty programme for car wash ${carWashId} (${membershipNumber})`);
  }

  const created = await getCustomerMembership(customerId, carWashId);
  if (!created) {
    throw new Error('Failed to retrieve newly created membership.');
  }
  return created;
}

export async function cancelCustomerMembership(customerId: string, carWashId: string): Promise<CustomerMembership | null> {
  const existing = await getCustomerMembership(customerId, carWashId);
  if (!existing) return null;

  const now = new Date().toISOString();
  await runQueryRun(`
    UPDATE customer_memberships
    SET status = 'CANCELLED', updatedAt = ?
    WHERE id = ?
  `, [now, existing.id]);

  const user = await runQueryOne('SELECT name, email FROM users WHERE id = ?', [customerId]);
  if (user) {
    await addAuditLog(customerId, user.email, 'CANCEL_MEMBERSHIP', `Left membership programme for car wash ${carWashId}`);
  }

  return { ...existing, status: 'CANCELLED', updatedAt: now };
}

// 3. Points Rules (Linked to Services)
export async function getMembershipPointsRules(carWashId: string): Promise<MembershipPointsRule[]> {
  try {
    const rows = await runQueryAll('SELECT * FROM membership_points_rules WHERE carWashId = ? ORDER BY createdAt ASC', [carWashId]);
    return rows.map(mapPointsRule);
  } catch (error) {
    console.error('Database getMembershipPointsRules Error:', error);
    return [];
  }
}

export async function upsertMembershipPointsRule(
  carWashId: string,
  serviceId: string,
  serviceName: string,
  pointsAwarded: number,
  isActive: boolean = true
): Promise<MembershipPointsRule> {
  const now = new Date().toISOString();
  const ruleId = `rule_${carWashId.substring(0, 4)}_${serviceId.substring(0, 6)}`;
  const activeVal = isActive ? 1 : 0;

  await runQueryRun(`
    INSERT INTO membership_points_rules (id, carWashId, serviceId, serviceName, pointsAwarded, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(carWashId, serviceId) DO UPDATE SET
      serviceName = excluded.serviceName,
      pointsAwarded = excluded.pointsAwarded,
      isActive = excluded.isActive,
      updatedAt = excluded.updatedAt
  `, [ruleId, carWashId, serviceId, serviceName, pointsAwarded, activeVal, now, now]);

  return {
    id: ruleId,
    carWashId,
    serviceId,
    serviceName,
    pointsAwarded,
    isActive,
    createdAt: now,
    updatedAt: now,
  };
}

// 4. Points Ledger & Transactions (Immutable Audit Trail)
export async function getMembershipLedger(membershipId: string): Promise<MembershipPointsLedger[]> {
  try {
    const rows = await runQueryAll(`
      SELECT * FROM membership_points_ledger
      WHERE membershipId = ?
      ORDER BY createdAt DESC
    `, [membershipId]);
    return rows.map(mapPointsLedger);
  } catch (error) {
    console.error('Database getMembershipLedger Error:', error);
    return [];
  }
}

export async function recordPointsTransaction(params: {
  membershipId: string;
  customerId: string;
  carWashId: string;
  points: number;
  transactionType: PointsTransactionType;
  description: string;
  bookingId?: string;
  redemptionId?: string;
  performedById: string;
  performedByRole: string;
}): Promise<{ newBalance: number; transaction: MembershipPointsLedger }> {
  const membership = await runQueryOne('SELECT id, pointsBalance, status FROM customer_memberships WHERE id = ?', [params.membershipId]);
  if (!membership) {
    throw new Error('Membership not found.');
  }
  if (membership.status !== 'ACTIVE') {
    throw new Error('Membership is not currently active.');
  }

  const currentBalance = Number(membership.pointsBalance ?? membership.points_balance ?? 0);
  const newBalance = currentBalance + params.points;

  if (newBalance < 0) {
    throw new Error(`Insufficient points balance. Current: ${currentBalance}, Required deduction: ${Math.abs(params.points)}`);
  }

  const now = new Date().toISOString();
  const txId = `tx_${Math.random().toString(36).substring(2, 9)}`;

  // Atomic update to pointsBalance
  await runQueryRun('UPDATE customer_memberships SET pointsBalance = ?, updatedAt = ? WHERE id = ?', [newBalance, now, params.membershipId]);

  // Insert ledger entry
  await runQueryRun(`
    INSERT INTO membership_points_ledger (
      id, membershipId, customerId, carWashId, points, transactionType,
      description, bookingId, redemptionId, performedById, performedByRole, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    txId, params.membershipId, params.customerId, params.carWashId, params.points, params.transactionType,
    params.description, params.bookingId || null, params.redemptionId || null,
    params.performedById, params.performedByRole, now
  ]);

  const tx: MembershipPointsLedger = {
    id: txId,
    membershipId: params.membershipId,
    customerId: params.customerId,
    carWashId: params.carWashId,
    points: params.points,
    pointsDelta: params.points,
    balanceAfter: newBalance,
    transactionType: params.transactionType,
    description: params.description,
    bookingId: params.bookingId,
    redemptionId: params.redemptionId,
    performedById: params.performedById,
    performedByRole: params.performedByRole,
    createdAt: now,
  };

  return { newBalance, transaction: tx };
}

export async function adjustCustomerPoints(params: {
  membershipId: string;
  pointsDelta: number;
  reason: string;
  performedById: string;
  performedByRole: string;
}): Promise<{ newBalance: number; transaction: MembershipPointsLedger }> {
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error('A specific reason is required for manual point adjustments.');
  }
  const membership = await runQueryOne('SELECT customerId, carWashId FROM customer_memberships WHERE id = ?', [params.membershipId]);
  if (!membership) throw new Error('Membership not found.');

  const customerId = membership.customerId ?? membership.customer_id;
  const carWashId = membership.carWashId ?? membership.car_wash_id;

  return recordPointsTransaction({
    membershipId: params.membershipId,
    customerId,
    carWashId,
    points: params.pointsDelta,
    transactionType: 'ADJUSTMENT',
    description: `Manual adjustment: ${params.reason.trim()}`,
    performedById: params.performedById,
    performedByRole: params.performedByRole,
  });
}

// 5. Automatic Points Awarding on Booking Completion
export async function awardPointsForBookingCompletion(
  bookingId: string,
  staffUser: { id: string; role: string } = { id: 'SYSTEM', role: 'SYSTEM' }
): Promise<{ pointsAwarded: number } | null> {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  // STRICT RULE: Points MUST ONLY be awarded if the wash is COMPLETED and NOT CANCELLED or REJECTED!
  // If customer decided to cancel or owner cancelled, points must NEVER increase or be added!
  if (booking.status !== BookingStatus.COMPLETED) {
    console.log(`[Points] Cannot award points: booking ${bookingId} has status '${booking.status}' (must be COMPLETED).`);
    return null;
  }

  // Check if booking has already earned points to prevent duplicate earning
  const existingTx = await runQueryOne(
    `SELECT id FROM membership_points_ledger WHERE bookingId = ? AND transactionType = 'EARN'`,
    [bookingId]
  );
  if (existingTx) {
    // Already awarded
    return null;
  }

  // Check if loyalty programme is enabled and active
  const config = await getCarWashMembershipConfig(booking.carWashId);
  const isEnabled = config ? (config.isFeatureEnabled && config.isProgrammeActive !== false) : false;
  if (!isEnabled) {
    return null;
  }

  // Check if customer has active membership with this car wash; auto-enroll if booking at an enabled location
  let membership = await getCustomerMembership(booking.customerId, booking.carWashId);
  if (!membership || membership.status !== 'ACTIVE') {
    try {
      membership = await joinCarWashMembership(booking.customerId, booking.carWashId, 'BOOKING_COMPLETION');
    } catch (joinErr) {
      console.warn('Could not auto-enroll member on booking completion:', joinErr);
      return null;
    }
  }

  // Calculate points
  let pointsToAward = 0;
  if (booking.serviceId) {
    const rules = await getMembershipPointsRules(booking.carWashId);
    const rule = rules.find((r) => r.serviceId === booking.serviceId && r.isActive);
    if (rule) {
      pointsToAward = rule.pointsAwarded;
    } else {
      // Default: 10 points or 1 point per $1
      pointsToAward = booking.price ? Math.max(1, Math.round(booking.price)) : 10;
    }
  } else {
    pointsToAward = booking.price ? Math.max(1, Math.round(booking.price)) : 10;
  }

  if (pointsToAward <= 0) return null;

  const desc = `Completed wash: ${booking.serviceName || 'Car Wash Service'} (${booking.date})`;
  await recordPointsTransaction({
    membershipId: membership.id,
    customerId: booking.customerId,
    carWashId: booking.carWashId,
    points: pointsToAward,
    transactionType: 'EARN',
    description: desc,
    bookingId: booking.id,
    performedById: staffUser.id,
    performedByRole: staffUser.role,
  });

  return { pointsAwarded: pointsToAward };
}

export async function reversePointsForBookingCancellation(
  bookingId: string,
  staffUser: { id: string; role: string } = { id: 'SYSTEM', role: 'SYSTEM' }
): Promise<{ pointsReversed: number } | null> {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  // Check if points were previously awarded for this booking
  const earnTx = await runQueryOne(
    `SELECT * FROM membership_points_ledger WHERE bookingId = ? AND transactionType = 'EARN'`,
    [bookingId]
  );
  if (!earnTx) return null;

  // Check if already reversed
  const reversedTx = await runQueryOne(
    `SELECT id FROM membership_points_ledger WHERE bookingId = ? AND transactionType = 'REFUND_REVERSAL'`,
    [bookingId]
  );
  if (reversedTx) return null;

  const membershipId = earnTx.membershipId ?? earnTx.membership_id;
  const customerId = earnTx.customerId ?? earnTx.customer_id;
  const carWashId = earnTx.carWashId ?? earnTx.car_wash_id;
  const earnedPoints = Number(earnTx.points ?? 0);

  if (earnedPoints <= 0) return null;

  await recordPointsTransaction({
    membershipId,
    customerId,
    carWashId,
    points: -earnedPoints,
    transactionType: 'REFUND_REVERSAL',
    description: `Reversal for cancelled/refunded booking: ${booking.serviceName || 'Wash'}`,
    bookingId: booking.id,
    performedById: staffUser.id,
    performedByRole: staffUser.role,
  });

  return { pointsReversed: earnedPoints };
}

// 6. Rewards Management
export async function getMembershipRewards(carWashId: string, activeOnly: boolean = false): Promise<MembershipReward[]> {
  try {
    const cw = await runQueryOne('SELECT id, membershipEnabled, isActive FROM car_washes WHERE id = ?', [carWashId]);
    if (!cw) return [];
    const isFeature = Boolean(cw.membershipEnabled === 1 || cw.membership_enabled === 1 || cw.membershipEnabled === true);
    if (!isFeature) {
      return [];
    }

    let sql = 'SELECT * FROM membership_rewards WHERE carWashId = ?';
    if (activeOnly) {
      sql += ' AND isActive = 1';
    }
    sql += ' ORDER BY pointsCost ASC, createdAt DESC';
    const rows = await runQueryAll(sql, [carWashId]);
    return rows.map(mapReward);
  } catch (error) {
    console.error('Database getMembershipRewards Error:', error);
    return [];
  }
}

export async function getMembershipRewardById(rewardId: string): Promise<MembershipReward | null> {
  try {
    const row = await runQueryOne('SELECT * FROM membership_rewards WHERE id = ?', [rewardId]);
    if (!row) return null;
    return mapReward(row);
  } catch (error) {
    console.error('Database getMembershipRewardById Error:', error);
    return null;
  }
}

export async function createMembershipReward(reward: Omit<MembershipReward, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipReward> {
  const id = `rew_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const activeVal = reward.isActive ? 1 : 0;
  const maxPerMember = reward.maxRedemptionsPerMember || 0;
  const maxSupply = reward.maxTotalSupply || 0;

  await runQueryRun(`
    INSERT INTO membership_rewards (
      id, carWashId, title, description, pointsCost, rewardType, discountValue, eligibleServiceId, isActive,
      maxRedemptionsPerMember, maxTotalSupply, claimCount, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `, [
    id, reward.carWashId, reward.title, reward.description || null, reward.pointsCost,
    reward.rewardType || 'FREE_SERVICE', reward.discountValue || 0, reward.eligibleServiceId || null,
    activeVal, maxPerMember, maxSupply, now, now
  ]);

  return {
    id,
    carWashId: reward.carWashId,
    title: reward.title,
    description: reward.description,
    pointsCost: reward.pointsCost,
    rewardType: reward.rewardType || 'FREE_SERVICE',
    discountValue: reward.discountValue,
    eligibleServiceId: reward.eligibleServiceId,
    maxRedemptionsPerMember: reward.maxRedemptionsPerMember,
    maxTotalSupply: reward.maxTotalSupply,
    claimCount: 0,
    isActive: reward.isActive,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateMembershipReward(rewardId: string, updates: Partial<MembershipReward>): Promise<MembershipReward | null> {
  const existing = await getMembershipRewardById(rewardId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const title = updates.title ?? existing.title;
  const description = updates.description !== undefined ? updates.description : existing.description;
  const pointsCost = updates.pointsCost ?? existing.pointsCost;
  const rewardType = updates.rewardType ?? existing.rewardType;
  const discountValue = updates.discountValue !== undefined ? updates.discountValue : existing.discountValue;
  const eligibleServiceId = updates.eligibleServiceId !== undefined ? updates.eligibleServiceId : existing.eligibleServiceId;
  const maxRedemptionsPerMember = updates.maxRedemptionsPerMember !== undefined ? updates.maxRedemptionsPerMember : (existing.maxRedemptionsPerMember || 0);
  const maxTotalSupply = updates.maxTotalSupply !== undefined ? updates.maxTotalSupply : (existing.maxTotalSupply || 0);
  const isActive = updates.isActive !== undefined ? updates.isActive : existing.isActive;

  await runQueryRun(`
    UPDATE membership_rewards
    SET title = ?, description = ?, pointsCost = ?, rewardType = ?, discountValue = ?, eligibleServiceId = ?,
        maxRedemptionsPerMember = ?, maxTotalSupply = ?, isActive = ?, updatedAt = ?
    WHERE id = ?
  `, [
    title, description || null, pointsCost, rewardType, discountValue || 0,
    eligibleServiceId || null, maxRedemptionsPerMember, maxTotalSupply, isActive ? 1 : 0, now, rewardId
  ]);

  return {
    ...existing,
    title,
    description,
    pointsCost,
    rewardType,
    discountValue,
    eligibleServiceId,
    maxRedemptionsPerMember: maxRedemptionsPerMember > 0 ? maxRedemptionsPerMember : undefined,
    maxTotalSupply: maxTotalSupply > 0 ? maxTotalSupply : undefined,
    isActive,
    updatedAt: now,
  };
}

// 7. Reward Redemption & Atomic Deductions
export async function createMembershipRedemption(
  customerId: string,
  carWashId: string,
  rewardId: string
): Promise<{ redemption: MembershipRedemption; newBalance: number }> {
  // Verify membership
  const membership = await getCustomerMembership(customerId, carWashId);
  if (!membership || membership.status !== 'ACTIVE') {
    throw new Error('You do not have an active membership with this car wash.');
  }

  // Verify reward
  const reward = await getMembershipRewardById(rewardId);
  if (!reward || reward.carWashId !== carWashId || !reward.isActive) {
    throw new Error('Reward is not available or inactive.');
  }

  // Verify points balance
  if (membership.pointsBalance < reward.pointsCost) {
    throw new Error(`Insufficient points. You need ${reward.pointsCost} points, but have ${membership.pointsBalance} points.`);
  }

  // 1. Enforce max claims per member (if configured by owner)
  if (reward.maxRedemptionsPerMember && reward.maxRedemptionsPerMember > 0) {
    const userRedeemedCountRow = await runQueryOne(
      `SELECT COUNT(*) as count FROM membership_redemptions WHERE customerId = ? AND rewardId = ? AND status != 'CANCELLED'`,
      [customerId, rewardId]
    );
    const userCount = Number(userRedeemedCountRow?.count || 0);
    if (userCount >= reward.maxRedemptionsPerMember) {
      throw new Error(`You have reached the maximum redemption limit (${reward.maxRedemptionsPerMember}) set by the owner for this reward.`);
    }
  }

  // 2. Enforce total supply cap (if configured by owner)
  if (reward.maxTotalSupply && reward.maxTotalSupply > 0) {
    const totalClaimCount = Number(reward.claimCount || 0);
    if (totalClaimCount >= reward.maxTotalSupply) {
      throw new Error(`This reward has reached its maximum total allocation of ${reward.maxTotalSupply} claims.`);
    }
  }

  // 3. Enforce max redemptions per member per day (if configured in programme)
  const config = await getCarWashMembershipConfig(carWashId);
  if (config?.maxRedemptionsPerMemberPerDay && config.maxRedemptionsPerMemberPerDay > 0) {
    const todayPrefix = new Date().toISOString().split('T')[0];
    const todayCountRow = await runQueryOne(
      `SELECT COUNT(*) as count FROM membership_redemptions WHERE customerId = ? AND carWashId = ? AND createdAt LIKE ? AND status != 'CANCELLED'`,
      [customerId, carWashId, `${todayPrefix}%`]
    );
    const todayCount = Number(todayCountRow?.count || 0);
    if (todayCount >= config.maxRedemptionsPerMemberPerDay) {
      throw new Error(`You have reached the daily limit of ${config.maxRedemptionsPerMemberPerDay} reward redemptions per day.`);
    }
  }

  const now = new Date().toISOString();
  const redemptionId = `rdm_${Math.random().toString(36).substring(2, 9)}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const redemptionCode = `RED-${randomSuffix}`;
  const redemptionToken = `rdmtk_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
  // 7 days redemption validity
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Deduct points atomically
  const { newBalance } = await recordPointsTransaction({
    membershipId: membership.id,
    customerId,
    carWashId,
    points: -reward.pointsCost,
    transactionType: 'REDEEM',
    description: `Redeemed reward: ${reward.title} (${redemptionCode})`,
    redemptionId,
    performedById: customerId,
    performedByRole: 'CUSTOMER',
  });

  // Create redemption record
  await runQueryRun(`
    INSERT INTO membership_redemptions (
      id, redemptionCode, membershipId, customerId, carWashId, rewardId, rewardTitle,
      pointsSpent, status, redemptionToken, expiresAt, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
  `, [
    redemptionId, redemptionCode, membership.id, customerId, carWashId, reward.id, reward.title,
    reward.pointsCost, redemptionToken, expiresAt, now
  ]);

  // Increment claimCount on reward
  try {
    await runQueryRun('UPDATE membership_rewards SET claimCount = claimCount + 1 WHERE id = ?', [reward.id]);
  } catch (err) {
    console.warn('Could not increment reward claimCount:', err);
  }

  const carWash = await runQueryOne('SELECT name FROM car_washes WHERE id = ?', [carWashId]);
  const user = await runQueryOne('SELECT name, email, phone FROM users WHERE id = ?', [customerId]);

  const redemption: MembershipRedemption = {
    id: redemptionId,
    redemptionCode,
    membershipId: membership.id,
    customerId,
    customerName: user?.name,
    customerEmail: user?.email,
    customerPhone: user?.phone,
    carWashId,
    carWashName: carWash?.name,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    status: 'PENDING',
    redemptionToken,
    expiresAt,
    createdAt: now,
  };

  return { redemption, newBalance };
}

export async function getRedemptionByToken(tokenOrCode: string): Promise<MembershipRedemption | null> {
  try {
    const clean = tokenOrCode.trim();
    const row = await runQueryOne(`
      SELECT mr.*, cw.name AS car_wash_name, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM membership_redemptions mr
      LEFT JOIN car_washes cw ON mr.carWashId = cw.id
      LEFT JOIN users u ON mr.customerId = u.id
      WHERE mr.redemptionToken = ? OR LOWER(mr.redemptionCode) = LOWER(?)
    `, [clean, clean]);
    if (!row) return null;
    return mapRedemption(row);
  } catch (error) {
    console.error('Database getRedemptionByToken Error:', error);
    return null;
  }
}

export async function confirmMembershipRedemption(
  tokenOrCode: string,
  staffId: string,
  carWashId: string
): Promise<MembershipRedemption> {
  const redemption = await getRedemptionByToken(tokenOrCode);
  if (!redemption) {
    throw new Error('Redemption record not found.');
  }

  // Cross-tenant verification
  if (redemption.carWashId !== carWashId) {
    throw new Error('This voucher belongs to a different car wash location.');
  }

  // Prevent double redemption atomically
  if (redemption.status === 'REDEEMED') {
    throw new Error('This reward voucher has already been redeemed and cannot be used again.');
  }
  if (redemption.status === 'CANCELLED' || redemption.status === 'EXPIRED') {
    throw new Error(`This reward voucher is ${redemption.status.toLowerCase()} and cannot be redeemed.`);
  }

  const now = new Date().toISOString();

  // Atomic state check & update
  const res = await runQueryRun(`
    UPDATE membership_redemptions
    SET status = 'REDEEMED', redeemedAt = ?, redeemedByStaffId = ?
    WHERE id = ? AND status = 'PENDING'
  `, [now, staffId, redemption.id]);

  return {
    ...redemption,
    status: 'REDEEMED',
    redeemedAt: now,
    redeemedByStaffId: staffId,
  };
}

export async function getCarWashRedemptions(carWashId: string): Promise<MembershipRedemption[]> {
  try {
    const rows = await runQueryAll(`
      SELECT mr.*, cw.name AS car_wash_name, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM membership_redemptions mr
      LEFT JOIN car_washes cw ON mr.carWashId = cw.id
      LEFT JOIN users u ON mr.customerId = u.id
      WHERE mr.carWashId = ?
      ORDER BY mr.createdAt DESC
    `, [carWashId]);
    return rows.map(mapRedemption);
  } catch (error) {
    console.error('Database getCarWashRedemptions Error:', error);
    return [];
  }
}

export async function getCustomerRedemptions(customerId: string): Promise<MembershipRedemption[]> {
  try {
    const rows = await runQueryAll(`
      SELECT mr.*, cw.name AS car_wash_name
      FROM membership_redemptions mr
      LEFT JOIN car_washes cw ON mr.carWashId = cw.id
      WHERE mr.customerId = ?
      ORDER BY mr.createdAt DESC
    `, [customerId]);
    return rows.map(mapRedemption);
  } catch (error) {
    console.error('Database getCustomerRedemptions Error:', error);
    return [];
  }
}


