import React, { useState, useEffect, useCallback } from 'react';
import { 
  Award, 
  Gift, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Coins, 
  QrCode, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Check, 
  Calendar,
  Sparkles,
  ArrowRight,
  Camera,
  Plus,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { 
  CarWash, 
  CustomerMembership, 
  MembershipReward, 
  MembershipRedemption,
  MembershipPointsRule,
  WashService
} from '../types.js';
import { CameraQrScannerModal } from './CameraQrScannerModal.js';

interface LoyaltyMembershipEmployeeViewProps {
  carWash: CarWash;
  token: string | null;
  currentUser: any;
}

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

export const LoyaltyMembershipEmployeeView: React.FC<LoyaltyMembershipEmployeeViewProps> = ({
  carWash,
  token,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'award' | 'redeem'>('award');

  // 1. Counter Wash Points Award State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedMember, setSearchedMember] = useState<CustomerMembership | null>(null);
  const [searchingMember, setSearchingMember] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState<string | null>(null);
  
  const [pointsRules, setPointsRules] = useState<MembershipPointsRule[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [hasCustomService, setHasCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePoints, setCustomServicePoints] = useState<number>(10);
  const [awardPointsAmount, setAwardPointsAmount] = useState<number>(0);
  const [manualPointsOverride, setManualPointsOverride] = useState<boolean>(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);
  const [awardErrorMsg, setAwardErrorMsg] = useState<string | null>(null);

  // 2. Voucher Redemption State
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [checkedVoucher, setCheckedVoucher] = useState<MembershipRedemption | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherCheckError, setVoucherCheckError] = useState<string | null>(null);
  const [isConfirmingVoucher, setIsConfirmingVoucher] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null);
  const [confirmErrorMsg, setConfirmErrorMsg] = useState<string | null>(null);
  const [confirmedSessionVouchers, setConfirmedSessionVouchers] = useState<MembershipRedemption[]>([]);

  // 3. Camera QR Scanner State
  const [cameraScannerMode, setCameraScannerMode] = useState<'member' | 'voucher' | null>(null);

  // Fetch points rules for this car wash
  useEffect(() => {
    if (!carWash?.id) return;
    const fetchRules = async () => {
      try {
        const res = await fetch(`/api/membership/points-rules/${carWash.id}`);
        const rules = await safeJsonFetch(res);
        if (rules && Array.isArray(rules)) {
          setPointsRules(rules);
        }
      } catch (err) {
        console.error('Failed to load points rules:', err);
      }
    };
    fetchRules();
  }, [carWash?.id]);

  // Helper to determine points for a service
  const getServicePoints = useCallback((svc: WashService): number => {
    const matchRule = pointsRules.find((r) => r.serviceId === svc.id);
    if (matchRule && typeof matchRule.pointsAwarded === 'number' && matchRule.pointsAwarded > 0) {
      return matchRule.pointsAwarded;
    }
    if (typeof svc.points === 'number' && svc.points > 0) {
      return svc.points;
    }
    return Math.max(1, Math.round(Number(svc.price) || 10));
  }, [pointsRules]);

  // Calculate total points from selected services + custom service
  const calculateTotalPoints = useCallback((serviceIds: string[], withCustom: boolean, customPts: number): number => {
    let sum = 0;
    for (const id of serviceIds) {
      const svc = carWash.services?.find((s) => s.id === id);
      if (svc) sum += getServicePoints(svc);
    }
    if (withCustom && customPts > 0) {
      sum += customPts;
    }
    return sum;
  }, [carWash.services, getServicePoints]);

  // Lookup member by code / phone / QR token
  const lookupMember = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || !token) return;

    setSearchingMember(true);
    setMemberSearchError(null);
    setSearchedMember(null);
    setAwardSuccessMsg(null);
    setAwardErrorMsg(null);

    try {
      const res = await fetch(`/api/membership/identify/${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonOrError(res, 'Member not found with this code, phone or QR pass');
      setSearchedMember(data);

      // Pre-select first service if nothing is selected
      if (carWash.services && carWash.services.length > 0 && selectedServiceIds.length === 0) {
        const first = carWash.services[0];
        const initialIds = [first.id];
        setSelectedServiceIds(initialIds);
        const autoPts = calculateTotalPoints(initialIds, false, 0);
        setAwardPointsAmount(autoPts || 10);
        setManualPointsOverride(false);
      }
    } catch (err: any) {
      setMemberSearchError(err.message || 'No active member matches that code');
    } finally {
      setSearchingMember(false);
    }
  };

  // Search member by form submit
  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    lookupMember(memberSearchQuery);
  };

  // Toggle multi-service selection
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      if (!manualPointsOverride) {
        const total = calculateTotalPoints(next, hasCustomService, customServicePoints);
        setAwardPointsAmount(total);
      }
      return next;
    });
  };

  const handleSelectAllServices = () => {
    const allIds = (carWash.services || []).map((s) => s.id);
    setSelectedServiceIds(allIds);
    if (!manualPointsOverride) {
      setAwardPointsAmount(calculateTotalPoints(allIds, hasCustomService, customServicePoints));
    }
  };

  const handleClearAllServices = () => {
    setSelectedServiceIds([]);
    if (!manualPointsOverride) {
      setAwardPointsAmount(calculateTotalPoints([], hasCustomService, customServicePoints));
    }
  };

  const handleCustomServiceToggle = (enabled: boolean) => {
    setHasCustomService(enabled);
    if (!manualPointsOverride) {
      setAwardPointsAmount(calculateTotalPoints(selectedServiceIds, enabled, customServicePoints));
    }
  };

  const handleCustomPointsChange = (pts: number) => {
    const validPts = Math.max(0, pts);
    setCustomServicePoints(validPts);
    if (!manualPointsOverride) {
      setAwardPointsAmount(calculateTotalPoints(selectedServiceIds, hasCustomService, validPts));
    }
  };

  const handleResetToCalculated = () => {
    setManualPointsOverride(false);
    setAwardPointsAmount(calculateTotalPoints(selectedServiceIds, hasCustomService, customServicePoints));
  };

  // Submit Counter Points Award with Multiple Services
  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedMember || !token) return;

    if (selectedServiceIds.length === 0 && (!hasCustomService || !customServiceName.trim())) {
      setAwardErrorMsg('Please select at least one wash service or add a custom service.');
      return;
    }

    if (awardPointsAmount <= 0) {
      setAwardErrorMsg('Points to award must be greater than zero.');
      return;
    }

    setIsAwarding(true);
    setAwardSuccessMsg(null);
    setAwardErrorMsg(null);

    try {
      const selectedNames = (carWash.services || [])
        .filter((s) => selectedServiceIds.includes(s.id))
        .map((s) => s.name);

      if (hasCustomService && customServiceName.trim()) {
        selectedNames.push(customServiceName.trim());
      }

      const svcName = selectedNames.length > 0
        ? (selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.join(', ')} (${selectedNames.length} services)`)
        : (customServiceName || 'Walk-in Wash');

      const res = await fetch('/api/membership/counter-award', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: searchedMember.id,
          serviceName: svcName,
          services: selectedNames,
          points: awardPointsAmount,
        }),
      });

      const data = await safeJsonOrError(res, 'Failed to award points');

      setAwardSuccessMsg(`🎉 Successfully awarded +${awardPointsAmount} points to ${searchedMember.customerName || searchedMember.membershipNumber}! Services: ${svcName}. New Balance: ${data.balanceAfter} pts.`);
      setAwardErrorMsg(null);
      // Update searched member state balance
      setSearchedMember({
        ...searchedMember,
        pointsBalance: data.balanceAfter,
      });
    } catch (err: any) {
      setAwardErrorMsg(err.message || 'Error awarding points');
    } finally {
      setIsAwarding(false);
    }
  };

  // Inspect / Validate Voucher Code or QR token
  const inspectVoucher = async (codeText: string) => {
    const code = codeText.trim();
    if (!code || !token) return;

    setCheckingVoucher(true);
    setVoucherCheckError(null);
    setCheckedVoucher(null);
    setConfirmSuccessMsg(null);
    setConfirmErrorMsg(null);

    try {
      const res = await fetch(`/api/membership/voucher/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonOrError(res, 'Voucher not found with this code or QR barcode');

      // Verify business match
      if (data.carWashId !== carWash.id) {
        throw new Error('This voucher was issued for a different car wash location.');
      }

      setCheckedVoucher(data);
    } catch (err: any) {
      setVoucherCheckError(err.message || 'Invalid voucher code or barcode');
    } finally {
      setCheckingVoucher(false);
    }
  };

  // Check voucher form submit
  const handleCheckVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    inspectVoucher(voucherCodeInput);
  };

  // Confirm Voucher Redemption
  const handleConfirmVoucher = async () => {
    if (!checkedVoucher || !token) return;

    setIsConfirmingVoucher(true);
    setConfirmSuccessMsg(null);
    setConfirmErrorMsg(null);

    try {
      const res = await fetch('/api/membership/confirm-redemption', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenOrCode: checkedVoucher.redemptionCode,
          carWashId: carWash.id,
        }),
      });

      const data = await safeJsonOrError(res, 'Failed to confirm voucher');

      setCheckedVoucher(data);
      setConfirmedSessionVouchers((prev) => [data, ...prev.filter((v) => v.id !== data.id)]);
      setConfirmSuccessMsg(`Voucher ${data.redemptionCode} (${data.rewardTitle}) successfully confirmed! Service applied for customer.`);
    } catch (err: any) {
      setConfirmErrorMsg(err.message || 'Error confirming voucher');
    } finally {
      setIsConfirmingVoucher(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 px-3 py-0.5 rounded-full text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Bay Counter Operations</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{carWash.name} Loyalty Desk</h2>
          <p className="text-xs text-slate-300 mt-1">
            Award points for counter walk-ins or validate and redeem customer reward vouchers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/10 p-1 rounded-2xl border border-white/15">
          <button
            onClick={() => setActiveTab('award')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'award' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Coins className="h-4 w-4" /> Award Walk-In Points
          </button>
          <button
            onClick={() => setActiveTab('redeem')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'redeem' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Gift className="h-4 w-4" /> Validate Voucher
          </button>
        </div>
      </div>

      {/* TAB 1: AWARD WALK-IN POINTS */}
      {activeTab === 'award' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Search Box */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-600" /> Step 1: Identify Customer Member
              </h3>
              <p className="text-xs text-slate-500">
                Type member number (e.g. <code>AUT-12345</code>), phone number, or scan member QR barcode.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setCameraScannerMode('member')}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
                >
                  <Camera className="h-4 w-4" /> Scan Customer Member QR with Camera
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">or search manually</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleSearchMember} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Enter Member Code, Phone, or QR Token..."
                      className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                      required
                    />
                    <button
                      type="submit"
                      disabled={searchingMember}
                      className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer"
                    >
                      {searchingMember ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              </div>

              {memberSearchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{memberSearchError}</span>
                </div>
              )}

              {searchedMember && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Member Verified</span>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      {searchedMember.membershipNumber}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 text-lg">
                    {searchedMember.customerName || 'Registered Customer'}
                  </h4>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
                    <span className="text-slate-600">Current Balance:</span>
                    <strong className="text-emerald-700 font-mono text-base font-black">
                      {searchedMember.pointsBalance} PTS
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Award Form */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Coins className="h-5 w-5 text-indigo-600" /> Step 2: Award Wash Points
              </h3>

              {!searchedMember ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  Please identify a member on the left first before awarding points.
                </div>
              ) : (
                <form onSubmit={handleAwardPoints} className="space-y-4">
                  {/* Service Selection Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800">
                          Select Completed Services (Choose Several)
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Check all services provided to the customer today. Points auto-calculate.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={handleSelectAllServices}
                          className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllServices}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Multi-Service Cards Grid */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {carWash.services && carWash.services.length > 0 ? (
                        carWash.services.map((svc) => {
                          const isSelected = selectedServiceIds.includes(svc.id);
                          const pts = getServicePoints(svc);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-indigo-50/80 border-indigo-400 shadow-xs'
                                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{svc.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">BND {Number(svc.price).toFixed(2)}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 font-mono ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                +{pts} PTS
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic p-2">No predefined services found for this station.</p>
                      )}
                    </div>
                  </div>

                  {/* Optional Custom Walk-in / Extra Service */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasCustomService}
                        onChange={(e) => handleCustomServiceToggle(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <span>Add Custom / Other Walk-In Service</span>
                    </label>

                    {hasCustomService && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-fade-in">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Service Name</label>
                          <input
                            type="text"
                            value={customServiceName}
                            onChange={(e) => setCustomServiceName(e.target.value)}
                            placeholder="e.g. Engine Degrease or Tar Removal"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                            required={hasCustomService}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Extra Points</label>
                          <input
                            type="number"
                            min="0"
                            value={customServicePoints}
                            onChange={(e) => handleCustomPointsChange(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculated Points Summary & Manual Adjustment */}
                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-3.5 rounded-2xl border border-indigo-150 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Total Points to Award:
                      </span>
                      <div className="flex items-center gap-2">
                        {manualPointsOverride && (
                          <button
                            type="button"
                            onClick={handleResetToCalculated}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                            title="Reset to automatically calculated points sum"
                          >
                            <RotateCcw className="w-3 h-3" /> Auto-calculate
                          </button>
                        )}
                        <span className="text-[11px] text-slate-500">
                          ({selectedServiceIds.length + (hasCustomService && customServiceName.trim() ? 1 : 0)} services selected)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={awardPointsAmount}
                        onChange={(e) => {
                          setAwardPointsAmount(Math.max(0, parseInt(e.target.value) || 0));
                          setManualPointsOverride(true);
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-lg font-black font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 shadow-xs"
                        required
                      />
                      <span className="text-sm font-extrabold text-indigo-900 font-mono">PTS</span>
                    </div>
                  </div>

                  {awardSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{awardSuccessMsg}</span>
                    </div>
                  )}

                  {awardErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{awardErrorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAwarding}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAwarding ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Crediting Points...
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4" /> Credit +{awardPointsAmount} Points
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VOUCHER REDEMPTION SCANNER */}
      {activeTab === 'redeem' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-indigo-600" /> Reward Voucher Validation
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan customer voucher QR barcode or enter their voucher code (e.g. <code>RED-5258</code>) to verify and claim their reward.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCameraScannerMode('voucher')}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
              >
                <Camera className="h-4 w-4" /> Scan Customer Voucher QR with Camera
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] uppercase font-bold text-slate-400">or enter voucher code manually</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleCheckVoucher} className="flex gap-2">
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Voucher Code (e.g. RED-5258)..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase bg-slate-50 focus:bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={checkingVoucher}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {checkingVoucher ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Inspect Voucher'}
                </button>
              </form>
            </div>

            {voucherCheckError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{voucherCheckError}</span>
              </div>
            )}

            {checkedVoucher && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                    <span className="font-mono font-black text-lg text-slate-800 tracking-wider">
                      {checkedVoucher.redemptionCode}
                    </span>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    checkedVoucher.status === 'PENDING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                      : checkedVoucher.status === 'REDEEMED'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {checkedVoucher.status === 'PENDING' ? '● Valid & Ready to Claim' : checkedVoucher.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reward Item:</span>
                    <strong className="text-slate-900 font-bold text-sm">{checkedVoucher.rewardTitle}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cardholder Name:</span>
                    <strong className="text-slate-800">{checkedVoucher.customerName || 'Customer'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Points Cost:</span>
                    <strong className="text-indigo-700 font-mono font-bold">-{checkedVoucher.pointsSpent} PTS</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issued On:</span>
                    <span className="font-semibold text-slate-700">
                      {checkedVoucher.createdAt ? new Date(checkedVoucher.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {checkedVoucher.redeemedAt && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Redeemed At:</span>
                      <span>{new Date(checkedVoucher.redeemedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {checkedVoucher.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valid Until:</span>
                      <span>{new Date(checkedVoucher.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {confirmSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{confirmSuccessMsg}</span>
                  </div>
                )}

                {confirmErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{confirmErrorMsg}</span>
                  </div>
                )}

                {checkedVoucher.status === 'PENDING' ? (
                  <button
                    type="button"
                    disabled={isConfirmingVoucher}
                    onClick={handleConfirmVoucher}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConfirmingVoucher ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Confirm Voucher &amp; Apply Reward
                      </>
                    )}
                  </button>
                ) : checkedVoucher.status === 'REDEEMED' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl text-center font-medium">
                      ✓ This voucher has been confirmed and redeemed.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckedVoucher(null);
                        setVoucherCodeInput('');
                        setConfirmSuccessMsg(null);
                        setConfirmErrorMsg(null);
                      }}
                      className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                    >
                      <Plus className="h-4 w-4" /> Validate Another Voucher for Customer
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Session Confirmed Vouchers List */}
            {confirmedSessionVouchers.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Vouchers Confirmed in this Session ({confirmedSessionVouchers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmedSessionVouchers([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-normal cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
                <div className="divide-y divide-slate-200/60 max-h-36 overflow-y-auto">
                  {confirmedSessionVouchers.map((v) => (
                    <div key={v.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono font-bold text-slate-900 block">{v.redemptionCode}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{v.rewardTitle}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        REDEEMED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={cameraScannerMode !== null}
        onClose={() => setCameraScannerMode(null)}
        onScan={(scanned) => {
          const mode = cameraScannerMode;
          setCameraScannerMode(null);
          const clean = scanned.trim();
          if (mode === 'member') {
            setMemberSearchQuery(clean);
            lookupMember(clean);
          } else if (mode === 'voucher') {
            setVoucherCodeInput(clean);
            inspectVoucher(clean);
          }
        }}
        title={cameraScannerMode === 'member' ? 'Scan Customer Member QR' : 'Scan Customer Voucher QR'}
        subtitle={
          cameraScannerMode === 'member'
            ? 'Point camera at the customer’s Digital Member Card QR barcode'
            : 'Point camera at the customer’s reward voucher QR code on their phone'
        }
      />
    </div>
  );
};
