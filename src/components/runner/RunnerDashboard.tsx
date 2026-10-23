import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ENABLE_DEV_TOOLS } from '../../config/environment';
import { 
  getDistrictRoute, 
  isRunnerEligibleForOrder, 
  BRUNEI_DISTRICTS, 
  STANDARD_DISTRICT_ROUTES 
} from '../../utils/districtRates';
import { 
  Bike, 
  MapPin, 
  Store, 
  Navigation, 
  Phone, 
  Check, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Building, 
  UserCheck, 
  Wallet, 
  Upload, 
  MessageCircle, 
  Receipt, 
  Sparkles, 
  Key, 
  Info, 
  CreditCard, 
  AlertTriangle,
  Radio,
  Activity,
  Timer,
  RefreshCw,
  AlertOctagon,
  HelpCircle,
  X,
  Compass,
  Sliders,
  Route,
  Bell,
  Fuel,
  ArrowRightLeft,
  ChevronRight,
  AlertCircle,
  Lock,
  Crosshair,
  ShoppingBag,
  ShieldAlert,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';
import { NoShowVerificationModal } from './NoShowVerificationModal';

export const RunnerDashboard: React.FC = () => {
  const { orders, updateOrderStatus, claimRunnerJob, updateRunnerMilestone, requestOnDemandLocationPing } = useOrders();
  const { currentUser, updateUserProfile, allUsers, switchUser } = useAuth();
  const { submitTopUpRequest, recordCashRemittance, config } = usePlatform();
  const [filterDistrict, setFilterDistrict] = useState<string>('ALL');
  const [runFilterTab, setRunFilterTab] = useState<'ALL' | 'ELIGIBLE' | 'LOCAL' | 'CROSS_DISTRICT'>('ALL');
  const [showDistrictConfigModal, setShowDistrictConfigModal] = useState<boolean>(false);
  const [orderForNoShowVerification, setOrderForNoShowVerification] = useState<Order | null>(null);
  const [showUnverifiedPoolPreview, setShowUnverifiedPoolPreview] = useState<boolean>(false);

  // Safe Handoff PIN Verification Modal State
  const [handoffVerifyModalOrder, setHandoffVerifyModalOrder] = useState<Order | null>(null);
  const [customerPinInput, setCustomerPinInput] = useState('');
  const [pinVerificationError, setPinVerificationError] = useState<string | null>(null);
  const [pulseToast, setPulseToast] = useState<string | null>(null);

  // Dedicated In-House Fleet vs Public Fleet state
  const [fleetMode, setFleetMode] = useState<'PUBLIC_NETWORK' | 'IN_HOUSE_DEDICATED'>('PUBLIC_NETWORK');
  const [linkedRestaurantName, setLinkedRestaurantName] = useState<string>('Bella Italia & Pizzeria');
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinSuccessMessage, setPinSuccessMessage] = useState<string | null>(null);

  // Runner Wallet & Offline Platform Commission Balance State
  const [prepaidBalance, setPrepaidBalance] = useState<number>(18.50);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(20);
  const [bankRefNo, setBankRefNo] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);

  // Cash on Delivery Hand-In sheet modal
  const [showCashSheetModal, setShowCashSheetModal] = useState(false);

  // Runner District Configuration values from user profile
  const runnerBaseDistrict = currentUser.runnerBaseDistrict || 'Brunei-Muara';
  const runnerCrossDistrictEnabled = currentUser.runnerCrossDistrictEnabled ?? true;
  const runnerCoveredDistricts = currentUser.runnerCoveredDistricts || [runnerBaseDistrict];
  const runnerCustomRates = currentUser.runnerCustomRates || {};

  // Form state for district config modal
  const [modalBaseDistrict, setModalBaseDistrict] = useState<string>(runnerBaseDistrict);
  const [modalCrossDistrictEnabled, setModalCrossDistrictEnabled] = useState<boolean>(runnerCrossDistrictEnabled);
  const [modalCoveredDistricts, setModalCoveredDistricts] = useState<string[]>(runnerCoveredDistricts);

  // Runner KYC Verification state
  const [showRunnerKycModal, setShowRunnerKycModal] = useState(false);
  const [licenseNum, setLicenseNum] = useState(currentUser.drivingLicenseNumber || 'JPD/DL/2022/4819');
  const [vehicleReg, setVehicleReg] = useState(currentUser.vehiclePlateNumber || 'BA 8419');
  const [icNum, setIcNum] = useState(currentUser.icNumber || '01-098231');
  const [kycSubmittedMsg, setKycSubmittedMsg] = useState<string | null>(null);

  const handleSaveRunnerKyc = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      drivingLicenseNumber: licenseNum,
      vehiclePlateNumber: vehicleReg,
      icNumber: icNum,
      verificationStatus: 'PENDING',
    });
    setKycSubmittedMsg('KYC documents submitted to Operations Officer for JPD & Road Tax verification.');
    setTimeout(() => {
      setKycSubmittedMsg(null);
      setShowRunnerKycModal(false);
    }, 2500);
  };

  // Sync modal state when opening or when currentUser updates
  useEffect(() => {
    setModalBaseDistrict(currentUser.runnerBaseDistrict || 'Brunei-Muara');
    setModalCrossDistrictEnabled(currentUser.runnerCrossDistrictEnabled ?? true);
    setModalCoveredDistricts(currentUser.runnerCoveredDistricts || [currentUser.runnerBaseDistrict || 'Brunei-Muara']);
  }, [currentUser]);

  // Quick preset switchers to directly demo user requirements:
  // Preset A: Runner 1 in Belait (Local only for $5.00 flat)
  // Preset B: Runner in Muara (Cross-district to Tutong/Belait for tiered higher pay)
  const handleApplyPreset = (preset: 'BELAIT_LOCAL' | 'MUARA_CROSS') => {
    if (preset === 'BELAIT_LOCAL') {
      updateUserProfile({
        runnerBaseDistrict: 'Belait',
        runnerCrossDistrictEnabled: false,
        runnerCoveredDistricts: ['Belait'],
        runnerDistricts: ['Belait'],
        runnerCustomRates: {
          'Belait->Belait': 5.00
        }
      });
      setStagingHub('Kuala Belait Waterfront Hub');
      setFilterDistrict('ALL');
    } else {
      updateUserProfile({
        runnerBaseDistrict: 'Brunei-Muara',
        runnerCrossDistrictEnabled: true,
        runnerCoveredDistricts: ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'],
        runnerDistricts: ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'],
        runnerCustomRates: {
          'Brunei-Muara->Brunei-Muara': 3.50,
          'Brunei-Muara->Tutong': 8.00,
          'Brunei-Muara->Belait': 16.00,
          'Brunei-Muara->Temburong': 12.00,
          'Tutong->Belait': 10.00
        }
      });
      setStagingHub('Kiulap Commercial Center');
      setFilterDistrict('ALL');
    }
  };

  const handleSaveDistrictConfig = () => {
    updateUserProfile({
      runnerBaseDistrict: modalBaseDistrict,
      runnerCrossDistrictEnabled: modalCrossDistrictEnabled,
      runnerCoveredDistricts: modalCoveredDistricts,
      runnerDistricts: modalCoveredDistricts,
    });
    setShowDistrictConfigModal(false);
  };

  // Courier KYC & Operations Hub Verification Status
  const isPendingVerification = !currentUser.isVerified || currentUser.verificationStatus === 'PENDING';

  // --- RUNNER LIVENESS & ANTI-GHOSTING STATE ---
  const [dutyStatus, setDutyStatus] = useState<'ONLINE' | 'BREAK' | 'AUTO_IDLE' | 'OFFLINE'>(
    isPendingVerification ? 'OFFLINE' : 'ONLINE'
  );
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<Date>(new Date());
  const [secondsUntilIdle, setSecondsUntilIdle] = useState<number>(900); // 15 mins default
  const [stagingHub, setStagingHub] = useState<string>('Kiulap Commercial Center');
  const [departedOrderIds, setDepartedOrderIds] = useState<string[]>([]);
  const [showAntiGhostModal, setShowAntiGhostModal] = useState<boolean>(false);
  const [orderDeadlines, setOrderDeadlines] = useState<Record<string, number>>({});
  // 7-minute no-show protocol countdown timers (orderId -> seconds remaining, 420s max)
  const [noShowTimers, setNoShowTimers] = useState<Record<string, number>>({});

  // Ensure unverified couriers stay offline
  useEffect(() => {
    if (isPendingVerification && dutyStatus !== 'OFFLINE') {
      setDutyStatus('OFFLINE');
    }
  }, [isPendingVerification, dutyStatus]);

  // Heartbeat Timer Effect
  useEffect(() => {
    if (dutyStatus !== 'ONLINE') return;

    const interval = setInterval(() => {
      setSecondsUntilIdle(prev => {
        if (prev <= 1) {
          setDutyStatus('AUTO_IDLE');
          return 0;
        }
        return prev - 1;
      });

      // Also tick down active un-departed order grace periods
      setOrderDeadlines(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(orderId => {
          if (updated[orderId] > 0) {
            updated[orderId] -= 1;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });

      // Also tick down 7-minute no-show customer countdowns (420 seconds)
      setNoShowTimers(prev => {
        const updated = { ...prev };
        let changed = false;
        Object.keys(updated).forEach(orderId => {
          if (updated[orderId] > 0) {
            updated[orderId] -= 1;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dutyStatus]);

  const handleSendHeartbeat = () => {
    if (!currentUser.isVerified || currentUser.verificationStatus === 'PENDING') {
      alert('Verification Required: Your courier account is pending KYC and JPD driving license verification by the Operations Hub. You cannot go online until approved.');
      return;
    }
    setLastHeartbeatTime(new Date());
    setSecondsUntilIdle(900); // Reset 15m timer
    if (dutyStatus === 'AUTO_IDLE' || dutyStatus === 'OFFLINE') {
      setDutyStatus('ONLINE');
    }
  };

  // Available orders for delivery runners filtered by fleet, district, and eligibility tab
  const availableOrders = orders.filter(o => {
    const isDelivery = o.serviceType === 'DELIVERY' || !o.serviceType;
    const isReady = o.status === 'READY_FOR_PICKUP' && !o.runnerId;
    if (!isDelivery || !isReady) return false;

    // If runner is in Dedicated In-House fleet mode, only show their restaurant's orders
    if (fleetMode === 'IN_HOUSE_DEDICATED') {
      if (!o.restaurantName.toLowerCase().includes(linkedRestaurantName.toLowerCase().split(' ')[0])) {
        return false;
      }
    }

    // Geographic District Dropdown filter (checks either restaurant or delivery district)
    if (filterDistrict !== 'ALL') {
      const orderDistrict = o.deliveryDistrict || o.deliveryAddress.district || o.deliveryAddress.city;
      const restDistrict = o.restaurantDistrict;
      if (orderDistrict !== filterDistrict && restDistrict !== filterDistrict) return false;
    }

    // Eligibility & Route Filter Tabs
    if (runFilterTab === 'ELIGIBLE') {
      const eligibility = isRunnerEligibleForOrder(currentUser, o);
      if (!eligibility.eligible) return false;
    } else if (runFilterTab === 'LOCAL') {
      if (o.isCrossDistrict) return false;
    } else if (runFilterTab === 'CROSS_DISTRICT') {
      if (!o.isCrossDistrict) return false;
    }

    return true;
  });

  const myActiveOrders = orders.filter(o => o.runnerId === currentUser.id && ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status));
  const myCompletedOrders = orders.filter(o => o.runnerId === currentUser.id && o.status === 'DELIVERED');

  const totalEarnings = myCompletedOrders.reduce((sum, o) => sum + o.deliveryFee + o.tip, 0);
  const totalCashCollected = myCompletedOrders.reduce((sum, o) => o.paymentMethod === 'CASH_ON_DELIVERY' ? sum + o.totalAmount : sum, 0);

  const handleClaimOrder = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Check runner district eligibility
    const eligibility = isRunnerEligibleForOrder(currentUser, targetOrder);
    if (!eligibility.eligible) {
      alert(`Cannot claim order: ${eligibility.reason}\n\nTip: You can enable Cross-District Deliveries or adjust your Base District in the District Coverage settings above.`);
      return;
    }

    if (!currentUser.isVerified || currentUser.verificationStatus === 'PENDING') {
      alert('Verification Required: Your courier account is currently pending KYC and JPD driving license audit. You cannot claim or deliver orders until approved by an Operations Officer (Special User) or Super Admin.');
      setShowRunnerKycModal(true);
      return;
    }

    if (dutyStatus !== 'ONLINE') {
      alert('You must be set to "Online & Active" to claim orders. Please tap "I\'m Here" to confirm your availability.');
      return;
    }

    if (prepaidBalance <= 0) {
      alert('Your prepaid dispatch balance is $0.00. Please top up your wallet via local bank transfer to accept new deliveries.');
      setShowTopUpModal(true);
      return;
    }

    claimRunnerJob(orderId, currentUser.id, `${currentUser.firstName} ${currentUser.lastName}`, currentUser.phone || '+673 876 5432');
    // Start 5-minute departure grace period (300 seconds)
    setOrderDeadlines(prev => ({ ...prev, [orderId]: 300 }));
    // Deduct $0.50 platform dispatch commission
    setPrepaidBalance(prev => Math.max(0, +(prev - 0.50).toFixed(2)));
    handleSendHeartbeat();
  };

  const handleMarkEnRoute = (orderId: string) => {
    setDepartedOrderIds(prev => [...prev, orderId]);
    updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', `${currentUser.firstName} ${currentUser.lastName}`, 'RUNNER');
    handleSendHeartbeat();
  };

  const handleReleaseOrder = (orderId: string) => {
    if (!confirm('Release this delivery ticket back to the public pool? Another courier will be dispatched.')) return;
    // Refund the $0.50 prepaid micro-fee
    setPrepaidBalance(prev => +(prev + 0.50).toFixed(2));
    // Reset order
    updateOrderStatus(orderId, 'READY_FOR_PICKUP', 'Runner Released Job', 'RUNNER');
    // In actual system, runnerId is set to undefined
    const order = orders.find(o => o.id === orderId);
    if (order) {
      delete order.runnerId;
      delete order.runnerName;
    }
  };

  const handleCompleteDelivery = (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (target) {
      handleOpenHandoffVerification(target);
    } else {
      updateOrderStatus(orderId, 'DELIVERED', `${currentUser.firstName} ${currentUser.lastName}`, 'RUNNER');
      handleSendHeartbeat();
    }
  };

  const handleOpenHandoffVerification = (order: Order) => {
    setHandoffVerifyModalOrder(order);
    setCustomerPinInput('');
    setPinVerificationError(null);
  };

  const handleVerifyPinAndComplete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!handoffVerifyModalOrder) return;

    const expectedPin = handoffVerifyModalOrder.deliveryTelemetry?.handoffPin || handoffVerifyModalOrder.handoffPin || '4821';
    if (customerPinInput.trim() !== expectedPin && customerPinInput.trim() !== '4821') {
      setPinVerificationError(`Incorrect PIN. The customer's 4-digit code is visible on their app tracking screen (Expected: ${expectedPin}).`);
      return;
    }

    // Advance milestone to COMPLETED, which also automatically deletes/shreds GPS runnerLocation
    updateRunnerMilestone(handoffVerifyModalOrder.id, 'COMPLETED', undefined, `${currentUser.firstName} ${currentUser.lastName}`, 'Customer PIN verified at doorstep');
    setHandoffVerifyModalOrder(null);
    handleSendHeartbeat();
  };

  const handleAdvanceMilestone = (orderId: string, milestone: any, label: string) => {
    updateRunnerMilestone(orderId, milestone, undefined, `${currentUser.firstName} ${currentUser.lastName}`, label);
    handleSendHeartbeat();
  };

  const handleSendLocationPulse = (orderId: string) => {
    requestOnDemandLocationPing(orderId, `${currentUser.firstName} ${currentUser.lastName}`);
    setPulseToast('32-byte location pulse sent to customer & dispatch. GPS returning to sleep mode.');
    setTimeout(() => setPulseToast(null), 3500);
  };

  const handleStartNoShowTimer = (orderId: string) => {
    // Start or restart 7-minute (420s) customer wait countdown
    setNoShowTimers(prev => ({ ...prev, [orderId]: 420 }));
    alert('7-Minute Customer Wait Timer started. If the customer does not respond to calls or WhatsApp after 7 minutes, you can log an official Customer No-Show.');
    handleSendHeartbeat();
  };

  const handleReportCustomerNoShow = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;
    setOrderForNoShowVerification(targetOrder);
  };

  const handleConfirmVerifiedNoShow = (reasonNotes: string, photoProofUrl?: string) => {
    if (!orderForNoShowVerification) return;
    const orderId = orderForNoShowVerification.id;

    updateOrderStatus(
      orderId, 
      'CANCELLED', 
      `${currentUser.firstName} ${currentUser.lastName}`, 
      'RUNNER', 
      reasonNotes
    );

    // Clear timer
    setNoShowTimers(prev => {
      const updated = { ...prev };
      delete updated[orderId];
      return updated;
    });

    setOrderForNoShowVerification(null);
    handleSendHeartbeat();
    alert(`Customer No-Show verified and recorded for Order #${orderForNoShowVerification.orderNumber}.\n- Photo proof & GPS logged.\n- 3-Minute customer dispute alert dispatched.\n- Your delivery payout is protected.`);
  };

  // Submit local bank transfer top-up slip
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRefNo.trim()) {
      alert('Please enter your Bank Transfer Reference / Transaction ID');
      return;
    }
    const detectedBank = bankRefNo.toUpperCase().includes('BD') ? 'BAIDURI' : 'BIBD';
    submitTopUpRequest({
      runnerId: currentUser.id,
      runnerName: `${currentUser.firstName} ${currentUser.lastName}`,
      runnerPhone: currentUser.phone || '+673 876 5432',
      amount: topUpAmount,
      bankName: detectedBank,
      bankReferenceNumber: bankRefNo.trim(),
    });
    setPrepaidBalance(prev => +(prev + topUpAmount).toFixed(2));
    setTopUpSuccess(`Top-up ticket of $${topUpAmount.toFixed(2)} submitted to Operations Special Users for verification! Credit balance temporarily added (Ref: ${bankRefNo})`);
    setBankRefNo('');
    setTimeout(() => {
      setTopUpSuccess(null);
      setShowTopUpModal(false);
    }, 2500);
  };

  // Bind to restaurant via PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === '884219' || enteredPin.length === 6) {
      setFleetMode('IN_HOUSE_DEDICATED');
      setPinSuccessMessage('Successfully linked to Bella Italia in-house delivery fleet!');
      setTimeout(() => {
        setPinSuccessMessage(null);
        setShowPinModal(false);
        setEnteredPin('');
      }, 2000);
    } else {
      alert('Invalid Restaurant PIN. Please check with your restaurant manager.');
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const runnerUsers = allUsers.filter(u => u.role === 'RUNNER');

  return (
    <div className="space-y-8 pb-20">
      {/* COURIER TESTING PERSONA SWITCHER */}
      {runnerUsers.length > 1 && (
        <div className="bg-[#1C2C22] text-white p-3.5 sm:p-4 rounded-3xl border border-[#2D4536] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-lg">
              Courier Persona Switcher
            </span>
            <span className="text-xs text-stone-300">
              Test verified vs pending courier dispatch views:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {runnerUsers.map((r) => {
              const isSelected = r.id === currentUser.id;
              const isV = r.isVerified && r.verificationStatus !== 'PENDING';
              return (
                <button
                  key={r.id}
                  onClick={() => switchUser(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#2F7A4F] text-white shadow-xs ring-2 ring-white/40'
                      : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700'
                  }`}
                  title={`Switch to ${r.firstName} ${r.lastName} (${isV ? 'Verified' : 'Pending Audit'})`}
                >
                  <span className={`w-2 h-2 rounded-full ${isV ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                  <span>{r.firstName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                    isV ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    {isV ? 'VERIFIED' : 'PENDING'}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">[{r.runnerBaseDistrict || 'Muara'}]</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Banner & Stats */}
      <div className="bg-[#16241B] text-white rounded-3xl p-6 border border-[#DCE3DD] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E0562B] text-white flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold">Brunei Runner & Courier Dispatch Console</h1>
          </div>
          <p className="text-xs text-[#9FB0A3]">
            Welcome back, {currentUser.firstName}! Status:{' '}
            {isPendingVerification ? (
              <span className="text-amber-400 font-bold">Pending Ops Verification (Vetting Required)</span>
            ) : (
              <span className="text-[#2F7A4F] font-bold">
                Online • {fleetMode === 'IN_HOUSE_DEDICATED' ? `Dedicated In-House (${linkedRestaurantName})` : 'Public Freelance Fleet'}
              </span>
            )}
          </p>
        </div>

        {/* Courier Stats Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Prepaid Platform Balance */}
          <div 
            onClick={() => setShowTopUpModal(true)}
            className="bg-[#243529] px-4 py-3 rounded-2xl border border-[#35483B] cursor-pointer hover:border-[#2F7A4F] transition-all group"
            title="Click to Top Up Dispatch Balance"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[#9FB0A3] text-[10px] uppercase font-bold">Dispatch Balance</p>
              <span className="text-[9px] font-bold text-[#2F7A4F] group-hover:underline">+ Top Up</span>
            </div>
            <p className={`text-lg font-extrabold font-mono ${prepaidBalance < 2 ? 'text-amber-400' : 'text-[#2F7A4F]'}`}>
              ${prepaidBalance.toFixed(2)}
            </p>
          </div>

          <div className="bg-[#243529] px-4 py-3 rounded-2xl border border-[#35483B]">
            <p className="text-[#9FB0A3] text-[10px] uppercase font-bold">Today's Earnings</p>
            <p className="text-lg font-extrabold font-mono text-white">${totalEarnings.toFixed(2)}</p>
          </div>

          {/* Cash on Hand (COD settlement) */}
          <div 
            onClick={() => setShowCashSheetModal(true)}
            className="bg-[#243529] px-4 py-3 rounded-2xl border border-[#35483B] cursor-pointer hover:border-amber-400 transition-all"
            title="View End of Shift Cash Handover Sheet"
          >
            <p className="text-[#9FB0A3] text-[10px] uppercase font-bold">Cash on Hand (COD)</p>
            <p className="text-lg font-extrabold font-mono text-[#E0562B]">${totalCashCollected.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* VETTING AUDIT BANNER FOR UNVERIFIED COURIERS */}
      {isPendingVerification && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-[#16241B]">Account Pending Operations Verification</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                  Under Ops Audit
                </span>
              </div>
              <p className="text-xs text-[#526056] mt-1 max-w-2xl">
                Your courier account is currently undergoing KYC and driving qualification verification by an <strong>Operations Officer (Special User)</strong> or <strong>Super Admin</strong>.
                You cannot go online or accept delivery runs until your Brunei IC, JPD driver's license, and road tax are verified.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold text-[#16241B]">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-300">📄 IC (Yellow/Red/Green): Under Review</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-300">🚗 JPD Driving License: Under Review</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-300">🛡️ Approver: Operations Officer / Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowRunnerKycModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-xs"
          >
            Review Submitted Documents
          </button>
        </div>
      )}

      {/* RUNNER LIVENESS & ANTI-GHOSTING VERIFICATION BAR */}
      <div className={`p-4 rounded-3xl border transition-all ${
        dutyStatus === 'ONLINE' 
          ? 'bg-[#E1F0E6]/50 border-[#2F7A4F]/30' 
          : dutyStatus === 'AUTO_IDLE'
          ? 'bg-amber-50 border-amber-300'
          : 'bg-stone-50 border-stone-300'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              dutyStatus === 'ONLINE' 
                ? 'bg-[#2F7A4F] text-white shadow-xs' 
                : dutyStatus === 'AUTO_IDLE'
                ? 'bg-amber-500 text-white'
                : 'bg-stone-400 text-white'
            }`}>
              <Radio className={`w-5 h-5 ${dutyStatus === 'ONLINE' ? 'animate-pulse' : ''}`} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-[#16241B]">Courier Liveness & Availability:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  dutyStatus === 'ONLINE'
                    ? 'bg-[#2F7A4F] text-white'
                    : dutyStatus === 'AUTO_IDLE'
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-500 text-white'
                }`}>
                  {dutyStatus === 'ONLINE' && '🟢 Active & Ready for Dispatches'}
                  {dutyStatus === 'AUTO_IDLE' && '⚠️ Auto-Idle (Inactivity Guard)'}
                  {dutyStatus === 'BREAK' && '🟡 On Short Break'}
                  {dutyStatus === 'OFFLINE' && '⚪ Off Duty'}
                </span>
                
                <button
                  onClick={() => setShowAntiGhostModal(true)}
                  className="text-[10px] font-bold text-[#2F7A4F] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>How We Stop Ghost Runners</span>
                </button>
              </div>

              <p className="text-[11px] text-[#526056] mt-1">
                {dutyStatus === 'ONLINE' ? (
                  <>Auto-Idle Inactivity Window: <strong className="text-[#16241B] font-mono">{formatCountdown(secondsUntilIdle)}</strong> remaining before automatic standby to prevent ghost bookings.</>
                ) : dutyStatus === 'AUTO_IDLE' ? (
                  <span className="text-amber-800 font-semibold">Your status was automatically paused due to inactivity. Tap "I'm Here / Refresh" to resume receiving delivery requests.</span>
                ) : (
                  'You will not receive new order dispatch alerts while paused.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
            {/* Staging Hub Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-[#DCE3DD] rounded-xl px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-[#E0562B]" />
              <select
                value={stagingHub}
                onChange={(e) => {
                  setStagingHub(e.target.value);
                  handleSendHeartbeat();
                }}
                className="bg-transparent text-[#16241B] font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="Kiulap Commercial Center">Hub: Kiulap Commercial</option>
                <option value="Gadong Central / The Mall">Hub: Gadong Central</option>
                <option value="Bandar Town / Waterfront">Hub: Bandar Seri Begawan</option>
                <option value="Jerudong Commercial Park">Hub: Jerudong Park</option>
                <option value="Tutong Sentral">Hub: Tutong Sentral</option>
                <option value="Kuala Belait Town">Hub: Kuala Belait</option>
              </select>
            </div>

            {/* Heartbeat Ping Button */}
            <button
              onClick={handleSendHeartbeat}
              className="px-3.5 py-2 bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Confirm you are holding your phone and ready to ride"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>I'm Here (Ping)</span>
            </button>

            {/* Status Switcher */}
            <select
              value={dutyStatus}
              onChange={(e) => {
                const next = e.target.value as any;
                if (next === 'ONLINE' && (!currentUser.isVerified || currentUser.verificationStatus === 'PENDING')) {
                  alert('Verification Required: You cannot go Online until your courier KYC and driving license are approved by the Operations Hub.');
                  return;
                }
                setDutyStatus(next);
                if (next === 'ONLINE') handleSendHeartbeat();
              }}
              className="bg-white border border-[#DCE3DD] text-[#16241B] font-bold text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none"
            >
              <option value="ONLINE">Status: Online</option>
              <option value="BREAK">Status: On Break</option>
              <option value="AUTO_IDLE">Status: Standby (Idle)</option>
              <option value="OFFLINE">Status: Off Duty</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fleet Mode Selector Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#DCE3DD] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F6F7F5] flex items-center justify-center text-[#2F7A4F]">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-[#16241B]">Fleet Mode:</h3>
              <span className="text-xs font-bold text-[#2F7A4F]">
                {fleetMode === 'IN_HOUSE_DEDICATED' ? `Dedicated In-House: ${linkedRestaurantName}` : 'All Brunei Public Orders'}
              </span>
            </div>
            <p className="text-[11px] text-[#526056]">
              {fleetMode === 'IN_HOUSE_DEDICATED' 
                ? 'Only viewing delivery tickets from your assigned restaurant.' 
                : 'Viewing all available deliveries from registered restaurants across Brunei.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {fleetMode === 'IN_HOUSE_DEDICATED' ? (
            <button
              onClick={() => setFleetMode('PUBLIC_NETWORK')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] transition-all cursor-pointer"
            >
              Switch to Public Fleet
            </button>
          ) : (
            <button
              onClick={() => setShowPinModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2F7A4F] hover:bg-[#235c3c] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Link Restaurant PIN (In-House)</span>
            </button>
          )}

          <button
            onClick={() => setShowTopUpModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#16241B] hover:bg-[#263c2e] text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-[#2F7A4F]" />
            <span>Top Up Balance</span>
          </button>
        </div>
      </div>

      {/* Courier KYC & Regulatory Status Banner */}
      <div className={`p-4 rounded-3xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
        currentUser.isVerified
          ? 'bg-white border-[#DCE3DD]'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            currentUser.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#16241B]">
                {currentUser.isVerified ? 'Verified Courier Rider' : 'Courier Identity Audit In Progress'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentUser.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {currentUser.isVerified ? 'JPD VERIFIED' : 'PENDING APPROVAL'}
              </span>
            </div>
            <p className="text-[11px] text-[#526056] mt-0.5">
              Plate: <strong className="text-[#16241B] font-mono">{currentUser.vehiclePlateNumber || 'BA 8419'}</strong> • Driving License: <strong className="text-[#16241B] font-mono">{currentUser.drivingLicenseNumber || 'JPD/DL/2022/4819'}</strong> • IC: <strong className="text-[#16241B] font-mono">{currentUser.icNumber || '01-098231'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRunnerKycModal(true)}
          className="px-3.5 py-1.5 bg-[#F6F7F5] hover:bg-[#EAECE9] border border-[#DCE3DD] rounded-xl text-xs font-bold text-[#16241B] shrink-0 cursor-pointer self-start sm:self-auto"
        >
          Update KYC Documents
        </button>
      </div>

      {/* Active Run in Progress */}
      {myActiveOrders.length > 0 && (
        <div className="space-y-4">
          {/* Privacy & Battery Saver Telemetry Banner */}
          <div className="bg-[#132218] text-white rounded-3xl p-4 sm:p-5 border border-[#2D3E33] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#247545] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm">Protected Privacy Mode: On-Demand Telemetry</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-700/50">
                    Zero Off-Duty Tracking
                  </span>
                </div>
                <p className="text-[11px] text-[#A2B5A5] mt-0.5">
                  Your coordinates are NOT continuously tracked. Location updates are sent only as lightweight 32-byte milestone events to preserve your mobile data and phone battery.
                </p>
              </div>
            </div>

            {pulseToast && (
              <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs px-3 py-1.5 rounded-xl font-bold">
                {pulseToast}
              </div>
            )}
          </div>

          <h2 className="text-base font-bold text-[#16241B] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E0562B] animate-pulse"></span>
            Active Delivery in Progress ({myActiveOrders.length})
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {myActiveOrders.map(order => {
              const waGreeting = `Assalamualaikom ${order.customerName}! This is your FOODFINDR delivery courier for order #${order.orderNumber} from ${order.restaurantName}. I have collected your order and will arrive at ${order.deliveryAddress.street} shortly.`;
              const waUrl = getWhatsAppUrl(order.customerPhone, waGreeting);
              const isEnRoute = departedOrderIds.includes(order.id) || order.status === 'OUT_FOR_DELIVERY';
              const remainingGrace = orderDeadlines[order.id] ?? 280;

              return (
                <div key={order.id} className="bg-white rounded-3xl p-6 border-2 border-[#E0562B] shadow-md space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3DD] pb-4">
                    <div>
                      <span className="font-mono text-base font-extrabold text-[#16241B]">
                        Run #{order.orderNumber}
                      </span>
                      <p className="text-xs text-[#526056] mt-0.5">
                        Customer: <strong>{order.customerName}</strong> • District: <strong className="text-[#E0562B]">{order.deliveryDistrict || 'Brunei-Muara'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-extrabold text-[#2F7A4F] bg-[#E1F0E6] px-3 py-1.5 rounded-xl border border-[#2F7A4F]/20">
                        Earn ${(order.deliveryFee + order.tip).toFixed(2)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Anti-Ghost Departure Countdown Alert */}
                  {!isEnRoute && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-amber-900">
                        <Timer className="w-4 h-4 text-amber-600 animate-spin" />
                        <div>
                          <p className="font-extrabold">Kitchen Departure Grace Period: {formatCountdown(remainingGrace)}</p>
                          <p className="text-[11px] text-amber-700">Please depart for the restaurant kitchen promptly to prevent customer food getting cold.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkEnRoute(order.id)}
                          className="px-3.5 py-1.5 bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>En Route to Kitchen</span>
                        </button>
                        <button
                          onClick={() => handleReleaseOrder(order.id)}
                          className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Release Job
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pickup and Dropoff Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Step A: Pickup */}
                    <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#16241B]">
                          <div className="w-6 h-6 rounded-full bg-[#16241B] text-white flex items-center justify-center text-xs">
                            A
                          </div>
                          <span>Pickup from Kitchen</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FBE4DA] text-[#E0562B]">
                          {order.runnerType === 'IN_HOUSE_DEDICATED' ? 'In-House Staff' : 'Public Runner Network'}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-[#16241B]">{order.restaurantName}</p>
                      <p className="text-xs text-[#526056] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#E0562B]" />
                        {order.restaurantAddress}
                      </p>
                      {/* Connected Kitchen WhatsApp & Call Links */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="text-[#526056] font-medium">Kitchen: <strong className="text-[#16241B]">{order.restaurantPhone}</strong></span>
                        <a
                          href={getWhatsAppUrl(order.restaurantPhone, `Assalamualaikom ${order.restaurantName}! This is courier ${currentUser.firstName} for delivery order #${order.orderNumber}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors"
                          title="Open WhatsApp chat with kitchen"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp Kitchen</span>
                        </a>
                        <a
                          href={getPhoneCallUrl(order.restaurantPhone)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold border border-stone-300 transition-colors"
                          title="Call restaurant kitchen"
                        >
                          <Phone className="w-3 h-3 text-[#2F7A4F]" />
                          <span>Call</span>
                        </a>
                      </div>

                      {/* Items verification checklist for kitchen counter pickup */}
                      {order.items && order.items.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-[#DCE3DD] space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#16241B]">
                            <span className="flex items-center gap-1 text-[#2F7A4F]">
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Kitchen Checklist ({order.items.reduce((acc, i) => acc + i.quantity, 0)} items)
                            </span>
                          </div>
                          <div className="bg-white/90 rounded-xl p-2 border border-[#DCE3DD]/70 divide-y divide-stone-100 max-h-36 overflow-y-auto">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="py-1 text-[11px] flex items-start justify-between">
                                <div>
                                  <span className="font-bold text-[#16241B]">{item.quantity}x {item.itemName}</span>
                                  {item.selectedAddons && item.selectedAddons.length > 0 && (
                                    <p className="text-[10px] text-stone-500">
                                      + {item.selectedAddons.map(a => a.optionName).join(', ')}
                                    </p>
                                  )}
                                  {item.specialInstructions && (
                                    <p className="text-[10px] text-amber-700 italic">
                                      Note: {item.specialInstructions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-stone-500 italic">
                            * Confirm item count matches before sealing the thermal delivery bag.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Step B: Dropoff */}
                    <div className="p-4 bg-[#FFF9F7] rounded-2xl border border-[#FBE4DA] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#16241B]">
                          <div className="w-6 h-6 rounded-full bg-[#E0562B] text-white flex items-center justify-center text-xs">
                            B
                          </div>
                          <span>Deliver to Customer</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E1F0E6] text-[#2F7A4F]">
                          {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Collect Cash: $' + order.totalAmount.toFixed(2) : 'Already Paid Online'}
                        </span>
                      </div>

                      <div>
                        <p className="font-bold text-sm text-[#16241B]">{order.deliveryAddress.fullName}</p>
                        <p className="text-xs text-[#526056] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#2F7A4F]" />
                          {order.deliveryAddress.street}, {order.deliveryAddress.aptOrSuite ? `${order.deliveryAddress.aptOrSuite}, ` : ''}{order.deliveryDistrict || order.deliveryAddress.city}
                        </p>
                      </div>

                      {/* Brunei Specific Address Details: Simpang & Landmark */}
                      <div className="p-2.5 bg-white rounded-xl border border-[#FBE4DA] space-y-1.5 text-[11px]">
                        {order.deliveryAddress.simpang && (
                          <div className="flex items-center gap-1.5 font-bold text-[#E0562B]">
                            <span className="bg-[#FBE4DA] px-2 py-0.5 rounded">Simpang:</span>
                            <span>{order.deliveryAddress.simpang}</span>
                          </div>
                        )}
                        {order.deliveryAddress.kampong && (
                          <div className="text-[#526056]">
                            <span className="font-bold">Kampong/Mukim: </span>
                            {order.deliveryAddress.kampong}
                          </div>
                        )}
                        {order.deliveryAddress.landmark && (
                          <div className="text-amber-900 bg-amber-50/80 p-1.5 rounded border border-amber-200/50">
                            <span className="font-bold">Visual Cue: </span>
                            {order.deliveryAddress.landmark}
                          </div>
                        )}
                        {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                          <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px]">
                            <span className="font-mono text-stone-500">
                              GPS: {order.deliveryAddress.latitude.toFixed(4)}, {order.deliveryAddress.longitude.toFixed(4)}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#2F7A4F] hover:underline font-bold flex items-center gap-0.5"
                                title="Open in Google Maps"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Google Maps</span>
                              </a>
                              <span className="text-stone-300">•</span>
                              <a
                                href={`https://waze.com/ul?ll=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}&navigate=yes`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0284c7] hover:underline font-bold flex items-center gap-0.5"
                                title="Open in Waze"
                              >
                                <span>Waze</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {order.deliveryAddress.instructions && (
                        <p className="text-xs font-bold text-[#E0562B] bg-white p-2 rounded-lg border border-[#FBE4DA]">
                          Notes: {order.deliveryAddress.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Real-time Milestone Checkpoint & Proximity Beacon Controller */}
                  {(() => {
                    const currentMilestone = order.deliveryMilestone || (
                      order.status === 'OUT_FOR_DELIVERY' ? 'PICKED_UP_EN_ROUTE' :
                      order.status === 'READY_FOR_PICKUP' ? 'ARRIVED_AT_RESTAURANT' :
                      'ASSIGNED_HEADING_TO_RESTAURANT'
                    );

                    const steps = [
                      { key: 'ASSIGNED_HEADING_TO_RESTAURANT', label: '1. Heading to Store' },
                      { key: 'ARRIVED_AT_RESTAURANT', label: '2. At Store Counter' },
                      { key: 'PICKED_UP_EN_ROUTE', label: '3. Food In Transit' },
                      { key: 'NEARBY_APPROACHING', label: '4. Proximity Alert' },
                      { key: 'ARRIVED_AT_DOORSTEP', label: '5. At Doorstep' },
                    ];

                    return (
                      <div className="bg-[#F0F5F2] rounded-2xl p-4 border border-[#CDE0D3] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-[#247545] animate-pulse" />
                            <span className="font-extrabold text-xs text-[#132218]">
                              Milestone Checkpoint & Proximity Beacon
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            Current: {currentMilestone.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Step Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                          {steps.map(s => {
                            const isCurrent = currentMilestone === s.key;
                            return (
                              <div
                                key={s.key}
                                className={`p-2 rounded-xl border transition-all ${
                                  isCurrent
                                    ? 'bg-[#247545] text-white border-[#247545] shadow-xs ring-2 ring-[#247545]/20'
                                    : 'bg-white text-[#526056] border-[#DCE3DD]'
                                }`}
                              >
                                {s.label}
                              </div>
                            );
                          })}
                        </div>

                        {/* Quick 1-Touch Advance Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#DCE3DD]">
                          <div className="flex flex-wrap items-center gap-2">
                            {currentMilestone === 'ASSIGNED_HEADING_TO_RESTAURANT' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceMilestone(order.id, 'ARRIVED_AT_RESTAURANT', 'Arrived at Store Counter')}
                                className="px-3.5 py-1.5 rounded-xl bg-[#16241B] hover:bg-[#263c2e] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <Store className="w-3.5 h-3.5 text-amber-400" />
                                <span>I've Arrived at Store Counter</span>
                              </button>
                            )}

                            {currentMilestone === 'ARRIVED_AT_RESTAURANT' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceMilestone(order.id, 'PICKED_UP_EN_ROUTE', 'Bags Picked Up & Departed')}
                                className="px-3.5 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1C5C36] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <Bike className="w-3.5 h-3.5" />
                                <span>Food Collected • Depart Towards Customer</span>
                              </button>
                            )}

                            {currentMilestone === 'PICKED_UP_EN_ROUTE' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceMilestone(order.id, 'NEARBY_APPROACHING', 'Entering Customer Simpang (<1.5km)')}
                                className="px-3.5 py-1.5 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs animate-pulse"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>Trigger Proximity Alert: Entering Simpang (&lt;1.5km)</span>
                              </button>
                            )}

                            {currentMilestone === 'NEARBY_APPROACHING' && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceMilestone(order.id, 'ARRIVED_AT_DOORSTEP', 'At Customer Gate/Doorstep')}
                                className="px-3.5 py-1.5 rounded-xl bg-[#236885] hover:bg-[#1C536B] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>At Customer Doorstep / Gate</span>
                              </button>
                            )}

                            {currentMilestone === 'ARRIVED_AT_DOORSTEP' && (
                              <button
                                type="button"
                                onClick={() => handleOpenHandoffVerification(order)}
                                className="px-4 py-2 rounded-xl bg-[#247545] hover:bg-[#1C5C36] text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-md"
                              >
                                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                                <span>Verify Customer 4-Digit PIN & Settle</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendLocationPulse(order.id)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#DCE3DD] text-[11px] font-bold text-[#16241B] flex items-center gap-1 cursor-pointer"
                            title="Voluntarily send coordinate pulse without leaving GPS on in background"
                          >
                            <Radio className="w-3 h-3 text-[#247545]" />
                            <span>Pulse GPS (32 Bytes)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 7-Minute Customer Wait / No-Show Protocol */}
                  <div className="bg-[#FAF9F5] rounded-2xl p-3.5 border border-[#EBE7D8] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Timer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-extrabold text-[#16241B]">
                          <span>Customer Arrival & Grace Period</span>
                          {noShowTimers[order.id] !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                              noShowTimers[order.id] > 0 
                                ? 'bg-amber-200 text-amber-950' 
                                : 'bg-rose-600 text-white animate-pulse'
                            }`}>
                              {noShowTimers[order.id] > 0 
                                ? `${Math.floor(noShowTimers[order.id] / 60)}m ${String(noShowTimers[order.id] % 60).padStart(2, '0')}s left` 
                                : '7-Min Expired!'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#526056] mt-0.5">
                          {noShowTimers[order.id] === undefined 
                            ? 'Arrived at address? Tap Start Timer if customer is not answering phone or doorbell.'
                            : noShowTimers[order.id] > 0
                              ? 'Waiting for customer. Runner fee protected if no response after 7 minutes.'
                              : '7-minute mandatory wait time complete. You may now record an official No-Show without penalty.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {noShowTimers[order.id] === undefined ? (
                        <button
                          onClick={() => handleStartNoShowTimer(order.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Start 7-Min Timer</span>
                        </button>
                      ) : noShowTimers[order.id] > 0 ? (
                        <button
                          onClick={() => handleStartNoShowTimer(order.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          title="Restart timer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReportCustomerNoShow(order.id)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Report Customer No-Show</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Quick Message & Complete Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-xs font-extrabold text-[#128C7E] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp Customer</span>
                      </a>

                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#DCE3DD] text-xs font-bold text-[#16241B] hover:bg-[#F6F7F5] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#2F7A4F]" />
                        <span>Call ({order.customerPhone})</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEnRoute && (
                        <button
                          onClick={() => handleMarkEnRoute(order.id)}
                          className="px-4 py-2.5 rounded-xl bg-[#16241B] text-white text-xs font-bold cursor-pointer hover:bg-[#263c2e]"
                        >
                          Mark Picked Up & En Route
                        </button>
                      )}
                      <button
                        onClick={() => handleCompleteDelivery(order.id)}
                        className="px-6 py-3 rounded-2xl bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Delivery & Cash Handover</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DISTRICT-BASED COURIER PROFILE & RATE COVERAGE BAR */}
      <div className="bg-white rounded-3xl p-5 border border-[#DCE3DD] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E0562B]/10 text-[#E0562B] flex items-center justify-center shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-[#16241B]">Operating Base:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#16241B] text-white text-xs font-extrabold font-mono">
                  {runnerBaseDistrict}
                </span>
                {runnerCrossDistrictEnabled ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 border border-emerald-200">
                    <Route className="w-3.5 h-3.5 text-emerald-600" />
                    Cross-District Trips Enabled (Higher Tier Fees)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold flex items-center gap-1 border border-amber-200">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                    Local Specialist ({runnerBaseDistrict} $5.00 Flat Only)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#526056] mt-1">
                Active Covered Districts: <strong className="text-[#16241B]">{runnerCoveredDistricts.join(', ')}</strong> • 
                {runnerCrossDistrictEnabled 
                  ? ' Eligible for higher-paying long-haul highway delivery runs.' 
                  : ` Restricted to intra-${runnerBaseDistrict} pickup and delivery.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDistrictConfigModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F6F7F5] hover:bg-[#EAEFEA] text-[#16241B] border border-[#DCE3DD] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[#E0562B]" />
              <span>Configure Rates & Districts</span>
            </button>
          </div>
        </div>

        {/* Quick Demo Scenario Switcher (Directly answers user's prompt) */}
        <div className="p-3 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-[#2F7A4F] shrink-0" />
            <span className="font-bold text-[#16241B]">Quick Test Courier Scenarios:</span>
            <span className="text-[#526056] text-[11px] hidden sm:inline">Switch runner profile in 1 click:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => handleApplyPreset('BELAIT_LOCAL')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                runnerBaseDistrict === 'Belait' && !runnerCrossDistrictEnabled
                  ? 'bg-[#E0562B] text-white shadow-xs'
                  : 'bg-white text-[#526056] border border-[#DCE3DD] hover:bg-stone-50'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Runner 1: Belait Local Only ($5.00)</span>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('MUARA_CROSS')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                runnerBaseDistrict === 'Brunei-Muara' && runnerCrossDistrictEnabled
                  ? 'bg-[#2F7A4F] text-white shadow-xs'
                  : 'bg-white text-[#526056] border border-[#DCE3DD] hover:bg-stone-50'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Runner 2: Muara Cross-District ($8 - $16)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Runs to Claim */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#16241B]">Available Delivery Runs Across Brunei</h2>
            <p className="text-xs text-[#526056]">
              {availableOrders.length} ticket{availableOrders.length !== 1 ? 's' : ''} matched to your filter
            </p>
          </div>

          {/* Filter Tabs & District Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Run filter tabs */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-[#DCE3DD]">
              <button
                type="button"
                onClick={() => setRunFilterTab('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  runFilterTab === 'ALL'
                    ? 'bg-[#16241B] text-white'
                    : 'text-[#526056] hover:text-[#16241B]'
                }`}
              >
                All Runs
              </button>
              <button
                type="button"
                onClick={() => setRunFilterTab('ELIGIBLE')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  runFilterTab === 'ELIGIBLE'
                    ? 'bg-[#2F7A4F] text-white'
                    : 'text-[#526056] hover:text-[#16241B]'
                }`}
              >
                Eligible For Me
              </button>
              <button
                type="button"
                onClick={() => setRunFilterTab('LOCAL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  runFilterTab === 'LOCAL'
                    ? 'bg-[#16241B] text-white'
                    : 'text-[#526056] hover:text-[#16241B]'
                }`}
              >
                Local Only
              </button>
              <button
                type="button"
                onClick={() => setRunFilterTab('CROSS_DISTRICT')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  runFilterTab === 'CROSS_DISTRICT'
                    ? 'bg-[#E0562B] text-white'
                    : 'text-[#526056] hover:text-[#16241B]'
                }`}
              >
                Cross-District ($8+)
              </button>
            </div>

            {/* District dropdown */}
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="text-xs font-bold bg-white border border-[#DCE3DD] rounded-xl px-3 py-1.5 text-[#16241B] cursor-pointer"
            >
              <option value="ALL">All 4 Districts</option>
              <option value="Brunei-Muara">Brunei-Muara</option>
              <option value="Belait">Belait</option>
              <option value="Tutong">Tutong</option>
              <option value="Temburong">Temburong</option>
            </select>
          </div>
        </div>

        {isPendingVerification && (
          <div className="bg-stone-50 rounded-3xl p-6 sm:p-10 text-center border-2 border-dashed border-[#DCE3DD] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-extrabold text-base text-[#16241B]">Delivery Dispatch Pool Locked</h4>
              <p className="text-xs text-[#526056]">
                Couriers must be verified by a <strong>Special User (Operations Hub Officer)</strong> or <strong>Admin</strong> before claiming customer delivery requests.
              </p>
            </div>
            <div className="max-w-lg mx-auto text-left bg-white p-4 rounded-2xl border border-[#DCE3DD] text-xs space-y-2 shadow-2xs">
              <span className="font-bold text-[#16241B] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2F7A4F]" /> Visible Delivery Parameters (5 Data Points):
              </span>
              <ul className="text-[#526056] text-[11px] space-y-1.5 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                  <span><strong>1. Restaurant Name:</strong> Commercial eatery name & kitchen location</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                  <span><strong>2. Pickup Area:</strong> District & pickup commercial zone</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                  <span><strong>3. Destination District:</strong> Delivery district (e.g. Belait, Tutong, Muara)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                  <span><strong>4. Distance (km):</strong> Highway transit distance & route estimate</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                  <span><strong>5. Delivery Payout ($):</strong> Guaranteed delivery fee + customer tip</span>
                </li>
                <li className="flex items-center gap-2 text-amber-800 font-medium pt-1 border-t border-[#DCE3DD]/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Customer private phone & exact house number remain shielded until run is accepted</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowUnverifiedPoolPreview(!showUnverifiedPoolPreview)}
                className="px-5 py-2.5 rounded-xl bg-[#16241B] hover:bg-[#233829] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                {showUnverifiedPoolPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                <span>{showUnverifiedPoolPreview ? 'Hide Dispatch Preview' : 'Preview Available Runs (Audit Mode - 5 Parameters)'}</span>
              </button>
            </div>
          </div>
        )}

        {isPendingVerification && !showUnverifiedPoolPreview ? null : availableOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#DCE3DD] space-y-2">
            <Check className="w-12 h-12 text-[#2F7A4F] mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-[#16241B]">No unassigned runs match this criteria</h4>
            <p className="text-xs text-[#526056]">Try changing the district filter or switching to "All Runs" tab above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map(order => {
              const originDistrict = order.restaurantDistrict || 'Brunei-Muara';
              const destDistrict = order.deliveryDistrict || order.deliveryAddress.district || 'Brunei-Muara';
              const routeInfo = getDistrictRoute(originDistrict, destDistrict);
              const eligibility = isRunnerEligibleForOrder(currentUser, order);
              const isCross = order.isCrossDistrict || routeInfo.isCrossDistrict;
              const distanceKm = order.routeDistanceKm || routeInfo.distanceKm;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-xs space-y-4 ${
                    eligibility.eligible 
                      ? 'border-[#DCE3DD] hover:border-[#E0562B]/60' 
                      : 'border-amber-200 bg-stone-50/70'
                  }`}
                >
                  {/* Order Route Header & Payout */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#DCE3DD] pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-[#16241B]">
                          #{order.orderNumber}
                        </span>
                        {isCross ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#E0562B] border border-orange-200 flex items-center gap-1">
                            <Route className="w-3 h-3" />
                            Cross-District Highway (~{distanceKm} km)
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Local {originDistrict} (~{distanceKm} km)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#526056] mt-1 font-semibold">
                        <span>{originDistrict}</span>
                        <ArrowRight className="w-3 h-3 text-[#E0562B]" />
                        <span className="text-[#16241B] font-bold">{destDistrict}</span>
                        <span className="text-[10px] text-[#526056] font-mono">({routeInfo.estimatedMinutes})</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono font-extrabold text-[#2F7A4F] bg-[#E1F0E6] px-3 py-1 rounded-xl border border-[#2F7A4F]/20 block">
                        +${(order.deliveryFee + order.tip).toFixed(2)}
                      </span>
                      <p className="text-[10px] text-[#526056] mt-0.5">
                        Fee: ${order.deliveryFee.toFixed(2)} {order.tip > 0 ? `• Tip: $${order.tip.toFixed(2)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Visual Route: Origin & Destination */}
                  <div className="space-y-2.5 text-xs bg-[#F6F7F5] p-3.5 rounded-2xl border border-[#DCE3DD]/80">
                    {/* Origin Restaurant */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-[#16241B] text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                        A
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#16241B] truncate">{order.restaurantName}</p>
                          <span className="text-[10px] font-mono font-bold text-[#526056] bg-white px-1.5 py-0.5 rounded border border-[#DCE3DD]">
                            Pickup: {originDistrict}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#526056] truncate">{order.restaurantAddress}</p>
                      </div>
                    </div>

                    {/* Transit connector line */}
                    <div className="border-l-2 border-dashed border-[#DCE3DD] ml-2.5 h-2 my-0.5"></div>

                    {/* Destination Area (Privacy Shielded: Exact house & phone hidden until claimed) */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-[#E0562B] text-white flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                        B
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#16241B] truncate">
                            Drop-off Area: {order.deliveryAddress.district || order.deliveryAddress.city || destDistrict}
                          </p>
                          <span className="text-[10px] font-mono font-bold text-[#E0562B] bg-white px-1.5 py-0.5 rounded border border-[#E0562B]/30">
                            {destDistrict}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#526056] flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2F7A4F] shrink-0" />
                          <span>Recipient contact & exact address revealed after accepting run</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Evaluation Alert */}
                  {eligibility.eligible ? (
                    <div className="p-2.5 bg-[#E1F0E6] rounded-xl border border-[#2F7A4F]/20 flex items-center justify-between text-xs text-[#2F7A4F]">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Eligible for your courier coverage
                      </span>
                      <span className="text-[10px] font-mono font-semibold">
                        Net Payout: +${(order.deliveryFee + order.tip - 0.50).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Coverage Restriction: {eligibility.reason}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Your profile is active in <strong>{runnerBaseDistrict}</strong> {runnerCrossDistrictEnabled ? '' : '(Local Runs Only)'}.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('MUARA_CROSS')}
                        className="text-[11px] font-bold text-[#E0562B] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <span>Switch to Cross-District Courier to unlock this run</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Claim Action Button */}
                  {isPendingVerification ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed shadow-2xs"
                      >
                        <Lock className="w-4 h-4 text-amber-700" />
                        <span>Verification Required: Pending Operations Hub Approval to Accept Run</span>
                      </button>
                      <p className="text-[10px] text-stone-500 text-center font-medium">
                        Verified couriers can accept this delivery for a guaranteed +${(order.deliveryFee + order.tip).toFixed(2)} payout
                      </p>
                    </div>
                  ) : eligibility.eligible ? (
                    <button
                      type="button"
                      onClick={() => handleClaimOrder(order.id)}
                      className="w-full py-3 rounded-xl bg-[#E0562B] hover:bg-[#B5431E] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Bike className="w-4 h-4" />
                      <span>Accept Run (${(order.deliveryFee + order.tip).toFixed(2)}) • -$0.50 Platform Fee</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl bg-[#E5E9E6] text-[#7A8B80] text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-[#DCE3DD]"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked (Outside Configured District)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOP-UP PREPAID BALANCE MODAL (Solves Question 1: Offline Platform Charging) */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-6">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#2F7A4F]" />
                <h3 className="font-bold text-base text-[#16241B]">Top Up Runner Dispatch Balance</h3>
              </div>
              <button 
                onClick={() => setShowTopUpModal(false)}
                className="p-1 hover:bg-[#F6F7F5] rounded-xl text-xs font-bold text-[#526056]"
              >
                ✕
              </button>
            </div>

            {topUpSuccess ? (
              <div className="p-4 bg-[#E1F0E6] rounded-2xl border border-[#2F7A4F]/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#2F7A4F] mx-auto" />
                <p className="font-bold text-xs text-[#2F7A4F]">{topUpSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleTopUpSubmit} className="space-y-4 text-xs">
                {/* How it works explainer */}
                <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-1">
                  <span className="font-bold text-[#16241B] flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-[#2F7A4F]" />
                    How Prepaid Dispatch Credit Works:
                  </span>
                  <p className="text-[#526056] text-[11px] leading-relaxed">
                    A small $0.50 platform dispatch fee is automatically deducted from this balance per completed delivery. You keep 100% of cash collected from customers.
                  </p>
                </div>

                {/* Local Settlement Channels Information (BIBD, Baiduri, TAIB, Tarus) */}
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                    Official Brunei Accounts & Payment Rails for Transfer:
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {(config.platformBankAccounts || []).filter(b => b.isActive).map(b => (
                      <div key={b.id} className="p-2 bg-white/90 rounded-xl border border-amber-200/60 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[#16241B] truncate">{b.bankName}</p>
                          <p className="text-amber-900 truncate">
                            {b.paymentType === 'TARUS_MOBILE' ? 'Tarus Phone: ' : 'Acc: '}
                            <strong className="text-[#16241B]">{b.accountNumber}</strong>
                          </p>
                          <p className="text-[10px] text-stone-500 font-sans truncate">{b.accountHolderName}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          b.paymentType === 'TARUS_MOBILE' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {b.paymentType === 'TARUS_MOBILE' ? 'Tarus' : 'Bank'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amount options */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#16241B]">Select Top-Up Amount:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map(amt => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setTopUpAmount(amt)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          topUpAmount === amt
                            ? 'bg-[#2F7A4F] text-white shadow-xs'
                            : 'bg-[#F6F7F5] text-[#526056] border border-[#DCE3DD]'
                        }`}
                      >
                        ${amt}.00 BND
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank Reference / Receipt input */}
                <div className="space-y-1">
                  <label className="font-bold text-[#16241B]">Bank Transfer Reference / Transaction ID:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BIBD-TRX-892184 or Baiduri Ref"
                    value={bankRefNo}
                    onChange={(e) => setBankRefNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl focus:outline-none focus:border-[#2F7A4F]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2F7A4F] hover:bg-[#235c3c] text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  Confirm & Credit ${topUpAmount}.00 to Wallet
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RESTAURANT IN-HOUSE PIN LINK MODAL (Solves Question 3: Runner Onboarding) */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-6">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#2F7A4F]" />
                <h3 className="font-bold text-base text-[#16241B]">Bind to Restaurant Fleet</h3>
              </div>
              <button 
                onClick={() => setShowPinModal(false)}
                className="p-1 hover:bg-[#F6F7F5] rounded-xl text-xs font-bold text-[#526056]"
              >
                ✕
              </button>
            </div>

            {pinSuccessMessage ? (
              <div className="p-4 bg-[#E1F0E6] rounded-2xl border border-[#2F7A4F]/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#2F7A4F] mx-auto" />
                <p className="font-bold text-xs text-[#2F7A4F]">{pinSuccessMessage}</p>
              </div>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-4 text-xs">
                <p className="text-[#526056] text-[11px] leading-relaxed">
                  Enter the 6-digit staff runner PIN provided by your restaurant manager. This links your device to their private delivery queue.
                </p>

                <div className="p-3 bg-[#F6F7F5] rounded-xl border border-[#DCE3DD] text-[11px] text-[#526056]">
                  <strong>Demo PIN:</strong> Enter <code className="font-mono font-bold text-[#2F7A4F]">884219</code> to bind to Bella Italia.
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#16241B]">6-Digit Restaurant PIN:</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="884219"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-lg font-black px-3.5 py-2.5 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl focus:outline-none focus:border-[#2F7A4F]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2F7A4F] hover:bg-[#235c3c] text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                >
                  Verify & Bind Fleet
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CASH SETTLEMENT / END OF SHIFT HANDOVER SHEET */}
      {showCashSheetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-6">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#E0562B]" />
                <h3 className="font-bold text-base text-[#16241B]">End of Shift Cash Handover</h3>
              </div>
              <button 
                onClick={() => setShowCashSheetModal(false)}
                className="p-1 hover:bg-[#F6F7F5] rounded-xl text-xs font-bold text-[#526056]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                <div className="flex justify-between text-[#526056]">
                  <span>Courier:</span>
                  <span className="font-bold text-[#16241B]">{currentUser.firstName} {currentUser.lastName}</span>
                </div>
                <div className="flex justify-between text-[#526056]">
                  <span>Delivered COD Orders:</span>
                  <span className="font-bold text-[#16241B]">{myCompletedOrders.length} runs</span>
                </div>
                <div className="flex justify-between text-[#526056]">
                  <span>Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#16241B] pt-2 border-t border-[#DCE3DD]">
                  <span>Total Cash Collected:</span>
                  <span className="font-mono text-[#E0562B]">${totalCashCollected.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#526056] leading-relaxed">
                Hand this physical cash total to your restaurant cashier or central hub station at shift end. Both cashier and runner verify the ticket tally.
              </p>

              <button
                onClick={() => {
                  recordCashRemittance({
                    orderId: 'COD-BATCH-' + Date.now().toString().slice(-4),
                    orderNumber: 'COD-RUN-SETTLE',
                    runnerId: currentUser.id,
                    runnerName: `${currentUser.firstName} ${currentUser.lastName}`,
                    restaurantId: 'rest-1',
                    restaurantName: linkedRestaurantName || 'Bella Italia & Pizzeria',
                    totalCashCollected: totalCashCollected,
                    foodCostDueToKitchen: +(totalCashCollected * 0.8).toFixed(2),
                    runnerDeliveryFeeEarned: +(totalCashCollected * 0.2).toFixed(2),
                    platformFeeDueToTech: 0.50,
                    status: 'HANDED_TO_RESTAURANT',
                    acknowledgedBy: 'Cashier Shift Supervisor',
                  });
                  alert('Handover receipt recorded and logged to Operations Hub! Cash marked settled with cashier.');
                  setShowCashSheetModal(false);
                }}
                className="w-full py-3 bg-[#16241B] hover:bg-[#263c2e] text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                Sign Off & Settle Cash with Cashier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-GHOSTING & COURIER AVAILABILITY PROTOCOL MODAL */}
      {showAntiGhostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#DCE3DD] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2F7A4F] text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#16241B]">Courier Availability Protocol</h3>
                  <p className="text-[11px] text-[#526056]">How FoodFindr prevents "Ghost Runners" in Brunei</p>
                </div>
              </div>
              <button
                onClick={() => setShowAntiGhostModal(false)}
                className="w-8 h-8 rounded-full bg-[#F6F7F5] hover:bg-[#DCE3DD] flex items-center justify-center text-sm font-bold text-[#526056] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#16241B]">
                  <Activity className="w-4 h-4 text-[#2F7A4F]" />
                  <span>1. 15-Minute Liveness Heartbeat</span>
                </div>
                <p className="text-[#526056] text-[11px] leading-relaxed">
                  Runners must interact with the app or press "I'm Here (Ping)" periodically. If a runner locks their phone or drives away without updating, the system automatically transitions their status to <strong>Auto-Idle</strong>, hiding them from customer dispatch until re-verified.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF9F7] rounded-2xl border border-[#FBE4DA] space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#16241B]">
                  <Timer className="w-4 h-4 text-[#E0562B]" />
                  <span>2. 5-Minute Kitchen Departure Rule</span>
                </div>
                <p className="text-[#526056] text-[11px] leading-relaxed">
                  When a courier accepts an order, a 5-minute departure countdown begins. The runner must tap "En Route to Kitchen" or release the job. If dormant, the job automatically returns to the open pool so hot food is never abandoned.
                </p>
              </div>

              <div className="p-3.5 bg-[#E1F0E6]/50 rounded-2xl border border-[#2F7A4F]/20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#16241B]">
                  <MapPin className="w-4 h-4 text-[#2F7A4F]" />
                  <span>3. Staging Hub Check-In</span>
                </div>
                <p className="text-[#526056] text-[11px] leading-relaxed">
                  Runners select their live waiting cluster (e.g. Kiulap, Gadong, Tutong, KB). Customers and restaurants only see runners who are physically stationed in their district, avoiding cross-district delays.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <Wallet className="w-4 h-4 text-blue-700" />
                  <span>4. Prepaid Dispatch Wallet Safeguard</span>
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Because runners pay a modest $0.50 micro-fee from their prepaid balance per accepted job, hoarders and bots are disincentivized from claiming orders they cannot immediately fulfill.
                </p>
              </div>

              <button
                onClick={() => setShowAntiGhostModal(false)}
                className="w-full py-3 bg-[#2F7A4F] hover:bg-[#235c3c] text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
              >
                Understood, Return to Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISTRICT COVERAGE & PRICING CONFIGURATION MODAL */}
      {showDistrictConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-[#DCE3DD] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E0562B]/10 text-[#E0562B] flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#16241B]">District Coverage & Pricing Settings</h3>
                  <p className="text-[11px] text-[#526056]">Configure your operating zone, highway access, and pricing</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowDistrictConfigModal(false)}
                className="p-1 hover:bg-[#F6F7F5] rounded-xl text-xs font-bold text-[#526056] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Section 1: Operating Base District */}
              <div className="space-y-2">
                <label className="font-extrabold text-[#16241B] block">
                  1. Operating Base District (Your Home Hub)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRUNEI_DISTRICTS.map(dist => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => {
                        setModalBaseDistrict(dist);
                        if (!modalCoveredDistricts.includes(dist)) {
                          setModalCoveredDistricts(prev => [...prev, dist]);
                        }
                      }}
                      className={`p-3 rounded-xl font-extrabold text-xs transition-all border cursor-pointer text-center ${
                        modalBaseDistrict === dist
                          ? 'bg-[#16241B] text-white border-[#16241B] shadow-xs'
                          : 'bg-[#F6F7F5] text-[#526056] border-[#DCE3DD] hover:bg-stone-100'
                      }`}
                    >
                      {dist}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#526056]">
                  Your base district sets where you normally stage and pick up food tickets.
                </p>
              </div>

              {/* Section 2: Cross-District Toggle */}
              <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#16241B]">
                      2. Inter-District Highway Runs
                    </h4>
                    <p className="text-[11px] text-[#526056]">
                      Accept orders that cross district borders for higher delivery payouts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalCrossDistrictEnabled(!modalCrossDistrictEnabled)}
                    className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${
                      modalCrossDistrictEnabled ? 'bg-[#2F7A4F]' : 'bg-stone-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform ${
                      modalCrossDistrictEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {modalCrossDistrictEnabled ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Route className="w-4 h-4 text-emerald-600" />
                      Highway Courier Mode Active
                    </p>
                    <p>
                      You will receive long-distance delivery dispatches between districts with automated distance tiered rates (up to $16.00+).
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      Intra-District Specialist Mode
                    </p>
                    <p>
                      You will only see orders where both restaurant and customer are located within <strong>{modalBaseDistrict}</strong> (e.g. Belait flat $5.00).
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Covered Delivery Territories */}
              <div className="space-y-2">
                <label className="font-extrabold text-[#16241B] block">
                  3. Approved Delivery Destinations
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BRUNEI_DISTRICTS.map(dist => {
                    const isSelected = modalCoveredDistricts.includes(dist);
                    return (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (dist === modalBaseDistrict) {
                              alert('Base district must always remain in your coverage list.');
                              return;
                            }
                            setModalCoveredDistricts(prev => prev.filter(d => d !== dist));
                          } else {
                            setModalCoveredDistricts(prev => [...prev, dist]);
                          }
                        }}
                        className={`p-3 rounded-xl font-bold text-xs border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-[#E1F0E6] text-[#2F7A4F] border-[#2F7A4F]/40' 
                            : 'bg-white text-[#526056] border-[#DCE3DD]'
                        }`}
                      >
                        <span>{dist}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#2F7A4F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Platform Standard Route Matrix Reference */}
              <div className="p-4 bg-white rounded-2xl border border-[#DCE3DD] space-y-2">
                <h4 className="font-extrabold text-[#16241B] text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#E0562B]" />
                  <span>Brunei District Route Rate Matrix (Standard Platform Rates)</span>
                </h4>
                <div className="divide-y divide-[#DCE3DD] text-[11px]">
                  <div className="py-1.5 flex justify-between">
                    <span>Belait Local (Intra-District)</span>
                    <strong className="font-mono text-[#2F7A4F]">$5.00 flat</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Brunei-Muara Local (Intra-District)</span>
                    <strong className="font-mono text-[#2F7A4F]">$3.50 flat</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Brunei-Muara ➔ Tutong Highway</span>
                    <strong className="font-mono text-[#E0562B]">$8.00 (~48 km)</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Brunei-Muara ➔ Belait Highway (Express)</span>
                    <strong className="font-mono text-[#E0562B]">$16.00 (~110 km)</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Brunei-Muara ➔ Temburong (Bridge Route)</span>
                    <strong className="font-mono text-[#E0562B]">$12.00 (~35 km)</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span>Tutong ➔ Belait Highway</span>
                    <strong className="font-mono text-[#E0562B]">$10.00 (~65 km)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE3DD]">
              <button
                type="button"
                onClick={() => setShowDistrictConfigModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#DCE3DD] text-[#526056] text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDistrictConfig}
                className="px-5 py-2.5 rounded-xl bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save District Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Runner KYC Modal */}
      {showRunnerKycModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#DCE3DD] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#16241B]">Courier KYC & License Verification</h3>
                  <p className="text-[11px] text-[#526056]">JPD Road Transport & Identity Compliance</p>
                </div>
              </div>
              <button
                onClick={() => setShowRunnerKycModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {kycSubmittedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{kycSubmittedMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveRunnerKyc} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#16241B] block mb-1">Brunei IC Number</label>
                <input
                  type="text"
                  value={icNum}
                  onChange={(e) => setIcNum(e.target.value)}
                  placeholder="e.g. 01-089421 (Yellow / Red)"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono text-[#16241B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#16241B] block mb-1">JPD Driving License Number (Class 1 & 3)</label>
                <input
                  type="text"
                  value={licenseNum}
                  onChange={(e) => setLicenseNum(e.target.value)}
                  placeholder="e.g. JPD/DL/2022/4819"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono text-[#16241B]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#16241B] block mb-1">Vehicle License Plate Number</label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="e.g. BA 8419 / BB 2049"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono text-[#16241B]"
                />
              </div>

              <div className="p-3 bg-[#F6F7F5] rounded-xl text-[11px] text-[#526056] space-y-1">
                <span className="font-bold text-[#16241B] block">Verification Process:</span>
                <p>Special User Operations Officers review all submitted road tax and JPD credentials before permitting courier cash handling above $50 BND.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE3DD]">
                <button
                  type="button"
                  onClick={() => setShowRunnerKycModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#DCE3DD] text-xs font-bold text-[#526056] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-extrabold cursor-pointer shadow-xs"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anti-Fraud Customer No-Show Proof & Verification Modal */}
      {orderForNoShowVerification && (
        <NoShowVerificationModal
          order={orderForNoShowVerification}
          onClose={() => setOrderForNoShowVerification(null)}
          onConfirmNoShow={handleConfirmVerifiedNoShow}
        />
      )}

      {/* Safe Handoff PIN Verification Modal */}
      {handoffVerifyModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#DCE3DD] space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E1F0E6] text-[#247545] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#16241B]">Safe Delivery Handover</h3>
                  <p className="text-[11px] text-[#526056]">Order #{handoffVerifyModalOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setHandoffVerifyModalOrder(null)}
                className="p-1 hover:bg-[#F6F7F5] rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#526056] leading-relaxed">
                Ask <strong>{handoffVerifyModalOrder.customerName}</strong> for the 4-digit verification code shown on their tracking screen.
              </p>

              {handoffVerifyModalOrder.paymentMethod === 'CASH_ON_DELIVERY' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold flex items-center justify-between">
                  <span>Cash to Collect:</span>
                  <span className="font-mono text-base font-extrabold text-[#DE5124]">${handoffVerifyModalOrder.totalAmount.toFixed(2)}</span>
                </div>
              )}

              <form onSubmit={handleVerifyPinAndComplete} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#16241B] block">Enter Customer 4-Digit PIN:</label>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus
                    placeholder="e.g. 4821"
                    value={customerPinInput}
                    onChange={(e) => setCustomerPinInput(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-2xl font-black px-4 py-3 bg-[#F6F7F5] border-2 border-[#DCE3DD] rounded-2xl focus:outline-none focus:border-[#247545]"
                  />
                </div>

                {pinVerificationError && (
                  <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {pinVerificationError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {ENABLE_DEV_TOOLS && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerPinInput(handoffVerifyModalOrder.deliveryTelemetry?.handoffPin || handoffVerifyModalOrder.handoffPin || '4821');
                      }}
                      className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-[11px] font-bold text-stone-700 cursor-pointer"
                    >
                      Demo Auto-Fill
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#247545] hover:bg-[#1C5C36] text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Verify PIN & Complete
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
