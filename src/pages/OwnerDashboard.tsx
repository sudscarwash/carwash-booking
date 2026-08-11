/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import {
  DollarSign, Calendar, Users, Sliders, Check, X,
  Clock, MapPin, BarChart3, ChevronRight, Edit2, Plus, Info, Briefcase, Trash2, Edit, Lock, Key,
  Phone, Car, User as UserIcon, Search, ChevronLeft, Filter, ShieldCheck, CheckCircle2, AlertCircle, CalendarDays, ChevronDown,
  FileText, Printer, Download, TrendingUp, PieChart, CreditCard, Package, FileSpreadsheet, Tag, Layers, RefreshCw, Bell, CheckCheck, MessageCircle, Mail, Save, Sparkles, Pencil, Upload
} from 'lucide-react';
import { BookingStatus, CarWash, Booking, WeeklySchedule, CustomPaymentMethod, WashService, Role } from '../types.js';
import { EditBookingModal } from '../components/EditBookingModal.js';
import { ServicePickerModal } from '../components/ServicePickerModal.js';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  if (!loc) return [...DEFAULT_MAIN_SERVICES, ...DEFAULT_ADDONS, ...DEFAULT_PRODUCTS];
  const customItems = Array.isArray(loc.services) ? loc.services : [];
  if (customItems.length > 0) {
    return customItems;
  }
  return [...DEFAULT_MAIN_SERVICES, ...DEFAULT_ADDONS, ...DEFAULT_PRODUCTS];
};

