/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  Sparkles, 
  Navigation, 
  ShieldCheck, 
  Check, 
  Info, 
  CreditCard, 
  ArrowLeft,
  FileText,
  MessageCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { CarWash, User, WashService } from '../types.js';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from './MapSimulation.js';
import { LocalPaymentForm } from './LocalPaymentForm.js';
import autoshineLogo from '../assets/images/autoshine_logo_1783916518342.jpg';

interface TimeSlotItem {
  timeSlot: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
}

interface BookingFlowModalProps {
  location: CarWash;
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  createBooking: (
    carWashId: string,
    date: string,
    timeSlot: string,
    notes?: string,
    serviceId?: string,
    serviceName?: string,
    price?: number
  ) => Promise<{ success: boolean; error?: string }>;
  onBookingSuccess: (bookingData: any) => void;
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  location,
  isOpen,
  onClose,
  user,
  createBooking,
  onBookingSuccess
}) => {
  const { token, showNotification } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [itemTabFilter, setItemTabFilter] = useState<'all' | 'service' | 'addon' | 'product'>('all');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // Default catalogs when specific category items are absent
  const DEFAULT_MAIN_SERVICES: WashService[] = [
    {
      id: 'default_wash_standard',
      name: 'Standard Car Wash & Vacuum',
      price: 15.00,
      duration: 45,
      type: 'service',
      description: 'Complete exterior water jet wash with high foam shampoo, tire shine, and interior deep vacuum cleaning.'
    },
    {
      id: 'default_wash_express',
      name: 'Express Jet Wash & Towel Dry',
      price: 10.00,
      duration: 20,
      type: 'service',
      description: 'Fast exterior water jet wash with soft microfiber hand dry. Ideal for a quick clean on the go.'
    },
    {
      id: 'default_wash_deluxe',
      name: 'Deluxe Foam Wash, Wax & Tyre Shine',
      price: 25.00,
      duration: 60,
      type: 'service',
      description: 'Full exterior foam wash, spray wax protection, deep interior vacuum, dashboard wipe, and premium tyre shine.'
    },
    {
      id: 'default_wash_ceramic',
      name: 'Premium Ceramic Coating & Deep Detailing',
      price: 45.00,
      duration: 90,
      type: 'service',
      description: 'Ultimate hand wash detailing with clay bar decontamination, hydrophobic ceramic spray sealant, and engine bay wipe.'
    }
  ];

  const DEFAULT_ADDONS: WashService[] = [
    {
      id: 'default_addon_headlight',
      name: 'Headlight Polish & Lens Restoration',
      price: 15.00,
      duration: 15,
      type: 'addon',
      description: 'Professional headlight lens clarity restoration removing yellowing, cloudiness and hazing.'
    },
    {
      id: 'default_addon_tyre',
      name: 'Tyre Shine & Hydrophobic Rim Coating',
      price: 5.00,
      duration: 10,
      type: 'addon',
      description: 'Deep glossy tyre dressing and protective hydrophobic rim shine coat.'
    },
    {
      id: 'default_addon_windscreen',
      name: 'Windscreen Rain-Repellent Treatment',
      price: 8.00,
      duration: 10,
      type: 'addon',
      description: 'Hydrophobic glass coating that repels rain drops and improves driving visibility in heavy downpours.'
    },
    {
      id: 'default_addon_steam',
      name: 'Interior Steam Sanitization & Deodorizer',
      price: 12.00,
      duration: 20,
      type: 'addon',
      description: 'High-temperature steam treatment targeting AC vents, seats and carpets to eliminate bacteria and odors.'
    },
    {
      id: 'default_addon_engine',
      name: 'Engine Bay Degreasing & Dressing',
      price: 20.00,
      duration: 25,
      type: 'addon',
      description: 'Safe engine compartment degreasing and protective rubber/plastic dressing for a show-room shine.'
    }
  ];

  const DEFAULT_PRODUCTS: WashService[] = [
    {
      id: 'default_product_microfiber',
      name: 'Microfiber Detailing Towel Pack (3-pc)',
      price: 6.00,
      duration: 0,
      type: 'product',
      description: 'Ultra-soft 400GSM plush microfiber towels for scratch-free drying and interior wiping.'
    },
    {
      id: 'default_product_shampoo',
      name: 'PH-Neutral Auto Wash Shampoo 500ml',
      price: 12.00,
      duration: 0,
      type: 'product',
      description: 'Concentrated high-foaming car wash soap safe for wax and ceramic coatings.'
    },
    {
      id: 'default_product_ceramic_spray',
      name: 'Hydrophobic Ceramic Guard Spray 300ml',
      price: 18.00,
      duration: 0,
      type: 'product',
      description: 'Easy spray-on ceramic sealant providing 3 months of gloss and extreme water beading.'
    },
    {
      id: 'default_product_freshener',
      name: 'Luxury Air Freshener Vent Clip',
      price: 4.00,
      duration: 0,
      type: 'product',
      description: 'Long-lasting premium fragrance vent clip for fresh interior scent.'
    }
  ];

  // Helper to resolve location services catalog, ensuring main services, add-ons, and products are all available
  const getCatalogForLocation = (loc: CarWash) => {
    const customItems = Array.isArray(loc.services) ? loc.services : [];
    if (customItems.length === 0) {
      return [...DEFAULT_MAIN_SERVICES, ...DEFAULT_ADDONS, ...DEFAULT_PRODUCTS];
    }

    const hasService = customItems.some((i: any) => !i.type || i.type === 'service');
    const hasAddon = customItems.some((i: any) => i.type === 'addon');
    const hasProduct = customItems.some((i: any) => i.type === 'product');

    const result = [...customItems];
    if (!hasService) result.push(...DEFAULT_MAIN_SERVICES);
    if (!hasAddon) result.push(...DEFAULT_ADDONS);
    if (!hasProduct) result.push(...DEFAULT_PRODUCTS);

    return result;
  };

  const catalog = getCatalogForLocation(location);

  // Auto-select first main service on modal open if nothing selected yet
  useEffect(() => {
    if (isOpen && location) {
      const items = getCatalogForLocation(location);
      if (selectedItems.length === 0 && items.length > 0) {
        const firstWash = items.find((i: any) => !i.type || i.type === 'service') || items[0];
        if (firstWash) {
          setSelectedItems([firstWash]);
        }
      }
    }
  }, [isOpen, location]);

  // Computed summary for selected multi-items
  const totalSelectedPrice = selectedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalSelectedDuration = selectedItems.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
  const combinedServiceName = selectedItems
    .map((item) => item.name + (item.type === 'addon' ? ' (Add-on)' : item.type === 'product' ? ' (Product)' : ''))
    .join(' + ');
  const combinedServiceId = selectedItems.map((item) => item.id).join(',');

  const toggleItemSelection = (item: any) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
    setErrorMessage(null);
  };
  
  // Date & Time states
  const [bookingDate, setBookingDate] = useState(() => getTodayDateString());
  const [availableSlots, setAvailableSlots] = useState<TimeSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Review & Payment states
  const [notes, setNotes] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // GPS Map modal state
  const [showMapModal, setShowMapModal] = useState(false);
  const [userLat, setUserLat] = useState<number>(location.locationLat);
  const [userLng, setUserLng] = useState<number>(location.locationLng);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // Check if location has bank transfer configured
  const checkHasBankTransfer = (carWash: CarWash | null | undefined): boolean => {
    if (!carWash) return false;
    const isBibd = carWash.bibdEnabled === true || Boolean(carWash.bibdAccountNo && carWash.bibdAccountNo.trim().length > 0);
    const isBaiduri = carWash.baiduriEnabled === true || Boolean(carWash.baiduriAccountNo && carWash.baiduriAccountNo.trim().length > 0);
    const isCustom = Array.isArray(carWash.customPaymentMethods) && carWash.customPaymentMethods.some(m => m.isEnabled);
    return isBibd || isBaiduri || isCustom;
  };

  const isBankAvailable = checkHasBankTransfer(location);

  // Set default payment method to 'cash' (Pay at Counter) as requested
  useEffect(() => {
    setPaymentMethod('cash');
  }, [location]);

  // Fetch time slots when location or date changes
  const fetchAvailableSlots = async (dateStr: string) => {
    setIsLoadingSlots(true);
    try {
      const res = await fetch(`/api/bookings/available-slots?carWashId=${location.id}&date=${dateStr}`);
      if (res.ok) {
        const slots: TimeSlotItem[] = await res.json();
        setAvailableSlots(slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Failed to fetch available time slots:', err);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (isOpen && location) {
      fetchAvailableSlots(bookingDate);
    }
  }, [isOpen, location, bookingDate]);

  if (!isOpen) return null;

  // Determine break closure info for selected date
  const getBreakInfo = () => {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dObj = new Date(bookingDate + 'T00:00:00');
    const dayName = daysOfWeek[dObj.getDay()] as keyof typeof location.openingHours;
    const sched = location.openingHours?.[dayName] as any;
    if (sched && sched.hasBreak && sched.breakStart && sched.breakEnd) {
      return {
        day: dayName,
        start: sched.breakStart,
        end: sched.breakEnd
      };
    }
    return null;
  };

  const breakInfo = getBreakInfo();

  // Handle final booking submission
  const handleSubmitBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!user || !token) {
      setErrorMessage('You must be signed in to confirm a booking. Please log in first.');
      showNotification('Please log in to book an appointment.', 'error');
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Please select an available time slot before submitting.');
      return;
    }

    if (!vehicleInfo || !vehicleInfo.trim()) {
      setErrorMessage('Vehicle plate number is compulsory to confirm your booking.');
      return;
    }

    /* Commented out bank transfer flow - using Pay at Counter
    if (paymentMethod === 'bank') {
      setShowPaymentModal(true);
      return;
    }
    */

    const fullNotes = [vehicleInfo ? `Vehicle Plate: ${vehicleInfo.trim()}` : '', notes].filter(Boolean).join(' | ');

    setIsSubmitting(true);
    try {
      const res = await createBooking(
        location.id,
        bookingDate,
        selectedSlot,
        fullNotes,
        combinedServiceId || undefined,
        combinedServiceName || 'Standard Car Wash',
        totalSelectedPrice || 15.00
      );

      if (res.success) {
        const bookingData = {
          locationName: location.name,
          locationAddress: location.address,
          locationPhone: location.phone || '',
          date: bookingDate,
          timeSlot: selectedSlot,
          notes: fullNotes,
          serviceName: combinedServiceName || 'Standard Car Wash',
          price: totalSelectedPrice || 15.00,
        };
        setSuccessBooking(bookingData);
        onBookingSuccess(bookingData);
      } else {
        setErrorMessage(res.error || 'Failed to create booking. Please try selecting another slot.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while processing your booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedServiceId(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* TOP HEADER & NAVIGATION BAR */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {currentStep > 1 && !successBooking && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentStep((prev) => (prev - 1) as any);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                title="Go to previous step"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <img src={location.logoUrl || autoshineLogo} alt={location.name} className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/20 shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white line-clamp-1">{location.name}</h3>
              <p className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-md">{location.address}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold border border-slate-700"
            title="Exit booking modal"
          >
            <span>Exit</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS BREADCRUMB - INTERACTIVE */}
        {!successBooking && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setCurrentStep(1);
              }}
              className={`flex items-center gap-1.5 transition-all cursor-pointer hover:text-sky-600 ${currentStep === 1 ? 'text-sky-600 font-black' : currentStep > 1 ? 'text-emerald-600' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-extrabold ${currentStep === 1 ? 'bg-sky-600 text-white' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 1 ? '✓' : '1'}
              </span>
              <span>1. Services & Add-ons</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => {
                if (selectedItems.length > 0) {
                  setErrorMessage(null);
                  setCurrentStep(2);
                }
              }}
              className={`flex items-center gap-1.5 transition-all ${selectedItems.length > 0 ? 'cursor-pointer hover:text-sky-600' : 'cursor-not-allowed opacity-50'} ${currentStep === 2 ? 'text-sky-600 font-black' : currentStep > 2 ? 'text-emerald-600' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-extrabold ${currentStep === 2 ? 'bg-sky-600 text-white' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 2 ? '✓' : '2'}
              </span>
              <span>2. Date & Time</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

            <button
              type="button"
              disabled={selectedItems.length === 0 || !selectedSlot}
              onClick={() => {
                if (selectedItems.length > 0 && selectedSlot) {
                  setErrorMessage(null);
                  setCurrentStep(3);
                }
              }}
              className={`flex items-center gap-1.5 transition-all ${selectedItems.length > 0 && selectedSlot ? 'cursor-pointer hover:text-sky-600' : 'cursor-not-allowed opacity-50'} ${currentStep === 3 ? 'text-sky-600 font-black' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-extrabold ${currentStep === 3 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                3
              </span>
              <span>3. Review & Book</span>
            </button>
          </div>
        )}

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* SUCCESS BOOKING SCREEN */}
          {successBooking ? (
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Appointment Confirmed
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-2">Your Booking is Confirmed!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  We look forward to serving you at {successBooking.locationName}. Please arrive 5 minutes before your time slot.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 max-w-md mx-auto text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Car Wash Place:</span>
                  <span className="font-extrabold text-slate-800">{successBooking.locationName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Selected Service:</span>
                  <span className="font-extrabold text-slate-800">{successBooking.serviceName || 'Standard Car Wash'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Date & Time:</span>
                  <span className="font-extrabold text-sky-600">{successBooking.date} @ {successBooking.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Total Amount:</span>
                  <span className="font-black text-slate-800 text-sm">BND ${(successBooking.price || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
                <a
                  href={`https://wa.me/${(successBooking.locationPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hi ${successBooking.locationName}, I have booked an appointment for ${successBooking.serviceName} on ${successBooking.date} at ${successBooking.timeSlot}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Car Wash on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close & View Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: SERVICE & ADD-ON SELECTION (MULTI-SELECT SUPPORTED) */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-500" />
                        Step 1: Choose Wash Services & Add-ons
                      </h2>
                      <p className="text-xs text-slate-400">You can select a main wash service plus optional add-ons (e.g. headlight polish, tyre wax)</p>
                    </div>

                    <div className="flex border border-slate-200 p-0.5 rounded-xl bg-slate-100 shrink-0 text-xs font-bold overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('all')}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          itemTabFilter === 'all' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span>All</span>
                        <span className="text-[9px] bg-slate-200 px-1 rounded-full">{catalog.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('service')}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          itemTabFilter === 'service' ? 'bg-white text-sky-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span>Main Services</span>
                        <span className="text-[9px] bg-slate-200 px-1 rounded-full">
                          {catalog.filter((i: any) => !i.type || i.type === 'service').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('addon')}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          itemTabFilter === 'addon' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span>Add-ons & Extras</span>
                        <span className="text-[9px] bg-slate-200 px-1 rounded-full">
                          {catalog.filter((i: any) => i.type === 'addon').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('product')}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          itemTabFilter === 'product' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span>Products</span>
                        <span className="text-[9px] bg-slate-200 px-1 rounded-full">
                          {catalog.filter((i: any) => i.type === 'product').length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Services / Add-ons / Items list */}
                  <div className="space-y-3">
                    {(() => {
                      const filtered = catalog.filter((svc: any) => {
                        if (itemTabFilter === 'all') return true;
                        if (itemTabFilter === 'service') return !svc.type || svc.type === 'service';
                        if (itemTabFilter === 'addon') return svc.type === 'addon';
                        if (itemTabFilter === 'product') return svc.type === 'product';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                            No items available in this category.
                          </div>
                        );
                      }

                      return filtered.map((svc: any) => {
                        const isSelected = selectedItems.some((i) => i.id === svc.id);
                        const isExpanded = expandedServiceId === svc.id;
                        const isProduct = svc.type === 'product';
                        const isAddon = svc.type === 'addon';
                        const isAvailable = svc.isAvailable !== false;

                        return (
                          <div
                            key={svc.id}
                            onClick={() => {
                              if (isAvailable) toggleItemSelection(svc);
                            }}
                            className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${
                              !isAvailable
                                ? 'opacity-60 bg-slate-50/50 border-slate-100 cursor-not-allowed'
                                : isSelected
                                ? 'border-sky-500 ring-2 ring-sky-100 bg-sky-50/30 shadow-sm'
                                : 'border-slate-200 hover:border-sky-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Checkbox Indicator */}
                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">{svc.name}</h4>
                                    
                                    {/* Type badge */}
                                    {isProduct ? (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                        Product
                                      </span>
                                    ) : isAddon ? (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                        Add-on
                                      </span>
                                    ) : (
                                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                                        Main Wash
                                      </span>
                                    )}

                                    {svc.vehicleType && svc.vehicleType !== 'N/A' && svc.vehicleType !== 'All' && (
                                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                        {svc.vehicleType}
                                      </span>
                                    )}

                                    {!isAvailable && (
                                      <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                        {isProduct ? 'Out of Stock' : 'Unavailable'}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    {!isProduct ? (
                                      <span className="flex items-center gap-1 font-semibold text-slate-600">
                                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                                        {svc.duration || 30} mins
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 font-bold">Physical Retail Product</span>
                                    )}

                                    {/* Expand details trigger button */}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleExpand(svc.id, e)}
                                      className="text-sky-600 hover:text-sky-700 font-bold text-xs flex items-center gap-0.5 ml-auto sm:ml-0 underline decoration-sky-300 underline-offset-2 cursor-pointer"
                                    >
                                      {isExpanded ? 'Hide Info' : 'Info'}
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0 gap-2">
                                <span className="font-black text-sky-600 text-base sm:text-lg">
                                  BND ${(svc.price || 0).toFixed(2)}
                                </span>

                                <button
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAvailable) toggleItemSelection(svc);
                                  }}
                                  className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? 'bg-sky-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-800'
                                  }`}
                                >
                                  <span>{isSelected ? '✓ Added' : '+ Add'}</span>
                                </button>
                              </div>
                            </div>

                            {/* EXPANDABLE DETAILS ACCORDION */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/80 rounded-xl p-3 space-y-2 animate-fade-in">
                                <div className="flex items-start gap-2">
                                  <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-bold text-slate-800 mb-0.5">Package Details & Features:</p>
                                    <p className="text-slate-600 leading-relaxed">
                                      {svc.description || 'High quality car wash service delivered by experienced detailing staff.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* BOTTOM STICKY SELECTION SUMMARY & PROCEED BUTTON */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-sky-400 tracking-wider">
                          {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'} Selected
                        </span>
                        {totalSelectedDuration > 0 && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-400" />
                            ~{totalSelectedDuration} min total
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-medium">
                        {selectedItems.length > 0 ? combinedServiceName : 'Please select at least one wash service or add-on.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
                        <span className="font-black text-white text-base font-mono">BND ${totalSelectedPrice.toFixed(2)}</span>
                      </div>

                      <button
                        type="button"
                        disabled={selectedItems.length === 0}
                        onClick={() => {
                          setErrorMessage(null);
                          setCurrentStep(2);
                        }}
                        className="w-full sm:w-auto px-5 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Schedule Appointment (${totalSelectedPrice.toFixed(2)})</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DATE & TIME SLOT SELECTION */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fade-in">
                  {/* Selected items summary chip */}
                  {selectedItems.length > 0 && (
                    <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="bg-sky-500 text-white p-2 rounded-xl shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider block">Selected Package & Add-ons ({selectedItems.length})</span>
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm line-clamp-1">{combinedServiceName}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3 shrink-0">
                        <span className="font-black text-sky-700 text-sm sm:text-base font-mono">BND ${totalSelectedPrice.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setCurrentStep(1);
                          }}
                          className="px-2.5 py-1 bg-white border border-sky-200 hover:border-sky-400 text-[11px] text-sky-700 rounded-lg font-bold shadow-2xs cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>1. Select Appointment Date</span>
                      <span className="text-[11px] text-sky-600 font-bold">Local Brunei Time (UTC+8)</span>
                    </label>

                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        min={getTodayDateString()}
                        value={bookingDate}
                        onChange={(e) => {
                          setBookingDate(e.target.value);
                          setSelectedSlot(null);
                          setErrorMessage(null);
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm font-bold bg-white transition-all"
                      />
                    </div>

                    {breakInfo && (
                      <div className="text-xs bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 mt-2">
                        <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          Notice: Scheduled closure break on <strong className="capitalize">{breakInfo.day}</strong> from <strong>{breakInfo.start}</strong> to <strong>{breakInfo.end}</strong>. These slots are closed.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Time Slot Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                        2. Choose Available Time Slot
                      </label>

                      {/* Map GPS Shortcut button */}
                      <button
                        type="button"
                        onClick={() => setShowMapModal(true)}
                        className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-sky-500" />
                        View Location Map
                      </button>
                    </div>

                    {isLoadingSlots ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                        <span>Fetching real-time available time slots...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 space-y-1">
                        <Clock className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                        <p className="font-bold text-slate-700">No slots available for this date</p>
                        <p className="text-slate-400">Please select another date on the calendar above.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot.timeSlot;
                          const isFullyBooked = !slot.isAvailable && slot.bookedCount >= slot.capacity;

                          return (
                            <button
                              type="button"
                              key={slot.timeSlot}
                              disabled={!slot.isAvailable}
                              onClick={() => {
                                if (slot.isAvailable) {
                                  setSelectedSlot(slot.timeSlot);
                                  setErrorMessage(null);
                                }
                              }}
                              className={`p-3.5 rounded-2xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[62px] ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-200 shadow-md scale-102 cursor-pointer'
                                  : slot.isAvailable
                                  ? 'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 shadow-2xs cursor-pointer'
                                  : 'bg-slate-100/80 text-slate-400 border-slate-200/80 cursor-not-allowed opacity-80'
                              }`}
                            >
                              <span className={`text-sm font-black ${!slot.isAvailable ? 'line-through text-slate-400' : ''}`}>
                                {slot.timeSlot}
                              </span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-sky-500 text-white'
                                  : slot.isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}>
                                {slot.isAvailable 
                                  ? `Available (${slot.capacity - slot.bookedCount}/${slot.capacity})` 
                                  : isFullyBooked 
                                  ? `Fully Booked (${slot.bookedCount}/${slot.capacity})` 
                                  : 'Unavailable'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons (Stacked Mobile-First Layout) */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!selectedSlot}
                      onClick={() => {
                        setErrorMessage(null);
                        setCurrentStep(3);
                      }}
                      className="w-full py-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Review & Book</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setCurrentStep(1);
                      }}
                      className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Services</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & CONFIRM BOOKING */}
              {currentStep === 3 && (
                <form onSubmit={handleSubmitBooking} className="space-y-5 animate-fade-in">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-500" />
                        Appointment Summary
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setCurrentStep(2);
                        }}
                        className="text-[11px] text-sky-600 hover:underline font-bold"
                      >
                        Change Date/Time
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Location</span>
                        <span className="text-slate-800 font-extrabold text-sm">{location.name}</span>
                        <span className="text-slate-400 text-xs block truncate">{location.address}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Date & Time Slot</span>
                        <span className="text-sky-600 font-black text-sm">{bookingDate} @ {selectedSlot}</span>
                        <span className="text-slate-500 text-[11px] block mt-0.5">Est. Total Duration: ~{totalSelectedDuration} mins</span>
                      </div>
                    </div>

                    {/* Breakdown of selected items */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                          Selected Items ({selectedItems.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setCurrentStep(1);
                          }}
                          className="text-[10px] text-sky-600 font-bold hover:underline"
                        >
                          Edit Items
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {selectedItems.map((item) => (
                          <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                item.type === 'product' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : item.type === 'addon' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                              }`}>
                                {item.type === 'product' ? 'Product' : item.type === 'addon' ? 'Add-on' : 'Main'}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{item.name}</span>
                              {item.duration > 0 && <span className="text-slate-400 text-[10px] shrink-0">({item.duration}m)</span>}
                            </div>
                            <span className="font-black text-slate-900 font-mono shrink-0">BND ${(Number(item.price) || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-black">
                        <span className="text-slate-700 uppercase tracking-wider text-[10px]">Total Amount Payable:</span>
                        <span className="text-sky-600 text-sm font-mono">BND ${totalSelectedPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Details & Customer Notes */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        Vehicle Plate Number <span className="text-red-500 font-bold text-sm">*</span>
                      </span>
                      <span className="text-[10px] text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        Compulsory
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Vehicle Plate Number (e.g. BA1234 or K1234)"
                          value={vehicleInfo}
                          onChange={(e) => setVehicleInfo(e.target.value)}
                          className={`w-full px-3.5 py-2.5 border rounded-xl outline-none text-slate-800 text-xs transition-all bg-white font-mono font-bold uppercase ${
                            !vehicleInfo.trim() && errorMessage ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 focus:border-sky-500'
                          }`}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Special instructions or requests (Optional)..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Payment Method</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Pay at Counter</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className="p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-100"
                      >
                        <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                            Pay at Counter
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-black">
                              Pay On Arrival
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-500 block">Pay cash or local QR when dropping off your vehicle on-site</span>
                        </div>
                      </button>

                      {/* Bank Transfer option commented out for now as requested
                      <button
                        type="button"
                        disabled={!isBankAvailable}
                        onClick={() => {
                          if (isBankAvailable) {
                            setPaymentMethod('bank');
                          }
                        }}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          !isBankAvailable
                            ? 'border-slate-200 bg-slate-100/70 text-slate-400 opacity-60 cursor-not-allowed'
                            : paymentMethod === 'bank'
                            ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-100 cursor-pointer'
                            : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${isBankAvailable ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-400'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-xs block flex items-center gap-1.5 flex-wrap">
                            Bank Transfer
                            {!isBankAvailable && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                                Unavailable
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {isBankAvailable ? 'Instant receipt upload' : 'Not configured for this car wash'}
                          </span>
                        </div>
                      </button>
                      */}
                    </div>
                  </div>

                  {/* INLINE ERROR DISPLAY */}
                  {errorMessage && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">{errorMessage}</div>
                    </div>
                  )}

                  {/* Navigation & Submit Buttons (Stacked Mobile-First Layout) */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Appointment...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Confirm & Book Appointment</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setErrorMessage(null);
                        setCurrentStep(2);
                      }}
                      className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Date & Time</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>
      </div>

      {/* GPS MAP MODAL SUB-VIEW */}
      {showMapModal && (
        <div className="fixed inset-0 z-60 bg-slate-950 flex flex-col animate-fade-in">
          <div className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="font-extrabold text-xs">{location.name}</h3>
                <p className="text-[10px] text-slate-400">Interactive Location GPS Map</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 relative bg-slate-900">
            <MapSimulation
              locations={[location]}
              selectedLocationId={location.id}
              onLocationSelect={() => {}}
              radiusKm={radiusKm}
              onRadiusChange={(r) => setRadiusKm(r)}
              userLat={userLat}
              userLng={userLng}
              onUserLocationChange={(lat, lng) => {
                setUserLat(lat);
                setUserLng(lng);
              }}
            />
          </div>

          <div className="bg-slate-900 p-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer text-center"
            >
              Back to Appointment
            </button>
          </div>
        </div>
      )}

      {/* BANK TRANSFER PAYMENT MODAL */}
      {showPaymentModal && selectedSlot && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <LocalPaymentForm
            carWash={location}
            date={bookingDate}
            timeSlot={selectedSlot}
            notes={[vehicleInfo ? `Vehicle: ${vehicleInfo}` : '', notes].filter(Boolean).join(' | ')}
            token={token}
            serviceId={combinedServiceId}
            serviceName={combinedServiceName}
            price={totalSelectedPrice}
            onSuccess={(data) => {
              setShowPaymentModal(false);
              const bookingData = {
                locationName: location.name,
                locationAddress: location.address,
                locationPhone: location.phone || '',
                date: bookingDate,
                timeSlot: selectedSlot,
                notes: notes,
                serviceName: combinedServiceName,
                price: totalSelectedPrice,
                txnRef: data.txnReference || ''
              };
              setSuccessBooking(bookingData);
              onBookingSuccess(bookingData);
            }}
            onCancel={() => setShowPaymentModal(false)}
          />
        </div>
      )}
    </div>
  );
};

