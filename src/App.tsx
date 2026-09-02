/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Navbar } from './components/Navbar.js';
import { CustomerDashboard } from './pages/CustomerDashboard.js';
import { OwnerDashboard } from './pages/OwnerDashboard.js';
import { EmployeeDashboard } from './pages/EmployeeDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { SpecialUserDashboard } from './pages/SpecialUserDashboard.js';
import { Role } from './types.js';
import { isValidEmail } from './lib/validation.js';
import { Lock, Mail, UserPlus, LogIn, Sparkles, Compass, Sliders, Briefcase, Shield, Check, Info, X, AlertTriangle, LogOut, Eye, EyeOff, Building, Phone, MapPin } from 'lucide-react';
import autoshineLogo from './assets/images/autoshine_logo.jpg';

const MainAppContent: React.FC = () => {
  const { user, loading, login, register, verifyRegistrationOtp, resendRegistrationOtp, notification, clearNotification, forgotPassword, resetPassword, showNotification, platformInfo } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegisterMode, setIsRegisterMode] = useState(() => window.location.pathname === '/register');
  const [isForgotMode, setIsForgotMode] = useState(() => window.location.pathname === '/forgot-password');
  const [isResetMode, setIsResetMode] = useState(() => window.location.pathname === '/reset-password');
  const [isRegisterOtpMode, setIsRegisterOtpMode] = useState(false);
  const [pendingRegisterEmail, setPendingRegisterEmail] = useState('');
  const [registerOtpCode, setRegisterOtpCode] = useState('');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Track if we are navigating back from an auth sub-view
  const currentAuthModeRef = React.useRef<'login' | 'register' | 'forgot' | 'reset'>('login');
  const isExitingRef = React.useRef(false);

  // Sync ref with current auth state
  React.useEffect(() => {
    if (isRegisterMode) currentAuthModeRef.current = 'register';
    else if (isForgotMode) currentAuthModeRef.current = 'forgot';
    else if (isResetMode) currentAuthModeRef.current = 'reset';
    else currentAuthModeRef.current = 'login';
  }, [isRegisterMode, isForgotMode, isResetMode]);

  // Navigation helper
  const navigate = (path: string, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({ path }, '', path);
      } else {
        window.history.pushState({ path }, '', path);
      }
    }
  };

  // Sync route on login / role change / auth mode change
  React.useEffect(() => {
    if (user) {
      let targetPath = '/customer';
      if (user.role === Role.ADMIN) targetPath = '/admin';
      else if (user.role === Role.OWNER) targetPath = '/owner';
      else if (user.role === Role.EMPLOYEE) targetPath = '/employee';
      else if (user.role === Role.SPECIAL) targetPath = '/special';

      if (window.location.pathname !== targetPath) {
        window.history.replaceState({ path: targetPath }, '', targetPath);
      }
    } else {
      const path = window.location.pathname;
      if (path === '/register') {
        setIsRegisterMode(true);
        setIsForgotMode(false);
        setIsResetMode(false);
      } else if (path === '/forgot-password') {
        setIsForgotMode(true);
        setIsRegisterMode(false);
        setIsResetMode(false);
      } else if (path === '/reset-password') {
        setIsResetMode(true);
        setIsForgotMode(false);
        setIsRegisterMode(false);
      } else if (path === '/' || path === '/login') {
        setIsRegisterMode(false);
        setIsForgotMode(false);
        setIsResetMode(false);
        if (path === '/') {
          window.history.replaceState({ path: '/login' }, '', '/login');
        }
      }
    }
  }, [user]);

  // Mobile Back button / browser popstate listener
  React.useEffect(() => {
    const handlePopState = () => {
      if (isExitingRef.current) return;

      const path = window.location.pathname;
      const prevMode = currentAuthModeRef.current;

      if (!user) {
        // If navigating back from a sub-screen (register, forgot, reset) to login, smoothly switch to login without trapping
        if (prevMode !== 'login' && (path === '/' || path === '/login')) {
          setIsRegisterMode(false);
          setIsForgotMode(false);
          setIsResetMode(false);
          setIsRegisterOtpMode(false);
          setShowExitConfirmModal(false);
          return;
        }

        if (path === '/register') {
          setIsRegisterMode(true);
          setIsForgotMode(false);
          setIsResetMode(false);
        } else if (path === '/forgot-password') {
          setIsForgotMode(true);
          setIsRegisterMode(false);
          setIsResetMode(false);
        } else if (path === '/reset-password') {
          setIsResetMode(true);
          setIsForgotMode(false);
          setIsRegisterMode(false);
        } else {
          setIsRegisterMode(false);
          setIsForgotMode(false);
          setIsResetMode(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [address, setAddress] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Password reset form state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegisterMode && !name)) return;

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      showNotification("Please enter a valid email address (e.g. name@domain.com).", "error");
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        showNotification("Password must be at least 6 characters.", "error");
        return;
      }
      if (password !== registerConfirmPassword) {
        showNotification("Passwords do not match. Please confirm your password.", "error");
        return;
      }
      if (!phone.trim()) {
        showNotification("Please enter a valid phone number.", "error");
        return;
      }
      if (!acceptTerms) {
        showNotification("You must accept the Terms and Conditions to register.", "error");
        return;
      }
    }

    setAuthLoading(true);
    if (isRegisterMode) {
      const res = await register(trimmedEmail, password, name, {
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        profileImageUrl: profileImageUrl || undefined,
        address: address || undefined,
      });
      if (res.success) {
        if (res.requireOtp) {
          setIsRegisterOtpMode(true);
          setPendingRegisterEmail(res.email || trimmedEmail);
        } else {
          setIsRegisterMode(false);
          setEmail('');
          setPassword('');
          setRegisterConfirmPassword('');
          setName('');
        }
      }
    } else {
      const res = await login(email, password);
      if (typeof res === 'object' && res.requireOtp) {
        setIsRegisterOtpMode(true);
        setPendingRegisterEmail(res.email);
      }
    }
    setAuthLoading(false);
  };

  const handleVerifyRegistrationOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRegisterEmail || !registerOtpCode) return;

    setAuthLoading(true);
    const success = await verifyRegistrationOtp(pendingRegisterEmail, registerOtpCode);
    if (success) {
      setIsRegisterOtpMode(false);
      setIsRegisterMode(false);
      setEmail('');
      setPassword('');
      setName('');
      setRegisterOtpCode('');
      setPendingRegisterEmail('');
    }
    setAuthLoading(false);
  };

  const handleResendRegistrationOtpSubmit = async () => {
    if (!pendingRegisterEmail) return;
    setAuthLoading(true);
    await resendRegistrationOtp(pendingRegisterEmail);
    setAuthLoading(false);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setAuthLoading(true);
    const code = await forgotPassword(email);
    if (code !== null) {
      setIsForgotMode(false);
      setIsResetMode(true);
    }
    setAuthLoading(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      showNotification("New passwords do not match!", "error");
      return;
    }

    setAuthLoading(true);
    const success = await resetPassword(resetCode, newPassword);
    if (success) {
      setIsResetMode(false);
      setIsForgotMode(false);
      setIsRegisterMode(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setAuthLoading(false);
  };

  // Automated Test Role Login Quick Switchers
  const handleQuickLogin = async (role: string) => {
    setAuthLoading(true);
    let quickEmail = '';
    let quickPass = '';

    switch (role) {
      case 'admin':
        quickEmail = 'admin@carwash.com';
        quickPass = 'admin123';
        break;
      case 'owner':
        quickEmail = 'owner@carwash.com';
        quickPass = 'owner123';
        break;
      case 'employee':
        quickEmail = 'employee@carwash.com';
        quickPass = 'employee123';
        break;
      case 'special':
        quickEmail = 'special@carwash.com';
        quickPass = 'special123';
        break;
      default:
        quickEmail = 'customer@carwash.com';
        quickPass = 'customer123';
        break;
    }

    setEmail(quickEmail);
    setPassword(quickPass);
    await login(quickEmail, quickPass);
    setAuthLoading(false);
  };

  const renderDashboardByRole = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return <AdminDashboard />;
      case Role.OWNER:
        return <OwnerDashboard />;
      case Role.EMPLOYEE:
        return <EmployeeDashboard />;
      case Role.SPECIAL:
        return <SpecialUserDashboard />;
      default:
        return <CustomerDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-600"></div>
        </div>
        <p className="text-slate-500 text-xs font-semibold mt-4 tracking-wider uppercase font-mono">
          Starting Booking Platform...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-900 font-sans">
      {/* Toast notifications */}
      {notification && (
        <div
          onClick={clearNotification}
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl max-w-sm border transition-all duration-300 cursor-pointer flex items-center gap-3 animate-slide-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
          id="global-toast"
        >
          <div className={`p-1.5 rounded-full shrink-0 ${
            notification.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            <Check className="h-4 w-4" />
          </div>
          <div className="text-xs sm:text-sm font-semibold pr-2">{notification.message}</div>
        </div>
      )}

      {user ? (
        <>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderDashboardByRole(user.role)}
          </main>
        </>
      ) : (
        /* Dynamic Landing Auth Screen */
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-slate-100">
          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
            <div className="mx-auto w-24 h-24 overflow-hidden rounded-3xl bg-[#0058E6] shadow-xl flex items-center justify-center">
              <img src={autoshineLogo} alt="Autoshine BN" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-800 tracking-tight">
              autoshine bn
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Premium booking platform for car wash services and location scheduling in Brunei Darussalam.
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
            <div className="bg-white py-8 px-4 border border-slate-200 rounded-3xl shadow-xl sm:px-10">
              {isRegisterOtpMode ? (
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-sky-100 rounded-xl text-sky-700">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Verify Your Email Address</h3>
                      <p className="text-xs text-slate-500">OTP code sent to <strong className="text-slate-700">{pendingRegisterEmail}</strong></p>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyRegistrationOtpSubmit} className="space-y-4 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">6-Digit Verification OTP Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={registerOtpCode}
                        onChange={(e) => setRegisterOtpCode(e.target.value)}
                        className="w-full px-3 py-3 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-base transition-all text-center tracking-widest font-mono font-bold"
                        required
                        id="verify-otp-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                      id="verify-otp-submit-btn"
                    >
                      {authLoading ? 'Verifying...' : 'Verify Email & Activate Account'}
                    </button>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleResendRegistrationOtpSubmit}
                        disabled={authLoading}
                        className="text-xs text-slate-600 hover:text-slate-900 font-bold font-sans cursor-pointer flex items-center gap-1"
                      >
                        Resend Verification Code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterOtpMode(false);
                          setIsRegisterMode(true);
                        }}
                        className="text-xs text-sky-600 hover:text-sky-500 font-bold font-sans cursor-pointer"
                      >
                        Change Details
                      </button>
                    </div>
                  </form>
                </div>
              ) : isForgotMode ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Forgot Password</h3>
                  <p className="text-xs text-slate-500 mb-6">Enter your email and we will send you a 6-digit verification code to reset your password.</p>
                  
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="forgot-email-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
                      id="forgot-submit-btn"
                    >
                      {authLoading ? 'Sending...' : 'Request Verification Code'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setIsResetMode(false);
                        navigate('/login');
                      }}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-700 font-bold font-sans cursor-pointer pt-2 block"
                    >
                      Back to Login
                    </button>
                  </form>
                </div>
              ) : isResetMode ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Reset Password</h3>
                  <p className="text-xs text-slate-500 mb-6">Enter the 6-digit code received and define your new secure password.</p>

                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">6-Digit Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all text-center tracking-widest font-mono font-bold"
                        required
                        id="reset-code-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="new-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                          id="toggle-reset-password-btn"
                          aria-label={showResetPassword ? "Hide password" : "Show password"}
                        >
                          {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="confirm-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                          id="toggle-confirm-reset-password-btn"
                          aria-label={showResetPassword ? "Hide password" : "Show password"}
                        >
                          {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
                      id="reset-submit-btn"
                    >
                      {authLoading ? 'Updating...' : 'Set New Password'}
                    </button>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(false);
                          setIsForgotMode(true);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 font-bold font-sans cursor-pointer"
                      >
                        Request new code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setIsResetMode(false);
                          navigate('/login');
                        }}
                        className="text-xs text-sky-600 hover:text-sky-500 font-bold font-sans cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="pb-4 mb-6 border-b border-slate-100 flex gap-4 text-sm font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        navigate('/login');
                      }}
                      className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                        !isRegisterMode ? 'border-sky-600 text-sky-600 font-extrabold' : 'border-transparent text-slate-400'
                      }`}
                      id="tab-login"
                    >
                      Log In Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        navigate('/register');
                      }}
                      className={`pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                        isRegisterMode ? 'border-sky-600 text-sky-600 font-extrabold' : 'border-transparent text-slate-400'
                      }`}
                      id="tab-signup"
                    >
                      Register Customer
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {isRegisterMode && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Alex Tan"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="auth-name-input"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="auth-email-input"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Password {isRegisterMode && <span className="text-red-500">*</span>}
                        </label>
                        {!isRegisterMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotMode(true);
                              setIsResetMode(false);
                              navigate('/forgot-password');
                            }}
                            className="text-xs text-sky-600 hover:text-sky-500 font-bold font-sans cursor-pointer focus:outline-none"
                            id="forgot-password-trigger"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                          required
                          id="auth-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                          id="toggle-auth-password-btn"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isRegisterMode && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type={showRegisterConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerConfirmPassword}
                            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                            required
                            id="auth-confirm-password-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                            id="toggle-auth-confirm-password-btn"
                            aria-label={showRegisterConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {isRegisterMode && (
                      <div className="space-y-4 pt-3 border-t border-slate-100 mt-3 animate-fade-in">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="+673 812-3456"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                            required
                            id="auth-phone-input"
                          />
                        </div>

                        {/* Terms and Conditions Agreement Checkbox */}
                        <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 mt-2">
                          <input
                            type="checkbox"
                            id="accept-terms-checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="h-4 w-4 mt-0.5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                            required
                          />
                          <label htmlFor="accept-terms-checkbox" className="text-xs text-slate-500 select-none">
                            I accept and agree to the{' '}
                            <button
                              type="button"
                              onClick={() => setShowTermsModal(true)}
                              className="text-sky-600 font-bold hover:underline focus:outline-none inline-block align-baseline"
                            >
                              Terms and Conditions of Use
                            </button>{' '}
                            for Autoshine BN.
                          </label>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
                      id="auth-submit-btn"
                    >
                      {authLoading ? (
                        'Processing...'
                      ) : isRegisterMode ? (
                        <>
                          <UserPlus className="h-4 w-4" /> Create Profile
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" /> Log In
                        </>
                      )}
                    </button>

                    {isRegisterMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(false);
                          setIsForgotMode(false);
                          setIsResetMode(false);
                          navigate('/login');
                        }}
                        className="w-full text-center text-xs text-slate-500 hover:text-slate-700 font-bold font-sans cursor-pointer pt-2 block"
                        id="back-to-login-btn"
                      >
                        Already have an account? <span className="text-sky-600 hover:underline">Log In</span>
                      </button>
                    )}
                  </form>
                </>
              )}

              {/* Multi-role Simulator Playground Switcher (Enabled in local dev OR when VITE_ENABLE_DEV_ROLE_SWITCHER=true on staging environments like Render) */}
              {(!import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_ROLE_SWITCHER === 'true') && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                    🛠️ Interactive Role Play Testing Credentials (Dev Mode Only)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('customer')}
                      className="p-2 border border-sky-150 hover:bg-sky-50 text-sky-700 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                      id="quick-login-customer"
                    >
                      <Compass className="h-4 w-4" />
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('owner')}
                      className="p-2 border border-indigo-150 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                      id="quick-login-owner"
                    >
                      <Sliders className="h-4 w-4" />
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('employee')}
                      className="p-2 border border-amber-150 hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                      id="quick-login-employee"
                    >
                      <Briefcase className="h-4 w-4" />
                      Employee
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('special')}
                      className="p-2 border border-emerald-150 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                      id="quick-login-special"
                    >
                      <Sparkles className="h-4 w-4" />
                      Special User
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('admin')}
                      className="p-2 border border-red-150 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer col-span-2 sm:col-span-1"
                      id="quick-login-admin"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] text-slate-400 text-center mt-3 flex items-start gap-1.5 justify-center">
                    <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>Click any button above to instantly log in as that role and explore distinct dashboards!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Carwash Owner Partnership Enquiry Card */}
            <div className="mt-4 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-lg text-center" id="owner-enquiry-card">
              <div className="flex items-center justify-center gap-2 mb-1.5 text-slate-800 font-extrabold text-xs sm:text-sm">
                <div className="p-1 bg-sky-100 text-sky-700 rounded-lg">
                  <Building className="w-4 h-4" />
                </div>
                <span>Carwash Owner &amp; Business Enquiry</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mb-3 leading-relaxed">
                Interested in listing your carwash business on {platformInfo?.companyName || 'Autoshine BN'}? Please contact our onboarding team:
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-1">
                {platformInfo?.email && (
                  <a
                    href={`mailto:${platformInfo.email}?subject=Carwash%20Owner%20Partnership%20Enquiry`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200/80 transition-colors shadow-2xs cursor-pointer"
                    id="enquiry-email-link"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{platformInfo.email}</span>
                  </a>
                )}

                {(platformInfo?.whatsapp || platformInfo?.contact) && (
                  <a
                    href={`https://wa.me/${(platformInfo.whatsapp || platformInfo.contact).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      'Hello Autoshine BN, I would like to enquire about registering my carwash business on your platform.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200/80 transition-colors shadow-2xs cursor-pointer"
                    id="enquiry-whatsapp-link"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>WhatsApp: {platformInfo.whatsapp || platformInfo.contact}</span>
                  </a>
                )}
              </div>

              {platformInfo?.address && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate">{platformInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-150 animate-fade-in text-left">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-[#0058E6] flex items-center justify-center shadow-xs">
                  <img src={autoshineLogo} alt="Autoshine BN" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Terms &amp; Conditions</h3>
                  <p className="text-[10px] text-sky-600 font-mono font-bold tracking-wider uppercase -mt-0.5">Autoshine BN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 hover:bg-slate-150 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600 animate-none flex items-center justify-center border-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 text-xs sm:text-sm text-slate-600 space-y-4">
              <p className="font-semibold text-slate-700">
                These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the AUTOSHINE BN mobile application and website (&quot;Platform&quot;). By registering for an account or using the Platform, you agree to be bound by these Terms.
              </p>
              
              <hr className="border-slate-100" />

              <div className="space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">1</span>
                    Definitions
                  </h4>
                  <p className="pl-7"><strong className="text-slate-800">AUTOSHINE BN</strong> means the owner and operator of the booking platform. <strong className="text-slate-800">User</strong> means any person who registers or uses the Platform.</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">2</span>
                    Acceptance of Terms
                  </h4>
                  <p className="pl-7">By using AUTOSHINE BN, you confirm that you are at least 18 years old or have permission from a parent or guardian, and agree to comply with all applicable laws of Brunei Darussalam.</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">3</span>
                    Platform Services
                  </h4>
                  <p className="pl-7">AUTOSHINE BN acts solely as a booking platform connecting Users with independent car wash Operators in Brunei. We are not the provider of the car wash services themselves.</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">4</span>
                    User Responsibilities
                  </h4>
                  <p className="pl-7">You are responsible for keeping account credentials safe, providing accurate vehicle/location data, arriving on-time, and removing all valuables from the vehicle prior to service. AUTOSHINE BN is not liable for items left inside vehicles.</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">5</span>
                    Payments and Cancellations
                  </h4>
                  <p className="pl-7">Payments are governed by authorized banks or offline channels. Cancellations must be made at least 2 hours prior to the scheduled time. Frequent no-shows may lead to platform suspension.</p>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-1 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">6</span>
                    Governing Law
                  </h4>
                  <p className="pl-7">These terms and conditions are governed exclusively by the laws of Brunei Darussalam, and all disputes shall be resolved in Brunei courts.</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  setShowTermsModal(false);
                }}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                I Agree &amp; Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚪 Exit / Leave Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="relative bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Are you sure you want to leave?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                You are about to exit AutoShine. Any unsaved changes or active progress will be lost.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Stay on App
              </button>
              <button
                type="button"
                onClick={() => {
                  isExitingRef.current = true;
                  setShowExitConfirmModal(false);
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.close();
                  }
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
