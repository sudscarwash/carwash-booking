/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import { LocalPaymentForm } from '../components/LocalPaymentForm.js';
import { Search, Calendar, Clock, MapPin, History, CheckCircle, AlertTriangle, X, ChevronRight, Sliders, Info, Sparkles, Navigation, User, Edit3, Check, Instagram, Landmark } from 'lucide-react';
import { CarWash, Booking, BookingStatus } from '../types.js';

interface TimeSlotItem {
  timeSlot: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
}

export const CustomerDashboard: React.FC = () => {
  const {
    user,
    token,
    locations,
    bookings,
    fetchLocations,
    createBooking,
    updateBookingStatus,
    rescheduleBooking,
    updateProfile,
    loading
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<CarWash | null>(null);
  const [bookingDate, setBookingDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditDob(user.dateOfBirth || '');
      setEditGender(user.gender || '');
      setEditPhoto(user.profileImageUrl || '');
      setEditAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    if (selectedLocation) {
      if (selectedLocation.paymentPolicy === 'PRE_PAYMENT') {
        setPaymentMethod('bank');
      } else {
        setPaymentMethod('cash');
      }
    }
  }, [selectedLocation]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const success = await updateProfile({
      name: editName,
      phone: editPhone || undefined,
      dateOfBirth: editDob || undefined,
      gender: editGender || undefined,
      profileImageUrl: editPhoto || undefined,
      address: editAddress || undefined,
    });
    if (success) {
      setIsEditingProfile(false);
    }
    setIsSavingProfile(false);
  };

  // Filter settings
  const [userLat, setUserLat] = useState(37.7749); // SF center
  const [userLng, setUserLng] = useState(-122.4194);
  const [radiusKm, setRadiusKm] = useState(12);
  const [viewAllLocations, setViewAllLocations] = useState(true);

  // Bottom Mobile Navigation and Product Selection states
  const [activeTab, setActiveTab] = useState<'book' | 'bookings' | 'profile'>('book');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [itemTabFilter, setItemTabFilter] = useState<'service' | 'product'>('service');
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);
  const [showFullScreenDate, setShowFullScreenDate] = useState(false);

  // Rescheduling modal state
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlotItem[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string | null>(null);

  // Cancellation inline confirm state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Success overlay state for booking completion & WhatsApp notification
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBookedInfo, setLastBookedInfo] = useState<any | null>(null);
  const [customWhatsAppPhone, setCustomWhatsAppPhone] = useState('');

  const getSelectedDayBreakInfo = () => {
    if (!selectedLocation || !bookingDate) return null;
    try {
      const dateObj = new Date(bookingDate + 'T00:00:00');
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = daysOfWeek[dateObj.getDay()] as keyof typeof selectedLocation.openingHours;
      const daySched = selectedLocation.openingHours[dayName];
      if (
        daySched &&
        daySched.isOpen &&
        (daySched as any).hasBreak &&
        (daySched as any).breakStart &&
        (daySched as any).breakEnd
      ) {
        return {
          day: dayName,
          start: (daySched as any).breakStart,
          end: (daySched as any).breakEnd,
        };
      }
    } catch (e) {
      // Ignored
    }
    return null;
  };

  const getRescheduleDayBreakInfo = () => {
    if (!reschedulingBooking || !rescheduleDate) return null;
    try {
      const selectedLoc = locations.find(l => l.id === reschedulingBooking.carWashId);
      if (!selectedLoc) return null;
      const dateObj = new Date(rescheduleDate + 'T00:00:00');
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = daysOfWeek[dateObj.getDay()] as keyof typeof selectedLoc.openingHours;
      const daySched = selectedLoc.openingHours[dayName];
      if (
        daySched &&
        daySched.isOpen &&
        (daySched as any).hasBreak &&
        (daySched as any).breakStart &&
        (daySched as any).breakEnd
      ) {
        return {
          day: dayName,
          start: (daySched as any).breakStart,
          end: (daySched as any).breakEnd,
        };
      }
    } catch (e) {
      // Ignored
    }
    return null;
  };

  const breakInfo = getSelectedDayBreakInfo();
  const rescheduleBreakInfo = getRescheduleDayBreakInfo();

  // Automatically center user on the first business location or default to Brunei
  useEffect(() => {
    if (userLat === 37.7749 && userLng === -122.4194) {
      if (locations.length > 0) {
        setUserLat(locations[0].locationLat);
        setUserLng(locations[0].locationLng);
      } else {
        // Default to Bandar Seri Begawan center
        setUserLat(4.8917);
        setUserLng(114.9401);
      }
    }
  }, [locations]);

  // Trigger search when search text, user coordinates, or GPS radius filters change
  useEffect(() => {
    if (viewAllLocations) {
      fetchLocations(search);
    } else {
      fetchLocations(search, userLat, userLng, radiusKm);
    }
  }, [search, userLat, userLng, radiusKm, viewAllLocations]);

  // Load available slots dynamically when location or date selection changes
  useEffect(() => {
    if (selectedLocation && bookingDate) {
      fetchAvailableSlots(selectedLocation.id, bookingDate, setAvailableSlots);
    }
  }, [selectedLocation, bookingDate]);

  // Load slots for reschedule when reschedule date changes
  useEffect(() => {
    if (reschedulingBooking && rescheduleDate) {
      fetchAvailableSlots(reschedulingBooking.carWashId, rescheduleDate, setRescheduleSlots);
    }
  }, [reschedulingBooking, rescheduleDate]);

  const fetchAvailableSlots = async (
    carWashId: string,
    date: string,
    setSlotsFn: React.Dispatch<React.SetStateAction<TimeSlotItem[]>>
  ) => {
    try {
      const res = await fetch(`/api/bookings/available-slots?carWashId=${carWashId}&date=${date}`);
      if (res.ok) {
        const slots = await res.json();
        setSlotsFn(slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !selectedSlot) return;

    // If local bank payment is selected, trigger the secure payment form modal instead of instant cash booking
    if (paymentMethod === 'bank') {
      setShowPaymentModal(true);
      return;
    }

    setIsSubmitting(true);
    const success = await createBooking(
      selectedLocation.id,
      bookingDate,
      selectedSlot,
      notes,
      selectedService?.id,
      selectedService?.name,
      selectedService?.price
    );
    setIsSubmitting(false);

    if (success) {
      // Record booked info for WhatsApp and success dialog
      setLastBookedInfo({
        locationName: selectedLocation.name,
        locationAddress: selectedLocation.address,
        locationPhone: selectedLocation.phone || '',
        date: bookingDate,
        timeSlot: selectedSlot,
        notes: notes,
        serviceName: selectedService?.name,
        price: selectedService?.price,
      });
      setCustomWhatsAppPhone(selectedLocation.phone || '');
      setShowSuccessModal(true);

      // Clear forms
      setSelectedSlot(null);
      setNotes('');
      // Reload slots
      fetchAvailableSlots(selectedLocation.id, bookingDate, setAvailableSlots);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking || !selectedRescheduleSlot) return;

    setIsSubmitting(true);
    const success = await rescheduleBooking(reschedulingBooking.id, rescheduleDate, selectedRescheduleSlot);
    setIsSubmitting(false);

    if (success) {
      setReschedulingBooking(null);
      setSelectedRescheduleSlot(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    await updateBookingStatus(bookingId, BookingStatus.CANCELLED, 'Cancelled by customer self-service');
  };

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.COMPLETED:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case BookingStatus.IN_PROGRESS:
        return 'bg-sky-100 text-sky-800 border-sky-200 animate-pulse';
      case BookingStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case BookingStatus.REJECTED:
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="animate-fade-in pb-24 px-4 max-w-4xl mx-auto space-y-6 pt-4">
      {/* 📱 Sticky Bottom Mobile/Desktop Subjects Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-4 py-2.5 flex items-center justify-around sm:justify-center sm:gap-12 md:gap-16">
        <button
          onClick={() => {
            setActiveTab('book');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'book'
              ? 'text-sky-600 font-extrabold scale-110'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-nav-book"
        >
          <Search className="w-5.5 h-5.5" />
          <span className="text-[10px]">Find & Book</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bookings');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'bookings'
              ? 'text-sky-600 font-extrabold scale-110'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-nav-bookings"
        >
          <History className="w-5.5 h-5.5" />
          {bookings.filter(b => b.status === BookingStatus.PENDING).length > 0 && (
            <span className="absolute top-1 right-5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
          <span className="text-[10px]">My Bookings</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-sky-600 font-extrabold scale-110'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-nav-profile"
        >
          <User className="w-5.5 h-5.5" />
          <span className="text-[10px]">My Profile</span>
        </button>
      </div>

      {/* TABS WORKSPACE */}
      {activeTab === 'book' && (
        <div className="space-y-6">
          {/* Unified Place & Product Selection Title / Hero */}
          <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400 rounded-3xl p-6 text-white shadow-md">
            <span className="bg-sky-500/30 text-sky-100 text-[10px] font-extrabold px-3 py-1 rounded-full border border-white/20 uppercase tracking-widest">
              Quick Car Care Booking
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-white">
              Choose a location, select your service, and select date/time.
            </h1>
            <p className="text-xs text-sky-100 mt-1">
              Optimized for fast mobile booking with full-screen interactive maps and schedules.
            </p>
          </div>

          {/* Location / Place Selection List */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Step 1: Select Car Wash Place
                </h2>
                <p className="text-xs text-slate-400">Choose one of the car wash centers below</p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by name, district, or service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                />
              </div>
            </div>

            {/* Places Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations.filter(loc => 
                loc.name.toLowerCase().includes(search.toLowerCase()) || 
                loc.address.toLowerCase().includes(search.toLowerCase()) ||
                (loc.services && loc.services.some(s => s.name.toLowerCase().includes(search.toLowerCase())))
              ).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 sm:col-span-2">
                  <MapPin className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                  <p className="font-semibold text-xs">No car wash locations found.</p>
                </div>
              ) : (
                locations.filter(loc => 
                  loc.name.toLowerCase().includes(search.toLowerCase()) || 
                  loc.address.toLowerCase().includes(search.toLowerCase()) ||
                  (loc.services && loc.services.some(s => s.name.toLowerCase().includes(search.toLowerCase())))
                ).map((loc) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocation(loc);
                        // Reset slot and service if switched location
                        if (selectedLocation?.id !== loc.id) {
                          setSelectedService(null);
                          setSelectedSlot(null);
                        }
                        setUserLat(loc.locationLat);
                        setUserLng(loc.locationLng);
                        setTimeout(() => {
                          document.getElementById('booking-step-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className={`bg-white border rounded-2xl p-4 transition-all duration-200 cursor-pointer flex gap-3 items-center ${
                        isSelected
                          ? 'border-sky-500 ring-2 ring-sky-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-sky-500'
                      }`}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{loc.name}</h3>
                        <p className="text-slate-400 text-xs truncate">{loc.address}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-sky-500 rotate-90' : 'text-slate-300'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Place Detail + Service Selection */}
          {selectedLocation && (
            <div id="booking-step-2" className="space-y-6 bg-slate-50 border border-slate-100 p-4 sm:p-6 rounded-2xl animate-fade-in">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Car Wash</h3>
                  <h2 className="text-base font-extrabold text-slate-800">{selectedLocation.name}</h2>
                  <p className="text-xs text-slate-400">{selectedLocation.address}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedLocation(null);
                    setSelectedService(null);
                    setSelectedSlot(null);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step 2: Product / Service Selection */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                      Step 2: Select Wash Service or Product
                    </h2>
                    <p className="text-xs text-slate-400">Choose an available wash service or retail product</p>
                  </div>

                  {/* Dynamic Tabs: Only show if there's at least one product configured */}
                  {selectedLocation.services && selectedLocation.services.some((s: any) => s.type === 'product') && (
                    <div className="flex border border-slate-200 p-0.5 rounded-lg bg-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('service')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                          itemTabFilter === 'service'
                            ? 'bg-white text-sky-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Services
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemTabFilter('product')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                          itemTabFilter === 'product'
                            ? 'bg-white text-sky-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Products & Items
                      </button>
                    </div>
                  )}
                </div>

                {/* Services/Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!selectedLocation.services || selectedLocation.services.length === 0 ? (
                    /* Fallback default wash service if none is configured */
                    <div
                      onClick={() => {
                        setSelectedService({
                          id: 'default_wash',
                          name: 'Standard Car Wash & Vacuum',
                          price: 15.00,
                          duration: 45,
                          description: 'Complete exterior water jet wash with high foam shampoo, tire shine, and interior deep vacuum cleaning.'
                        });
                        setTimeout(() => {
                          document.getElementById('booking-step-3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                      className={`bg-white border rounded-2xl p-4 transition-all duration-200 cursor-pointer flex justify-between items-center ${
                        selectedService?.id === 'default_wash'
                          ? 'border-sky-500 ring-2 ring-sky-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Standard Car Wash & Vacuum</h4>
                        <p className="text-xs text-slate-400">Duration: 45 mins</p>
                        <p className="text-slate-500 text-xs mt-1">Complete exterior wash and interior vacuum</p>
                      </div>
                      <span className="font-extrabold text-sky-600 text-sm shrink-0">BND $15.00</span>
                    </div>
                  ) : (
                    (() => {
                      // Filter based on tab selection
                      const hasProducts = selectedLocation.services.some((s: any) => s.type === 'product');
                      const filtered = selectedLocation.services.filter((svc: any) => {
                        if (!hasProducts) return true; // Show all if no products configured
                        if (itemTabFilter === 'product') {
                          return svc.type === 'product';
                        } else {
                          return svc.type !== 'product';
                        }
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 sm:col-span-2 text-xs">
                            No items available in this category.
                          </div>
                        );
                      }

                      return filtered.map((svc: any) => {
                        const isSvcSelected = selectedService?.id === svc.id;
                        const isProduct = svc.type === 'product';
                        const isAvailable = svc.isAvailable !== false;

                        return (
                          <div
                            key={svc.id}
                            onClick={() => {
                              if (!isAvailable) return;
                              setSelectedService(svc);
                              setTimeout(() => {
                                document.getElementById('booking-step-3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className={`bg-white border rounded-2xl p-4 transition-all duration-200 flex justify-between items-start gap-3 ${
                              !isAvailable
                                ? 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50/55'
                                : isSvcSelected
                                ? 'border-sky-500 ring-2 ring-sky-50 shadow-sm cursor-pointer'
                                : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                            }`}
                          >
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{svc.name}</h4>
                                {svc.vehicleType && svc.vehicleType !== 'N/A' && svc.vehicleType !== 'All' && (
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                                    {svc.vehicleType}
                                  </span>
                                )}
                                {!isAvailable && (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                                    {isProduct ? 'Out of Stock' : 'Unavailable'}
                                  </span>
                                )}
                              </div>
                              
                              {!isProduct ? (
                                <p className="text-xs text-slate-400 mt-0.5">Duration: {svc.duration} mins</p>
                              ) : (
                                <p className="text-xs text-emerald-600 font-semibold mt-0.5">Physical Product</p>
                              )}
                              
                              {svc.description && (
                                <p className="text-slate-500 text-xs mt-1 line-clamp-2" title={svc.description}>
                                  {svc.description}
                                </p>
                              )}
                            </div>
                            <span className="font-black text-sky-600 text-sm shrink-0">
                              BND ${(svc.price || 0).toFixed(2)}
                            </span>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Step 3: Immersive Map & Date/Slot Access Panels */}
              {selectedService && (
                <div id="booking-step-3" className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* FULL-SCREEN MAP ACTION CARD */}
                  <div
                    onClick={() => setShowFullScreenMap(true)}
                    className="bg-white border border-slate-200 hover:border-sky-300 p-4 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-sky-50 text-sky-500 p-2 rounded-xl">
                        <Navigation className="h-5 w-5 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Select Place Location</h4>
                        <p className="text-[10px] text-slate-400">
                          {userLat && userLng ? `GPS coordinates verified` : 'View simulation map in full screen'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>

                  {/* FULL-SCREEN CALENDAR / SLOT ACTION CARD */}
                  <div
                    onClick={() => {
                      setShowFullScreenDate(true);
                      fetchAvailableSlots(selectedLocation.id, bookingDate, setAvailableSlots);
                    }}
                    className="bg-white border border-slate-200 hover:border-sky-300 p-4 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 text-emerald-500 p-2 rounded-xl">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Select Date & Time</h4>
                        <p className="text-[10px] text-slate-400">
                          {selectedSlot ? `Slot: ${bookingDate} @ ${selectedSlot}` : 'Choose date & touch slot'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
              )}

              {/* Checkout Block / Confirm Details */}
              {selectedService && selectedSlot && (
                <form id="booking-checkout" onSubmit={handleBookSlot} className="bg-sky-500/5 border border-sky-200/50 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in mt-4">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-sky-100 pb-2">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    Review Your Booking Selection
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Car Wash Place</span>
                      <span className="text-slate-700 font-extrabold text-xs">{selectedLocation.name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Wash Service (Product)</span>
                      <span className="text-slate-700 font-extrabold text-xs">{selectedService.name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Booking Date & Slot</span>
                      <span className="text-slate-700 font-extrabold text-xs">{bookingDate} @ {selectedSlot}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Total Service Price</span>
                      <span className="text-sky-600 font-black text-sm">BND ${(selectedService.price || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Booking Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block uppercase">Additional Notes / Car Model & Plate Number</label>
                    <input
                      type="text"
                      placeholder="Example: Toyota Vios (Red), plate BA1234. Wash engines please."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                    />
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 block uppercase">Select Payment Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedLocation.paymentPolicy !== 'PRE_PAYMENT' && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                            paymentMethod === 'cash'
                              ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-50'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Landmark className="w-4 h-4 text-sky-600 shrink-0" />
                          <div>
                            <span className="block font-extrabold text-xs">Pay on Site</span>
                            <span className="text-[9px] text-slate-400 font-normal">Settle at shop after wash</span>
                          </div>
                        </button>
                      )}
                      {(selectedLocation.bibdEnabled || selectedLocation.baiduriEnabled || selectedLocation.paymentPolicy === 'PRE_PAYMENT') && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('bank')}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                            paymentMethod === 'bank'
                              ? 'bg-sky-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-50'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="block font-extrabold text-xs">Bank Transfer</span>
                            <span className="text-[9px] text-slate-400 font-normal">Prepay via BIBD/Baiduri</span>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Notice Info Banner based on selection */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left animate-fade-in">
                      {paymentMethod === 'cash' ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs font-extrabold text-slate-700">Cash / Pay on Site Selected</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed pl-3.5">
                            No upfront payment details needed. Confirm your slot and make payment at the counter upon service completion.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 font-semibold" />
                            <span className="text-xs font-extrabold text-indigo-700">Bank Transfer Prepayment Required</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed pl-3.5">
                            Please have your bank app ready. Clicking "Confirm" below will open our secure upload form to submit your transfer screenshot and reference number.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm & Book Wash Slot'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h1 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <History className="h-5 w-5 text-sky-500" />
                  Your Booking History ({bookings.length})
                </h1>
                <p className="text-xs text-slate-400">View current, completed, or cancelled bookings and launch chat logs</p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm">No bookings yet.</p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="mt-3 px-4 py-1.5 bg-sky-50 text-sky-600 text-xs font-bold rounded-xl border border-sky-100 hover:bg-sky-100 transition-all cursor-pointer"
                >
                  Book your first car wash slot
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Place / Location</th>
                      <th className="py-3 px-2">Date & Slot</th>
                      <th className="py-3 px-2">Service</th>
                      <th className="py-3 px-2">Price</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Notes</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((bk) => (
                      <tr key={bk.id} className="border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2">
                          <div className="font-extrabold text-slate-800">{(bk as any).carWashName || 'Car Wash'}</div>
                          <div className="text-[10px] text-slate-400">{(bk as any).carWashAddress || 'Address N/A'}</div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="font-bold text-slate-700">{bk.date}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-500" /> {bk.timeSlot}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="font-bold text-slate-700">{bk.serviceName || 'Standard Wash'}</div>
                          <div className="text-[10px] mt-0.5">
                            {bk.paymentBank ? (
                              <span className="inline-flex items-center gap-0.5 font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 rounded uppercase text-[9px]">
                                💳 {bk.paymentBank} Transfer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 rounded uppercase text-[9px]">
                                💵 Cash on Site
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="font-black text-slate-800">BND ${(bk.price || 15.00).toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${getStatusBadgeClass(bk.status)}`}>
                            {bk.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-slate-500 truncate max-w-xs" title={bk.notes}>
                          {bk.notes || '—'}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://wa.me/${((bk as any).carWashPhone || '').replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(
                                `Hello! I would like to confirm my car wash booking:\n\n📍 Location: ${(bk as any).carWashName || 'Car Wash'}\n📅 Date: ${bk.date}\n⏰ Time: ${bk.timeSlot}\n👤 Customer Name: ${user?.name || 'Customer'}${
                                  bk.notes ? `\n✉️ Notes: ${bk.notes}` : ''
                                }\n\nThank you!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg transition-colors border border-emerald-100/60 flex items-center gap-1 cursor-pointer"
                              title="Notify on WhatsApp"
                            >
                              <span>WhatsApp</span>
                            </a>

                            {bk.status === BookingStatus.PENDING ? (
                              cancellingBookingId === bk.id ? (
                                <div className="flex items-center gap-1 animate-fade-in bg-rose-50 border border-rose-100 p-0.5 rounded-lg">
                                  <span className="text-[10px] font-bold text-rose-700 px-1">Cancel?</span>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleCancelBooking(bk.id);
                                      setCancellingBookingId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCancellingBookingId(null);
                                    }}
                                    className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300 transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setReschedulingBooking(bk);
                                      setRescheduleDate(bk.date);
                                      setSelectedRescheduleSlot(null);
                                    }}
                                    className="px-2 py-1 text-[10px] border border-sky-200 text-sky-600 hover:bg-sky-50 font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCancellingBookingId(bk.id);
                                    }}
                                    className="px-2 py-1 text-[10px] border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono italic px-1">Locked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-sky-100 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-extrabold text-xl shadow-xs">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    {user?.name}
                    <span className="bg-sky-50 text-sky-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {user?.role} Member
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                {isEditingProfile ? 'Show Summary' : 'Edit Profile Details'}
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+673 812-3456"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs bg-white transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Profile Photo URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Residential Address</label>
                  <textarea
                    placeholder="Kampong Gadong, Bandar Seri Begawan"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 rounded-xl outline-none text-slate-800 text-xs transition-all resize-none"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</span>
                  <span className="text-slate-700 font-bold text-xs">{user?.phone || '—'}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</span>
                  <span className="text-slate-700 font-bold text-xs">
                    {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</span>
                  <span className="text-slate-700 font-bold text-xs">{user?.gender || '—'}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Home Address</span>
                  <span className="text-slate-700 font-bold text-xs block truncate max-w-xs" title={user?.address}>
                    {user?.address || '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📍 IMMERSIVE FULL SCREEN MAP DIALOG (MOBILE-FIRST) */}
      {showFullScreenMap && selectedLocation && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-sky-400 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-xs">{selectedLocation.name}</h3>
                <p className="text-[10px] text-slate-400">Verifying GPS & Map Area Coordinates</p>
              </div>
            </div>
            <button
              onClick={() => setShowFullScreenMap(false)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Interactive Map Block */}
          <div className="flex-1 relative bg-slate-900">
            <MapSimulation
              locations={[selectedLocation]}
              selectedLocationId={selectedLocation.id}
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

          {/* Footer Action */}
          <div className="bg-slate-900 p-4 border-t border-slate-800 flex flex-col gap-2">
            <div className="text-xs text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-800">
              💡 <strong>GPS Simulation Note:</strong> You can drag the red customer pin on the map to calculate route, distance, and verified driving coordinates.
            </div>
            <button
              onClick={() => setShowFullScreenMap(false)}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              Confirm Location & Proceed
            </button>
          </div>
        </div>
      )}

      {/* 📅 IMMERSIVE FULL SCREEN DATE & TIME SLOTS SELECTOR */}
      {showFullScreenDate && selectedLocation && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in overflow-y-auto">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-400" />
              <div>
                <h3 className="font-extrabold text-xs">Select Appointment Date & Time</h3>
                <p className="text-[10px] text-sky-300">Location: {selectedLocation.name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowFullScreenDate(false)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6 pb-24">
            {/* Calendar input */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                1. Select Wash Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setSelectedSlot(null);
                    // Refetch slots for new date
                    fetchAvailableSlots(selectedLocation.id, e.target.value, setAvailableSlots);
                  }}
                  className="w-full pl-11 pr-3 py-2.5 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-sm transition-all"
                  required
                />
              </div>

              {breakInfo && (
                <div className="text-xs bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 animate-fade-in mt-2">
                  <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Note: This location has a scheduled <strong>lunch / prayer break closure</strong> on{' '}
                    <span className="capitalize">{breakInfo.day}</span> from <strong>{breakInfo.start}</strong> to <strong>{breakInfo.end}</strong>. These slots are closed for booking.
                  </span>
                </div>
              )}
            </div>

            {/* Slots section */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex justify-between items-center">
                <span>2. Choose Available Appointment Time Slot</span>
                <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full font-bold">
                  {bookingDate}
                </span>
              </label>

              {availableSlots.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-slate-400" />
                  Closed or no slots remaining on this day.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.timeSlot;
                    return (
                      <button
                        type="button"
                        key={slot.timeSlot}
                        disabled={!slot.isAvailable}
                        onClick={() => {
                          setSelectedSlot(slot.timeSlot);
                          setShowFullScreenDate(false);
                          setTimeout(() => {
                            document.getElementById('booking-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 250);
                        }}
                        className={`p-3.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[50px] ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-100 shadow-md scale-102'
                            : slot.isAvailable
                            ? 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                            : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                        }`}
                      >
                        <span className="text-sm font-black">{slot.timeSlot}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-sky-100' : slot.isAvailable ? 'text-sky-600 font-bold' : 'text-slate-300'}`}>
                          {slot.isAvailable ? 'Available' : 'Fully Booked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer action */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex flex-col gap-2 z-20">
            <button
              onClick={() => {
                if (!selectedSlot) {
                  alert('Please select an available time slot first!');
                  return;
                }
                setShowFullScreenDate(false);
                setTimeout(() => {
                  document.getElementById('booking-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              {selectedSlot ? `Confirm Selected Slot: ${selectedSlot}` : 'Please Select a Time Slot'}
            </button>
          </div>
        </div>
      )}

      {/* Rescheduling Modal Dialog */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">Reschedule Booking</h3>
              <button
                onClick={() => setReschedulingBooking(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                id="close-reschedule-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              <div className="bg-sky-50 text-sky-800 text-xs p-3 rounded-xl border border-sky-100 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
                <div>
                  <strong className="font-semibold block">Current Selection:</strong>
                  <span>{reschedulingBooking.date} during {reschedulingBooking.timeSlot}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">New Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setSelectedRescheduleSlot(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  required
                  id="reschedule-date-input"
                />
                {rescheduleBreakInfo && (
                  <div className="mt-2 text-xs bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-xl flex items-start gap-2 animate-fade-in">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Note: Scheduled <strong>lunch / prayer break closure</strong> on{' '}
                      <span className="capitalize">{rescheduleBreakInfo.day}</span> from <strong>{rescheduleBreakInfo.start}</strong> to <strong>{rescheduleBreakInfo.end}</strong>.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">New Slot</label>
                {rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No slots available on this day.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedRescheduleSlot === slot.timeSlot;
                      return (
                        <button
                          type="button"
                          key={slot.timeSlot}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedRescheduleSlot(slot.timeSlot)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-center cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : slot.isAvailable
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-sky-400'
                              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                          id={`reschedule-slot-${slot.timeSlot.replace(/ /g, '')}`}
                        >
                          {slot.timeSlot.split(' - ')[0]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedRescheduleSlot || isSubmitting}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
                id="confirm-reschedule-btn"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Reschedule'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Booking Success & WhatsApp Notification Modal */}
      {showSuccessModal && lastBookedInfo && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden transform scale-100 transition-transform">
            {/* Header with success badge */}
            <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 text-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-white/90 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <Check className="h-9 w-9 text-white" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Booking Confirmed!</h3>
              <p className="text-emerald-100 text-xs mt-1">Your car wash slot has been successfully reserved.</p>
            </div>

            {/* Details Card */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs sm:text-sm space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Location</span>
                  <span className="text-slate-800 font-bold">{lastBookedInfo.locationName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Date</span>
                  <span className="text-slate-800 font-bold">{lastBookedInfo.date}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-medium">Time Slot</span>
                  <span className="text-slate-800 font-mono font-bold text-sky-600">{lastBookedInfo.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Customer Name</span>
                  <span className="text-slate-800 font-bold">{user?.name || 'Customer'}</span>
                </div>
                {lastBookedInfo.notes && (
                  <div className="border-t border-slate-100 pt-2 text-slate-500 text-xs italic">
                    Note: "{lastBookedInfo.notes}"
                  </div>
                )}
              </div>

              {/* Notification Details Section */}
              <div className="border border-emerald-100 bg-emerald-50/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Info className="h-4 w-4 text-emerald-600" />
                  <strong className="text-xs font-bold uppercase tracking-wider">WhatsApp Notification</strong>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send a click-to-chat message to the car wash owner or employee. They will receive the exact schedule coordinates and notes.
                </p>

                {/* Phone Configuration State */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">WhatsApp Contact Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter WhatsApp number (e.g. 6738123456)"
                      value={customWhatsAppPhone}
                      onChange={(e) => setCustomWhatsAppPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  {lastBookedInfo.locationPhone ? (
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -ml-3"></span>
                      Owner's WhatsApp linked & auto-filled!
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 font-medium">
                      * Owner has not set a default WhatsApp number. Enter one or send using a manual contact.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center"
                >
                  Dismiss
                </button>
                <a
                  href={`https://wa.me/${customWhatsAppPhone.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(
                    `Hello! I would like to confirm my car wash booking:\n\n📍 Location: ${lastBookedInfo.locationName}\n📅 Date: ${lastBookedInfo.date}\n⏰ Time: ${lastBookedInfo.timeSlot}\n👤 Customer Name: ${user?.name || 'Customer'}${
                      lastBookedInfo.notes ? `\n✉️ Notes: ${lastBookedInfo.notes}` : ''
                    }\n\nThank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
                >
                  <span>Send WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Bank Payment Modal */}
      {showPaymentModal && selectedLocation && selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-xl my-8">
            <LocalPaymentForm
              carWash={selectedLocation}
              date={bookingDate}
              timeSlot={selectedSlot}
              notes={notes}
              token={token}
              serviceId={selectedService?.id}
              serviceName={selectedService?.name}
              price={selectedService?.price}
              onCancel={() => setShowPaymentModal(false)}
              onSuccess={(bookingData) => {
                // Record booked info for WhatsApp and success dialog
                setLastBookedInfo({
                  locationName: selectedLocation.name,
                  locationAddress: selectedLocation.address,
                  locationPhone: selectedLocation.phone || '',
                  date: bookingDate,
                  timeSlot: selectedSlot,
                  notes: notes,
                  serviceName: selectedService?.name,
                  price: selectedService?.price,
                });
                setCustomWhatsAppPhone(selectedLocation.phone || '');
                setShowSuccessModal(true);
                setShowPaymentModal(false);

                // Clear forms
                setSelectedSlot(null);
                setNotes('');
                // Reload slots and booking list
                fetchAvailableSlots(selectedLocation.id, bookingDate, setAvailableSlots);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
