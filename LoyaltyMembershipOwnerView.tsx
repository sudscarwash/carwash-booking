import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Award, 
  Gift, 
  Settings, 
  Users, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Coins, 
  QrCode, 
  RefreshCw, 
  Search, 
  FileText, 
  Printer, 
  Download, 
  Copy, 
  CheckCircle,
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';
import { 
  CarWash, 
  CarWashMembershipConfig, 
  MembershipPointsRule, 
  MembershipReward, 
  CustomerMembership, 
  MembershipPointsLedger, 
  MembershipRedemption,
  WashService 
} from '../types.js';
import { StaffMembershipCounterModal } from './StaffMembershipCounterModal.js';

// Safe JSON response parsing helpers
const safeJsonFetch = async (res: Response) => {
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
};

const safeJsonOrError = async (res: Response, fallbackError: string) => {
  const ct = res.headers.get('content-type') || '';
  let data: any = null;
  if (ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    throw new Error((data && data.error) || fallbackError);
  }
  return data;
};

interface LoyaltyMembershipOwnerViewProps {
  carWash: CarWash;
  token: string | null;
  currentUser: any;
}

export const LoyaltyMembershipOwnerView: React.FC<LoyaltyMembershipOwnerViewProps> = ({
  carWash,
  token,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'rules' | 'rewards' | 'members' | 'redemptions' | 'poster'>('config');
  const [loading, setLoading] = useState(true);

  // 1. Config State
  const [config, setConfig] = useState<CarWashMembershipConfig | null>(null);
  const [programmeName, setProgrammeName] = useState('');
  const [programmeDescription, setProgrammeDescription] = useState('');
  const [isProgrammeActive, setIsProgrammeActive] = useState(true);
  const [pointsExpiryMonths, setPointsExpiryMonths] = useState<number>(12);
  const [allowQrJoin, setAllowQrJoin] = useState(true);
  const [allowCounterJoin, setAllowCounterJoin] = useState(true);
  const [termsConditions, setTermsConditions] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // 2. Rules State
  const [rules, setRules] = useState<MembershipPointsRule[]>([]);
  const [ruleEdits, setRuleEdits] = useState<{ [serviceId: string]: number }>({});
  const [savingRules, setSavingRules] = useState(false);

  // 3. Rewards State
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<MembershipReward | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardPointsCost, setRewardPointsCost] = useState<number>(100);
  const [rewardType, setRewardType] = useState<'FREE_SERVICE' | 'DISCOUNT_FIXED' | 'DISCOUNT_PERCENT' | 'CUSTOM'>('FREE_SERVICE');
  const [rewardDiscountVal, setRewardDiscountVal] = useState<string>('');
  const [rewardMaxPerMember, setRewardMaxPerMember] = useState<number>(0);
  const [rewardMaxTotalSupply, setRewardMaxTotalSupply] = useState<number>(0);
  const [rewardIsActive, setRewardIsActive] = useState(true);
  const [savingReward, setSavingReward] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);

  // 4. Members Directory State
  const [members, setMembers] = useState<CustomerMembership[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberLedger, setSelectedMemberLedger] = useState<{ member: CustomerMembership; ledger: MembershipPointsLedger[] } | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Manual Adjustment State
  const [adjustingMember, setAdjustingMember] = useState<CustomerMembership | null>(null);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 5. Redemptions History
  const [redemptions, setRedemptions] = useState<MembershipRedemption[]>([]);

  // 6. QR Poster State
  const [posterQrUrl, setPosterQrUrl] = useState('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrGenError, setQrGenError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeSlugOrId = carWash.slug || carWash.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || carWash.id;
  const joinUrl = `${baseUrl}/wash/${encodeURIComponent(activeSlugOrId)}?join=true`;

  // Dedicated generator to guarantee poster QR code is always created reliably
  const generatePosterQr = useCallback(async () => {
    if (!carWash) return;
    setIsGeneratingQr(true);
    setQrGenError(null);
    try {
      const dataUrl = await QRCode.toDataURL(joinUrl, {
        width: 480,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });
      setPosterQrUrl(dataUrl);

      if (posterCanvasRef.current) {
        await QRCode.toCanvas(posterCanvasRef.current, joinUrl, {
          width: 480,
          margin: 2,
          color: { dark: '#0F172A', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        });
      }
    } catch (err: any) {
      console.error('Error generating counter QR poster:', err);
      setQrGenError(err?.message || 'Failed to render QR code');
    } finally {
      setIsGeneratingQr(false);
    }
  }, [joinUrl, carWash]);

  useEffect(() => {
    generatePosterQr();
  }, [generatePosterQr]);

  // Fetch initial data
  const fetchData = async () => {
    if (!carWash?.id || !token) return;
    setLoading(true);
    try {
      const [configRes, rulesRes, rewardsRes, membersRes, redemptionsRes] = await Promise.all([
        fetch(`/api/membership/programme/${carWash.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/membership/points-rules/${carWash.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/membership/rewards/${carWash.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/membership/members/${carWash.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/membership/redemptions/${carWash.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const cfg: CarWashMembershipConfig | null = await safeJsonFetch(configRes);
      if (cfg) {
        setConfig(cfg);
        setProgrammeName(cfg.programmeName || `${carWash.name} VIP Rewards`);
        setProgrammeDescription(cfg.programmeDescription || 'Earn points on every wash and redeem for free services.');
        setIsProgrammeActive(cfg.isProgrammeActive !== false);
        setPointsExpiryMonths(cfg.pointsExpiryMonths ?? 12);
        setAllowQrJoin(cfg.allowQrJoin !== false);
        setAllowCounterJoin(cfg.allowCounterJoin !== false);
        setTermsConditions(cfg.termsConditions || '');
      }

      const rList: MembershipPointsRule[] | null = await safeJsonFetch(rulesRes);
      if (rList && Array.isArray(rList)) {
        setRules(rList);
        const map: { [key: string]: number } = {};
        rList.forEach((r) => {
          map[r.serviceId] = r.pointsAwarded;
        });
        setRuleEdits(map);
      }

      const rwList: MembershipReward[] | null = await safeJsonFetch(rewardsRes);
      if (rwList && Array.isArray(rwList)) setRewards(rwList);

      const mList: CustomerMembership[] | null = await safeJsonFetch(membersRes);
      if (mList && Array.isArray(mList)) setMembers(mList);

      const redList: MembershipRedemption[] | null = await safeJsonFetch(redemptionsRes);
      if (redList && Array.isArray(redList)) setRedemptions(redList);
    } catch (err) {
      console.error('Failed to load membership owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [carWash?.id, token]);

  // Save Programme Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingConfig(true);
    setConfigSuccess(false);
    try {
      const res = await fetch(`/api/membership/programme/${carWash.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programmeName,
          programmeDescription,
          isProgrammeActive,
          pointsExpiryMonths,
          allowQrJoin,
          allowCounterJoin,
          termsConditions,
        }),
      });

      const updated = await safeJsonOrError(res, 'Failed to save programme settings');
      setConfig(updated);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setSavingConfig(false);
    }
  };

  // Save Points Rules
  const handleSaveRule = async (service: WashService) => {
    if (!token) return;
    setSavingRules(true);
    try {
      const pts = ruleEdits[service.id] !== undefined ? ruleEdits[service.id] : 10;
      const res = await fetch(`/api/membership/points-rules/${carWash.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          serviceName: service.name,
          pointsAwarded: pts,
          isActive: true,
        }),
      });

      const saved = await safeJsonOrError(res, 'Failed to save rule');
      setRules((prev) => {
        const filtered = prev.filter((r) => r.serviceId !== service.id);
        return [...filtered, saved];
      });
      alert(`Points rule for "${service.name}" updated to ${pts} pts!`);
    } catch (err: any) {
      alert(err.message || 'Error saving rule');
    } finally {
      setSavingRules(false);
    }
  };

  // Open Add/Edit Reward Modal
  const handleOpenRewardModal = (reward?: MembershipReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardTitle(reward.title);
      setRewardDesc(reward.description || '');
      setRewardPointsCost(reward.pointsCost);
      setRewardType((reward.rewardType as any) || 'FREE_SERVICE');
      setRewardDiscountVal(reward.discountValue !== undefined ? String(reward.discountValue) : '');
      setRewardMaxPerMember(reward.maxRedemptionsPerMember || 0);
      setRewardMaxTotalSupply(reward.maxTotalSupply || 0);
      setRewardIsActive(reward.isActive);
    } else {
      setEditingReward(null);
      setRewardTitle('');
      setRewardDesc('');
      setRewardPointsCost(100);
      setRewardType('FREE_SERVICE');
      setRewardDiscountVal('');
      setRewardMaxPerMember(0);
      setRewardMaxTotalSupply(0);
      setRewardIsActive(true);
    }
    setShowRewardModal(true);
  };

  // Save Reward
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingReward(true);
    try {
      const payload = {
        title: rewardTitle,
        description: rewardDesc,
        pointsCost: rewardPointsCost,
        rewardType,
        discountValue: rewardDiscountVal ? parseFloat(rewardDiscountVal) : undefined,
        maxRedemptionsPerMember: rewardMaxPerMember,
        maxTotalSupply: rewardMaxTotalSupply,
        isActive: rewardIsActive,
      };

      const url = editingReward
        ? `/api/membership/rewards/${carWash.id}/${editingReward.id}`
        : `/api/membership/rewards/${carWash.id}`;
      const method = editingReward ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      await safeJsonOrError(res, 'Failed to save reward');

      setShowRewardModal(false);
      // Refresh rewards
      const freshRes = await fetch(`/api/membership/rewards/${carWash.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const freshData = await safeJsonFetch(freshRes);
      if (freshData && Array.isArray(freshData)) setRewards(freshData);
    } catch (err: any) {
      alert(err.message || 'Error saving reward');
    } finally {
      setSavingReward(false);
    }
  };

  // View Member Points Ledger
  const handleViewLedger = async (member: CustomerMembership) => {
    if (!token) return;
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/membership/ledger/${member.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonFetch(res);
      if (data && Array.isArray(data)) {
        setSelectedMemberLedger({ member, ledger: data });
      }
    } catch (err) {
      console.error('Failed to load member ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Submit Manual Points Adjustment (Audited)
  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMember || !token) return;

    const delta = parseInt(adjustPointsDelta, 10);
    if (isNaN(delta) || delta === 0) {
      alert('Points delta must be a non-zero integer.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('A valid reason note is required for audit compliance.');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await fetch('/api/membership/adjust-points', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: adjustingMember.id,
          pointsDelta: delta,
          reason: adjustReason.trim(),
        }),
      });

      const updated = await safeJsonOrError(res, 'Failed to adjust points');
      setMembers((prev) =>
        prev.map((m) => (m.id === adjustingMember.id ? { ...m, pointsBalance: updated.balanceAfter } : m))
      );
      setAdjustingMember(null);
      setAdjustPointsDelta('');
      setAdjustReason('');
      alert(`Points successfully adjusted! New balance: ${updated.balanceAfter} pts.`);
    } catch (err: any) {
      alert(err.message || 'Error adjusting points');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (
      m.membershipNumber.toLowerCase().includes(q) ||
      (m.customerName && m.customerName.toLowerCase().includes(q)) ||
      (m.customerEmail && m.customerEmail.toLowerCase().includes(q)) ||
      (m.customerPhone && m.customerPhone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 px-3 py-0.5 rounded-full text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Multi-Tenant Loyalty &amp; Rewards Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">{carWash.name} Rewards Hub</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
            Configure rules, manage your customer member directory, publish redeemable wash rewards, and print counter QR posters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Enrolled Members</span>
            <span className="text-2xl font-black text-amber-300">{members.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Rewards Published</span>
            <span className="text-2xl font-black text-indigo-300">{rewards.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCounterModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2.5 cursor-pointer text-xs self-stretch sm:self-auto"
            title="Scan customer member QR code or verify reward vouchers at the station counter"
            id="btn-owner-counter-terminal"
          >
            <QrCode className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight">Counter Terminal</span>
              <span className="block text-[9px] text-emerald-100 uppercase tracking-wider font-semibold">Walk-Ins &amp; Vouchers</span>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" /> Programme Settings
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Coins className="h-4 w-4" /> Points Rules
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rewards'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Gift className="h-4 w-4" /> Rewards Catalog ({rewards.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" /> Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('redemptions')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'redemptions'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Award className="h-4 w-4" /> Redemptions ({redemptions.length})
        </button>
        <button
          onClick={() => setActiveTab('poster')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'poster'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Printer className="h-4 w-4" /> Counter QR Poster
        </button>
      </div>

      {/* TAB 1: PROGRAMME SETTINGS */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-800">Loyalty Club Parameters</h3>
            <p className="text-xs text-slate-400">Configure your brand name, terms, and member join permissions.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Club Programme Name</label>
              <input
                type="text"
                value={programmeName}
                onChange={(e) => setProgrammeName(e.target.value)}
                placeholder="e.g. Crystal VIP Pass"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description &amp; Tagline</label>
              <textarea
                rows={2}
                value={programmeDescription}
                onChange={(e) => setProgrammeDescription(e.target.value)}
                placeholder="Earn points automatically on every online booking or counter wash..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Programme Status</label>
                <select
                  value={isProgrammeActive ? 'active' : 'paused'}
                  onChange={(e) => setIsProgrammeActive(e.target.value === 'active')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active (Enrolling &amp; Earning)</option>
                  <option value="paused">Paused (Temporarily Suspended)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Points Expiry (Months)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={pointsExpiryMonths}
                  onChange={(e) => setPointsExpiryMonths(parseInt(e.target.value) || 0)}
                  placeholder="12 (Enter 0 for no expiration)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Set to 0 if points never expire.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowQrJoin}
                  onChange={(e) => setAllowQrJoin(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Allow Customer Direct Opt-In via QR Poster / Direct Link</span>
              </label>

              <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCounterJoin}
                  onChange={(e) => setAllowCounterJoin(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Allow Bay Staff &amp; Cashier to Enroll Customers at Counter</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Custom Terms &amp; Conditions</label>
              <textarea
                rows={3}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="Points have no cash value. Rewards subject to slot availability..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {configSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Programme parameters successfully updated!</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: POINTS RULES */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Points Awarding Rules per Service</h3>
            <p className="text-xs text-slate-400">
              Set how many points are credited when a customer completes each wash service.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {carWash.services?.map((svc) => {
              const currentPts = ruleEdits[svc.id] !== undefined ? ruleEdits[svc.id] : 10;

              return (
                <div key={svc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{svc.name}</h4>
                    <p className="text-xs text-slate-500">
                      Price: BND {Number(svc.price).toFixed(2)} • Duration: {svc.duration} mins
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={currentPts}
                        onChange={(e) =>
                          setRuleEdits({
                            ...ruleEdits,
                            [svc.id]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-500 uppercase">PTS</span>
                    </div>

                    <button
                      type="button"
                      disabled={savingRules}
                      onClick={() => handleSaveRule(svc)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REWARDS CATALOG */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-800">Redeemable Rewards Catalog</h3>
              <p className="text-xs text-slate-400">Offer free washes, add-ons, or percentage discounts.</p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRewardModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Add New Reward
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-sm text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full font-mono">
                      {reward.pointsCost} PTS
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      reward.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {reward.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-base">{reward.title}</h4>
                  {reward.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{reward.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {reward.maxRedemptionsPerMember && reward.maxRedemptionsPerMember > 0 ? (
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
                        Limit: {reward.maxRedemptionsPerMember} / customer
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-50 text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-200/60">
                        Unlimited / customer
                      </span>
                    )}
                    {reward.maxTotalSupply && reward.maxTotalSupply > 0 ? (
                      <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                        Cap: {reward.claimCount || 0} / {reward.maxTotalSupply} claimed
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-50 text-slate-500 font-semibold px-2 py-0.5 rounded-md border border-slate-200/60">
                        Unlimited supply
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenRewardModal(reward)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Reward
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Enrolled Member Directory</h3>
              <p className="text-xs text-slate-400">Total {members.length} registered loyalty accounts</p>
            </div>

            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member, phone, email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Member Number</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Points Balance</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-r-xl">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                      No members match search query.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{m.membershipNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {m.customerName || 'Customer'}
                        {m.customerEmail && <span className="block text-[10px] text-slate-400 font-normal">{m.customerEmail}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-indigo-700 text-sm">{m.pointsBalance} pts</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(m.joinedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewLedger(m)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingMember(m);
                            setAdjustPointsDelta('');
                            setAdjustReason('');
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                        >
                          Adjust Points
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REDEMPTIONS HISTORY */}
      {activeTab === 'redemptions' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">Customer Voucher Redemptions</h3>
              <p className="text-xs text-slate-400">Audit log of all vouchers redeemed by members at your station.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCounterModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <QrCode className="h-4 w-4" /> Scan &amp; Confirm Voucher
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Voucher Code</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Reward Item</th>
                  <th className="px-4 py-3">Points Spent</th>
                  <th className="px-4 py-3">Date Claimed</th>
                  <th className="px-4 py-3 text-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                      No voucher redemptions yet.
                    </td>
                  </tr>
                ) : (
                  redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.redemptionCode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.customerName || 'Customer'}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{r.rewardTitle}</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-600">-{r.pointsSpent} pts</td>
                      <td className="px-4 py-3 text-slate-500">
                        <div className="font-semibold text-slate-700">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </div>
                        {r.redeemedAt ? (
                          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                            ✓ Redeemed: {new Date(r.redeemedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                            ⏳ Ready to Claim
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : r.status === 'REDEEMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COUNTER QR POSTER */}
      {activeTab === 'poster' && (
        <div className="space-y-6">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-counter-standee, #printable-counter-standee * {
                visibility: visible !important;
              }
              #printable-counter-standee {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 100% !important;
                max-width: 440px !important;
                margin: 0 auto !important;
                border: 2px solid #94a3b8 !important;
                box-shadow: none !important;
                padding: 2.5rem !important;
                border-radius: 1.5rem !important;
                background: #ffffff !important;
              }
            }
          `}</style>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Printer className="h-5 w-5 text-indigo-600" /> Counter Enrollment Standee Poster
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Display this official QR standee at your payment counter or customer waiting lounge. Customers simply point their phone camera to view rewards and join your loyalty programme in 5 seconds.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Join Link</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={joinUrl}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer transition-colors"
                      title="Copy Link"
                      id="btn-copy-join-link"
                    >
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-print-standee"
                  >
                    <Printer className="h-4 w-4" /> Print Standee Poster
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!posterQrUrl) return;
                      const a = document.createElement('a');
                      a.href = posterQrUrl;
                      const safeName = (carWash.slug || carWash.name || 'rewards').toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      a.download = `AutoShine_Rewards_Standee_${safeName}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    disabled={!posterQrUrl}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                      posterQrUrl
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                    id="btn-download-standee-qr"
                  >
                    <Download className="h-4 w-4" /> Download QR (PNG)
                  </button>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Counter Tip:</strong> Print in high-res or laminate in an acrylic standee for your reception desk. Walk-in customers who scan will automatically register to your specific station's Rewards Club!
                  </span>
                </div>
              </div>
            </div>

            {/* Printable Standee Mockup */}
            <div className="md:col-span-6 flex justify-center">
              <div
                id="printable-counter-standee"
                className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-4 max-w-sm w-full mx-auto"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 block">
                    AutoShine BN Loyalty Club
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 break-words">{carWash.name}</h3>
                  <p className="text-xs text-slate-500">Scan Below to Join &amp; Earn Free Detailing Washes</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-flex flex-col items-center justify-center shadow-inner min-w-[240px] min-h-[240px] mx-auto">
                  {posterQrUrl ? (
                    <img
                      src={posterQrUrl}
                      alt="Counter Join QR Standee"
                      className="w-56 h-56 rounded-xl mx-auto block shadow-xs transition-opacity duration-200"
                    />
                  ) : isGeneratingQr ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-xs font-bold text-slate-600">Generating Standee QR...</span>
                    </div>
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <span className="text-xs font-bold text-slate-700">QR Generation Pending</span>
                      <button
                        type="button"
                        onClick={generatePosterQr}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        Generate QR Code
                      </button>
                    </div>
                  )}
                  <canvas ref={posterCanvasRef} className="hidden" />
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p className="font-extrabold text-slate-800 text-sm">📱 Point Camera to Scan</p>
                  <p className="text-[11px] text-slate-400">Instant digital member pass • Earn points on every wash</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Reward */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingReward ? 'Edit Reward' : 'Add New Reward'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRewardModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Reward Title</label>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="e.g. Complimentary Deluxe Wash"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  placeholder="Redeemable for any sedan or SUV..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Points Cost</label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={rewardPointsCost}
                    onChange={(e) => setRewardPointsCost(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Reward Type</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FREE_SERVICE">Free Service / Wash</option>
                    <option value="DISCOUNT_FIXED">Fixed Dollar Discount</option>
                    <option value="DISCOUNT_PERCENT">Percentage Discount</option>
                    <option value="CUSTOM">Custom Perk</option>
                  </select>
                </div>
              </div>

              {(rewardType === 'DISCOUNT_FIXED' || rewardType === 'DISCOUNT_PERCENT') && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {rewardType === 'DISCOUNT_FIXED' ? 'Discount Amount ($ BND)' : 'Discount Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={rewardDiscountVal}
                    onChange={(e) => setRewardDiscountVal(e.target.value)}
                    placeholder="e.g. 10.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Max Per Customer
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rewardMaxPerMember}
                    onChange={(e) => setRewardMaxPerMember(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0 = unlimited"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">0 for unlimited, or e.g. 1 / 2 per member</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Total Voucher Stock Cap
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rewardMaxTotalSupply}
                    onChange={(e) => setRewardMaxTotalSupply(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0 = unlimited"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">0 for unlimited, or e.g. first 50 claims</p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rewardIsActive}
                  onChange={(e) => setRewardIsActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-semibold">Active &amp; Visible to Customers in Catalog</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReward}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingReward ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Member Activity Ledger */}
      {selectedMemberLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Points Activity Ledger</h3>
                <p className="text-xs text-slate-400">
                  {selectedMemberLedger.member.customerName || 'Customer'} • Member #{selectedMemberLedger.member.membershipNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberLedger(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {selectedMemberLedger.ledger.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">No transactions recorded yet.</div>
              ) : (
                selectedMemberLedger.ledger.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{item.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleString()} • Post-balance: {item.balanceAfter} pts
                      </p>
                    </div>
                    <span className={`font-mono font-bold ${item.pointsDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.pointsDelta > 0 ? `+${item.pointsDelta}` : item.pointsDelta} pts
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMemberLedger(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audited Points Adjustment */}
      {adjustingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Audited Points Adjustment</h3>
              <button
                type="button"
                onClick={() => setAdjustingMember(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <p className="text-slate-600">
                Member: <strong className="text-slate-900">{adjustingMember.customerName || adjustingMember.membershipNumber}</strong>
              </p>
              <p className="text-slate-600">
                Current Balance: <strong className="font-mono text-indigo-700">{adjustingMember.pointsBalance} pts</strong>
              </p>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Points Delta (e.g. +50 or -30)
                </label>
                <input
                  type="number"
                  value={adjustPointsDelta}
                  onChange={(e) => setAdjustPointsDelta(e.target.value)}
                  placeholder="+50 or -30"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mandatory Audit Reason Note
                </label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Courtesy compensation for waiting time, or manual bay correction"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingMember(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isAdjusting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff & Owner Counter Terminal & Voucher Scanner Modal */}
      <StaffMembershipCounterModal
        carWashId={carWash.id}
        isOpen={showCounterModal}
        onClose={() => {
          setShowCounterModal(false);
          fetchData();
        }}
      />
    </div>
  );
};