export const OwnerDashboard: React.FC = () => {
  const {
    user,
    token,
    locations,
    bookings,
    employees,
    fetchBookings,
    showNotification,
    updateBookingStatus,
    updateLocationConfig,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changePassword,
    createManualBooking,
    appNotifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  // Filter locations to strictly those owned by the logged-in user
  const ownerLocations = React.useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return locations;
    return locations.filter((loc) => loc.ownerId === user.id);
  }, [locations, user]);

  // Selected owned business
  const [selectedBusiness, setSelectedBusiness] = useState<CarWash | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'customers' | 'calendar' | 'settings'>('overview');
  const [customerAlphabetFilter, setCustomerAlphabetFilter] = useState<string>('ALL');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isSeedingLedger, setIsSeedingLedger] = useState(false);

  // Edit Booking Modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState<boolean>(false);

  const openWhatsAppCustomer = (phone?: string, customerName?: string, date?: string, timeSlot?: string, serviceName?: string) => {
    if (!phone) {
      showNotification('Customer phone number is not available.', 'error');
      return;
    }
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 7) {
      cleaned = '673' + cleaned;
    } else if (!cleaned.startsWith('673') && cleaned.length === 8) {
      cleaned = '673' + cleaned;
    }
    const text = `Halo ${customerName || 'Customer'}! This is ${selectedBusiness?.name || 'Autoshine BN'}. Regarding your booking for ${serviceName || 'Car Wash Service'} on ${date || ''} (${timeSlot || ''}): `;
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const formatTimeAgo = (isoDate: string) => {
    if (!isoDate) return '';
    const diffMs = new Date().getTime() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // 📅 Calendar & Manual Booking States
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getTodayDateString());
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState<Date>(new Date());
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<'ALL' | 'ONLINE' | 'PHONE' | 'WALK_IN'>('ALL');
  
  // Manual Booking Modal States
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [showServicePickerModal, setShowServicePickerModal] = useState(false);
  const [mbSelectedItems, setMbSelectedItems] = useState<WashService[]>([]);
  const [mbSource, setMbSource] = useState<'PHONE' | 'WALK_IN' | 'ONLINE'>('PHONE');
  const [mbName, setMbName] = useState('');
  const [mbPhone, setMbPhone] = useState('');
  const [mbEmail, setMbEmail] = useState('');
  const [mbVehicle, setMbVehicle] = useState('');
  const [mbDate, setMbDate] = useState<string>(getTodayDateString());
  const [mbTimeSlot, setMbTimeSlot] = useState<string>('09:00 - 09:30');
  const [mbSelectedServiceId, setMbSelectedServiceId] = useState<string>('');
  const [mbPrice, setMbPrice] = useState<string>('15.00');
  const [mbNotes, setMbNotes] = useState('');
  const [mbStatus, setMbStatus] = useState<BookingStatus>(BookingStatus.COMPLETED);
  const [mbAvailableSlots, setMbAvailableSlots] = useState<any[]>([]);
  const [mbSelectedSlots, setMbSelectedSlots] = useState<string[]>([]);
  const [mbIsCustomSlot, setMbIsCustomSlot] = useState(false);
  const [mbCustomSlotText, setMbCustomSlotText] = useState('');
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

  // Analytics states
  const [analytics, setAnalytics] = useState<any>({
    totalBookings: 0,
    completedCount: 0,
    pendingCount: 0,
    inProgressCount: 0,
    cancelledCount: 0,
    estimatedRevenue: 0,
    bookingsByDate: {},
  });

  // Business Edit Mode
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLat, setEditLat] = useState(4.8917);
  const [editLng, setEditLng] = useState(114.9401);
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editCapacity, setEditCapacity] = useState(2);
  const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 🔒 Dynamic Brunei local bank config states
  const [editBibdAccountName, setEditBibdAccountName] = useState('');
  const [editBibdAccountNo, setEditBibdAccountNo] = useState('');
  const [editBibdEnabled, setEditBibdEnabled] = useState(false);
  const [editBibdQrImageUrl, setEditBibdQrImageUrl] = useState('');
  const [editBaiduriAccountName, setEditBaiduriAccountName] = useState('');
  const [editBaiduriAccountNo, setEditBaiduriAccountNo] = useState('');
  const [editBaiduriEnabled, setEditBaiduriEnabled] = useState(false);
  const [editBaiduriQrImageUrl, setEditBaiduriQrImageUrl] = useState('');
  const [editCustomPaymentMethods, setEditCustomPaymentMethods] = useState<CustomPaymentMethod[]>([]);
  const [editPaymentPolicy, setEditPaymentPolicy] = useState('PAY_ON_SITE');

  // Dynamic services states created by the owner
  const [editServices, setEditServices] = useState<WashService[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('15.00');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceType, setNewServiceType] = useState<'service' | 'product' | 'addon'>('service');
  const [newServiceVehicleType, setNewServiceVehicleType] = useState<string>('All');
  const [newServiceIsAvailable, setNewServiceIsAvailable] = useState<boolean>(true);
  const [newServiceSlotsRequired, setNewServiceSlotsRequired] = useState<number>(1);

  // Add custom payment method quick-add states
  const [newProviderName, setNewProviderName] = useState('');
  const [customProviderName, setCustomProviderName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNo, setNewAccountNo] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [newQrImageUrl, setNewQrImageUrl] = useState('');

  // New Employee state
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);

  // Edit/Delete Employee states
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpBusinessId, setEditEmpBusinessId] = useState('');
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  // Focus Booking and Owner Audit Log States
  const [ownerLogs, setOwnerLogs] = useState<any[]>([]);
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');

  // 📊 Accounting & Revenue Ledger States
  const [accountingTimeframe, setAccountingTimeframe] = useState<'WEEKLY' | 'MONTHLY' | 'ALL'>('WEEKLY');
  const [accountingStatusFilter, setAccountingStatusFilter] = useState<'COMPLETED_ONLY' | 'ALL'>('COMPLETED_ONLY');
  const [accountingCategoryFilter, setAccountingCategoryFilter] = useState<'ALL' | 'SERVICES' | 'PRODUCTS'>('ALL');
  const [accountingSearch, setAccountingSearch] = useState<string>('');

  // Customizable month & week picker states for accounting
  const [selectedAccountingMonth, setSelectedAccountingMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [selectedAccountingWeekRefDate, setSelectedAccountingWeekRefDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  });

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [y, m] = selectedAccountingMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedAccountingMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedAccountingMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedAccountingMonth(`${newY}-${newM}`);
  };

  // Week navigation handlers
  const handlePrevWeek = () => {
    const parts = selectedAccountingWeekRefDate.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2] || 1);
    curr.setDate(curr.getDate() - 7);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const dt = String(curr.getDate()).padStart(2, '0');
    setSelectedAccountingWeekRefDate(`${y}-${m}-${dt}`);
  };

  const handleNextWeek = () => {
    const parts = selectedAccountingWeekRefDate.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2] || 1);
    curr.setDate(curr.getDate() + 7);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const dt = String(curr.getDate()).padStart(2, '0');
    setSelectedAccountingWeekRefDate(`${y}-${m}-${dt}`);
  };

  // Helper date calculations for accounting ledger
  const getAccountingWeekInfo = () => {
    const parts = selectedAccountingWeekRefDate.split('-').map(Number);
    const refDate = new Date(parts[0], parts[1] - 1, parts[2] || 1);
    const day = refDate.getDay();
    const diffToMon = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(refDate.getFullYear(), refDate.getMonth(), diffToMon);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const toIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dt}`;
    };

    const monMonth = monday.toLocaleDateString('en-US', { month: 'short' });
    const sunMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
    const monDay = monday.getDate();
    const sunDay = sunday.getDate();
    const year = sunday.getFullYear();

    let rangeFormatted = '';
    if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
      rangeFormatted = `${monMonth} ${monDay} – ${sunDay}, ${year}`;
    } else if (monday.getFullYear() === sunday.getFullYear()) {
      rangeFormatted = `${monMonth} ${monDay} – ${sunMonth} ${sunDay}, ${year}`;
    } else {
      rangeFormatted = `${monMonth} ${monDay}, ${monday.getFullYear()} – ${sunMonth} ${sunDay}, ${year}`;
    }

    return {
      monStr: toIso(monday),
      sunStr: toIso(sunday),
      monFormatted: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sunFormatted: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      rangeFormatted,
    };
  };

  const getAccountingMonthInfo = () => {
    const [yStr, mStr] = selectedAccountingMonth.split('-');
    const year = Number(yStr) || new Date().getFullYear();
    const monthNum = Number(mStr) || (new Date().getMonth() + 1);
    const dateObj = new Date(year, monthNum - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { monthKey: `${year}-${String(monthNum).padStart(2, '0')}`, monthName };
  };

  const accWeekInfo = getAccountingWeekInfo();
  const accMonthInfo = getAccountingMonthInfo();

  // Filter accounting bookings
  const accBizBookings = bookings.filter((b) => !selectedBusiness || b.carWashId === selectedBusiness.id);

  let accTimeFiltered = accBizBookings.filter((b) => {
    if (accountingTimeframe === 'WEEKLY') {
      return b.date >= accWeekInfo.monStr && b.date <= accWeekInfo.sunStr;
    }
    if (accountingTimeframe === 'MONTHLY') {
      return b.date.startsWith(accMonthInfo.monthKey);
    }
    return true; // ALL
  });

  if (accountingStatusFilter === 'COMPLETED_ONLY') {
    accTimeFiltered = accTimeFiltered.filter((b) => b.status === BookingStatus.COMPLETED);
  }

  if (accountingCategoryFilter !== 'ALL' && selectedBusiness?.services) {
    accTimeFiltered = accTimeFiltered.filter((b) => {
      const matchedSvc = selectedBusiness.services?.find(
        (s) => s.id === b.serviceId || s.name.toLowerCase() === (b.serviceName || '').toLowerCase()
      );
      if (accountingCategoryFilter === 'SERVICES') {
        return !matchedSvc || matchedSvc.type !== 'product';
      } else {
        return matchedSvc && matchedSvc.type === 'product';
      }
    });
  }

  const accBookingsList = accTimeFiltered.filter((b) => {
    if (!accountingSearch.trim()) return true;
    const q = accountingSearch.toLowerCase();
    return (
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.vehicleInfo || '').toLowerCase().includes(q) ||
      (b.serviceName || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.paymentBank || '').toLowerCase().includes(q)
    );
  });

  const accTotalRevenue = accBookingsList.reduce((sum, b) => {
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return sum;
    return sum + (Number(b.price) || 15.0);
  }, 0);

  const accTotalCount = accBookingsList.length;
  const accAvgTicket = accTotalCount > 0 ? accTotalRevenue / accTotalCount : 0;

  const accServiceBreakdown: Record<string, { count: number; totalRevenue: number; type: 'service' | 'product' }> = {};
  accBookingsList.forEach((b) => {
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return;
    const name = b.serviceName || 'Standard Car Wash';
    const price = Number(b.price) || 15.0;
    const matchedSvc = selectedBusiness?.services?.find(
      (s) => s.id === b.serviceId || s.name.toLowerCase() === name.toLowerCase()
    );
    const type = matchedSvc?.type || 'service';

    if (!accServiceBreakdown[name]) {
      accServiceBreakdown[name] = { count: 0, totalRevenue: 0, type };
    }
    accServiceBreakdown[name].count += 1;
    accServiceBreakdown[name].totalRevenue += price;
  });

  let accTopService = 'N/A';
  let accTopServiceRev = 0;
  Object.entries(accServiceBreakdown).forEach(([name, data]) => {
    if (data.totalRevenue > accTopServiceRev) {
      accTopServiceRev = data.totalRevenue;
      accTopService = name;
    }
  });

  const accPaymentMap: Record<string, number> = {
    Cash: 0,
    BIBD: 0,
    Baiduri: 0,
    Other: 0,
  };
  accBookingsList.forEach((b) => {
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return;
    const price = Number(b.price) || 15.0;
    if (!b.paymentBank) {
      accPaymentMap['Cash'] += price;
    } else if (b.paymentBank.toUpperCase().includes('BIBD')) {
      accPaymentMap['BIBD'] += price;
    } else if (b.paymentBank.toUpperCase().includes('BAIDURI')) {
      accPaymentMap['Baiduri'] += price;
    } else {
      accPaymentMap['Other'] += price;
    }
  });

  const accSourceMap: Record<string, { count: number; totalRevenue: number }> = {
    WALK_IN: { count: 0, totalRevenue: 0 },
    PHONE: { count: 0, totalRevenue: 0 },
    ONLINE: { count: 0, totalRevenue: 0 },
  };
  accBookingsList.forEach((b) => {
    if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) return;
    const price = Number(b.price) || 15.0;
    const src = b.bookingSource || 'ONLINE';
    if (!accSourceMap[src]) {
      accSourceMap[src] = { count: 0, totalRevenue: 0 };
    }
    accSourceMap[src].count += 1;
    accSourceMap[src].totalRevenue += price;
  });

  const handleExportPdfReport = () => {
    if (!selectedBusiness) return;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to export and download the printable PDF accounting ledger.');
      return;
    }

    const periodLabel =
      accountingTimeframe === 'WEEKLY'
        ? `Weekly Report (${accWeekInfo.monFormatted} - ${accWeekInfo.sunFormatted})`
        : accountingTimeframe === 'MONTHLY'
        ? `Monthly Report (${accMonthInfo.monthName})`
        : 'All-Time Sales Ledger';

    const filterLabel = accountingStatusFilter === 'COMPLETED_ONLY' ? 'Completed Washes Only' : 'All Recorded Bookings';
    const generatedDate = new Date().toLocaleString();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${selectedBusiness.name} - Sales & Accounting Report</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 28px;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .biz-name {
            font-size: 22px;
            font-weight: 900;
            color: #1e1b4b;
            margin: 0 0 4px 0;
            letter-spacing: -0.5px;
          }
          .biz-sub {
            color: #475569;
            font-size: 11px;
            margin: 0;
          }
          .report-tag {
            background: #1e1b4b;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            text-align: right;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 12px;
            border-radius: 8px;
          }
          .kpi-title {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .kpi-val {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            font-family: monospace;
          }
          .summary-sections {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
          .summary-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
          }
          .summary-box h4 {
            margin: 0 0 8px 0;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #334155;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .row-item {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            text-align: left;
            padding: 8px 10px;
            font-weight: 800;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 10px;
            color: #334155;
            font-size: 10px;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .total-row {
            font-weight: 900;
            background: #e0e7ff !important;
          }
          .total-row td {
            border-top: 2px solid #4338ca;
            border-bottom: 2px solid #4338ca;
            color: #1e1b4b;
            font-size: 11px;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #64748b;
            font-size: 10px;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 8px;
            text-transform: uppercase;
          }
          .badge-online { background: #e0f2fe; color: #0369a1; }
          .badge-phone { background: #fef3c7; color: #92400e; }
          .badge-walkin { background: #d1fae5; color: #065f46; }
          @media print {
            body { padding: 0; }
            @page { size: A4 portrait; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="biz-name">${selectedBusiness.name}</h1>
            <p class="biz-sub">📍 ${selectedBusiness.address || 'Operations Location'} • 📞 ${selectedBusiness.phone || 'N/A'}</p>
          </div>
          <div>
            <div class="report-tag">${periodLabel}</div>
            <p style="margin: 4px 0 0 0; text-align: right; color: #64748b; font-size: 9px;">Filter: ${filterLabel}</p>
            <p style="margin: 2px 0 0 0; text-align: right; color: #94a3b8; font-size: 9px;">Generated: ${generatedDate}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Total Revenue</div>
            <div class="kpi-val" style="color: #15803d;">BND $${accTotalRevenue.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Orders / Washes</div>
            <div class="kpi-val">${accTotalCount}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Avg Ticket Value</div>
            <div class="kpi-val">BND $${accAvgTicket.toFixed(2)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Top Service</div>
            <div class="kpi-val" style="font-size: 12px; font-family: inherit;">${accTopService}</div>
          </div>
        </div>

        <div class="summary-sections">
          <div class="summary-box">
            <h4>Payment Method Breakdown</h4>
            <div class="row-item"><span>💵 Cash on Site</span><strong>BND $${accPaymentMap['Cash'].toFixed(2)}</strong></div>
            <div class="row-item"><span>🏦 BIBD Transfer</span><strong>BND $${accPaymentMap['BIBD'].toFixed(2)}</strong></div>
            <div class="row-item"><span>🏦 Baiduri Transfer</span><strong>BND $${accPaymentMap['Baiduri'].toFixed(2)}</strong></div>
            <div class="row-item"><span>💳 Custom / Other</span><strong>BND $${accPaymentMap['Other'].toFixed(2)}</strong></div>
          </div>

          <div class="summary-box">
            <h4>Booking Source Channels</h4>
            <div class="row-item"><span>🚗 Walk-In (${accSourceMap['WALK_IN']?.count || 0})</span><strong>BND $${(accSourceMap['WALK_IN']?.totalRevenue || 0).toFixed(2)}</strong></div>
            <div class="row-item"><span>📞 Phone Calls (${accSourceMap['PHONE']?.count || 0})</span><strong>BND $${(accSourceMap['PHONE']?.totalRevenue || 0).toFixed(2)}</strong></div>
            <div class="row-item"><span>🌐 App / Online (${accSourceMap['ONLINE']?.count || 0})</span><strong>BND $${(accSourceMap['ONLINE']?.totalRevenue || 0).toFixed(2)}</strong></div>
          </div>

          <div class="summary-box">
            <h4>Services & Products Sold</h4>
            ${
              Object.keys(accServiceBreakdown).length > 0
                ? Object.entries(accServiceBreakdown)
                    .map(
                      ([sName, sData]) => `
              <div class="row-item">
                <span>${sName} <small style="color:#64748b;">(${sData.count}x)</small></span>
                <strong>BND $${sData.totalRevenue.toFixed(2)}</strong>
              </div>
            `
                    )
                    .join('')
                : '<div class="row-item"><span>No records found</span></div>'
            }
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Date & Time</th>
              <th>Customer & Vehicle</th>
              <th>Service / Product</th>
              <th>Source</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${
              accBookingsList.length > 0
                ? accBookingsList
                    .map(
                      (bk, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${bk.date}</strong><br/>${bk.timeSlot}</td>
                <td><strong>${bk.customerName}</strong><br/><span style="color:#64748b;">${bk.vehicleInfo || 'N/A'}</span></td>
                <td><strong>${bk.serviceName || 'Standard Car Wash'}</strong></td>
                <td><span class="badge badge-${(bk.bookingSource || 'ONLINE').toLowerCase().replace('_', '')}">${
                        bk.bookingSource || 'ONLINE'
                      }</span></td>
                <td>${bk.paymentBank ? `${bk.paymentBank} Transfer` : 'Cash on Site'}</td>
                <td><strong style="color: ${bk.status === 'COMPLETED' ? '#166534' : '#854d0e'};">${bk.status}</strong></td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">$${(
                  Number(bk.price) || 15.0
                ).toFixed(2)}</td>
              </tr>
            `
                    )
                    .join('')
                : '<tr><td colspan="8" style="text-align: center; padding: 20px;">No bookings match current filter criteria.</td></tr>'
            }
            <tr class="total-row">
              <td colspan="7">TOTAL ACCOUNTING SALES SUMMARY (${accBookingsList.length} ITEMS)</td>
              <td style="text-align: right; font-family: monospace;">BND $${accTotalRevenue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div>AutoShine Business OS • Official Accounting Ledger</div>
          <div>Authorized Operator Signature: ___________________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  const handleSeedSampleLedger = async () => {
    if (!selectedBusiness) return;
    try {
      setIsSeedingLedger(true);
      const res = await fetch('/api/owner/seed-sample-ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ carWashId: selectedBusiness.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed sample ledger');
      await fetchBookings();
      showNotification(`Generated ${data.count} sample sales records from Dec 2025 to present!`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Error generating sample ledger data', 'error');
    } finally {
      setIsSeedingLedger(false);
    }
  };

  // Password change states for Owner Dashboard Settings Tab
  const [showChangePasswordSection, setShowChangePasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  const handleOwnerChangePassword = async (e: React.FormEvent) => {
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

  useEffect(() => {
    // Select first owned location if not already selected, or sync with fresh location data
    if (ownerLocations.length > 0) {
      if (!selectedBusiness) {
        setSelectedBusiness(ownerLocations[0]);
      } else {
        const fresh = ownerLocations.find((loc) => loc.id === selectedBusiness.id);
        if (fresh) {
          setSelectedBusiness(fresh);
        } else {
          setSelectedBusiness(ownerLocations[0]);
        }
      }
    } else {
      setSelectedBusiness(null);
    }
  }, [ownerLocations]);

  // Auto-select focused booking when selectedBusiness or bookings change
  useEffect(() => {
    const bizBookings = bookings.filter((b) => !selectedBusiness || b.carWashId === selectedBusiness.id);
    if (bizBookings.length > 0) {
      const activeOrFirst = bizBookings.find(
        (b) => b.status === BookingStatus.PENDING || b.status === BookingStatus.IN_PROGRESS
      ) || bizBookings[0];
      setFocusedBookingId(activeOrFirst.id);
    } else {
      setFocusedBookingId(null);
    }
  }, [selectedBusiness, bookings]);

  const handleNotificationDetailsClick = (n: any) => {
    if (!n.isRead) markNotificationAsRead(n.id);

    if (n.bookingId) {
      const found = bookings.find((b) => b.id === n.bookingId);
      if (found) {
        setEditingBooking(found);
        setShowEditBookingModal(true);
        return;
      }
    }

    const msgLower = (n.message || '').toLowerCase();
    const matchedBooking = bookings.find(
      (b) =>
        (b.customerName && msgLower.includes(b.customerName.toLowerCase())) ||
        (b.customerEmail && msgLower.includes(b.customerEmail.toLowerCase())) ||
        (b.id && msgLower.includes(b.id.toLowerCase()))
    );

    if (matchedBooking) {
      setEditingBooking(matchedBooking);
      setShowEditBookingModal(true);
    } else {
      setActiveTab('bookings');
      showNotification('Switched to Bookings tab to review all live orders.', 'info');
    }
  };

  // Auto set initial service price when service selected for manual booking
  useEffect(() => {
    if (selectedBusiness) {
      const catalog = getCatalogForLocation(selectedBusiness);
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
  }, [selectedBusiness, showManualBookingModal]);

  // Fetch available slots for manual booking date
  useEffect(() => {
    if (selectedBusiness && mbDate) {
      fetch(`/api/bookings/available-slots?carWashId=${selectedBusiness.id}&date=${mbDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMbAvailableSlots(data);
            if (data.length > 0 && (!mbTimeSlot || !data.some((s) => s.timeSlot === mbTimeSlot))) {
              setMbTimeSlot(data[0].timeSlot);
            }
          }
        })
        .catch((err) => console.error('Error fetching slots for manual booking:', err));
    }
  }, [selectedBusiness, mbDate]);

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !mbName.trim() || !mbPhone.trim() || !mbDate) {
      return;
    }

    setMbIsSubmitting(true);
    const catalog = getCatalogForLocation(selectedBusiness);
    
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
      carWashId: selectedBusiness.id,
      date: mbDate,
      timeSlot: finalSlot,
      customerName: mbName.trim(),
      customerPhone: mbPhone.trim(),
      customerEmail: mbEmail.trim() || undefined,
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
      setMbEmail('');
      setMbVehicle('');
      setMbNotes('');
      setMbSelectedSlots([]);
      setMbSelectedItems([]);
    }
  };

  // Load analytics and logs
  useEffect(() => {
    fetchAnalytics();
    fetchOwnerLogs();
  }, [bookings, locations]);

  const fetchOwnerLogs = async () => {
    try {
      const res = await fetch('/api/owner/logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cw_token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by timestamp descending
        data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOwnerLogs(data);
      }
    } catch (error) {
      console.error('Error fetching owner logs:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/owner/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cw_token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching owner analytics:', error);
    }
  };

  const handleOpenEditConfig = () => {
    if (!selectedBusiness) return;
    setEditName(selectedBusiness.name);
    setEditAddress(selectedBusiness.address);
    setEditLat(selectedBusiness.locationLat);
    setEditLng(selectedBusiness.locationLng);
    setEditDesc(selectedBusiness.description || '');
    setEditDuration(selectedBusiness.slotDuration);
    setEditCapacity(selectedBusiness.capacityPerSlot);
    setEditSchedule(JSON.parse(JSON.stringify(selectedBusiness.openingHours)));
    setEditPhone(selectedBusiness.phone || '');
    setEditInstagram(selectedBusiness.instagram || '');
    setEditLogoUrl(selectedBusiness.logoUrl || '');
    setEditBibdAccountName(selectedBusiness.bibdAccountName || '');
    setEditBibdAccountNo(selectedBusiness.bibdAccountNo || '');
    setEditBibdEnabled(!!selectedBusiness.bibdEnabled);
    setEditBibdQrImageUrl(selectedBusiness.bibdQrImageUrl || '');
    setEditBaiduriAccountName(selectedBusiness.baiduriAccountName || '');
    setEditBaiduriAccountNo(selectedBusiness.baiduriAccountNo || '');
    setEditBaiduriEnabled(!!selectedBusiness.baiduriEnabled);
    setEditBaiduriQrImageUrl(selectedBusiness.baiduriQrImageUrl || '');
    setEditCustomPaymentMethods(selectedBusiness.customPaymentMethods || []);
    setEditPaymentPolicy(selectedBusiness.paymentPolicy || 'PAY_ON_SITE');
    setEditServices(selectedBusiness.services || []);
    setIsEditingConfig(true);
  };

  const compressLogoToMax100KB = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      if (file.type === 'image/svg+xml') {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 300;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const compressedBlob = await compressLogoToMax100KB(file);
      const compressedFile = new File([compressedBlob], `logo_${Date.now()}.jpg`, {
        type: compressedBlob.type || 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('image', compressedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cw_token')}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditLogoUrl(data.url);
        showNotification('Business logo uploaded & compressed under 100KB successfully!', 'success');
      } else {
        alert('Failed to upload logo image.');
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Error uploading business logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleQrUpload = async (file: File, type: 'bibd' | 'baiduri' | 'custom') => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cw_token')}`,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'bibd') {
          setEditBibdQrImageUrl(data.url);
        } else if (type === 'baiduri') {
          setEditBaiduriQrImageUrl(data.url);
        } else {
          setNewQrImageUrl(data.url);
        }
      } else {
        alert('Failed to upload QR code image. Please make sure it is a JPG/PNG under 3MB.');
      }
    } catch (error) {
      console.error('Error uploading QR code:', error);
      alert('An error occurred during QR upload.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !editSchedule) return;

    const data = {
      name: editName,
      address: editAddress,
      locationLat: editLat,
      locationLng: editLng,
      description: editDesc,
      slotDuration: editDuration,
      capacityPerSlot: editCapacity,
      openingHours: editSchedule,
      phone: editPhone,
      instagram: editInstagram,
      bibdAccountName: editBibdAccountName,
      bibdAccountNo: editBibdAccountNo,
      bibdEnabled: editBibdEnabled,
      bibdQrImageUrl: editBibdQrImageUrl,
      baiduriAccountName: editBaiduriAccountName,
      baiduriAccountNo: editBaiduriAccountNo,
      baiduriEnabled: editBaiduriEnabled,
      baiduriQrImageUrl: editBaiduriQrImageUrl,
      customPaymentsJson: JSON.stringify(editCustomPaymentMethods),
      paymentPolicy: editPaymentPolicy,
      services: editServices,
      logoUrl: editLogoUrl,
    };

    const success = await updateLocationConfig(selectedBusiness.id, data);
    if (success) {
      setIsEditingConfig(false);
      // Update selected business state
      setSelectedBusiness({
        ...selectedBusiness,
        ...data,
        customPaymentMethods: editCustomPaymentMethods,
        services: editServices,
      });
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !empEmail || !empName) return;

    const success = await createEmployee(empEmail, empName, selectedBusiness.id, empPassword);
    if (success) {
      setEmpName('');
      setEmpEmail('');
      setEmpPassword('');
      setShowEmployeeModal(false);
    }
  };

  const handleScheduleDayToggle = (day: keyof WeeklySchedule) => {
    if (!editSchedule) return;
    const updated = { ...editSchedule };
    updated[day].isOpen = !updated[day].isOpen;
    setEditSchedule(updated);
  };

  const handleScheduleTimeChange = (day: keyof WeeklySchedule, field: 'open' | 'close', val: string) => {
    if (!editSchedule) return;
    const updated = { ...editSchedule };
    updated[day][field] = val;
    setEditSchedule(updated);
  };

  const handleScheduleBreakToggle = (day: keyof WeeklySchedule) => {
    if (!editSchedule) return;
    const updated = { ...editSchedule };
    const daySched = updated[day];
    daySched.hasBreak = !daySched.hasBreak;
    if (daySched.hasBreak) {
      if (!daySched.breakStart) daySched.breakStart = '12:00';
      if (!daySched.breakEnd) daySched.breakEnd = '13:00';
    }
    setEditSchedule(updated);
  };

  const handleScheduleBreakTimeChange = (day: keyof WeeklySchedule, field: 'breakStart' | 'breakEnd', val: string) => {
    if (!editSchedule) return;
    const updated = { ...editSchedule };
    updated[day][field] = val;
    setEditSchedule(updated);
  };

  const handleAddCustomPayment = () => {
    const finalProviderName = newProviderName === 'Custom Method' ? customProviderName : newProviderName;
    if (!finalProviderName || !newAccountName || !newAccountNo) return;
    const newMethod: CustomPaymentMethod = {
      id: Math.random().toString(36).substring(2, 9),
      providerName: finalProviderName,
      accountName: newAccountName.toUpperCase(),
      accountNo: newAccountNo,
      instructions: newInstructions || undefined,
      qrImageUrl: newQrImageUrl || undefined,
      isEnabled: true
    };
    setEditCustomPaymentMethods([...editCustomPaymentMethods, newMethod]);
    // reset inputs
    setNewProviderName('');
    setCustomProviderName('');
    setNewAccountName('');
    setNewAccountNo('');
    setNewInstructions('');
    setNewQrImageUrl('');
  };

  const handleToggleCustomPayment = (id: string) => {
    setEditCustomPaymentMethods(editCustomPaymentMethods.map(m => 
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    ));
  };

  const handleDeleteCustomPayment = (id: string) => {
    setEditCustomPaymentMethods(editCustomPaymentMethods.filter(m => m.id !== id));
  };


  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    await updateBookingStatus(bookingId, status);
  };

  // Filter bookings for selected business
  const filteredBookings = bookings.filter((b) => !selectedBusiness || b.carWashId === selectedBusiness.id);

  // Filter employees for selected business
  const filteredEmployees = employees.filter((emp) => !selectedBusiness || emp.businessId === selectedBusiness.id);

  // Customer Directory Map Calculation
  const customerMap = new Map<string, {
    id: string;
    name: string;
    phone: string;
    email?: string;
    vehicles: string[];
    totalBookings: number;
    completedBookings: number;
    totalSpent: number;
    lastBookingDate: string;
    firstLetter: string;
  }>();

  filteredBookings.forEach((b) => {
    const rawName = (b.customerName || 'Anonymous Customer').trim();
    const rawPhone = (b.customerPhone || '').trim();
    const key = (rawPhone || rawName).toLowerCase();

    const existing = customerMap.get(key);
    const bPrice = Number(b.price) || 0;
    const isCompleted = b.status === BookingStatus.COMPLETED;
    const vehicleStr = b.vehicleInfo ? b.vehicleInfo.trim() : '';

    if (!existing) {
      let letter = rawName.charAt(0).toUpperCase();
      if (!/^[A-Z]$/i.test(letter)) {
        letter = '#';
      }
      customerMap.set(key, {
        id: key,
        name: rawName,
        phone: rawPhone,
        email: b.customerEmail || '',
        vehicles: vehicleStr ? [vehicleStr] : [],
        totalBookings: 1,
        completedBookings: isCompleted ? 1 : 0,
        totalSpent: isCompleted ? bPrice : 0,
        lastBookingDate: b.date || '',
        firstLetter: letter,
      });
    } else {
      existing.totalBookings += 1;
      if (isCompleted) {
        existing.completedBookings += 1;
        existing.totalSpent += bPrice;
      }
      if (vehicleStr && !existing.vehicles.includes(vehicleStr)) {
        existing.vehicles.push(vehicleStr);
      }
      if (b.date && b.date > existing.lastBookingDate) {
        existing.lastBookingDate = b.date;
      }
      if (b.customerEmail && !existing.email) {
        existing.email = b.customerEmail;
      }
    }
  });

  const allCustomersList = Array.from(customerMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  );

  const filteredCustomersList = allCustomersList.filter((cust) => {
    if (customerAlphabetFilter !== 'ALL') {
      if (customerAlphabetFilter === '#') {
        if (cust.firstLetter !== '#') return false;
      } else {
        if (cust.firstLetter !== customerAlphabetFilter) return false;
      }
    }
    if (customerSearchQuery.trim()) {
      const q = customerSearchQuery.toLowerCase();
      const matchName = cust.name.toLowerCase().includes(q);
      const matchPhone = cust.phone.toLowerCase().includes(q);
      const matchEmail = cust.email?.toLowerCase().includes(q);
      const matchVehicle = cust.vehicles.some((v) => v.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchEmail && !matchVehicle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-24 md:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Owner Dashboard
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Configure slots scheduler, manage staff operator accounts, and coordinate bookings.
          </p>
        </div>

        {/* Business Selector Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Business Focus:</span>
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const b = ownerLocations.find((loc) => loc.id === e.target.value);
              if (b) setSelectedBusiness(b);
            }}
            className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 shadow-xs"
            id="owner-business-selector"
          >
            {ownerLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ⚠️ Business Suspension / Offboarding Alert */}
      {selectedBusiness && !selectedBusiness.isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start gap-4 shadow-sm animate-pulse-subtle" id="owner-dashboard-suspension-alert">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-150 text-amber-700 shrink-0">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-extrabold text-amber-950 text-sm">Business Suspension Alert — Location Inactive</h3>
            <p className="text-amber-800 text-xs mt-1 leading-relaxed">
              Your business location <strong className="text-amber-950 font-black">{selectedBusiness.name}</strong> has been set to <span className="font-black">Inactive / Suspended</span> by the AUTOSHINE BN Administration (possibly due to offboarding, licensing updates, or billing inactivity).
            </p>
            <p className="text-amber-700 text-[11px] mt-2 font-medium">
              🚨 <strong className="font-bold">What this means:</strong> Your booking slots are completely hidden from customer search maps and directories. No new bookings can be made. To request reactivation or coordinate offboarding, please contact our support desk at <strong className="font-bold">support@autoshine.bn</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Responsive Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-150 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-4 py-2 flex justify-around items-center md:sticky md:top-4 md:bottom-auto md:left-auto md:right-auto md:z-30 md:bg-slate-50/90 md:border md:border-slate-200/60 md:shadow-xs md:rounded-2xl md:py-2 md:px-3 md:w-max md:mx-auto md:mb-6 md:gap-1.5 animate-fade-in">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'text-indigo-600 font-bold bg-indigo-50/85'
              : 'text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-5 w-5 md:h-4 md:w-4" />
          <span className="text-[10px] md:text-xs">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'bookings'
              ? 'text-indigo-600 font-bold bg-indigo-50/85'
              : 'text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-5 w-5 md:h-4 md:w-4" />
          <span className="text-[10px] md:text-xs font-semibold">Bookings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'customers'
              ? 'text-indigo-600 font-bold bg-indigo-50/85'
              : 'text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-50'
          }`}
          id="owner-tab-customers"
        >
          <Users className="h-5 w-5 md:h-4 md:w-4" />
          <span className="text-[10px] md:text-xs font-semibold">Customer Directory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-indigo-600 font-bold bg-indigo-50/85'
              : 'text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="h-5 w-5 md:h-4 md:w-4" />
          <span className="text-[10px] md:text-xs font-semibold">Calendar & Slots</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-indigo-600 font-bold bg-indigo-50/85'
              : 'text-slate-400 font-medium hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sliders className="h-5 w-5 md:h-4 md:w-4" />
          <span className="text-[10px] md:text-xs font-semibold">Operations</span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Analytics Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Period Revenue</span>
                <span className="text-2xl font-black text-slate-800 font-mono">
                  ${accTotalRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="bg-sky-50 text-sky-600 p-3 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Total Slots Booked</span>
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {analytics.totalBookings}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Completed Cleanings</span>
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {analytics.completedCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block">Pending Approvals</span>
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {analytics.pendingCount}
                </span>
              </div>
            </div>
          </div>

          {/* 🔔 In-App Live Notifications & Activity Feed Widget */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                  <Bell className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                    Live Booking Notifications & Activity
                    {unreadNotificationCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                        {unreadNotificationCount} New
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Real-time alerts when customers book or modify appointments</p>
                </div>
              </div>

              {unreadNotificationCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-300 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {appNotifications.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs font-medium bg-slate-800/40 rounded-2xl border border-slate-700/40">
                  <Bell className="h-6 w-6 mx-auto mb-1.5 text-slate-500 opacity-60" />
                  No booking notifications yet. New customer bookings will appear here instantly!
                </div>
              ) : (
                appNotifications.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationDetailsClick(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      !n.isRead
                        ? 'bg-slate-800/90 border-sky-500/50 shadow-sm ring-1 ring-sky-500/30'
                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug line-clamp-2 mt-1">
                        {n.message}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationDetailsClick(n);
                        }}
                        className="text-sky-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        View Details →
                      </button>
                      {!n.isRead && (
                        <span className="text-[10px] font-extrabold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/50">
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 📊 Accounting & Sales Revenue Module */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
            {/* Header with Title and PDF Export Button */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 shrink-0" />
                  <h2 className="text-base sm:text-xl font-black text-slate-800">
                    Financial Accounting & Sales Ledger
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                  Itemized sales summary by service/product type, payment method, and booking source.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleSeedSampleLedger}
                    disabled={isSeedingLedger}
                    className="w-full md:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.99] text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Generate sample sales data from December 2025 to present (Dev Only)"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 shrink-0 ${isSeedingLedger ? 'animate-spin' : ''}`} />
                    <span>{isSeedingLedger ? 'Generating...' : 'Seed Sample Ledger (Dev Only)'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportPdfReport}
                  className="w-full md:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Export PDF Report</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Bar (Mobile Optimized) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/80 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60">
              {/* Timeframe selector & Month/Week Pickers */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* View Mode Segmented Control */}
                <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setAccountingTimeframe('WEEKLY')}
                    className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-center text-[11px] sm:text-xs ${
                      accountingTimeframe === 'WEEKLY' ? 'bg-indigo-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingTimeframe('MONTHLY')}
                    className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-center text-[11px] sm:text-xs ${
                      accountingTimeframe === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingTimeframe('ALL')}
                    className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-center text-[11px] sm:text-xs ${
                      accountingTimeframe === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All-Time
                  </button>
                </div>

                {/* Month Navigator & Dropdown Pickers when MONTHLY */}
                {accountingTimeframe === 'MONTHLY' && (() => {
                  const [selYearStr, selMonthStr] = selectedAccountingMonth.split('-');
                  const selYearNum = Number(selYearStr) || new Date().getFullYear();
                  const selMonthNum = Number(selMonthStr) || (new Date().getMonth() + 1);

                  const currentYear = new Date().getFullYear();
                  const yearsList = [];
                  for (let y = 2023; y <= Math.max(currentYear + 5, 2030); y++) {
                    yearsList.push(y);
                  }

                  const monthsList = [
                    { num: 1, name: 'January' },
                    { num: 2, name: 'February' },
                    { num: 3, name: 'March' },
                    { num: 4, name: 'April' },
                    { num: 5, name: 'May' },
                    { num: 6, name: 'June' },
                    { num: 7, name: 'July' },
                    { num: 8, name: 'August' },
                    { num: 9, name: 'September' },
                    { num: 10, name: 'October' },
                    { num: 11, name: 'November' },
                    { num: 12, name: 'December' },
                  ];

                  return (
                    <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-slate-800 shadow-2xs w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        title="Previous Month"
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-600 active:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0 hidden sm:block" />
                        
                        {/* Month Select Dropdown */}
                        <select
                          value={selMonthNum}
                          onChange={(e) => {
                            const m = String(e.target.value).padStart(2, '0');
                            setSelectedAccountingMonth(`${selYearNum}-${m}`);
                          }}
                          className="bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-900 text-xs font-black rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
                          title="Select Month"
                        >
                          {monthsList.map((m) => (
                            <option key={m.num} value={m.num}>
                              {m.name}
                            </option>
                          ))}
                        </select>

                        {/* Year Select Dropdown */}
                        <select
                          value={selYearNum}
                          onChange={(e) => {
                            const y = e.target.value;
                            const m = String(selMonthNum).padStart(2, '0');
                            setSelectedAccountingMonth(`${y}-${m}`);
                          }}
                          className="bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-900 text-xs font-black rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors"
                          title="Select Year"
                        >
                          {yearsList.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextMonth}
                        title="Next Month"
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-600 active:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}

                {/* Week Navigator & Picker when WEEKLY */}
                {accountingTimeframe === 'WEEKLY' && (
                  <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-slate-800 shadow-2xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      title="Previous Week"
                      className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-600 active:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0 hidden sm:block" />
                      <span className="font-black text-indigo-950 text-[11px] sm:text-xs truncate">
                        {accWeekInfo.rangeFormatted}
                      </span>
                      <div className="flex items-center gap-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-800 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Jump to:</span>
                        <input
                          type="date"
                          value={selectedAccountingWeekRefDate}
                          onChange={(e) => e.target.value && setSelectedAccountingWeekRefDate(e.target.value)}
                          className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer p-0"
                          title="Select any date to jump to that week"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      title="Next Week"
                      className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-600 hover:text-indigo-600 active:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status and Category Filter Pills (Scrollable on Mobile) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setAccountingStatusFilter('COMPLETED_ONLY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      accountingStatusFilter === 'COMPLETED_ONLY' ? 'bg-emerald-600 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Completed Washes
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      accountingStatusFilter === 'ALL' ? 'bg-slate-800 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Bookings
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setAccountingCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      accountingCategoryFilter === 'ALL' ? 'bg-sky-600 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingCategoryFilter('SERVICES')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      accountingCategoryFilter === 'SERVICES' ? 'bg-sky-600 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountingCategoryFilter('PRODUCTS')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      accountingCategoryFilter === 'PRODUCTS' ? 'bg-sky-600 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Products
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Banner (2-column grid on mobile) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200/80 p-3 sm:p-4 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block truncate">Total Revenue</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono block">
                  ${accTotalRevenue.toFixed(2)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-700 mt-0.5 block truncate">
                  {accountingTimeframe === 'WEEKLY' ? 'This Week' : accountingTimeframe === 'MONTHLY' ? 'This Month' : 'All History'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Volume</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono block">
                  {accTotalCount} <span className="text-xs font-sans text-slate-500 font-semibold">orders</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">Recorded entries</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">Avg Ticket Price</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono block">
                  ${accAvgTicket.toFixed(2)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">Avg per order</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">Top Item</span>
                </div>
                <span className="text-xs sm:text-base font-black text-slate-800 block truncate" title={accTopService}>
                  {accTopService}
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-600 font-extrabold mt-0.5 block font-mono">
                  ${accTopServiceRev.toFixed(2)} rev
                </span>
              </div>
            </div>

            {/* Payment Method & Booking Source Breakdown Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              <div className="lg:col-span-8 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 w-full sm:w-auto block sm:inline">Payment:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700">
                    💵 Cash: <strong className="font-mono text-slate-900">${accPaymentMap['Cash'].toFixed(2)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-xl text-[11px] font-bold text-sky-800">
                    🏦 BIBD: <strong className="font-mono text-sky-950">${accPaymentMap['BIBD'].toFixed(2)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-xl text-[11px] font-bold text-purple-800">
                    🏦 Baiduri: <strong className="font-mono text-purple-950">${accPaymentMap['Baiduri'].toFixed(2)}</strong>
                  </span>
                  {accPaymentMap['Other'] > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800">
                      💳 Other: <strong className="font-mono text-amber-950">${accPaymentMap['Other'].toFixed(2)}</strong>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 w-full sm:w-auto block sm:inline">Channel:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200/90 rounded-xl text-[11px] font-bold text-emerald-800">
                    🚗 Walk-In: <strong className="font-mono text-emerald-950">{accSourceMap['WALK_IN']?.count || 0}</strong> <span className="text-[10px] text-emerald-700 font-mono">(${ (accSourceMap['WALK_IN']?.totalRevenue || 0).toFixed(2) })</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200/90 rounded-xl text-[11px] font-bold text-amber-800">
                    📞 Phone: <strong className="font-mono text-amber-950">{accSourceMap['PHONE']?.count || 0}</strong> <span className="text-[10px] text-amber-700 font-mono">(${ (accSourceMap['PHONE']?.totalRevenue || 0).toFixed(2) })</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 border border-sky-200/90 rounded-xl text-[11px] font-bold text-sky-800">
                    🌐 App: <strong className="font-mono text-sky-950">{accSourceMap['ONLINE']?.count || 0}</strong> <span className="text-[10px] text-sky-700 font-mono">(${ (accSourceMap['ONLINE']?.totalRevenue || 0).toFixed(2) })</span>
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, vehicle, service..."
                  value={accountingSearch}
                  onChange={(e) => setAccountingSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {accountingSearch && (
                  <button
                    type="button"
                    onClick={() => setAccountingSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Accounting Table View */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-extrabold">
                      <th className="p-3 pl-4">#</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Customer & Vehicle</th>
                      <th className="p-3">Service / Product</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                      <th className="p-3 pr-4 text-right">Amount (BND)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {accBookingsList.length > 0 ? (
                      accBookingsList.map((bk, idx) => {
                        const matchedSvc = selectedBusiness?.services?.find(
                          (s) => s.id === bk.serviceId || s.name.toLowerCase() === (bk.serviceName || '').toLowerCase()
                        );
                        const isProduct = matchedSvc?.type === 'product';

                        return (
                          <tr key={bk.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <span className="font-extrabold text-slate-800 block">{bk.date}</span>
                              <span className="text-[11px] text-slate-500 font-mono">{bk.timeSlot}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-900 block">{bk.customerName}</span>
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Car className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{bk.vehicleInfo || 'N/A'}</span>
                                  </span>
                                </div>
                                {bk.customerPhone && (
                                  <button
                                    onClick={() => openWhatsAppCustomer(bk.customerPhone, bk.customerName, bk.date, bk.timeSlot, bk.serviceName)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
                                    title="Send WhatsApp Message"
                                  >
                                    <MessageCircle className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{bk.serviceName || 'Standard Car Wash'}</span>
                                {isProduct ? (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-extrabold uppercase">
                                    Product
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-[9px] font-extrabold uppercase">
                                    Service
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {bk.bookingSource === 'WALK_IN' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                                  🚗 Walk-In
                                </span>
                              ) : bk.bookingSource === 'PHONE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                                  📞 Phone
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[10px] font-extrabold border border-sky-200">
                                  🌐 Online
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {bk.paymentBank ? (
                                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {bk.paymentBank} Transfer
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                  Cash on Site
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                  bk.status === BookingStatus.COMPLETED
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : bk.status === BookingStatus.IN_PROGRESS
                                    ? 'bg-sky-100 text-sky-800'
                                    : bk.status === BookingStatus.PENDING
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {bk.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBooking(bk);
                                  setShowEditBookingModal(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Edit Services, Add-ons & Total Price"
                              >
                                <Pencil className="w-3 h-3 text-indigo-600" />
                                <span>Edit</span>
                              </button>
                            </td>
                            <td className="p-3 pr-4 text-right font-mono font-black text-slate-900 text-sm">
                              ${(Number(bk.price) || 15.0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No accounting records found matching current criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Summary Total Footer */}
                  {accBookingsList.length > 0 && (
                    <tfoot>
                      <tr className="bg-indigo-50/90 border-t-2 border-indigo-500/30 text-indigo-950 font-black text-xs">
                        <td colSpan={8} className="p-3.5 pl-4 uppercase tracking-wider">
                          Accounting Summary ({accBookingsList.length} total entries)
                        </td>
                        <td className="p-3.5 pr-4 text-right font-mono text-base text-emerald-700">
                          ${accTotalRevenue.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {accBookingsList.length > 0 ? (
                  accBookingsList.map((bk, idx) => {
                    const matchedSvc = selectedBusiness?.services?.find(
                      (s) => s.id === bk.serviceId || s.name.toLowerCase() === (bk.serviceName || '').toLowerCase()
                    );
                    const isProduct = matchedSvc?.type === 'product';

                    return (
                      <div key={bk.id} className="p-3.5 space-y-2.5 bg-white hover:bg-slate-50/60 transition-colors">
                        {/* Top row: Index + Service/Product Name & Price */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm leading-tight">
                                  {bk.serviceName || 'Standard Car Wash'}
                                </span>
                                {isProduct ? (
                                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-black uppercase">
                                    Product
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded text-[9px] font-black uppercase">
                                    Service
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-600 font-semibold block mt-0.5">
                                {bk.customerName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-emerald-700 text-base block">
                              ${(Number(bk.price) || 15.0).toFixed(2)}
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase mt-0.5 ${
                                bk.status === BookingStatus.COMPLETED
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bk.status === BookingStatus.IN_PROGRESS
                                  ? 'bg-sky-100 text-sky-800'
                                  : bk.status === BookingStatus.PENDING
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {bk.status}
                            </span>
                          </div>
                        </div>

                        {/* Details row: Vehicle & Date */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-1.5 truncate">
                            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-medium text-slate-700">{bk.vehicleInfo || 'Vehicle N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-700">{bk.date} ({bk.timeSlot})</span>
                          </div>
                        </div>

                        {/* Badges row: Source & Payment */}
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <div>
                            {bk.bookingSource === 'WALK_IN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200/80">
                                🚗 Walk-In
                              </span>
                            ) : bk.bookingSource === 'PHONE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200/80">
                                📞 Phone
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[10px] font-extrabold border border-sky-200/80">
                                🌐 Online
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {bk.paymentBank ? (
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                🏦 {bk.paymentBank} Transfer
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                                💵 Cash on Site
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setEditingBooking(bk);
                                setShowEditBookingModal(true);
                              }}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Edit Services, Add-ons & Total Price"
                            >
                              <Pencil className="w-3 h-3 text-indigo-600" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No accounting records found matching current criteria.
                  </div>
                )}
                {accBookingsList.length > 0 && (
                  <div className="p-3.5 bg-indigo-50/90 text-indigo-950 flex items-center justify-between font-black text-xs border-t-2 border-indigo-500/20">
                    <span className="uppercase tracking-wider">Total ({accBookingsList.length} items):</span>
                    <span className="font-mono text-emerald-700 text-base font-black">${accTotalRevenue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Quick KPI summary */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/80">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl font-black text-slate-800">
                      Customer Directory & CRM
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Alphabetically organized client directory with A-Z index, quick contact tools, and vehicle logs
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMbName('');
                  setMbPhone('');
                  setMbVehicle('');
                  setMbEmail('');
                  setMbNotes('');
                  setShowManualBookingModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-customer-new-manual-booking"
              >
                <Plus className="w-4 h-4" />
                <span>New Customer / Walk-In</span>
              </button>
            </div>

            {/* KPI Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clients</span>
                <span className="text-xl font-black text-slate-800 font-mono block mt-0.5">{allCustomersList.length}</span>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Repeat Clients</span>
                <span className="text-xl font-black text-emerald-900 font-mono block mt-0.5">
                  {allCustomersList.filter((c) => c.totalBookings > 1).length}
                </span>
              </div>
              <div className="bg-sky-50/60 border border-sky-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">Total Customer Revenue</span>
                <span className="text-xl font-black text-sky-950 font-mono block mt-0.5">
                  ${allCustomersList.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Avg Ticket / Client</span>
                <span className="text-xl font-black text-indigo-950 font-mono block mt-0.5">
                  ${(allCustomersList.length > 0 ? allCustomersList.reduce((sum, c) => sum + c.totalSpent, 0) / allCustomersList.length : 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Alphabetical A-Z Filter Bar & Search Input */}
            <div className="space-y-3 bg-slate-50/90 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Alphabetical Index (A-Z)</span>
                  <span className="text-[11px] text-slate-400 font-medium">({filteredCustomersList.length} showing)</span>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, phone, plate..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* A-Z Index Letter Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-2 pt-1 max-w-full touch-pan-x scrollbar-thin">
                {['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => {
                  const countForLetter = letter === 'ALL'
                    ? allCustomersList.length
                    : letter === '#'
                    ? allCustomersList.filter((c) => c.firstLetter === '#').length
                    : allCustomersList.filter((c) => c.firstLetter === letter).length;

                  const isSelected = customerAlphabetFilter === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setCustomerAlphabetFilter(letter)}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30'
                          : countForLetter > 0
                          ? 'bg-white hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-2xs'
                          : 'bg-slate-100 text-slate-300 border border-transparent cursor-not-allowed opacity-60'
                      }`}
                      title={`${letter}: ${countForLetter} customer(s)`}
                    >
                      <span>{letter}</span>
                      {countForLetter > 0 && letter !== 'ALL' && (
                        <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                          {countForLetter}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customers Cards Grid */}
            <div>
              {filteredCustomersList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No customers found matching current filters.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try selecting 'ALL' or clearing search terms.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredCustomersList.map((cust) => {
                    return (
                      <div
                        key={cust.id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                                {cust.name.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                                  {cust.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {cust.phone || 'No Phone Recorded'}
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[10px] font-black font-mono shrink-0">
                              ${cust.totalSpent.toFixed(2)}
                            </span>
                          </div>

                          {/* Vehicles & Email */}
                          <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-800">Vehicles:</span>
                              <span className="truncate text-slate-600 font-mono">
                                {cust.vehicles.length > 0 ? cust.vehicles.join(', ') : 'N/A'}
                              </span>
                            </div>
                            {cust.email && (
                              <div className="flex items-center gap-1.5 text-[11px] truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate font-mono text-slate-500">{cust.email}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                              <span>Total Washes: <strong className="text-slate-700 font-bold">{cust.totalBookings}</strong></span>
                              <span>Last Visit: <strong className="text-slate-700 font-bold">{cust.lastBookingDate || 'N/A'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Contact & Booking Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          {cust.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsAppCustomer(cust.phone, cust.name)}
                              className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMbName(cust.name);
                              setMbPhone(cust.phone);
                              setMbVehicle(cust.vehicles[0] || '');
                              setMbEmail(cust.email || '');
                              setShowManualBookingModal(true);
                            }}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                            <span>Quick Book</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          {selectedBusiness && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Operational Parameters</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Adjust slot durations and capacity</p>
                </div>
                {!isEditingConfig && (
                  <button
                    onClick={handleOpenEditConfig}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                    id="edit-config-btn"
                  >
                    <Edit2 className="h-3 w-3" /> Edit Config
                  </button>
                )}
              </div>

              {!isEditingConfig ? (
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  {selectedBusiness.logoUrl ? (
                    <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                      <img
                        src={selectedBusiness.logoUrl}
                        alt={selectedBusiness.name}
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Official Business Logo</span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCheck className="w-3.5 h-3.5" /> Displayed on customer portal & receipts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3.5 bg-slate-50/60 border border-dashed border-slate-200 p-3.5 rounded-2xl">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0">
                        Logo
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">No Business Logo Uploaded</span>
                        <span className="text-[10px] text-slate-400 block">Click "Edit Config" to upload your brand logo (&lt;100KB)</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Business Name</span>
                      <strong className="text-slate-700">{selectedBusiness.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Address</span>
                      <strong className="text-slate-700 truncate max-w-xs">{selectedBusiness.address}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Slot Duration</span>
                      <strong className="text-slate-700">{selectedBusiness.slotDuration} minutes</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Capacity Per Slot</span>
                      <strong className="text-slate-700">{selectedBusiness.capacityPerSlot} vehicles</strong>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Weekly Operational Schedule
                    </span>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                      {Object.entries(selectedBusiness.openingHours).map(([day, val]: any) => (
                        <div key={day} className="flex items-center justify-between p-2.5 bg-white">
                          <span className="capitalize font-semibold text-slate-700">{day}</span>
                          {val.isOpen ? (
                            <span className="font-mono bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-bold">
                              {val.open} - {val.close}
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded uppercase">
                              Closed
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 text-left">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Business Branding Logo (Enforced &lt;100KB)
                    </label>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Upload your car wash logo. Images are automatically resized and compressed client-side to ensure the file size stays under 100KB.
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      {editLogoUrl ? (
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                          <img src={editLogoUrl} className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-xs" alt="Business Logo" />
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-800 block">Logo Uploaded</span>
                            <span className="text-[10px] text-emerald-600 font-bold block">Optimized &lt;100KB</span>
                            <button
                              type="button"
                              onClick={() => setEditLogoUrl('')}
                              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer mt-0.5"
                            >
                              Remove Logo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 cursor-pointer rounded-2xl py-3 px-4 text-center transition-all">
                          <span className="text-xs text-slate-700 font-bold flex items-center gap-2">
                            <Upload className="w-4 h-4 text-indigo-600" />
                            {isUploadingLogo ? 'Compressing & Uploading Logo...' : 'Upload Business Logo (Auto-Compress <100KB)'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingLogo}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleLogoUpload(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Business Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 6738123456 (with country code, no + or spaces)"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Used by customers to send booking confirmation and status alerts directly to your WhatsApp.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Instagram Username</label>
                    <input
                      type="text"
                      placeholder="e.g. crystal_wash (no @ symbols)"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value.trim().replace(/^@/, ''))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Used to display an Instagram link on your business location card so customers can visit your page.</p>
                  </div>

                  {/* Booking Payment Policy Selector */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Booking Payment Policy</h4>
                        <p className="text-[10px] text-slate-400">Choose when and how customers should pay for their bookings.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditPaymentPolicy('PAY_ON_SITE')}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          editPaymentPolicy === 'PAY_ON_SITE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-50'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">Flexible / Pay on Site</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                          Allow customers to choose between Cash (Pay on Site) and manual Bank Transfer prepaid screenshots.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditPaymentPolicy('PRE_PAYMENT')}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          editPaymentPolicy === 'PRE_PAYMENT'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-50'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          <span className="text-xs font-bold">Prepayment Only</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                          Enforce upfront bank transfer (BIBD/Baiduri) prepayments. Customers must upload screenshots to confirm.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Bank transfer settings commented out for now - using Pay at Counter on site
                  <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-sky-100 rounded-lg text-sky-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Brunei Local Bank Transfer Details</h4>
                        <p className="text-[10px] text-slate-400">Configure bank accounts displayed to customers choosing manual transfer.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white border border-slate-200/80 p-3 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editBibdEnabled}
                              onChange={(e) => setEditBibdEnabled(e.target.checked)}
                              className="h-4 w-4 accent-sky-600 rounded cursor-pointer"
                            />
                            <span>Enable BIBD (QuickPay / Transfer)</span>
                          </label>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100/50">BIBD</span>
                        </div>

                        {editBibdEnabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Holder Name</label>
                              <input
                                type="text"
                                placeholder="e.g. CRYSTAL DETAILING ENTERPRISE"
                                value={editBibdAccountName}
                                onChange={(e) => setEditBibdAccountName(e.target.value.toUpperCase())}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                required={editBibdEnabled}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">BIBD Account Number</label>
                              <input
                                type="text"
                                placeholder="e.g. 0015010023456"
                                value={editBibdAccountNo}
                                onChange={(e) => setEditBibdAccountNo(e.target.value.replace(/[^0-9-]/g, ''))}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                required={editBibdEnabled}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-100">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official QuickPay QR Code Image (Optional)</label>
                              <div className="flex items-center gap-3">
                                {editBibdQrImageUrl ? (
                                  <div className="flex items-center gap-2 bg-amber-50/55 border border-amber-200 rounded-lg p-1.5 pr-3">
                                    <img src={editBibdQrImageUrl} className="w-10 h-10 object-cover rounded border border-amber-300" alt="BIBD QR" />
                                    <div className="text-left">
                                      <span className="text-[10px] text-slate-500 block font-semibold">QR Code Uploaded</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditBibdQrImageUrl('')}
                                        className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                                      >
                                        Remove QR
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    <label className="flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/10 cursor-pointer rounded-xl py-2 px-3 text-center transition-colors">
                                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Upload Official QuickPay QR Image
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleQrUpload(e.target.files[0], 'bibd');
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200/80 p-3 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editBaiduriEnabled}
                              onChange={(e) => setEditBaiduriEnabled(e.target.checked)}
                              className="h-4 w-4 accent-sky-600 rounded cursor-pointer"
                            />
                            <span>Enable Baiduri (QPay / Transfer)</span>
                          </label>
                          <span className="text-[9px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100/50">Baiduri</span>
                        </div>

                        {editBaiduriEnabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Holder Name</label>
                              <input
                                type="text"
                                placeholder="e.g. CRYSTAL DETAILING ENTERPRISE"
                                value={editBaiduriAccountName}
                                onChange={(e) => setEditBaiduriAccountName(e.target.value.toUpperCase())}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                required={editBaiduriEnabled}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Baiduri Account Number</label>
                              <input
                                type="text"
                                placeholder="e.g. 0200110123456"
                                value={editBaiduriAccountNo}
                                onChange={(e) => setEditBaiduriAccountNo(e.target.value.replace(/[^0-9-]/g, ''))}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                required={editBaiduriEnabled}
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-100">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official Qpay QR Code Image (Optional)</label>
                              <div className="flex items-center gap-3">
                                {editBaiduriQrImageUrl ? (
                                  <div className="flex items-center gap-2 bg-red-50/55 border border-red-200 rounded-lg p-1.5 pr-3">
                                    <img src={editBaiduriQrImageUrl} className="w-10 h-10 object-cover rounded border border-red-300" alt="Baiduri QR" />
                                    <div className="text-left">
                                      <span className="text-[10px] text-slate-500 block font-semibold">QR Code Uploaded</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditBaiduriQrImageUrl('')}
                                        className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                                      >
                                        Remove QR
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    <label className="flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50 hover:bg-red-50/10 cursor-pointer rounded-xl py-2 px-3 text-center transition-colors">
                                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Upload Official Qpay QR Image
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleQrUpload(e.target.files[0], 'baiduri');
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Other Brunei Local Banks & E-Wallets
                        </label>
                        <p className="text-[10px] text-slate-400 mb-3">
                          Add custom local payment options such as <strong>TARUS Instant Transfer</strong>, <strong>DST Pocket</strong>, <strong>Progresif Pay</strong>, Standard Chartered, or Maybank.
                        </p>

                        {editCustomPaymentMethods.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {editCustomPaymentMethods.map((method) => (
                              <div key={method.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col gap-1.5 relative">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomPayment(method.id)}
                                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  title="Remove Payment Method"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <div className="flex items-start gap-2 pr-6">
                                  <input
                                    type="checkbox"
                                    checked={method.isEnabled}
                                    onChange={() => handleToggleCustomPayment(method.id)}
                                    className="h-4 w-4 accent-sky-600 rounded cursor-pointer mt-0.5"
                                  />
                                  <div className="text-xs flex-1">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                      {method.providerName}
                                      {!method.isEnabled && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded">Disabled</span>}
                                    </span>
                                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                                      <div><strong className="text-[10px] text-slate-500 uppercase">Holder:</strong> {method.accountName}</div>
                                      <div><strong className="text-[10px] text-slate-500 uppercase">Number:</strong> <span className="font-mono">{method.accountNo}</span></div>
                                      {method.instructions && <div><strong className="text-[10px] text-slate-500 uppercase">Instructions:</strong> {method.instructions}</div>}
                                    </div>
                                  </div>
                                  {method.qrImageUrl && (
                                    <img src={method.qrImageUrl} className="w-12 h-12 object-cover rounded border border-slate-200 shadow-sm" alt="custom QR" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">Add a New Local Payment Method</span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Provider Name</label>
                              <select
                                value={newProviderName}
                                onChange={(e) => setNewProviderName(e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                              >
                                <option value="">-- Select Provider --</option>
                                <option value="TARUS Instant Transfer">TARUS Instant Transfer</option>
                                <option value="DST Pocket e-Wallet">DST Pocket e-Wallet</option>
                                <option value="Progresif Pay">Progresif Pay</option>
                                <option value="Standard Chartered Brunei">Standard Chartered Brunei</option>
                                <option value="Maybank Brunei">Maybank Brunei</option>
                                <option value="RHB Bank Brunei">RHB Bank Brunei</option>
                                <option value="Baiduri Qpay">Baiduri Qpay</option>
                                <option value="BIBD QuickPay">BIBD QuickPay</option>
                                <option value="Custom Method">Other / Custom Method</option>
                              </select>
                            </div>
                            {newProviderName === 'Custom Method' && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Custom Provider Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. T-Plus Payment"
                                  className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                                  value={customProviderName}
                                  onChange={(e) => setCustomProviderName(e.target.value)}
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Account / Wallet Holder Name</label>
                              <input
                                type="text"
                                placeholder="e.g. CRYSTAL DETAILING ENTERPRISE"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value.toUpperCase())}
                                className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Account / Wallet Number</label>
                              <input
                                type="text"
                                placeholder="e.g. 0015010023456"
                                value={newAccountNo}
                                onChange={(e) => setNewAccountNo(e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Specific Instructions (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Send transfer via TARUS to SCB account and upload receipt."
                              value={newInstructions}
                              onChange={(e) => setNewInstructions(e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Official Payment QR Code Image (Optional)</label>
                            {newQrImageUrl ? (
                              <div className="flex items-center gap-2 bg-slate-200/50 border border-slate-300 rounded-lg p-1.5 pr-3 w-fit">
                                <img src={newQrImageUrl} className="w-10 h-10 object-cover rounded border border-slate-300" alt="new QR" />
                                <div className="text-left">
                                  <span className="text-[10px] text-slate-500 block font-semibold">QR Code Uploaded</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewQrImageUrl('')}
                                    className="text-[10px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                                  >
                                    Remove QR
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 cursor-pointer rounded-xl py-1.5 px-3 text-center transition-colors">
                                <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                  Upload Official QR Image for this Method
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleQrUpload(e.target.files[0], 'custom');
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddCustomPayment}
                            disabled={!(newProviderName === 'Custom Method' ? customProviderName : newProviderName) || !newAccountName || !newAccountNo}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg py-1.5 text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Payment Option</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  */}


                  <div className="h-[480px] sm:h-[400px] relative rounded-xl border border-slate-200 overflow-hidden">
                    <MapSimulation
                      locations={[]}
                      interactiveSelectCoords={{ lat: editLat, lng: editLng }}
                      onMapClickSelectCoords={(coords) => {
                        setEditLat(coords.lat);
                        setEditLng(coords.lng);
                      }}
                      userLat={editLat}
                      userLng={editLng}
                      compact={true}
                    />
                  </div>

                  {/* Manual Coordinates Override */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitude (GPS Coordinate)</label>
                      <input
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        value={editLat}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setEditLat(val);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude (GPS Coordinate)</label>
                      <input
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        value={editLng}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setEditLng(val);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration (min)</label>
                      <select
                        value={editDuration}
                        onChange={(e) => setEditDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="15">15 mins</option>
                        <option value="30">30 mins</option>
                        <option value="45">45 mins</option>
                        <option value="60">60 mins</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Capacity / Slot</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Operational Schedule</label>
                    {editSchedule && Object.keys(editSchedule).map((dayKey) => {
                      const day = dayKey as keyof WeeklySchedule;
                      const sched = editSchedule[day];
                      return (
                        <div key={day} className="flex flex-col gap-2 border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                          <div className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={sched.isOpen}
                              onChange={() => handleScheduleDayToggle(day)}
                              className="h-3.5 w-3.5 accent-indigo-600 rounded"
                            />
                            <span className="capitalize font-semibold text-slate-700 w-16">{day}</span>
                            {sched.isOpen ? (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <input
                                  type="text"
                                  placeholder="08:00"
                                  value={sched.open}
                                  onChange={(e) => handleScheduleTimeChange(day, 'open', e.target.value)}
                                  className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-mono font-bold focus:border-indigo-500"
                                />
                                <span>to</span>
                                <input
                                  type="text"
                                  placeholder="18:00"
                                  value={sched.close}
                                  onChange={(e) => handleScheduleTimeChange(day, 'close', e.target.value)}
                                  className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-mono font-bold focus:border-indigo-500"
                                />
                              </div>
                            ) : (
                              <span className="text-rose-400 font-mono ml-auto font-bold uppercase italic">Closed</span>
                            )}
                          </div>

                          {sched.isOpen && (
                            <div className="pl-5 border-l border-indigo-100/60 mt-0.5 flex flex-col gap-1.5 text-[11px]">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!sched.hasBreak}
                                  onChange={() => handleScheduleBreakToggle(day)}
                                  className="h-3.5 w-3.5 accent-sky-600 rounded"
                                  id={`break-toggle-${day}`}
                                />
                                <label htmlFor={`break-toggle-${day}`} className="text-slate-500 font-medium cursor-pointer">
                                  Lunch / Prayer break closure
                                </label>
                              </div>

                              {sched.hasBreak && (
                                <div className="flex items-center gap-1.5 ml-0 mt-0.5 pl-5">
                                  <span className="text-slate-400">Break:</span>
                                  <input
                                    type="text"
                                    placeholder="12:00"
                                    value={sched.breakStart || '12:00'}
                                    onChange={(e) => handleScheduleBreakTimeChange(day, 'breakStart', e.target.value)}
                                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-[10px] font-mono font-bold text-slate-600 focus:border-sky-500"
                                  />
                                  <span className="text-slate-400">to</span>
                                  <input
                                    type="text"
                                    placeholder="13:00"
                                    value={sched.breakEnd || '13:00'}
                                    onChange={(e) => handleScheduleBreakTimeChange(day, 'breakEnd', e.target.value)}
                                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-[10px] font-mono font-bold text-slate-600 focus:border-sky-500"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Services Creator Section */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Dynamic Services, Add-ons & Products</h4>
                          <p className="text-[10px] text-slate-400">Define customized wash services, add-ons (headlight polish, engine wash) and products for your business.</p>
                        </div>
                      </div>

                      {selectedBusiness && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Direct Auto-Save Active</span>
                        </div>
                      )}
                    </div>

                    {/* Services List */}
                    <div className="space-y-2">
                      {editServices.length === 0 ? (
                        <div className="text-center py-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 p-4 space-y-2">
                          <p className="text-xs text-slate-500 font-medium">No customized services or products added yet. Add your first item below or load the standard template!</p>
                          <button
                            type="button"
                            onClick={async () => {
                              const templateList = [...DEFAULT_MAIN_SERVICES, ...DEFAULT_ADDONS, ...DEFAULT_PRODUCTS];
                              setEditServices(templateList);
                              if (selectedBusiness) {
                                await updateLocationConfig(selectedBusiness.id, {
                                  ...selectedBusiness,
                                  services: templateList,
                                });
                                showNotification('Standard wash catalog loaded & saved to database!', 'success');
                              }
                            }}
                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>⚡ Load Standard Catalog Template</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 text-left">
                          {editServices.map((svc) => {
                            const isProduct = svc.type === 'product';
                            const isAddon = svc.type === 'addon';
                            const isAvailable = svc.isAvailable !== false;
                            return (
                              <div key={svc.id} className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-700 text-xs">{svc.name}</span>
                                    {isProduct ? (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Product</span>
                                    ) : isAddon ? (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-100 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Add-on</span>
                                    ) : (
                                      <span className="bg-blue-50 text-blue-700 border border-blue-100 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Service</span>
                                    )}
                                    {svc.vehicleType && svc.vehicleType !== 'N/A' && (
                                      <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-1.5 py-0.5 rounded-md">{svc.vehicleType}</span>
                                    )}
                                    {!isAvailable ? (
                                      <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Unavailable</span>
                                    ) : (
                                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Available</span>
                                    )}
                                  </div>
                                  {svc.description && <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">{svc.description}</span>}
                                  {!isProduct ? (
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                      <span>{svc.duration} min duration</span>
                                      <span>•</span>
                                      <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        {svc.slotsRequired === 0 ? '0 Bay Slots (Takes No Capacity)' : `${svc.slotsRequired || 1} Bay Slot(s)`}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Physical Product (0 Bay Slots)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">BND ${svc.price.toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const updatedList = editServices.filter((s) => s.id !== svc.id);
                                      setEditServices(updatedList);
                                      if (selectedBusiness) {
                                        await updateLocationConfig(selectedBusiness.id, {
                                          ...selectedBusiness,
                                          services: updatedList,
                                        });
                                        showNotification(`"${svc.name}" removed and database updated!`, 'info');
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick-Add Service Form */}
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3 text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add New Customized Service, Add-on or Product</span>
                      
                      {/* Item Type Toggle */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Item Category / Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewServiceType('service');
                              setNewServiceVehicleType('All');
                            }}
                            className={`py-1.5 px-2 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              newServiceType === 'service'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Main Service
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNewServiceType('addon');
                              setNewServiceVehicleType('All');
                            }}
                            className={`py-1.5 px-2 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              newServiceType === 'addon'
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Add-on / Extra
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNewServiceType('product');
                              setNewServiceVehicleType('N/A');
                            }}
                            className={`py-1.5 px-2 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              newServiceType === 'product'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Product / Item
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Name */}
                        <div className="sm:col-span-12">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Item Name</label>
                          <input
                            type="text"
                            placeholder={
                              newServiceType === 'service'
                                ? "e.g. Executive Polish & Wax"
                                : newServiceType === 'addon'
                                ? "e.g. Headlight Polish, Engine Wash, Tyre Wax"
                                : "e.g. Microfiber Drying Towel"
                            }
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
                          />
                        </div>

                        {/* Price */}
                        <div className="sm:col-span-6">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Price (BND)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price (BND)"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>

                        {/* Duration (Hidden/Set to 0 if product) */}
                        <div className="sm:col-span-6">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                            {newServiceType === 'product' ? "Duration (N/A)" : "Duration (minutes)"}
                          </label>
                          <input
                            type="number"
                            placeholder="Duration (min)"
                            disabled={newServiceType === 'product'}
                            value={newServiceType === 'product' ? '0' : newServiceDuration}
                            onChange={(e) => setNewServiceDuration(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>

                        {/* Vehicle Type */}
                        <div className="sm:col-span-6">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Vehicle Compatibility</label>
                          <select
                            value={newServiceVehicleType}
                            onChange={(e) => setNewServiceVehicleType(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
                          >
                            <option value="All">All Vehicles</option>
                            <option value="Sedan">Sedan Only</option>
                            <option value="SUV">SUV Only</option>
                            <option value="Motorcycle">Motorcycle Only</option>
                            <option value="N/A">Not Applicable (N/A)</option>
                          </select>
                        </div>

                        {/* Bay Slots Capacity Required */}
                        <div className="sm:col-span-6">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                            Bay Slots Capacity
                          </label>
                          <select
                            disabled={newServiceType === 'product'}
                            value={newServiceType === 'product' ? 0 : newServiceSlotsRequired}
                            onChange={(e) => setNewServiceSlotsRequired(parseInt(e.target.value, 10))}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 font-medium"
                          >
                            <option value={0}>0 Slots (Takes 0 Capacity - Add/Book Anytime)</option>
                            <option value={1}>1 Slot (Standard ~30 min)</option>
                            <option value={2}>2 Slots (1 Hour / Multi-Slot Wash)</option>
                            <option value={3}>3 Slots (1.5 Hours / Full Detail)</option>
                          </select>
                        </div>

                        {/* Availability Toggle */}
                        <div className="sm:col-span-6 flex items-center pt-3.5 pl-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={newServiceIsAvailable}
                              onChange={(e) => setNewServiceIsAvailable(e.target.checked)}
                              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-600">Available / In Stock</span>
                          </label>
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-12">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Description</label>
                          <input
                            type="text"
                            placeholder="Brief item description (optional)"
                            value={newServiceDesc}
                            onChange={(e) => setNewServiceDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!newServiceName.trim()) return;
                          const priceNum = parseFloat(newServicePrice);
                          const durNum = newServiceType === 'product' ? 0 : parseInt(newServiceDuration, 10);
                          if (isNaN(priceNum) || isNaN(durNum)) return;

                          const newSvc: WashService = {
                            id: `svc_${Math.random().toString(36).substr(2, 9)}`,
                            name: newServiceName.trim(),
                            price: priceNum,
                            duration: durNum,
                            description: newServiceDesc.trim() || undefined,
                            type: newServiceType,
                            vehicleType: newServiceVehicleType,
                            isAvailable: newServiceIsAvailable,
                            slotsRequired: newServiceType === 'product' ? 0 : newServiceSlotsRequired,
                          };

                          const updatedList = [...editServices, newSvc];
                          setEditServices(updatedList);

                          // Auto-persist if selectedBusiness exists
                          if (selectedBusiness) {
                            await updateLocationConfig(selectedBusiness.id, {
                              ...selectedBusiness,
                              services: updatedList,
                            });
                          }

                          setNewServiceName('');
                          setNewServicePrice('15.00');
                          setNewServiceDuration('30');
                          setNewServiceDesc('');
                          setNewServiceIsAvailable(true);
                        }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add & Save Item</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingConfig(false)}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Security & Credentials Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden" id="owner-security-settings-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Lock className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Security & Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">Manage owner account authentication</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordSection(!showChangePasswordSection);
                  setChangePasswordError('');
                  setChangePasswordSuccess('');
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                id="owner-toggle-change-password-section-btn"
              >
                <Key className="h-3.5 w-3.5 text-slate-500" />
                {showChangePasswordSection ? 'Hide Panel' : 'Change Password'}
              </button>
            </div>

            {showChangePasswordSection ? (
              <form onSubmit={handleOwnerChangePassword} className="space-y-4 pt-4 max-w-md animate-in fade-in slide-in-from-top-1 duration-200" id="owner-change-password-form">
                {changePasswordError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2" id="owner-password-error">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2" id="owner-password-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                    {changePasswordSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="owner-current-password">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="owner-current-password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="owner-new-password">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="owner-new-password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1" htmlFor="owner-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="owner-confirm-password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-slate-800 text-xs transition-all"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    id="owner-submit-change-password-btn"
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Security Password'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-500 pt-4 leading-relaxed">
                Ensure your owner credentials remain highly secure. We recommend using a unique password of at least 6 characters, mixing numbers and symbols.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in mt-6">
          {/* Employee Management list */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Operator Employees</h3>
                <p className="text-xs text-slate-400">Assigned operator accounts</p>
              </div>
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                id="add-employee-trigger"
              >
                <Plus className="h-3 w-3" /> Add Employee
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {filteredEmployees.length === 0 ? (
                <p className="text-center text-xs text-slate-400 italic py-4">
                  No employee operators assigned to this business yet.
                </p>
              ) : (
                filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-indigo-100 text-indigo-700 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-700 text-xs block truncate">{emp.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{emp.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-indigo-50 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono border border-indigo-100 hidden sm:inline-block">
                        Staff
                      </span>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingEmployee(emp);
                          setEditEmpName(emp.name);
                          setEditEmpEmail(emp.email);
                          setEditEmpBusinessId(emp.businessId || '');
                        }}
                        className="p-1 hover:bg-indigo-100 text-indigo-600 rounded transition-colors cursor-pointer"
                        title="Edit Operator details"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete button (with confirm) */}
                      {deletingEmployeeId === emp.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const success = await deleteEmployee(emp.id);
                              if (success) setDeletingEmployeeId(null);
                            }}
                            className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[9px] rounded uppercase hover:bg-rose-500 cursor-pointer animate-pulse"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingEmployeeId(null)}
                            className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[9px] rounded uppercase hover:bg-slate-300 cursor-pointer"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingEmployeeId(emp.id)}
                          className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete operator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
          {/* Active Services & Pricing Catalog Banner for Operators */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-white text-base sm:text-lg">Services, Add-ons & Products Offered</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active wash menu available for online bookings and walk-in sales
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add / Edit Services</span>
              </button>
            </div>

            {/* Quick Service Pills Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {(!selectedBusiness?.services || selectedBusiness.services.length === 0) ? (
                <div className="col-span-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 text-center text-xs text-slate-400">
                  Default Standard Wash ($15.00) active. Click <strong className="text-indigo-300">+ Add / Edit Services</strong> above to add custom wash packages, headlight polishing, or retail products!
                </div>
              ) : (
                selectedBusiness.services.map((svc) => (
                  <div key={svc.id} className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-xs font-extrabold text-white truncate block">{svc.name}</strong>
                        {svc.type === 'addon' ? (
                          <span className="bg-purple-950 text-purple-300 border border-purple-800/60 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Add-on</span>
                        ) : svc.type === 'product' ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Product</span>
                        ) : (
                          <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/60 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">Service</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {svc.duration ? `${svc.duration} mins` : 'N/A'} • {svc.slotsRequired === 0 ? '0 Bay Slots (Flex)' : `${svc.slotsRequired || 1} Bay Slot(s)`}
                      </span>
                    </div>
                    <span className="font-black text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-1 rounded-lg shrink-0 font-mono">
                      BND ${svc.price.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bookings Operations Control */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Active Cleaning Bookings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Approve, update status or review details</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                {filteredBookings.length} total
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="font-semibold text-sm">No bookings scheduled on this business.</p>
                <p className="text-xs text-slate-400 mt-1">New customer reservations will populate instantly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((bk) => {
                  const isFocused = bk.id === focusedBookingId;
                  return (
                    <div
                      key={bk.id}
                      onClick={() => setFocusedBookingId(bk.id)}
                      className={`border rounded-2xl p-4 transition-all duration-200 bg-white hover:shadow-xs space-y-3 cursor-pointer ${
                        isFocused
                          ? 'border-indigo-500 ring-2 ring-indigo-50/50 shadow-xs'
                          : 'border-slate-150 hover:border-slate-300'
                      }`}
                      id={`owner-booking-card-${bk.id}`}
                    >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-2.5">
                      <div>
                        <strong className="text-slate-800 text-xs sm:text-sm block">{bk.customerName}</strong>
                        <span className="text-[10px] text-slate-400 font-mono block">{bk.customerEmail}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-mono font-semibold">
                          {bk.date} @ {bk.timeSlot.split(' - ')[0]}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
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
                      </div>
                    </div>

                    {bk.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Notes:</span>
                        {bk.notes}
                      </div>
                    )}

                     {bk.paymentBank ? (
                      <div className="text-xs bg-sky-50/50 border border-sky-100 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <span className="font-bold text-[10px] text-sky-600 uppercase tracking-wider block mb-0.5">Brunei Local Bank Transfer:</span>
                          <span className="font-semibold text-slate-700">{bk.paymentBank}</span>
                          <span className="mx-1.5 text-slate-300">|</span>
                          <span className="font-bold text-slate-800 font-mono tracking-wider">Ref: {bk.txnReference}</span>
                        </div>
                        {bk.receiptFilename && (
                          <a
                            href={`/uploads/${bk.receiptFilename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 hover:underline bg-white border border-blue-100 px-2.5 py-1 rounded-lg shadow-2xs transition-all text-[11px]"
                          >
                            <span>🔍 View Screenshot</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Payment Method:</span>
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Cash / Pay on Site
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Operational Action Controls based on status */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
                      {bk.status === BookingStatus.PENDING && (
                        <>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.IN_PROGRESS)}
                            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            id={`owner-accept-${bk.id}`}
                          >
                            Accept & Start
                          </button>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.CANCELLED)}
                            className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            id={`owner-cancel-${bk.id}`}
                            title="Cancel booking"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.REJECTED)}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            id={`owner-reject-${bk.id}`}
                            title="Reject booking"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {bk.status === BookingStatus.IN_PROGRESS && (
                        <>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.COMPLETED)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer animate-pulse"
                            id={`owner-complete-${bk.id}`}
                          >
                            Mark Clean & Completed
                          </button>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.CANCELLED)}
                            className="bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            id={`owner-cancel-mid-${bk.id}`}
                            title="Cancel mid-wash"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {(bk.status === BookingStatus.COMPLETED || bk.status === BookingStatus.CANCELLED || bk.status === BookingStatus.REJECTED) && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium italic">Archive logs complete</span>
                          <button
                            onClick={() => handleStatusChange(bk.id, BookingStatus.PENDING)}
                            className="px-2 py-0.5 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 bg-white hover:bg-indigo-50 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer"
                            title="Revert status to Pending"
                          >
                            Revert
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📅 Calendar & Manual Booking Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-indigo-600 shrink-0" />
                <h2 className="text-lg sm:text-xl font-black text-slate-800">
                  Booking Calendar & Manual Slots
                </h2>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                View slot distribution, filter by source, and record phone-in or walk-in customer bookings.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
              {/* Filter pills for booking source */}
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

              {/* + Record Manual Booking Button */}
              <button
                type="button"
                onClick={() => {
                  setMbDate(selectedCalendarDate || getTodayDateString());
                  setShowManualBookingModal(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Record Phone / Walk-in Booking</span>
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
                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-extrabold rounded-md border border-indigo-100 transition-all cursor-pointer"
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
                <span><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></span>
                <span><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></span>
                <span><span className="hidden sm:inline">Tue</span><span className="sm:hidden">T</span></span>
                <span><span className="hidden sm:inline">Wed</span><span className="sm:hidden">W</span></span>
                <span><span className="hidden sm:inline">Thu</span><span className="sm:hidden">T</span></span>
                <span><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></span>
                <span><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></span>
              </div>

              {/* Month Grid Cells */}
              {(() => {
                const year = calendarCurrentMonth.getFullYear();
                const month = calendarCurrentMonth.getMonth();
                const totalDays = new Date(year, month + 1, 0).getDate();
                const firstDayIdx = new Date(year, month, 1).getDay(); // 0 = Sun

                const todayStr = getTodayDateString();
                const bizBookings = bookings.filter((b) => !selectedBusiness || b.carWashId === selectedBusiness.id);

                const cells = [];
                // Empty padding cells for start of month
                for (let i = 0; i < firstDayIdx; i++) {
                  cells.push(<div key={`empty-${i}`} className="h-14 sm:h-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-100 opacity-40" />);
                }

                // Days cells
                for (let d = 1; d <= totalDays; d++) {
                  const mStr = String(month + 1).padStart(2, '0');
                  const dStr = String(d).padStart(2, '0');
                  const dateKey = `${year}-${mStr}-${dStr}`;

                  const isToday = dateKey === todayStr;
                  const isSelected = dateKey === selectedCalendarDate;

                  // Bookings for this date
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
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                          : isToday
                          ? 'border-sky-300 bg-sky-50/40'
                          : 'border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] sm:text-xs font-black ${
                          isSelected ? 'text-indigo-900' : isToday ? 'text-sky-700' : 'text-slate-700'
                        }`}>
                          {d}
                        </span>
                        {isToday && (
                          <>
                            <span className="hidden sm:inline text-[9px] font-extrabold text-sky-700 bg-sky-100 px-1 rounded uppercase">Today</span>
                            <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-sky-500 inline-block"></span>
                          </>
                        )}
                      </div>

                      {/* Booking Count Indicators */}
                      {totalCount > 0 ? (
                        <div className="space-y-0.5">
                          <span className={`block text-[9px] sm:text-[10px] font-extrabold px-0.5 sm:px-1 py-0.2 sm:py-0.5 rounded text-center truncate ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'
                          }`}>
                            <span className="hidden sm:inline">{totalCount} {totalCount === 1 ? 'Booking' : 'Bookings'}</span>
                            <span className="sm:hidden">{totalCount}</span>
                          </span>

                          <div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9px] font-bold">
                            {onlineCount > 0 && <span className="text-sky-600" title={`${onlineCount} Online`}>🌐<span className="hidden sm:inline">{onlineCount}</span></span>}
                            {phoneCount > 0 && <span className="text-amber-600" title={`${phoneCount} Phone`}>📞<span className="hidden sm:inline">{phoneCount}</span></span>}
                            {walkInCount > 0 && <span className="text-emerald-600" title={`${walkInCount} Walk-in`}>🚗<span className="hidden sm:inline">{walkInCount}</span></span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[8px] sm:text-[9px] text-slate-300 italic block text-center truncate sm:not-sr-only">
                          <span className="hidden sm:inline">No slots</span>
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {cells}
                  </div>
                );
              })()}
            </div>

            {/* Daily Timetable & Slot Breakdown (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Selected Date Breakdown</span>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    {(() => {
                      const parts = selectedCalendarDate.split('-');
                      if (parts.length === 3) {
                        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                      }
                      return selectedCalendarDate;
                    })()}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMbDate(selectedCalendarDate);
                    setShowManualBookingModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Quick Book</span>
                </button>
              </div>

              {/* Bookings List for selected date */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {(() => {
                  let dateBookings = bookings.filter(
                    (b) => (!selectedBusiness || b.carWashId === selectedBusiness.id) && b.date === selectedCalendarDate
                  );

                  if (calendarSourceFilter !== 'ALL') {
                    dateBookings = dateBookings.filter((b) => (b.bookingSource || 'ONLINE') === calendarSourceFilter);
                  }

                  if (dateBookings.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 space-y-2 bg-slate-50/60 rounded-2xl border border-slate-150 p-4">
                        <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-xs">No bookings recorded for this date.</p>
                        <p className="text-[11px] text-slate-400">Receive phone calls or walk-ins? Record them into the schedule.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setMbDate(selectedCalendarDate);
                            setShowManualBookingModal(true);
                          }}
                          className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all cursor-pointer"
                        >
                          + Record Manual Booking
                        </button>
                      </div>
                    );
                  }

                  // Group by time slot
                  return dateBookings.map((bk) => {
                    const source = bk.bookingSource || 'ONLINE';

                    return (
                      <div
                        key={bk.id}
                        className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-2 hover:border-indigo-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-black text-slate-900 text-xs font-mono">{bk.timeSlot}</span>
                          </div>

                          {/* Source badge */}
                          {source === 'PHONE' && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                              📞 Phone Call
                            </span>
                          )}
                          {source === 'WALK_IN' && (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                              🚗 Walk-In
                            </span>
                          )}
                          {source === 'ONLINE' && (
                            <span className="bg-sky-100 text-sky-900 border border-sky-200 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                              🌐 App Booking
                            </span>
                          )}
                        </div>

                        {/* Customer & Vehicle Info */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 text-xs truncate">{bk.customerName}</span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">{bk.customerPhone || 'Phone N/A'}</span>
                          </div>

                          {bk.vehicleInfo && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                              <Car className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{bk.vehicleInfo}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-100">
                            <span className="text-slate-500 font-bold">Service: <strong className="text-indigo-700">{bk.serviceName || 'Standard Wash'}</strong></span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBooking(bk);
                                  setShowEditBookingModal(true);
                                }}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-md text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Edit Services, Add-ons & Total Price"
                              >
                                <Pencil className="w-3 h-3 text-indigo-600" />
                                <span>Edit</span>
                              </button>
                              <span className="font-black text-slate-900 font-mono">BND ${(bk.price || 15.00).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Accountability Audit Badge */}
                        {bk.createdByEmail && (
                          <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 px-1">
                            <span>Logged by: <strong className="text-slate-600 font-mono">{bk.createdByEmail}</strong></span>
                            <span className="text-slate-400 font-bold uppercase">({bk.createdByRole || 'STAFF'})</span>
                          </div>
                        )}

                        {/* Status dropdown controller */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase">Status:</span>
                          <select
                            value={bk.status}
                            onChange={(e) => handleStatusChange(bk.id, e.target.value as BookingStatus)}
                            className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value={BookingStatus.PENDING}>⏳ Pending</option>
                            <option value={BookingStatus.IN_PROGRESS}>🧼 In Progress</option>
                            <option value={BookingStatus.COMPLETED}>✅ Completed</option>
                            <option value={BookingStatus.CANCELLED}>❌ Cancelled</option>
                          </select>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Add Employee modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-fade-in">
          <div className="relative my-auto bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 sm:p-6 text-left max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Onboard Operator Staff</h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Employee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sam Employee"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                  id="emp-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="sam@carwash.com"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                  id="emp-email-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Login Password (Chosen by Owner)
                </label>
                <div className="relative">
                  <input
                    type={showEmpPassword ? 'text' : 'password'}
                    placeholder="Set password (or leave empty for 'employee123')"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-14 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-xs"
                    id="emp-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpPassword(!showEmpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                  >
                    {showEmpPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50 text-indigo-900 p-2.5 rounded-xl border border-indigo-100 text-[11px] flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
                <p>
                  As owner, you set the staff password above. The employee can log in using their email and this password immediately.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                id="emp-submit-btn"
              >
                Onboard Employee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-fade-in">
          <div className="relative my-auto bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 sm:p-6 text-left max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Edit Operator Staff</h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const success = await updateEmployee(
                  editingEmployee.id,
                  editEmpName,
                  editEmpEmail,
                  editEmpBusinessId
                );
                if (success) {
                  setEditingEmployee(null);
                }
              }}
              className="mt-4 space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Employee Name</label>
                <input
                  type="text"
                  value={editEmpName}
                  onChange={(e) => setEditEmpName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmpEmail}
                  onChange={(e) => setEditEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Business Location</label>
                <select
                  value={editEmpBusinessId}
                  onChange={(e) => setEditEmpBusinessId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Business --</option>
                  {ownerLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📞🚗 Manual Phone & Walk-In Booking Modal */}
      {showManualBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto overscroll-y-contain animate-fade-in">
          <div className="relative my-auto bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] overflow-hidden text-left my-auto">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  Record Phone / Walk-in Booking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log customer slot for <span className="font-bold text-slate-800">{selectedBusiness?.name || 'Selected Location'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualBookingModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleManualBookingSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain touch-pan-y">
              {/* Booking Source Toggle */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Booking Source Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMbSource('PHONE')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mbSource === 'PHONE'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>📞 Phone Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMbSource('WALK_IN')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mbSource === 'WALK_IN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    <span>🚗 Walk-In Customer</span>
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
                    placeholder="e.g. Haji Ahmad"
                    value={mbName}
                    onChange={(e) => setMbName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Customer Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 8765432"
                    value={mbPhone}
                    onChange={(e) => setMbPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Vehicle Info & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Vehicle Info / Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota Fortuner - BAA 1234"
                    value={mbVehicle}
                    onChange={(e) => setMbVehicle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Customer Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="ahmad@gmail.com"
                    value={mbEmail}
                    onChange={(e) => setMbEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500"
                  />
                </div>
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
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Time Slot Selection (Interactive Chip Picker) */}
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
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
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
                    className="w-full px-3 py-2.5 border border-indigo-300 bg-indigo-50/30 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 font-mono font-bold"
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
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold scale-[1.02]'
                                  : isFull
                                  ? 'bg-red-50/80 hover:bg-red-100 border-red-200 text-slate-800'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-mono font-bold">
                                <span>{s.timeSlot}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px]">
                                <span className={`font-semibold ${
                                  isSelected
                                    ? 'text-indigo-100'
                                    : isFull
                                    ? 'text-red-600 font-bold'
                                    : 'text-slate-500'
                                }`}>
                                  {isFull ? '🔴 0 left (Full)' : `🟢 ${remaining} left`}
                                </span>
                                <span className={`font-mono text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
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

              {/* Service Selection & Price */}
              <div className="col-span-full space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Selected Services & Products ({mbSelectedItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowServicePickerModal(true)}
                    className="text-xs font-black text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
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
                  Initial Booking Status
                </label>
                <select
                  value={mbStatus}
                  onChange={(e) => setMbStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 font-bold"
                >
                  <option value={BookingStatus.COMPLETED}>✅ Completed (Paid & finished)</option>
                  <option value={BookingStatus.IN_PROGRESS}>🧼 In Progress (Currently in wash bay)</option>
                  <option value={BookingStatus.PENDING}>⏳ Pending (Scheduled call/walk-in)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Caller Notes / Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested extra tire shine"
                  value={mbNotes}
                  onChange={(e) => setMbNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500"
                />
              </div>

              {/* Sticky Submit Bar inside form */}
              <div className="pt-3 sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex gap-2 pb-1 z-10">
                <button
                  type="submit"
                  disabled={mbIsSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {mbIsSubmitting ? 'Logging...' : 'Save Manual Booking Record'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualBookingModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Cancel
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
        location={selectedBusiness}
      />

      {/* Multi-Item Tick Selection Picker Sub-Modal */}
      <ServicePickerModal
        isOpen={showServicePickerModal}
        onClose={() => setShowServicePickerModal(false)}
        catalog={getCatalogForLocation(selectedBusiness)}
        selectedItems={mbSelectedItems}
        onConfirm={(items) => {
          setMbSelectedItems(items);
          const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
          setMbPrice(total.toFixed(2));
        }}
      />
    </div>
  );
};
