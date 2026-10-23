import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { UserRole, RunnerType } from '../../types';
import { SHOW_DEMO_ACCOUNTS, SHOW_DEV_OTP_HELPER } from '../../config/environment';
import {
  X,
  LogIn,
  UserPlus,
  UserCheck,
  Shield,
  Store,
  ChefHat,
  Bike,
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building2,
  MapPin,
  ArrowRight,
  LogOut,
  KeyRound,
  RefreshCw,
  AlertCircle,
  Send,
  HelpCircle,
  Camera,
  BookOpen,
  ShieldCheck
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    currentUser,
    isAuthenticated,
    allUsers,
    switchUser,
    login,
    admin2faPending,
    verifyAdmin2FA,
    cancelAdmin2FA,
    registerAccount,
    verifyEmailOtp,
    getPendingRegistrationMeta,
    updateUserProfile,
    authModalTab,
    authModalTargetRole,
    logout
  } = useAuth();

  const { addRestaurant } = useRestaurants();
  const { config } = usePlatform();

  const [activeTab, setActiveTab] = useState<'SIGN_IN' | 'REGISTER' | 'VERIFY_OTP' | 'ADMIN_2FA' | 'DEMO_ROLES'>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Super Admin 2FA states
  const [admin2faEmail, setAdmin2faEmail] = useState('');
  const [enteredAdmin2faCode, setEnteredAdmin2faCode] = useState('');
  const [dispatchedAdmin2faCode, setDispatchedAdmin2faCode] = useState<string | null>(null);
  const [isAdmin2faResending, setIsAdmin2faResending] = useState(false);
  
  // Register state
  const [regRole, setRegRole] = useState<UserRole>('CUSTOMER');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState('Brunei-Muara');

  // Restaurant Owner specific fields
  const [regRestaurantName, setRegRestaurantName] = useState('');
  const [regRestaurantCuisine, setRegRestaurantCuisine] = useState('Local Malay, Brunei Classics');

  // Runner specific fields
  const [regRunnerType, setRegRunnerType] = useState<RunnerType>('PLATFORM_PUBLIC');
  const [regRunnerVehicleType, setRegRunnerVehicleType] = useState('Motorcycle');
  const [regRunnerPlateNumber, setRegRunnerPlateNumber] = useState('');
  const [regFleetPin, setRegFleetPin] = useState('');

  // Email OTP verification state
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync tab and role whenever opened
  useEffect(() => {
    if (isAuthModalOpen) {
      if (authModalTab && (authModalTab as string) !== 'HIERARCHY_INFO') {
        setActiveTab(authModalTab as any);
      }
      if (authModalTargetRole && authModalTargetRole !== 'COMMUNITY_SCOUT') {
        setRegRole(authModalTargetRole);
      } else {
        setRegRole('CUSTOMER');
      }
      setErrorMessage(null);
    }
  }, [isAuthModalOpen, authModalTab, authModalTargetRole]);

  if (!isAuthModalOpen) return null;

  // Validation helpers
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isValidPhone = (val: string) => val.trim().length >= 7;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email.trim());
      if (result.requires2FA) {
        setAdmin2faEmail(email.trim());
        setDispatchedAdmin2faCode(result.code || null);
        setActiveTab('ADMIN_2FA');
        setSuccessMessage(`Super Admin Two-Factor Authentication required. A 6-digit 2FA code was dispatched to ${email.trim()}.`);
        return;
      }
      setSuccessMessage('Successfully signed in! Welcome back.');
      setTimeout(() => {
        setSuccessMessage(null);
        closeAuthModal();
      }, 700);
    } catch {
      setErrorMessage('Failed to sign in. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAdmin2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!enteredAdmin2faCode.trim() || enteredAdmin2faCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit Super Admin 2FA code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const verified = await verifyAdmin2FA(enteredAdmin2faCode.trim());
      if (verified) {
        setSuccessMessage('Super Admin 2FA verified successfully! Welcome to Admin Command Center.');
        setTimeout(() => {
          setSuccessMessage(null);
          closeAuthModal();
        }, 700);
      } else {
        setErrorMessage('Invalid or expired 2FA code. Please retry or click Resend.');
      }
    } catch {
      setErrorMessage('2FA verification encountered an error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (!regFirstName.trim()) {
      setErrorMessage('First Name is required.');
      return;
    }
    if (!regLastName.trim()) {
      setErrorMessage('Last Name is required.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Email Address is required.');
      return;
    }
    if (!isValidEmail(regEmail)) {
      setErrorMessage('Please provide a valid email format (e.g. user@domain.com).');
      return;
    }

    // Duplicate email check
    const existing = allUsers.find(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (existing) {
      setErrorMessage('An account with this email address already exists. Please sign in instead.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long for security.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setErrorMessage('Passwords do not match. Please re-type your password confirmation.');
      return;
    }

    if (regPhone && !isValidPhone(regPhone)) {
      setErrorMessage('Please enter a valid contact phone number (e.g. +673 812 3456).');
      return;
    }

    if (regRole === 'RESTAURANT_OWNER' && !regRestaurantName.trim()) {
      setErrorMessage('Please enter your Restaurant / Business Name.');
      return;
    }

    if (regRole === 'RUNNER' && regRunnerType === 'IN_HOUSE_DEDICATED' && !regFleetPin.trim()) {
      setErrorMessage('Please enter the Restaurant PIN or Fleet Code provided by the owner.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerAccount({
        email: regEmail.trim(),
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        role: regRole,
        phone: regPhone.trim(),
        runnerType: regRole === 'RUNNER' ? regRunnerType : undefined,
        district: regDistrict,
        restaurantName: regRole === 'RESTAURANT_OWNER' ? regRestaurantName.trim() : undefined,
        restaurantCuisine: regRole === 'RESTAURANT_OWNER' ? regRestaurantCuisine.trim() : undefined,
        runnerVehicleType: regRole === 'RUNNER' ? regRunnerVehicleType : undefined,
        runnerPlateNumber: regRole === 'RUNNER' ? regRunnerPlateNumber.trim() : undefined,
        fleetPin: regRole === 'RUNNER' && regRunnerType === 'IN_HOUSE_DEDICATED' ? regFleetPin.trim() : undefined,
      });

      setOtpTargetEmail(regEmail.trim());
      setDispatchedOtp(result.verificationCode);
      setActiveTab('VERIFY_OTP');
      setSuccessMessage(`A 6-digit verification code has been dispatched to ${regEmail.trim()} via ${config.emailProvider || 'Resend'}.`);
    } catch {
      setErrorMessage('Registration encounter an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!enteredOtp.trim() || enteredOtp.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isVerified = await verifyEmailOtp(otpTargetEmail, enteredOtp);
      if (isVerified) {
        const meta = getPendingRegistrationMeta(otpTargetEmail);
        
        // Auto-provision Restaurant if registering as Restaurant Owner
        if (regRole === 'RESTAURANT_OWNER' && meta?.restaurantName) {
          const newRest = addRestaurant({
            name: meta.restaurantName,
            slug: meta.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            ownerId: currentUser.id,
            tagline: 'Authentic Brunei Dining & Kitchen',
            description: `${meta.restaurantName} is serving handcrafted culinary favorites with local Brunei heritage.`,
            establishmentType: 'Restaurant',
            cuisineTypes: meta.restaurantCuisine
              ? meta.restaurantCuisine.split(',').map(s => s.trim()).filter(Boolean)
              : ['Bruneian', 'Local Favorites'],
            priceLevel: '$$',
            logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
            coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
            phone: regPhone || '+673 242 1234',
            whatsappPhone: regPhone || '+673 888 1234',
            email: otpTargetEmail,
            halalStatus: 'HALAL_CERTIFIED',
            address: {
              street: 'Jalan Gadong Commercial Area',
              city: meta.district || 'Brunei-Muara',
              district: meta.district || 'Brunei-Muara',
              state: meta.district || 'Brunei-Muara',
              zipCode: 'BE1318',
              latitude: 4.9031,
              longitude: 114.9398,
            },
            rating: 5.0,
            reviewCount: 1,
            estimatedDeliveryMin: 20,
            estimatedDeliveryMax: 35,
            deliveryFee: 3.5,
            minimumOrder: 10,
            orderingMode: 'DIRECTORY_ONLY', // Default to Yellow Page until Special User approves full ordering or POS tier
            supportedServices: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
            fulfillmentType: 'PLATFORM_RUNNER',
            isVerified: false, // Must be verified by Special User or Super Admin before public listing
            isActive: false, // Kept off public discover until ops approval
            subscriptionTier: 'FREE_DIRECTORY',
            subscriptionStatus: 'TRIAL',
            commissionRate: 12,
            operatingHours: [
              { day: 'Monday', openTime: '08:00', closeTime: '21:00', isOpen: true },
              { day: 'Tuesday', openTime: '08:00', closeTime: '21:00', isOpen: true },
              { day: 'Wednesday', openTime: '08:00', closeTime: '21:00', isOpen: true },
              { day: 'Thursday', openTime: '08:00', closeTime: '21:00', isOpen: true },
              { day: 'Friday', openTime: '08:00', closeTime: '21:00', isOpen: true },
              { day: 'Saturday', openTime: '08:00', closeTime: '22:00', isOpen: true },
              { day: 'Sunday', openTime: '08:00', closeTime: '22:00', isOpen: true },
            ],
          });
          updateUserProfile({ restaurantId: newRest.id, isVerified: false, verificationStatus: 'PENDING' });
          setSuccessMessage(`Email verified! "${meta.restaurantName}" has been submitted. Status: Pending Operations Review (Special User).`);
        } else if (regRole === 'RUNNER') {
          updateUserProfile({ isVerified: false, verificationStatus: 'PENDING' });
          setSuccessMessage('Email verified! Courier account registered. Status: Pending Operations Review (Special User).');
        } else {
          setSuccessMessage('Email verified successfully! Welcome to FOODFINDR.');
        }

        setTimeout(() => {
          setSuccessMessage(null);
          closeAuthModal();
        }, 1100);
      } else {
        setErrorMessage('Invalid or expired verification code. Please check the code or click Resend.');
      }
    } catch {
      setErrorMessage('Verification failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setErrorMessage(null);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setDispatchedOtp(newCode);
    setTimeout(() => {
      setIsResending(false);
      setSuccessMessage(`A new verification code (${newCode}) was sent to ${otpTargetEmail} via ${config.emailProvider || 'Resend'}.`);
    }, 600);
  };

  const handleSelectDemoUser = (userId: string) => {
    switchUser(userId);
    setSuccessMessage('Switched profile successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
      closeAuthModal();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#DCE3DD] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#16241B] text-white p-6 sm:p-7 relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-2 text-[#9FB0A3] hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0562B] flex items-center justify-center shadow-md text-white font-black text-xl">
              F
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">FOODFINDR Access & Verification</h2>
              <p className="text-xs text-[#9FB0A3] font-medium mt-0.5">
                Multi-Role Authentication, Email Validation & Brunei Logistics Access
              </p>
            </div>
          </div>

          {/* Current Status pill */}
          {isAuthenticated && (
            <div className="mt-4 bg-white/10 border border-white/15 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser.firstName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#E0562B]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{currentUser.firstName} {currentUser.lastName}</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-[#E0562B] text-white rounded-full">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    {currentUser.isEmailVerified && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#9FB0A3]">{currentUser.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#DCE3DD] bg-[#F6F7F5] px-6 pt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('SIGN_IN'); setErrorMessage(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SIGN_IN'
                ? 'border-[#E0562B] text-[#E0562B]'
                : 'border-transparent text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('REGISTER'); setErrorMessage(null); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'REGISTER'
                ? 'border-[#E0562B] text-[#E0562B]'
                : 'border-transparent text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New</span>
          </button>

          {otpTargetEmail && (
            <button
              onClick={() => { setActiveTab('VERIFY_OTP'); setErrorMessage(null); }}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'VERIFY_OTP'
                  ? 'border-[#E0562B] text-[#E0562B]'
                  : 'border-transparent text-[#526056] hover:text-[#16241B]'
              }`}
            >
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Verify OTP</span>
            </button>
          )}

          {(activeTab === 'ADMIN_2FA' || admin2faPending) && (
            <button
              onClick={() => { setActiveTab('ADMIN_2FA'); setErrorMessage(null); }}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ADMIN_2FA'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-[#526056] hover:text-[#16241B]'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Admin 2FA</span>
            </button>
          )}


          {SHOW_DEMO_ACCOUNTS && (
            <button
              onClick={() => { setActiveTab('DEMO_ROLES'); setErrorMessage(null); }}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'DEMO_ROLES'
                  ? 'border-[#E0562B] text-[#E0562B]'
                  : 'border-transparent text-[#526056] hover:text-[#16241B]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>1-Click Test Personas</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {successMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'SIGN_IN' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#526056] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah.j@example.com or antonio@trattoriabella.com"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#16241B] placeholder:text-[#526056]/60 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]/30 focus:border-[#E0562B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#526056] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#16241B] placeholder:text-[#526056]/60 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]/30 focus:border-[#E0562B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#526056]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-[#E0562B] focus:ring-[#E0562B]" />
                  <span>Remember this device</span>
                </label>
                <button type="button" className="font-semibold text-[#E0562B] hover:underline cursor-pointer">
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E0562B] hover:bg-[#B5431E] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing In...' : 'Sign In with Email'}</span>
              </button>

              {SHOW_DEMO_ACCOUNTS && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#DCE3DD]" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold">
                      <span className="bg-white px-3 text-[#526056]">Or quick demo login</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectDemoUser('usr_customer_1')}
                      className="p-2.5 rounded-xl border border-[#DCE3DD] bg-[#F6F7F5] hover:bg-white hover:border-[#E0562B] text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-[#E0562B]" />
                        <span className="text-xs font-bold text-[#16241B]">Customer</span>
                      </div>
                      <span className="text-[10px] text-[#526056] block truncate mt-0.5">Sarah Jenkins</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDemoUser('usr_owner_1')}
                      className="p-2.5 rounded-xl border border-[#DCE3DD] bg-[#F6F7F5] hover:bg-white hover:border-[#E0562B] text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-[#2F7A4F]" />
                        <span className="text-xs font-bold text-[#16241B]">Restaurant</span>
                      </div>
                      <span className="text-[10px] text-[#526056] block truncate mt-0.5">Trattoria Bella</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDemoUser('usr_runner_1')}
                      className="p-2.5 rounded-xl border border-[#DCE3DD] bg-[#F6F7F5] hover:bg-white hover:border-[#E0562B] text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Bike className="w-3.5 h-3.5 text-[#2C6E8E]" />
                        <span className="text-xs font-bold text-[#16241B]">Public Runner</span>
                      </div>
                      <span className="text-[10px] text-[#526056] block truncate mt-0.5">Jayden Brooks</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1.5">
                  I want to register as:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegRole('CUSTOMER')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      regRole === 'CUSTOMER'
                        ? 'border-[#E0562B] bg-[#FBE4DA] text-[#E0562B] font-bold shadow-xs'
                        : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-stone-100'
                    }`}
                  >
                    <UserIcon className="w-5 h-5 mx-auto mb-1 text-[#E0562B]" />
                    <span className="text-xs font-bold block">Customer</span>
                    <span className="text-[10px] text-[#526056] block mt-0.5">Dine, Order & Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('RESTAURANT_OWNER')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      regRole === 'RESTAURANT_OWNER'
                        ? 'border-[#2F7A4F] bg-[#EBF5EF] text-[#2F7A4F] font-bold shadow-xs'
                        : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-stone-100'
                    }`}
                  >
                    <Store className="w-5 h-5 mx-auto mb-1 text-[#2F7A4F]" />
                    <span className="text-xs font-bold block">Merchant / Owner</span>
                    <span className="text-[10px] text-[#526056] block mt-0.5">Register Eatery / Cafe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('RUNNER')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      regRole === 'RUNNER'
                        ? 'border-[#2C6E8E] bg-[#DFEDF4] text-[#2C6E8E] font-bold shadow-xs'
                        : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-stone-100'
                    }`}
                  >
                    <Bike className="w-5 h-5 mx-auto mb-1 text-[#2C6E8E]" />
                    <span className="text-xs font-bold block">Delivery Courier</span>
                    <span className="text-[10px] text-[#526056] block mt-0.5">Dispatch & Delivery</span>
                  </button>
                </div>

                {/* Helper notice explaining Staff & Operations governance */}
                <div className="mt-2.5 p-2.5 bg-[#F6F7F5] rounded-xl border border-[#DCE3DD] text-[11px] text-[#526056] flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2F7A4F] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-[#16241B]">Staff & Food Scout Governance:</strong> Kitchen POS/KDS staff accounts are invited directly by verified Restaurant Owners. Operations Leads & Community Food Scouts are vetted and onboarded by the Regional Operations Hub to ensure directory accuracy.
                  </p>
                </div>
              </div>

              {/* Restaurant Owner Specific Inputs */}
              {regRole === 'RESTAURANT_OWNER' && (
                <div className="p-3.5 bg-[#EBF5EF] border border-[#2F7A4F]/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2F7A4F]">
                    <Store className="w-4 h-4" />
                    <span>Restaurant / Business Setup Details</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#16241B] mb-1">Restaurant / Brand Name *</label>
                    <input
                      type="text"
                      required
                      value={regRestaurantName}
                      onChange={(e) => setRegRestaurantName(e.target.value)}
                      placeholder="e.g. Chop Jing Chew Kiulap or Warung Selera Gadong"
                      className="w-full bg-white border border-[#2F7A4F]/40 rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#16241B] mb-1">Cuisines / Specialties</label>
                    <input
                      type="text"
                      value={regRestaurantCuisine}
                      onChange={(e) => setRegRestaurantCuisine(e.target.value)}
                      placeholder="e.g. Local Malay, Nasi Katok, Bakery, Halal"
                      className="w-full bg-white border border-[#2F7A4F]/40 rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F]/30"
                    />
                  </div>

                  <p className="text-[10px] text-[#2F7A4F] font-medium leading-relaxed">
                    ✨ After 6-digit email OTP verification, your dedicated operations portal will be automatically initialized with menu management, floor tables, and staff delegation.
                  </p>
                </div>
              )}

              {/* Runner Specific Options */}
              {regRole === 'RUNNER' && (
                <div className="p-3.5 bg-[#DFEDF4] border border-[#2C6E8E]/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C6E8E]">
                    <Bike className="w-4 h-4" />
                    <span>Delivery Courier Configuration</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 ${
                      regRunnerType === 'PLATFORM_PUBLIC' ? 'bg-white border-[#2C6E8E] font-bold text-[#2C6E8E]' : 'bg-white/60 border-transparent text-[#526056]'
                    }`}>
                      <input
                        type="radio"
                        name="runnerType"
                        checked={regRunnerType === 'PLATFORM_PUBLIC'}
                        onChange={() => setRegRunnerType('PLATFORM_PUBLIC')}
                        className="text-[#2C6E8E]"
                      />
                      <span>Platform Public Runner</span>
                    </label>

                    <label className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 ${
                      regRunnerType === 'IN_HOUSE_DEDICATED' ? 'bg-white border-[#2C6E8E] font-bold text-[#2C6E8E]' : 'bg-white/60 border-transparent text-[#526056]'
                    }`}>
                      <input
                        type="radio"
                        name="runnerType"
                        checked={regRunnerType === 'IN_HOUSE_DEDICATED'}
                        onChange={() => setRegRunnerType('IN_HOUSE_DEDICATED')}
                        className="text-[#2C6E8E]"
                      />
                      <span>In-House Merchant Runner</span>
                    </label>
                  </div>

                  {regRunnerType === 'IN_HOUSE_DEDICATED' && (
                    <div>
                      <label className="block text-xs font-bold text-[#16241B] mb-1">Store Fleet PIN / Invite Code *</label>
                      <input
                        type="text"
                        required
                        value={regFleetPin}
                        onChange={(e) => setRegFleetPin(e.target.value)}
                        placeholder="e.g. JINGCHEW-RUNNER or BELLA-RUNNER"
                        className="w-full bg-white border border-[#2C6E8E]/40 rounded-xl px-3.5 py-2 text-xs text-[#16241B] uppercase font-mono tracking-wider focus:ring-2 focus:ring-[#2C6E8E]/30"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#16241B] mb-1">Vehicle Type</label>
                      <select
                        value={regRunnerVehicleType}
                        onChange={(e) => setRegRunnerVehicleType(e.target.value)}
                        className="w-full bg-white border border-[#2C6E8E]/40 rounded-xl px-3 py-2 text-xs text-[#16241B]"
                      >
                        <option value="Motorcycle">Motorcycle / Scooter</option>
                        <option value="Car">Sedan / Hatchback Car</option>
                        <option value="Van">Van / MPV</option>
                        <option value="Bicycle">Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#16241B] mb-1">Vehicle Plate (Brunei)</label>
                      <input
                        type="text"
                        value={regRunnerPlateNumber}
                        onChange={(e) => setRegRunnerPlateNumber(e.target.value)}
                        placeholder="e.g. BA 4821"
                        className="w-full bg-white border border-[#2C6E8E]/40 rounded-xl px-3.5 py-2 text-xs text-[#16241B] uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="e.g. Nor"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="e.g. Azimah"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="azimah@example.com"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+673 812 3456"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Create Password * (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1">Primary Brunei District</label>
                <select
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                >
                  <option value="Brunei-Muara">Brunei-Muara (BSB, Gadong, Kiulap, Jerudong)</option>
                  <option value="Belait">Belait (Kuala Belait, Seria, Lumut)</option>
                  <option value="Tutong">Tutong (Pekan Tutong, Telisai)</option>
                  <option value="Temburong">Temburong (Bangar, Labu)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Email Verification Structure via {config.emailProvider || 'Resend'}:</span>
                </div>
                <p>
                  Upon clicking register, an automated transactional email with a 6-digit verification code (OTP) will be dispatched to confirm ownership of your email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2F7A4F] hover:bg-[#235d3c] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Verification Code...' : 'Register & Send Email Verification Code'}</span>
              </button>
            </form>
          )}

          {/* TAB: VERIFY OTP */}
          {activeTab === 'VERIFY_OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-2 py-2">
                <div className="w-12 h-12 rounded-2xl bg-[#E1F0E6] text-[#2F7A4F] flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#16241B]">Enter 6-Digit Email Verification Code</h3>
                <p className="text-xs text-[#526056] max-w-sm mx-auto">
                  We have dispatched a verification code to <span className="font-bold text-[#16241B]">{otpTargetEmail}</span> using the <span className="font-bold text-[#E0562B]">{config.emailProvider || 'Resend'}</span> adapter.
                </p>
              </div>

              {/* Dev Helper Banner to make testing effortless - only in dev/staging mode */}
              {SHOW_DEV_OTP_HELPER && dispatchedOtp && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Email Inbox Simulation (Dev/Staging):</span>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Your verification OTP is: <span className="font-mono font-black text-sm text-blue-900 tracking-wider bg-white px-2 py-0.5 rounded border border-blue-300">{dispatchedOtp}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(dispatchedOtp)}
                    className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1.5 text-center">
                  Verification Code (OTP)
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 583921"
                    className="w-48 text-center tracking-[0.4em] font-mono text-xl font-bold bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl py-2.5 text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || enteredOtp.length < 6}
                className="w-full bg-[#2F7A4F] hover:bg-[#235d3c] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying...' : 'Verify Code & Activate Account'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTER')}
                  className="text-[#526056] hover:text-[#16241B] underline cursor-pointer"
                >
                  Change email address
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-[#E0562B] font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: ADMIN 2FA OTP CHALLENGE */}
          {activeTab === 'ADMIN_2FA' && (
            <form onSubmit={handleVerifyAdmin2fa} className="space-y-4">
              <div className="text-center space-y-2 py-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
                  <Shield className="w-6 h-6 text-purple-700" />
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  <Lock className="w-3 h-3 text-purple-700" /> Super Admin 2FA Shield
                </div>
                <h3 className="text-base font-bold text-[#16241B]">Two-Factor Authentication Required</h3>
                <p className="text-xs text-[#526056] max-w-sm mx-auto">
                  A 6-digit administrative 2FA security code has been dispatched to <span className="font-bold text-[#16241B]">{admin2faEmail || email}</span> to authorize root command privileges.
                </p>
              </div>

              {/* Dev Helper Banner - only in dev/staging */}
              {SHOW_DEV_OTP_HELPER && (dispatchedAdmin2faCode || admin2faPending?.code) && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Admin 2FA Simulation (Dev/Staging):</span>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Your 2FA Code is: <span className="font-mono font-black text-sm text-purple-900 tracking-wider bg-white px-2 py-0.5 rounded border border-purple-300">{dispatchedAdmin2faCode || admin2faPending?.code}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredAdmin2faCode(dispatchedAdmin2faCode || admin2faPending?.code || '')}
                    className="px-2.5 py-1 bg-purple-700 text-white font-bold text-[11px] rounded-lg hover:bg-purple-800 cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1.5 text-center">
                  6-Digit Admin 2FA Security Code
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredAdmin2faCode}
                    onChange={(e) => setEnteredAdmin2faCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 918234"
                    className="w-48 text-center tracking-[0.4em] font-mono text-xl font-bold bg-[#F6F7F5] border border-purple-300 rounded-xl py-2.5 text-[#16241B] focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || enteredAdmin2faCode.length < 6}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Verify 2FA & Access Command Center'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => {
                    cancelAdmin2FA();
                    setActiveTab('SIGN_IN');
                  }}
                  className="text-[#526056] hover:text-[#16241B] underline cursor-pointer"
                >
                  Cancel & Return to Sign In
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsAdmin2faResending(true);
                    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setDispatchedAdmin2faCode(newCode);
                    if (admin2faPending) {
                      admin2faPending.code = newCode;
                    }
                    setTimeout(() => {
                      setIsAdmin2faResending(false);
                      setSuccessMessage(`A new 2FA code (${newCode}) was sent to ${admin2faEmail || email}.`);
                    }, 600);
                  }}
                  disabled={isAdmin2faResending}
                  className="text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAdmin2faResending ? 'animate-spin' : ''}`} />
                  <span>{isAdmin2faResending ? 'Sending...' : 'Resend 2FA Code'}</span>
                </button>
              </div>
            </form>
          )}



          {/* TAB 3: 1-CLICK TEST PERSONAS (Only rendered if SHOW_DEMO_ACCOUNTS) */}
          {SHOW_DEMO_ACCOUNTS && activeTab === 'DEMO_ROLES' && (
            <div className="space-y-3">
              <p className="text-xs text-[#526056] leading-relaxed">
                Click any role below to immediately test the system with full role-based permissions, portals, and data access:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {allUsers.map((u) => {
                  const isCurrent = currentUser.id === u.id;
                  let icon = <UserIcon className="w-4 h-4 text-[#526056]" />;
                  let roleBadge = 'bg-[#F6F7F5] text-[#526056]';
                  
                  if (u.role === 'SUPER_ADMIN') {
                    icon = <Shield className="w-4 h-4 text-purple-600" />;
                    roleBadge = 'bg-purple-100 text-purple-800';
                  } else if (u.role === 'SPECIAL_USER') {
                    icon = <Sparkles className="w-4 h-4 text-amber-600" />;
                    roleBadge = 'bg-amber-100 text-amber-800';
                  } else if (u.role === 'COMMUNITY_SCOUT') {
                    icon = <Camera className="w-4 h-4 text-indigo-600" />;
                    roleBadge = 'bg-indigo-100 text-indigo-800';
                  } else if (u.role === 'RESTAURANT_OWNER') {
                    icon = <Store className="w-4 h-4 text-[#2F7A4F]" />;
                    roleBadge = 'bg-emerald-100 text-[#2F7A4F]';
                  } else if (u.role === 'EMPLOYEE') {
                    icon = <ChefHat className="w-4 h-4 text-orange-600" />;
                    roleBadge = 'bg-orange-100 text-orange-800';
                  } else if (u.role === 'RUNNER') {
                    icon = <Bike className="w-4 h-4 text-[#2C6E8E]" />;
                    roleBadge = 'bg-sky-100 text-[#2C6E8E]';
                  } else {
                    icon = <UserIcon className="w-4 h-4 text-[#E0562B]" />;
                    roleBadge = 'bg-[#FBE4DA] text-[#E0562B]';
                  }

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectDemoUser(u.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#E0562B] bg-[#FBE4DA]/40 ring-1 ring-[#E0562B]'
                          : 'border-[#DCE3DD] bg-white hover:bg-[#F6F7F5] hover:border-[#526056]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={u.firstName}
                          className="w-9 h-9 rounded-full object-cover border border-[#DCE3DD] flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#16241B] truncate">{u.firstName} {u.lastName}</span>
                            {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#E0562B] flex-shrink-0" />}
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${roleBadge}`}>
                            {u.role.replace('_', ' ')}
                            {u.runnerType ? ` • ${u.runnerType === 'IN_HOUSE_DEDICATED' ? 'In-House' : 'Public'}` : ''}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#526056] group-hover:text-[#16241B]" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guest browsing notice */}
          <div className="mt-5 pt-4 border-t border-[#DCE3DD] text-center">
            <button
              onClick={() => {
                logout();
                closeAuthModal();
              }}
              className="text-xs font-semibold text-[#526056] hover:text-[#16241B] underline cursor-pointer"
            >
              Continue as Visitor to browse Yellow Pages & menus
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
