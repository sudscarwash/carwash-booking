import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Award, 
  Gift, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  QrCode, 
  X, 
  ArrowUpRight, 
  RefreshCw, 
  ShieldCheck, 
  Percent, 
  Car, 
  Coins, 
  UserCheck, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { 
  CarWash, 
  CustomerMembership, 
  MembershipReward, 
  MembershipRedemption, 
  MembershipPointsLedger,
  CarWashMembershipConfig 
} from '../types.js';

interface LoyaltyMembershipCustomerViewProps {
  locations: CarWash[];
  token: string | null;
  currentUser: any;
}

export const LoyaltyMembershipCustomerView: React.FC<LoyaltyMembershipCustomerViewProps> = ({
  locations,
  token,
  currentUser,
}) => {
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<CustomerMembership | null>(null);
  const [config, setConfig] = useState<CarWashMembershipConfig | null>(null);
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [ledger, setLedger] = useState<MembershipPointsLedger[]>([]);
  const [redemptions, setRedemptions] = useState<MembershipRedemption[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'card' | 'rewards' | 'vouchers' | 'activity'>('card');
  
  // Modals
  const [qrModalData, setQrModalData] = useState<{ title: string; subtitle: string; code: string; qrUrl: string } | null>(null);
  const [redeemingReward, setRedeemingReward] = useState<MembershipReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionSuccessVoucher, setRedemptionSuccessVoucher] = useState<MembershipRedemption | null>(null);
  
  // Join Flow
  const [selectedJoinCarWash, setSelectedJoinCarWash] = useState<CarWash | null>(null);
  const [joinConsent, setJoinConsent] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch customer memberships
  const fetchMemberships = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/membership/my-memberships', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemberships(data);
        if (data.length > 0 && !selectedMembership) {
          setSelectedMembership(data[0]);
        } else if (selectedMembership) {
          // Keep selection updated
          const updated = data.find((m: CustomerMembership) => m.id === selectedMembership.id);
          if (updated) setSelectedMembership(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details when selectedMembership changes
  useEffect(() => {
    if (!selectedMembership || !token) return;

    const loadMembershipDetails = async () => {
      try {
        const safeJson = async (res: Response) => {
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

        // Fetch config & rules
        const [configRes, rewardsRes, ledgerRes, redemptionsRes] = await Promise.all([
          fetch(`/api/membership/programme/${selectedMembership.carWashId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/membership/rewards/${selectedMembership.carWashId}?active=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/membership/ledger/${selectedMembership.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/membership/my-redemptions', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const cfgData = await safeJson(configRes);
        if (cfgData) setConfig(cfgData);

        const rewardsData = await safeJson(rewardsRes);
        if (rewardsData && Array.isArray(rewardsData)) setRewards(rewardsData);

        const ledgerData = await safeJson(ledgerRes);
        if (ledgerData && Array.isArray(ledgerData)) setLedger(ledgerData);

        const redemptionsData = await safeJson(redemptionsRes);
        if (redemptionsData && Array.isArray(redemptionsData)) {
          // Filter to this car wash
          setRedemptions(redemptionsData.filter((r: MembershipRedemption) => r.carWashId === selectedMembership.carWashId));
        }
      } catch (err) {
        console.error('Failed to load membership details:', err);
      }
    };

    loadMembershipDetails();
  }, [selectedMembership, token]);

  useEffect(() => {
    fetchMemberships();
  }, [token]);

  // Open QR modal for member card
  const handleShowMemberQR = async (membership: CustomerMembership) => {
    try {
      const qr = await QRCode.toDataURL(membership.qrToken || membership.membershipNumber, {
        width: 320,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      setQrModalData({
        title: `${membership.carWashName || 'Car Wash'} Member Card`,
        subtitle: `Present this QR at the bay counter to earn wash points instantly`,
        code: membership.membershipNumber,
        qrUrl: qr,
      });
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  // Open QR modal for redemption voucher
  const handleShowVoucherQR = async (voucher: MembershipRedemption) => {
    try {
      const qr = await QRCode.toDataURL(voucher.qrToken || voucher.redemptionCode, {
        width: 320,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      setQrModalData({
        title: `Redeem: ${voucher.rewardTitle}`,
        subtitle: `Show this voucher barcode to the cashier/staff to claim your reward`,
        code: voucher.redemptionCode,
        qrUrl: qr,
      });
    } catch (err) {
      console.error('Failed to generate voucher QR:', err);
    }
  };

  // Redeem Reward
  const handleConfirmRedeem = async () => {
    if (!redeemingReward || !selectedMembership || !token) return;
    setIsRedeeming(true);
    try {
      const res = await fetch('/api/membership/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carWashId: selectedMembership.carWashId,
          rewardId: redeemingReward.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem reward');
      }

      setRedemptionSuccessVoucher(data.redemption);
      setRedeemingReward(null);
      // Refresh details
      fetchMemberships();
      setActiveSubTab('vouchers');
    } catch (err: any) {
      alert(err.message || 'Redemption failed');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Join Club
  const handleJoinClub = async () => {
    if (!selectedJoinCarWash || !token || !joinConsent) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/membership/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carWashId: selectedJoinCarWash.id,
          joinMethod: 'ONLINE_OPT_IN',
          consentGiven: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join membership');
      }

      setSelectedJoinCarWash(null);
      setJoinConsent(false);
      await fetchMemberships();
      setSelectedMembership(data);
      setActiveSubTab('card');
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join loyalty club');
    } finally {
      setIsJoining(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Available car washes that customer hasn't joined yet
  const availableToJoin = locations.filter(
    (loc) => loc.membershipEnabled && !memberships.some((m) => m.carWashId === loc.id)
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Autoshine Loyalty &amp; Rewards Club</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Wash, Earn &amp; Unlock Free Detailing
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Earn reward points every time you book online or wash at our bays. Redeem points for free premium washes, add-on treatments, and exclusive discounts.
            </p>
          </div>

          {/* Membership Selector or Join Prompt */}
          {memberships.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex flex-col gap-2 min-w-[240px]">
              <span className="text-[11px] uppercase font-bold text-slate-300 tracking-wider">Active Club Card</span>
              <select
                value={selectedMembership?.id || ''}
                onChange={(e) => {
                  const found = memberships.find((m) => m.id === e.target.value);
                  if (found) setSelectedMembership(found);
                }}
                className="bg-slate-900/90 text-white font-bold text-sm px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {memberships.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.carWashName || 'Car Wash'} ({m.pointsBalance} pts)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* If customer has memberships */}
      {memberships.length > 0 && selectedMembership ? (
        <div className="space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
            <button
              onClick={() => setActiveSubTab('card')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'card'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <CreditCard className="h-4 w-4" /> Digital Member Card
            </button>
            <button
              onClick={() => setActiveSubTab('rewards')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'rewards'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Gift className="h-4 w-4" /> Rewards Catalog ({rewards.length})
            </button>
            <button
              onClick={() => setActiveSubTab('vouchers')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'vouchers'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Award className="h-4 w-4" /> My Vouchers ({redemptions.length})
            </button>
            <button
              onClick={() => setActiveSubTab('activity')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'activity'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Clock className="h-4 w-4" /> Points Activity ({ledger.length})
            </button>
          </div>

          {/* TAB 1: DIGITAL MEMBER CARD */}
          {activeSubTab === 'card' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Virtual Membership Card */}
              <div className="lg:col-span-7">
                <div className="relative rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-950 border border-indigo-500/30">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 flex items-start justify-between pb-8">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block mb-1">
                        Official Loyalty Pass
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                        {selectedMembership.carWashName || 'Autoshine BN Partner'}
                      </h3>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        {config?.programmeName || 'VIP Rewards Club'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full text-xs font-black tracking-wider uppercase">
                      ● Active Member
                    </span>
                  </div>

                  <div className="relative z-10 py-4 border-y border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-indigo-200 block">Available Points</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-black text-amber-300">
                          {selectedMembership.pointsBalance.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">PTS</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] uppercase font-bold text-indigo-200 block">Member Number</span>
                      <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-sm tracking-wider bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                        <span>{selectedMembership.membershipNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(selectedMembership.membershipNumber)}
                          className="hover:text-amber-300 transition-colors"
                          title="Copy member code"
                        >
                          {copiedCode === selectedMembership.membershipNumber ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Cardholder</span>
                      <span className="text-sm font-bold block">{currentUser?.name || 'Valued Customer'}</span>
                      <span className="text-[11px] text-indigo-200/80">
                        Enrolled {new Date(selectedMembership.joinedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleShowMemberQR(selectedMembership)}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" /> Show Member QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Side Card: Quick Perks & How To Earn */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800 text-base">Club Benefits &amp; Perks</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {config?.programmeDescription || 'Earn points automatically whenever you complete a wash booking online or present your member QR code at the counter.'}
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <Coins className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Earn Automatically on Bookings</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Points are automatically credited to your balance when your online bay booking is completed.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <QrCode className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Walk-In &amp; Counter Washes</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Visiting in person? Simply tap "Show Member QR" above so staff can scan and award your points!</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <Gift className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">Instant Voucher Unlocks</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Redeem points for full service washes or percentage discounts. Vouchers are saved in your wallet.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REWARDS CATALOG */}
          {activeSubTab === 'rewards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Available Rewards</h3>
                  <p className="text-xs text-slate-500">
                    Your balance: <strong className="text-indigo-600 font-black">{selectedMembership.pointsBalance} PTS</strong>
                  </p>
                </div>
              </div>

              {rewards.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                  <Gift className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No rewards published yet</p>
                  <p className="text-xs">The operator is updating their rewards catalog. Check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => {
                    const canAfford = selectedMembership.pointsBalance >= reward.pointsCost;
                    const progress = Math.min(100, Math.round((selectedMembership.pointsBalance / reward.pointsCost) * 100));
                    const userClaimsForThisReward = redemptions.filter(
                      (r) => r.rewardId === reward.id && r.status !== 'CANCELLED'
                    ).length;
                    const isPerMemberCapped =
                      Boolean(reward.maxRedemptionsPerMember &&
                      reward.maxRedemptionsPerMember > 0 &&
                      userClaimsForThisReward >= reward.maxRedemptionsPerMember);
                    const isSupplyExhausted =
                      Boolean(reward.maxTotalSupply &&
                      reward.maxTotalSupply > 0 &&
                      (reward.claimCount || 0) >= reward.maxTotalSupply);
                    const canRedeem = canAfford && !isPerMemberCapped && !isSupplyExhausted;

                    return (
                      <div
                        key={reward.id}
                        className={`bg-white rounded-3xl p-5 border flex flex-col justify-between transition-all ${
                          canRedeem ? 'border-indigo-200 shadow-sm hover:border-indigo-400 hover:shadow-md' : 'border-slate-200 opacity-90'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                              <Gift className="h-5 w-5" />
                            </span>
                            <span className="font-black text-sm text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full font-mono">
                              {reward.pointsCost} PTS
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{reward.title}</h4>
                            {reward.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{reward.description}</p>
                            )}
                          </div>

                          {/* Member limit & stock badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {reward.maxRedemptionsPerMember && reward.maxRedemptionsPerMember > 0 ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  isPerMemberCapped
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {isPerMemberCapped
                                  ? `Limit reached (${reward.maxRedemptionsPerMember} max)`
                                  : `Limit: ${userClaimsForThisReward} / ${reward.maxRedemptionsPerMember} claimed`}
                              </span>
                            ) : null}
                            {reward.maxTotalSupply && reward.maxTotalSupply > 0 ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  isSupplyExhausted
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isSupplyExhausted
                                  ? 'All Claimed Out'
                                  : `${Math.max(0, reward.maxTotalSupply - (reward.claimCount || 0))} vouchers left`}
                              </span>
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className={canAfford ? 'text-emerald-600' : 'text-slate-400'}>
                                {canAfford ? 'Ready to claim!' : `${reward.pointsCost - selectedMembership.pointsBalance} pts needed`}
                              </span>
                              <span className="text-slate-500">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  canAfford ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={!canRedeem}
                            onClick={() => setRedeemingReward(reward)}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              canRedeem
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Gift className="h-4 w-4" />{' '}
                            {isSupplyExhausted
                              ? 'All Claimed Out'
                              : isPerMemberCapped
                              ? 'Member Limit Reached'
                              : canAfford
                              ? 'Redeem Voucher'
                              : 'Insufficient Points'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY REWARD VOUCHERS */}
          {activeSubTab === 'vouchers' && (
            <div className="space-y-4">
              <div className="pb-2">
                <h3 className="text-lg font-bold text-slate-800">My Reward Vouchers Wallet</h3>
                <p className="text-xs text-slate-500">Show voucher barcodes to staff at the counter to claim your free washes and discounts.</p>
              </div>

              {redemptions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                  <Award className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No vouchers yet</p>
                  <p className="text-xs">Redeem your loyalty points from the Rewards Catalog tab above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {redemptions.map((voucher) => {
                    const isPending = voucher.status === 'PENDING';
                    const isRedeemed = voucher.status === 'REDEEMED';
                    const isExpired = voucher.status === 'EXPIRED';

                    return (
                      <div
                        key={voucher.id}
                        className={`bg-white rounded-3xl p-5 border flex flex-col justify-between transition-all ${
                          isPending ? 'border-amber-200 shadow-sm' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : isRedeemed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isPending ? '● Valid & Ready to Use' : isRedeemed ? '✓ Redeemed' : 'Expired'}
                              </span>
                              <h4 className="font-bold text-slate-800 text-base mt-2">{voucher.rewardTitle}</h4>
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                              -{voucher.pointsSpent} PTS
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                              <span className="font-mono font-black text-sm text-slate-800 tracking-wider">
                                {voucher.redemptionCode}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyCode(voucher.redemptionCode)}
                              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Copy code"
                            >
                              {copiedCode === voucher.redemptionCode ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            Issued: {new Date(voucher.redeemedAt).toLocaleDateString()}
                            {voucher.expiresAt && ` • Valid until ${new Date(voucher.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>

                        {isPending && (
                          <div className="pt-4 mt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleShowVoucherQR(voucher)}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              <QrCode className="h-4 w-4" /> Show Voucher QR for Staff
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITY LEDGER */}
          {activeSubTab === 'activity' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Points Activity Ledger</h3>
                <p className="text-xs text-slate-500">Chronological history of points earned, spent, and adjusted.</p>
              </div>

              {ledger.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  No activity recorded on this membership yet. Complete a wash booking to earn your first points!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ledger.map((item) => {
                    const isPositive = item.pointsDelta > 0;
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                            isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPositive ? '+' : '-'}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.description}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {new Date(item.createdAt).toLocaleString()} • Balance after: {item.balanceAfter} pts
                            </p>
                          </div>
                        </div>

                        <span className={`font-mono font-black text-sm ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {isPositive ? `+${item.pointsDelta}` : item.pointsDelta} PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* If user has no active memberships yet */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <Award className="h-16 w-16 mx-auto text-indigo-500" />
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-800">You Haven't Joined Any Loyalty Clubs Yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Join your favourite car wash's rewards club to automatically earn points on every online booking or walk-in wash!
            </p>
          </div>
        </div>
      )}

      {/* Available Car Wash Clubs to Join */}
      {availableToJoin.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">Explore &amp; Join More Rewards Clubs</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableToJoin.map((loc) => (
              <div key={loc.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{loc.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{loc.address}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedJoinCarWash(loc);
                    setJoinConsent(false);
                    setJoinError(null);
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-indigo-200 flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Join Loyalty Programme
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Confirm Reward Redemption */}
      {redeemingReward && selectedMembership && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <Gift className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800">Redeem Reward?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are about to redeem <strong className="text-slate-800">{redeemingReward.title}</strong> for{' '}
                <strong className="text-indigo-600">{redeemingReward.pointsCost} points</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1.5 text-left">
              <div className="flex justify-between">
                <span>Current Balance:</span>
                <strong className="font-mono">{selectedMembership.pointsBalance} pts</strong>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Points Deducted:</span>
                <strong className="font-mono">-{redeemingReward.pointsCost} pts</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                <span>Remaining Balance:</span>
                <strong className="font-mono">{selectedMembership.pointsBalance - redeemingReward.pointsCost} pts</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRedeemingReward(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRedeeming}
                onClick={handleConfirmRedeem}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isRedeeming ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Redeeming...
                  </>
                ) : (
                  'Confirm & Generate Voucher'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Display Member or Voucher QR Code */}
      {qrModalData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">{qrModalData.title}</h3>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">{qrModalData.subtitle}</p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-center">
              <img src={qrModalData.qrUrl} alt="QR Code" className="w-56 h-56 rounded-xl shadow-xs" />
            </div>

            <div className="bg-slate-100 p-2.5 rounded-xl font-mono font-black text-sm text-slate-800 tracking-wider flex items-center justify-center gap-2">
              <span>{qrModalData.code}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(qrModalData.code)}
                className="hover:text-indigo-600"
                title="Copy code"
              >
                {copiedCode === qrModalData.code ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setQrModalData(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal: Join Programme Opt-in Flow */}
      {selectedJoinCarWash && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">Join Loyalty Programme</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJoinCarWash(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base">{selectedJoinCarWash.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedJoinCarWash.address}</p>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs text-slate-600 space-y-2">
              <p className="font-bold text-indigo-950">Programme Membership Terms:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Earn points on all completed online bay bookings and counter washes.</li>
                <li>Redeem points anytime for free washes, waxes, and detailing discounts.</li>
                <li>Points are tied to this car wash partner and your registered customer profile.</li>
                <li>You can leave the loyalty programme at any time from your dashboard.</li>
              </ul>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={joinConsent}
                onChange={(e) => setJoinConsent(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>
                I agree to enroll in {selectedJoinCarWash.name}&apos;s customer rewards programme and accept the terms.
              </span>
            </label>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedJoinCarWash(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!joinConsent || isJoining}
                onClick={handleJoinClub}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enrolling...
                  </>
                ) : (
                  'Activate Membership Card'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
