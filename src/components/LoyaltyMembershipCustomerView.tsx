import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Check,
  LogOut,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Ticket,
  Filter
} from 'lucide-react';
import { 
  CarWash, 
  CustomerMembership, 
  MembershipReward, 
  MembershipRedemption, 
  MembershipPointsLedger,
  CarWashMembershipConfig 
} from '../types.js';
import { useApp } from '../context/AppContext.js';
import { HorizontalScrollNav } from './HorizontalScrollNav.js';

interface LoyaltyMembershipCustomerViewProps {
  locations: CarWash[];
  token: string | null;
  currentUser: any;
  onNavigateToBook?: () => void;
}

// Helper to safely parse JSON responses and avoid '<!doctype' HTML syntax errors
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

export const LoyaltyMembershipCustomerView: React.FC<LoyaltyMembershipCustomerViewProps> = ({
  locations,
  token,
  currentUser,
  onNavigateToBook,
}) => {
  const { myMemberships, fetchMyMemberships, leaveCarWashMembership, showNotification } = useApp();
  const [memberships, setMemberships] = useState<CustomerMembership[]>(() => myMemberships || []);
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
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redemptionSuccessVoucher, setRedemptionSuccessVoucher] = useState<MembershipRedemption | null>(null);
  
  // Leave Club Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Join Flow
  const [selectedJoinCarWash, setSelectedJoinCarWash] = useState<CarWash | null>(null);
  const [joinConsent, setJoinConsent] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningCarWashId, setJoiningCarWashId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Rewards Catalog discovery & organization state
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState<'ALL' | 'REDEEMABLE' | 'FREE_SERVICE' | 'FREE_ADDON' | 'DISCOUNT' | 'CUSTOM'>('ALL');
  const [rewardSort, setRewardSort] = useState<'POINTS_ASC' | 'POINTS_DESC' | 'ALPHA_ASC'>('POINTS_ASC');
  const [collapsedRewardCats, setCollapsedRewardCats] = useState<Record<string, boolean>>({});
  const [expandedRewardCats, setExpandedRewardCats] = useState<Record<string, boolean>>({});
  const [showAllFilteredRewards, setShowAllFilteredRewards] = useState(false);

  // Vouchers & Activity view-all state
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'PENDING' | 'REDEEMED'>('ALL');
  const [showAllVouchers, setShowAllVouchers] = useState(false);
  const [showAllLedger, setShowAllLedger] = useState(false);

  // Explore & Join Clubs discovery state
  const [clubSearch, setClubSearch] = useState('');
  const [clubAlphabetFilter, setClubAlphabetFilter] = useState<string>('ALL');
  const [clubSort, setClubSort] = useState<'DEFAULT' | 'ALPHA_ASC'>('DEFAULT');
  const [clubVisibleCount, setClubVisibleCount] = useState<number>(4);
  const [isExploreClubsCollapsed, setIsExploreClubsCollapsed] = useState(false);

  // Keep memberships state in sync with context myMemberships
  useEffect(() => {
    if (myMemberships) {
      setMemberships(myMemberships);
    }
  }, [myMemberships]);

  // Active valid memberships for this customer
  const activeValidMemberships = useMemo(() => {
    return memberships.filter((m) => m.status === 'ACTIVE');
  }, [memberships]);

  // Available car washes that customer hasn't joined yet
  const availableToJoin = useMemo(() => {
    return locations.filter(
      (loc) => loc.isActive !== false && !activeValidMemberships.some((m) => m.carWashId === loc.id)
    );
  }, [locations, activeValidMemberships]);

  const clubDiscovery = useMemo(() => {
    const q = clubSearch.trim().toLowerCase();
    const searchMatched = q
      ? availableToJoin.filter(
          (loc) =>
            (loc.name || '').toLowerCase().includes(q) ||
            (loc.address || '').toLowerCase().includes(q) ||
            (loc.description || '').toLowerCase().includes(q)
        )
      : availableToJoin;

    const getBucket = (name?: string) => {
      const ch = (name || '').trim().charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(ch)) return ch;
      if (/^[0-9]$/.test(ch)) return '0-9';
      return '#';
    };

    const alphabetCounts: Record<string, number> = {
      ALL: searchMatched.length,
      '0-9': 0,
      '#': 0,
    };
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      alphabetCounts[letter] = 0;
    }
    for (const loc of searchMatched) {
      const bucket = getBucket(loc.name);
      alphabetCounts[bucket] = (alphabetCounts[bucket] || 0) + 1;
    }

    const alphaFiltered =
      clubAlphabetFilter === 'ALL'
        ? searchMatched
        : searchMatched.filter((loc) => getBucket(loc.name) === clubAlphabetFilter);

    const sorted =
      clubSort === 'ALPHA_ASC'
        ? [...alphaFiltered].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
          )
        : alphaFiltered;

    return {
      searchMatchedCount: searchMatched.length,
      alphabetCounts,
      filtered: sorted,
    };
  }, [availableToJoin, clubSearch, clubAlphabetFilter, clubSort]);

  const filteredAvailableToJoin = clubDiscovery.filtered;

  useEffect(() => {
    setClubVisibleCount(4);
  }, [clubSearch, clubAlphabetFilter, clubSort]);

  const pendingVouchersCount = useMemo(() => {
    return redemptions.filter((r) => r.status === 'PENDING').length;
  }, [redemptions]);

  const rewardDiscovery = useMemo(() => {
    const userBalance = Number(selectedMembership?.pointsBalance || 0);
    const q = rewardSearch.trim().toLowerCase();

    const getCategoryGroup = (reward: MembershipReward): 'FREE_SERVICE' | 'FREE_ADDON' | 'DISCOUNT' | 'CUSTOM' => {
      if (reward.rewardType === 'FREE_SERVICE') return 'FREE_SERVICE';
      if (reward.rewardType === 'FREE_ADDON') return 'FREE_ADDON';
      if (reward.rewardType === 'DISCOUNT_PERCENT' || reward.rewardType === 'FIXED_DISCOUNT') return 'DISCOUNT';
      return 'CUSTOM';
    };

    const isRedeemableNow = (reward: MembershipReward) => {
      const cost = Number(reward.pointsCost || 100);
      if (userBalance < cost) return false;
      const claims = redemptions.filter((r) => r.rewardId === reward.id && r.status !== 'CANCELLED').length;
      if (reward.maxRedemptionsPerMember && reward.maxRedemptionsPerMember > 0 && claims >= reward.maxRedemptionsPerMember) return false;
      if (reward.maxTotalSupply && reward.maxTotalSupply > 0 && (reward.claimCount || 0) >= reward.maxTotalSupply) return false;
      return true;
    };

    const categoryCounts = {
      ALL: rewards.length,
      REDEEMABLE: rewards.filter(isRedeemableNow).length,
      FREE_SERVICE: rewards.filter((r) => getCategoryGroup(r) === 'FREE_SERVICE').length,
      FREE_ADDON: rewards.filter((r) => getCategoryGroup(r) === 'FREE_ADDON').length,
      DISCOUNT: rewards.filter((r) => getCategoryGroup(r) === 'DISCOUNT').length,
      CUSTOM: rewards.filter((r) => getCategoryGroup(r) === 'CUSTOM').length,
    };

    const filtered = rewards.filter((r) => {
      if (q) {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const descMatch = (r.description || '').toLowerCase().includes(q);
        const typeMatch = (r.rewardType || '').toLowerCase().replace('_', ' ').includes(q);
        if (!titleMatch && !descMatch && !typeMatch) return false;
      }
      if (rewardCategoryFilter === 'REDEEMABLE') return isRedeemableNow(r);
      if (rewardCategoryFilter !== 'ALL') return getCategoryGroup(r) === rewardCategoryFilter;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (rewardSort === 'POINTS_DESC') return Number(b.pointsCost || 0) - Number(a.pointsCost || 0);
      if (rewardSort === 'ALPHA_ASC') return (a.title || '').localeCompare(b.title || '');
      return Number(a.pointsCost || 0) - Number(b.pointsCost || 0);
    });

    const groupsMeta: Array<{ key: 'FREE_SERVICE' | 'FREE_ADDON' | 'DISCOUNT' | 'CUSTOM'; label: string; subtitle: string }> = [
      { key: 'FREE_SERVICE', label: 'Free Washes & Services', subtitle: 'Complimentary wash packages you can unlock' },
      { key: 'FREE_ADDON', label: 'Free Add-ons & Extras', subtitle: 'Interior, wax, and detailing upgrades' },
      { key: 'DISCOUNT', label: 'Discounts & Vouchers', subtitle: 'Percentage or dollar savings on washes' },
      { key: 'CUSTOM', label: 'Special VIP Perks', subtitle: 'Exclusive member-only rewards' },
    ];

    const grouped = groupsMeta
      .map((meta) => ({
        ...meta,
        items: sorted.filter((r) => getCategoryGroup(r) === meta.key),
      }))
      .filter((g) => g.items.length > 0);

    return { categoryCounts, sorted, grouped };
  }, [rewards, redemptions, selectedMembership?.pointsBalance, rewardSearch, rewardCategoryFilter, rewardSort]);

  const [viewingCarWashId, setViewingCarWashId] = useState<string>(() => {
    return locations.length > 0 ? locations[0].id : 'cw_brunei';
  });

  // Keep selectedMembership strictly synchronized with activeValidMemberships
  useEffect(() => {
    if (activeValidMemberships.length > 0) {
      if (!selectedMembership || !activeValidMemberships.some((m) => m.id === selectedMembership.id)) {
        setSelectedMembership(activeValidMemberships[0]);
        setViewingCarWashId(activeValidMemberships[0].carWashId);
      } else {
        // ALWAYS keep selectedMembership up to date with fresh pointsBalance, name, and status
        const fresh = activeValidMemberships.find((m) => m.id === selectedMembership.id);
        if (fresh && (fresh.pointsBalance !== selectedMembership.pointsBalance || fresh.updatedAt !== selectedMembership.updatedAt)) {
          setSelectedMembership(fresh);
        }
      }
    } else {
      if (selectedMembership !== null) {
        setSelectedMembership(null);
        setConfig(null);
        setLedger([]);
      }
    }
  }, [activeValidMemberships, selectedMembership]);

  // Fetch customer memberships
  const fetchMemberships = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/membership/my-memberships', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonFetch(res);
      if (Array.isArray(data)) {
        setMemberships(data);
      }
    } catch (err) {
      console.error('Failed to load memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLeaveClub = async () => {
    if (!selectedMembership) return;
    setIsLeaving(true);
    try {
      const ok = await leaveCarWashMembership(selectedMembership.carWashId);
      if (ok) {
        setShowLeaveModal(false);
        if (fetchMyMemberships) await fetchMyMemberships();
        await fetchMemberships();
        setSelectedMembership(null);
      }
    } finally {
      setIsLeaving(false);
    }
  };

  // Fetch customer vouchers across all car washes
  const fetchMyVouchers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/membership/my-redemptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonFetch(res);
      if (Array.isArray(data)) {
        setRedemptions(data);
      }
    } catch (err) {
      console.error('Failed to load my-redemptions:', err);
    }
  }, [token]);

  // Fetch catalog rewards for the currently viewed car wash
  const fetchCatalogRewards = useCallback(async (carWashId: string) => {
    if (!carWashId) return;
    try {
      const res = await fetch(`/api/membership/rewards/${carWashId}?active=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await safeJsonFetch(res);
      if (Array.isArray(data)) {
        setRewards(data);
      } else {
        setRewards([]);
      }
    } catch (err) {
      console.error('Failed to load rewards:', err);
    }
  }, [token]);

  // Fetch programme config for the currently viewed car wash
  const fetchProgrammeConfig = useCallback(async (carWashId: string) => {
    if (!carWashId) return;
    try {
      const res = await fetch(`/api/membership/programme/${carWashId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await safeJsonFetch(res);
      if (data && data.isFeatureEnabled) {
        setConfig(data);
      } else {
        setConfig(null);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }, [token]);

  // Fetch points activity ledger for selected membership
  const fetchLedger = useCallback(async (membershipId: string) => {
    if (!membershipId || !token) {
      setLedger([]);
      return;
    }
    try {
      const res = await fetch(`/api/membership/ledger/${membershipId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonFetch(res);
      if (Array.isArray(data)) {
        setLedger(data);
      } else {
        setLedger([]);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    }
  }, [token]);

  const effectiveCarWashId = selectedMembership ? selectedMembership.carWashId : (viewingCarWashId || (locations.length > 0 ? locations[0].id : 'cw_brunei'));

  // Trigger reward and config fetches whenever effectiveCarWashId changes
  useEffect(() => {
    if (effectiveCarWashId) {
      fetchCatalogRewards(effectiveCarWashId);
      fetchProgrammeConfig(effectiveCarWashId);
    }
  }, [effectiveCarWashId, fetchCatalogRewards, fetchProgrammeConfig]);

  // Trigger ledger fetch whenever selectedMembership changes
  useEffect(() => {
    if (selectedMembership?.id) {
      fetchLedger(selectedMembership.id);
    } else {
      setLedger([]);
    }
  }, [selectedMembership?.id, fetchLedger]);

  // Fetch memberships and customer vouchers on mount and poll
  useEffect(() => {
    fetchMemberships();
    fetchMyVouchers();
    const interval = setInterval(() => {
      fetchMemberships();
      fetchMyVouchers();
      if (fetchMyMemberships) fetchMyMemberships();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, fetchMyVouchers]);

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
    if (!redeemingReward || !token) return;
    const targetCarWashId = redeemingReward.carWashId || selectedMembership?.carWashId;
    if (!targetCarWashId) return;

    setIsRedeeming(true);
    setRedeemError(null);
    try {
      const res = await fetch('/api/membership/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carWashId: targetCarWashId,
          rewardId: redeemingReward.id,
        }),
      });

      const data = await safeJsonOrError(res, 'Failed to redeem reward');
      const newlyRedeemed: MembershipRedemption = data.redemption;

      // 1. Immediately update redemptions state so "My Vouchers" shows the new voucher right away!
      if (newlyRedeemed) {
        setRedemptions((prev) => [newlyRedeemed, ...prev.filter((r) => r.id !== newlyRedeemed.id)]);
      }

      // 2. Immediately update points balance in selected membership and list
      const updatedBalance = typeof data.newBalance === 'number' 
        ? data.newBalance 
        : (typeof data.balanceAfter === 'number' ? data.balanceAfter : undefined);

      if (updatedBalance !== undefined) {
        setSelectedMembership((prev) => (prev ? { ...prev, pointsBalance: updatedBalance } : null));
        setMemberships((prev) =>
          prev.map((m) => (m.id === selectedMembership?.id ? { ...m, pointsBalance: updatedBalance } : m))
        );
      }

      // 3. Open Success Modal
      setRedemptionSuccessVoucher(newlyRedeemed);
      setRedeemingReward(null);
      showNotification(`🎉 Voucher ${newlyRedeemed?.redemptionCode || ''} unlocked!`, 'success');

      // 4. Background re-sync
      fetchMemberships();
      if (fetchMyMemberships) fetchMyMemberships();
      fetchMyVouchers();
      if (selectedMembership) {
        fetchLedger(selectedMembership.id);
      }

      // 5. Switch to vouchers tab
      setActiveSubTab('vouchers');
    } catch (err: any) {
      setRedeemError(err.message || 'Redemption failed');
      showNotification(err.message || 'Redemption failed', 'error');
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

      const data = await safeJsonOrError(res, 'Failed to join membership');

      setSelectedJoinCarWash(null);
      setJoinConsent(false);
      setMemberships((prev) => [data, ...prev.filter((m) => m.id !== data.id)]);
      setSelectedMembership(data);
      setViewingCarWashId(data.carWashId);
      fetchCatalogRewards(data.carWashId);
      fetchProgrammeConfig(data.carWashId);
      fetchLedger(data.id);
      setActiveSubTab('card');
      await fetchMemberships();
      if (fetchMyMemberships) fetchMyMemberships();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join loyalty club');
    } finally {
      setIsJoining(false);
    }
  };

  // 1-Click Quick Join Club without opening modal
  const handleQuickJoinClub = async (carWash: CarWash) => {
    if (!carWash || !token) return;
    setJoiningCarWashId(carWash.id);
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
          carWashId: carWash.id,
          joinMethod: 'ONLINE_OPT_IN',
          consentGiven: true,
        }),
      });

      const data = await safeJsonOrError(res, 'Failed to join membership');
      setMemberships((prev) => [data, ...prev.filter((m) => m.id !== data.id)]);
      setSelectedMembership(data);
      setViewingCarWashId(data.carWashId);
      fetchCatalogRewards(data.carWashId);
      fetchProgrammeConfig(data.carWashId);
      fetchLedger(data.id);
      setActiveSubTab('card');
      await fetchMemberships();
      if (fetchMyMemberships) fetchMyMemberships();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join loyalty club');
    } finally {
      setIsJoining(false);
      setJoiningCarWashId(null);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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

          {/* Membership Selector + Quick My Vouchers Jump */}
          {activeValidMemberships.length > 0 && (
            <div className="flex flex-col gap-2.5 w-full md:w-auto sm:min-w-[260px]">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex flex-col gap-2">
                <span className="text-[11px] uppercase font-bold text-slate-300 tracking-wider">Active Club Card</span>
                <select
                  value={selectedMembership?.id || ''}
                  onChange={(e) => {
                    const found = activeValidMemberships.find((m) => m.id === e.target.value);
                    if (found) {
                      setSelectedMembership(found);
                      setViewingCarWashId(found.carWashId);
                      fetchCatalogRewards(found.carWashId);
                      fetchProgrammeConfig(found.carWashId);
                      fetchLedger(found.id);
                    }
                  }}
                  className="w-full max-w-full bg-slate-900/90 text-white font-bold text-sm px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {activeValidMemberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.carWashName || 'Car Wash'} ({Number(m.pointsBalance ?? 0).toLocaleString()} pts)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('vouchers')}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs font-extrabold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  pendingVouchersCount > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 shadow-lg shadow-amber-950/20'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 text-left">
                  <Ticket className="h-4 w-4 shrink-0" />
                  <span className="leading-snug">My Vouchers</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    pendingVouchersCount > 0
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-white/15 text-slate-200'
                  }`}
                >
                  {pendingVouchersCount > 0 ? `${pendingVouchersCount} Ready` : `${redemptions.length} Total`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* If customer has valid active memberships */}
      {activeValidMemberships.length > 0 && selectedMembership ? (
        <div className="space-y-5">
          {/* Primary Section Navigation - Full labels visible & wrapped cleanly across mobile, tablet, and desktop */}
          <div className="space-y-2 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Rewards Club Sections
              </span>
              {pendingVouchersCount > 0 && activeSubTab !== 'vouchers' && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('vouchers')}
                  className="text-[11px] font-extrabold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{pendingVouchersCount} voucher{pendingVouchersCount > 1 ? 's' : ''} ready to redeem</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Reward Club sections"
              className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 auto-rows-fr items-stretch"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'card'}
                onClick={() => setActiveSubTab('card')}
                className={`h-full p-3 sm:p-3.5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center items-start justify-start gap-2 sm:gap-2.5 cursor-pointer text-left border ${
                  activeSubTab === 'card'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <span
                  className={`p-2 rounded-xl shrink-0 ${
                    activeSubTab === 'card' ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                </span>
                <span className="w-full sm:w-auto min-w-0 flex-1 space-y-0.5">
                  <span className="block font-extrabold text-[13px] sm:text-sm leading-snug break-words">
                    Digital Member Card
                  </span>
                  <span
                    className={`block text-[11px] font-semibold leading-tight break-words ${
                      activeSubTab === 'card' ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    QR Pass • {Number(selectedMembership.pointsBalance || 0).toLocaleString()} pts
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'rewards'}
                onClick={() => setActiveSubTab('rewards')}
                className={`h-full p-3 sm:p-3.5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center items-start justify-start gap-2 sm:gap-2.5 cursor-pointer text-left border ${
                  activeSubTab === 'rewards'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <span
                  className={`p-2 rounded-xl shrink-0 ${
                    activeSubTab === 'rewards' ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <Gift className="h-4 w-4" />
                </span>
                <span className="w-full sm:w-auto min-w-0 flex-1 space-y-0.5">
                  <span className="block font-extrabold text-[13px] sm:text-sm leading-snug break-words">
                    Rewards Catalog
                  </span>
                  <span
                    className={`block text-[11px] font-semibold leading-tight break-words ${
                      activeSubTab === 'rewards' ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {rewards.length} Rewards
                    {rewardDiscovery.categoryCounts.REDEEMABLE > 0
                      ? ` • ${rewardDiscovery.categoryCounts.REDEEMABLE} Unlocked`
                      : ''}
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'vouchers'}
                onClick={() => setActiveSubTab('vouchers')}
                className={`h-full p-3 sm:p-3.5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center items-start justify-start gap-2 sm:gap-2.5 cursor-pointer text-left border relative ${
                  activeSubTab === 'vouchers'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : pendingVouchersCount > 0
                    ? 'bg-amber-50/90 hover:bg-amber-100/80 text-slate-900 border-amber-300 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <span className="w-full sm:w-auto flex items-center justify-between gap-1.5 shrink-0">
                  <span
                    className={`p-2 rounded-xl shrink-0 ${
                      activeSubTab === 'vouchers'
                        ? 'bg-white/15 text-white'
                        : pendingVouchersCount > 0
                        ? 'bg-amber-200/80 text-amber-900'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Ticket className="h-4 w-4" />
                  </span>
                  {pendingVouchersCount > 0 && (
                    <span
                      className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0 ${
                        activeSubTab === 'vouchers'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-amber-500 text-white animate-pulse'
                      }`}
                    >
                      {pendingVouchersCount} Ready
                    </span>
                  )}
                </span>
                <span className="w-full sm:w-auto min-w-0 flex-1 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-[13px] sm:text-sm leading-snug break-words">
                      My Vouchers
                    </span>
                    {pendingVouchersCount > 0 && (
                      <span
                        className={`hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${
                          activeSubTab === 'vouchers'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-amber-500 text-white animate-pulse'
                        }`}
                      >
                        {pendingVouchersCount} Ready
                      </span>
                    )}
                  </span>
                  <span
                    className={`block text-[11px] font-semibold leading-tight break-words ${
                      activeSubTab === 'vouchers'
                        ? 'text-indigo-100'
                        : pendingVouchersCount > 0
                        ? 'text-amber-800'
                        : 'text-slate-500'
                    }`}
                  >
                    {redemptions.length === 0
                      ? 'Redeem & claim QR'
                      : `${redemptions.length} Voucher${redemptions.length === 1 ? '' : 's'} Saved`}
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'activity'}
                onClick={() => setActiveSubTab('activity')}
                className={`h-full p-3 sm:p-3.5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center items-start justify-start gap-2 sm:gap-2.5 cursor-pointer text-left border ${
                  activeSubTab === 'activity'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <span
                  className={`p-2 rounded-xl shrink-0 ${
                    activeSubTab === 'activity' ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                </span>
                <span className="w-full sm:w-auto min-w-0 flex-1 space-y-0.5">
                  <span className="block font-extrabold text-[13px] sm:text-sm leading-snug break-words">
                    Points Activity
                  </span>
                  <span
                    className={`block text-[11px] font-semibold leading-tight break-words ${
                      activeSubTab === 'activity' ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {ledger.length} {ledger.length === 1 ? 'Entry' : 'Entries'}
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Ready Vouchers Callout Strip when viewing other tabs */}
          {pendingVouchersCount > 0 && activeSubTab === 'card' && (
            <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-white border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400/25 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                  <Ticket className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                    You have {pendingVouchersCount} active voucher{pendingVouchersCount > 1 ? 's' : ''} ready to use
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Open My Vouchers to show your QR code or voucher code at the car wash counter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('vouchers')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <span>Open My Vouchers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: DIGITAL MEMBER CARD */}
          {activeSubTab === 'card' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Virtual Membership Card */}
              <div className="lg:col-span-7">
                <div className="relative rounded-3xl p-5 sm:p-8 text-white shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-950 border border-indigo-500/30">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-wrap items-start justify-between gap-2 pb-6 sm:pb-8">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block mb-1">
                        Official Loyalty Pass
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight break-words">
                        {selectedMembership.carWashName || 'Autoshine BN Partner'}
                      </h3>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        {config?.programmeName || 'VIP Rewards Club'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full text-xs font-black tracking-wider uppercase shrink-0">
                      ● Active Member
                    </span>
                  </div>

                  <div className="relative z-10 py-4 border-y border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase font-bold text-indigo-200 block">Available Points</span>
                        <button
                          type="button"
                          onClick={() => {
                            fetchMemberships();
                            if (fetchMyMemberships) fetchMyMemberships();
                            fetchMyVouchers();
                            if (selectedMembership) {
                              fetchLedger(selectedMembership.id);
                            }
                          }}
                          className="text-[10px] bg-white/10 hover:bg-white/20 text-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title="Refresh points live"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Sync</span>
                        </button>
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-black text-amber-300">
                          {Number(selectedMembership.pointsBalance || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">PTS</span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right min-w-0">
                      <span className="text-[11px] uppercase font-bold text-indigo-200 block">Member Number</span>
                      <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-sm tracking-wider bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                        <span className="break-all">{selectedMembership.membershipNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(selectedMembership.membershipNumber)}
                          className="hover:text-amber-300 transition-colors shrink-0"
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

                {/* Card Options / Leave Programme Footer */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Membership ID: <strong className="font-mono text-slate-600">{selectedMembership.membershipNumber}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(true)}
                    className="text-slate-400 hover:text-rose-600 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-rose-50"
                    title="Accidentally joined or want to opt out? Leave this club anytime"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>Leave / Cancel Membership</span>
                  </button>
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
          {activeSubTab === 'rewards' && (() => {
            const { categoryCounts, sorted, grouped } = rewardDiscovery;
            const isSearchingOrFiltering = rewardSearch.trim().length > 0 || rewardCategoryFilter !== 'ALL';
            const useGroupedView = !isSearchingOrFiltering && grouped.length > 1;
            const flatLimit = 4;
            const visibleFlatRewards = showAllFilteredRewards ? sorted : sorted.slice(0, flatLimit);

            const renderRewardCard = (reward: MembershipReward) => {
              const userBalance = Number(selectedMembership.pointsBalance || 0);
              const cost = Number(reward.pointsCost || 100);
              const canAfford = userBalance >= cost;
              const progress = Math.min(100, Math.round((userBalance / cost) * 100));
              const userClaimsForThisReward = redemptions.filter(
                (r) => r.rewardId === reward.id && r.status !== 'CANCELLED'
              ).length;
              const isPerMemberCapped = Boolean(
                reward.maxRedemptionsPerMember &&
                reward.maxRedemptionsPerMember > 0 &&
                userClaimsForThisReward >= reward.maxRedemptionsPerMember
              );
              const isSupplyExhausted = Boolean(
                reward.maxTotalSupply &&
                reward.maxTotalSupply > 0 &&
                (reward.claimCount || 0) >= reward.maxTotalSupply
              );
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
                          {canAfford ? 'Ready to claim!' : `${Math.max(0, Number(reward.pointsCost || 0) - Number(selectedMembership?.pointsBalance || 0))} pts needed`}
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
                      onClick={() => {
                        setRedeemError(null);
                        setRedeemingReward(reward);
                      }}
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
            };

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Available Rewards</h3>
                    <p className="text-xs text-slate-500">
                      Your balance: <strong className="text-indigo-600 font-black">{Number(selectedMembership.pointsBalance || 0).toLocaleString()} PTS</strong>
                      {rewards.length > 0 && (
                        <span className="ml-2 text-slate-400">• {categoryCounts.REDEEMABLE} ready to redeem</span>
                      )}
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
                  <>
                    {/* Search, Filter & Sort Discovery Bar */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={rewardSearch}
                            onChange={(e) => {
                              setRewardSearch(e.target.value);
                              setShowAllFilteredRewards(false);
                            }}
                            placeholder="Search all rewards by name, description, or perk..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          {rewardSearch && (
                            <button
                              type="button"
                              onClick={() => setRewardSearch('')}
                              aria-label="Clear reward search"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                          <select
                            value={rewardSort}
                            onChange={(e) => setRewardSort(e.target.value as any)}
                            aria-label="Sort rewards"
                            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="POINTS_ASC">Sort: Points (Low → High)</option>
                            <option value="POINTS_DESC">Sort: Points (High → Low)</option>
                            <option value="ALPHA_ASC">Sort: Name (A → Z)</option>
                          </select>
                        </div>
                      </div>

                      {/* Category & Eligibility Filter Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: 'ALL', label: `All Rewards (${categoryCounts.ALL})`, show: true },
                          { id: 'REDEEMABLE', label: `Ready to Redeem (${categoryCounts.REDEEMABLE})`, show: true },
                          { id: 'FREE_SERVICE', label: `Free Washes (${categoryCounts.FREE_SERVICE})`, show: categoryCounts.FREE_SERVICE > 0 },
                          { id: 'FREE_ADDON', label: `Free Add-ons (${categoryCounts.FREE_ADDON})`, show: categoryCounts.FREE_ADDON > 0 },
                          { id: 'DISCOUNT', label: `Discounts (${categoryCounts.DISCOUNT})`, show: categoryCounts.DISCOUNT > 0 },
                          { id: 'CUSTOM', label: `VIP Perks (${categoryCounts.CUSTOM})`, show: categoryCounts.CUSTOM > 0 },
                        ]
                          .filter((c) => c.show)
                          .map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setRewardCategoryFilter(cat.id as any);
                                setShowAllFilteredRewards(false);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                rewardCategoryFilter === cat.id
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                      </div>
                    </div>

                    {sorted.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-2">
                        <Gift className="h-8 w-8 mx-auto text-slate-300" />
                        <p className="font-bold text-sm text-slate-700">No rewards match your current search or filter.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setRewardSearch('');
                            setRewardCategoryFilter('ALL');
                          }}
                          className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Clear Search &amp; Filters
                        </button>
                      </div>
                    ) : useGroupedView ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                          <span className="text-xs font-semibold text-slate-500">
                            Organized by category ({grouped.length} categories, {sorted.length} total rewards)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allCollapsed = grouped.every((g) => collapsedRewardCats[g.key]);
                                const next: Record<string, boolean> = {};
                                grouped.forEach((g) => {
                                  next[g.key] = !allCollapsed;
                                });
                                setCollapsedRewardCats(next);
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              {grouped.every((g) => collapsedRewardCats[g.key]) ? 'Expand All Categories' : 'Collapse All Categories'}
                            </button>
                          </div>
                        </div>

                        {grouped.map((group) => {
                          const isCollapsed = !!collapsedRewardCats[group.key];
                          const isExpandedAll = !!expandedRewardCats[group.key];
                          const cap = 4;
                          const visibleItems = isExpandedAll ? group.items : group.items.slice(0, cap);

                          return (
                            <div
                              key={group.key}
                              className="bg-slate-50/70 border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-4"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedRewardCats((prev) => ({
                                    ...prev,
                                    [group.key]: !prev[group.key],
                                  }))
                                }
                                className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                                      {group.label}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800">
                                      {group.items.length}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{group.subtitle}</p>
                                </div>
                                <span className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 shrink-0">
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                                </span>
                              </button>

                              {!isCollapsed && (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {visibleItems.map(renderRewardCard)}
                                  </div>

                                  {group.items.length > cap && (
                                    <div className="pt-1 flex justify-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedRewardCats((prev) => ({
                                            ...prev,
                                            [group.key]: !prev[group.key],
                                          }))
                                        }
                                        className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      >
                                        <span>
                                          {isExpandedAll
                                            ? `Show Fewer in ${group.label}`
                                            : `View All in ${group.label} (+${group.items.length - cap} more)`}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpandedAll ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-500">
                          <span>
                            Showing {visibleFlatRewards.length} of {sorted.length} matching reward{sorted.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {visibleFlatRewards.map(renderRewardCard)}
                        </div>

                        {sorted.length > flatLimit && (
                          <div className="flex justify-center pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAllFilteredRewards((prev) => !prev)}
                              className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>
                                {showAllFilteredRewards
                                  ? 'Show Fewer Rewards'
                                  : `View All ${sorted.length} Rewards (+${sorted.length - flatLimit} more)`}
                              </span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${showAllFilteredRewards ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 3: MY REWARD VOUCHERS */}
          {activeSubTab === 'vouchers' && (() => {
            const filteredVouchers = redemptions.filter((v) => {
              if (voucherFilter === 'PENDING') return v.status === 'PENDING';
              if (voucherFilter === 'REDEEMED') return v.status !== 'PENDING';
              return true;
            });
            const visibleVouchers = showAllVouchers ? filteredVouchers : filteredVouchers.slice(0, 4);

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">My Reward Vouchers Wallet</h3>
                    <p className="text-xs text-slate-500">Show voucher barcodes to staff at the counter to claim your free washes and discounts.</p>
                  </div>
                  {redemptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'ALL', label: `All (${redemptions.length})` },
                        { id: 'PENDING', label: `Ready (${redemptions.filter((r) => r.status === 'PENDING').length})` },
                        { id: 'REDEEMED', label: `Used / Past (${redemptions.filter((r) => r.status !== 'PENDING').length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setVoucherFilter(tab.id as any);
                            setShowAllVouchers(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            voucherFilter === tab.id
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {redemptions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                    <Award className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">No vouchers yet</p>
                    <p className="text-xs">Redeem your loyalty points from the Rewards Catalog tab above!</p>
                  </div>
                ) : filteredVouchers.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500">
                    No vouchers match this filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleVouchers.map((voucher) => {
                        const isPending = voucher.status === 'PENDING';
                        const isRedeemed = voucher.status === 'REDEEMED';

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

                              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                                  <span className="font-mono font-black text-sm text-slate-800 tracking-wider break-all">
                                    {voucher.redemptionCode}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(voucher.redemptionCode)}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                                  title="Copy code"
                                >
                                  {copiedCode === voucher.redemptionCode ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>

                              <p className="text-[11px] text-slate-500">
                                Issued: {new Date(voucher.createdAt || Date.now()).toLocaleDateString()}
                                {voucher.redeemedAt && (
                                  <span className="text-emerald-600 font-bold ml-1.5">• Used: {new Date(voucher.redeemedAt).toLocaleDateString()}</span>
                                )}
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

                    {filteredVouchers.length > 4 && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllVouchers((prev) => !prev)}
                          className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>
                            {showAllVouchers
                              ? 'Show Fewer Vouchers'
                              : `View All Vouchers (+${filteredVouchers.length - 4} more)`}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAllVouchers ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: ACTIVITY LEDGER */}
          {activeSubTab === 'activity' && (() => {
            const visibleLedger = showAllLedger ? ledger : ledger.slice(0, 5);
            return (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Points Activity Ledger</h3>
                    <p className="text-xs text-slate-500">Chronological history of points earned, spent, and adjusted.</p>
                  </div>
                  {ledger.length > 5 && (
                    <span className="text-[11px] font-bold text-slate-400">
                      Showing {visibleLedger.length} of {ledger.length}
                    </span>
                  )}
                </div>

                {ledger.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic text-xs">
                    No activity recorded on this membership yet. Complete a wash booking to earn your first points!
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="divide-y divide-slate-100">
                      {visibleLedger.map((item) => {
                        const isPositive = item.pointsDelta > 0;
                        return (
                          <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isPositive ? '+' : '-'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 break-words">{item.description}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {new Date(item.createdAt).toLocaleString()} • Balance after: {item.balanceAfter} pts
                                </p>
                              </div>
                            </div>

                            <span className={`font-mono font-black text-sm shrink-0 ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {isPositive ? `+${item.pointsDelta}` : item.pointsDelta} PTS
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {ledger.length > 5 && (
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllLedger((prev) => !prev)}
                          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>
                            {showAllLedger
                              ? 'Show Fewer Entries'
                              : `View All Activity (+${ledger.length - 5} more)`}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAllLedger ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* If user has no active memberships yet */
        <div className="space-y-6">
          {availableToJoin.length > 0 ? (() => {
            const visibleClubs = filteredAvailableToJoin.slice(0, clubVisibleCount);
            const remainingClubsCount = Math.max(0, filteredAvailableToJoin.length - visibleClubs.length);
            return (
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 border border-indigo-100/90 rounded-3xl px-3.5 py-5 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instant VIP Registration</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Choose Your Car Wash Rewards Club ({availableToJoin.length})
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                      Enroll for free with 1-click below. Earn points on every bay booking and walk-in wash, and redeem for complimentary washes and detailing!
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-white/95 p-2.5 sm:p-3.5 rounded-2xl border border-indigo-100">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clubSearch}
                        onChange={(e) => setClubSearch(e.target.value)}
                        placeholder="Search car wash clubs by name or area..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      {clubSearch && (
                        <button
                          type="button"
                          onClick={() => setClubSearch('')}
                          aria-label="Clear club search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select
                      value={clubSort}
                      onChange={(e) => setClubSort(e.target.value as any)}
                      aria-label="Sort car wash clubs"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="DEFAULT">Order: Featured</option>
                      <option value="ALPHA_ASC">Order: A → Z</option>
                    </select>
                  </div>

                  {/* Full-width Horizontally Swipeable A-Z, 0-9 & Other Characters (#) Selector */}
                  <div className="space-y-2 pt-1.5 border-t border-slate-100 min-w-0 max-w-full" role="group" aria-label="Filter car wash clubs alphabetically">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Swipe A–Z / 0–9 to Filter</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={clubAlphabetFilter === 'ALL'}
                          onClick={() => setClubAlphabetFilter('ALL')}
                          aria-label={`Show all ${clubDiscovery.alphabetCounts.ALL || 0} clubs`}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all inline-flex items-center gap-1 cursor-pointer ${
                            clubAlphabetFilter === 'ALL'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span>All</span>
                          <span
                            className={`text-[9px] font-mono px-1 rounded-full ${
                              clubAlphabetFilter === 'ALL' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {clubDiscovery.alphabetCounts.ALL || 0}
                          </span>
                        </button>
                        {(clubAlphabetFilter !== 'ALL' || clubSearch.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setClubAlphabetFilter('ALL');
                              setClubSearch('');
                            }}
                            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <HorizontalScrollNav
                      tone="white"
                      compactArrows
                      ariaLabel="Swipeable alphabetical club filter"
                      className="w-full min-w-0 max-w-full"
                      scrollClassName="flex items-center gap-1 whitespace-nowrap py-0.5 pr-6"
                    >
                      {['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'].map((key) => {
                        const count = clubDiscovery.alphabetCounts[key] || 0;
                        const isSelected = clubAlphabetFilter === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setClubAlphabetFilter(key)}
                            title={
                              key === '0-9'
                                ? `Starts with number 0–9 (${count})`
                                : key === '#'
                                ? `Starts with other character (${count})`
                                : `Starts with ${key} (${count})`
                            }
                            aria-label={
                              key === '0-9'
                                ? `Filter clubs starting with numbers 0–9 (${count})`
                                : key === '#'
                                ? `Filter clubs starting with other characters (${count})`
                                : `Filter clubs starting with ${key} (${count})`
                            }
                            className={`${key === '0-9' ? 'min-w-[40px] px-2' : 'min-w-[34px] px-1.5'} h-9 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                                : count > 0
                                ? 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 border border-slate-200/90'
                                : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200/80'
                            }`}
                          >
                            <span>{key}</span>
                            {count > 0 && isSelected && (
                              <span className="text-[9px] font-mono px-1 rounded-full bg-indigo-800 text-indigo-100">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </HorizontalScrollNav>
                  </div>
                </div>

                {filteredAvailableToJoin.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                    <p className="text-sm font-extrabold text-slate-700">No reward clubs found</p>
                    <p className="text-xs text-slate-500">
                      {clubAlphabetFilter !== 'ALL'
                        ? `No available clubs start with "${clubAlphabetFilter}"${clubSearch.trim() ? ` matching "${clubSearch.trim()}"` : ''}.`
                        : `No available clubs match "${clubSearch.trim()}".`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setClubSearch('');
                        setClubAlphabetFilter('ALL');
                      }}
                      className="mt-1 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      Show All Clubs
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleClubs.map((loc) => {
                        const isThisJoining = joiningCarWashId === loc.id;
                        return (
                          <div
                            key={loc.id}
                            className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-extrabold text-base text-slate-900">{loc.name}</h3>
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{loc.address}</p>
                                </div>
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-lg border border-indigo-200/80 uppercase tracking-wider shrink-0">
                                  VIP Active
                                </span>
                              </div>

                              <div className="bg-slate-50/80 rounded-xl p-3 text-[11px] text-slate-600 space-y-1.5 border border-slate-100">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Earn points automatically on every wash</span>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                                  <Gift className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Redeem for free premium detailing &amp; discounts</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isJoining}
                                onClick={() => handleQuickJoinClub(loc)}
                                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {isThisJoining ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Joining Club...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Join Free in 1-Click</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJoinCarWash(loc);
                                  setJoinConsent(true);
                                  setJoinError(null);
                                }}
                                className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                title="View Terms & Details"
                              >
                                Terms
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredAvailableToJoin.length > 4 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-indigo-100">
                        <span className="text-[11px] font-bold text-slate-500">
                          Showing {visibleClubs.length} of {filteredAvailableToJoin.length} clubs
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {remainingClubsCount > 8 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount((prev) => prev + 8)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <span>Show 8 More</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {remainingClubsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount(filteredAvailableToJoin.length)}
                              className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                            >
                              View All ({filteredAvailableToJoin.length})
                            </button>
                          )}
                          {clubVisibleCount > 4 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount(4)}
                              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Show Fewer</span>
                              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })() : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Autoshine VIP Loyalty &amp; Rewards</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Participating car wash branches will soon be activating digital loyalty clubs. Once a station launches its club, you&apos;ll be able to join in 1-click right here!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 1</span>
                  <p className="text-xs font-bold text-slate-800">Book &amp; Wash</p>
                  <p className="text-[11px] text-slate-500">Book online or visit any partner wash station.</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 2</span>
                  <p className="text-xs font-bold text-slate-800">Earn Points</p>
                  <p className="text-[11px] text-slate-500">Collect points automatically for every service.</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Step 3</span>
                  <p className="text-xs font-bold text-slate-800">Redeem Washes</p>
                  <p className="text-[11px] text-slate-500">Get free waxes, detailing, and voucher codes.</p>
                </div>
              </div>

              {onNavigateToBook && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onNavigateToBook}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Car className="w-4 h-4" />
                    <span>Browse Car Wash Stations &amp; Book</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Available Car Wash Clubs to Join (when user already has at least one active membership) */}
      {activeValidMemberships.length > 0 && availableToJoin.length > 0 && (() => {
        const visibleExploreClubs = filteredAvailableToJoin.slice(0, clubVisibleCount);
        const remainingExploreCount = Math.max(0, filteredAvailableToJoin.length - visibleExploreClubs.length);
        return (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl px-3.5 py-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-slate-800 text-base">
                  Explore &amp; Join More Rewards Clubs ({availableToJoin.length} Available)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExploreClubsCollapsed((prev) => !prev)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{isExploreClubsCollapsed ? 'Show Clubs' : 'Hide'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExploreClubsCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>

            {!isExploreClubsCollapsed && (
              <>
                <div className="space-y-3 bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clubSearch}
                        onChange={(e) => setClubSearch(e.target.value)}
                        placeholder="Search more reward clubs by name or area..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      {clubSearch && (
                        <button
                          type="button"
                          onClick={() => setClubSearch('')}
                          aria-label="Clear club search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select
                      value={clubSort}
                      onChange={(e) => setClubSort(e.target.value as any)}
                      aria-label="Sort available clubs"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="DEFAULT">Order: Featured</option>
                      <option value="ALPHA_ASC">Order: A → Z</option>
                    </select>
                  </div>

                  {/* Full-width Horizontally Swipeable A-Z, 0-9 & Other Characters (#) Selector */}
                  <div className="space-y-2 pt-1.5 border-t border-slate-100 min-w-0 max-w-full" role="group" aria-label="Filter reward clubs alphabetically">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>Swipe A–Z / 0–9 to Filter</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={clubAlphabetFilter === 'ALL'}
                          onClick={() => setClubAlphabetFilter('ALL')}
                          aria-label={`Show all ${clubDiscovery.alphabetCounts.ALL || 0} clubs`}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all inline-flex items-center gap-1 cursor-pointer ${
                            clubAlphabetFilter === 'ALL'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span>All</span>
                          <span
                            className={`text-[9px] font-mono px-1 rounded-full ${
                              clubAlphabetFilter === 'ALL' ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {clubDiscovery.alphabetCounts.ALL || 0}
                          </span>
                        </button>
                        {(clubAlphabetFilter !== 'ALL' || clubSearch.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setClubAlphabetFilter('ALL');
                              setClubSearch('');
                            }}
                            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <HorizontalScrollNav
                      tone="white"
                      compactArrows
                      ariaLabel="Swipeable alphabetical reward club filter"
                      className="w-full min-w-0 max-w-full"
                      scrollClassName="flex items-center gap-1 whitespace-nowrap py-0.5 pr-6"
                    >
                      {['0-9', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'].map((key) => {
                        const count = clubDiscovery.alphabetCounts[key] || 0;
                        const isSelected = clubAlphabetFilter === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setClubAlphabetFilter(key)}
                            title={
                              key === '0-9'
                                ? `Starts with number 0–9 (${count})`
                                : key === '#'
                                ? `Starts with other character (${count})`
                                : `Starts with ${key} (${count})`
                            }
                            aria-label={
                              key === '0-9'
                                ? `Filter clubs starting with numbers 0–9 (${count})`
                                : key === '#'
                                ? `Filter clubs starting with other characters (${count})`
                                : `Filter clubs starting with ${key} (${count})`
                            }
                            className={`${key === '0-9' ? 'min-w-[40px] px-2' : 'min-w-[34px] px-1.5'} h-9 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                                : count > 0
                                ? 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 border border-slate-200/90'
                                : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200/80'
                            }`}
                          >
                            <span>{key}</span>
                            {count > 0 && isSelected && (
                              <span className="text-[9px] font-mono px-1 rounded-full bg-indigo-800 text-indigo-100">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </HorizontalScrollNav>
                  </div>
                </div>

                {filteredAvailableToJoin.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-sm font-extrabold text-slate-700">No reward clubs found</p>
                    <p className="text-xs text-slate-500">
                      {clubAlphabetFilter !== 'ALL'
                        ? `No available clubs start with "${clubAlphabetFilter}"${clubSearch.trim() ? ` matching "${clubSearch.trim()}"` : ''}.`
                        : `No available clubs match "${clubSearch.trim()}".`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setClubSearch('');
                        setClubAlphabetFilter('ALL');
                      }}
                      className="mt-1 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      Show All Clubs
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleExploreClubs.map((loc) => {
                        const isThisJoining = joiningCarWashId === loc.id;
                        return (
                          <div key={loc.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{loc.name}</h4>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{loc.address}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isJoining}
                                onClick={() => handleQuickJoinClub(loc)}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {isThisJoining ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Join in 1-Click</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJoinCarWash(loc);
                                  setJoinConsent(true);
                                  setJoinError(null);
                                }}
                                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                              >
                                Terms
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredAvailableToJoin.length > 4 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500">
                          Showing {visibleExploreClubs.length} of {filteredAvailableToJoin.length} clubs
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {remainingExploreCount > 8 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount((prev) => prev + 8)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <span>Show 8 More</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {remainingExploreCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount(filteredAvailableToJoin.length)}
                              className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                            >
                              View All ({filteredAvailableToJoin.length})
                            </button>
                          )}
                          {clubVisibleCount > 4 && (
                            <button
                              type="button"
                              onClick={() => setClubVisibleCount(4)}
                              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Show Fewer</span>
                              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Modal: Confirm Reward Redemption */}
      {redeemingReward && selectedMembership && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-center max-h-[90vh] overflow-y-auto overscroll-contain">
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
                <strong className="font-mono">{Number(selectedMembership?.pointsBalance ?? 0).toLocaleString()} pts</strong>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Points Deducted:</span>
                <strong className="font-mono">-{redeemingReward.pointsCost} pts</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                <span>Remaining Balance:</span>
                <strong className="font-mono">{Math.max(0, Number(selectedMembership?.pointsBalance ?? 0) - Number(redeemingReward.pointsCost || 0)).toLocaleString()} pts</strong>
              </div>
            </div>

            {redeemError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{redeemError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
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

      {/* Modal: Redemption Success Voucher Ready */}
      {redemptionSuccessVoucher && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-center max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                🎉 Voucher Claimed!
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg mt-2">
                {redemptionSuccessVoucher.rewardTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your points were deducted. Present this voucher code or QR barcode to the staff at the counter during your wash.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-black text-lg sm:text-xl text-slate-900 tracking-wider break-all">
                  {redemptionSuccessVoucher.redemptionCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(redemptionSuccessVoucher.redemptionCode)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                  title="Copy code"
                >
                  {copiedCode === redemptionSuccessVoucher.redemptionCode ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Points spent: {redemptionSuccessVoucher.pointsSpent} pts • Valid for 7 days
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const v = redemptionSuccessVoucher;
                  setRedemptionSuccessVoucher(null);
                  handleShowVoucherQR(v);
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <QrCode className="h-4 w-4" /> Show QR Code for Staff
              </button>
              <button
                type="button"
                onClick={() => setRedemptionSuccessVoucher(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                View in My Vouchers Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Display Member or Voucher QR Code */}
      {qrModalData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden text-center">
            <div className="shrink-0 flex justify-between items-center px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 bg-white">
              <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{qrModalData.title}</h3>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
              <p className="text-xs text-slate-500 leading-relaxed">{qrModalData.subtitle}</p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-center">
                <img src={qrModalData.qrUrl} alt="QR Code" className="w-44 h-44 sm:w-56 sm:h-56 rounded-xl shadow-xs" />
              </div>

              <div className="bg-slate-100 p-2.5 rounded-xl font-mono font-black text-sm text-slate-800 tracking-wider flex items-center justify-center gap-2">
                <span className="break-all">{qrModalData.code}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(qrModalData.code)}
                  className="hover:text-indigo-600 shrink-0"
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
        </div>
      )}

      {/* Modal: Join Programme Opt-in Flow */}
      {selectedJoinCarWash && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="shrink-0 flex justify-between items-center px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-slate-800 text-base truncate">Join Loyalty Programme</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJoinCarWash(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
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
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
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

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
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
        </div>
      )}

      {/* Leave Club Confirmation Modal */}
      {showLeaveModal && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-base">Leave Loyalty Programme?</h3>
                <p className="text-xs text-slate-500 truncate">{selectedMembership.carWashName || 'Car Wash Rewards'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Did you accidentally join or do you no longer want to be on this membership? You can leave at any time. Your points history and transactions remain safely saved in our system if you ever choose to re-join later.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeaving}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Keep Membership
              </button>
              <button
                type="button"
                disabled={isLeaving}
                onClick={handleConfirmLeaveClub}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLeaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Leaving...
                  </>
                ) : (
                  'Yes, Leave Programme'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
