/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { LogOut, Shield, User as UserIcon, Calendar, Compass, Sliders, Briefcase, Sparkles, Key, Lock, X, ChevronDown } from 'lucide-react';
import { Role } from '../types.js';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, changePassword } = useApp();

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Change Password state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-200">
            <Shield className="h-3 w-3" /> System Admin
          </span>
        );
      case Role.OWNER:
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
            <Sliders className="h-3 w-3" /> Owner Dashboard
          </span>
        );
      case Role.EMPLOYEE:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
            <Briefcase className="h-3 w-3" /> Operator Staff
          </span>
        );
      case Role.SPECIAL:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
            <Sparkles className="h-3 w-3" /> Partner Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-sky-200">
            <Compass className="h-3 w-3" /> Customer Portal
          </span>
        );
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (success) {
      // Clear forms and close
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangePasswordOpen(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand branding */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-sky-400 text-white p-2 rounded-xl shadow-md shadow-sky-100 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 tracking-tight block">
                SudsFlow
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block -mt-1 uppercase">
                Car Wash Scheduling
              </span>
            </div>
          </div>

          {/* User information & controls (Unified Profile Dropdown) */}
          {user && (
            <div className="relative z-50">
              {/* Trigger button */}
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 hover:border-slate-300 rounded-2xl transition-all duration-200 cursor-pointer select-none"
                id="user-profile-dropdown-trigger"
              >
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-xl object-cover border border-slate-200/80 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs font-bold text-slate-700 leading-tight">{user.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase leading-none mt-0.5 font-bold">{user.role}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Invisible Overlay for clicking outside */}
              {isProfileOpen && (
                <div
                  className="fixed inset-0 z-30 cursor-default bg-transparent"
                  onClick={() => setIsProfileOpen(false)}
                />
              )}

              {/* Floating Dropdown Menu */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-40 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
                  id="user-profile-dropdown-menu"
                >
                  {/* User Profile Header Info */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">Signed in as</span>
                    <span className="text-xs font-extrabold text-slate-800 truncate">{user.name}</span>
                    <span className="text-[11px] text-slate-400 font-medium truncate leading-tight">{user.email}</span>
                    <div className="mt-2 flex">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl transition-colors text-xs font-bold text-left cursor-pointer"
                      id="dropdown-change-password-btn"
                    >
                      <Key className="h-4 w-4 text-slate-400" />
                      <span>Change Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl transition-colors text-xs font-bold text-left cursor-pointer border-t border-slate-100 mt-1"
                      id="dropdown-logout-btn"
                    >
                      <LogOut className="h-4 w-4 text-slate-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Change Password Modal */}
    {isChangePasswordOpen && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="change-password-modal-backdrop">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200" id="change-password-modal-card">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Change Your Password</h3>
                <p className="text-[10px] text-slate-400 font-mono uppercase">All roles access</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsChangePasswordOpen(false);
                setErrorMsg('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              id="close-change-password-modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2" id="change-password-error">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="current-password-input">
                Current Password
              </label>
              <input
                type="password"
                id="current-password-input"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="new-password-input-change">
                New Password
              </label>
              <input
                type="password"
                id="new-password-input-change"
                required
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="confirm-password-input-change">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password-input-change"
                required
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setErrorMsg('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition-all cursor-pointer text-center"
                id="cancel-change-password-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                id="submit-change-password-btn"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
);
};
