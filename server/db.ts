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
import { Role, BookingStatus, UserWithPassword, CarWash, Booking, AuditLog, WeeklySchedule, MapPreset } from '../src/types.js';

const usePostgres = !!process.env.DATABASE_URL;

let pgPool: pg.Pool | null = null;
let sqliteDb: Database.Database | null = null;

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
    ssl: { rejectUnauthorized: false } // Always bypass strict SSL checks for local development with hosted Postgres (Supabase, Render, neon)
  });
} else {
  // Ensure data directory exists
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.resolve(dataDir, 'carwash.db');
  console.log('Using SQLite database at:', dbPath);
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
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
    isCustom: 'is_custom',
    iscustom: 'is_custom',
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
    if (tableName === 'users' || tableName === 'car_washes' || tableName === 'bookings' || tableName === 'audit_logs' || tableName === 'map_presets') {
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
        await pgPool!.query(statement);
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
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: isActiveVal === 1 || isActiveVal === true || isActiveVal === '1',
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
    paymentPolicy: row.paymentPolicy ?? row.payment_policy ?? row.paymentpolicy ?? 'PAY_ON_SITE',
    servicesJson: servicesJson ?? undefined,
    services: parsedServices,
  };
};

const mapBooking = (row: any): Booking => {
  if (!row) return row;
  return {
    id: row.id,
    carWashId: row.carWashId ?? row.car_wash_id ?? row.carwashid,
    customerId: row.customerId ?? row.customer_id ?? row.customerid,
    customerName: row.customerName ?? row.customer_name ?? row.customername,
    customerEmail: row.customerEmail ?? row.customer_email ?? row.customeremail,
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
  `);

  // Dynamically add rich user profile columns if they do not exist
  const alterColumns = [
    'ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN businessId TEXT',
    'ALTER TABLE users ADD COLUMN passwordHash TEXT',
    'ALTER TABLE users ADD COLUMN createdAt TEXT',
    'ALTER TABLE car_washes ADD COLUMN isActive INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN dateOfBirth TEXT',
    'ALTER TABLE users ADD COLUMN gender TEXT',
    'ALTER TABLE users ADD COLUMN profileImageUrl TEXT',
    'ALTER TABLE users ADD COLUMN address TEXT',
    'ALTER TABLE users ADD COLUMN phone TEXT',
    'ALTER TABLE car_washes ADD COLUMN phone TEXT',
    'ALTER TABLE car_washes ADD COLUMN instagram TEXT',
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
    'ALTER TABLE bookings ADD COLUMN paymentBank TEXT',
    'ALTER TABLE bookings ADD COLUMN txnReference TEXT',
    'ALTER TABLE bookings ADD COLUMN receiptFilename TEXT',
    'ALTER TABLE bookings ADD COLUMN serviceId TEXT',
    'ALTER TABLE bookings ADD COLUMN serviceName TEXT',
    'ALTER TABLE bookings ADD COLUMN price REAL',
  ];

  for (const query of alterColumns) {
    try {
      if (usePostgres) {
        await pgPool!.query(query);
      } else {
        sqliteDb!.exec(query);
      }
    } catch (e) {
      // Safely ignore column already exists errors
    }
  }

  // Create standard unique index for transaction references on SQLite or Postgres
  try {
    if (usePostgres) {
      await pgPool!.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_txnReference ON bookings(txnReference)`);
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
        INSERT INTO users (id, email, name, role, isActive, businessId, passwordHash, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [u.id, u.email, u.name, u.role, u.isActive ? 1 : 0, u.businessId || null, u.passwordHash, u.createdAt]);
    }
  } catch (err) {
    console.error('Error ensuring testing credentials exist:', err);
  }

  // Check if main seed data has already been loaded by verifying if Downtown location exists
  try {
    const hasDowntown = await runQueryOne("SELECT COUNT(*) AS count FROM car_washes WHERE id = 'cw_downtown'") as { count: any };
    const dtVal = hasDowntown ? parseInt(hasDowntown.count, 10) : 0;
    if (dtVal > 0) {
      console.log('Main seed data already loaded. Skipping full database seeding.');
      return;
    }
  } catch (e) {
    // ignore
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
    await runQueryRun(`
      INSERT INTO users (id, email, name, role, isActive, businessId, passwordHash, createdAt, dateOfBirth, gender, profileImageUrl, address, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      user.email,
      user.name,
      user.role,
      user.isActive ? 1 : 0,
      user.businessId || null,
      user.passwordHash,
      user.createdAt,
      user.dateOfBirth || null,
      user.gender || null,
      user.profileImageUrl || null,
      user.address || null,
      user.phone || null
    ]);
  } catch (error) {
    console.error('Database createUser Error:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<UserWithPassword>): Promise<void> {
  try {
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, val]) => {
      sets.push(`${key} = ?`);
      if (key === 'isActive') {
        values.push(val ? 1 : 0);
      } else {
        values.push(val === undefined ? null : val);
      }
    });

    if (sets.length === 0) return;

    values.push(id);
    await runQueryRun(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
  } catch (error) {
    console.error('Database updateUser Error:', error);
    throw error;
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
    await runQueryRun(`
      INSERT INTO car_washes (id, name, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, ownerId, isActive, createdAt, phone, instagram, paymentPolicy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      carWash.paymentPolicy || 'PRE_PAYMENT'
    ]);
  } catch (error) {
    console.error('Database createCarWash Error:', error);
    throw error;
  }
}

