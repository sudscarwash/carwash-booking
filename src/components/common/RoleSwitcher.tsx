import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ENABLE_DEV_TOOLS } from '../../config/environment';
import { ShieldCheck, UserCheck, Store, ChefHat, Bike, User, X, Sparkles, ChevronUp, ChevronDown, Camera, Lock } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUserRole, allUsers, switchUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // If in production without dev tools enabled, completely hide the simulator widget
  if (!ENABLE_DEV_TOOLS) {
    return null;
  }

  const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    { role: 'CUSTOMER', label: 'Customer', icon: <User className="w-3.5 h-3.5" />, desc: 'Browse & Order Food', color: 'bg-emerald-600' },
    { role: 'COMMUNITY_SCOUT', label: 'Community Scout', icon: <Camera className="w-3.5 h-3.5" />, desc: 'Photo Menus & Yellow Pages', color: 'bg-indigo-600' },
    { role: 'RESTAURANT_OWNER', label: 'Restaurant Owner', icon: <Store className="w-3.5 h-3.5" />, desc: 'Menu, POS & KYC', color: 'bg-[#E0562B]' },
    { role: 'EMPLOYEE', label: 'Restaurant Staff', icon: <ChefHat className="w-3.5 h-3.5" />, desc: 'KDS & Floor POS', color: 'bg-teal-600' },
    { role: 'RUNNER', label: 'Delivery Runner', icon: <Bike className="w-3.5 h-3.5" />, desc: 'Claim & Deliver', color: 'bg-sky-600' },
    { role: 'SPECIAL_USER', label: 'Operations Hub', icon: <UserCheck className="w-3.5 h-3.5" />, desc: 'KYC, Rates & Yellow Pages', color: 'bg-amber-600' },
    { role: 'SUPER_ADMIN', label: 'Super Admin', icon: <ShieldCheck className="w-3.5 h-3.5" />, desc: 'Platform Governance', color: 'bg-red-600' },
  ];

  const currentRoleConfig = roles.find(r => r.role === currentUser.role) || roles[0];
  const employeeUsers = allUsers.filter(u => u.role === 'EMPLOYEE');
  const runnerUsers = allUsers.filter(u => u.role === 'RUNNER');

  return (
    <aside 
      id="role-simulator-widget"
      aria-label="Development Role Simulator"
      className="fixed bottom-20 md:bottom-5 left-4 z-50 transition-all duration-200"
    >
      {/* Collapsed Pill Button */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 bg-[#16241B]/95 hover:bg-[#16241B] text-white px-3 py-2 rounded-full shadow-lg border border-white/20 backdrop-blur-md text-xs font-bold transition-transform hover:scale-105 cursor-pointer"
          title="Switch active user role for preview testing"
        >
          <span className="w-2 h-2 rounded-full bg-[#E0562B] animate-pulse"></span>
          <span className="text-[11px] text-stone-300">Role:</span>
          <span className="flex items-center gap-1 text-white">
            {currentRoleConfig.icon}
            <span>{currentRoleConfig.label}</span>
          </span>
          <ChevronUp className="w-3.5 h-3.5 text-stone-400 ml-0.5" />
        </button>
      ) : (
        /* Expanded Floating Card */
        <div className="bg-[#16241B] text-white rounded-2xl shadow-2xl border border-white/15 p-3.5 w-72 sm:w-80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E0562B]" />
              <span className="font-extrabold text-xs tracking-tight">Role Switcher (Preview)</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {roles.map(({ role, label, icon, desc }) => {
              const isActive = currentUser.role === role;
              return (
                <button
                  key={role}
                  id={`role-btn-${role.toLowerCase()}`}
                  onClick={() => {
                    setCurrentUserRole(role);
                    setIsExpanded(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E0562B] text-white font-bold shadow-xs'
                      : 'hover:bg-white/10 text-stone-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-stone-300'
                    }`}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{label}</p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-stone-400'}`}>
                        {desc}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white shrink-0"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Employee Restaurant Isolation Test Helper */}
          {currentUser.role === 'EMPLOYEE' && employeeUsers.length > 1 && (
            <div className="mt-2.5 p-2 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-300">
                <span className="font-bold flex items-center gap-1 text-teal-400">
                  <Lock className="w-3 h-3" /> Restaurant Isolation Test:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {employeeUsers.map(emp => {
                  const isCurrent = currentUser.id === emp.id;
                  const branch = emp.restaurantId === 'rest_1' ? 'Rest 1: Trattoria' : 'Rest 2: Komorebi';
                  return (
                    <button
                      key={emp.id}
                      onClick={() => switchUser(emp.id)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-left transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-teal-600 text-white shadow-xs' 
                          : 'bg-white/10 hover:bg-white/20 text-stone-300'
                      }`}
                    >
                      <p className="truncate">{emp.firstName}</p>
                      <p className="text-[9px] opacity-75 font-mono truncate">{branch}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Courier Verification & District Test Helper */}
          {currentUser.role === 'RUNNER' && runnerUsers.length > 1 && (
            <div className="mt-2.5 p-2 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-300">
                <span className="font-bold flex items-center gap-1 text-sky-400">
                  <Bike className="w-3 h-3" /> Courier Persona Test:
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {runnerUsers.map(runner => {
                  const isCurrent = currentUser.id === runner.id;
                  const isVerified = runner.isVerified === true;
                  return (
                    <button
                      key={runner.id}
                      onClick={() => switchUser(runner.id)}
                      className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-bold text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                        isCurrent 
                          ? 'bg-sky-600 text-white shadow-xs' 
                          : 'bg-white/10 hover:bg-white/20 text-stone-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{runner.firstName} {runner.lastName}</p>
                        <p className="text-[9px] opacity-75 font-mono truncate">{runner.runnerBaseDistrict || 'Brunei-Muara'}</p>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                        isVerified ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-400">
            <span>Logged in as: <strong>{currentUser.firstName}</strong></span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">DEV SIMULATOR</span>
          </div>
        </div>
      )}
    </aside>
  );
};
