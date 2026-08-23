/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import { BookingStatus, Booking, CarWash, WashService } from '../types.js';
import {
  Briefcase as BriefcaseIcon, Calendar as CalendarIcon, Clock as ClockIcon, Check as CheckIcon, ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon, Info as InfoIcon, MapPin as MapPinIcon, CalendarDays, ChevronLeft, ChevronRight, Plus,
  Sparkles, Phone, Car, User as UserIcon, X, CheckCheck, Pencil
} from 'lucide-react';
import { EditBookingModal } from '../components/EditBookingModal.js';
import { ServicePickerModal } from '../components/ServicePickerModal.js';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

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
    description: 'Fast exterior water jet wash with soft microfiber hand dry.'
  },
  {
    id: 'default_wash_deluxe',
    name: 'Deluxe Foam Wash, Wax & Tyre Shine',
    price: 25.00,
    duration: 60,
    type: 'service',
    description: 'Full exterior foam wash, spray wax protection, deep interior vacuum, and tyre shine.'
  },
  {
    id: 'default_wash_ceramic',
    name: 'Premium Ceramic Coating & Deep Detailing',
    price: 45.00,
    duration: 90,
    type: 'service',
    description: 'Ultimate hand wash detailing with hydrophobic ceramic spray sealant.'
  }
];

const DEFAULT_ADDONS: WashService[] = [
  {
    id: 'default_addon_headlight',
    name: 'Headlight Polish & Lens Restoration',
    price: 15.00,
    duration: 15,
    type: 'addon',
    description: 'Professional headlight lens clarity restoration.'
  },
  {
    id: 'default_addon_tyre',
    name: 'Tyre Shine & Hydrophobic Rim Coating',
    price: 5.00,
    duration: 10,
    type: 'addon',
    description: 'Deep glossy tyre dressing and protective rim shine coat.'
  },
  {
    id: 'default_addon_windscreen',
    name: 'Windscreen Rain-Repellent Treatment',
    price: 8.00,
    duration: 10,
    type: 'addon',
    description: 'Hydrophobic glass coating that repels rain drops.'
  },
  {
    id: 'default_addon_steam',
    name: 'Interior Steam Sanitization & Deodorizer',
    price: 12.00,
    duration: 20,
    type: 'addon',
    description: 'High-temperature steam treatment targeting AC vents and seats.'
  },
  {
    id: 'default_addon_engine',
    name: 'Engine Bay Degreasing & Dressing',
    price: 20.00,
    duration: 25,
    type: 'addon',
    description: 'Safe engine compartment degreasing and protective dressing.'
  }
];

const DEFAULT_PRODUCTS: WashService[] = [
  {
    id: 'default_product_microfiber',
    name: 'Microfiber Detailing Towel Pack (3-pc)',
    price: 6.00,
    duration: 0,
    type: 'product',
    description: 'Ultra-soft 400GSM plush microfiber towels.'
  },
  {
    id: 'default_product_shampoo',
    name: 'PH-Neutral Auto Wash Shampoo 500ml',
    price: 12.00,
    duration: 0,
    type: 'product',
    description: 'Concentrated high-foaming car wash soap.'
  },
  {
    id: 'default_product_ceramic_spray',
    name: 'Hydrophobic Ceramic Guard Spray 300ml',
    price: 18.00,
    duration: 0,
    type: 'product',
    description: 'Easy spray-on ceramic sealant providing gloss and water beading.'
  },
  {
    id: 'default_product_freshener',
    name: 'Luxury Air Freshener Vent Clip',
    price: 4.00,
    duration: 0,
    type: 'product',
    description: 'Long-lasting premium fragrance vent clip.'
  }
];

const getCatalogForLocation = (loc?: CarWash | null): WashService[] => {
  if (!loc) return [];
  return Array.isArray(loc.services) ? loc.services : [];
};