export async function updateCarWash(id: string, data: Partial<CarWash>): Promise<void> {
  try {
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, val]) => {
      if (key === 'customPaymentMethods') {
        return;
      }
      if (key === 'services') {
        sets.push(`servicesJson = ?`);
        values.push(JSON.stringify(val));
        return;
      }
      if (key === 'openingHours') {
        sets.push(`${key} = ?`);
        values.push(JSON.stringify(val));
      } else if (key === 'isActive' || key === 'bibdEnabled' || key === 'baiduriEnabled') {
        sets.push(`${key} = ?`);
        values.push(val ? 1 : 0);
      } else {
        sets.push(`${key} = ?`);
        values.push(val === undefined ? null : val);
      }
    });

    if (sets.length === 0) return;

    values.push(id);
    await runQueryRun(`UPDATE car_washes SET ${sets.join(', ')} WHERE id = ?`, values);
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
    const rows = await runQueryAll('SELECT * FROM bookings');
    return rows.map(mapBooking);
  } catch (error) {
    console.error('Database getBookings Error:', error);
    return [];
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    const row = await runQueryOne('SELECT * FROM bookings WHERE id = ?', [id]);
    return row ? mapBooking(row) : null;
  } catch (error) {
    console.error('Database getBookingById Error:', error);
    return null;
  }
}

export async function createBooking(booking: Booking): Promise<void> {
  try {
    await runQueryRun(`
      INSERT INTO bookings (
        id, carWashId, customerId, customerName, customerEmail, 
        date, timeSlot, status, notes, employeeId, 
        createdAt, updatedAt, paymentBank, txnReference, receiptFilename,
        serviceId, serviceName, price
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      booking.id,
      booking.carWashId,
      booking.customerId,
      booking.customerName,
      booking.customerEmail,
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
    const row = await runQueryOne('SELECT * FROM bookings WHERE txnReference = ?', [txnReference]);
    return row ? mapBooking(row) : null;
  } catch (error) {
    console.error('Database getBookingByTxnRef Error:', error);
    return null;
  }
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  try {
    const sets: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, val]) => {
      sets.push(`${key} = ?`);
      values.push(val === undefined ? null : val);
    });

    if (sets.length === 0) return;

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

export async function getPasswordResetByToken(token: string): Promise<PasswordReset | null> {
  try {
    const row = await runQueryOne('SELECT * FROM password_resets WHERE token = ?', [token]);
    return row ? (row as PasswordReset) : null;
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
