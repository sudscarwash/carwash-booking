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
import { Role, BookingStatus, UserWithPassword, CarWash, Booking, AuditLog, WeeklySchedule, MapPreset, AppNotification } from '../src/types.js';

let usePostgres = !!process.env.DATABASE_URL;
let postgresConnectionError: string | null = null;

let pgPool: pg.Pool | null = null;
let sqliteDb: Database.Database | null = null;

// Always initialize SQLite database safely as the core of our local fallback architecture
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

if (usePostgres) {
  console.log('Using PostgreSQL database connection for Supabase...');
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('.supabase.co') && (dbUrl.includes(':5432') || !dbUrl.includes(':6543'))) {
    console.warn('\n⚠️  WARNING: DETECTED SUPABASE DIRECT CONNECTION ON PORT 5432 (or non-pooler port)!');
    console.warn('Many hosting providers (like Render, AWS, or Google Cloud) do NOT support outbound IPv6 connections.');
    console.warn('Your direct connection (port 5432) uses IPv6-only on newer Supabase projects, which will fail with "connect ENETUNREACH".');
    console.warn('👉 ACTION REQUIRED: Change your DATABASE_URL in Render to use the CONNECTION POOLER (port 6543) instead.');
    console.warn('Example format: postgres://postgres.[your-project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true\n');
  }

  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Always bypass strict SSL checks for local development with hosted Postgres (Supabase, Render, neon)
    connectionTimeoutMillis: 5000, // 5 seconds connection timeout
  });

  pgPool.on('error', (err) => {
    console.error('[pgPool Idle Client Warning]:', err.message || err);
  });
} else {
  console.log('Using SQLite database at:', dbPath);
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
    if (tableName === 'users' || tableName === 'car_washes' || tableName === 'bookings' || tableName === 'audit_logs' || tableName === 'map_presets' || tableName === 'notifications') {
      result += ' ON CONFLICT (id) DO NOTHING';
    }
  }

  return result;
}

// Low-level query execution helpers
async function runQueryAll(sql: string, params: any[] = []): Promise<any[]> {
  if (usePostgres) {
    const pgSql = convertQueryToPg(sql);
    const res = await pgPool!.query(pgSql, params);
    return res.rows;
  } else {
    return sqliteDb!.prepare(sql).all(...params);
  }
}

async function runQueryOne(sql: string, params: any[] = []): Promise<any | null> {
  if (usePostgres) {
    const pgSql = convertQueryToPg(sql);
    const res = await pgPool!.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return sqliteDb!.prepare(sql).get(...params) || null;
  }
}

