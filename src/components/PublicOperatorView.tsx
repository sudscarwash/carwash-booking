import React, { useState, useEffect, useMemo } from 'react';
import { CarWash, User, Role } from '../types.js';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Phone, 
  Instagram, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  QrCode, 
  Share2, 
  Copy, 
  ExternalLink,
  Car,
  Layers,
  Star,
  CheckCircle2,
  LogIn,
  Eye,
  LayoutDashboard,
  AlertCircle,
  Package,
  Wrench,
  ShoppingBag,
  Flame,
  ChevronDown
} from 'lucide-react';
import autoshineLogo from '../assets/images/autoshinebn_logo.svg';

interface PublicOperatorViewProps {
  carWash: CarWash;
  currentUser?: User | null;
  onSelectBook: (serviceId?: string, serviceName?: string, price?: number) => void;
  onBrowseAll: () => void;
  onLoginClick: () => void;
  isAuthenticated?: boolean;
}

export const PublicOperatorView: React.FC<PublicOperatorViewProps> = ({
  carWash,
  currentUser,
  onSelectBook,
  onBrowseAll,
  onLoginClick,
  isAuthenticated = false,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const directUrl = typeof window !== 'undefined' ? window.location.href : '';

  // 1. Calculate base schedule status based on openingHours
  const getOpenStatus = () => {
    try {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const now = new Date();
      const currentDay = days[now.getDay()];
      const hours = carWash.openingHours as any;
      if (!hours || !hours[currentDay]) return { isOpen: true, text: 'Open Today' };

      const dayConfig = hours[currentDay];
      if (dayConfig.closed || dayConfig.isOpen === false) return { isOpen: false, text: 'Closed Today' };

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = (dayConfig.open || '08:00').split(':').map(Number);
      const [closeH, closeM] = (dayConfig.close || '18:00').split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return { isOpen: true, text: `Open Now • Closes at ${dayConfig.close}` };
      } else if (currentMinutes < openMinutes) {
        return { isOpen: false, text: `Opens Today at ${dayConfig.open}` };
      } else {
        return { isOpen: false, text: 'Closed for the day' };
      }
    } catch {
      return { isOpen: true, text: 'Open Today' };
    }
  };

  const status = getOpenStatus();

  // 2. Fetch live slot availability for today (Brunei time UTC+8)
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  const todayDateStr = useMemo(() => {
    const bruneiNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    return bruneiNow.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const res = await fetch(`/api/bookings/available-slots?carWashId=${encodeURIComponent(carWash.id)}&date=${todayDateStr}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setTodaySlots(data);
          }
        }
      } catch (err) {
        console.warn('Failed to load slots for PublicOperatorView:', err);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    };
    fetchSlots();
    return () => { isMounted = false; };
  }, [carWash.id, todayDateStr]);

  const totalSlots = todaySlots.length;
  const availableSlots = todaySlots.filter((s) => s.isAvailable && !s.isPast);
  const isFullyBookedToday = !isLoadingSlots && totalSlots > 0 && availableSlots.length === 0;
  const nextAvailableSlot = availableSlots.length > 0 ? availableSlots[0] : null;

  // 3. Service Catalog (Custom if configured by station, or comprehensive standard Brunei services)
  const allServices = useMemo(() => {
    if (carWash.services && carWash.services.length > 0) {
      return carWash.services;
    }
    return [
      {
        id: 'srv_express_wash',
        name: 'Express Jet Wash & Towel Dry',
        price: 10.0,
        duration: 20,
        type: 'service',
        description: 'Fast exterior water jet foam rinse with soft microfiber hand dry. Ideal for a quick clean on the go.',
        isPopular: false,
      },
      {
        id: 'srv_deluxe_wash',
        name: 'Deluxe Foam Wash, Wax & Tyre Shine',
        price: 25.0,
        duration: 60,
        type: 'service',
        description: 'Full exterior foam wash, spray wax protection, deep interior vacuum, dashboard wipe, and premium tyre shine.',
        isPopular: true,
      },
      {
        id: 'srv_ceramic_detail',
        name: 'Premium Ceramic Coating & Deep Detailing',
        price: 45.0,
        duration: 90,
        type: 'service',
        description: 'Ultimate hand wash detailing with clay bar decontamination, hydrophobic ceramic spray sealant, and engine bay wipe.',
        isPopular: false,
      },
      {
        id: 'addon_headlight',
        name: 'Headlight Polish & Lens Restoration',
        price: 15.0,
        duration: 15,
        type: 'addon',
        description: 'Professional headlight lens clarity restoration removing yellowing, cloudiness and hazing.',
        isPopular: false,
      },
      {
        id: 'addon_tyre',
        name: 'Tyre Shine & Hydrophobic Rim Coating',
        price: 5.0,
        duration: 10,
        type: 'addon',
        description: 'Deep glossy tyre dressing and protective hydrophobic rim shine coat.',
        isPopular: false,
      },
      {
        id: 'addon_windscreen',
        name: 'Windscreen Rain-Repellent Treatment',
        price: 8.0,
        duration: 10,
        type: 'addon',
        description: 'Hydrophobic glass coating that repels rain drops and improves driving visibility in heavy downpours.',
        isPopular: false,
      },
      {
        id: 'addon_steam',
        name: 'Interior Steam Sanitization & Deodorizer',
        price: 12.0,
        duration: 20,
        type: 'addon',
        description: 'High-temperature steam treatment targeting AC vents, seats and carpets to eliminate bacteria and odors.',
        isPopular: false,
      },
      {
        id: 'prod_microfiber',
        name: 'Microfiber Detailing Towel Pack (3-pc)',
        price: 6.0,
        duration: 0,
        type: 'product',
        description: 'Ultra-soft 400GSM plush microfiber towels for scratch-free drying and interior wiping.',
        isPopular: false,
      },
      {
        id: 'prod_ceramic_spray',
        name: 'Hydrophobic Ceramic Guard Spray 300ml',
        price: 18.0,
        duration: 0,
        type: 'product',
        description: 'Easy spray-on ceramic sealant providing 3 months of gloss and extreme water beading.',
        isPopular: false,
      }
    ];
  }, [carWash.services]);

  const [activeCategory, setActiveCategory] = useState<'all' | 'service' | 'addon' | 'product'>('all');

  const washPackages = useMemo(() => allServices.filter((s: any) => !s.type || s.type === 'service'), [allServices]);
  const addonServices = useMemo(() => allServices.filter((s: any) => s.type === 'addon'), [allServices]);
  const products = useMemo(() => allServices.filter((s: any) => s.type === 'product'), [allServices]);

  const displayedServices = useMemo(() => {
    if (activeCategory === 'all') return allServices;
    if (activeCategory === 'service') return washPackages;
    if (activeCategory === 'addon') return addonServices;
    if (activeCategory === 'product') return products;
    return allServices;
  }, [activeCategory, allServices, washPackages, addonServices, products]);

  const [showHoursOnMobile, setShowHoursOnMobile] = useState(false);

  const todayDayName = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(), []);
  const todayHours = useMemo(() => {
    return (carWash.openingHours as any)?.[todayDayName] || { open: '08:00', close: '18:00', closed: false };
  }, [carWash.openingHours, todayDayName]);

  const lowestPrice = useMemo(() => {
    if (!allServices || allServices.length === 0) return 10;
    const prices = allServices.map((s: any) => Number(s.price)).filter((p: number) => !isNaN(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 10;
  }, [allServices]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="public-operator-page">
      {/* Logged in / Operator Preview Header Banner */}
      {currentUser && (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 relative z-40">
          <div className="flex items-center gap-2.5">
            <span className="bg-sky-500/20 text-sky-300 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-sky-400/30 flex items-center gap-1">
              <Eye className="w-3 h-3 text-sky-400" />
              {currentUser.role === Role.OWNER ? 'Owner Customer Preview' : 'Logged In'}
            </span>
            <span className="text-slate-300">
              Viewing public station page for <strong>{carWash.name}</strong> as <span className="text-white font-medium">{currentUser.name}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onBrowseAll}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            id="public-operator-return-dash-btn"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
            <span>Return to {currentUser.role === Role.OWNER ? 'Owner Dashboard' : 'Dashboard'}</span>
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBrowseAll}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Browse all car wash stations"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">All Washes</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center shadow-xs overflow-hidden">
                <img src={autoshineLogo} alt="AutoShine BN" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
              </div>
              <span className="font-black text-slate-800 text-sm tracking-tight hidden md:inline">
                autoshine bn
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Share or scan QR code"
              id="share-operator-btn"
            >
              <Share2 className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onLoginClick}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                id="public-operator-signin-btn"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectBook()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Now</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Business Hero Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs sm:shadow-sm relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-5 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full">
              {/* Logo / Badge - Centered on Mobile */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0 overflow-hidden border-2 border-white ring-4 ring-slate-100/80 mx-auto sm:mx-0">
                {carWash.logoUrl ? (
                  <img
                    src={carWash.logoUrl}
                    alt={carWash.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  carWash.name.slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Title & Badges */}
              <div className="space-y-2 min-w-0 flex-1 flex flex-col items-center sm:items-start">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                    <ShieldCheck className="w-3 h-3 text-sky-600" /> Verified Partner
                  </span>

                  {!status.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Closed Today
                    </span>
                  ) : isFullyBookedToday ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-300 shadow-xs animate-pulse" id="status-fully-booked-pill">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Fully Booked Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {availableSlots.length > 0 ? `${availableSlots.length} Slots Open Today` : status.text}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> 4.9 Direct
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                  {carWash.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed mx-auto sm:mx-0">
                  {carWash.description || 'Premium automotive wash, detailing, and paint protection services in Brunei Darussalam.'}
                </p>

                {/* Fully Booked Today Notice Banner */}
                {isFullyBookedToday && (
                  <div className="w-full bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 flex items-start text-left gap-2.5 mt-2 animate-fade-in" id="fully-booked-alert">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="font-extrabold text-rose-900 block text-xs sm:text-sm">
                        All Bays Fully Booked for Today
                      </strong>
                      <p className="text-rose-700 mt-0.5 leading-relaxed text-[11px] sm:text-xs">
                        Every bay slot for today is reserved. Tap <strong>Advance Booking</strong> below to select tomorrow or upcoming dates.
                      </p>
                    </div>
                  </div>
                )}

                {/* Next Available Slot Prompt */}
                {!isFullyBookedToday && nextAvailableSlot && (
                  <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold mt-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Next slot today: <strong>{nextAvailableSlot.startTime}</strong> ({availableSlots.length} left)</span>
                  </div>
                )}

                {/* Key Location Meta & Quick Action Pills */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 text-xs w-full">
                  {carWash.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(carWash.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl border border-slate-200/80 transition-colors text-xs"
                      title="Open Google Maps Directions"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-none">{carWash.address}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>
                  )}

                  {carWash.phone && (
                    <a
                      href={`tel:${carWash.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl border border-slate-200/80 transition-colors text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{carWash.phone}</span>
                    </a>
                  )}

                  {carWash.instagram && (
                    <a 
                      href={`https://instagram.com/${carWash.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-xl border border-rose-200/80 transition-colors text-xs"
                    >
                      <Instagram className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>@{carWash.instagram.replace('@', '')}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button on Desktop */}
            <div className="shrink-0 flex flex-col items-stretch sm:items-end justify-center pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
              <button
                type="button"
                onClick={() => onSelectBook()}
                className={`w-full sm:w-auto px-6 py-3.5 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isFullyBookedToday
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
                }`}
                id="hero-book-now-btn"
              >
                <Calendar className="w-4 h-4" />
                <span>{isFullyBookedToday ? 'Advance Book (Tomorrow/Later)' : 'Reserve A Time Slot'}</span>
              </button>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 text-center sm:text-right">
                Pay on site at counter • No cancellation fees
              </span>
            </div>
          </div>

          {/* Streamlined Facility Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 text-xs">
            <div className="bg-slate-50/80 p-2 sm:p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Bay Capacity</span>
              <span className="font-extrabold text-slate-800 text-xs sm:text-sm mt-0.5 block">
                {carWash.capacityPerSlot || 2} Dedicated Bays
              </span>
            </div>
            <div className="bg-slate-50/80 p-2 sm:p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Slot Intervals</span>
              <span className="font-extrabold text-slate-800 text-xs sm:text-sm mt-0.5 block">
                {carWash.slotDuration || 30} Min Slots
              </span>
            </div>
            <div className="bg-slate-50/80 p-2 sm:p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Settlement</span>
              <span className="font-extrabold text-slate-800 text-xs sm:text-sm mt-0.5 block">
                Cash / Transfer
              </span>
            </div>
            <div className="bg-slate-50/80 p-2 sm:p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Confirmation</span>
              <span className="font-extrabold text-emerald-700 text-xs sm:text-sm mt-0.5 block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Instant Lock
              </span>
            </div>
          </div>
        </div>

        {/* Available Wash Services & Packages Menu */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">Wash Services & Packages</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {isFullyBookedToday 
                  ? 'All bays are booked for today. Select a service to reserve ahead for upcoming dates.'
                  : 'Choose a service package below to view live slot availability'}
              </p>
            </div>

            {/* Sticky Category Filter Chips on Mobile */}
            <div className="sticky top-14 sm:top-16 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-1 sm:py-0 bg-slate-50/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none shadow-2xs sm:shadow-none">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    activeCategory === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({allServices.length})
                </button>
                {washPackages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('service')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      activeCategory === 'service'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 text-sky-600" />
                    <span>Packages ({washPackages.length})</span>
                  </button>
                )}
                {addonServices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('addon')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      activeCategory === 'addon'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Add-ons ({addonServices.length})</span>
                  </button>
                )}
                {products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory('product')}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      activeCategory === 'product'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Products ({products.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {displayedServices.map((svc: any) => {
              const isAddon = svc.type === 'addon';
              const isProduct = svc.type === 'product';

              return (
                <div
                  key={svc.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border transition-all flex flex-col justify-between shadow-xs relative ${
                    svc.isPopular
                      ? 'border-sky-500 ring-2 ring-sky-100 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {svc.isPopular && (
                    <span className="absolute -top-2.5 left-4 sm:left-6 bg-sky-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-amber-300 text-amber-300" /> Most Popular
                    </span>
                  )}

                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words whitespace-normal">
                        {svc.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isProduct
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isAddon
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {isProduct ? 'Care Product' : isAddon ? 'Add-on Treatment' : 'Wash Package'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 text-slate-900">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500">BND</span>
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-sky-700">
                        ${Number(svc.price).toFixed(2)}
                      </span>
                      {svc.duration && svc.duration > 0 ? (
                        <span className="text-[11px] sm:text-xs text-slate-400 ml-1">
                          • ~{svc.duration} mins
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs text-slate-400 ml-1">
                          • In-Store Supply
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[2.5rem] sm:min-h-[3rem] break-words whitespace-normal">
                      {svc.description || 'Professional automotive detailing service.'}
                    </p>
                  </div>

                  <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onSelectBook(svc.id, svc.name, svc.price)}
                      className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
                        svc.isPopular
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <span>
                        {isFullyBookedToday 
                          ? 'Book Ahead' 
                          : isProduct 
                          ? 'Add to Order' 
                          : 'Select & Choose Time'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operating Schedule Overview (Streamlined with Mobile Accordion) */}
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
          <button
            type="button"
            onClick={() => setShowHoursOnMobile(!showHoursOnMobile)}
            className="w-full flex items-center justify-between text-left cursor-pointer md:cursor-default"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Operating Hours</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 md:hidden">
                    {todayHours.closed ? 'Closed Today' : `Today: ${todayHours.open} - ${todayHours.close}`}
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  {showHoursOnMobile ? 'Tap to hide weekly schedule' : 'Slots are available during active station hours (Tap to view 7-day schedule)'}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform md:hidden ${showHoursOnMobile ? 'rotate-180' : ''}`} />
          </button>

          <div className={`${showHoursOnMobile ? 'grid' : 'hidden md:grid'} grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-2.5 text-center text-xs mt-4 pt-3 border-t border-slate-100`}>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
              const hours = (carWash.openingHours as any)?.[day] || { open: '08:00', close: '18:00', closed: false };
              const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;

              return (
                <div
                  key={day}
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
                    isToday
                      ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-200'
                      : 'bg-slate-50/60 border-slate-150'
                  }`}
                >
                  <span className={`block font-bold capitalize text-[10px] sm:text-[11px] ${isToday ? 'text-sky-700' : 'text-slate-600'}`}>
                    {day.slice(0, 3)} {isToday && '• Today'}
                  </span>
                  <span className="block mt-1 font-mono text-[10px] sm:text-[11px] text-slate-800 font-bold">
                    {hours.closed ? (
                      <span className="text-rose-500 font-semibold">Closed</span>
                    ) : (
                      `${hours.open} - ${hours.close}`
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Share / QR Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Direct Booking Link</h3>
              <p className="text-xs text-slate-500 mt-1">
                Share this direct URL with customers to book slots at {carWash.name}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-mono text-slate-700 break-all select-all">
              {directUrl}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Sticky Mobile Booking Bar */}
      <div className="md:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Starting From</span>
          <span className="text-base font-black text-sky-700">${lowestPrice.toFixed(2)} BND</span>
        </div>

        <button
          type="button"
          onClick={() => onSelectBook()}
          className={`flex-1 py-3 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
            isFullyBookedToday
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-sky-600 hover:bg-sky-500'
          }`}
          id="mobile-sticky-book-btn"
        >
          <Calendar className="w-4 h-4" />
          <span>
            {isFullyBookedToday 
              ? 'Advance Book Ahead' 
              : availableSlots.length > 0 
              ? `Book Bay (${availableSlots.length} Open)` 
              : 'Reserve Slot'}
          </span>
        </button>
      </div>
    </div>
  );
};
