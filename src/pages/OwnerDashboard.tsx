/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import {
  DollarSign, Calendar, Users, Sliders, Check, X,
  Clock, MapPin, BarChart3, ChevronRight, Edit2, Plus, Info, Briefcase, Trash2, Edit
} from 'lucide-react';
import { BookingStatus, CarWash, Booking, WeeklySchedule, CustomPaymentMethod, WashService } from '../types.js';

export const OwnerDashboard: React.FC = () => {
  const {
    locations,
    bookings,
    employees,
    updateBookingStatus,
    updateLocationConfig,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  } = useApp();

  // Selected owned business
  const [selectedBusiness, setSelectedBusiness] = useState<CarWash | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'settings'>('overview');

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
  const [editLat, setEditLat] = useState(37.7749);
  const [editLng, setEditLng] = useState(-122.4194);
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editCapacity, setEditCapacity] = useState(2);
  const [editSchedule, setEditSchedule] = useState<WeeklySchedule | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');

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
  const [newServiceType, setNewServiceType] = useState<'service' | 'product'>('service');
  const [newServiceVehicleType, setNewServiceVehicleType] = useState<string>('All');
  const [newServiceIsAvailable, setNewServiceIsAvailable] = useState<boolean>(true);

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

  useEffect(() => {
    // Select first owned location if not already selected
    if (locations.length > 0 && !selectedBusiness) {
      setSelectedBusiness(locations[0]);
    }
  }, [locations]);

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

    const success = await createEmployee(empEmail, empName, selectedBusiness.id);
    if (success) {
      setEmpName('');
      setEmpEmail('');
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
              const b = locations.find((loc) => loc.id === e.target.value);
              if (b) setSelectedBusiness(b);
            }}
            className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 shadow-xs"
            id="owner-business-selector"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

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
            <span className="text-xs text-slate-400 font-medium block">Simulated Revenue</span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              ${analytics.estimatedRevenue}
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

                  {/* Brunei Local Bank Payment Information Settings */}
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
                      {/* BIBD */}
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

                      {/* Baiduri */}
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

                      {/* Custom & Other Banks / E-Wallets */}
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Other Brunei Local Banks & E-Wallets
                        </label>
                        <p className="text-[10px] text-slate-400 mb-3">
                          Add custom local payment options such as <strong>TARUS Instant Transfer</strong>, <strong>DST Pocket</strong>, <strong>Progresif Pay</strong>, Standard Chartered, or Maybank.
                        </p>

                        {/* Existing Custom Methods List */}
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

                        {/* Quick Add Form */}
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
                        step="0.0001"
                        min="-90"
                        max="90"
                        value={editLat}
                        onChange={(e) => setEditLat(parseFloat(e.target.value) || 37.7749)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude (GPS Coordinate)</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="-180"
                        max="180"
                        value={editLng}
                        onChange={(e) => setEditLng(parseFloat(e.target.value) || -122.4194)}
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
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Dynamic Products & Services</h4>
                        <p className="text-[10px] text-slate-400">Define the customized wash services and products (e.g. shampoo, wax) customers can buy or book.</p>
                      </div>
                    </div>

                    {/* Services List */}
                    <div className="space-y-2">
                      {editServices.length === 0 ? (
                        <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                          No customized services or products added yet. Add your first item below!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 text-left">
                          {editServices.map((svc) => {
                            const isProduct = svc.type === 'product';
                            const isAvailable = svc.isAvailable !== false;
                            return (
                              <div key={svc.id} className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-700 text-xs">{svc.name}</span>
                                    {isProduct ? (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[9px] px-1.5 py-0.5 rounded-md uppercase">Product</span>
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
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{svc.duration} min duration</span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Physical Product</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">BND ${svc.price.toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditServices(editServices.filter((s) => s.id !== svc.id))}
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add New Customized Service or Product</span>
                      
                      {/* Item Type Toggle */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Item Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewServiceType('service');
                              setNewServiceVehicleType('All');
                            }}
                            className={`py-1.5 px-3 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              newServiceType === 'service'
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            Service
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewServiceType('product');
                              setNewServiceVehicleType('N/A');
                            }}
                            className={`py-1.5 px-3 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              newServiceType === 'product'
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
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
                            placeholder={newServiceType === 'service' ? "e.g. Premium Clay Bar Detail" : "e.g. Microfiber Drying Towel"}
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
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
                            {newServiceType === 'service' ? "Duration (minutes)" : "Duration (N/A)"}
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

                        {/* Vehicle Type (Only useful for services, or products specifically for one type) */}
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
                        onClick={() => {
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
                          };

                          setEditServices([...editServices, newSvc]);
                          setNewServiceName('');
                          setNewServicePrice('15.00');
                          setNewServiceDuration('30');
                          setNewServiceDesc('');
                          // Keep type as selected, but reset default compatibility if needed
                          setNewServiceIsAvailable(true);
                        }}
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to List</span>
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

      {/* 🚀 System Operations & Live Audit Center */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="text-left">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <Sliders className="h-5 w-5" />
              </span>
              System Operations & Live Audit Center
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tracking of system configuration edits, administrative audits, and focused booking operator management.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Activity Monitor</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Focused Booking Quick Inspector (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Booking Quick Inspector
                </span>
                {focusedBookingId && bookings.find((b) => b.id === focusedBookingId) && (
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold animate-pulse">
                    In Focus
                  </span>
                )}
              </div>

              {(() => {
                const focusedBooking = bookings.find((b) => b.id === focusedBookingId);
                if (!focusedBooking) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs">No Booking Selected</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click any booking card above to inspect and assign operators.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 text-xs sm:text-sm">
                    {/* Customer Main Info */}
                    <div className="bg-white border border-slate-200/60 p-3 rounded-xl space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-800 text-sm">{focusedBooking.customerName}</strong>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border uppercase ${
                          focusedBooking.status === BookingStatus.COMPLETED
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : focusedBooking.status === BookingStatus.IN_PROGRESS
                            ? 'bg-sky-50 text-sky-800 border-sky-100 animate-pulse'
                            : focusedBooking.status === BookingStatus.PENDING
                            ? 'bg-amber-50 text-amber-800 border-amber-100'
                            : focusedBooking.status === BookingStatus.REJECTED
                            ? 'bg-rose-50 text-rose-800 border-rose-100'
                            : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {focusedBooking.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block">{focusedBooking.customerEmail}</span>
                      <span className="text-[11px] text-slate-600 block">
                        <strong>Scheduled:</strong> {focusedBooking.date} @ {focusedBooking.timeSlot}
                      </span>
                    </div>

                    {/* Selected Service & Vehicle Notes */}
                    <div className="space-y-2 text-left">
                      <div className="bg-white border border-slate-200/60 p-3 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Service / Item</span>
                          <span className="font-bold text-slate-700 text-xs">{focusedBooking.serviceName || 'Standard Car Wash'}</span>
                        </div>
                        <span className="font-mono font-black text-indigo-600 text-sm">
                          BND ${(focusedBooking.price || 15).toFixed(2)}
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200/60 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Customer Notes / Vehicle Info</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed italic bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          {focusedBooking.notes || 'No custom notes provided.'}
                        </p>
                      </div>
                    </div>

                     {/* Brunei Payment Status Verification */}
                    {focusedBooking.paymentBank ? (
                      <div className="bg-sky-50/40 border border-sky-100 p-3 rounded-xl space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-sky-700 uppercase font-bold">Payment verification</span>
                          <span className="text-[9px] font-black bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded uppercase font-mono">
                            {focusedBooking.paymentBank}
                          </span>
                        </div>
                        <div className="text-[11px] space-y-1">
                          <div>
                            <span className="text-slate-400">Reference:</span>{' '}
                            <strong className="font-mono text-slate-700">{focusedBooking.txnReference}</strong>
                          </div>
                          {focusedBooking.receiptFilename && (
                            <div className="pt-1.5 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">Receipt upload:</span>
                              <a
                                href={`/uploads/${focusedBooking.receiptFilename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 hover:underline bg-white border border-indigo-100 px-2.5 py-1 rounded-lg shadow-2xs text-[10px]"
                              >
                                <span>🔍 View Receipt</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-xl space-y-1 text-left">
                        <span className="text-[10px] text-emerald-800 uppercase font-bold block">Payment Method</span>
                        <div className="text-slate-700 font-bold text-xs flex items-center gap-1.5 pt-0.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Cash / Pay on Site</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed pt-0.5">
                          No upfront payment required. This booking is confirmed for physical payment upon arrival at the facility.
                        </p>
                      </div>
                    )}

                    {/* Assign Operator Field */}
                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2 text-left">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Assign Staff Operator</span>
                        <p className="text-[10px] text-slate-400">Assign a specific operator employee to perform this cleaning</p>
                      </div>
                      <select
                        value={focusedBooking.employeeId || ''}
                        onChange={async (e) => {
                          const empId = e.target.value || undefined;
                          await updateBookingStatus(focusedBooking.id, focusedBooking.status, focusedBooking.notes, empId);
                          fetchOwnerLogs();
                        }}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 shadow-xs w-full cursor-pointer"
                      >
                        <option value="">-- Unassigned / Pool --</option>
                        {filteredEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Actions inside inspector */}
                    <div className="pt-2 flex gap-2">
                      {focusedBooking.status === BookingStatus.PENDING && (
                        <button
                          onClick={async () => {
                            await updateBookingStatus(focusedBooking.id, BookingStatus.IN_PROGRESS);
                            fetchOwnerLogs();
                          }}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Accept & Start
                        </button>
                      )}
                      {focusedBooking.status === BookingStatus.IN_PROGRESS && (
                        <button
                          onClick={async () => {
                            await updateBookingStatus(focusedBooking.id, BookingStatus.COMPLETED);
                            fetchOwnerLogs();
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer animate-pulse"
                        >
                          Complete Wash
                        </button>
                      )}
                      {(focusedBooking.status === BookingStatus.PENDING || focusedBooking.status === BookingStatus.IN_PROGRESS) && (
                        <button
                          onClick={async () => {
                            await updateBookingStatus(focusedBooking.id, BookingStatus.CANCELLED);
                            fetchOwnerLogs();
                          }}
                          className="py-1.5 px-3 bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Panel: Audit Logs & Configuration Edits feed (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col h-full space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-left">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Audit Feed & Activity logs
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search edits..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
                />
                {/* Filter Selector */}
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value="ALL">All Events</option>
                  <option value="CAR_WASH">Configuration Edits</option>
                  <option value="EMPLOYEE">Employee Actions</option>
                  <option value="BOOKING">Booking Updates</option>
                </select>
              </div>
            </div>

            {/* Logs Timeline */}
            <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex-1 min-h-[300px] max-h-[460px] overflow-y-auto space-y-3">
              {(() => {
                const filtered = ownerLogs.filter((log) => {
                  // Keyword Match
                  if (logSearch.trim()) {
                    const searchLower = logSearch.toLowerCase();
                    const actionMatches = log.action && log.action.toLowerCase().includes(searchLower);
                    const detailsMatches = log.details && log.details.toLowerCase().includes(searchLower);
                    const emailMatches = log.userEmail && log.userEmail.toLowerCase().includes(searchLower);
                    if (!actionMatches && !detailsMatches && !emailMatches) return false;
                  }
                  
                  // Category Match
                  if (logFilter === 'CAR_WASH') {
                    return log.action.startsWith('CAR_WASH');
                  } else if (logFilter === 'EMPLOYEE') {
                    return log.action.startsWith('EMPLOYEE');
                  } else if (logFilter === 'BOOKING') {
                    return log.action.startsWith('BOOKING') || log.action === 'STATUS_UPDATE';
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-20 text-slate-400">
                      <svg className="w-8 h-8 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-semibold text-xs">No audits found matching current filters.</p>
                      <p className="text-[10px] mt-0.5 text-slate-400">Operations will log automatically when edits are made.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 text-xs">
                    {filtered.map((log) => {
                      const dateObj = new Date(log.timestamp);
                      const formattedTime = dateObj.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      }) + ' ' + dateObj.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      // Badge styles based on Action
                      let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200/80';
                      if (log.action.includes('CAR_WASH')) {
                        badgeStyle = 'bg-sky-50 text-sky-800 border-sky-100';
                      } else if (log.action.includes('EMPLOYEE')) {
                        badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-100';
                      } else if (log.action.includes('BOOKING') || log.action.includes('STATUS')) {
                        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                      }

                      return (
                        <div key={log.id} className="bg-white border border-slate-200/60 p-3 rounded-xl flex items-start gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${badgeStyle}`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono ml-auto">
                                {formattedTime}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium text-[11px] mt-1.5 leading-relaxed">
                              {log.details}
                            </p>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <span>By:</span>
                              <strong className="font-mono text-slate-500 font-semibold">{log.userEmail}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Add Employee modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
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

              <div className="bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-150 text-[11px] flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Newly registered staff accounts can log in using their email and the default initial password:
                  <strong className="block font-bold select-all mt-1">employee123</strong>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
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
                  {locations.map((loc) => (
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
    </div>
  );
};
