import React, { useState } from 'react';
import { Restaurant, OrderingMode, SubscriptionTier } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { usePlatform } from '../../context/PlatformContext';
import { 
  Sliders, 
  X, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  Info,
  Layers,
  Sparkles,
  QrCode,
  Truck,
  RotateCcw
} from 'lucide-react';

interface RestaurantPricingModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const RestaurantPricingModal: React.FC<RestaurantPricingModalProps> = ({
  restaurant,
  onClose,
  onSuccess,
}) => {
  const { updateRestaurantDetails } = useRestaurants();
  const { config } = usePlatform();

  // Mode & Tier Selection (Instant Mistake Fixer)
  const initialMode = restaurant.orderingMode || 'DIRECTORY_ONLY';
  const initialTier = restaurant.subscriptionTier || 'FREE_DIRECTORY';

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(initialTier);
  const [selectedMode, setSelectedMode] = useState<OrderingMode>(initialMode);

  // Pricing Model: Monthly Recurring vs One-Off Setup vs Free
  const [billingModel, setBillingModel] = useState<'MONTHLY' | 'ONE_OFF' | 'FREE'>(
    restaurant.billingModel || (restaurant.oneOffSetupFee ? 'ONE_OFF' : restaurant.monthlySubscriptionFee ? 'MONTHLY' : 'FREE')
  );

  const [monthlyFee, setMonthlyFee] = useState<number>(
    restaurant.monthlySubscriptionFee ?? (selectedTier === 'PRO_DELIVERY' ? 65 : selectedTier === 'BASIC_POS' ? 35 : 10)
  );

  const [oneOffFee, setOneOffFee] = useState<number>(
    restaurant.oneOffSetupFee ?? 40
  );

  // Platform Commission Rate (Can be 0.0%!)
  const [commissionRate, setCommissionRate] = useState<number>(
    restaurant.commissionRate ?? 0.0
  );

  const [customNotes, setCustomNotes] = useState<string>(restaurant.customPricingNote || '');
  const [lastPaymentRef, setLastPaymentRef] = useState<string>(restaurant.lastPaymentReference || '');

  // Quick preset helper when clicking a tier card
  const handleSelectTierPreset = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    if (tier === 'FREE_DIRECTORY') {
      setSelectedMode('DIRECTORY_ONLY');
      // User requested e.g. Free or $10/mo or $40 one-off
      if (billingModel === 'FREE') {
        setMonthlyFee(0);
      } else if (billingModel === 'MONTHLY') {
        setMonthlyFee(10);
      } else {
        setOneOffFee(40);
      }
      setCommissionRate(0.0); // Yellow pages usually 0% commission
    } else if (tier === 'BASIC_POS') {
      setSelectedMode('ENABLED');
      setBillingModel('MONTHLY');
      setMonthlyFee(30); // User mentioned $30 for table POS
      setCommissionRate(0.0); // Can be 0% SaaS fee
    } else {
      setSelectedMode('ENABLED');
      setBillingModel('MONTHLY');
      setMonthlyFee(65);
      setCommissionRate(8.0);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalFee = billingModel === 'FREE' ? 0 : billingModel === 'MONTHLY' ? monthlyFee : 0;
    const finalOneOff = billingModel === 'ONE_OFF' ? oneOffFee : undefined;

    updateRestaurantDetails(restaurant.id, {
      subscriptionTier: selectedTier,
      orderingMode: selectedMode,
      billingModel,
      monthlySubscriptionFee: finalFee,
      oneOffSetupFee: finalOneOff,
      commissionRate: commissionRate,
      customPricingNote: customNotes.trim() || undefined,
      lastPaymentReference: lastPaymentRef.trim() || undefined,
      subscriptionStatus: 'ACTIVE',
    });

    onSuccess(
      `Updated "${restaurant.name}": Tier set to ${selectedTier.replace('_', ' ')} (${billingModel === 'ONE_OFF' ? `$${oneOffFee} One-off` : `$${finalFee}/mo`}) with ${commissionRate}% commission.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#DCE3DD] max-w-xl w-full overflow-hidden shadow-2xl space-y-0 my-8">
        {/* Header */}
        <div className="p-6 bg-[#16241B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2F7A4F] text-white flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold font-display">Subscription Tier & Commission Settings</h3>
              <p className="text-xs text-[#A6BCAD]">{restaurant.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-[#A6BCAD] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Capability Tier & Mistake Reversal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#16241B] uppercase tracking-wider">
                1. Select Operational Capability & Tier
              </label>
              <span className="text-[11px] text-stone-500 font-medium">Switch anytime to correct mistakes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option A: Yellow Page Directory Only */}
              <div
                onClick={() => handleSelectTierPreset('FREE_DIRECTORY')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTier === 'FREE_DIRECTORY'
                    ? 'border-[#E0562B] bg-[#FFF8F5] shadow-xs'
                    : 'border-[#EBECE9] bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    Yellow Page
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#16241B]">Directory Only</h4>
                <p className="text-[10px] text-stone-500 mt-1 leading-snug">
                  Menu booklet photos & direct WhatsApp inquiries. No online cart or POS.
                </p>
              </div>

              {/* Option B: Table QR / POS */}
              <div
                onClick={() => handleSelectTierPreset('BASIC_POS')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTier === 'BASIC_POS'
                    ? 'border-[#2F7A4F] bg-[#F4F9F5] shadow-xs'
                    : 'border-[#EBECE9] bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    Table POS
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#16241B]">Table QR / Dine-In</h4>
                <p className="text-[10px] text-stone-500 mt-1 leading-snug">
                  Dine-in table QR stands & digital POS. No courier delivery dispatch.
                </p>
              </div>

              {/* Option C: Full Ordering */}
              <div
                onClick={() => handleSelectTierPreset('PRO_DELIVERY')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTier === 'PRO_DELIVERY'
                    ? 'border-[#16241B] bg-[#F5F6F5] shadow-xs'
                    : 'border-[#EBECE9] bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-7 h-7 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    Full Suite
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#16241B]">Full Access</h4>
                <p className="text-[10px] text-stone-500 mt-1 leading-snug">
                  Both Table QR dine-in + on-demand runner courier delivery dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing Model & Custom Amounts */}
          <div className="space-y-3 bg-[#F9FAF8] p-4 rounded-2xl border border-[#DCE3DD]">
            <label className="text-xs font-black text-[#16241B] uppercase tracking-wider block">
              2. Subscription Pricing Model
            </label>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'MONTHLY', label: 'Monthly Recurring Fee' },
                { key: 'ONE_OFF', label: 'One-Off Setup / Lifetime Fee' },
                { key: 'FREE', label: 'Free ($0.00 / Trial)' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBillingModel(opt.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingModel === opt.key
                      ? 'bg-[#16241B] text-white shadow-xs'
                      : 'bg-white text-[#526056] border border-[#DCE3DD] hover:bg-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Inputs based on Billing Model */}
            {billingModel === 'MONTHLY' && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-[#16241B] shrink-0">
                    Monthly Fee (BND):
                  </label>
                  <div className="relative w-36">
                    <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F] focus:outline-hidden"
                    />
                  </div>
                  <span className="text-xs text-stone-500 font-medium">BND / month</span>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Quick Presets:</span>
                  {[
                    { val: 10, label: '$10/mo (Directory)' },
                    { val: 30, label: '$30/mo (Table POS)' },
                    { val: 35, label: '$35/mo (Standard POS)' },
                    { val: 65, label: '$65/mo (Full Delivery)' },
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setMonthlyFee(p.val)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${
                        monthlyFee === p.val 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {billingModel === 'ONE_OFF' && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-[#16241B] shrink-0">
                    One-Off Setup Fee (BND):
                  </label>
                  <div className="relative w-36">
                    <DollarSign className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={oneOffFee}
                      onChange={(e) => setOneOffFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F] focus:outline-hidden"
                    />
                  </div>
                  <span className="text-xs text-stone-500 font-medium">BND one-time</span>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Presets:</span>
                  {[
                    { val: 40, label: '$40 One-Off' },
                    { val: 60, label: '$60 One-Off' },
                    { val: 120, label: '$120 One-Off' },
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setOneOffFee(p.val)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${
                        oneOffFee === p.val 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {billingModel === 'FREE' && (
              <p className="text-xs text-emerald-800 font-medium pt-1">
                Zero subscription fee ($0.00). Ideal for promotional directory launches or introductory trials.
              </p>
            )}
          </div>

          {/* Section 3: Commission Rate Configurator (Supports 0%!) */}
          <div className="space-y-3 bg-[#F9FAF8] p-4 rounded-2xl border border-[#DCE3DD]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#16241B] uppercase tracking-wider">
                3. Platform Commission Rate
              </label>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                commissionRate === 0 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-stone-200 text-stone-800'
              }`}>
                {commissionRate === 0 ? '0% ZERO COMMISSION (PURE SAAS)' : `${commissionRate.toFixed(1)}% Platform Cut`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <Percent className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F] focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-stone-500 font-medium">% per online food order</span>
            </div>

            {/* Quick Commission Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Quick Select:</span>
              {[
                { val: 0.0, label: '0.0% (Zero Commission)' },
                { val: 5.0, label: '5.0%' },
                { val: 8.0, label: '8.0%' },
                { val: 10.0, label: '10.0%' },
                { val: 12.0, label: '12.0% (Standard)' },
              ].map(c => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setCommissionRate(c.val)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                    commissionRate === c.val
                      ? 'bg-[#16241B] text-white border-[#16241B]'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Explainer on 0% Commission */}
            <p className="text-[11px] text-stone-600 leading-relaxed pt-1">
              {commissionRate === 0 ? (
                <strong className="text-emerald-800">
                  ✨ Zero-Commission Model active: The restaurant keeps 100% of order totals. You generate revenue strictly through their subscription fee ($
                  {billingModel === 'ONE_OFF' ? oneOffFee : monthlyFee}).
                </strong>
              ) : (
                `The platform deducts ${commissionRate}% from the merchant's food bill during order settlement.`
              )}
            </p>
          </div>

          {/* Section 4: How Restaurants Pay You (Local Bank Transfer) */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-[#16241B]">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>How Restaurants Pay You (Local Bank Transfer)</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Merchants transfer their subscription fee directly via local online banking to the platform's official account:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2.5 rounded-xl border border-emerald-200">
              <div>
                <span className="font-bold text-stone-700 block">BIBD Account:</span>
                <span className="text-emerald-900 font-bold">{config.bibdAccountNumber || '00-001-01-1234567'}</span>
                <span className="text-stone-400 block text-[9px]">{config.bibdAccountName || 'FoodFindr Tech Enterprise'}</span>
              </div>
              <div>
                <span className="font-bold text-stone-700 block">Baiduri Bank Account:</span>
                <span className="text-emerald-900 font-bold">{config.baiduriAccountNumber || '02-00-110-7654321'}</span>
                <span className="text-stone-400 block text-[9px]">{config.baiduriAccountName || 'FoodFindr Tech Enterprise'}</span>
              </div>
            </div>

            {/* Optional Last Payment Reference */}
            <div className="pt-2">
              <label className="text-[10px] font-bold text-stone-600 block mb-1">
                Record Payment Slip Reference / Receipt # (Optional)
              </label>
              <input
                type="text"
                value={lastPaymentRef}
                onChange={(e) => setLastPaymentRef(e.target.value)}
                placeholder="e.g. BIBD-TRF-982189 / Cash Receipt #0412"
                className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                // Quick reset back to pure Yellow Page directory
                handleSelectTierPreset('FREE_DIRECTORY');
              }}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Yellow Page</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#16241B] hover:bg-[#2F7A4F] text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save Pricing & Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
