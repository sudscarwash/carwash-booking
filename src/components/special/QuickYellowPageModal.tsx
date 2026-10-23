import React, { useState } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { Restaurant, HalalStatus, MenuBookPage } from '../../types';
import { BRUNEI_DISTRICTS } from '../../utils/districtRates';
import { compressImageFile } from '../../utils/imageCompressor';
import { 
  BookOpen, 
  X, 
  Plus, 
  Trash2, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Image as ImageIcon,
  Lock,
  Globe,
  EyeOff,
  Ban,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

interface QuickYellowPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (restaurant: Restaurant) => void;
}

export const QuickYellowPageModal: React.FC<QuickYellowPageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addRestaurant, restaurants } = useRestaurants();
  const { currentUser, openAuthModal } = useAuth();
  const { config } = usePlatform();

  // Basic Details
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [district, setDistrict] = useState('Brunei-Muara');
  const [street, setStreet] = useState('');
  const [phone, setPhone] = useState('+673 ');
  const [whatsappPhone, setWhatsappPhone] = useState('+673 ');
  const [cuisineInput, setCuisineInput] = useState('Local Malay, Seafood, Kopitiam');
  const [halalStatus, setHalalStatus] = useState<HalalStatus>('HALAL_CERTIFIED');
  const [rocbnNumber, setRocbnNumber] = useState('RC/');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80');
  const [businessAudience, setBusinessAudience] = useState<'RETAIL_CONSUMER' | 'B2B_WHOLESALE_ONLY'>('RETAIL_CONSUMER');

  // Menu Book Pages (Photo menu scans - NO individual dishes needed!)
  const [menuPages, setMenuPages] = useState<{ id: string; title: string; imageUrl: string; pageNumber: number }[]>([
    {
      id: 'page_1',
      title: 'Page 1 - Mains & Set Meals',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80',
      pageNumber: 1,
    },
    {
      id: 'page_2',
      title: 'Page 2 - Beverages & Desserts',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
      pageNumber: 2,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Anti-fraud & Quality Checks: Configured by Special User & Admin
  const isSpecialOrAdmin = currentUser?.role === 'SPECIAL_USER' || currentUser?.role === 'SUPER_ADMIN';
  const isScout = currentUser?.role === 'COMMUNITY_SCOUT';
  const isAuthorizedToUpload = isSpecialOrAdmin || (isScout && config.allowPublicScoutUploads !== false);
  const isSuspended = isScout && currentUser?.scoutTrustLevel === 'SUSPENDED';
  const isTrusted = isScout && currentUser?.scoutTrustLevel === 'TRUSTED';
  const isGuest = !currentUser || currentUser.id === 'usr_guest';

  // Rate limit priority: Custom assigned scout limit -> Platform config default -> fallback 3
  const scoutDailyLimit = currentUser?.scoutDailyUploadLimit ?? config.defaultScoutDailyUploadLimit ?? 3;
  const isUnlimited = scoutDailyLimit >= 999;

  const today = new Date().toISOString().split('T')[0];
  const todayUploadsCount = restaurants.filter(
    r => (r.onboardedById === currentUser?.id || r.ownerId === currentUser?.id) &&
    r.createdAt && r.createdAt.startsWith(today)
  ).length;

  const isLimitReached = !isSpecialOrAdmin && !isUnlimited && todayUploadsCount >= scoutDailyLimit && !isTrusted;
  // All public contributors, customers, and standard scouts require audit before publishing!
  // Only Special Users (Operations Hub) and Super Admin (or explicitly whitelisted TRUSTED scouts when config allows) publish instantly.
  const requiresAudit = !isSpecialOrAdmin && (!isTrusted || config.defaultScoutApprovalRequired !== false);

  const duplicateMatch = name.trim().length >= 3 ? restaurants.find(
    r => r.name.toLowerCase().trim() === name.toLowerCase().trim()
  ) : null;

  if (!isOpen) return null;

  const handleAddPage = () => {
    const nextPageNum = menuPages.length + 1;
    setMenuPages(prev => [
      ...prev,
      {
        id: `page_${Date.now()}`,
        title: `Page ${nextPageNum} - Additional Specialties`,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
        pageNumber: nextPageNum,
      },
    ]);
  };

  const handleRemovePage = (id: string) => {
    if (menuPages.length <= 1) {
      setErrorMsg('Yellow Page listing must contain at least 1 menu photo scan');
      return;
    }
    setMenuPages(prev => prev.filter(p => p.id !== id).map((p, idx) => ({ ...p, pageNumber: idx + 1 })));
  };

  const handlePageChange = (id: string, field: 'title' | 'imageUrl', val: string) => {
    setMenuPages(prev => prev.map(p => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const handleImageFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1600, quality: 0.8 });
      handlePageChange(id, 'imageUrl', compressed.base64);
    } catch {
      setErrorMsg('Failed to compress image file');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      setErrorMsg('You must sign in with an authorized Community Scout or Operations account before uploading a Yellow Pages listing.');
      return;
    }

    if (!isAuthorizedToUpload) {
      setErrorMsg('Access Restricted: Only authorized Community Food Scouts and Operations Hub administrators can submit Yellow Page directory entries.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Restaurant name is required');
      return;
    }

    if (menuPages.length === 0 || !menuPages[0].imageUrl) {
      setErrorMsg('At least one menu page image is required for Yellow Pages');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const formattedMenuPages: MenuBookPage[] = menuPages.map(p => ({
      id: p.id,
      title: p.title,
      imageUrl: p.imageUrl,
      pageNumber: p.pageNumber,
      uploadedAt: new Date().toISOString(),
    }));

    const cuisines = cuisineInput.split(',').map(c => c.trim()).filter(Boolean);

    const contributorLabel = `${currentUser.firstName} ${currentUser.lastName}`.trim() || 
      (currentUser.role === 'COMMUNITY_SCOUT' ? 'Community Food Scout' : 'Operations Specialist');

    const newRest = addRestaurant({
      ownerId: currentUser.id,
      onboardedById: currentUser.id,
      onboardedByRole: currentUser.role,
      contributorName: contributorLabel,
      name: name.trim(),
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      tagline: tagline.trim() || 'Brunei Local Eatery • Verified Yellow Page Listing',
      description: `${name} is listed in the FOODFINDR Brunei Yellow Pages Directory. Browse our physical menu book scan and contact us directly via WhatsApp or phone.`,
      establishmentType: 'Restaurant',
      cuisineTypes: cuisines.length > 0 ? cuisines : ['Local Bruneian', 'Asian'],
      logoUrl: logoUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      coverImageUrl: menuPages[0]?.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      phone: phone.trim() || '+673 222 0000',
      whatsappPhone: whatsappPhone.trim() || phone.trim() || '+673 888 0000',
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@foodfindr.bn`,
      halalStatus,
      rocbnNumber: rocbnNumber.trim() || 'RC/PENDING',
      address: {
        street: street.trim() || 'Jalan Tutong',
        city: district === 'Belait' ? 'Kuala Belait' : district === 'Tutong' ? 'Tutong Town' : district === 'Temburong' ? 'Bangar' : 'Bandar Seri Begawan',
        district,
        state: 'Brunei Darussalam',
        zipCode: 'BB1110',
        latitude: 4.9031,
        longitude: 114.9398,
      },
      rating: 4.8,
      reviewCount: 1,
      priceLevel: '$$',
      estimatedDeliveryMin: 25,
      estimatedDeliveryMax: 45,
      deliveryFee: 3.5,
      minimumOrder: 5.0,
      orderingMode: 'DIRECTORY_ONLY', // DIRECTORY ONLY: CUSTOMERS VIEW MENU PHOTO BOOK & WHATSAPP
      supportedServices: ['DINE_IN', 'TAKEAWAY'],
      fulfillmentType: 'PICKUP_ONLY',
      menuBookPages: formattedMenuPages,
      isVerified: !requiresAudit,
      isActive: true,
      listingStatus: requiresAudit ? 'PENDING_APPROVAL' : 'APPROVED',
      kycStatus: requiresAudit ? 'PENDING' : 'VERIFIED',
      subscriptionTier: 'FREE_DIRECTORY',
      subscriptionStatus: 'ACTIVE',
      monthlySubscriptionFee: 0,
      commissionRate: 0,
      isB2BOnly: businessAudience === 'B2B_WHOLESALE_ONLY',
      businessAudience: businessAudience,
      operatingHours: [
        { day: 'Monday', openTime: '08:00', closeTime: '22:00', isOpen: true },
        { day: 'Tuesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
        { day: 'Wednesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
        { day: 'Thursday', openTime: '08:00', closeTime: '22:00', isOpen: true },
        { day: 'Friday', openTime: '14:00', closeTime: '22:00', isOpen: true }, // Friday prayers closure respected
        { day: 'Saturday', openTime: '08:00', closeTime: '22:00', isOpen: true },
        { day: 'Sunday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      ],
    });

    setIsSubmitting(false);
    if (onSuccess) {
      onSuccess(newRest);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#DCE3DD] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#16241B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E0562B] text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {currentUser.role === 'COMMUNITY_SCOUT' ? 'Community Scout Photo Menu Uploader' : 'Quick Yellow Page Restaurant Creator'}
                </h3>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  currentUser.role === 'COMMUNITY_SCOUT' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-stone-900'
                }`}>
                  {currentUser.role === 'COMMUNITY_SCOUT' ? 'Scout Contributor' : 'Image Menu Mode'}
                </span>
              </div>
              <p className="text-xs text-stone-300">
                {currentUser.role === 'COMMUNITY_SCOUT'
                  ? `Contributing as ${currentUser.firstName || 'Public Scout'} • Snap photos of physical menus at local kopitiams & warungs to publish.`
                  : 'Onboard in 30 seconds: upload menu page scans without entering individual dishes!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Guest Protection Notice: Prompt unauthenticated visitor to sign in */}
          {isGuest && (
            <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 space-y-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-700 shrink-0" />
                <h4 className="font-extrabold text-xs text-amber-950">Vetted Contributor Account Required</h4>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                To prevent vandalism, fake listings, inaccurate halal claims, and duplicate phone numbers, direct Yellow Pages menu uploads are restricted to <strong>Vetted Community Food Scouts</strong> and <strong>Regional Operations Leads</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal('SIGN_IN');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sign In with Scout or Staff Account</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 border border-amber-300 text-amber-900 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Moderation Review Queue Callout for Non-Special/Admin users */}
          {requiresAudit && !isGuest && (
            <div className="p-3.5 rounded-2xl border border-sky-200 bg-sky-50 text-sky-950 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-sky-900 font-bold">🛡️ Quality & Verification Queue Active</strong>
                To protect Brunei diners from inaccurate prices and fake listings, your photo menu will be routed to the <strong>Operations Audit Queue</strong>. Once verified for photo clarity and contact info, it will appear publicly on the Brunei Yellow Pages!
              </div>
            </div>
          )}

          {/* Scout Daily Limit & Anti-Spam Indicator */}
          {isScout && (
            <div className="space-y-2">
              {isSuspended ? (
                <div className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3">
                  <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-xs">Contributor Privileges Suspended</span>
                    <span className="text-[11px] text-rose-700 block mt-0.5">
                      Your scout account has been quarantined by Platform Administration or Operations. New directory uploads are locked. Contact support or an Operations Officer for review.
                    </span>
                  </div>
                </div>
              ) : isTrusted ? (
                <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold">Trusted Community Ambassador: </span>
                      <span className="text-[11px]">
                        Fast-track review privileges active. ({todayUploadsCount} uploaded today{isUnlimited ? ', Unlimited quota' : ` of ${scoutDailyLimit}`})
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px]">
                    {isUnlimited ? 'Unlimited' : `${Math.max(0, scoutDailyLimit - todayUploadsCount)} Left`}
                  </span>
                </div>
              ) : (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  isLimitReached 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold">Scout Anti-Spam Guard: </span>
                      <span>
                        {isLimitReached 
                          ? `Daily quota reached (${todayUploadsCount}/${scoutDailyLimit}). Further uploads unlock at 00:00 midnight.` 
                          : `${todayUploadsCount} of ${scoutDailyLimit} daily contributions used today.`}
                      </span>
                      <span className="block text-[10px] text-indigo-700 mt-0.5">
                        Limits & trust tiers managed by Operations & Super Admin.
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] shrink-0">
                    {Math.max(0, scoutDailyLimit - todayUploadsCount)} Remaining
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Basic Business Information */}
          <div className="space-y-3 bg-[#F6F7F5] p-4 rounded-2xl border border-[#DCE3DD]">
            <h4 className="font-extrabold text-xs text-[#16241B] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E0562B]" />
              <span>1. Business Info & Contact</span>
            </h4>

            {/* Audience Channel & Public Quarantine */}
            <div>
              <label className="text-[11px] font-bold text-[#526056] block mb-1">Target Audience & Directory Channel *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBusinessAudience('RETAIL_CONSUMER')}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    businessAudience === 'RETAIL_CONSUMER'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                      : 'bg-white border-[#DCE3DD] text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#16241B]">🍽️ Public Consumer Dining</div>
                    <div className="text-[10px] text-[#526056] font-normal leading-tight mt-0.5">
                      Published on Public Yellow Pages & Consumer food search.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessAudience('B2B_WHOLESALE_ONLY')}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    businessAudience === 'B2B_WHOLESALE_ONLY'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-[#DCE3DD] text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#16241B]">🔒 B2B Wholesale / Bulk Depot</div>
                    <div className="text-[10px] text-[#526056] font-normal leading-tight mt-0.5">
                      Quarantined from public. Published strictly to Restaurant Owner B2B Hub.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kafe Jing Chew, Gerai Selera..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
                {duplicateMatch && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Notice: &quot;{duplicateMatch.name}&quot; ({duplicateMatch.address?.district || 'Brunei'}) already exists. Ensure this is not an accidental duplicate.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Marketing Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Famous Roti Kahwin & Traditional Teh"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">District (Daerah) *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                >
                  {BRUNEI_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Simpang, Road / Kampong</label>
                <input
                  type="text"
                  placeholder="e.g. Spg 5, Jalan Gadong, Kg Menglait"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">WhatsApp Phone (Direct Customer Orders) *</label>
                <input
                  type="text"
                  placeholder="+673 888 1234"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Telephone / Landline</label>
                <input
                  type="text"
                  placeholder="+673 242 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Halal Status</label>
                <select
                  value={halalStatus}
                  onChange={(e) => setHalalStatus(e.target.value as HalalStatus)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                >
                  <option value="HALAL_CERTIFIED">Halal Certified (MUIB)</option>
                  <option value="MUSLIM_OWNED">Muslim Owned</option>
                  <option value="PORK_FREE">Pork Free</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">ROCBN Registration</label>
                <input
                  type="text"
                  placeholder="RC/00012345"
                  value={rocbnNumber}
                  onChange={(e) => setRocbnNumber(e.target.value)}
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#526056] block mb-1">Cuisines</label>
                <input
                  type="text"
                  value={cuisineInput}
                  onChange={(e) => setCuisineInput(e.target.value)}
                  placeholder="Kopitiam, Malay, Seafood"
                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Menu Book Photo Scans (The requested Quick View) */}
          <div className="space-y-3 bg-[#EBF5EF] p-4 rounded-2xl border border-[#2F7A4F]/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-xs text-[#2F7A4F] uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Physical Menu Book Photo Pages</span>
                </h4>
                <p className="text-[11px] text-[#526056] mt-0.5">
                  Upload or paste images of the restaurant's printed menu. Customers can zoom and flip through these pages in the Yellow Pages Directory.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPage}
                className="px-3 py-1.5 bg-[#2F7A4F] hover:bg-[#25633F] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Page</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {menuPages.map((page, index) => (
                <div key={page.id} className="bg-white p-3.5 rounded-xl border border-[#DCE3DD] flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#DCE3DD] bg-stone-100 shrink-0 relative group">
                    <img
                      src={page.imageUrl}
                      alt={page.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                      Page {page.pageNumber}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-[#16241B]">Page #{page.pageNumber}</span>
                      {menuPages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePage(page.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Delete this page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={page.title}
                      onChange={(e) => handlePageChange(page.id, 'title', e.target.value)}
                      placeholder="e.g. Page 1 - Starters & Mains"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs text-[#16241B]"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={page.imageUrl}
                        onChange={(e) => handlePageChange(page.id, 'imageUrl', e.target.value)}
                        placeholder="Image URL or upload below..."
                        className="flex-1 bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs text-[#16241B]"
                      />
                      <label className="px-2.5 py-1 bg-[#16241B] hover:bg-[#2F7A4F] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0">
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileUpload(page.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Subscription & Governance Notice */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Yellow Pages Listing Governance</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This listing is classified as <strong>Directory Only (Free Tier)</strong>. Customers can view the menu images and order directly via WhatsApp. If the merchant later requests digital cart checkout and courier dispatch, they can be upgraded to the <strong>Pro Delivery Tier ($65/mo BND)</strong> after completing full KYC verification.
            </p>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DCE3DD]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DCE3DD] text-[#526056] font-bold text-xs hover:bg-[#F6F7F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLimitReached || isSuspended || isGuest}
              className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-95 ${
                isLimitReached || isSuspended || isGuest ? 'bg-stone-400 cursor-not-allowed opacity-60' : 'bg-[#E0562B] hover:bg-[#B5431E]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isGuest
                  ? 'Sign In as Scout to Submit'
                  : isSuspended 
                  ? 'Account Suspended' 
                  : isLimitReached 
                  ? 'Daily Limit Reached' 
                  : requiresAudit 
                  ? 'Submit Photo Menu for Audit' 
                  : 'Publish Yellow Page Listing'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
