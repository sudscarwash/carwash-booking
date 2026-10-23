import React, { useState } from 'react';
import { Restaurant, SubscriptionTier, HalalStatus } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { 
  ShieldCheck, 
  AlertCircle, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  FileText, 
  Sparkles, 
  ExternalLink,
  MessageCircle,
  Banknote
} from 'lucide-react';

interface KycSubscriptionManagerProps {
  restaurant: Restaurant;
}

export const KycSubscriptionManager: React.FC<KycSubscriptionManagerProps> = ({ restaurant }) => {
  const { updateRestaurantDetails } = useRestaurants();

  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [rocbn, setRocbn] = useState(restaurant.rocbnNumber || 'RC/00028491');
  const [halalCert, setHalalCert] = useState(restaurant.halalCertNumber || 'MUIB/HALAL/2024/918');
  const [halalStatus, setHalalStatus] = useState<HalalStatus>(restaurant.halalStatus || 'HALAL_CERTIFIED');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveKyc = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurantDetails(restaurant.id, {
      rocbnNumber: rocbn,
      halalCertNumber: halalCert,
      halalStatus,
      kycStatus: restaurant.isVerified ? 'VERIFIED' : 'PENDING',
    });
    setIsEditingKyc(false);
    setFeedback('KYC documents updated and submitted to Brunei Operations Team.');
    setTimeout(() => setFeedback(null), 4000);
  };

  const currentTier = restaurant.subscriptionTier || (restaurant.orderingMode === 'DIRECTORY_ONLY' ? 'FREE_DIRECTORY' : 'BASIC_POS');
  const monthlyFee = restaurant.monthlySubscriptionFee ?? (currentTier === 'PRO_DELIVERY' ? 65 : currentTier === 'BASIC_POS' ? 35 : 0);

  return (
    <div className="space-y-6">
      {/* Top Notification Feedback */}
      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KYC Compliance Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE3DD] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE3DD]">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              restaurant.isVerified
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {restaurant.isVerified ? <ShieldCheck className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#16241B]">Brunei Business Verification & Merchant Profile</h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  restaurant.isVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {restaurant.isVerified ? 'VERIFIED BUSINESS BADGE' : 'INDEPENDENT / HOME KITCHEN'}
                </span>
              </div>
              <p className="text-xs text-[#526056] mt-0.5">
                All food establishments welcome (Home Kitchens, Hawkers, Cafes & Commercial Restaurants). ROCBN and Halal Cert numbers are voluntary credentials to earn a verified trust badge. Merchant retains full operational responsibility for food preparation, hygiene, and halal integrity.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingKyc(!isEditingKyc)}
            className="px-3.5 py-2 rounded-xl bg-[#F6F7F5] hover:bg-[#EAECE9] border border-[#DCE3DD] text-xs font-bold text-[#16241B] cursor-pointer transition-colors"
          >
            {isEditingKyc ? 'Close Form' : 'Update KYC Credentials'}
          </button>
        </div>

        {/* Verification Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">
              ROCBN Registration
            </span>
            <p className="text-sm font-extrabold text-[#16241B] font-mono">
              {restaurant.rocbnNumber || 'Not recorded'}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold block">
              Section 16/17 Reg
            </span>
          </div>

          <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">
              Halal Governance
            </span>
            <p className="text-sm font-extrabold text-[#16241B]">
              {restaurant.halalStatus ? restaurant.halalStatus.replace('_', ' ') : 'HALAL CERTIFIED'}
            </p>
            <span className="text-[10px] text-[#526056] font-mono block truncate">
              Cert: {restaurant.halalCertNumber || 'MUIB/HALAL/2024'}
            </span>
          </div>

          <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">
              Operations Region
            </span>
            <p className="text-sm font-extrabold text-[#16241B]">
              {restaurant.address?.district || 'Brunei-Muara'}
            </p>
            <span className="text-[10px] text-[#526056] block">
              {restaurant.address?.city || 'Bandar Seri Begawan'}
            </span>
          </div>
        </div>

        {/* KYC Edit Form */}
        {isEditingKyc && (
          <form onSubmit={handleSaveKyc} className="p-4 bg-[#EBF5EF] rounded-2xl border border-[#2F7A4F]/20 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-[#2F7A4F] uppercase tracking-wider">
              Submit / Update Legal Documents for Audit
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#16241B] block mb-1">
                  ROCBN Number <span className="text-[#526056] font-normal">(Optional for Home Kitchens)</span>
                </label>
                <input
                  type="text"
                  value={rocbn}
                  onChange={(e) => setRocbn(e.target.value)}
                  placeholder="e.g. RC/2023/10892 or leave blank"
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#16241B] block mb-1">
                  MUIB Halal Cert No. <span className="text-[#526056] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={halalCert}
                  onChange={(e) => setHalalCert(e.target.value)}
                  placeholder="e.g. MUIB/2024/9021 or leave blank"
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#16241B] block mb-1">Halal Declaration</label>
                <select
                  value={halalStatus}
                  onChange={(e) => setHalalStatus(e.target.value as HalalStatus)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                >
                  <option value="MUSLIM_OWNED">Muslim Owned / 100% Halal Ingredients</option>
                  <option value="HALAL_CERTIFIED">MUIB Halal Certified Establishment</option>
                  <option value="PORK_FREE">Pork Free Kitchen</option>
                  <option value="NOT_SPECIFIED">Not Specified</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingKyc(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[#DCE3DD] text-xs font-bold text-[#526056]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#2F7A4F] hover:bg-[#25633F] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Submit Documents
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Subscription Plan & Monthly Billing Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE3DD] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE3DD]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E0562B]/10 text-[#E0562B] flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#16241B]">Platform Subscription & Service Tier</h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {restaurant.subscriptionStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-[#526056] mt-0.5">
                Transparent flat monthly subscriptions. No hidden commission on direct orders.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-[#16241B] font-mono">
              ${monthlyFee.toFixed(2)}
            </span>
            <span className="text-xs text-[#526056] font-bold ml-1">BND / month</span>
          </div>
        </div>

        {/* 3 Tier Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tier 1: Free Directory */}
          <div className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'FREE_DIRECTORY'
              ? 'bg-[#FBF4F1] border-[#E0562B] ring-2 ring-[#E0562B]/20'
              : 'bg-[#F6F7F5] border-[#DCE3DD]'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-[#16241B]">Free Directory</h4>
              {currentTier === 'FREE_DIRECTORY' && (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#E0562B] text-white">
                  Current
                </span>
              )}
            </div>
            <div className="mt-2 mb-3">
              <span className="text-xl font-extrabold text-[#16241B] font-mono">$0</span>
              <span className="text-[10px] text-[#526056] font-semibold"> / month</span>
            </div>
            <ul className="text-[11px] text-[#526056] space-y-1.5">
              <li className="flex items-center gap-1.5">✓ Yellow Pages Listing</li>
              <li className="flex items-center gap-1.5">✓ Photo Menu Book Scan</li>
              <li className="flex items-center gap-1.5">✓ Direct WhatsApp Link</li>
              <li className="flex items-center gap-1.5 text-stone-400">✗ No Digital Cart / KDS</li>
              <li className="flex items-center gap-1.5 text-stone-400">✗ No Runner Dispatch</li>
            </ul>
          </div>

          {/* Tier 2: Basic POS */}
          <div className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'BASIC_POS'
              ? 'bg-[#EBF5EF] border-[#2F7A4F] ring-2 ring-[#2F7A4F]/20'
              : 'bg-[#F6F7F5] border-[#DCE3DD]'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-[#16241B]">Basic POS & Table QR</h4>
              {currentTier === 'BASIC_POS' && (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#2F7A4F] text-white">
                  Current
                </span>
              )}
            </div>
            <div className="mt-2 mb-3">
              <span className="text-xl font-extrabold text-[#16241B] font-mono">$35</span>
              <span className="text-[10px] text-[#526056] font-semibold"> BND / month</span>
            </div>
            <ul className="text-[11px] text-[#526056] space-y-1.5">
              <li className="flex items-center gap-1.5">✓ Everything in Free</li>
              <li className="flex items-center gap-1.5">✓ Table QR Self-Ordering</li>
              <li className="flex items-center gap-1.5">✓ Kitchen KDS Staff Screen</li>
              <li className="flex items-center gap-1.5">✓ Floor Plan & Zone Manager</li>
              <li className="flex items-center gap-1.5 text-stone-400">✗ Public Runner Dispatch</li>
            </ul>
          </div>

          {/* Tier 3: Pro Delivery */}
          <div className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'PRO_DELIVERY'
              ? 'bg-[#F0F5FA] border-[#205493] ring-2 ring-[#205493]/20'
              : 'bg-[#F6F7F5] border-[#DCE3DD]'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-[#16241B]">Pro Delivery Fleet</h4>
              {currentTier === 'PRO_DELIVERY' && (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#205493] text-white">
                  Current
                </span>
              )}
            </div>
            <div className="mt-2 mb-3">
              <span className="text-xl font-extrabold text-[#16241B] font-mono">$65</span>
              <span className="text-[10px] text-[#526056] font-semibold"> BND / month</span>
            </div>
            <ul className="text-[11px] text-[#526056] space-y-1.5">
              <li className="flex items-center gap-1.5">✓ Everything in Basic POS</li>
              <li className="flex items-center gap-1.5">✓ Public Delivery Fleet Dispatch</li>
              <li className="flex items-center gap-1.5">✓ 4-District Routing Calculator</li>
              <li className="flex items-center gap-1.5">✓ BIBD / QuickPay Direct Settlement</li>
              <li className="flex items-center gap-1.5">✓ COD Cash Audit Safeguards</li>
            </ul>
          </div>
        </div>

        {/* Payment Remittance Advice */}
        <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-[#16241B] block">Payment Methods Supported in Brunei</span>
            <span className="text-[#526056] text-[11px]">
              BIBD Bank Transfer, Baiduri Online, or Counter Cash Settlement with Special User Officer.
            </span>
          </div>

          <a
            href={`https://wa.me/6738880000?text=Hello%20FOODFINDR%20Operations,%20I%20would%20like%20to%20inquire%20about%20subscription%20billing%20for%20${encodeURIComponent(restaurant.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#2F7A4F] hover:bg-[#25633F] text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Contact Operations Officer</span>
          </a>
        </div>
      </div>
    </div>
  );
};
