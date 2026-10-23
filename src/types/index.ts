export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'SPECIAL_USER' 
  | 'RESTAURANT_OWNER' 
  | 'EMPLOYEE' 
  | 'RUNNER' 
  | 'CUSTOMER'
  | 'COMMUNITY_SCOUT';

export type OrderingMode = 'ENABLED' | 'DIRECTORY_ONLY' | 'VIEW_ONLY';

export type ServiceType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export type RunnerType = 'PLATFORM_PUBLIC' | 'IN_HOUSE_DEDICATED';

export type FulfillmentType = 'PLATFORM_RUNNER' | 'IN_HOUSE_RUNNER' | 'HYBRID' | 'PICKUP_ONLY';

export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';

export interface Promotion {
  id: string;
  restaurantId: string;
  code: string; // e.g. "WELCOME20", "WEEKEND5", "FREEDEL"
  title: string; // e.g. "20% Off All Orders"
  description: string;
  type: PromotionType;
  value: number; // e.g. 20 for 20%, 5 for $5.00 off
  minSpend: number; // Minimum order value to apply (e.g. 15.00)
  maxDiscount?: number; // Cap for percentage discount
  serviceTypes?: ServiceType[]; // Applies to ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
  startDate: string;
  endDate: string;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
}

export type HalalStatus = 'HALAL_CERTIFIED' | 'MUSLIM_OWNED' | 'PORK_FREE' | 'NOT_SPECIFIED';

export type SubscriptionTier = 'FREE_DIRECTORY' | 'BASIC_POS' | 'PRO_DELIVERY';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
export type KycVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'INCOMPLETE';

export interface DistrictDeliveryRate {
  district: string;
  fee: number;
  estimatedMinMinutes: number;
  estimatedMaxMinutes: number;
  isAvailable: boolean;
}

export interface DistrictRoute {
  originDistrict: string;
  destinationDistrict: string;
  distanceKm: number;
  baseFee: number;
  estimatedMinutes: string;
  isCrossDistrict: boolean;
}

export type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY_FOR_PICKUP' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'REJECTED';

export type PaymentMethodType = 
  | 'CASH_ON_DELIVERY' 
  | 'BANK_TRANSFER_BIBD' 
  | 'DIRECT_BANK_TRANSFER'
  | 'TARUS'
  | 'POCKET'
  | 'STRIPE_CARD' 
  | 'PAYPAL' 
  | 'APPLE_PAY' 
  | 'GOOGLE_PAY'
  | 'OTHER_CUSTOM';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WHATSAPP';
export type NotificationType = 
  | 'ORDER_PLACED' 
  | 'ORDER_ACCEPTED' 
  | 'ORDER_PREPARING' 
  | 'ORDER_READY' 
  | 'RUNNER_ASSIGNED' 
  | 'OUT_FOR_DELIVERY' 
  | 'ORDER_DELIVERED' 
  | 'ORDER_CANCELLED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLATION_APPROVED'
  | 'CANCELLATION_REJECTED'
  | 'REFUND_PROCESSED'
  | 'RUNNER_COMPENSATION'
  | 'ONBOARDING_APPROVED' 
  | 'SYSTEM_ALERT';

export type StorageProviderType = 'CLOUDINARY' | 'AWS_S3' | 'GOOGLE_CLOUD_STORAGE' | 'SUPABASE_STORAGE' | 'LOCAL';
export type AuthProviderType = 'SUPABASE_AUTH' | 'CUSTOM_JWT' | 'FIREBASE_AUTH' | 'AUTH0';
export type PaymentProviderType = 'STRIPE' | 'PAYPAL' | 'LOCAL_GATEWAY' | 'CASH_ESCROW';
export type EmailProviderType = 'RESEND' | 'SENDGRID' | 'POSTMARK' | 'AWS_SES' | 'SMTP';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  restaurantId?: string; // If owner, employee, or in-house runner
  runnerType?: RunnerType; // 'PLATFORM_PUBLIC' | 'IN_HOUSE_DEDICATED'
  runnerDistricts?: string[]; // Districts this runner operates in
  runnerBaseDistrict?: string; // Primary home base (e.g. 'Belait', 'Brunei-Muara', 'Tutong', 'Temburong')
  runnerCrossDistrictEnabled?: boolean; // Whether runner accepts cross-district long distance trips
  runnerCoveredDistricts?: string[]; // Allowed destination districts
  runnerCustomRates?: Record<string, number>; // Custom rates per route or local rate
  isRunnerOnline?: boolean;
  employeePermissions?: string[]; // Custom granular permissions
  isEmailVerified: boolean;
  isActive: boolean;
  isVerified?: boolean; // Verified by Special User / Admin
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  vehicleType?: string;
  plateNumber?: string;
  vehiclePlateNumber?: string;
  idCardNumber?: string;
  icNumber?: string;
  drivingLicenseNumber?: string;
  roadTaxExpiry?: string;
  runnerWalletBalance?: number;
  scoutTrustLevel?: 'PROBATIONARY' | 'TRUSTED' | 'SUSPENDED';
  scoutDailyUploadLimit?: number;
  createdAt: string;
}

