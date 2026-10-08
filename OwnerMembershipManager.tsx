/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarWash, CarWashMembershipConfig, MembershipPointsRule, MembershipReward, CustomerMembership, MembershipRedemption } from '../types';
import { useApp } from '../context/AppContext';
import { Award, Gift, Sliders, Users, QrCode, Plus, Check, Edit2, Search, ArrowUpRight, ArrowDownLeft, AlertCircle, RefreshCw, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';
import QRCode from 'qrcode';

interface OwnerMembershipManagerProps {
  carWash: CarWash;
  onRefreshCarWash?: () => void;
}

export const OwnerMembershipManager: React.FC<OwnerMembershipManagerProps> = ({
  carWash,
  onRefreshCarWash,
}) => {
  const { user, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'rules' | 'rewards' | 'members' | 'redemptions'>('overview');
  const [config, setConfig] = useState<CarWashMembershipConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Settings form state
  const [programmeName, setProgrammeName] = useState('');
  const [programmeDesc, setProgrammeDesc] = useState('');
  const [pointsExpiryMonths, setPointsExpiryMonths] = useState(0);
  const [isProgrammeActive, setIsProgrammeActive] = useState(false);
  const [termsConditions, setTermsConditions] = useState('');

  // Rules state
  const [rules, setRules] = useState<MembershipPointsRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [editingRuleServiceId, setEditingRuleServiceId] = useState<string | null>(null);
  const [rulePointsInput, setRulePointsInput] = useState<number>(10);

  // Rewards state
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(100);
  const [newRewardType, setNewRewardType] = useState<'FREE_SERVICE' | 'DISCOUNT_PERCENT' | 'FIXED_DISCOUNT' | 'FREE_ADDON' | 'CUSTOM'>('FREE_SERVICE');
  const [newRewardValue, setNewRewardValue] = useState<number>(0);
  const [isCreatingReward, setIsCreatingReward] = useState(false);

  // Members state
  const [members, setMembers] = useState<CustomerMembership[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForAdjustment, setSelectedMemberForAdjustment] = useState<CustomerMembership | null>(null);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Redemptions state
  const [redemptions, setRedemptions] = useState<MembershipRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  // Join QR Code data URL
  const [joinQrDataUrl, setJoinQrDataUrl] = useState<string>('');

  // Load Programme Config
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await fetch(`/api/membership/programme/${carWash.id}`);
      if (res.ok) {
        const data: CarWashMembershipConfig = await res.json();
        setConfig(data);
        setProgrammeName(data.programmeName || `${carWash.name} Rewards`);
        setProgrammeDesc(data.programmeDescription || '');
        setPointsExpiryMonths(data.pointsExpiryMonths || 0);
        setIsProgrammeActive(data.isProgrammeActive);
        setTermsConditions(data.termsConditions || '');
      }
    } catch (e) {
      console.warn('Failed to load programme config:', e);
    } finally {
      setConfigLoading(false);
    }
  };

  // Load Rules
  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const res = await fetch(`/api/membership/points-rules/${carWash.id}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data || []);
      }
    } catch (e) {
      console.warn('Failed to load points rules:', e);
    } finally {
      setRulesLoading(false);
    }
  };

  // Load Rewards
  const loadRewards = async () => {
    setRewardsLoading(true);
    try {
      const res = await fetch(`/api/membership/rewards/${carWash.id}`);
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

  // Load Members
  const loadMembers = async (search = '') => {
    setMembersLoading(true);
    try {
      const token = localStorage.getItem('cw_token');
      const url = `/api/membership/members/${carWash.id}${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data || []);
      }
    } catch (e) {
      console.warn('Failed to load members:', e);
    } finally {
      setMembersLoading(false);
    }
  };

  // Load Redemptions
  const loadRedemptions = async () => {
    setRedemptionsLoading(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/redemptions/${carWash.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRedemptions(data || []);
      }
    } catch (e) {
      console.warn('Failed to load redemptions:', e);
    } finally {
      setRedemptionsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadRules();
    loadRewards();
    loadMembers();
    loadRedemptions();
  }, [carWash.id]);

  // Generate Counter Join QR Code
  useEffect(() => {
    const slugOrId = carWash.slug || carWash.id;
    const origin = window.location.origin;
    const joinUrl = `${origin}/wash/${encodeURIComponent(slugOrId)}?join_loyalty=true`;
    QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' }
    })
      .then(setJoinQrDataUrl)
      .catch((e) => console.error('Join QR generator error:', e));
  }, [carWash.id, carWash.slug]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/programme/${carWash.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          programmeName,
          programmeDescription: programmeDesc,
          pointsExpiryMonths,
          isProgrammeActive,
          termsConditions,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        showNotification('Loyalty programme settings saved successfully!', 'success');
        if (onRefreshCarWash) onRefreshCarWash();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to save settings', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Error saving settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Service Rule
  const handleSaveRule = async (serviceId: string, serviceName: string, pointsAwarded: number) => {
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/points-rules/${carWash.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serviceId, serviceName, pointsAwarded })
      });
      if (res.ok) {
        showNotification(`Points rule saved for ${serviceName} (${pointsAwarded} pts)`, 'success');
        setEditingRuleServiceId(null);
        loadRules();
      }
    } catch (e: any) {
      showNotification(e.message || 'Failed to save rule', 'error');
    }
  };

  // Create Reward
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim() || newRewardCost <= 0) {
      showNotification('Please provide a title and positive point cost.', 'error');
      return;
    }
    setIsCreatingReward(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/rewards/${carWash.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newRewardTitle.trim(),
          description: newRewardDesc.trim() || undefined,
          pointsCost: newRewardCost,
          rewardType: newRewardType,
          discountValue: newRewardValue || 0,
          isActive: true,
        })
      });
      if (res.ok) {
        showNotification('Reward created successfully!', 'success');
        setShowAddRewardModal(false);
        setNewRewardTitle('');
        setNewRewardDesc('');
        setNewRewardCost(100);
        setNewRewardValue(0);
        loadRewards();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to create reward', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Failed to create reward', 'error');
    } finally {
      setIsCreatingReward(false);
    }
  };

  // Adjust Member Points
  const handleConfirmAdjust = async () => {
    if (!selectedMemberForAdjustment) return;
    if (!adjustReason.trim()) {
      showNotification('A mandatory audit reason is required for points adjustments.', 'error');
      return;
    }
    setIsAdjusting(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch('/api/membership/adjust-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membershipId: selectedMemberForAdjustment.id,
          pointsDelta: adjustPointsDelta,
          reason: adjustReason.trim(),
        })
      });
      if (res.ok) {
        showNotification('Points adjustment recorded in ledger successfully!', 'success');
        setSelectedMemberForAdjustment(null);
        setAdjustReason('');
        loadMembers(memberSearch);
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to adjust points', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Adjustment error', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // 1. FEATURE DISABLED GUARD
  const isFeatureEnabled = carWash.membershipEnabled === true;
  if (!isFeatureEnabled) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900">Loyalty &amp; Membership Not Enabled</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            The multi-tenant loyalty and points programme has not yet been activated for <strong>{carWash.name}</strong> by an Administrator or Special Partner.
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 max-w-md mx-auto space-y-2">
          <p className="font-bold text-slate-800">Once enabled by Admin, you will be able to:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Configure point earning rates for your wash packages</li>
            <li>Create free wash and discount rewards for members</li>
            <li>Generate printable "Join Rewards" QR code standees</li>
            <li>Award points at the counter and scan redemption vouchers</li>
          </ul>
        </div>
      </div>
    );
  }

  // 2. FEATURE ENABLED: FULL MANAGEMENT SUITE
  return (
    <div className="space-y-6">
      {/* Top Header & Quick Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {config?.programmeName || `${carWash.name} Rewards`}
              </h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  config?.isProgrammeActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {config?.isProgrammeActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage member enrollment, point rules, reward catalog, and redemptions.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Programme
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Points Rules
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'rewards'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rewards ({rewards.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'redemptions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Redemptions
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Members</span>
              <p className="text-2xl font-black text-slate-900">{members.length}</p>
              <p className="text-[10px] text-slate-500">Enrolled customers</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Points In Circulation</span>
              <p className="text-2xl font-black text-indigo-600">
                {members.reduce((acc, m) => acc + (m.pointsBalance || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-500">Unredeemed balance</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Active Rewards</span>
              <p className="text-2xl font-black text-emerald-600">
                {rewards.filter((r) => r.isActive).length}
              </p>
              <p className="text-[10px] text-slate-500">Available to redeem</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Redemptions</span>
              <p className="text-2xl font-black text-blue-600">{redemptions.length}</p>
              <p className="text-[10px] text-slate-500">Vouchers processed</p>
            </div>
          </div>

          {/* Onboarding Wizard / Status Callout */}
          {!config?.isProgrammeActive && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-950">
                    Your Loyalty Programme Is Currently Paused
                  </h3>
                  <p className="text-xs text-amber-800">
                    Configure your points earning rules and reward packages below, then activate your programme to let customers start joining!
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Configure &amp; Activate
                </button>
              </div>
            </div>
          )}

          {/* Standee QR Banner */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md border border-indigo-500/20">
            <div className="space-y-2 max-w-lg">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-300">
                Counter Signage
              </span>
              <h3 className="text-lg font-black">Counter "Join Our Programme" QR Code</h3>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Display this official QR standee at your payment counter or waiting lounge. Customers can scan to view rewards, accept terms, and join your programme on the spot!
              </p>
              <div className="pt-2 flex gap-3">
                {joinQrDataUrl && (
                  <a
                    href={joinQrDataUrl}
                    download={`${carWash.name.replace(/[^a-z0-9]/gi, '_')}_Join_Rewards_QR.png`}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Download High-Res QR Poster</span>
                  </a>
                )}
              </div>
            </div>

            {joinQrDataUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-xl border border-white/20 shrink-0">
                <img src={joinQrDataUrl} alt="Join Programme QR" className="w-36 h-36 object-contain" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROGRAMME SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-150 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Programme Identity &amp; Rules</h3>
            <p className="text-xs text-slate-500">Configure how your programme appears to Brunei customers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Programme Title *</label>
              <input
                type="text"
                required
                value={programmeName}
                onChange={(e) => setProgrammeName(e.target.value)}
                placeholder="e.g. Autoshine Royal Rewards"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Points Expiration Policy</label>
              <select
                value={pointsExpiryMonths}
                onChange={(e) => setPointsExpiryMonths(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
              >
                <option value={0}>Points Never Expire</option>
                <option value={6}>Expire After 6 Months</option>
                <option value={12}>Expire After 12 Months (1 Year)</option>
                <option value={24}>Expire After 24 Months (2 Years)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Programme Description</label>
            <textarea
              rows={2}
              value={programmeDesc}
              onChange={(e) => setProgrammeDesc(e.target.value)}
              placeholder="e.g. Earn 10 points for every wash and unlock free deluxe foam wash packages!"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Terms &amp; Conditions</label>
            <textarea
              rows={3}
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Enter specific rules, e.g. Points are awarded upon wash completion. Unused vouchers expire in 7 days."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* Active Status Switch */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Programme Active Status</h4>
              <p className="text-[11px] text-slate-500">
                When active, customers can join and earn points. When paused, points remain saved, but new joins and redemptions are paused.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsProgrammeActive((prev) => !prev)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isProgrammeActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isProgrammeActive ? 'Active (Live)' : 'Paused (Draft)'}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving Settings...' : 'Save Programme Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: POINTS RULES (LINKED TO SERVICES) */}
      {activeTab === 'rules' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-150 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Service Points Configuration</h3>
            <p className="text-xs text-slate-500">
              Define how many loyalty points customers earn automatically upon completing each wash service.
            </p>
          </div>

          {(!carWash.services || carWash.services.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No services found. Add services in the Services Catalog tab first.
            </div>
          ) : (
            <div className="space-y-3">
              {carWash.services.map((svc) => {
                const existingRule = rules.find((r) => r.serviceId === svc.id);
                const currentPoints = existingRule ? existingRule.pointsAwarded : Math.max(1, Math.round(svc.price));
                const isEditing = editingRuleServiceId === svc.id;

                return (
                  <div
                    key={svc.id}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{svc.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                          BND ${svc.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Duration: {svc.duration} mins {svc.vehicleType ? `• ${svc.vehicleType}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={rulePointsInput}
                            onChange={(e) => setRulePointsInput(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          />
                          <button
                            onClick={() => handleSaveRule(svc.id, svc.name, rulePointsInput)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRuleServiceId(null)}
                            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-sm text-indigo-600">
                            +{currentPoints} pts
                          </span>
                          <button
                            onClick={() => {
                              setEditingRuleServiceId(svc.id);
                              setRulePointsInput(currentPoints);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                            title="Edit Points"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REWARDS CATALOG */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/90">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Redeemable Rewards Catalog</h3>
              <p className="text-xs text-slate-500">Create perks that members can exchange their points for.</p>
            </div>
            <button
              onClick={() => setShowAddRewardModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Reward</span>
            </button>
          </div>

          {rewards.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-2">
              <Gift className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Rewards Created Yet</p>
              <p className="text-[11px] text-slate-400">Click "Create Reward" above to add your first item.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                        {reward.rewardType.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold ${reward.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {reward.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 pt-1">{reward.title}</h4>
                    {reward.description && (
                      <p className="text-xs text-slate-500 leading-snug">{reward.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-indigo-600 text-sm">
                      {reward.pointsCost} points
                    </span>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('cw_token');
                        await fetch(`/api/membership/rewards/${carWash.id}/${reward.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ isActive: !reward.isActive })
                        });
                        loadRewards();
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      {reward.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Reward Modal */}
          {showAddRewardModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm">Create New Reward</h3>
                  <button onClick={() => setShowAddRewardModal(false)} className="text-slate-400 hover:text-slate-600">
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateReward} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reward Title *</label>
                    <input
                      type="text"
                      required
                      value={newRewardTitle}
                      onChange={(e) => setNewRewardTitle(e.target.value)}
                      placeholder="e.g. Free Deluxe Foam Wash"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Points Required *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newRewardCost}
                        onChange={(e) => setNewRewardCost(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Reward Type</label>
                      <select
                        value={newRewardType}
                        onChange={(e: any) => setNewRewardType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white"
                      >
                        <option value="FREE_SERVICE">Free Service</option>
                        <option value="DISCOUNT_PERCENT">Percentage Discount</option>
                        <option value="FIXED_DISCOUNT">Fixed Cash Discount</option>
                        <option value="FREE_ADDON">Free Add-on</option>
                        <option value="CUSTOM">Custom Gift</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      value={newRewardDesc}
                      onChange={(e) => setNewRewardDesc(e.target.value)}
                      placeholder="e.g. Valid for any sedan or compact vehicle."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddRewardModal(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingReward}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingReward ? 'Creating...' : 'Save Reward'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Enrolled Members Directory</h3>
              <p className="text-xs text-slate-500">Search members and record audited manual point adjustments.</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  loadMembers(e.target.value);
                }}
                placeholder="Search name, phone, member ID..."
                className="pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs w-full sm:w-64"
              />
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No members enrolled yet for this car wash.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="pb-2.5">Member</th>
                    <th className="pb-2.5">ID / QR</th>
                    <th className="pb-2.5">Points</th>
                    <th className="pb-2.5">Joined</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3">
                        <div className="font-extrabold text-slate-900">{m.customerName || 'Customer'}</div>
                        <div className="text-[11px] text-slate-500">{m.customerPhone || m.customerEmail || 'No contact'}</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-700">
                        {m.membershipNumber}
                      </td>
                      <td className="py-3 font-mono font-black text-indigo-600">
                        {m.pointsBalance.toLocaleString()} pts
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedMemberForAdjustment(m);
                            setAdjustPointsDelta(10);
                            setAdjustReason('');
                          }}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Adjust Points
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Manual Adjustment Modal */}
          {selectedMemberForAdjustment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="text-center space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-sm">Audited Point Adjustment</h3>
                  <p className="text-xs text-slate-600">
                    Adjust points for <strong>{selectedMemberForAdjustment.customerName || selectedMemberForAdjustment.membershipNumber}</strong>.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Points Delta (+ or -) *</label>
                    <input
                      type="number"
                      required
                      value={adjustPointsDelta}
                      onChange={(e) => setAdjustPointsDelta(Number(e.target.value))}
                      placeholder="e.g. 20 or -10"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mandatory Audit Reason *</label>
                    <textarea
                      required
                      rows={2}
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Compensate for counter delay on 20 Sep"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberForAdjustment(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAdjust}
                      disabled={isAdjusting}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isAdjusting ? 'Recording...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REDEMPTIONS HISTORY */}
      {activeTab === 'redemptions' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="border-b border-slate-150 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Voucher Redemptions History</h3>
            <p className="text-xs text-slate-500">Record of all reward vouchers issued and redeemed at this location.</p>
          </div>

          {redemptions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No redemptions processed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="pb-2.5">Code</th>
                    <th className="pb-2.5">Reward</th>
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Points</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3 font-mono font-bold text-slate-900">{r.redemptionCode}</td>
                      <td className="py-3 font-extrabold text-slate-800">{r.rewardTitle}</td>
                      <td className="py-3 text-slate-600">{r.customerName || r.customerId}</td>
                      <td className="py-3 font-mono font-bold text-rose-600">-{r.pointsSpent} pts</td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            r.status === 'REDEEMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
