/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CustomerMembership, MembershipPointsLedger, MembershipReward, MembershipRedemption } from '../types';
import { useApp } from '../context/AppContext';
import { Award, QrCode, X, Calendar, ArrowUpRight, ArrowDownLeft, Shield, Gift, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, Sparkles, Search, ChevronDown } from 'lucide-react';
import QRCode from 'qrcode';

interface MembershipCardModalProps {
  membership: CustomerMembership;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const MembershipCardModal: React.FC<MembershipCardModalProps> = ({
  membership,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { redeemMembershipReward, leaveCarWashMembership, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<'card' | 'rewards' | 'history'>('card');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [ledger, setLedger] = useState<MembershipPointsLedger[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Selected reward redemption state
  const [selectedReward, setSelectedReward] = useState<MembershipReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedVoucher, setRedeemedVoucher] = useState<MembershipRedemption | null>(null);
  const [voucherQrUrl, setVoucherQrUrl] = useState<string>('');

  // Reward discovery controls
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardCategory, setRewardCategory] = useState<'ALL' | 'REDEEMABLE' | 'FREE_SERVICE' | 'FREE_ADDON' | 'DISCOUNT' | 'CUSTOM'>('ALL');
  const [rewardSort, setRewardSort] = useState<'POINTS_ASC' | 'POINTS_DESC' | 'ALPHA_ASC'>('POINTS_ASC');
  const [showAllModalRewards, setShowAllModalRewards] = useState(false);

  const filteredModalRewards = useMemo(() => {
    const balance = Number(membership?.pointsBalance ?? 0);
    const q = rewardSearch.trim().toLowerCase();
    const list = rewards.filter((r) => {
      if (q) {
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchType = (r.rewardType || '').toLowerCase().replace('_', ' ').includes(q);
        if (!matchTitle && !matchDesc && !matchType) return false;
      }
      if (rewardCategory === 'REDEEMABLE') return balance >= Number(r.pointsCost ?? 0);
      if (rewardCategory === 'FREE_SERVICE') return r.rewardType === 'FREE_SERVICE';
      if (rewardCategory === 'FREE_ADDON') return r.rewardType === 'FREE_ADDON';
      if (rewardCategory === 'DISCOUNT') return r.rewardType === 'DISCOUNT_PERCENT' || r.rewardType === 'FIXED_DISCOUNT';
      if (rewardCategory === 'CUSTOM') return r.rewardType === 'CUSTOM';
      return true;
    });

    return [...list].sort((a, b) => {
      if (rewardSort === 'POINTS_DESC') return Number(b.pointsCost || 0) - Number(a.pointsCost || 0);
      if (rewardSort === 'ALPHA_ASC') return (a.title || '').localeCompare(b.title || '');
      return Number(a.pointsCost || 0) - Number(b.pointsCost || 0);
    });
  }, [rewards, rewardSearch, rewardCategory, rewardSort, membership?.pointsBalance]);

  // Generate Member QR Code
  useEffect(() => {
    if (!membership?.qrToken) return;
    QRCode.toDataURL(membership.qrToken, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate member QR:', err));
  }, [membership?.qrToken]);

  // Fetch Rewards
  const loadRewards = async () => {
    if (!membership?.carWashId) return;
    setRewardsLoading(true);
    try {
      const res = await fetch(`/api/membership/rewards/${membership.carWashId}?active=true`);
      if (res.ok) {
        const data = await res.json();
        setRewards(data || []);
      }
    } catch (e) {
      console.warn('Failed to load rewards:', e);
    } finally {
      setRewardsLoading(false);
    }
  };

  // Fetch Ledger History
  const loadLedger = async () => {
    if (!membership?.id) return;
    setLedgerLoading(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/ledger/${membership.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLedger(data || []);
      }
    } catch (e) {
      console.warn('Failed to load ledger:', e);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRewards();
      loadLedger();
    }
  }, [isOpen, membership?.id, membership?.carWashId]);

  // Handle Redeem
  const handleConfirmRedemption = async () => {
    if (!selectedReward) return;
    setIsRedeeming(true);
    try {
      const result = await redeemMembershipReward(membership.carWashId, selectedReward.id);
      if (result) {
        setRedeemedVoucher(result.redemption);
        // Generate Voucher QR
        const vUrl = await QRCode.toDataURL(result.redemption.redemptionToken, {
          width: 300,
          margin: 2,
          color: { dark: '#0284c7', light: '#ffffff' }
        });
        setVoucherQrUrl(vUrl);
        setSelectedReward(null);
        if (onRefresh) onRefresh();
        loadLedger();
      }
    } catch (e: any) {
      showNotification(e.message || 'Redemption error', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Handle Leave
  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const success = await leaveCarWashMembership(membership.carWashId);
      if (success) {
        onClose();
        if (onRefresh) onRefresh();
      }
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-4 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
                Official Car Wash Loyalty Card
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-white leading-tight truncate">
                {membership.carWashName || 'Car Wash Member'}
              </h2>
            </div>
          </div>

          {/* Sub Navigation - All sections visible without hidden horizontal overflow */}
          <div
            role="tablist"
            aria-label="Loyalty card sections"
            className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mt-4 sm:mt-5 border-t border-white/10 pt-3.5 sm:pt-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'card'}
              onClick={() => setActiveTab('card')}
              className={`px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center leading-tight ${
                activeTab === 'card'
                  ? 'bg-white text-slate-950 shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 sm:bg-transparent text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Member Card &amp; QR
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rewards'}
              onClick={() => setActiveTab('rewards')}
              className={`px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight ${
                activeTab === 'rewards'
                  ? 'bg-white text-slate-950 shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 sm:bg-transparent text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gift className="w-3.5 h-3.5 shrink-0 hidden min-[400px]:inline" />
              <span>Rewards ({rewards.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`px-2 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center leading-tight ${
                activeTab === 'history'
                  ? 'bg-white text-slate-950 shadow-md ring-2 ring-white/30'
                  : 'bg-white/5 sm:bg-transparent text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Points Ledger
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain space-y-5 sm:space-y-6">

          {/* TAB 1: MEMBER CARD & QR */}
          {activeTab === 'card' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Virtual Membership Pass */}
              <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 p-4 sm:p-6 text-white shadow-xl overflow-hidden border border-indigo-400/30">
                {/* Decorative background glows */}
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />

                <div className="flex flex-wrap justify-between items-start gap-2 relative z-10">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-200">
                      MEMBER ID
                    </span>
                    <p className="text-lg sm:text-xl font-black font-mono tracking-wider text-amber-300 break-all">
                      {membership.membershipNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200">
                      STATUS
                    </span>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-extrabold uppercase text-white">
                        {membership.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 relative z-10 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-indigo-200 block mb-0.5">
                      Available Balance
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white tracking-tight">
                        {Number(membership?.pointsBalance ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold uppercase text-amber-300">Points</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-indigo-200">
                    <p>Member Since</p>
                    <p className="font-bold text-white">
                      {new Date(membership.joinedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Identification Display */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-800 text-xs font-bold mb-4">
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>Present at Counter to Earn Points</span>
                </div>

                {qrDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 inline-block">
                    <img
                      src={qrDataUrl}
                      alt="Membership QR Code"
                      className="w-40 h-40 sm:w-48 sm:h-48 mx-auto object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 bg-slate-200 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                    Generating Member QR...
                  </div>
                )}

                <p className="text-xs text-slate-600 mt-3 max-w-sm">
                  Staff can scan this personal QR code or enter your Member ID ({membership.membershipNumber}) to instantly link your visits and award points.
                </p>
              </div>

              {/* Leave Programme Option */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-700">Membership Settings</h4>
                  <p className="text-[11px] text-slate-500">
                    Your history and past redemptions remain permanently archived.
                  </p>
                </div>

                {!showLeaveConfirm ? (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Leave Programme
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLeaveConfirm(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLeave}
                      disabled={isLeaving}
                      className="px-3 py-1 text-xs bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                    >
                      {isLeaving ? 'Leaving...' : 'Confirm Leave'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REWARDS CATALOG */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Available Rewards</h3>
                  <p className="text-xs text-slate-500">
                    Your balance: <strong className="text-indigo-600">{Number(membership?.pointsBalance ?? 0).toLocaleString()} pts</strong>
                  </p>
                </div>
                <button
                  onClick={loadRewards}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Rewards"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Redeemed Voucher Success Banner */}
              {redeemedVoucher && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex flex-col items-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-900">Reward Voucher Generated!</h4>
                    <p className="text-xs text-emerald-700">
                      Show this QR voucher to the counter staff at {membership.carWashName}.
                    </p>
                  </div>

                  {voucherQrUrl && (
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-200">
                      <img src={voucherQrUrl} alt="Voucher QR Code" className="w-40 h-40 object-contain mx-auto" />
                    </div>
                  )}

                  <div className="bg-emerald-100/70 px-3 py-1.5 rounded-xl font-mono font-black text-sm text-emerald-900 tracking-wider">
                    {redeemedVoucher.redemptionCode}
                  </div>

                  <button
                    onClick={() => {
                      setRedeemedVoucher(null);
                      setVoucherQrUrl('');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Done / View All Rewards
                  </button>
                </div>
              )}

              {/* Rewards Search, Category Filter & Sort */}
              {!rewardsLoading && rewards.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={rewardSearch}
                        onChange={(e) => {
                          setRewardSearch(e.target.value);
                          setShowAllModalRewards(false);
                        }}
                        placeholder="Search rewards by name or type..."
                        className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      {rewardSearch && (
                        <button
                          type="button"
                          onClick={() => setRewardSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label="Clear reward search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={rewardSort}
                      onChange={(e) => setRewardSort(e.target.value as any)}
                      aria-label="Sort rewards"
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="POINTS_ASC">Points: Low → High</option>
                      <option value="POINTS_DESC">Points: High → Low</option>
                      <option value="ALPHA_ASC">Name: A → Z</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'ALL', label: `All (${rewards.length})` },
                      { id: 'REDEEMABLE', label: 'Ready to Redeem' },
                      { id: 'FREE_SERVICE', label: 'Free Washes' },
                      { id: 'FREE_ADDON', label: 'Add-ons' },
                      { id: 'DISCOUNT', label: 'Discounts' },
                      { id: 'CUSTOM', label: 'Perks' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setRewardCategory(cat.id as any);
                          setShowAllModalRewards(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          rewardCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewards List */}
              {rewardsLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading reward packages...
                </div>
              ) : rewards.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Gift className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No active rewards available right now.</p>
                  <p className="text-[11px] text-slate-400">The owner hasn't published reward catalog items yet.</p>
                </div>
              ) : filteredModalRewards.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-600">No rewards match your current search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setRewardSearch('');
                      setRewardCategory('ALL');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                    <span>
                      Showing {showAllModalRewards ? filteredModalRewards.length : Math.min(4, filteredModalRewards.length)} of {filteredModalRewards.length} reward{filteredModalRewards.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {(showAllModalRewards ? filteredModalRewards : filteredModalRewards.slice(0, 4)).map((reward) => {
                    const canAfford = Number(membership?.pointsBalance ?? 0) >= Number(reward?.pointsCost ?? 0);
                    return (
                      <div
                        key={reward.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 ${
                          canAfford
                            ? 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200/60 opacity-80'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              {reward.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                              {reward.rewardType.replace('_', ' ')}
                            </span>
                          </div>
                          {reward.description && (
                            <p className="text-xs text-slate-500 leading-snug">{reward.description}</p>
                          )}
                          <p className="text-xs font-extrabold text-indigo-600">
                            {reward.pointsCost} points
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedReward(reward)}
                          disabled={!canAfford}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                            canAfford
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? 'Redeem' : 'Need more pts'}
                        </button>
                      </div>
                    );
                  })}

                  {filteredModalRewards.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllModalRewards((prev) => !prev)}
                      className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>
                        {showAllModalRewards
                          ? 'Show Fewer Rewards'
                          : `View All Rewards (+${filteredModalRewards.length - 4} more)`}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAllModalRewards ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Redemption Confirmation Modal / Dialog */}
              {selectedReward && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shrink-0">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="font-black text-slate-900 text-base">Confirm Redemption</h3>
                      <p className="text-xs text-slate-600">
                        You are about to redeem <strong>"{selectedReward.title}"</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs border border-slate-200">
                      <div className="flex justify-between gap-2 text-slate-600">
                        <span>Current Points:</span>
                        <span className="font-bold shrink-0">{Number(membership?.pointsBalance ?? 0).toLocaleString()} pts</span>
                      </div>
                      <div className="flex justify-between gap-2 text-rose-600">
                        <span>Points Cost:</span>
                        <span className="font-bold shrink-0">-{Number(selectedReward?.pointsCost ?? 0).toLocaleString()} pts</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between gap-2 text-slate-900 font-extrabold">
                        <span>Remaining Points:</span>
                        <span className="text-indigo-600 shrink-0">{Math.max(0, Number(membership?.pointsBalance ?? 0) - Number(selectedReward?.pointsCost ?? 0)).toLocaleString()} pts</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                      A unique redemption voucher with QR code will be created valid for 7 days.
                    </p>

                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => setSelectedReward(null)}
                        className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmRedemption}
                        disabled={isRedeeming}
                        className="w-full sm:flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isRedeeming ? 'Redeeming...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTION LEDGER */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Audit Points Ledger</h3>
                  <p className="text-xs text-slate-500">Every points transaction is verified and immutable.</p>
                </div>
                <button
                  onClick={loadLedger}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Ledger"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {ledgerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading ledger transactions...
                </div>
              ) : ledger.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No points transactions recorded yet.</p>
                  <p className="text-[11px] text-slate-400">Complete a wash at this location to earn your first points!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ledger.map((item) => {
                    const isPositive = item.points > 0;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 sm:gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 break-words">{item.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-semibold uppercase tracking-wider bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
                                {item.transactionType}
                              </span>
                              <span>
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className={`font-mono font-black text-sm shrink-0 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? `+${item.points}` : item.points}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