export interface AddonOption {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

export interface AddonGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  options: AddonOption[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isSpicy?: boolean;
  isPopular?: boolean;
  preparationTimeMinutes: number;
  sortOrder: number;
  addonGroups?: AddonGroup[];
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuBookPage {
  id: string;
  title: string; // e.g. "Page 1 - Appetizers & Starters"
  description?: string; // Optional caption or description
  imageUrl: string; // compressed base64 or URL
  pageNumber: number;
  originalSizeKb?: number;
  compressedSizeKb?: number;
  uploadedAt: string;
}

export interface FloorZone {
  id: string;
  name: string; // e.g. "Main Dining Hall", "Outdoor Patio / Alfresco", "Private VIP Suite", "Family Section"
  description?: string;
  color?: string; // e.g. 'emerald', 'amber', 'purple', 'blue', 'orange'
  sortOrder?: number;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string; // e.g. "Table 1", "Booth 4", "Patio 2", "VIP Suite"
  tableNumber: string; // "1", "2", "P1", "VIP"
  zoneId: string; // references FloorZone.id
  capacity: number; // 2, 4, 6, 8, 10, etc.
  shape?: 'ROUND' | 'RECTANGLE' | 'BOOTH';
  isActive: boolean;
  notes?: string; // e.g. "Window side", "Near power outlet", "Quiet corner"
  mergedWith?: string[]; // IDs of other tables merged for a large party
  tablePin?: string; // 4-digit physical stand PIN to prevent remote outsider guessing (e.g. '4821')
  sessionEpoch?: number; // Incremented on table turnover/clear to invalidate old diner sessions
  currentSessionId?: string; // Unique session ID for the currently seated party
  lastClearedAt?: string; // Timestamp when table was cleared/settled by staff
}

export interface OperatingHours {
  day: string; // Monday, Tuesday, etc.
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  isOpen: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  onboardedById?: string;
  onboardedByRole?: UserRole;
  contributorName?: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  establishmentType: string; // e.g. 'Restaurant', 'Cafe', 'Home-Based Kitchen', 'Food Truck', 'Bakery', 'Hawker Stall'
  cuisineTypes: string[];
  logoUrl: string;
  coverImageUrl: string;
  phone: string;
  whatsappPhone?: string; // Direct WhatsApp for yellow page inquiry/orders
  email: string;
  halalStatus?: HalalStatus; // HALAL_CERTIFIED, MUSLIM_OWNED, PORK_FREE, NOT_SPECIFIED
  address: {
    street: string;
    city: string;
    district?: string; // e.g. Brunei-Muara, Belait, Tutong, Temburong
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  deliveryFee: number;
  minimumOrder: number;
  orderingMode: OrderingMode; // ENABLED, DIRECTORY_ONLY, VIEW_ONLY
  supportedServices: ServiceType[]; // e.g. ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
  fulfillmentType: FulfillmentType; // 'PLATFORM_RUNNER' | 'IN_HOUSE_RUNNER' | 'HYBRID' | 'PICKUP_ONLY'
  districtDeliveryRates?: DistrictDeliveryRate[]; // Specific delivery fees & ETAs per district
  menuBookPages?: MenuBookPage[]; // Full physical/printed menu page image scans
  floorZones?: FloorZone[]; // Custom floor areas/zones (e.g. Main Hall, Patio, VIP)
  tables?: RestaurantTable[]; // Configurable tables
  isVerified: boolean;
  isActive: boolean;
  kycStatus?: KycVerificationStatus;
  rocbnNumber?: string; // Registry of Companies and Business Names e.g. RC/00012345
  halalCertNumber?: string;
  subscriptionTier?: SubscriptionTier; // FREE_DIRECTORY, BASIC_POS, PRO_DELIVERY
  subscriptionStatus?: SubscriptionStatus; // TRIAL, ACTIVE, PAST_DUE, EXPIRED
  monthlySubscriptionFee?: number; // e.g. 0, 10, 30, 35, 65 BND
  billingModel?: 'MONTHLY' | 'ONE_OFF' | 'FREE';
  oneOffSetupFee?: number; // e.g. 40 BND one-off
  customPricingNote?: string;
  assignedOwnerEmail?: string; // Explicit owner email for directory claim
  lastPaymentReference?: string;
  subscriptionExpiresAt?: string;
  commissionRate: number; // e.g. 0% for pure SaaS, 5%, 12%
  businessAudience?: 'RETAIL_CONSUMER' | 'B2B_WHOLESALE_ONLY' | 'HYBRID'; // Target audience channel
  isB2BOnly?: boolean; // If true, strictly quarantined and hidden from consumer Yellow Pages & ordering discovery
  listingStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; // Moderation status for community scout uploads
  rejectionReason?: string;
  wholesaleSupplierId?: string; // If linked to a CommercialSupplier entity
  dineInSecurityMode?: 'STAFF_VERIFICATION' | 'TABLE_PIN' | 'OPEN'; // Security mode for table QR ordering
  allowGroupTableOrdering?: boolean; // Whether multiple guests at same table can merge orders
  operatingHours: OperatingHours[];
  createdAt: string;
}

export interface SelectedAddon {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string; // Unique uuid per item + addon combination
  menuItem: MenuItem;
  quantity: number;
  selectedAddons: SelectedAddon[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedAddons: SelectedAddon[];
  specialInstructions?: string;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  aptOrSuite?: string;
  city: string;
  district?: string; // e.g. 'Brunei-Muara' | 'Belait' | 'Tutong' | 'Temburong'
  mukim?: string;
  kampong?: string;
  simpang?: string;
  landmark?: string;
  state: string;
  zipCode: string;
  instructions?: string;
  latitude: number;
  longitude: number;
}

export type RunnerDeliveryMilestone = 
  | 'ASSIGNED_HEADING_TO_RESTAURANT' // Runner claimed job, en route to restaurant
  | 'ARRIVED_AT_RESTAURANT'          // Runner is at pickup counter waiting for bags
  | 'PICKED_UP_EN_ROUTE'             // Food collected, runner is driving towards customer
  | 'NEARBY_APPROACHING'             // Proximity beacon active: < 1.5km or entering simpang
  | 'ARRIVED_AT_DOORSTEP'            // Runner at gate/doorstep ringing customer
  | 'COMPLETED';                     // Safe handoff complete, tracking instantly purged

export interface DeliveryTelemetry {
  milestone: RunnerDeliveryMilestone;
  lastPingAt: string;
  latitude?: number;
  longitude?: number;
  estimatedArrivalMins?: number;
  distanceRemainingKm?: number;
  isNearbyProximityTriggered?: boolean;
  handoffPin?: string; // 4-digit safe handoff PIN (e.g., '4821')
  arrivedAtStoreAt?: string;
  pickedUpAt?: string;
  proximityTriggeredAt?: string;
  arrivedAtDoorAt?: string;
  completedAt?: string;
  proofType?: 'PIN_VERIFIED' | 'PHOTO_DROP_OFF' | 'DIRECT_HANDOVER';
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "FD-8942"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  runnerId?: string;
  runnerName?: string;
  runnerPhone?: string;
  runnerType?: RunnerType;
  deliveryMilestone?: RunnerDeliveryMilestone;
  deliveryTelemetry?: DeliveryTelemetry;
  handoffPin?: string; // 4-digit verification code
  runnerLocation?: {
    latitude: number;
    longitude: number;
    lastUpdatedAt?: string;
  };
  status: OrderStatus;
  serviceType: ServiceType; // 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  tableNumber?: string; // For Dine In orders
  tablePinEntered?: string; // 4-digit PIN entered by customer at table
  isTableVerifiedByStaff?: boolean; // Verified by floor staff / waiter to stop phantom orders
  dineInNotes?: string;
  pickupTime?: string; // For Takeaway orders
  restaurantDistrict?: string; // Origin restaurant district (e.g. Brunei-Muara, Belait, Tutong, Temburong)
  deliveryDistrict?: string; // Destination district (e.g. Brunei-Muara, Belait, Tutong, Temburong)
  isCrossDistrict?: boolean; // Whether origin !== destination
  routeDistanceKm?: number; // Approximate route distance in km
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  promoCode?: string;
  tax: number;
  deliveryFee: number;
  tip: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  deliveryAddress?: DeliveryAddress;
  specialNotes?: string;
  placedAt: string;
  estimatedReadyAt?: string;
  estimatedDeliveryAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancellationReason?: string;
  cancellationRequested?: boolean;
  cancellationRequestedAt?: string;
  cancellationRequestReason?: string;
  cancellationRequestStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  refundAmount?: number;
  refundStatus?: 'NONE' | 'PENDING' | 'PROCESSED' | 'REJECTED';
  refundMethod?: string;
  refundProcessedAt?: string;
  runnerCompensationPaid?: number;
  cancelledEnRoute?: boolean;
  proofOfDeliveryUrl?: string;
  cashTendered?: number;
  changeReturned?: number;
  settledBy?: string;
  settledAt?: string;
  customPaymentChannelName?: string;
  paymentReference?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  tenantId?: string;
  action: string;
  entityType: 'ORDER' | 'RESTAURANT' | 'MENU_ITEM' | 'USER' | 'SYSTEM_CONFIG' | 'AUTH';
  entityId: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  restaurantId?: string; // Multi-tenant restaurant association
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface RunnerTopUpRequest {
  id: string;
  runnerId: string;
  runnerName: string;
  runnerPhone: string;
  amount: number;
  bankName: 'BIBD' | 'BAIDURI' | 'CASH_HUB';
  bankReferenceNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByRole?: UserRole;
  rejectionReason?: string;
}

export interface CashRemittanceRecord {
  id: string;
  runnerId: string;
  runnerName: string;
  restaurantId: string;
  restaurantName: string;
  orderId: string;
  orderNumber: string;
  foodCostDueToKitchen: number;
  platformFeeDueToTech: number;
  runnerDeliveryFeeEarned: number;
  totalCashCollected: number;
  status: 'COLLECTED_AT_DOORSTEP' | 'HANDED_TO_RESTAURANT' | 'REMITTED_TO_PLATFORM';
  timestamp: string;
  acknowledgedBy?: string;
}

export type PaymentRailType = 'BANK_ACCOUNT' | 'TARUS_MOBILE' | 'E_WALLET';

export interface PlatformBankAccount {
  id: string;
  bankName: string; // e.g. "BIBD", "Baiduri Bank", "Perbadanan TAIB", "Tarus Digital Wallet"
  accountNumber: string; // Account number or Tarus mobile phone number (+673...)
  accountHolderName: string;
  paymentType: PaymentRailType;
  instructions?: string;
  isActive: boolean;
  isDefault?: boolean;
}

export interface PlatformConfig {
  globalOrderingEnabled: boolean;
  platformName: string;
  supportEmail: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  platformBankAccounts?: PlatformBankAccount[];
  bibdAccountName?: string;
  bibdAccountNumber?: string;
  baiduriAccountName?: string;
  baiduriAccountNumber?: string;
  maxRunnerCashCeiling?: number;
  runnerDispatchFeeBND?: number;
  crossDistrictHighwayCapBND?: number;
  defaultCommissionRate: number;
  defaultScoutDailyUploadLimit?: number; // Global default daily photo upload limit for community scouts (e.g. 3)
  defaultScoutApprovalRequired?: boolean; // Whether community scout uploads require ops audit (default: true)
  allowPublicScoutUploads?: boolean; // Whether public community scouts can upload yellow pages (default: true; false locks to internal ops only)
  taxRatePercent: number;
  baseDeliveryFee: number;
  storageProvider: StorageProviderType;
  authProvider: AuthProviderType;
  paymentProvider: PaymentProviderType;
  emailProvider?: EmailProviderType;
  maintenanceMode: boolean;
  allowRunnerAutoDispatch: boolean;
  establishmentTypes: string[]; // Dynamic categories like 'Restaurant', 'Cafe', 'Home-Based Kitchen', etc.
  districts: string[]; // e.g. ['Brunei-Muara', 'Belait', 'Tutong', 'Temburong']
  defaultDistrictRates: DistrictDeliveryRate[];
}

export type B2BCategory = 'POULTRY_MEAT' | 'DRY_GOODS_RICE' | 'SAUCES_CONDIMENTS' | 'PACKAGING' | 'BEVERAGE_BEANS';

export interface CommercialSupplier {
  id: string;
  businessName: string;
  rocbnNumber: string;
  halalCertNumber: string;
  category: B2BCategory | 'GENERAL_DISTRIBUTOR';
  contactPerson: string;
  phone: string;
  email: string;
  // Depot / Warehouse Location for Mapping
  depotAddress: {
    addressLine: string;
    simpang?: string;
    kampong: string;
    mukim?: string;
    district: string;
    landmark?: string;
    coordinates: { lat: number; lng: number };
  };
  deliveryCoverageDistricts: string[]; // ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong']
  deliveryScheduleNote: string; // e.g. "Brunei-Muara daily morning, Tutong & Belait on Tue/Thu"
  offersSelfPickup: boolean;
  offersSupplierTruck: boolean;
  minOrderAmountBND: number;
  deliveryFeeBND: number; // e.g. Free if order > $100
  // Platform Transaction Fee Configuration
  platformFeePercent: number; // e.g. 2.0 or 0.0 for promo
  feePayer: 'SUPPLIER_DEDUCTION' | 'BUYER_SURCHARGE' | 'WAIVED';
  // Corporate Settlement Bank Details
  bankAccount: {
    bankName: 'BIBD' | 'BAIDURI';
    accountName: string;
    accountNumber: string;
  };
  isVerified: boolean;
  // Public Directory Privacy & Channel Scope
  isQuarantinedFromPublicYellowPages?: boolean; // Always true: hidden from Yellow Pages & customer discovery
  targetAudience?: 'B2B_RESTAURANTS_ONLY'; // Published exclusively to B2B Wholesale Hub
  createdAt: string;
}

export interface B2BWholesaleProduct {
  id: string;
  supplierId?: string;
  supplierRestaurantId?: string;
  supplierName: string;
  supplierDistrict: string;
  supplierHalalCert: string;
  category: B2BCategory;
  title: string;
  description: string;
  unit: string; // e.g. 'kg', '50kg bag', '5L tub', 'box of 500'
  minOrderQuantity: number;
  wholesaleUnitPriceBND: number;
  leadTimeHours: number;
  isAvailable: boolean;
  deliveryOption: 'SUPPLIER_TRUCK' | 'SELF_PICKUP' | 'FARM_GATE';
  depotLocation?: {
    district: string;
    kampong: string;
    addressLine: string;
    coordinates: { lat: number; lng: number };
  };
  coverageDistricts?: string[];
  platformFeePercent?: number;
}

export interface B2BPurchaseOrder {
  id: string;
  poNumber: string;
  buyerRestaurantId: string;
  buyerRestaurantName: string;
  supplierName: string;
  supplierId?: string;
  items: {
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmountBND: number;
  platformFacilitationFeeBND: number; // e.g. 2%
  feePayer: 'SUPPLIER_DEDUCTION' | 'BUYER_SURCHARGE' | 'WAIVED';
  status: 'SUBMITTED' | 'ACCEPTED_BY_SUPPLIER' | 'OUT_FOR_DELIVERY' | 'DELIVERED_CONFIRMED' | 'PAID';
  paymentMethod: 'BIBD_CORPORATE_TRANSFER' | 'BAIDURI_TRANSFER' | 'NET_14_CREDIT';
  fulfillmentOption: 'SUPPLIER_TRUCK_DELIVERY' | 'DEPOT_SELF_PICKUP';
  deliveryDistrict?: string;
  createdAt: string;
}

