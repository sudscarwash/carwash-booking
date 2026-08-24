/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import { LocalPaymentForm } from '../components/LocalPaymentForm.js';
import { BookingFlowModal } from '../components/BookingFlowModal.js';
import { Search, Calendar, Clock, MapPin, History, CheckCircle, AlertTriangle, X, ChevronRight, ChevronLeft, ChevronDown, Sliders, Info, Sparkles, Navigation, User, Edit3, Check, Instagram, Landmark, Lock, Key, FileText, Maximize2, Filter } from 'lucide-react';
import { CarWash, Booking, BookingStatus } from '../types.js';
import autoshineLogo from '../assets/images/autoshine_logo.jpg';

interface TimeSlotItem {
  timeSlot: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
    changePassword,
    deleteAccount,
    loading
  } = useApp();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [locationAlphabetFilter, setLocationAlphabetFilter] = useState<string>('ALL');
  const [isStep1Collapsed, setIsStep1Collapsed] = useState(false);
  const [isHistorySectionCollapsed, setIsHistorySectionCollapsed] = useState(false);
  const [expandedBookingIds, setExpandedBookingIds] = useState<string[]>([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED_REJECTED'>('ALL');

  const toggleBookingExpanded = (bookingId: string) => {
    setExpandedBookingIds(prev => 
      prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]
    );
  };

  const toggleAllBookingsExpanded = () => {
    if (expandedBookingIds.length === bookings.length) {
      setExpandedBookingIds([]);
    } else {
      setExpandedBookingIds(bookings.map(b => b.id));
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage, locationAlphabetFilter]);
  const [selectedLocation, setSelectedLocation] = useState<CarWash | null>(null);
  const [bookingDate, setBookingDate] = useState(() => {
    return getTodayDateString();
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

  // Password change states
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agreeToDelete, setAgreeToDelete] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangePasswordError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    const success = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (success) {
      setChangePasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeletingAccount(true);
    await deleteAccount();
    setIsDeletingAccount(false);
    setShowDeleteModal(false);
  };

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
      // Always default to 'cash' (Pay at Counter) as requested
      setPaymentMethod('cash');
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
  const [userLat, setUserLat] = useState(4.8917); // BSB center
  const [userLng, setUserLng] = useState(114.9401);
  const [radiusKm, setRadiusKm] = useState(2);
  const [viewAllLocations, setViewAllLocations] = useState(true);

  // Bottom Mobile Navigation and Product Selection states
  const [activeTab, setActiveTab] = useState<'book' | 'bookings' | 'profile'>('book');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [itemTabFilter, setItemTabFilter] = useState<'service' | 'product'>('service');
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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
    const res = await createBooking(
      selectedLocation.id,
      bookingDate,
      selectedSlot,
      notes,
      selectedService?.id,
      selectedService?.name,
      selectedService?.price
    );
    setIsSubmitting(false);

    if (res.success) {
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

  const formatBookingDate = (dateStr: string) => {
    if (!dateStr) return 'Date N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);

        const todayStr = getTodayDateString();
        const isToday = dateStr === todayStr;

        const formatted = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        return isToday ? `Today (${dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})` : formatted;
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-50 text-amber-800 border border-amber-200/90 uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            ⏳ Pending
          </span>
        );
      case BookingStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-sky-50 text-sky-800 border border-sky-200/90 uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            🧼 Washing
          </span>
        );
      case BookingStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/90 uppercase tracking-wider shadow-2xs">
            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
            Completed
          </span>
        );
      case BookingStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-slate-100 text-slate-600 border border-slate-200/90 uppercase tracking-wider shadow-2xs">
            <X className="w-3 h-3 text-slate-500 stroke-[3]" />
            Cancelled
          </span>
        );
      case BookingStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-rose-50 text-rose-800 border border-rose-200/90 uppercase tracking-wider shadow-2xs">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            {status}
          </span>
        );
    }
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
          <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400 rounded-3xl p-4 sm:p-6 text-white shadow-md">
            <span className="bg-sky-500/30 text-sky-100 text-[10px] font-extrabold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/20 uppercase tracking-widest inline-block">
              Quick Car Care Booking
            </span>
            <h1 className="text-base sm:text-2xl font-black tracking-tight mt-1.5 text-white leading-snug">
              Choose a location, select your service, and select date/time.
            </h1>
            <p className="text-[11px] sm:text-xs text-sky-100 mt-0.5 leading-normal">
              Optimized for fast mobile booking with interactive GPS maps and dynamic schedules.
            </p>
          </div>

          {/* 🚗 STEP 1: Select Car Wash Place */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider">
                    Step 1: Select Car Wash Place
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select a location below to begin booking your wash</p>
                  
                  {/* Clean Dedicated Badge Row on separate line */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="bg-sky-50 text-sky-700 text-[11px] font-extrabold px-3 py-1 rounded-full border border-sky-200/80 inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                      {locations.filter(loc => 
                        loc.name.toLowerCase().includes(search.toLowerCase()) || 
                        loc.address.toLowerCase().includes(search.toLowerCase()) ||
                        (loc.services && loc.services.some(s => s.name.toLowerCase().includes(search.toLowerCase())))
                      ).length} Available Locations
                    </span>

                    {selectedLocation && (
                      <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200/80 inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Selected: <strong className="font-black">{selectedLocation.name}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsStep1Collapsed(!isStep1Collapsed)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                  >
                    <span>{isStep1Collapsed ? 'Show Locations List' : 'Collapse List'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStep1Collapsed ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>

              {/* Search & Per-Page Controls (Visible when expanded) */}
              {!isStep1Collapsed && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search location, address, or service..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-xs transition-all shadow-2xs"
                      />
                    </div>

                    {/* Items Per Page Selector */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <span className="text-[11px] font-bold text-slate-500">Show per page:</span>
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                        {[5, 10, 15].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setItemsPerPage(num)}
                            className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                              itemsPerPage === num
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* A-Z Alphabetical Index Filter Bar for Locations */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3 text-sky-600" />
                        Alphabetical Location Index (A-Z)
                      </span>
                      {locationAlphabetFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setLocationAlphabetFilter('ALL')}
                          className="text-[10px] font-extrabold text-sky-600 hover:underline cursor-pointer"
                        >
                          Clear A-Z Filter
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-2 pt-1 max-w-full touch-pan-x scrollbar-thin">
                      {['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => {
                        const countForLetter = letter === 'ALL'
                          ? locations.length
                          : letter === '#'
                          ? locations.filter(loc => !/^[A-Z]$/i.test(loc.name.trim().charAt(0))).length
                          : locations.filter(loc => loc.name.trim().charAt(0).toUpperCase() === letter).length;

                        const isSelected = locationAlphabetFilter === letter;

                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => setLocationAlphabetFilter(letter)}
                            className={`min-w-8 h-8 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-600/30'
                                : countForLetter > 0
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-2xs'
                                : 'bg-slate-50 text-slate-300 border border-transparent cursor-not-allowed opacity-50'
                            }`}
                            title={`${letter}: ${countForLetter} location(s)`}
                          >
                            <span>{letter}</span>
                            {countForLetter > 0 && letter !== 'ALL' && (
                              <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${isSelected ? 'bg-sky-800 text-sky-100' : 'bg-slate-200 text-slate-600'}`}>
                                {countForLetter}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Places Cards Grid with Multi-Page Navigation */}
            {!isStep1Collapsed && (() => {
              const sortedLocations = [...locations].sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
              );

              const filteredLocations = sortedLocations.filter(loc => {
                // Alphabetical Filter
                if (locationAlphabetFilter !== 'ALL') {
                  const rawName = loc.name.trim();
                  let firstChar = rawName.charAt(0).toUpperCase();
                  if (!/^[A-Z]$/i.test(firstChar)) {
                    firstChar = '#';
                  }
                  if (locationAlphabetFilter === '#') {
                    if (firstChar !== '#') return false;
                  } else {
                    if (firstChar !== locationAlphabetFilter) return false;
                  }
                }

                // Search Filter
                if (search.trim()) {
                  const q = search.toLowerCase();
                  const matchName = loc.name.toLowerCase().includes(q);
                  const matchAddr = loc.address.toLowerCase().includes(q);
                  const matchSvc = loc.services && loc.services.some(s => s.name.toLowerCase().includes(q));
                  if (!matchName && !matchAddr && !matchSvc) return false;
                }

                return true;
              });

              const totalPages = Math.ceil(filteredLocations.length / itemsPerPage) || 1;
              const paginatedLocations = filteredLocations.slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              );

              if (filteredLocations.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
                    <MapPin className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <p className="font-semibold text-xs">No car wash locations found matching "{search}".</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className={`bg-white border rounded-2xl p-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between gap-3 overflow-hidden w-full ${
                          selectedLocation?.id === loc.id
                            ? 'border-sky-500 ring-2 ring-sky-100 bg-sky-50/20'
                            : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex gap-3 items-start min-w-0 w-full">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden ${
                            selectedLocation?.id === loc.id
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}>
                            {loc.logoUrl ? (
                              <img 
                                src={loc.logoUrl} 
                                alt={loc.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <MapPin className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base break-words line-clamp-2 leading-tight">
                              {loc.name}
                            </h3>
                            <p className="text-slate-500 text-xs break-words mt-1 line-clamp-2 leading-relaxed">
                              {loc.address}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200/80">
                                Open Now
                              </span>
                              {loc.services && loc.services.length > 0 && (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                  {loc.services.length} wash options
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocation(loc);
                            setUserLat(loc.locationLat);
                            setUserLng(loc.locationLng);
                          }}
                          className={`w-full py-3 px-4 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                            selectedLocation?.id === loc.id
                              ? 'bg-emerald-600 hover:bg-emerald-500'
                              : 'bg-sky-600 hover:bg-sky-500'
                          }`}
                        >
                          <span>{selectedLocation?.id === loc.id ? 'Selected (Tap to Book)' : 'Select Location & Book'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Multi-Page Navigation Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
                      <span className="text-xs font-bold text-slate-500">
                        Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({filteredLocations.length} locations)
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 text-slate-700 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Prev</span>
                        </button>

                        <div className="flex items-center gap-1 px-1">
                          {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCurrentPage(idx + 1)}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                currentPage === idx + 1
                                  ? 'bg-sky-600 text-white shadow-2xs scale-105'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 text-slate-700 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 📍 Collapsible Interactive Map Block for Nearby Car Washes */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-3 text-white flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30 shrink-0">
                  <MapPin className="w-5 h-5 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
                    <span>Nearby Car Washes Map</span>
                    <span className="bg-sky-500/20 text-sky-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30">
                      Interactive GPS
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {isMapExpanded ? 'Tap pins on map to select car wash' : 'Expand map to view location markers on GPS map'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsMapExpanded(true);
                    setShowFullScreenMap(true);
                  }}
                  className="px-3 py-2 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border border-sky-500/30 shadow-sm"
                  title="Full Screen Map"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-xs">Full Screen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 shrink-0 shadow-sm"
                >
                  <span>{isMapExpanded ? 'Hide Map' : 'Explore Map'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMapExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {isMapExpanded && (
              <div className="border-t border-slate-800 animate-fade-in">
                <div className="h-[460px] sm:h-[580px] lg:h-[640px] relative bg-slate-950">
                  <MapSimulation
                    locations={locations}
                    selectedLocationId={selectedLocation?.id}
                    onLocationSelect={(loc) => {
                      setSelectedLocation(loc);
                      setUserLat(loc.locationLat);
                      setUserLng(loc.locationLng);
                    }}
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
                <div className="bg-slate-900/90 px-4 py-3 text-xs text-slate-300 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <span>💡 <strong>Map Navigation:</strong> Tap any pin on the map to select that location and open booking.</span>
                  <button
                    type="button"
                    onClick={() => setShowFullScreenMap(true)}
                    className="text-sky-400 hover:text-sky-300 text-xs font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Open Fullscreen Interactive Map</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Full Screen Immersive Booking Flow Modal */}
          {selectedLocation && (
            <BookingFlowModal
              location={selectedLocation}
              isOpen={!!selectedLocation}
              onClose={() => setSelectedLocation(null)}
              user={user}
              createBooking={createBooking}
              onBookingSuccess={(bookingData) => {
                setLastBookedInfo(bookingData);
                setCustomWhatsAppPhone(bookingData.locationPhone || '');
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-4">
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-sky-500 shrink-0" />
                  <span>My Booking History</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  View and manage your car wash reservations or contact location via WhatsApp
                </p>

                {/* Status Filter Badges (Wrapping Grid/Flex for Full Mobile Visibility) */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setBookingStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      bookingStatusFilter === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingStatusFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      bookingStatusFilter === 'PENDING'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200/80'
                    }`}
                  >
                    ⏳ Pending ({bookings.filter(b => b.status === BookingStatus.PENDING || b.status === BookingStatus.IN_PROGRESS).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingStatusFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      bookingStatusFilter === 'COMPLETED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80'
                    }`}
                  >
                    ✅ Completed ({bookings.filter(b => b.status === BookingStatus.COMPLETED).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingStatusFilter('CANCELLED_REJECTED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      bookingStatusFilter === 'CANCELLED_REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200/80'
                    }`}
                  >
                    ❌ Cancelled ({bookings.filter(b => b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED).length})
                  </button>
                </div>
              </div>

              {/* Section Controls */}
              <div className="flex items-center gap-2 self-start sm:self-center flex-wrap pt-1 sm:pt-0">
                {!isHistorySectionCollapsed && bookings.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllBookingsExpanded}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  >
                    {expandedBookingIds.length === bookings.length ? 'Collapse All' : 'Expand All'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsHistorySectionCollapsed(!isHistorySectionCollapsed)}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold rounded-xl border border-sky-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>{isHistorySectionCollapsed ? 'Expand' : 'Hide'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isHistorySectionCollapsed ? '' : 'rotate-180'}`} />
                </button>
              </div>
            </div>

            {/* Collapsed Section Banner */}
            {isHistorySectionCollapsed && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-xs text-slate-600 flex items-center justify-between gap-3">
                <span>📁 <strong>Booking History Collapsed:</strong> {bookings.length} recorded booking(s) hidden.</span>
                <button
                  type="button"
                  onClick={() => setIsHistorySectionCollapsed(false)}
                  className="px-3 py-1 bg-sky-600 text-white rounded-lg font-extrabold text-xs cursor-pointer hover:bg-sky-500 transition-all shrink-0"
                >
                  Show Records
                </button>
              </div>
            )}

            {!isHistorySectionCollapsed && (
              (() => {
                const filteredBookings = bookings.filter((b) => {
                  if (bookingStatusFilter === 'PENDING') return b.status === BookingStatus.PENDING || b.status === BookingStatus.IN_PROGRESS;
                  if (bookingStatusFilter === 'COMPLETED') return b.status === BookingStatus.COMPLETED;
                  if (bookingStatusFilter === 'CANCELLED_REJECTED') return b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED;
                  return true;
                });

                if (bookings.length === 0) {
                  return (
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
                  );
                }

                if (filteredBookings.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-slate-500 space-y-2">
                      <p className="font-bold text-xs">No bookings found matching filter category.</p>
                      <button
                        onClick={() => setBookingStatusFilter('ALL')}
                        className="px-3 py-1 bg-sky-50 text-sky-700 text-xs font-extrabold rounded-lg border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer"
                      >
                        Reset Filter (Show All)
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredBookings.map((bk) => {
                      const isExpanded = expandedBookingIds.includes(bk.id);

                      return (
                        <div
                          key={bk.id}
                          className="bg-white border border-slate-200/90 rounded-2xl transition-all shadow-2xs hover:border-sky-300 hover:shadow-xs overflow-hidden"
                        >
                          {/* Minimal Collapsed Card Header */}
                          <div
                            onClick={() => toggleBookingExpanded(bk.id)}
                            className="p-3.5 sm:p-4 cursor-pointer select-none hover:bg-slate-50/80 transition-colors space-y-2"
                          >
                             {/* Top Row: Full Uncut Car Wash Name & Status Badge */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {(() => {
                                  const matchedLoc = locations.find(l => l.id === bk.carWashId || l.name === (bk as any).carWashName);
                                  if (matchedLoc?.logoUrl) {
                                    return (
                                      <img 
                                        src={matchedLoc.logoUrl} 
                                        alt={matchedLoc.name} 
                                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs" 
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    );
                                  }
                                  return null;
                                })()}
                                <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words flex-1 min-w-0">
                                  {(bk as any).carWashName || 'Car Wash Location'}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {renderStatusBadge(bk.status)}
                                <div className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 transition-all">
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </div>

                            {/* Minimal Date & Time Row */}
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-medium pt-0.5">
                              <div className="flex items-center gap-1.5 truncate">
                                <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span className="truncate">{formatBookingDate(bk.date)}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-800 font-mono font-bold shrink-0">{bk.timeSlot}</span>
                              </div>

                              <span className="text-[11px] font-extrabold text-sky-600 hover:underline shrink-0 flex items-center gap-0.5">
                                {isExpanded ? 'Less info' : 'More details'}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Full Card Details */}
                          {isExpanded && (
                            <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50/60 space-y-3 text-xs animate-fade-in">
                              {/* Location & Address Banner */}
                              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Location Address</span>
                                  <div className="flex items-center gap-1 text-slate-800 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{(bk as any).carWashAddress || 'Location details in card'}</span>
                                  </div>
                                </div>
                                <div className="text-right sm:text-right shrink-0">
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider">Price BND</span>
                                  <span className="font-black text-slate-900 text-sm font-mono">BND ${(bk.price || 15.00).toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Service & Payment Info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Service Wash Option</span>
                                  <span className="font-extrabold text-sky-800 block text-xs">{bk.serviceName || 'Standard Wash'}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Payment Method</span>
                                  <div>
                                    {bk.paymentBank ? (
                                      <div className="space-y-0.5">
                                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md text-[10px]">
                                          💳 {bk.paymentBank} Bank Transfer
                                        </span>
                                        {bk.txnReference && (
                                          <span className="block text-[10px] text-slate-500 font-mono">Ref: {bk.txnReference}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[10px]">
                                        💵 Pay Cash on Arrival
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Customer Notes */}
                              {bk.notes && (
                                <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Customer Notes</span>
                                  <p className="text-slate-700 italic text-xs">{bk.notes}</p>
                                </div>
                              )}

                              {/* Actions Row */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                                <a
                                  href={`https://wa.me/${((bk as any).carWashPhone || '').replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(
                                    `Hello! I would like to confirm my car wash booking:\n\n📍 Location: ${(bk as any).carWashName || 'Car Wash'}\n📅 Date: ${bk.date}\n⏰ Time: ${bk.timeSlot}\n👤 Customer Name: ${user?.name || 'Customer'}${
                                      bk.notes ? `\n✉️ Notes: ${bk.notes}` : ''
                                    }\n\nThank you!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer text-xs"
                                  title="Send booking update via WhatsApp"
                                >
                                  <span>Notify via WhatsApp</span>
                                </a>

                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                  {bk.status === BookingStatus.PENDING ? (
                                    cancellingBookingId === bk.id ? (
                                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl">
                                        <span className="text-[10px] font-bold text-rose-700 px-1">Cancel booking?</span>
                                        <button
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            await handleCancelBooking(bk.id);
                                            setCancellingBookingId(null);
                                          }}
                                          className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
                                        >
                                          Yes, Cancel
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setCancellingBookingId(null);
                                          }}
                                          className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
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
                                          className="px-3.5 py-1.5 border border-sky-300 text-sky-700 hover:bg-sky-50 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                                        >
                                          Reschedule
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setCancellingBookingId(bk.id);
                                          }}
                                          className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                                        >
                                          Cancel Booking
                                        </button>
                                      </>
                                    )
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-semibold italic px-1">
                                      {bk.status === BookingStatus.COMPLETED ? 'Order Completed' : 'Record Locked'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
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

          {/* Security & Credentials Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden" id="security-settings-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Security & Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Manage account authentication</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordSection(!showChangePasswordSection);
                  setChangePasswordError('');
                  setChangePasswordSuccess('');
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                id="toggle-change-password-section-btn"
              >
                <Key className="h-3.5 w-3.5 text-slate-500" />
                {showChangePasswordSection ? 'Hide Panel' : 'Change Password'}
              </button>
            </div>

            {showChangePasswordSection ? (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-4 max-w-md animate-in fade-in slide-in-from-top-1 duration-200" id="customer-change-password-form">
                {changePasswordError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2" id="customer-password-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2" id="customer-password-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                    {changePasswordSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="customer-current-password">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="customer-current-password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="customer-new-password">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="customer-new-password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="customer-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="customer-confirm-password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    id="customer-submit-change-password-btn"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Security Password'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-500 pt-4 leading-relaxed">
                Ensure your account credentials remain private and secure. We recommend using a unique password of at least 6 characters, mixing numbers and symbols.
              </p>
            )}
          </div>

          {/* Legal, Help & Account Status */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden" id="legal-and-support-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-bl-full pointer-events-none" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">Legal & Support</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase mb-4">View terms and manage account state</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Terms of Service Box */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Terms & Conditions</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Review the legal terms of service and usage regulations for AUTOSHINE BN.</p>
                </div>
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="view-terms-btn"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  View Terms of Service
                </button>
              </div>

              {/* Danger Zone Box */}
              <div className="bg-rose-50/30 border border-rose-100/50 rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Danger Zone</h4>
                  <p className="text-[10px] text-rose-600/70 mt-1">Permanently delete your profile data and booking history from our system.</p>
                </div>
                <button
                  onClick={() => {
                    setAgreeToDelete(false);
                    setShowDeleteModal(true);
                  }}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200/50"
                  id="show-delete-account-modal-btn"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="terms-of-service-modal-overlay">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] border border-slate-100 shadow-2xl overflow-hidden flex flex-col" id="terms-of-service-modal-container">
            {/* Header / Brand */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-xl bg-[#0058E6] shadow-xs">
                  <img src={autoshineLogo} alt="Autoshine BN Logo" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">AUTOSHINE BN Terms</h3>
                  <p className="text-[9px] text-sky-600 font-mono uppercase tracking-wide">Last updated: July 12, 2026</p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Terms Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-4">
                <p className="font-semibold text-slate-700">
                  These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the AUTOSHINE BN mobile application and website (&quot;Platform&quot;). By registering for an account or using the Platform, you agree to be bound by these Terms.
                </p>

                <hr className="border-slate-100 my-4" />

              {/* T&C Items */}
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">1</span>
                    Definitions
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p><strong className="text-slate-800">AUTOSHINE BN</strong> means the owner and operator of the booking platform.</p>
                    <p><strong className="text-slate-800">User</strong> means any person who registers or uses the Platform.</p>
                    <p><strong className="text-slate-800">Service Operator</strong> means an independent car wash company offering services through the Platform.</p>
                    <p><strong className="text-slate-800">Booking</strong> means a reservation made by a User for car wash services.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">2</span>
                    Acceptance of Terms
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>By using AUTOSHINE BN, you confirm that you:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Are at least 18 years old or have permission from a parent or legal guardian.</li>
                      <li>Agree to comply with these Terms and all applicable laws of Brunei Darussalam.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">3</span>
                    Platform Services
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN provides an online platform that enables Users to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Browse participating car wash operators.</li>
                      <li>View available services and pricing.</li>
                      <li>Schedule appointments.</li>
                      <li>Receive booking confirmations and notifications.</li>
                      <li>Make payments where payment services are available.</li>
                    </ul>
                    <p className="text-slate-500 italic mt-2">AUTOSHINE BN acts solely as a booking platform and is not the provider of the car wash services.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">4</span>
                    User Account
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Users are responsible for:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Providing accurate and current information.</li>
                      <li>Keeping login credentials confidential.</li>
                      <li>Maintaining the security of their account.</li>
                      <li>Promptly updating any changes to their contact details.</li>
                    </ul>
                    <p>Users are responsible for all activities conducted through their account.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">5</span>
                    Booking Policy
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Users agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate vehicle information.</li>
                      <li>Arrive at the scheduled appointment on time.</li>
                      <li>Present the booking confirmation when requested.</li>
                      <li>Inform the Service Operator if they are unable to attend.</li>
                    </ul>
                    <p>Bookings are subject to acceptance by the selected Service Operator.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">6</span>
                    Pricing
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Prices displayed on the Platform are determined by the respective Service Operators.</p>
                    <p>AUTOSHINE BN does not guarantee that prices will remain unchanged and reserves the right to update pricing information provided by Service Operators.</p>
                    <p>Additional charges may apply if the actual condition or size of the vehicle differs from the information provided during booking.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">7</span>
                    Payments
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Where online payment is available:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Payment shall be made using approved payment methods.</li>
                      <li>Payment confirmations will be issued electronically.</li>
                      <li>Refunds shall be subject to the applicable cancellation and refund policy.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">8</span>
                    Cancellation and Refunds
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Users may cancel bookings in accordance with the cancellation policy displayed on the Platform.</p>
                    <p>Refund eligibility depends on:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The timing of the cancellation.</li>
                      <li>The Service Operator&apos;s cancellation policy.</li>
                      <li>Any applicable processing fees.</li>
                    </ul>
                    <p>Failure to attend a confirmed appointment without notice may result in cancellation charges or restrictions on future bookings.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">9</span>
                    User Responsibilities
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Users shall:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Treat Service Operators and their employees respectfully.</li>
                      <li>Ensure that vehicles are legally owned or used with the owner&apos;s permission.</li>
                      <li>Remove valuables from the vehicle before the service.</li>
                      <li>Disclose any special instructions relating to the vehicle.</li>
                    </ul>
                    <p className="text-amber-600 font-semibold mt-2">AUTOSHINE BN shall not be responsible for valuables left inside vehicles.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">10</span>
                    Service Quality
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>The quality of car wash services is the responsibility of the selected Service Operator.</p>
                    <p>Any complaints regarding service quality should first be directed to the Service Operator.</p>
                    <p>AUTOSHINE BN may assist in facilitating communication but does not guarantee any specific outcome.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">11</span>
                    Limitation of Liability
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Does not perform the car wash services.</li>
                      <li>Is not responsible for damage caused during the provision of services by Service Operators.</li>
                      <li>Is not liable for delays, cancellations, or service interruptions caused by Service Operators.</li>
                      <li>Is not responsible for disputes between Users and Service Operators.</li>
                    </ul>
                    <p>To the fullest extent permitted by law, AUTOSHINE BN&apos;s liability is limited to the amount paid through the Platform for the affected booking.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">12</span>
                    Vehicle Damage
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Any claims relating to vehicle damage shall be made directly to the Service Operator responsible for providing the service.</p>
                    <p>AUTOSHINE BN may assist in facilitating communication but accepts no liability for the acts or omissions of Service Operators.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">13</span>
                    Intellectual Property
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>All content on the Platform, including trademarks, logos, graphics, software, and text, remains the property of AUTOSHINE BN or its licensors.</p>
                    <p>Users shall not copy, reproduce, distribute, or modify any content without prior written permission.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">14</span>
                    Privacy
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN collects and processes personal information solely for the purpose of providing booking services and improving the Platform.</p>
                    <p>Personal information will be handled in accordance with AUTOSHINE BN&apos;s Privacy Policy and applicable laws.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">15</span>
                    Prohibited Conduct
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>Users shall not:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use false identities.</li>
                      <li>Make fraudulent bookings.</li>
                      <li>Interfere with the operation of the Platform.</li>
                      <li>Upload malicious software or harmful content.</li>
                      <li>Misuse payment systems.</li>
                      <li>Engage in unlawful activities through the Platform.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">16</span>
                    Suspension or Termination
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN may suspend or terminate a User account without prior notice if the User:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Breaches these Terms.</li>
                      <li>Engages in fraudulent or illegal conduct.</li>
                      <li>Misuses the Platform.</li>
                      <li>Repeatedly fails to honour confirmed bookings.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">17</span>
                    Platform Availability
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN aims to provide continuous service but does not guarantee uninterrupted access.</p>
                    <p>Temporary interruptions may occur due to maintenance, upgrades, technical failures, or events beyond reasonable control.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">18</span>
                    Changes to These Terms
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>AUTOSHINE BN reserves the right to amend these Terms at any time.</p>
                    <p>Updated Terms shall become effective upon publication on the Platform. Continued use of the Platform constitutes acceptance of the revised Terms.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">19</span>
                    Governing Law
                  </h3>
                  <div className="pl-7 space-y-2 text-slate-600">
                    <p>These Terms shall be governed by and interpreted in accordance with the laws of Brunei Darussalam.</p>
                    <p>Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Brunei Darussalam.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-bold">20</span>
                    Contact Information
                  </h3>
                  <div className="pl-7 space-y-3 text-slate-600 text-left">
                    <p>For enquiries, support, or complaints, please contact:</p>
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
                      <p><strong className="text-slate-700">Name:</strong> AUTOSHINE BN</p>
                      <p><strong className="text-slate-700">Email:</strong> support@autoshine.bn</p>
                      <p><strong className="text-slate-700">Telephone:</strong> +673 242 1234</p>
                      <p><strong className="text-slate-700">Business Address:</strong> Lot 1234, Jalan Gadong, Bandar Seri Begawan, BE1118, Brunei Darussalam</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-xs font-medium">
                  By creating an account or using the AUTOSHINE BN Platform, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 📍 IMMERSIVE FULL SCREEN MAP DIALOG (MOBILE-FIRST) */}
      {showFullScreenMap && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                <Navigation className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">
                  {selectedLocation ? selectedLocation.name : 'Interactive GPS Map - All Car Washes'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedLocation ? 'Tap pins on map to switch location or verify GPS route' : 'Tap any car wash pin to select location and start booking'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFullScreenMap(false)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white transition-colors cursor-pointer border border-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Interactive Map Block */}
          <div className="flex-1 relative bg-slate-900">
            <MapSimulation
              locations={locations}
              selectedLocationId={selectedLocation?.id}
              onLocationSelect={(loc) => {
                setSelectedLocation(loc);
                setUserLat(loc.locationLat);
                setUserLng(loc.locationLng);
              }}
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
          <div className="bg-slate-900 p-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-300">
              {selectedLocation ? (
                <span>Selected: <strong className="text-sky-400 font-black">{selectedLocation.name}</strong> ({selectedLocation.address})</span>
              ) : (
                <span>Tap any pin on the map to select a car wash location.</span>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowFullScreenMap(false)}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                {selectedLocation ? 'Confirm Location & Proceed' : 'Done Exploring'}
              </button>
            </div>
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
                  min={getTodayDateString()}
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
                  min={getTodayDateString()}
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

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-account-confirmation-overlay">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden p-6 space-y-6" id="delete-account-modal-container">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-800">Confirm Account Deletion</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-medium font-sans">
              Are you absolutely sure you want to delete your account? This will permanently delete your profile, and all your past bookings from our system. <strong className="text-rose-600">This action cannot be undone.</strong>
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
              <p className="text-slate-600 font-extrabold uppercase tracking-wide text-[10px]">Upon confirmation, the system will:</p>
              <ul className="list-disc pl-4 text-slate-500 space-y-1 font-medium font-sans">
                <li>Remove your user profile and contact details</li>
                <li>Delete your secure session tokens</li>
                <li>Erase your bookings in both database clusters</li>
              </ul>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-2.5 p-1">
              <input
                type="checkbox"
                id="agree-to-delete-checkbox"
                checked={agreeToDelete}
                onChange={(e) => setAgreeToDelete(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
              <label htmlFor="agree-to-delete-checkbox" className="text-xs text-slate-600 font-medium leading-tight cursor-pointer select-none">
                I understand that this action is irreversible and I agree to permanently delete my account and booking history.
              </label>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                id="cancel-delete-account-btn"
                disabled={isDeletingAccount}
              >
                Cancel, Keep Account
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-rose-600/10"
                id="confirm-delete-account-btn"
                disabled={isDeletingAccount || !agreeToDelete}
              >
                {isDeletingAccount ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
