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
  adminOtpRequired?: boolean;
}

export interface CarWash {
  id: string;
  name: string;
  slug?: string;
  description: string;
  locationLat: number;
  locationLng: number;
  address: string;
  openingHours: WeeklySchedule;
  slotDuration: number; // in minutes (e.g. 30, 45, 60)
  capacityPerSlot: number; // max bookings per slot
  ownerId: string;
  ownerEmail?: string;
  isActive: boolean;
  ownerNavigationEnabled?: boolean; // Legacy/full navigation access
  ownerQrCodeEnabled?: boolean; // Controls whether QR Code poster & tab are visible to the owner (default: false / hidden)
  membershipEnabled?: boolean; // Controls whether Loyalty & Membership programme is available for this car wash (Admin/Special user managed)
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

  // 🚗 Lightweight Arrival & Proximity Tracking
  proximityStatus?: 'EN_ROUTE' | 'ARRIVED';
  proximityDistanceKm?: number;
  proximityEtaMinutes?: number;
  proximityUpdatedAt?: string;
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

export interface Review {
  id: string;
  carWashId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  rating: number; // 1 to 5 stars
  comment: string; // Max 1000 characters
  createdAt: string;
  updatedAt: string;
  bookingId?: string;
  ownerReply?: string;
  ownerReplyAt?: string;
  ownerReplyBy?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { [stars: number]: number };
}

export interface TimeSlotSliceDetail {
  startTime: string;
  endTime: string;
  bookedCount: number;
  capacity: number;
  isFull: boolean;
}

export interface TimeSlotItem {
  timeSlot: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
  unavailableReason?: string;
  sliceDetails?: TimeSlotSliceDetail[];
  bookings?: { id: string; customerName: string; status: BookingStatus }[];
}

// ==========================================
// 🌟 MULTI-TENANT MEMBERSHIP & LOYALTY TYPES
// ==========================================

export interface CarWashMembershipConfig {
  id: string;
  carWashId: string;
  isFeatureEnabled: boolean; // Set by Admin / Special User
  isProgrammeActive: boolean; // Set by Owner (Active vs Paused)
  programmeName: string; // e.g. "Autoshine Royal Rewards"
  programmeDescription?: string;
  pointsExpiryMonths: number; // 0 = never, >0 = number of months
  allowQrJoin: boolean;
  allowCounterJoin: boolean;
  maxRedemptionsPerMemberPerDay?: number; // Maximum redemptions per member per day (0 = unlimited)
  termsConditions?: string;
  updatedAt: string;
}

export type MembershipStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface CustomerMembership {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  carWashId: string;
  carWashName?: string;
  carWashLogo?: string;
  membershipNumber: string; // e.g. "ASH-000102"
  status: MembershipStatus;
  pointsBalance: number;
  joinedAt: string;
  joinMethod: 'ONLINE_OPT_IN' | 'QR_SCAN' | 'COUNTER_INVITE';
  consentGiven: boolean;
  consentTimestamp: string;
  termsVersion: string;
  qrToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPointsRule {
  id: string;
  carWashId: string;
  serviceId: string;
  serviceName: string;
  pointsAwarded: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PointsTransactionType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUSTMENT' | 'REFUND_REVERSAL';

export interface MembershipPointsLedger {
  id: string;
  membershipId: string;
  customerId: string;
  carWashId: string;
  points: number;
  pointsDelta: number;
  balanceAfter?: number;
  transactionType: PointsTransactionType;
  description: string;
  bookingId?: string;
  redemptionId?: string;
  performedById: string;
  performedByRole: string;
  createdAt: string;
}

export type RewardType = 'FREE_SERVICE' | 'DISCOUNT_PERCENT' | 'FIXED_DISCOUNT' | 'FREE_ADDON' | 'CUSTOM';

export interface MembershipReward {
  id: string;
  carWashId: string;
  title: string;
  description?: string;
  pointsCost: number;
  rewardType: RewardType;
  discountValue?: number;
  eligibleServiceId?: string;
  maxRedemptionsPerMember?: number; // Cap on redemptions per individual member (0 = unlimited)
  maxTotalSupply?: number; // Total supply cap across the car wash (0 = unlimited)
  claimCount?: number; // Total times redeemed
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RedemptionStatus = 'PENDING' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED';

export interface MembershipRedemption {
  id: string;
  redemptionCode: string; // e.g. "RED-82931"
  membershipId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  carWashId: string;
  carWashName?: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  status: RedemptionStatus;
  redemptionToken: string;
  qrToken?: string;
  expiresAt?: string;
  redeemedAt?: string;
  redeemedByStaffId?: string;
  createdAt: string;
}

export enum IssueCategory {
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  ACCOUNT = 'ACCOUNT',
  CAR_WASH = 'CAR_WASH',
  BUG = 'BUG',
  SUGGESTION = 'SUGGESTION',
  OTHER = 'OTHER'
}

export enum IssuePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IssueStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface ReportedIssue {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  title: string;
  description: string;
  bookingId?: string;
  carWashId?: string;
  deviceInfo?: string;
  pageUrl?: string;
  adminNotes?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