export const EmployeeDashboard: React.FC = () => {
  const { user, bookings, updateBookingStatus, locations, createManualBooking } = useApp();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'calendar' | 'station'>('queue');

  // Edit Booking Modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState<boolean>(false);

  // Calendar states
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayDateString());
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<'ALL' | 'ONLINE' | 'PHONE' | 'WALK_IN'>('ALL');

  // Quick Walk-In / Phone Booking Modal states
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [mbName, setMbName] = useState('');
  const [mbPhone, setMbPhone] = useState('');
  const [mbVehicle, setMbVehicle] = useState('');
  const [mbDate, setMbDate] = useState<string>(getTodayDateString());
  const [mbTimeSlot, setMbTimeSlot] = useState<string>('09:00 - 09:30');
  const [mbIsCustomSlot, setMbIsCustomSlot] = useState(false);
  const [mbCustomSlotText, setMbCustomSlotText] = useState('');
  const [mbSelectedServiceId, setMbSelectedServiceId] = useState<string>('');
  const [mbSelectedItems, setMbSelectedItems] = useState<WashService[]>([]);
  const [showServicePickerModal, setShowServicePickerModal] = useState(false);
  const [mbPrice, setMbPrice] = useState<string>('15.00');
  const [mbNotes, setMbNotes] = useState('');
  const [mbSource, setMbSource] = useState<'PHONE' | 'WALK_IN' | 'ONLINE'>('WALK_IN');
  const [mbStatus, setMbStatus] = useState<BookingStatus>(BookingStatus.IN_PROGRESS);
  const [mbAvailableSlots, setMbAvailableSlots] = useState<any[]>([]);
  const [mbSelectedSlots, setMbSelectedSlots] = useState<string[]>([]);
  const [mbIsSubmitting, setMbIsSubmitting] = useState(false);

  const getFormattedSlotSummary = (slots: string[]) => {
    if (!slots || slots.length === 0) {
      return 'Walk-in / Immediate (No Slot Reserved)';
    }
    const sorted = [...slots].sort((a, b) => {
      const tA = a.split(' - ')[0];
      const tB = b.split(' - ')[0];
      return tA.localeCompare(tB);
    });
    if (sorted.length === 1) return sorted[0];

    const isContiguous = sorted.every((s, i) => {
      if (i === 0) return true;
      const prevEnd = sorted[i - 1].split(' - ')[1];
      const currStart = s.split(' - ')[0];
      return prevEnd === currStart;
    });

    if (isContiguous) {
      const start = sorted[0].split(' - ')[0];
      const end = sorted[sorted.length - 1].split(' - ')[1];
      const hrs = (sorted.length * 0.5).toFixed(1);
      return `${start} - ${end} (${sorted.length} Slots / ${hrs} Hrs)`;
    }
    return sorted.join(', ');
  };

  // Employees can view and manage bookings for their assigned business
  const myLocation = locations.find((loc) => loc.id === user?.businessId);
  const filteredBookings = bookings.filter((b) => b.carWashId === user?.businessId);

  // Auto set initial service price when service selected
  useEffect(() => {
    if (myLocation) {
      const catalog = getCatalogForLocation(myLocation);
      if (catalog.length > 0) {
        if (mbSelectedItems.length === 0) {
          setMbSelectedItems([catalog[0]]);
          setMbSelectedServiceId(catalog[0].id);
          setMbPrice(catalog[0].price.toFixed(2));
        } else if (!mbSelectedServiceId) {
          setMbSelectedServiceId(catalog[0].id);
        }
      }
    }
  }, [myLocation, showManualBookingModal]);

  // Fetch available slots for manual booking date
  useEffect(() => {
    if (myLocation && mbDate) {
      fetch(`/api/bookings/available-slots?carWashId=${myLocation.id}&date=${mbDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMbAvailableSlots(data);
            if (data.length > 0 && (!mbTimeSlot || !data.some((s) => s.timeSlot === mbTimeSlot))) {
              setMbTimeSlot(data[0].timeSlot);
            }
          }
        })
        .catch((err) => console.error('Error fetching slots:', err));
    }
  }, [myLocation, mbDate]);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdatingId(bookingId);
    await updateBookingStatus(bookingId, status);
    setUpdatingId(null);
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myLocation || !mbName.trim() || !mbPhone.trim() || !mbDate) {
      return;
    }

    setMbIsSubmitting(true);
    const catalog = getCatalogForLocation(myLocation);

    const combinedName = mbSelectedItems.length > 0
      ? mbSelectedItems.map((i) => i.name).join(' + ')
      : 'Standard Car Wash & Vacuum';

    const calculatedPrice = mbSelectedItems.length > 0
      ? mbSelectedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
      : (parseFloat(mbPrice) || 15.00);

    const finalSlot = mbIsCustomSlot
      ? (mbCustomSlotText.trim() || 'Walk-in / Immediate (No Slot)')
      : getFormattedSlotSummary(mbSelectedSlots);

    const success = await createManualBooking({
      carWashId: myLocation.id,
      date: mbDate,
      timeSlot: finalSlot,
      customerName: mbName.trim(),
      customerPhone: mbPhone.trim(),
      vehicleInfo: mbVehicle.trim() || undefined,
      bookingSource: mbSource,
      serviceId: mbSelectedItems.length > 0 ? mbSelectedItems[0].id : catalog[0]?.id,
      serviceName: combinedName,
      price: calculatedPrice,
      notes: mbNotes.trim() || undefined,
      status: mbStatus,
    });

    setMbIsSubmitting(false);

    if (success) {
      setShowManualBookingModal(false);
      setMbName('');
      setMbPhone('');
      setMbVehicle('');
      setMbNotes('');
      setMbIsCustomSlot(false);
      setMbCustomSlotText('');
      setMbSelectedSlots([]);
      setMbSelectedItems([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-6">
      {/* Employee Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl border border-amber-100">
            <BriefcaseIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              Operator Station
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Welcome back, <strong className="text-slate-700">{user?.name}</strong>. Manage your active queue and record walk-in customers.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs flex items-center gap-3">
          <div>
            <span className="text-slate-400 block uppercase font-bold tracking-wider text-[9px]">Station Reference</span>
            <strong className="text-slate-700">{myLocation ? myLocation.name : 'Unassigned Station'}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setMbDate(selectedCalendarDate || getTodayDateString());
              setShowManualBookingModal(true);
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Quick Walk-In</span>
          </button>
        </div>
      </div>

      {/* Responsive Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-2.5 flex justify-around items-center z-40 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-t-2xl">
        <button
          onClick={() => {
            setActiveTab('queue');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'queue'
              ? 'text-amber-600 font-extrabold scale-105'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-emp-nav-queue"
        >
          <ClockIcon className="w-5 h-5" />
          <span className="text-[10px]">Wash Queue ({filteredBookings.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('calendar');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-amber-600 font-extrabold scale-105'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-emp-nav-calendar"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px]">Calendar & Slots</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('station');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'station'
              ? 'text-amber-600 font-extrabold scale-105'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-emp-nav-station"
        >
          <MapPinIcon className="w-5 h-5" />
          <span className="text-[10px]">Station Info</span>
        </button>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex items-center gap-2 pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'queue'
              ? 'border-amber-600 text-amber-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Active Wash Queue ({filteredBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'calendar'
              ? 'border-amber-600 text-amber-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendar & Quick Slots</span>
        </button>
        <button
          onClick={() => setActiveTab('station')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'station'
              ? 'border-amber-600 text-amber-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Station Map & Details
        </button>
      </div>

      {/* Active Tab Content display */}
      <div className="space-y-6">
        {activeTab === 'queue' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-amber-500" />
                  Active Wash Queue ({filteredBookings.length})
                </h2>
                <span className="text-xs text-slate-500 font-bold">Real-time update</span>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <CheckCircleIcon className="h-10 w-10 text-emerald-200 mx-auto mb-2 animate-bounce" />
                  <p className="font-semibold text-sm text-slate-600">All clean! Queue is currently empty.</p>
                  <p className="text-xs text-slate-400 mt-1">New customer slot bookings will show up here automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="bg-white border border-slate-150 rounded-2xl p-4 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      id={`emp-queue-card-${bk.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-50 border border-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                            ID: {bk.id}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-xs font-bold text-slate-500 font-mono">
                            {bk.date} @ {bk.timeSlot}
                          </span>
                          {bk.bookingSource && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {bk.bookingSource === 'WALK_IN' ? '🚗 Walk-In' : bk.bookingSource === 'PHONE' ? '📞 Phone' : '🌐 App'}
                            </span>
                          )}
                        </div>

                        <div className="text-left">
                          <strong className="text-slate-800 text-sm sm:text-base block">{bk.customerName}</strong>
                          {bk.paymentBank ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-lg mt-1 font-mono uppercase">
                              💳 Bank Transfer: {bk.paymentBank}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-lg mt-1 font-mono uppercase">
                              💵 Cash / Pay on Site
                            </span>
                          )}
                        </div>

                        {bk.notes && (
                          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl max-w-md text-left">
                            <span className="font-bold text-[9px] text-slate-400 block uppercase">Notes / Vehicle Specs:</span>
                            {bk.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:items-end justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs uppercase border ${
                          bk.status === BookingStatus.COMPLETED
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : bk.status === BookingStatus.IN_PROGRESS
                            ? 'bg-sky-50 text-sky-800 border-sky-100 animate-pulse'
                            : bk.status === BookingStatus.PENDING
                            ? 'bg-amber-50 text-amber-800 border-amber-100'
                            : bk.status === BookingStatus.REJECTED
                            ? 'bg-rose-50 text-rose-800 border-rose-100'
                            : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {bk.status}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingBooking(bk);
                              setShowEditBookingModal(true);
                            }}
                            className="px-2.5 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Edit Services, Add-ons & Price"
                          >
                            <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Edit Services / Extras</span>
                          </button>

                          {bk.status === BookingStatus.PENDING && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.IN_PROGRESS)}
                                disabled={updatingId === bk.id}
                                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                id={`emp-start-${bk.id}`}
                              >
                                Start Wash <ChevronRightIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.CANCELLED)}
                                disabled={updatingId === bk.id}
                                className="px-2.5 py-1.5 border border-rose-250 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                title="Cancel booking"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.REJECTED)}
                                disabled={updatingId === bk.id}
                                className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                title="Reject booking"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {bk.status === BookingStatus.IN_PROGRESS && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.COMPLETED)}
                                disabled={updatingId === bk.id}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer animate-pulse"
                                id={`emp-complete-${bk.id}`}
                              >
                                <CheckIcon className="h-3.5 w-3.5" /> Finish & Done
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.CANCELLED)}
                                disabled={updatingId === bk.id}
                                className="px-2.5 py-1.5 border border-rose-250 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                title="Cancel mid-wash"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {(bk.status === BookingStatus.COMPLETED || bk.status === BookingStatus.CANCELLED || bk.status === BookingStatus.REJECTED) && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-400 italic">No actions pending</span>
                              <button
                                onClick={() => handleUpdateStatus(bk.id, BookingStatus.PENDING)}
                                disabled={updatingId === bk.id}
                                className="px-2 py-0.5 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 bg-white hover:bg-indigo-50 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
                                title="Revert status to Pending"
                              >
                                Revert
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📅 Calendar & Quick Booking Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Top Control Bar */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-amber-600 shrink-0" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-800">
                    Booking Calendar & Station Slots
                  </h2>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  View bay slot distribution, filter booking sources, and record instant walk-in or phone-in orders.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                {/* Filter pills */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter('ALL')}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer text-center ${
                      calendarSourceFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter('ONLINE')}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      calendarSourceFilter === 'ONLINE' ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-500 hover:text-sky-700'
                    }`}
                  >
                    🌐 App
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter('PHONE')}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      calendarSourceFilter === 'PHONE' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:text-amber-700'
                    }`}
                  >
                    📞 Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSourceFilter('WALK_IN')}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      calendarSourceFilter === 'WALK_IN' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    🚗 Walk-In
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMbDate(selectedCalendarDate || getTodayDateString());
                    setShowManualBookingModal(true);
                  }}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Phone / Walk-In</span>
                </button>
              </div>
            </div>

            {/* Month Grid & Day Detail Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Calendar Grid (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                {/* Calendar Month Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-base">
                      {calendarCurrentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarCurrentMonth(new Date());
                        setSelectedCalendarDate(getTodayDateString());
                      }}
                      className="px-2 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-extrabold rounded-md border border-amber-100 transition-all cursor-pointer"
                    >
                      Today
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth() - 1, 1);
                        setCalendarCurrentMonth(prev);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth() + 1, 1);
                        setCalendarCurrentMonth(next);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Name Headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider py-1">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Month Grid Cells */}
                {(() => {
                  const year = calendarCurrentMonth.getFullYear();
                  const month = calendarCurrentMonth.getMonth();
                  const totalDays = new Date(year, month + 1, 0).getDate();
                  const firstDayIdx = new Date(year, month, 1).getDay();

                  const todayStr = getTodayDateString();
                  const bizBookings = bookings.filter((b) => !myLocation || b.carWashId === myLocation.id);

                  const cells = [];
                  for (let i = 0; i < firstDayIdx; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-14 sm:h-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-100 opacity-40" />);
                  }

                  for (let d = 1; d <= totalDays; d++) {
                    const mStr = String(month + 1).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    const dateKey = `${year}-${mStr}-${dStr}`;

                    const isToday = dateKey === todayStr;
                    const isSelected = dateKey === selectedCalendarDate;

                    let dateBookings = bizBookings.filter((b) => b.date === dateKey);
                    if (calendarSourceFilter !== 'ALL') {
                      dateBookings = dateBookings.filter((b) => (b.bookingSource || 'ONLINE') === calendarSourceFilter);
                    }

                    const totalCount = dateBookings.length;
                    const onlineCount = dateBookings.filter((b) => (b.bookingSource || 'ONLINE') === 'ONLINE').length;
                    const phoneCount = dateBookings.filter((b) => b.bookingSource === 'PHONE').length;
                    const walkInCount = dateBookings.filter((b) => b.bookingSource === 'WALK_IN').length;

                    cells.push(
                      <div
                        key={dateKey}
                        onClick={() => setSelectedCalendarDate(dateKey)}
                        className={`h-14 sm:h-20 p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                            : isToday
                            ? 'border-sky-300 bg-sky-50/40'
                            : 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] sm:text-xs font-black ${
                            isSelected ? 'text-amber-900' : isToday ? 'text-sky-700' : 'text-slate-700'
                          }`}>
                            {d}
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-extrabold text-sky-700 bg-sky-100 px-1 rounded uppercase">Today</span>
                          )}
                        </div>

                        {totalCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className={`block text-[9px] sm:text-[10px] font-extrabold px-0.5 sm:px-1 py-0.2 sm:py-0.5 rounded text-center truncate ${
                              isSelected ? 'bg-amber-600 text-white' : 'bg-slate-800 text-white'
                            }`}>
                              {totalCount} {totalCount === 1 ? 'Wash' : 'Washes'}
                            </span>

                            <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold">
                              {onlineCount > 0 && <span className="text-sky-600" title={`${onlineCount} Online`}>🌐{onlineCount}</span>}
                              {phoneCount > 0 && <span className="text-amber-600" title={`${phoneCount} Phone`}>📞{phoneCount}</span>}
                              {walkInCount > 0 && <span className="text-emerald-600" title={`${walkInCount} Walk-In`}>🚗{walkInCount}</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-300 font-mono text-center block">0</span>
                        )}
                      </div>
                    );
                  }

                  return <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{cells}</div>;
                })()}
              </div>

              {/* Day Detail & Slots Breakdown Panel (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Calendar Day</span>
                      <strong className="text-sm sm:text-base font-extrabold text-slate-800">
                        {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMbDate(selectedCalendarDate);
                        setShowManualBookingModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Walk-In</span>
                    </button>
                  </div>

                  {/* Day Bookings List */}
                  {(() => {
                    const dayBookings = bookings.filter((b) => (!myLocation || b.carWashId === myLocation.id) && b.date === selectedCalendarDate);

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Recorded Jobs ({dayBookings.length})</span>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {selectedCalendarDate}</span>
                        </div>

                        {dayBookings.length === 0 ? (
                          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-600">No bookings logged for this date yet</p>
                            <p className="text-[10px] text-slate-400 mt-1">Click "+ Walk-In" to quickly log a phone call or walk-in customer.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                            {dayBookings.map((bk) => (
                              <div
                                key={bk.id}
                                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 text-left hover:border-amber-300 hover:bg-white transition-all space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-xs font-extrabold text-slate-800">{bk.customerName}</strong>
                                    {bk.bookingSource === 'WALK_IN' ? (
                                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-200">
                                        🚗 Walk-In
                                      </span>
                                    ) : bk.bookingSource === 'PHONE' ? (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-200">
                                        📞 Phone
                                      </span>
                                    ) : (
                                      <span className="bg-sky-100 text-sky-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-sky-200">
                                        🌐 App
                                      </span>
                                    )}
                                  </div>

                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    bk.status === BookingStatus.COMPLETED
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : bk.status === BookingStatus.IN_PROGRESS
                                      ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {bk.status}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                                  <p>⏰ Slot: <strong>{bk.timeSlot}</strong></p>
                                  <p>🚗 Info: {bk.vehicleInfo || bk.customerPhone || 'N/A'}</p>
                                  <p>🧼 Service: {bk.serviceName || 'Standard Wash'} (BND ${(bk.price || 15).toFixed(2)})</p>
                                </div>

                                {/* Status Toggle Actions */}
                                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBooking(bk);
                                      setShowEditBookingModal(true);
                                    }}
                                    className="px-2 py-1 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Edit Services, Add-ons & Price"
                                  >
                                    <Pencil className="h-3 w-3 text-indigo-600" />
                                    <span>Edit</span>
                                  </button>

                                  {bk.status === BookingStatus.PENDING && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(bk.id, BookingStatus.IN_PROGRESS)}
                                      className="px-2 py-1 bg-sky-600 text-white font-bold text-[10px] rounded-lg shadow-2xs hover:bg-sky-500 cursor-pointer"
                                    >
                                      Start Wash
                                    </button>
                                  )}
                                  {bk.status === BookingStatus.IN_PROGRESS && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(bk.id, BookingStatus.COMPLETED)}
                                      className="px-2 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-2xs hover:bg-emerald-500 cursor-pointer animate-pulse"
                                    >
                                      Finish & Done
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'station' && (
          <div className="space-y-6 animate-fade-in">
            {/* Station Map & Location details */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
              <div className="pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <MapPinIcon className="h-5 w-5 text-emerald-600" />
                  Station Map View
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Physical dispatch and coordinate tracking sandbox.</p>
              </div>

              {/* Taller Map Container on Mobile */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[420px] sm:h-[350px]">
                <MapSimulation
                  locations={myLocation ? [myLocation] : []}
                  selectedLocationId={myLocation?.id}
                  userLat={myLocation?.locationLat}
                  userLng={myLocation?.locationLng}
                />
              </div>

              {myLocation && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-4 space-y-2.5 text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Address</span>
                    <strong className="text-xs text-slate-700 block">{myLocation.address}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Slot Duration</span>
                      <strong className="text-slate-700 font-mono">{myLocation.slotDuration} mins</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Capacity per Slot</span>
                      <strong className="text-slate-700 font-mono">{myLocation.capacityPerSlot} washes</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Walk-In & Phone Booking Modal */}
      {showManualBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base">Record Walk-In / Phone Booking</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Quickly log walk-in customers or phone reservations at your station.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualBookingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4 text-left">
              {/* Booking Source Pills */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Booking Source *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMbSource('WALK_IN')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      mbSource === 'WALK_IN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>🚗 Walk-In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMbSource('PHONE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      mbSource === 'PHONE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>📞 Phone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMbSource('ONLINE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      mbSource === 'ONLINE'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🌐 Manual App</span>
                  </button>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={mbName}
                    onChange={(e) => setMbName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Customer Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +673 8123456"
                    value={mbPhone}
                    onChange={(e) => setMbPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Vehicle Specs */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Vehicle Model / Plate
                </label>
                <input
                  type="text"
                  placeholder="e.g. BAA 1234 (Toyota Fortuner)"
                  value={mbVehicle}
                  onChange={(e) => setMbVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Booking Date */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Booking Date *
                </label>
                <input
                  type="date"
                  required
                  value={mbDate}
                  onChange={(e) => setMbDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Time Slot Selection (Interactive Chips Picker) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Time Slot Selection (Click chips to choose 1 or multi-slots) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMbSelectedSlots([])}
                      className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      ⚡ Immediate / Unscheduled
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setMbIsCustomSlot(!mbIsCustomSlot)}
                      className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      {mbIsCustomSlot ? "Select Interactive Slots" : "✍️ Custom Text"}
                    </button>
                  </div>
                </div>

                {mbIsCustomSlot ? (
                  <input
                    type="text"
                    placeholder="e.g. 09:00 - 10:30 (Walk-in Bay 2 / 1.5 Hrs)"
                    value={mbCustomSlotText}
                    onChange={(e) => setMbCustomSlotText(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-mono font-bold"
                  />
                ) : (
                  <div className="space-y-2">
                    {/* Selection Summary Header */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Selected Time Window</span>
                        <strong className="text-slate-800 font-mono text-xs sm:text-sm">
                          {getFormattedSlotSummary(mbSelectedSlots)}
                        </strong>
                      </div>
                      {mbSelectedSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMbSelectedSlots([])}
                          className="text-[10px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Interactive Chips Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-2xl bg-slate-50/50">
                      {mbAvailableSlots.length === 0 ? (
                        <div className="col-span-full p-4 text-center text-slate-400 text-xs">
                          No predefined slots loaded for this date. Click "Custom Text" above to write custom range.
                        </div>
                      ) : (
                        mbAvailableSlots.map((s) => {
                          const isSelected = mbSelectedSlots.includes(s.timeSlot);
                          const remaining = s.remainingCapacity !== undefined ? s.remainingCapacity : (s.capacity - s.bookedCount);
                          const isFull = remaining <= 0;

                          return (
                            <button
                              key={s.timeSlot}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setMbSelectedSlots(mbSelectedSlots.filter((slot) => slot !== s.timeSlot));
                                } else {
                                  setMbSelectedSlots([...mbSelectedSlots, s.timeSlot]);
                                }
                              }}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold scale-[1.02]'
                                  : isFull
                                  ? 'bg-red-50/80 hover:bg-red-100 border-red-200 text-slate-800'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-mono font-bold">
                                <span>{s.timeSlot}</span>
                                {isSelected && <CheckIcon className="w-3.5 h-3.5 shrink-0 ml-1" />}
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px]">
                                <span className={`font-semibold ${
                                  isSelected
                                    ? 'text-amber-100'
                                    : isFull
                                    ? 'text-red-600 font-bold'
                                    : 'text-slate-500'
                                }`}>
                                  {isFull ? '🔴 0 left (Full)' : `🟢 ${remaining} left`}
                                </span>
                                <span className={`font-mono text-[9px] ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>
                                  {s.bookedCount}/{s.capacity}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      💡 Click one or multiple slots to set custom duration (e.g. 1.5 Hrs). Full slots (0 left) can still be clicked by staff for walk-in overrides.
                    </p>
                  </div>
                )}
              </div>

              {/* Service Selection & Custom Price */}
              <div className="col-span-full space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Selected Services & Products ({mbSelectedItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowServicePickerModal(true)}
                    className="text-xs font-black text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>+ Tick & Choose Services (Multi-Select)</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  {mbSelectedItems.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400 font-medium">
                      No services selected yet. Click "+ Tick & Choose Services" above.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {mbSelectedItems.map((item, idx) => (
                        <div
                          key={`${item.id}_${idx}`}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                              item.type === 'product'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.type === 'addon'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}>
                              {item.type === 'product' ? 'Product' : item.type === 'addon' ? 'Add-on' : 'Main'}
                            </span>
                            <span className="font-extrabold text-slate-800 truncate">{item.name}</span>
                          </div>
                          <span className="font-mono font-black text-slate-900 shrink-0 ml-2">
                            BND ${(Number(item.price) || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-500">Calculated Charge Total:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-normal">
                        (or override price manually)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={mbPrice}
                        onChange={(e) => setMbPrice(e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-right font-mono font-black text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Initial Order Status
                </label>
                <select
                  value={mbStatus}
                  onChange={(e) => setMbStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-medium"
                >
                  <option value={BookingStatus.IN_PROGRESS}>⚡ Wash In Progress (Active Bay)</option>
                  <option value={BookingStatus.PENDING}>⏳ Pending Queue</option>
                  <option value={BookingStatus.COMPLETED}>✅ Already Clean & Completed</option>
                </select>
              </div>

              {/* Notes / Special Instructions */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Notes / Special Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extra dirty rims, customer paid cash on site."
                  value={mbNotes}
                  onChange={(e) => setMbNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualBookingModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mbIsSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{mbIsSubmitting ? 'Recording...' : 'Confirm & Save Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Booking Services & Add-ons Modal */}
      <EditBookingModal
        isOpen={showEditBookingModal}
        onClose={() => {
          setShowEditBookingModal(false);
          setEditingBooking(null);
        }}
        booking={editingBooking}
        location={myLocation}
      />

      {/* Multi-Item Tick Selection Picker Sub-Modal */}
      <ServicePickerModal
        isOpen={showServicePickerModal}
        onClose={() => setShowServicePickerModal(false)}
        catalog={getCatalogForLocation(myLocation)}
        selectedItems={mbSelectedItems}
        onConfirm={(items) => {
          setMbSelectedItems(items);
          const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
          setMbPrice(total.toFixed(2));
        }}
      />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-xs text-slate-500 text-left">
        <InfoIcon className="h-5 w-5 text-slate-400 shrink-0" />
        <p>
          As an Operator Staff member, your access is restricted to the active operational wash queue. You do not have permissions to modify business parameters, prices, slot configurations, or view system-wide platform logs.
        </p>
      </div>
    </div>
  );
};
