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
  type?: 'service' | 'product';
  vehicleType?: string;
  isAvailable?: boolean;
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

export interface MapPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  isCustom: boolean;
  createdAt: string;
}

