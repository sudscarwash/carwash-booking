import React, { useState, useEffect } from 'react';
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
  Camera
} from 'lucide-react';
import { 
  CarWash, 
  CustomerMembership, 
  MembershipReward, 
  MembershipRedemption,
  MembershipPointsRule 
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [awardPointsAmount, setAwardPointsAmount] = useState<number>(10);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);

  // 2. Voucher Redemption State
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [checkedVoucher, setCheckedVoucher] = useState<MembershipRedemption | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherCheckError, setVoucherCheckError] = useState<string | null>(null);
  const [isConfirmingVoucher, setIsConfirmingVoucher] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState<string | null>(null);

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

  // Lookup member by code / phone / QR token
  const lookupMember = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || !token) return;

    setSearchingMember(true);
    setMemberSearchError(null);
    setSearchedMember(null);
    setAwardSuccessMsg(null);

    try {
      const res = await fetch(`/api/membership/identify/${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJsonOrError(res, 'Member not found with this code, phone or QR pass');
      setSearchedMember(data);

      // Pre-select first service if available
      if (carWash.services && carWash.services.length > 0 && !selectedServiceId) {
        const first = carWash.services[0];
        setSelectedServiceId(first.id);
        const matchRule = pointsRules.find((r) => r.serviceId === first.id);
        setAwardPointsAmount(matchRule ? matchRule.pointsAwarded : 10);
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

  // When service dropdown changes, update suggested points
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const matchRule = pointsRules.find((r) => r.serviceId === serviceId);
    if (matchRule) {
      setAwardPointsAmount(matchRule.pointsAwarded);
    } else {
      setAwardPointsAmount(10); // Standard fallback
    }
  };

  // Submit Counter Points Award
  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedMember || !token) return;

    setIsAwarding(true);
    setAwardSuccessMsg(null);

    try {
      const selectedServiceObj = carWash.services?.find((s) => s.id === selectedServiceId);
      const svcName = selectedServiceObj ? selectedServiceObj.name : (customServiceName || 'Walk-in Wash');

      const res = await fetch('/api/membership/counter-award', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: searchedMember.id,
          serviceName: svcName,
          points: awardPointsAmount,
        }),
      });

      const data = await safeJsonOrError(res, 'Failed to award points');

      setAwardSuccessMsg(`Successfully awarded +${awardPointsAmount} points to ${searchedMember.customerName || searchedMember.membershipNumber}! New Balance: ${data.balanceAfter} pts.`);
      // Update searched member state balance
      setSearchedMember({
        ...searchedMember,
        pointsBalance: data.balanceAfter,
      });
    } catch (err: any) {
      alert(err.message || 'Error awarding points');
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
      setConfirmSuccessMsg(`Voucher ${data.redemptionCode} (${data.rewardTitle}) successfully confirmed! Service applied for customer.`);
    } catch (err: any) {
      alert(err.message || 'Error confirming voucher');
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Completed Wash Service</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {carWash.services?.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} - BND {Number(svc.price).toFixed(2)}
                        </option>
                      ))}
                      <option value="custom">Other / Custom Walk-In Service</option>
                    </select>
                  </div>

                  {selectedServiceId === 'custom' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Service Description</label>
                      <input
                        type="text"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        placeholder="e.g. Special Engine Degrease"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Points to Award</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={awardPointsAmount}
                      onChange={(e) => setAwardPointsAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Auto-filled based on car wash loyalty points rules for this service.
                    </p>
                  </div>

                  {awardSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{awardSuccessMsg}</span>
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
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl text-center font-medium">
                    ✓ This voucher has already been marked as redeemed and confirmed.
                  </div>
                ) : null}
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
