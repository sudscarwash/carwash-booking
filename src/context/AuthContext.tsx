import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RunnerType } from '../types';
import { INITIAL_USERS } from '../mockData';
import { hasPermission, PermissionKey, PERMISSIONS } from '../architecture/permissions';
import { sendTransactionalEmail } from '../utils/emailService';
import { SHOW_DEMO_ACCOUNTS, ENABLE_DEV_TOOLS, IS_PRODUCTION, ALLOW_MASTER_OTP_BYPASS, REQUIRE_ADMIN_2FA } from '../config/environment';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_STORAGE_KEYS = {
  USERS: 'foodfindr_users_v1',
  CURRENT_USER: 'foodfindr_current_user_v1',
};

export type AuthModalTab = 'SIGN_IN' | 'REGISTER' | 'VERIFY_OTP' | 'ADMIN_2FA' | 'DEMO_ROLES' | 'HIERARCHY_INFO';

export interface PendingRegistrationMeta {
  restaurantName?: string;
  restaurantCuisine?: string;
  district?: string;
  runnerVehicleType?: string;
  runnerPlateNumber?: string;
  fleetPin?: string;
}

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  authModalTargetRole?: UserRole;
  admin2faPending: { user: User; code: string } | null;
  openAuthModal: (tab?: AuthModalTab, role?: UserRole) => void;
  closeAuthModal: () => void;
  setCurrentUserRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  can: (permission: PermissionKey) => boolean;
  login: (email: string, role?: UserRole) => Promise<{ success: boolean; requires2FA?: boolean; code?: string }>;
  verifyAdmin2FA: (code: string) => Promise<boolean>;
  cancelAdmin2FA: () => void;
  logout: () => void;
  registerAccount: (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    runnerType?: RunnerType;
    district?: string;
    restaurantName?: string;
    restaurantCuisine?: string;
    runnerVehicleType?: string;
    runnerPlateNumber?: string;
    fleetPin?: string;
  }) => Promise<{ user: User; verificationCode: string }>;
  verifyEmailOtp: (email: string, code: string) => Promise<boolean>;
  getPendingRegistrationMeta: (email: string) => PendingRegistrationMeta | undefined;
  createUserByAdminOrOwner: (userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    restaurantId?: string;
    phone?: string;
    runnerType?: RunnerType;
    employeePermissions?: string[];
    scoutDailyUploadLimit?: number;
    scoutTrustLevel?: 'PROBATIONARY' | 'TRUSTED' | 'SUSPENDED';
  }) => Promise<User>;
  updateUserProfile: (data: Partial<User>) => void;
  updateAnyUser: (userId: string, data: Partial<User>) => void;
  verifyUser: (userId: string, isVerified: boolean, notes?: string) => void;
  deleteAccount: (userId: string) => Promise<{ success: boolean; message?: string }>;
}

