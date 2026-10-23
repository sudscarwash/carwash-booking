import React, { useState } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { Restaurant, OrderingMode, SubscriptionTier } from '../../types';
import { BRUNEI_DISTRICTS } from '../../utils/districtRates';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';
import { 
  Store, 
  Search, 
  Trash2, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  DollarSign, 
  Sliders, 
  Mail, 
  Lock, 
  Globe, 
  UserPlus, 
  Users, 
  Camera, 
  MessageSquare,
  Building2,
  Filter,
  Check,
  ChevronDown
} from 'lucide-react';
import { QuickYellowPageModal } from './QuickYellowPageModal';
import { TransferOwnerModal } from './TransferOwnerModal';
import { RestaurantPricingModal } from './RestaurantPricingModal';

interface DirectoryManagerTabProps {
  onOpenFullOnboarding: () => void;
}

export const DirectoryManagerTab: React.FC<DirectoryManagerTabProps> = ({
  onOpenFullOnboarding,
}) => {
  const { restaurants, deleteRestaurant, updateRestaurantDetails } = useRestaurants();
  const { currentUser, allUsers, createUserByAdminOrOwner, updateAnyUser } = useAuth();
  const { config } = usePlatform();

  // Internal Sub-Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<'DIRECTORY' | 'SCOUT_AUDITS' | 'SCOUT_HUB'>('DIRECTORY');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'DIRECTORY_ONLY' | 'ENABLED'>('ALL');
  const [selectedAudience, setSelectedAudience] = useState<'ALL' | 'RETAIL' | 'B2B_WHOLESALE'>('ALL');
  
  // Modals & Action States
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [restaurantForTransfer, setRestaurantForTransfer] = useState<Restaurant | null>(null);
  const [restaurantForPricing, setRestaurantForPricing] = useState<Restaurant | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Scout Provisioning Form State
  const [scoutEmail, setScoutEmail] = useState('');
  const [scoutFirstName, setScoutFirstName] = useState('');
  const [scoutLastName, setScoutLastName] = useState('');
  const [scoutPhone, setScoutPhone] = useState('+673 ');
  const [scoutLimit, setScoutLimit] = useState<number>(3);
  const [scoutTrustLevel, setScoutTrustLevel] = useState<'PROBATIONARY' | 'TRUSTED'>('PROBATIONARY');
  const [scoutSubmitting, setScoutSubmitting] = useState(false);
  const [scoutSuccessMsg, setScoutSuccessMsg] = useState<string | null>(null);
  const [scoutErrorMsg, setScoutErrorMsg] = useState<string | null>(null);

  // Derived lists & stats
  const pendingScoutSubmissions = restaurants.filter(r => r.listingStatus === 'PENDING_APPROVAL');
  const scoutUsers = allUsers.filter(u => u.role === 'COMMUNITY_SCOUT');
  const totalApproved = restaurants.filter(r => r.listingStatus !== 'PENDING_APPROVAL').length;
  const yellowPagesCount = restaurants.filter(r => r.orderingMode === 'DIRECTORY_ONLY' && r.listingStatus !== 'PENDING_APPROVAL').length;
  const digitalOrderingCount = restaurants.filter(r => r.orderingMode !== 'DIRECTORY_ONLY' && r.listingStatus !== 'PENDING_APPROVAL').length;
  const b2bCount = restaurants.filter(r => (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY') && r.listingStatus !== 'PENDING_APPROVAL').length;
  const activePublicCount = restaurants.filter(r => r.isActive && !r.isB2BOnly && r.listingStatus !== 'PENDING_APPROVAL').length;

  // Filter logic for Directory Tab
  const filteredRestaurants = restaurants.filter(r => {
    // If on normal directory, exclude pending scout uploads (they are in Scout Audits tab)
    if (activeSubTab === 'DIRECTORY' && r.listingStatus === 'PENDING_APPROVAL') {
      return false;
    }

    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address?.district && r.address.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.cuisineTypes && r.cuisineTypes.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (r.address?.city && r.address.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDistrict = selectedDistrict === 'ALL' || r.address?.district === selectedDistrict;
    
    const matchesType = 
      selectedType === 'ALL' || 
      (selectedType === 'DIRECTORY_ONLY' && r.orderingMode === 'DIRECTORY_ONLY') ||
      (selectedType === 'ENABLED' && r.orderingMode !== 'DIRECTORY_ONLY');

    const matchesAudience = 
      selectedAudience === 'ALL' ||
      (selectedAudience === 'RETAIL' && !r.isB2BOnly && r.businessAudience !== 'B2B_WHOLESALE_ONLY') ||
      (selectedAudience === 'B2B_WHOLESALE' && (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY'));

    return matchesSearch && matchesDistrict && matchesType && matchesAudience;
  });

  const handleDeleteConfirm = () => {
    if (!restaurantToDelete) return;
    const name = restaurantToDelete.name;
    deleteRestaurant(restaurantToDelete.id);
    setRestaurantToDelete(null);
    setFeedbackMessage(`"${name}" has been permanently removed from the directory.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleToggleActive = (restaurant: Restaurant) => {
    const nextState = !restaurant.isActive;
    updateRestaurantDetails(restaurant.id, { isActive: nextState });
    setFeedbackMessage(
      `"${restaurant.name}" is now ${nextState ? 'Active (Visible in Public Search)' : 'Hidden / Paused'}`
    );
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleToggleB2BQuarantine = (restaurant: Restaurant) => {
    const nextB2B = !restaurant.isB2BOnly;
    updateRestaurantDetails(restaurant.id, {
      isB2BOnly: nextB2B,
      businessAudience: nextB2B ? 'B2B_WHOLESALE_ONLY' : 'RETAIL_CONSUMER'
    });
    setFeedbackMessage(
      nextB2B
        ? `"${restaurant.name}" quarantined as B2B Wholesale Only (Hidden from retail public).`
        : `"${restaurant.name}" published to Public Yellow Pages.`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleApproveScoutListing = (rest: Restaurant) => {
    updateRestaurantDetails(rest.id, {
      listingStatus: 'APPROVED',
      isVerified: true,
      isActive: true,
      kycStatus: 'VERIFIED',
    });
    setFeedbackMessage(`Approved "${rest.name}"! Published live to the public Yellow Pages.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDeclineScoutListing = (rest: Restaurant) => {
    updateRestaurantDetails(rest.id, {
      listingStatus: 'REJECTED',
      isActive: false,
    });
    setFeedbackMessage(`Rejected scout submission for "${rest.name}".`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleProvisionScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoutEmail.trim() || !scoutFirstName.trim() || !scoutLastName.trim()) {
      setScoutErrorMsg('Email, first name, and last name are required');
      return;
    }
    setScoutSubmitting(true);
    setScoutErrorMsg(null);
    try {
      const newScout = await createUserByAdminOrOwner({
        email: scoutEmail.trim(),
        firstName: scoutFirstName.trim(),
        lastName: scoutLastName.trim(),
        phone: scoutPhone.trim(),
        role: 'COMMUNITY_SCOUT',
        scoutDailyUploadLimit: scoutLimit,
        scoutTrustLevel: scoutTrustLevel,
      });
      setScoutSuccessMsg(`Community Scout "${newScout.firstName} ${newScout.lastName}" provisioned (${scoutLimit === 999 ? 'Unlimited' : scoutLimit + '/day'} quota • ${scoutTrustLevel}).`);
      setScoutEmail('');
      setScoutFirstName('');
      setScoutLastName('');
      setScoutPhone('+673 ');
      setScoutLimit(config.defaultScoutDailyUploadLimit || 3);
      setScoutTrustLevel('PROBATIONARY');
      setTimeout(() => setScoutSuccessMsg(null), 5000);
    } catch (err: any) {
      setScoutErrorMsg(err.message || 'Failed to provision scout');
    } finally {
      setScoutSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Action Bar */}
      <div className="bg-[#16241B] text-white rounded-3xl p-6 border border-[#2D3E33] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-xl font-extrabold font-display text-white">Merchant & Yellow Pages Manager</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2F7A4F] text-white">
              Special Operations
            </span>
          </div>
          <p className="text-xs text-[#C5D5C8] max-w-2xl leading-relaxed">
            Manage Brunei restaurant storefronts, photo menu books, B2B wholesale isolation, and field community scouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsQuickModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#E0562B] hover:bg-[#B5431E] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-transform active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>+ Quick Photo Menu</span>
          </button>
          <button
            onClick={onOpenFullOnboarding}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 cursor-pointer border border-white/15 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Full Merchant Onboarding</span>
          </button>
        </div>
      </div>

      {/* DIRECTORY OVERVIEW METRICS KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">Total Eateries</span>
          <span className="text-xl font-extrabold text-[#16241B] mt-0.5 block">{totalApproved}</span>
          <span className="text-[10px] text-emerald-700 font-bold">{activePublicCount} Publicly Visible</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">Yellow Pages</span>
          <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">{yellowPagesCount}</span>
          <span className="text-[10px] text-stone-500 font-medium">Physical Photo Books</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">Digital POS</span>
          <span className="text-xl font-extrabold text-[#2F7A4F] mt-0.5 block">{digitalOrderingCount}</span>
          <span className="text-[10px] text-stone-500 font-medium">Full Online Ordering</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">B2B Wholesale</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-0.5 block">{b2bCount}</span>
          <span className="text-[10px] text-stone-500 font-medium">Wholesale Isolated</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#526056] block">Scout Submissions</span>
          <span className="text-xl font-extrabold text-[#E0562B] mt-0.5 block">{pendingScoutSubmissions.length}</span>
          <span className="text-[10px] text-amber-700 font-bold">Awaiting Ops Audit</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DCE3DD] pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('DIRECTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'DIRECTORY'
              ? 'bg-[#16241B] text-white shadow-xs'
              : 'bg-[#F6F7F5] text-[#526056] hover:bg-[#E8ECE8]'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Eateries & Yellow Pages</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeSubTab === 'DIRECTORY' ? 'bg-white/20 text-white' : 'bg-[#DCE3DD] text-[#526056]'
          }`}>
            {restaurants.filter(r => r.listingStatus !== 'PENDING_APPROVAL').length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('SCOUT_AUDITS')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'SCOUT_AUDITS'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-[#F6F7F5] text-[#526056] hover:bg-[#E8ECE8]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Pending Scout Audits</span>
          {pendingScoutSubmissions.length > 0 ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-200 text-amber-900 animate-pulse">
              {pendingScoutSubmissions.length}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#DCE3DD] text-[#526056]">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('SCOUT_HUB')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'SCOUT_HUB'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-[#F6F7F5] text-[#526056] hover:bg-[#E8ECE8]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Community Scout Hub</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeSubTab === 'SCOUT_HUB' ? 'bg-white/20 text-white' : 'bg-[#DCE3DD] text-[#526056]'
          }`}>
            {scoutUsers.length}
          </span>
        </button>
      </div>

      {/* Flash Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 1: DIRECTORY LISTINGS */}
      {/* ======================================================== */}
      {activeSubTab === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#526056] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search eatery name, district, street, or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-2 text-xs font-bold text-[#16241B] cursor-pointer"
              >
                <option value="ALL">All Districts</option>
                {BRUNEI_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value as any)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-2 text-xs font-bold text-[#16241B] cursor-pointer"
              >
                <option value="ALL">All Channels</option>
                <option value="RETAIL">🍽️ Public Consumer</option>
                <option value="B2B_WHOLESALE">🔒 B2B Wholesale Only</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-2 text-xs font-bold text-[#16241B] cursor-pointer"
              >
                <option value="ALL">All Listing Types</option>
                <option value="DIRECTORY_ONLY">Yellow Pages (Photo Menus)</option>
                <option value="ENABLED">Full Digital Ordering</option>
              </select>
            </div>
          </div>

          {/* Directory Listings */}
          {filteredRestaurants.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-[#DCE3DD] text-center space-y-3">
              <Store className="w-10 h-10 text-[#526056] mx-auto opacity-40" />
              <h4 className="font-extrabold text-sm text-[#16241B]">No restaurants found matching filters</h4>
              <p className="text-xs text-[#526056] max-w-sm mx-auto">
                Try clearing your search query or click "+ Quick Photo Menu" above to add a listing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRestaurants.map(rest => {
                const isYellowPage = rest.orderingMode === 'DIRECTORY_ONLY';
                const pageCount = rest.menuBookPages?.length || 0;
                const contactNumber = rest.whatsappPhone || rest.phone || '';
                const waUrl = getWhatsAppUrl(
                  contactNumber,
                  `Assalamualaikom ${rest.name}! I am contacting you regarding your eatery profile on FOODFINDR Brunei.`
                );
                const callUrl = getPhoneCallUrl(contactNumber);

                return (
                  <div
                    key={rest.id}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-xs space-y-4 ${
                      rest.isActive 
                        ? 'border-[#DCE3DD] hover:border-[#16241B]/40' 
                        : 'border-stone-300 bg-stone-50/70 opacity-80'
                    }`}
                  >
                    {/* TOP ROW: Header with Avatar, Title, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-[#DCE3DD]/80">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <img
                          src={rest.logoUrl || rest.coverImageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80'}
                          alt={rest.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-[#DCE3DD] shrink-0 shadow-2xs"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-base text-[#16241B] truncate">{rest.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ {rest.halalStatus.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                              {rest.address?.district || 'Brunei-Muara'}
                            </span>
                          </div>
                          <p className="text-xs text-[#526056] line-clamp-1">{rest.tagline || rest.description}</p>
                          <div className="flex items-center gap-1.5 text-xs text-[#526056]">
                            <MapPin className="w-3.5 h-3.5 text-[#E0562B] shrink-0" />
                            <span className="truncate">{rest.address?.street}, {rest.address?.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Tags */}
                      <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            rest.isActive 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-stone-200 text-stone-600 border border-stone-300'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rest.isActive ? 'bg-emerald-600' : 'bg-stone-400'}`}></span>
                            {rest.isActive ? 'ACTIVE (LIVE)' : 'HIDDEN (PAUSED)'}
                          </span>

                          {isYellowPage ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-amber-700" />
                              <span>Yellow Page ({pageCount} {pageCount === 1 ? 'Page' : 'Pages'})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <Store className="w-3 h-3 text-emerald-700" />
                              <span>Digital POS Ordering</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {rest.isB2BOnly || rest.businessAudience === 'B2B_WHOLESALE_ONLY' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-800" />
                              <span>B2B Wholesale Quarantined</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-sky-600" />
                              <span>Public Directory</span>
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-stone-500">
                            {rest.subscriptionTier ? rest.subscriptionTier.replace('_', ' ') : 'Free Directory'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE ROW: 2-Column Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#F6F7F5] p-3.5 rounded-2xl border border-[#DCE3DD]/80">
                      {/* Direct Contacts & Messaging */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#526056] block">
                          Direct Customer & Ops Communications
                        </span>
                        {contactNumber ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Active WhatsApp chat */}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              title="Open WhatsApp chat with restaurant"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp ({contactNumber})</span>
                            </a>

                            {/* Direct phone call */}
                            <a
                              href={callUrl}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-[#16241B] text-xs font-bold border border-[#DCE3DD] transition-colors cursor-pointer"
                              title="Direct telephone call"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#2F7A4F]" />
                              <span>Call</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">No telephone registered for this storefront</span>
                        )}
                      </div>

                      {/* Storefront Ownership & Scout Attribution */}
                      <div className="space-y-1.5 md:border-l md:border-[#DCE3DD] md:pl-3">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#526056] block">
                          Account Ownership & Contributor Credit
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-stone-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-[#DCE3DD]">
                            Owner: <strong className="text-[#16241B]">{rest.assignedOwnerEmail || rest.email || 'Unassigned'}</strong>
                          </span>
                          {rest.onboardedByRole === 'COMMUNITY_SCOUT' && (
                            <span className="text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 font-semibold flex items-center gap-1">
                              <Camera className="w-3 h-3 text-indigo-600" />
                              <span>Scout: {rest.contributorName || 'Field Agent'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW: Actions Control Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#DCE3DD]/60">
                      {/* Left Toggle Switches */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(rest)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors flex items-center gap-1.5 ${
                            rest.isActive
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : 'bg-stone-200 hover:bg-stone-300 text-stone-700 border border-stone-300'
                          }`}
                        >
                          <span>{rest.isActive ? '🟢 Storefront Active' : '⚪ Storefront Hidden'}</span>
                        </button>

                        <button
                          onClick={() => handleToggleB2BQuarantine(rest)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 border ${
                            rest.isB2BOnly
                              ? 'bg-amber-100 border-amber-300 text-amber-950'
                              : 'bg-white hover:bg-stone-50 border-[#DCE3DD] text-[#526056]'
                          }`}
                          title="Toggle B2B wholesale isolation"
                        >
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>{rest.isB2BOnly ? '🔒 B2B Locked' : 'Set B2B Only'}</span>
                        </button>
                      </div>

                      {/* Right Management Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRestaurantForPricing(rest)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#DCE3DD] text-xs font-bold text-[#16241B] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#E0562B]" />
                          <span>Pricing & Tiers</span>
                        </button>

                        <button
                          onClick={() => setRestaurantForTransfer(rest)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-[#DCE3DD] text-xs font-bold text-[#16241B] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#2F7A4F]" />
                          <span>Reassign Owner</span>
                        </button>

                        <button
                          onClick={() => setRestaurantToDelete(rest)}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-colors"
                          title="Permanently Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: PENDING SCOUT AUDITS */}
      {/* ======================================================== */}
      {activeSubTab === 'SCOUT_AUDITS' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Community Scout Physical Menu Pre-Moderation</span>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                To prevent spam or incorrect menus, listings photographed by scouts remain in <code>PENDING_APPROVAL</code> until verified by an Operations Officer. Once approved, the menu photos are immediately published to the Brunei Yellow Pages.
              </p>
            </div>
          </div>

          {pendingScoutSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#DCE3DD] text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto opacity-70" />
              <h4 className="font-extrabold text-sm text-[#16241B]">Scout Audit Queue is Clean!</h4>
              <p className="text-xs text-[#526056] max-w-md mx-auto">
                No photo menus are pending moderation. Any newly submitted paper or board menus from field scouts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingScoutSubmissions.map(rest => {
                const contactNumber = rest.whatsappPhone || rest.phone || '';
                const waUrl = getWhatsAppUrl(
                  contactNumber,
                  `Hello ${rest.name}, I am an Operations Officer from FOODFINDR verifying your stall menu submission.`
                );

                return (
                  <div key={rest.id} className="bg-white rounded-2xl p-5 border border-[#DCE3DD] shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={rest.logoUrl || rest.coverImageUrl || 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=300&q=80'}
                          alt={rest.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-[#DCE3DD] shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-extrabold text-base text-[#16241B]">{rest.name}</h5>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              ⏳ Awaiting Ops Audit
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              Scout: {rest.contributorName || 'Field Scout'}
                            </span>
                          </div>
                          <p className="text-xs text-[#526056]">{rest.tagline || rest.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-[#16241B]">
                              <MapPin className="w-3.5 h-3.5 text-[#DE5124]" />
                              {rest.address.street}, {rest.address.district}
                            </span>
                            {contactNumber && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp: {contactNumber}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                        <button
                          onClick={() => handleDeclineScoutListing(rest)}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApproveScoutListing(rest)}
                          className="px-4 py-2 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Publish Live</span>
                        </button>
                      </div>
                    </div>

                    {/* Photo Menu Pages Preview */}
                    {rest.menuBookPages && rest.menuBookPages.length > 0 && (
                      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#16241B] flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                            <span>Submitted Physical Menu Scans ({rest.menuBookPages.length} Pages)</span>
                          </span>
                          <span className="text-[10px] text-stone-500">Tap to inspect scan quality</span>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                          {rest.menuBookPages.map((pg, idx) => (
                            <a
                              key={pg.id || idx}
                              href={pg.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 flex items-center gap-2.5 bg-white p-2 rounded-xl border border-stone-200 hover:border-[#16241B] transition-colors"
                            >
                              <img
                                src={pg.imageUrl}
                                alt={pg.title || `Page ${idx + 1}`}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div className="text-xs pr-2">
                                <p className="font-bold text-[#16241B]">{pg.title || `Page ${idx + 1}`}</p>
                                <p className="text-stone-500 text-[10px] line-clamp-1">{pg.description || 'Chalkboard / Paper Menu'}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: COMMUNITY SCOUTS HUB */}
      {/* ======================================================== */}
      {activeSubTab === 'SCOUT_HUB' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Provision Scout Form */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE3DD]">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#16241B]">Provision Community Scout</h4>
                <p className="text-[11px] text-[#526056]">Authorize field agents to snap photo menus</p>
              </div>
            </div>

            {scoutSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scoutSuccessMsg}</span>
              </div>
            )}
            {scoutErrorMsg && (
              <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{scoutErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProvisionScout} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#526056] mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={scoutFirstName}
                    onChange={(e) => setScoutFirstName(e.target.value)}
                    placeholder="e.g. Haziq"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#526056] mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={scoutLastName}
                    onChange={(e) => setScoutLastName(e.target.value)}
                    placeholder="e.g. Suffian"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={scoutEmail}
                  onChange={(e) => setScoutEmail(e.target.value)}
                  placeholder="scout.haziq@foodfindr.io"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">WhatsApp / Contact Phone</label>
                <input
                  type="text"
                  value={scoutPhone}
                  onChange={(e) => setScoutPhone(e.target.value)}
                  placeholder="+673 889 1234"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#DCE3DD]/70">
                <div>
                  <label className="block text-[11px] font-bold text-[#526056] mb-1">Daily Upload Quota</label>
                  <select
                    value={scoutLimit}
                    onChange={(e) => setScoutLimit(parseInt(e.target.value))}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-2 text-xs font-bold text-[#16241B]"
                  >
                    <option value={3}>3 uploads / day (Probationary)</option>
                    <option value={5}>5 uploads / day (Active)</option>
                    <option value={10}>10 uploads / day (Verified)</option>
                    <option value={25}>25 uploads / day (Power)</option>
                    <option value={999}>Unlimited (Lead Field Scout)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#526056] mb-1">Initial Trust Tier</label>
                  <select
                    value={scoutTrustLevel}
                    onChange={(e) => setScoutTrustLevel(e.target.value as 'PROBATIONARY' | 'TRUSTED')}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-2 text-xs font-bold text-[#16241B]"
                  >
                    <option value="PROBATIONARY">PROBATIONARY (Quarantine)</option>
                    <option value="TRUSTED">TRUSTED (Fast-Track)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={scoutSubmitting}
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{scoutSubmitting ? 'Provisioning Scout...' : 'Provision Scout Account'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Scout Roster & Governance Table */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3DD]">
              <div>
                <h4 className="font-extrabold text-sm text-[#16241B]">Active Community Scout Roster</h4>
                <p className="text-[11px] text-[#526056]">Control individual contribution quotas and promote trusted ambassadors</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {scoutUsers.length} Scouts
              </span>
            </div>

            <div className="divide-y divide-[#DCE3DD] border border-[#DCE3DD] rounded-2xl overflow-hidden bg-white">
              {scoutUsers.map(scout => {
                const scoutListingsCount = restaurants.filter(
                  r => r.onboardedById === scout.id || r.ownerId === scout.id
                ).length;
                const currentLimit = scout.scoutDailyUploadLimit ?? config.defaultScoutDailyUploadLimit ?? 3;
                const currentTrust = scout.scoutTrustLevel || 'PROBATIONARY';
                const scoutWaUrl = getWhatsAppUrl(
                  scout.phone,
                  `Hello ${scout.firstName}, this is FOODFINDR Operations regarding your community scout uploads.`
                );

                return (
                  <div key={scout.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F6F7F5] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {scout.firstName[0]}{scout.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#16241B]">{scout.firstName} {scout.lastName}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                            currentTrust === 'TRUSTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : currentTrust === 'SUSPENDED'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {currentTrust}
                          </span>
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                            {scoutListingsCount} listings
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#526056] mt-0.5">
                          <span>{scout.email}</span>
                          {scout.phone && (
                            <a
                              href={scoutWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline font-bold flex items-center gap-0.5"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>{scout.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline Rate Limit & Trust Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <select
                        value={currentLimit}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value);
                          updateAnyUser(scout.id, { scoutDailyUploadLimit: newLimit });
                          setFeedbackMessage(`Updated ${scout.firstName}'s daily quota to ${newLimit === 999 ? 'Unlimited' : newLimit + '/day'}.`);
                          setTimeout(() => setFeedbackMessage(null), 3000);
                        }}
                        className="bg-white border border-[#DCE3DD] rounded-lg px-2 py-1 text-xs font-bold text-[#16241B] cursor-pointer"
                        title="Change daily upload quota"
                      >
                        <option value={3}>3 / day</option>
                        <option value={5}>5 / day</option>
                        <option value={10}>10 / day</option>
                        <option value={25}>25 / day</option>
                        <option value={999}>Unlimited</option>
                      </select>

                      <select
                        value={currentTrust}
                        onChange={(e) => {
                          const newTrust = e.target.value as 'PROBATIONARY' | 'TRUSTED' | 'SUSPENDED';
                          updateAnyUser(scout.id, { scoutTrustLevel: newTrust });
                          setFeedbackMessage(`Trust level for ${scout.firstName} set to ${newTrust}.`);
                          setTimeout(() => setFeedbackMessage(null), 3000);
                        }}
                        className={`border rounded-lg px-2 py-1 text-xs font-bold cursor-pointer ${
                          currentTrust === 'TRUSTED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : currentTrust === 'SUSPENDED'
                            ? 'bg-rose-50 border-rose-300 text-rose-800'
                            : 'bg-white border-[#DCE3DD] text-[#16241B]'
                        }`}
                      >
                        <option value="PROBATIONARY">Probationary</option>
                        <option value="TRUSTED">Trusted</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Quick Yellow Page Modal */}
      <QuickYellowPageModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSuccess={(created) => {
          setFeedbackMessage(`"${created.name}" published to the Yellow Pages Directory!`);
          setTimeout(() => setFeedbackMessage(null), 4000);
        }}
      />

      {/* 2. Reassign / Transfer Owner Modal */}
      {restaurantForTransfer && (
        <TransferOwnerModal
          isOpen={!!restaurantForTransfer}
          onClose={() => setRestaurantForTransfer(null)}
          restaurant={restaurantForTransfer}
          onSuccess={(email) => {
            setFeedbackMessage(`Storefront ownership for "${restaurantForTransfer.name}" transferred to ${email}.`);
            setTimeout(() => setFeedbackMessage(null), 4000);
          }}
        />
      )}

      {/* 3. Pricing & Commission Configurator Modal */}
      {restaurantForPricing && (
        <RestaurantPricingModal
          isOpen={!!restaurantForPricing}
          onClose={() => setRestaurantForPricing(null)}
          restaurant={restaurantForPricing}
          onSuccess={() => {
            setFeedbackMessage(`Updated pricing and subscription tier for "${restaurantForPricing.name}".`);
            setTimeout(() => setFeedbackMessage(null), 4000);
          }}
        />
      )}

      {/* 4. Delete Confirmation Dialog */}
      {restaurantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-[#16241B]">Delete Eatery Listing?</h3>
              <p className="text-xs text-[#526056]">
                Are you sure you want to permanently remove <strong>"{restaurantToDelete.name}"</strong>? All associated menu items and yellow pages scans will be wiped.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRestaurantToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DCE3DD] text-[#526056] hover:bg-stone-50 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
