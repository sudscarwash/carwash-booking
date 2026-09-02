/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Role {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
  OWNER = 'OWNER',
  SPECIAL = 'SPECIAL',
  ADMIN = 'ADMIN'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  businessId?: string; // If employee, assigned to this business
  createdAt: string;
  // Rich profile fields matching the prisma-like schema requested
  dateOfBirth?: string;
  gender?: string;
  profileImageUrl?: string;
  address?: string;
  phone?: string;
  isEmailVerified?: boolean;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface WeeklySchedule {
  monday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  tuesday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  wednesday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  thursday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  friday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  saturday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
  sunday: { open: string; close: string; isOpen: boolean; hasBreak?: boolean; breakStart?: string; breakEnd?: string };
}

export interface WashService {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  description?: string;
  type?: 'service' | 'product' | 'addon';
  vehicleType?: string;
  isAvailable?: boolean;
  slotsRequired?: number; // 0 = no slot capacity needed, 1 = 1 slot (30 min), 2 = 2 slots (1 hr)
}

export interface ScheduleOverride {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON' | 'CUSTOM_HOURS';
  reason: string; // e.g. "Public Holiday", "Hari Raya", "Renovation"
  customStartTime?: string; // "08:00"
  customEndTime?: string; // "14:00"
}

export interface PlatformInfo {
  email: string;
  contact: string;
  whatsapp: string;
  address: string;
  companyName?: string;
  description?: string;
  updatedAt?: string;
}

export interface CarWash {
  id: string;
  name: string;
  description: string;
  locationLat: number;
  locationLng: number;
  address: string;
  openingHours: WeeklySchedule;
  slotDuration: number; // in minutes (e.g. 30, 45, 60)
  capacityPerSlot: number; // max bookings per slot
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  phone?: string;
  instagram?: string;
  logoUrl?: string;

  // 🔒 Dynamic local Brunei bank configs
  bibdAccountName?: string;
  bibdAccountNo?: string;
  bibdEnabled?: boolean;
  bibdQrImageUrl?: string;
  baiduriAccountName?: string;
  baiduriAccountNo?: string;
  baiduriEnabled?: boolean;
  baiduriQrImageUrl?: string;
  customPaymentsJson?: string;
  customPaymentMethods?: CustomPaymentMethod[];
  paymentPolicy?: string;

  // Dynamic services created by owner
  servicesJson?: string;
  services?: WashService[];

  // 🌴 Dynamic Holiday and Ad-Hoc Schedule Closures
  scheduleOverridesJson?: string;
  scheduleOverrides?: ScheduleOverride[];
}

export interface CustomPaymentMethod {
  id: string;
  providerName: string; // e.g., "TARUS Instant Transfer", "Standard Chartered", "Pocket e-Wallet", "Progresif Pay"
  accountName: string;
  accountNo: string;
  instructions?: string;
  qrImageUrl?: string;
  isEnabled: boolean;
}

export interface Booking {
  id: string;
  carWashId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleInfo?: string;
  bookingSource?: 'ONLINE' | 'PHONE' | 'WALK_IN';
  createdByRole?: string;
  createdByEmail?: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 - 09:30"
  status: BookingStatus;
  notes?: string;
  employeeId?: string; // Employee assigned to handle it
  createdAt: string;
  updatedAt: string;

  // 🔒 Local Bank Payment Additions
  paymentBank?: string;       // "BIBD" or "Baiduri"
  txnReference?: string;      // Transaction reference number
  receiptFilename?: string;   // Filename of the uploaded screenshot

  // Dynamic service details
  serviceId?: string;
  serviceName?: string;
  price?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SystemStats {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalBusinesses: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'NEW_BOOKING' | 'STATUS_CHANGE' | 'SYSTEM';
  bookingId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface MapPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  isCustom: boolean;
  createdAt: string;
}