const GUEST_USER: User = {
  id: 'usr_guest',
  email: 'guest@foodfindr.io',
  firstName: 'Public',
  lastName: 'Visitor',
  role: 'CUSTOMER',
  isEmailVerified: false,
  isActive: true,
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SHOW_DEMO_ACCOUNTS ? INITIAL_USERS : [];
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.id !== 'usr_guest') return parsed;
      }
    } catch {}
    if (SHOW_DEMO_ACCOUNTS) {
      return INITIAL_USERS.find(u => u.role === 'CUSTOMER') || INITIAL_USERS[0];
    }
    return GUEST_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.id !== 'usr_guest') return true;
      }
    } catch {}
    return SHOW_DEMO_ACCOUNTS; // In production, defaults to false (unauthenticated visitor)
  });

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    } catch {}
  }, [allUsers]);

  // Sync current user session to localStorage
  useEffect(() => {
    try {
      if (isAuthenticated && currentUser.id !== 'usr_guest') {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      }
    } catch {}
  }, [currentUser, isAuthenticated]);

  // Sync profiles from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('profiles')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const remoteUsers: User[] = data.map((p: any) => ({
            id: p.id,
            email: p.email,
            firstName: p.first_name || p.email.split('@')[0],
            lastName: p.last_name || 'User',
            phone: p.phone,
            role: p.role,
            isEmailVerified: true,
            isActive: p.is_active ?? true,
            restaurantId: p.restaurant_id,
            createdAt: p.created_at || new Date().toISOString(),
          }));
          setAllUsers(prev => {
            const remoteIds = new Set(remoteUsers.map(u => u.id));
            const remoteEmails = new Set(remoteUsers.map(u => u.email.toLowerCase()));
            const localOnly = prev.filter(u => !remoteIds.has(u.id) && !remoteEmails.has(u.email.toLowerCase()));
            return [...remoteUsers, ...localOnly];
          });
        }
      });
  }, []);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('SIGN_IN');
  const [authModalTargetRole, setAuthModalTargetRole] = useState<UserRole | undefined>();
  const [admin2faPending, setAdmin2faPending] = useState<{ user: User; code: string } | null>(null);

  const openAuthModal = (tab: AuthModalTab = 'SIGN_IN', role?: UserRole) => {
    setAuthModalTab(tab);
    setAuthModalTargetRole(role);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const setCurrentUserRole = (role: UserRole) => {
    const targetUser = allUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
    }
  };

  const switchUser = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  };

  const can = (permission: PermissionKey): boolean => {
    if (!isAuthenticated && currentUser.id === 'usr_guest') {
      return permission === PERMISSIONS.ORDER_BROWSE_LISTINGS || permission === PERMISSIONS.MENU_READ;
    }
    return hasPermission(currentUser.role, permission, currentUser.employeePermissions);
  };

  const login = async (email: string, role?: UserRole): Promise<{ success: boolean; requires2FA?: boolean; code?: string }> => {
    let targetUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!targetUser) {
      // If not found, create new account with specified role or default CUSTOMER
      targetUser = {
        id: `usr_${Math.random().toString(36).substring(2, 9)}`,
        email: email.toLowerCase().trim(),
        firstName: email.split('@')[0],
        lastName: role ? role.replace('_', ' ') : 'User',
        role: role || 'CUSTOMER',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setAllUsers(prev => [...prev, targetUser!]);
    }

    // Super Admin 2FA Requirement Check
    if (targetUser.role === 'SUPER_ADMIN' && REQUIRE_ADMIN_2FA) {
      const challengeCode = Math.floor(100000 + Math.random() * 900000).toString();
      setAdmin2faPending({ user: targetUser, code: challengeCode });

      await sendTransactionalEmail({
        to: targetUser.email,
        subject: `[SECURITY] FOODFINDR Super Admin 2FA Code: ${challengeCode}`,
        recipientName: targetUser.firstName,
        template: 'EMAIL_VERIFICATION',
        verificationCode: challengeCode,
      });

      return { success: false, requires2FA: true, code: challengeCode };
    }

    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  const verifyAdmin2FA = async (code: string): Promise<boolean> => {
    if (!admin2faPending) return false;
    const isMasterBypassAllowed = ALLOW_MASTER_OTP_BYPASS && code.trim() === '888888';
    if (admin2faPending.code === code.trim() || isMasterBypassAllowed) {
      setCurrentUser(admin2faPending.user);
      setIsAuthenticated(true);
      setAdmin2faPending(null);
      return true;
    }
    return false;
  };

  const cancelAdmin2FA = () => {
    setAdmin2faPending(null);
  };

  const [pendingVerifications, setPendingVerifications] = useState<Record<string, { code: string; user: User; meta?: PendingRegistrationMeta }>>({});

  const registerAccount = async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    runnerType?: RunnerType;
    district?: string;
    restaurantName?: string;
    restaurantCuisine?: string;
    runnerVehicleType?: string;
    runnerPlateNumber?: string;
    fleetPin?: string;
  }): Promise<{ user: User; verificationCode: string }> => {
    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const isPublicMerchantOrRunner = data.role === 'RESTAURANT_OWNER' || data.role === 'RUNNER';

    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role,
      phone: data.phone?.trim(),
      runnerType: data.runnerType,
      runnerDistricts: data.role === 'RUNNER' ? [data.district || 'Brunei-Muara', 'Tutong'] : undefined,
      runnerBaseDistrict: data.district || 'Brunei-Muara',
      runnerCoveredDistricts: data.role === 'RUNNER' ? [data.district || 'Brunei-Muara'] : undefined,
      isRunnerOnline: data.role === 'RUNNER' && !isPublicMerchantOrRunner, // Only go online if verified
      vehicleType: data.runnerVehicleType || (data.role === 'RUNNER' ? 'Motorcycle' : undefined),
      plateNumber: data.runnerPlateNumber || (data.role === 'RUNNER' ? 'BA 1234' : undefined),
      isEmailVerified: false, // Requires OTP confirmation
      isActive: true,
      isVerified: !isPublicMerchantOrRunner, // Customers auto-verified; Merchants & Runners require ops review
      verificationStatus: isPublicMerchantOrRunner ? 'PENDING' : 'VERIFIED',
      verificationNotes: isPublicMerchantOrRunner ? 'Awaiting verification of business registration & credentials by Operations.' : undefined,
      runnerWalletBalance: data.role === 'RUNNER' ? 0.00 : undefined,
      createdAt: new Date().toISOString(),
    };

    // Dispatch verification email via adapter (Resend default)
    await sendTransactionalEmail({
      to: newUser.email,
      subject: `Verify your FOODFINDR account: ${verificationCode}`,
      recipientName: newUser.firstName,
      template: 'EMAIL_VERIFICATION',
      verificationCode,
    });

    setPendingVerifications(prev => ({
      ...prev,
      [newUser.email]: { 
        code: verificationCode, 
        user: newUser,
        meta: {
          restaurantName: data.restaurantName,
          restaurantCuisine: data.restaurantCuisine,
          district: data.district,
          runnerVehicleType: data.runnerVehicleType,
          runnerPlateNumber: data.runnerPlateNumber,
          fleetPin: data.fleetPin,
        }
      }
    }));

    return { user: newUser, verificationCode };
  };

  const getPendingRegistrationMeta = (email: string): PendingRegistrationMeta | undefined => {
    return pendingVerifications[email.toLowerCase().trim()]?.meta;
  };

  const verifyEmailOtp = async (email: string, code: string): Promise<boolean> => {
    const pending = pendingVerifications[email.toLowerCase().trim()];
    const isMasterBypassAllowed = ALLOW_MASTER_OTP_BYPASS && code.trim() === '888888';
    if (pending && (pending.code === code.trim() || isMasterBypassAllowed)) {
      const verifiedUser: User = {
        ...pending.user,
        isEmailVerified: true
      };
      setAllUsers(prev => [...prev.filter(u => u.email.toLowerCase() !== email.toLowerCase().trim()), verifiedUser]);
      setCurrentUser(verifiedUser);
      setIsAuthenticated(true);
      setPendingVerifications(prev => {
        const copy = { ...prev };
        delete copy[email.toLowerCase().trim()];
        return copy;
      });
      return true;
    }
    return false;
  };

  const createUserByAdminOrOwner = async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    restaurantId?: string;
    phone?: string;
    runnerType?: RunnerType;
    employeePermissions?: string[];
    scoutDailyUploadLimit?: number;
    scoutTrustLevel?: 'PROBATIONARY' | 'TRUSTED' | 'SUSPENDED';
  }): Promise<User> => {
    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email: userData.email.toLowerCase().trim(),
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      role: userData.role,
      restaurantId: userData.restaurantId,
      phone: userData.phone?.trim(),
      runnerType: userData.runnerType,
      employeePermissions: userData.employeePermissions,
      scoutDailyUploadLimit: userData.scoutDailyUploadLimit,
      scoutTrustLevel: userData.scoutTrustLevel || (userData.role === 'COMMUNITY_SCOUT' ? 'PROBATIONARY' : undefined),
      isEmailVerified: true, // Pre-verified because provisioned by authorized manager
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await sendTransactionalEmail({
      to: newUser.email,
      subject: `Invitation to FOODFINDR (${userData.role.replace('_', ' ')})`,
      recipientName: newUser.firstName,
      template: 'ACCOUNT_INVITATION',
    });

    setAllUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(GUEST_USER);
    setAdmin2faPending(null);
  };

  const updateUserProfile = (data: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...data }));
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...data } : u));
  };

  const updateAnyUser = (userId: string, data: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...data }));
    }
  };

  const verifyUser = (userId: string, isVerified: boolean, notes?: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        isVerified,
        verificationStatus: isVerified ? 'VERIFIED' : 'REJECTED',
        verificationNotes: notes || (isVerified ? 'Approved by Operations' : 'Application declined by Operations'),
        isRunnerOnline: u.role === 'RUNNER' ? isVerified : u.isRunnerOnline,
      };
    }));

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        isVerified,
        verificationStatus: isVerified ? 'VERIFIED' : 'REJECTED',
        verificationNotes: notes || (isVerified ? 'Approved by Operations' : 'Application declined by Operations'),
        isRunnerOnline: prev.role === 'RUNNER' ? isVerified : prev.isRunnerOnline,
      }));
    }
  };

  const deleteAccount = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    // Permanently remove from all users state
    setAllUsers(prev => prev.filter(u => u.id !== userId));

    // If currently signed-in user, reset to GUEST session and clear credentials
    if (currentUser.id === userId) {
      setCurrentUser(GUEST_USER);
      setIsAuthenticated(false);
      setAdmin2faPending(null);
    }

    return { success: true, message: 'Account and personal credentials successfully deleted.' };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        isAuthenticated,
        isAuthModalOpen,
        authModalTab,
        authModalTargetRole,
        openAuthModal,
        closeAuthModal,
        setCurrentUserRole,
        switchUser,
        can,
        login,
        admin2faPending,
        verifyAdmin2FA,
        cancelAdmin2FA,
        logout,
        registerAccount,
        verifyEmailOtp,
        getPendingRegistrationMeta,
        createUserByAdminOrOwner,
        updateUserProfile,
        updateAnyUser,
        verifyUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
