import { 
  User, 
  UserRole, 
  PaymentMethodType, 
  PaymentStatus, 
  NotificationChannel, 
  NotificationType,
  StorageProviderType 
} from '../../types';

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface IAuthProvider {
  readonly providerName: string;
  signInWithEmail(email: string, password: string): Promise<AuthSession>;
  signUpWithEmail(email: string, password: string, userData: Partial<User>): Promise<AuthSession>;
  signOut(userId: string): Promise<void>;
  refreshSession(refreshToken: string): Promise<AuthSession>;
  resetPassword(email: string): Promise<{ success: boolean; message: string }>;
  verifyToken(token: string): Promise<User | null>;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  provider: StorageProviderType;
}

export interface IStorageProvider {
  readonly providerName: StorageProviderType;
  uploadFile(fileOrBlob: File | Blob | string, options?: UploadOptions): Promise<UploadResult>;
  deleteFile(publicId: string): Promise<{ success: boolean }>;
  getOptimizedUrl(publicIdOrUrl: string, width?: number, height?: number, quality?: number): string;
}

export interface PaymentIntentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  paymentMethod: PaymentMethodType;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  transactionId: string;
  status: PaymentStatus;
  clientSecret?: string;
  amount: number;
  currency: string;
  timestamp: string;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult>;
  confirmPayment(transactionId: string): Promise<PaymentIntentResult>;
  refundPayment(transactionId: string, amount?: number, reason?: string): Promise<{ success: boolean; refundId: string }>;
}

export interface NotificationPayload {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  data?: Record<string, any>;
}

export interface INotificationProvider {
  readonly providerName: string;
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }>;
  broadcastToTenant(tenantId: string, event: string, payload: any): Promise<void>;
}
