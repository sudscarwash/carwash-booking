/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Users } from 'lucide-react';

interface SpecialUser403ForbiddenProps {
  attemptedPath?: string;
  onReturn?: () => void;
}

export const SpecialUser403Forbidden: React.FC<SpecialUser403ForbiddenProps> = ({
  attemptedPath = window.location.pathname,
  onReturn,
}) => {
  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    } else {
      window.history.pushState({ path: '/special' }, '', '/special');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white border border-rose-200/90 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner mb-3">
            <ShieldAlert className="w-9 h-9 text-white animate-pulse" />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider mb-2 border border-white/30">
            HTTP 403 Forbidden • Access Denied
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Unauthorized Route Access
          </h2>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 text-xs sm:text-sm text-rose-900 leading-relaxed flex gap-3 items-start">
            <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950 mb-1">
                Special User Scope Restriction Active
              </p>
              <p className="text-rose-800 text-xs">
                Your account is strictly isolated to <strong>Carwash Owner Expiry Management</strong>. Access to Employee, Customer, Special User, or System Admin routes via direct URL navigation is forbidden.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-600 flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Restricted Path:</span>
            <span className="font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
              {attemptedPath || '/restricted'}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReturn}
              className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Return to Carwash Owner Expiry Console</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
