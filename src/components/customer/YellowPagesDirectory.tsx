import React, { useState, useMemo } from 'react';
import { Restaurant, ServiceType } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { usePlatform } from '../../context/PlatformContext';
import {
  BookOpen,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  Utensils,
  Store,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Coffee,
  ShoppingBag,
  Building,
  Home,
  Truck,
  Layers,
  ArrowUpDown,
  Camera,
  UserCheck,
  Lock,
  X,
  AlertTriangle,
  Bike,
  Users,
  ChefHat
} from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';
import { useAuth } from '../../context/AuthContext';
import { QuickYellowPageModal } from '../special/QuickYellowPageModal';

interface YellowPagesDirectoryProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export const YellowPagesDirectory: React.FC<YellowPagesDirectoryProps> = ({
  onSelectRestaurant,
  searchQuery = '',
  setSearchQuery,
}) => {
  const { restaurants, addRestaurant } = useRestaurants();
  const { config } = usePlatform();
  const { currentUser, isAuthenticated, openAuthModal, setCurrentUserRole } = useAuth();

  const [selectedEstablishmentType, setSelectedEstablishmentType] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [selectedHalal, setSelectedHalal] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RATING' | 'NAME' | 'REVIEWS'>('RATING');
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isRoleRestrictedOpen, setIsRoleRestrictedOpen] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);

  // Suggest Eatery modal states (crowdsource without photo vandalism risk)
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestDistrict, setSuggestDistrict] = useState('Brunei-Muara');
  const [suggestCuisine, setSuggestCuisine] = useState('');
  const [suggestAddress, setSuggestAddress] = useState('');
  const [suggestNotes, setSuggestNotes] = useState('');
  const [suggestPhone, setSuggestPhone] = useState('');
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);

  const isGuestUser = !isAuthenticated || currentUser?.id === 'usr_guest';

  const handleSuggestEatery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) return;

    setSuggestSubmitting(true);
    try {
      addRestaurant({
        ownerId: 'unassigned',
        onboardedById: currentUser?.id || 'usr_guest',
        onboardedByRole: (currentUser?.role as any) || 'CUSTOMER',
        contributorName: currentUser && currentUser.id !== 'usr_guest' ? `${currentUser.firstName} ${currentUser.lastName}` : 'Diner Suggestion',
        name: suggestName.trim(),
        slug: suggestName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tagline: 'Diner-Suggested Local Eatery',
        description: suggestNotes.trim() || 'Suggested by diner. Queued for Regional Operations Lead & Vetted Scout field verification and menu photography.',
        establishmentType: 'Hawker / Local Eatery',
        cuisineTypes: suggestCuisine.trim() ? [suggestCuisine.trim()] : ['Local Brunei Classics'],
        logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
        coverImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
        phone: suggestPhone.trim() || '+673 (Pending Verification)',
        email: 'ops.scout@foodfindr.io',
        address: {
          street: suggestAddress.trim() || `${suggestDistrict}, Brunei Darussalam`,
          city: suggestDistrict === 'Brunei-Muara' ? 'Bandar Seri Begawan' : suggestDistrict,
          district: suggestDistrict,
          state: 'Brunei',
          zipCode: 'BB3910',
          latitude: 4.9031,
          longitude: 114.9398,
        },
        operatingHours: [
          { day: 'Monday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Tuesday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Wednesday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Thursday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Friday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Saturday', openTime: '08:00', closeTime: '21:00', isOpen: true },
          { day: 'Sunday', openTime: '08:00', closeTime: '21:00', isOpen: true },
        ],
        halalStatus: 'HALAL_CERTIFIED',
        orderingMode: 'DIRECTORY_ONLY',
        supportedServices: ['DINE_IN', 'TAKEAWAY'],
        fulfillmentType: 'PICKUP_ONLY',
        isVerified: false,
        isActive: true,
        listingStatus: 'PENDING_APPROVAL',
        rating: 5.0,
        reviewCount: 1,
        priceLevel: '$',
        estimatedDeliveryMin: 20,
        estimatedDeliveryMax: 40,
        deliveryFee: 3.0,
        minimumOrder: 5.0,
        monthlySubscriptionFee: 0,
        commissionRate: 0,
        subscriptionTier: 'FREE_DIRECTORY',
        subscriptionStatus: 'ACTIVE',
        kycStatus: 'PENDING',
        menuBookPages: [],
      });

      setIsSuggestModalOpen(false);
      setSuggestName('');
      setSuggestCuisine('');
      setSuggestAddress('');
      setSuggestNotes('');
      setSuggestPhone('');
      setUploadToast(`🎉 Thank you! "${suggestName.trim()}" has been queued for our Regional Operations team & Vetted Scouts to verify and photograph.`);
      setTimeout(() => setUploadToast(null), 6000);
    } catch {
      setUploadToast('Could not submit suggestion. Please try again.');
      setTimeout(() => setUploadToast(null), 4000);
    } finally {
      setSuggestSubmitting(false);
    }
  };
  const effectiveSearch = searchQuery || localSearch;

  // Compute available establishment types from config + restaurants (excluding B2B wholesale)
  const availableTypes = useMemo(() => {
    const set = new Set<string>(config.establishmentTypes || []);
    restaurants.forEach(r => {
      if (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY' || r.establishmentType === 'Commercial Supplier' || r.establishmentType === 'Wholesale Depot') {
        return;
      }
      if (r.establishmentType) set.add(r.establishmentType);
    });
    return Array.from(set);
  }, [config.establishmentTypes, restaurants]);

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // Strict B2B Isolation: Quarantined suppliers are never shown to retail consumers
      if (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY' || r.establishmentType === 'Commercial Supplier' || r.establishmentType === 'Wholesale Depot') {
        return false;
      }

      // Moderation Gate: Hide rejected listings and unapproved scout submissions from general public
      if (r.listingStatus === 'REJECTED') {
        return false;
      }
      if (r.listingStatus === 'PENDING_APPROVAL') {
        const canSeePending = currentUser && (
          currentUser.id === r.onboardedById || 
          currentUser.id === r.ownerId || 
          currentUser.role === 'SPECIAL_USER' || 
          currentUser.role === 'SUPER_ADMIN'
        );
        if (!canSeePending) return false;
      }

      // Search query
      if (effectiveSearch) {
        const query = effectiveSearch.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesCuisine = r.cuisineTypes.some(c => c.toLowerCase().includes(query));
        const matchesType = r.establishmentType?.toLowerCase().includes(query);
        const matchesDistrict = r.address.district?.toLowerCase().includes(query) || r.address.city.toLowerCase().includes(query);
        const matchesTagline = r.tagline?.toLowerCase().includes(query);
        if (!matchesName && !matchesCuisine && !matchesType && !matchesDistrict && !matchesTagline) {
          return false;
        }
      }

      // Establishment Type filter
      if (selectedEstablishmentType !== 'ALL' && r.establishmentType !== selectedEstablishmentType) {
        return false;
      }

      // District filter
      if (selectedDistrict !== 'ALL') {
        const district = r.address.district || r.address.city;
        if (district !== selectedDistrict) return false;
      }

      // Service mode filter
      if (selectedService !== 'ALL') {
        if (!r.supportedServices || !r.supportedServices.includes(selectedService as ServiceType)) {
          return false;
        }
      }

      // Halal filter
      if (selectedHalal !== 'ALL') {
        if (r.halalStatus !== selectedHalal) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'RATING') return b.rating - a.rating;
      if (sortBy === 'REVIEWS') return b.reviewCount - a.reviewCount;
      return a.name.localeCompare(b.name);
    });
  }, [
    restaurants,
    effectiveSearch,
    selectedEstablishmentType,
    selectedDistrict,
    selectedService,
    selectedHalal,
    sortBy,
    currentUser
  ]);

  // Grouping by establishment type for categorized view
  const groupedByType = useMemo(() => {
    const map = new Map<string, Restaurant[]>();
    filteredRestaurants.forEach(r => {
      const type = r.establishmentType || 'Other Eateries';
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(r);
    });
    return map;
  }, [filteredRestaurants]);

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (setSearchQuery) setSearchQuery(val);
  };

  const getEstablishmentIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('cafe') || t.includes('coffee')) return <Coffee className="w-4 h-4 text-amber-600" />;
    if (t.includes('home')) return <Home className="w-4 h-4 text-rose-500" />;
    if (t.includes('truck')) return <Truck className="w-4 h-4 text-indigo-600" />;
    if (t.includes('hawker') || t.includes('stall')) return <Store className="w-4 h-4 text-emerald-600" />;
    return <Building className="w-4 h-4 text-[#E0562B]" />;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Directory Hero Banner */}
      <div className="relative rounded-3xl bg-[#16241B] text-white p-6 sm:p-10 overflow-hidden shadow-lg border border-[#DCE3DD]">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#E0562B]/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0562B]/20 border border-[#E0562B]/40 text-[#FBE4DA] text-xs font-bold mb-3">
            <BookOpen className="w-3.5 h-3.5 text-[#E0562B]" />
            <span>Official Culinary Yellow Pages Directory</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Discover Brunei & Regional F&B Directory
          </h1>
          <p className="text-sm sm:text-base text-[#9FB0A3] mt-2 leading-relaxed">
            Browse verified restaurants, cozy specialty cafes, home-based artisanal bakers, and street stalls across all 4 districts. Contact directly via WhatsApp or telephone, or order online.
          </p>

          {/* Quick Search inside Hero */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#526056] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={effectiveSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by business name, pasta, kuih, cafe, Belait, Gadong..."
                className="w-full bg-white text-[#16241B] rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm placeholder:text-[#526056]/60 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
              />
            </div>
            {effectiveSearch && (
              <button
                onClick={() => handleSearchChange('')}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
            {/* Suggest Eatery Button (For Public Diners & Customers) */}
            <button
              onClick={() => setIsSuggestModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold px-3.5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Suggest Eatery</span>
            </button>

            {/* Photo Menu Snapping (For Vetted Scouts & Operations Leads) */}
            <button
              onClick={() => {
                if (isGuestUser) {
                  if (config.allowPublicScoutUploads === false) {
                    setUploadToast('Community photo menu uploads are currently restricted to internal Operations Hub staff by the platform administrator.');
                    setTimeout(() => setUploadToast(null), 5000);
                  } else {
                    setIsAuthPromptOpen(true);
                  }
                } else if (currentUser?.role === 'SPECIAL_USER' || currentUser?.role === 'SUPER_ADMIN') {
                  setIsQuickModalOpen(true);
                } else if (currentUser?.role === 'COMMUNITY_SCOUT') {
                  if (config.allowPublicScoutUploads === false) {
                    setUploadToast('Public Scout uploads are currently locked to Internal Operations only by the platform administrator.');
                    setTimeout(() => setUploadToast(null), 5000);
                  } else {
                    setIsQuickModalOpen(true);
                  }
                } else {
                  // User is logged in with another role: CUSTOMER, RUNNER, EMPLOYEE, or RESTAURANT_OWNER
                  setIsRoleRestrictedOpen(true);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>+ Snap Photo Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Taxonomy Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#DCE3DD] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3DD] pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#16241B]">
            <Filter className="w-4 h-4 text-[#E0562B]" />
            <span>Filter Yellow Pages by:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#526056] font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-1.5 text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
            >
              <option value="RATING">Highest Rating ★</option>
              <option value="REVIEWS">Most Reviewed</option>
              <option value="NAME">Alphabetical (A - Z)</option>
            </select>
          </div>
        </div>

        {/* 1. Establishment Types */}
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#526056] block mb-2">
            Establishment Type
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedEstablishmentType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedEstablishmentType === 'ALL'
                  ? 'bg-[#E0562B] text-white shadow-xs'
                  : 'bg-[#F6F7F5] text-[#526056] hover:text-[#16241B] hover:bg-[#DCE3DD]/50'
              }`}
            >
              All Types ({restaurants.length})
            </button>
            {availableTypes.map(type => {
              const count = restaurants.filter(r => r.establishmentType === type).length;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedEstablishmentType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedEstablishmentType === type
                      ? 'bg-[#E0562B] text-white shadow-xs'
                      : 'bg-[#F6F7F5] text-[#526056] hover:text-[#16241B] hover:bg-[#DCE3DD]/50'
                  }`}
                >
                  {getEstablishmentIcon(type)}
                  <span>{type}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedEstablishmentType === type ? 'bg-white/30 text-white' : 'bg-[#DCE3DD] text-[#526056]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. District & Services & Halal Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* District */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#526056] mb-1">
              Brunei District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full text-xs font-semibold bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
            >
              <option value="ALL">All Districts (4 Regions)</option>
              <option value="Brunei-Muara">Brunei-Muara (BSB, Gadong, Kiulap, Jerudong)</option>
              <option value="Belait">Belait (Kuala Belait, Seria, Lumut)</option>
              <option value="Tutong">Tutong (Pekan Tutong, Telisai)</option>
              <option value="Temburong">Temburong (Bangar, Labu)</option>
            </select>
          </div>

          {/* Supported Dining Services */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#526056] mb-1">
              Dining & Service Mode
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-xs font-semibold bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
            >
              <option value="ALL">All Service Modes</option>
              <option value="DINE_IN">🍽️ Dine-In Available</option>
              <option value="TAKEAWAY">🥡 Takeaway / Self-Pickup</option>
              <option value="DELIVERY">🛵 Home & Office Delivery</option>
            </select>
          </div>

          {/* Halal & Dietary */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#526056] mb-1">
              Halal & Dietary
            </label>
            <select
              value={selectedHalal}
              onChange={(e) => setSelectedHalal(e.target.value)}
              className="w-full text-xs font-semibold bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
            >
              <option value="ALL">All Dietary Declarations</option>
              <option value="HALAL_CERTIFIED">Halal Certified (MUIB / Official)</option>
              <option value="MUSLIM_OWNED">100% Muslim-Owned Kitchen</option>
              <option value="PORK_FREE">Pork-Free & Alcohol-Free Kitchen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Results count */}
      <div className="flex items-center justify-between text-xs font-bold text-[#526056] px-1">
        <span>Showing {filteredRestaurants.length} listing{filteredRestaurants.length === 1 ? '' : 's'} in directory</span>
        {(selectedEstablishmentType !== 'ALL' || selectedDistrict !== 'ALL' || selectedService !== 'ALL' || selectedHalal !== 'ALL' || effectiveSearch) && (
          <button
            onClick={() => {
              setSelectedEstablishmentType('ALL');
              setSelectedDistrict('ALL');
              setSelectedService('ALL');
              setSelectedHalal('ALL');
              handleSearchChange('');
            }}
            className="text-[#E0562B] hover:underline cursor-pointer"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Directory Grid / Yellow Pages Cards */}
      {filteredRestaurants.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#DCE3DD] shadow-xs">
          <BookOpen className="w-12 h-12 text-[#9FB0A3] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#16241B]">No Yellow Page listings match your filters</h3>
          <p className="text-xs text-[#526056] max-w-sm mx-auto mt-1">
            Try adjusting your search terms, choosing a different district, or clearing establishment type filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRestaurants.map((restaurant) => {
            const isHomeBased = restaurant.establishmentType?.toLowerCase().includes('home');
            const districtName = restaurant.address.district || restaurant.address.city;

            return (
              <div
                key={restaurant.id}
                className="bg-white rounded-3xl border border-[#DCE3DD] hover:border-[#E0562B]/50 transition-all hover:shadow-md overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Top banner / image */}
                  <div className="relative h-40 bg-[#F6F7F5] overflow-hidden">
                    <img
                      src={restaurant.coverImageUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/95 text-[#16241B] backdrop-blur-xs shadow-xs">
                        {getEstablishmentIcon(restaurant.establishmentType)}
                        <span>{restaurant.establishmentType || 'Restaurant'}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {restaurant.listingStatus === 'PENDING_APPROVAL' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-stone-950 shadow-xs animate-pulse">
                            ⏳ Under Ops Review
                          </span>
                        )}
                        {restaurant.halalStatus && restaurant.halalStatus !== 'NOT_SPECIFIED' && (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-xs ${
                            restaurant.halalStatus === 'HALAL_CERTIFIED'
                              ? 'bg-emerald-600 text-white'
                              : restaurant.halalStatus === 'MUSLIM_OWNED'
                              ? 'bg-[#2F7A4F] text-white'
                              : 'bg-amber-600 text-white'
                          }`}>
                            {restaurant.halalStatus === 'HALAL_CERTIFIED' ? '✓ Halal Certified' : restaurant.halalStatus === 'MUSLIM_OWNED' ? 'Muslim Owned' : 'Pork Free'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom overlay info */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <span className="text-xs font-bold text-[#FBE4DA] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#E0562B]" />
                          <span>{districtName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-lg text-xs font-extrabold">
                        <span className="text-amber-400">★</span>
                        <span>{restaurant.rating.toFixed(1)}</span>
                        <span className="text-white/70 text-[10px]">({restaurant.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#16241B] tracking-tight group-hover:text-[#E0562B] transition-colors line-clamp-1">
                        {restaurant.name}
                      </h3>
                      <p className="text-xs text-[#526056] line-clamp-2 mt-0.5 leading-relaxed">
                        {restaurant.tagline || restaurant.description}
                      </p>
                    </div>

                    {/* Cuisine Chips */}
                    <div className="flex flex-wrap gap-1">
                      {restaurant.cuisineTypes.slice(0, 3).map(cuisine => (
                        <span key={cuisine} className="text-[10px] font-bold bg-[#F6F7F5] text-[#526056] px-2 py-0.5 rounded-md">
                          {cuisine}
                        </span>
                      ))}
                    </div>

                    {/* Supported Services Badges */}
                    <div className="pt-2 border-t border-[#DCE3DD] flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#526056]">Services:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {restaurant.supportedServices?.includes('DINE_IN') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                            🍽️ Dine In
                          </span>
                        )}
                        {restaurant.supportedServices?.includes('TAKEAWAY') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-md">
                            🥡 Pickup
                          </span>
                        )}
                        {restaurant.supportedServices?.includes('DELIVERY') && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                            🛵 Delivery
                          </span>
                        )}
                        {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> Menu Scan ({restaurant.menuBookPages.length}P)
                          </span>
                        )}
                        {restaurant.onboardedByRole === 'COMMUNITY_SCOUT' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md flex items-center gap-1">
                            <Camera className="w-2.5 h-2.5 text-indigo-600" />
                            <span>Scout: {restaurant.contributorName || 'Food Scout'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Address details */}
                    <div className="text-[11px] text-[#526056] flex items-start gap-1.5 bg-[#F6F7F5] p-2.5 rounded-xl">
                      <MapPin className="w-3.5 h-3.5 text-[#E0562B] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {restaurant.address.street}, {restaurant.address.city}, {districtName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Yellow Pages Action Buttons */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Direct WhatsApp Call/Chat */}
                    <a
                      href={getWhatsAppUrl(
                        restaurant.whatsappPhone || restaurant.phone,
                        `Assalamualaikom ${restaurant.name}! I found your eatery on the FOODFINDR Brunei Yellow Pages.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#E1F0E6] hover:bg-[#2F7A4F] text-[#2F7A4F] hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      title="Chat on WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {/* Direct Phone Call */}
                    <a
                      href={getPhoneCallUrl(restaurant.phone || restaurant.whatsappPhone)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] font-bold text-xs rounded-xl transition-all cursor-pointer"
                      title="Direct phone call"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#2F7A4F]" />
                      <span>Call</span>
                    </a>
                  </div>

                  {/* View Digital Menu / Order Online */}
                  <button
                    onClick={() => onSelectRestaurant(restaurant)}
                    className="w-full bg-[#16241B] hover:bg-[#E0562B] text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>View Menu & Order Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Guarantee Callout */}
      <div className="mt-8 p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#526056]">
        <div className="flex items-start sm:items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#2F7A4F] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-[#16241B]">Consumer Food Directory Guarantee:</strong> Only licensed consumer dining establishments, cafes, and food stalls are listed here. Commercial wholesale slaughterhouses, bulk grain depots, and industrial ingredient distributors are strictly quarantined from public Yellow Pages and published only to the private Restaurant Owner B2B Wholesale Hub.
          </span>
        </div>
      </div>

      {/* Scout Upload Toast Feedback */}
      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-[#16241B] text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{uploadToast}</span>
        </div>
      )}

      {/* Scout Authentication Gatekeeper Modal */}
      {isAuthPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#DCE3DD] max-w-md w-full p-6 space-y-5 text-[#16241B]">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsAuthPromptOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#F6F7F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Vetted Contributor Protection</span>
              </div>
              <h3 className="text-lg font-black text-[#16241B] tracking-tight">
                Menu Uploads Reserved for Vetted Scouts
              </h3>
              <p className="text-xs text-[#526056] leading-relaxed">
                To prevent vandalism, fake listings, inaccurate halal claims, and duplicate phone numbers, direct Yellow Pages menu uploads are restricted to <strong>Vetted Community Food Scouts</strong> and <strong>Regional Operations Leads</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2 text-xs text-[#526056]">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Know a great missing eatery?</strong> Submit a quick suggestion and our scout team will visit & photograph the menu.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Are you a restaurant owner?</strong> Register your business to claim your listing and publish official menus.</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setIsAuthPromptOpen(false);
                  setIsSuggestModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#E0562B] hover:bg-[#c9451c] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4" />
                <span>Suggest a Missing Eatery (Quick)</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthPromptOpen(false);
                  openAuthModal('REGISTER', 'RESTAURANT_OWNER');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>I'm the Restaurant Owner (Register)</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthPromptOpen(false);
                  openAuthModal('SIGN_IN');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-[#DCE3DD] text-[#16241B] font-bold text-xs cursor-pointer transition-colors"
              >
                Sign In as Vetted Scout / Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Restriction Notice Modal for Customer, Runner, Employee, Owner */}
      {isRoleRestrictedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#DCE3DD] max-w-md w-full p-6 space-y-5 text-[#16241B]">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                onClick={() => setIsRoleRestrictedOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#F6F7F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>Active Role: {currentUser?.role?.replace('_', ' ')}</span>
              </div>
              <h3 className="text-lg font-black text-[#16241B] tracking-tight">
                {currentUser?.role === 'RESTAURANT_OWNER'
                  ? 'Use Your Merchant Dashboard'
                  : currentUser?.role === 'CUSTOMER'
                  ? 'Photo Uploads Require Vetted Scout Role'
                  : 'Role Boundary: Upload Restricted'}
              </h3>
              <p className="text-xs text-[#526056] leading-relaxed">
                {currentUser?.role === 'CUSTOMER' && (
                  <>Customer accounts can explore eateries, order food, and leave reviews. To protect directory accuracy and prevent vandalism, full photo menu uploads require an onboarded <strong>Community Food Scout</strong> or <strong>Operations Lead</strong> account. You can easily suggest missing spots below!</>
                )}
                {currentUser?.role === 'RESTAURANT_OWNER' && (
                  <>As a Restaurant Owner, you have full access to manage your official restaurant profile, printed menu booklets, and dishes through your <strong>Partner Merchant Dashboard</strong>.</>
                )}
                {currentUser?.role === 'RUNNER' && (
                  <>Delivery Runner accounts are designated for order fulfillment and delivery proof. Runners do not have restaurant directory creation privileges.</>
                )}
                {currentUser?.role === 'EMPLOYEE' && (
                  <>Store Employee accounts are designated for POS cashier and Kitchen Display System duties.</>
                )}
              </p>
            </div>

            <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2 text-xs text-[#526056]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#16241B] block">Anti-Spam & Role Isolation</strong>
                  <span>Community Food Scouts are vetted and onboarded by our Regional Operations Hub to ensure all listings and pricing are authentic.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {currentUser?.role === 'RESTAURANT_OWNER' ? (
                <button
                  onClick={() => {
                    setIsRoleRestrictedOpen(false);
                    const event = new CustomEvent('navigate-tab', { detail: 'owner' });
                    window.dispatchEvent(event);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#E0562B] hover:bg-[#c9451c] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Store className="w-4 h-4" />
                  <span>Go to Merchant Partner Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsRoleRestrictedOpen(false);
                    setIsSuggestModalOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#E0562B] hover:bg-[#c9451c] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Suggest a Missing Eatery</span>
                </button>
              )}

              <button
                onClick={() => setIsRoleRestrictedOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-[#DCE3DD] text-[#16241B] font-bold text-xs cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Missing Eatery Modal (Open to all Diners without Vandalism Risk) */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#DCE3DD] max-w-lg w-full p-6 space-y-4 text-[#16241B] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DCE3DD] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FBE4DA] text-[#E0562B] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#16241B]">Suggest a Missing Eatery</h3>
                  <p className="text-[11px] text-[#526056]">Help our Scout team map every local food spot in Brunei</p>
                </div>
              </div>
              <button
                onClick={() => setIsSuggestModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#F6F7F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSuggestEatery} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1">Eatery / Stall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warung Nasi Lemak Pak Tam or Restoran Mei Ling"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2.5 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">District</label>
                  <select
                    value={suggestDistrict}
                    onChange={(e) => setSuggestDistrict(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  >
                    <option value="Brunei-Muara">Brunei-Muara</option>
                    <option value="Belait">Belait</option>
                    <option value="Tutong">Tutong</option>
                    <option value="Temburong">Temburong</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16241B] mb-1">Cuisine / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Nasi Katok, Seafood, Kopitiam"
                    value={suggestCuisine}
                    onChange={(e) => setSuggestCuisine(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1">Location / Landmark / Street</label>
                <input
                  type="text"
                  placeholder="e.g. Spg 45, Kiulap Complex or Next to Gadong Pasar Malam"
                  value={suggestAddress}
                  onChange={(e) => setSuggestAddress(e.target.value)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1">What's famous here? (Notes for Scouts)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Signature Sambal Belacan, open till 2am, cash only..."
                  value={suggestNotes}
                  onChange={(e) => setSuggestNotes(e.target.value)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#16241B] mb-1">Eatery Phone or Social Link (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +673 876 5432 or @warungpaktam.bn"
                  value={suggestPhone}
                  onChange={(e) => setSuggestPhone(e.target.value)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Quality Protocol:</strong> Suggestions are routed to the <strong>Regional Operations Queue</strong>. Our vetted local Food Scouts will visit to photograph the physical menu and confirm operating hours before publishing.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#DCE3DD] bg-white hover:bg-stone-50 font-bold text-[#16241B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suggestSubmitting || !suggestName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#E0562B] hover:bg-[#c9451c] disabled:opacity-50 text-white font-extrabold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{suggestSubmitting ? 'Submitting...' : 'Submit Suggestion'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Yellow Page Modal (Accessible by Community Scouts and Authorized Users) */}
      <QuickYellowPageModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSuccess={(created) => {
          if (created.listingStatus === 'PENDING_APPROVAL') {
            setUploadToast(`Thank you! "${created.name}" was submitted for review. It will appear on the Yellow Pages once verified by our Operations team.`);
          } else {
            setUploadToast(`"${created.name}" has been published to the Yellow Pages Directory!`);
          }
          setTimeout(() => setUploadToast(null), 5000);
        }}
      />
    </div>
  );
};
