/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarWash, CustomerMembership, CarWashMembershipConfig, MembershipReward } from '../types';
import { useApp } from '../context/AppContext';
import { Award, Gift, Sparkles, Check, ChevronRight, QrCode, Shield, Info, ArrowRight, ExternalLink } from 'lucide-react';
import { MembershipCardModal } from './MembershipCardModal';

interface CustomerMembershipSectionProps {
  carWash?: CarWash;
  onNavigateToWash?: (carWash: CarWash) => void;
  onRequestAuth?: () => void;
}

export const CustomerMembershipSection: React.FC<CustomerMembershipSectionProps> = ({
  carWash,
  onNavigateToWash,
  onRequestAuth,
}) => {
  const { user, myMemberships, joinCarWashMembership, fetchMyMemberships, locations } = useApp();

  const [activeMembershipModal, setActiveMembershipModal] = useState<CustomerMembership | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [programmeConfig, setProgrammeConfig] = useState<CarWashMembershipConfig | null>(null);
  const [previewRewards, setPreviewRewards] = useState<MembershipReward[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // If scoped to a specific car wash
  const matchedMembership = carWash
    ? myMemberships.find((m) => m.carWashId === carWash.id && m.status === 'ACTIVE')
    : null;

  // Load car wash programme details if scoped
  useEffect(() => {
    if (!carWash?.id) return;
    setLoadingConfig(true);
    fetch(`/api/membership/programme/${carWash.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProgrammeConfig(data);
      })
      .catch((e) => console.warn('Could not fetch programme:', e))
      .finally(() => setLoadingConfig(false));

    fetch(`/api/membership/rewards/${carWash.id}?active=true`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setPreviewRewards(data || []);
      })
      .catch(() => {});
  }, [carWash?.id]);

  // Handle Join
  const handleJoin = async () => {
    if (!user) {
      if (onRequestAuth) onRequestAuth();
      return;
    }
    if (!carWash) return;
    if (!consentChecked) {
      alert('Please check the terms and consent box to join this loyalty programme.');
      return;
    }

    setIsJoining(true);
    try {
      const created = await joinCarWashMembership(carWash.id, true, 'ONLINE_OPT_IN');
      if (created) {
        setActiveMembershipModal(created);
      }
    } finally {
      setIsJoining(false);
    }
  };

  // 1. SPECIFIC CAR WASH EMBEDDED VIEW
  if (carWash) {
    const isFeatureEnabled = carWash.membershipEnabled === true;
    if (!isFeatureEnabled) {
      return null; // Not enabled by Admin/Special user for this business
    }

    // Already a member at this business
    if (matchedMembership) {
      return (
        <>
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-5 text-white shadow-lg border border-indigo-500/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">
                    Active Member
                  </span>
                  <h3 className="text-sm font-extrabold text-white">
                    {programmeConfig?.programmeName || `${carWash.name} Rewards`}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-indigo-200 uppercase font-semibold">Balance</span>
                <p className="text-lg font-black text-amber-300">
                  {matchedMembership.pointsBalance.toLocaleString()} <span className="text-xs font-bold text-white">pts</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-indigo-200 font-mono">
                ID: {matchedMembership.membershipNumber}
              </span>
              <button
                onClick={() => setActiveMembershipModal(matchedMembership)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Member Card &amp; Rewards</span>
              </button>
            </div>
          </div>

          {activeMembershipModal && (
            <MembershipCardModal
              membership={activeMembershipModal}
              isOpen={!!activeMembershipModal}
              onClose={() => setActiveMembershipModal(null)}
              onRefresh={fetchMyMemberships}
            />
          )}
        </>
      );
    }

    // Not yet a member: Show Join Onboarding Call-to-Action
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50/60 to-purple-50/40 rounded-3xl p-6 border border-indigo-200/80 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              Loyalty Programme
            </span>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">
              Join {programmeConfig?.programmeName || `${carWash.name} Rewards`}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Earn exclusive points for every completed wash at this station, unlock free wash packages, and redeem discounts!
            </p>
          </div>
        </div>

        {/* Available Perks / Rewards Preview */}
        {previewRewards.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border border-indigo-100 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 block">
              Sample Rewards You Can Redeem:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {previewRewards.slice(0, 3).map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-100"
                >
                  <Gift className="w-3 h-3 text-indigo-600" />
                  <span>{r.title} ({r.pointsCost} pts)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Explicit Consent & Join Checkbox */}
        <div className="bg-white/90 rounded-2xl p-4 border border-indigo-100 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-snug">
              I agree to join <strong>{carWash.name}</strong> Rewards and confirm I understand that points belong strictly to this business and are awarded upon service completion.
            </span>
          </label>

          <button
            onClick={handleJoin}
            disabled={isJoining}
            className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              consentChecked
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{isJoining ? 'Joining Programme...' : `Join ${carWash.name} Rewards`}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. GLOBAL "MY MEMBERSHIPS" SECTION (for Customer Dashboard)
  const participatingLocations = locations.filter((l) => l.membershipEnabled === true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>My Loyalty Memberships</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your memberships and point balances across participating Brunei car wash stations.
          </p>
        </div>
      </div>

      {/* Active Memberships Grid */}
      {myMemberships.length === 0 ? (
        <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">No Memberships Joined Yet</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Earn reward points for every car wash you book! Memberships belong to individual car washes and let you redeem free washes and service add-ons.
            </p>
          </div>

          {participatingLocations.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-3">
                Stations Offering Loyalty Programmes:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {participatingLocations.map((cw) => (
                  <button
                    key={cw.id}
                    onClick={() => onNavigateToWash && onNavigateToWash(cw)}
                    className="p-3 bg-white hover:border-indigo-300 border border-slate-200 rounded-2xl shadow-2xs transition-all flex items-center justify-between text-left cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{cw.name}</h4>
                      <p className="text-[10px] text-slate-500">{cw.address || 'Brunei'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myMemberships.map((membership) => (
            <div
              key={membership.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      MEMBER #{membership.membershipNumber}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {membership.carWashName || 'Car Wash Station'}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Points</span>
                  <p className="text-xl font-black text-indigo-600">
                    {membership.pointsBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Joined {new Date(membership.joinedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setActiveMembershipModal(membership)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Card &amp; QR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {activeMembershipModal && (
        <MembershipCardModal
          membership={activeMembershipModal}
          isOpen={!!activeMembershipModal}
          onClose={() => setActiveMembershipModal(null)}
          onRefresh={fetchMyMemberships}
        />
      )}
    </div>
  );
};
