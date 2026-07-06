/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext.js';
import { LogOut, Shield, User as UserIcon, Calendar, Compass, Sliders, Briefcase, Sparkles } from 'lucide-react';
import { Role } from '../types.js';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useApp();

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

  return (
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

          {/* User information & controls */}
          {user && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
              </div>

              <div className="flex items-center gap-3">
                {getRoleBadge(user.role)}

                <button
                  onClick={logout}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all border border-slate-200 shadow-xs flex items-center justify-center cursor-pointer"
                  title="Logout"
                  id="navbar-logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