async function runQueryRun(sql: string, params: any[] = []): Promise<void> {
  if (usePostgres) {
    const pgSql = convertQueryToPg(sql);
    await pgPool!.query(pgSql, params);
  } else {
    sqliteDb!.prepare(sql).run(...params);
  }
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

const mapCarWash = (row: any): CarWash => {
  if (!row) return row;
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
  const isActiveVal = row.isActive !== undefined ? row.isActive : (row.is_active !== undefined ? row.is_active : row.isactive);
  const bibdEnabledVal = row.bibdEnabled !== undefined ? row.bibdEnabled : (row.bibd_enabled !== undefined ? row.bibd_enabled : row.bibdenabled);
  const baiduriEnabledVal = row.baiduriEnabled !== undefined ? row.baiduriEnabled : (row.baiduri_enabled !== undefined ? row.baiduri_enabled : row.baidurienabled);
  const openingHours = row.openingHours ?? row.opening_hours ?? row.openinghours;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    locationLat: Number(row.locationLat ?? row.location_lat ?? row.locationlat),
    locationLng: Number(row.locationLng ?? row.location_lng ?? row.locationlng),
    address: row.address,
    openingHours: typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours,
    slotDuration: Number(row.slotDuration ?? row.slot_duration ?? row.slotduration),
    capacityPerSlot: Number(row.capacityPerSlot ?? row.capacity_per_slot ?? row.capacityperslot),
    ownerId: row.ownerId ?? row.owner_id ?? row.ownerid,
    isActive: isActiveVal === 1 || isActiveVal === true || isActiveVal === '1',
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
export async function seedFirestoreIfEmpty() {
  if (usePostgres && pgPool) {
    try {
      console.log('Testing PostgreSQL/Supabase database connection...');
      const client = await pgPool.connect();
      client.release();
      console.log('✅ PostgreSQL/Supabase connection successful!');
    } catch (err: any) {
      postgresConnectionError = err.message || String(err);
      console.warn('ℹ️ PostgreSQL/Supabase connection not active:', postgresConnectionError);
      console.log('👉 Utilizing local SQLite database engine (carwash.db).');
      usePostgres = false;
      try {
        await pgPool.end();
      } catch (e) {}
      pgPool = null;
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
  `);

  // Dynamically add rich user profile columns and ensure all required core columns exist
  const alterColumns = [
    'ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN businessId TEXT',
    'ALTER TABLE users ADD COLUMN passwordHash TEXT',
    'ALTER TABLE users ADD COLUMN createdAt TEXT',
    'ALTER TABLE car_washes ADD COLUMN isActive INTEGER DEFAULT 1',
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
    'ALTER TABLE bookings ADD COLUMN carWashId TEXT',
    'ALTER TABLE bookings ADD COLUMN customerId TEXT',
    'ALTER TABLE bookings ADD COLUMN customerName TEXT',
    'ALTER TABLE bookings ADD COLUMN customerEmail TEXT',
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
    'ALTER TABLE bookings ADD COLUMN price REAL',
    'ALTER TABLE bookings ADD COLUMN customerPhone TEXT',
    'ALTER TABLE bookings ADD COLUMN vehicleInfo TEXT',
    'ALTER TABLE bookings ADD COLUMN bookingSource TEXT DEFAULT \'ONLINE\'',
    'ALTER TABLE bookings ADD COLUMN createdByRole TEXT',
    'ALTER TABLE bookings ADD COLUMN createdByEmail TEXT',
  ];

  // Try renaming un-underscored Postgres columns if present from legacy schemas
  if (usePostgres) {
    const renameQueries = [
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
      'ALTER TABLE car_washes RENAME COLUMN logourl TO logo_url',
      'ALTER TABLE car_washes RENAME COLUMN isactive TO is_active',
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

  console.log('Database schema structures and dynamic tables verified.');

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
      id: 'usr_owner',
      email: 'owner@carwash.com',
      name: 'Jack Owner',
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
      id: 'usr_employee',
      email: 'employee@carwash.com',
      name: 'Sam Employee',
      role: Role.EMPLOYEE,
      isActive: true,
      businessId: 'cw_downtown',
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
    }
  ];

  try {
    for (const u of users) {
      await runQueryRun(`
        INSERT OR IGNORE INTO users (id, email, name, role, isActive, businessId, passwordHash, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [u.id, u.email, u.name, u.role, u.isActive ? 1 : 0, u.businessId || null, u.passwordHash, u.createdAt]);
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

export async function createCarWash(carWash: CarWash): Promise<void> {
  try {
    const servicesStr = carWash.services ? JSON.stringify(carWash.services) : (carWash.servicesJson || '[]');
    const customPaymentsStr = carWash.customPaymentsJson || null;
    await runQueryRun(`
      INSERT INTO car_washes (
        id, name, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, ownerId, isActive, createdAt, phone, instagram, paymentPolicy, logoUrl, bibdAccountName, bibdAccountNo, bibdEnabled, baiduriAccountName, baiduriAccountNo, baiduriEnabled, bibdQrImageUrl, baiduriQrImageUrl, customPaymentsJson, servicesJson
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      carWash.id,
      carWash.name,
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
      if (key === 'isActive' || key === 'bibdEnabled' || key === 'baiduriEnabled') {
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

export async function getCustomersForOwner(ownerId: string, isAdmin = false): Promise<any[]> {
  try {
    const carWashes = await getCarWashes();
    const ownedIds = isAdmin ? carWashes.map(cw => cw.id) : carWashes.filter(cw => cw.ownerId === ownerId).map(cw => cw.id);
    
    const allUsers = await getUsers();
    const allBookings = await getBookings();
    
    const relevantBookings = allBookings.filter(b => ownedIds.includes(b.carWashId));
    
    const customerMap = new Map<string, {
      id: string;
      customerId?: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      dateOfBirth?: string;
      gender?: string;
      profileImageUrl?: string;
      vehicles: string[];
      totalBookings: number;
      completedBookings: number;
      totalSpent: number;
      lastBookingDate: string;
      firstLetter: string;
    }>();

    // 1. Seed registered customers
    const registeredCustomers = allUsers.filter(u => u.role === Role.CUSTOMER || u.role === Role.SPECIAL);
    for (const u of registeredCustomers) {
      const validPhone = u.phone && String(u.phone).trim() !== '' && String(u.phone).trim().toUpperCase() !== 'NA' && String(u.phone).trim().toUpperCase() !== 'N/A' ? String(u.phone).trim() : '';
      const key = (u.id || u.email || validPhone || u.name).toLowerCase();
      let letter = (u.name || 'C').charAt(0).toUpperCase();
      if (!/^[A-Z]$/i.test(letter)) letter = '#';
      
      customerMap.set(key, {
        id: u.id,
        customerId: u.id,
        name: u.name || 'Customer',
        phone: validPhone,
        email: u.email,
        address: u.address,
        dateOfBirth: u.dateOfBirth,
        gender: u.gender,
        profileImageUrl: u.profileImageUrl,
        vehicles: [],
        totalBookings: 0,
        completedBookings: 0,
        totalSpent: 0,
        lastBookingDate: '',
        firstLetter: letter,
      });
    }

    // 2. Merge bookings
    for (const b of relevantBookings) {
      const rawName = (b.customerName || 'Customer').trim();
      const rawPhone = (b.customerPhone && String(b.customerPhone).trim().toUpperCase() !== 'NA' && String(b.customerPhone).trim().toUpperCase() !== 'N/A' ? String(b.customerPhone).trim() : '');
      const rawEmail = (b.customerEmail || '').trim().toLowerCase();
      
      let existing: any = null;
      if (b.customerId && customerMap.has(b.customerId.toLowerCase())) {
        existing = customerMap.get(b.customerId.toLowerCase());
      } else if (rawEmail && customerMap.has(rawEmail)) {
        existing = customerMap.get(rawEmail);
      } else if (rawPhone && customerMap.has(rawPhone.toLowerCase())) {
        existing = customerMap.get(rawPhone.toLowerCase());
      } else if (customerMap.has(rawName.toLowerCase())) {
        existing = customerMap.get(rawName.toLowerCase());
      }

      const bPrice = Number(b.price) || 0;
      const isCompleted = b.status === BookingStatus.COMPLETED;
      const vehicleStr = b.vehicleInfo ? b.vehicleInfo.trim() : '';

      if (!existing) {
        let letter = rawName.charAt(0).toUpperCase();
        if (!/^[A-Z]$/i.test(letter)) letter = '#';
        const newKey = (b.customerId || rawEmail || rawPhone || rawName).toLowerCase();
        
        customerMap.set(newKey, {
          id: b.customerId || `guest_${newKey}`,
          customerId: b.customerId,
          name: rawName,
          phone: rawPhone,
          email: rawEmail || undefined,
          vehicles: vehicleStr ? [vehicleStr] : [],
          totalBookings: 1,
          completedBookings: isCompleted ? 1 : 0,
          totalSpent: isCompleted ? bPrice : 0,
          lastBookingDate: b.date || '',
          firstLetter: letter,
        });
      } else {
        existing.totalBookings += 1;
        if (isCompleted) {
          existing.completedBookings += 1;
          existing.totalSpent += bPrice;
        }
        if (rawPhone && (!existing.phone || existing.phone.toUpperCase() === 'NA' || existing.phone.toUpperCase() === 'N/A')) {
          existing.phone = rawPhone;
        }
        if (vehicleStr && !existing.vehicles.includes(vehicleStr)) {
          existing.vehicles.push(vehicleStr);
        }
        if (b.date && b.date > existing.lastBookingDate) {
          existing.lastBookingDate = b.date;
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

