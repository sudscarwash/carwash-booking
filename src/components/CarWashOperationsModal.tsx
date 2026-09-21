import React, { useState } from 'react';
import {
  X,
  Check,
  Sliders,
  Clock,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Globe,
  Phone,
  Instagram,
  CreditCard,
  Layers,
  Info,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  EyeOff,
} from 'lucide-react';
import { CarWash, WashService, WeeklySchedule } from '../types';
import { useApp } from '../context/AppContext';

interface CarWashOperationsModalProps {
  carWash: CarWash;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { open: '08:00', close: '18:00', isOpen: true },
  tuesday: { open: '08:00', close: '18:00', isOpen: true },
  wednesday: { open: '08:00', close: '18:00', isOpen: true },
  thursday: { open: '08:00', close: '18:00', isOpen: true },
  friday: { open: '08:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '17:00', isOpen: true },
  sunday: { open: '10:00', close: '16:00', isOpen: false },
};

export const CarWashOperationsModal: React.FC<CarWashOperationsModalProps> = ({
  carWash,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateLocationConfig } = useApp();

  const [activeTab, setActiveTab] = useState<'access' | 'services' | 'schedule' | 'banking'>('access');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Core Access & Basic Params
  const [ownerQrCodeEnabled, setOwnerQrCodeEnabled] = useState<boolean>(
    carWash.ownerQrCodeEnabled === true
  );
  const [isActive, setIsActive] = useState<boolean>(carWash.isActive);
  const [slotDuration, setSlotDuration] = useState<number>(carWash.slotDuration || 30);
  const [capacityPerSlot, setCapacityPerSlot] = useState<number>(carWash.capacityPerSlot || 2);
  const [slug, setSlug] = useState<string>(carWash.slug || '');
  const [phone, setPhone] = useState<string>(carWash.phone || '');
  const [instagram, setInstagram] = useState<string>(carWash.instagram || '');
  const [description, setDescription] = useState<string>(carWash.description || '');

  // Services Catalog
  const [services, setServices] = useState<WashService[]>(
    carWash.services && carWash.services.length > 0
      ? [...carWash.services]
      : [
          {
            id: `svc_${Math.random().toString(36).substr(2, 7)}`,
            name: 'Standard Exterior Wash',
            price: 7,
            duration: 25,
            type: 'service',
            vehicleType: 'Sedan',
            description: 'Snow foam wash, wheel cleaning, and microfiber dry.',
          },
          {
            id: `svc_${Math.random().toString(36).substr(2, 7)}`,
            name: 'Deluxe Wash & Vacuum',
            price: 15,
            duration: 45,
            type: 'service',
            vehicleType: 'Sedan / SUV',
            description: 'Exterior wash, interior vacuuming, dashboard wipe down, tire shine.',
          },
        ]
  );

  // New Service Form State
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(10);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceVehicleType, setNewServiceVehicleType] = useState('Sedan');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Schedule
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => {
    try {
      return carWash.openingHours ? JSON.parse(JSON.stringify(carWash.openingHours)) : DEFAULT_SCHEDULE;
    } catch {
      return DEFAULT_SCHEDULE;
    }
  });

  // Banking
  const [bibdEnabled, setBibdEnabled] = useState<boolean>(!!carWash.bibdEnabled);
  const [bibdAccountName, setBibdAccountName] = useState<string>(carWash.bibdAccountName || '');
  const [bibdAccountNo, setBibdAccountNo] = useState<string>(carWash.bibdAccountNo || '');

  const [baiduriEnabled, setBaiduriEnabled] = useState<boolean>(!!carWash.baiduriEnabled);
  const [baiduriAccountName, setBaiduriAccountName] = useState<string>(carWash.baiduriAccountName || '');
  const [baiduriAccountNo, setBaiduriAccountNo] = useState<string>(carWash.baiduriAccountNo || '');

  if (!isOpen) return null;

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      showToast('Please provide a service title.', 'error');
      return;
    }

    const newSvc: WashService = {
      id: `svc_${Math.random().toString(36).substr(2, 7)}`,
      name: newServiceName.trim(),
      price: Number(newServicePrice) || 0,
      duration: Number(newServiceDuration) || 30,
      vehicleType: newServiceVehicleType.trim() || 'All Vehicles',
      description: newServiceDesc.trim(),
      type: 'service',
    };

    setServices((prev) => [...prev, newSvc]);
    setNewServiceName('');
    setNewServicePrice(10);
    setNewServiceDuration(30);
    setNewServiceDesc('');
    setShowAddService(false);
    showToast(`Service "${newSvc.name}" added to package catalog.`, 'success');
  };

  const handleDeleteService = (svcId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== svcId));
  };

  const handleScheduleChange = (day: keyof WeeklySchedule, field: string, value: any) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<CarWash> = {
        ownerNavigationEnabled: true,
        ownerQrCodeEnabled,
        isActive,
        slotDuration: Number(slotDuration),
        capacityPerSlot: Number(capacityPerSlot),
        slug: slug.trim() || undefined,
        phone: phone.trim() || undefined,
        instagram: instagram.trim() || undefined,
        description: description.trim() || undefined,
        services,
        servicesJson: JSON.stringify(services),
        openingHours: schedule,
        bibdEnabled,
        bibdAccountName: bibdAccountName.trim() || undefined,
        bibdAccountNo: bibdAccountNo.trim() || undefined,
        baiduriEnabled,
        baiduriAccountName: baiduriAccountName.trim() || undefined,
        baiduriAccountNo: baiduriAccountNo.trim() || undefined,
      };

      const success = await updateLocationConfig(carWash.id, payload);
      if (success) {
        showToast('Facility operations & navigation settings saved successfully!', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast('Failed to update operations configuration. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating operations', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      id="carwash-operations-modal-backdrop"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-8 max-h-[92vh]"
        id="carwash-operations-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">{carWash.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    ownerQrCodeEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ownerQrCodeEnabled ? 'Owner QR: Allowed' : 'Owner QR: Hidden'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {carWash.address || 'Brunei Darussalam'} {carWash.ownerEmail ? `• Owner: ${carWash.ownerEmail}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            id="close-operations-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* In-Modal Alert Notification */}
        {toast && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-150 px-6 bg-white shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('access')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'access'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab-access-btn"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Access & Parameters</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab-services-btn"
          >
            <Layers className="w-4 h-4" />
            <span>Services Catalog ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab-schedule-btn"
          >
            <Calendar className="w-4 h-4" />
            <span>Weekly Hours</span>
          </button>
          <button
            onClick={() => setActiveTab('banking')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'banking'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab-banking-btn"
          >
            <CreditCard className="w-4 h-4" />
            <span>Banking & Payments</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ACCESS & PARAMETERS */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              {/* OWNER QR CODE ACCESS TOGGLE */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  ownerQrCodeEnabled
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        ownerQrCodeEnabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ownerQrCodeEnabled ? <QrCode className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Owner QR Code Access & Posters
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            ownerQrCodeEnabled
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {ownerQrCodeEnabled ? 'Allowed (Visible)' : 'Hidden from Owner'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                        Controls whether the owner can view and access the QR Code & Link tab and download printable posters in their dashboard. When disabled, the QR code and printable poster are hidden from the owner while all other dashboard sections (Bookings, Calendar, Services, Customer Directory, and Operations) remain fully accessible.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOwnerQrCodeEnabled((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      ownerQrCodeEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                    id="toggle-owner-qr-btn"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        ownerQrCodeEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Station Active Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Public Station Status</h4>
                  <p className="text-[11px] text-slate-500">
                    Controls whether this station is publicly visible on Brunei customer booking maps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                  id="toggle-station-active-btn"
                >
                  {isActive ? 'Station Active' : 'Station Suspended'}
                </button>
              </div>

              {/* Capacity & Slot Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Slot Duration (Minutes)</label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                    id="slot-duration-select"
                  >
                    <option value={15}>15 Minutes (Express / Touchless)</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes (Standard)</option>
                    <option value={45}>45 Minutes (Detailing)</option>
                    <option value={60}>60 Minutes (Full Service)</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Determines time intervals for customer appointment booking.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Capacity Per Slot (Bays / Vehicles)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacityPerSlot}
                    onChange={(e) => setCapacityPerSlot(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                    id="capacity-slot-input"
                  />
                  <p className="text-[10px] text-slate-400">Maximum concurrent vehicles washed simultaneously.</p>
                </div>
              </div>

              {/* URL Handle & Contact Info */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Direct Booking Slug / Vanity URL</label>
                  <div className="flex rounded-xl shadow-2xs">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs font-mono">
                      /wash/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="e.g. gadong-shine"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-xl border border-slate-200 text-xs font-mono text-slate-800 focus:border-indigo-500"
                      id="vanity-slug-input"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Creates a direct URL for customers to scan and book without login.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Phone / WhatsApp Contact
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+673 888 1234"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                      id="station-phone-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5 text-slate-400" />
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@autoshine.bn"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                      id="station-instagram-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Station Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of facility highlights, equipment, or promotions..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    id="station-description-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICES CATALOG */}
          {activeTab === 'services' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Operational Wash Services & Packages</h3>
                  <p className="text-xs text-slate-500">Configure bookable packages, pricing in BND, and durations.</p>
                </div>
                {!showAddService && (
                  <button
                    type="button"
                    onClick={() => setShowAddService(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    id="add-service-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service</span>
                  </button>
                )}
              </div>

              {/* Add Service Inline Form */}
              {showAddService && (
                <form
                  onSubmit={handleAddService}
                  className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 space-y-4 animate-fade-in"
                  id="new-service-form"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <h4 className="text-xs font-extrabold text-indigo-900">Create New Car Wash Service</h4>
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Service Title *</label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="e.g. Ceramic Foam Wash"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        id="new-service-title"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Category</label>
                      <input
                        type="text"
                        value={newServiceVehicleType}
                        onChange={(e) => setNewServiceVehicleType(e.target.value)}
                        placeholder="Sedan, SUV, or All Vehicles"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        id="new-service-vehicle-type"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Price (BND $) *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        id="new-service-price"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes) *</label>
                      <input
                        type="number"
                        step="5"
                        min="5"
                        required
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        id="new-service-duration"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      placeholder="e.g. Hand dry, rim cleaner, and interior air freshener."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                      id="new-service-desc"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      id="save-new-service-btn"
                    >
                      Add to Catalog
                    </button>
                  </div>
                </form>
              )}

              {/* Service Cards List */}
              {services.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No services created yet</p>
                  <p className="text-[11px] text-slate-400">Click "Add Service" above to add the initial wash package.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-3.5 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-xs">{svc.name}</span>
                          {svc.vehicleType && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              {svc.vehicleType}
                            </span>
                          )}
                        </div>
                        {svc.description && (
                          <p className="text-[11px] text-slate-500 max-w-md line-clamp-1">{svc.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            BND ${Number(svc.price).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {svc.duration} mins
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(svc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-150">
                <h3 className="text-sm font-extrabold text-slate-800">Weekly Operating Hours</h3>
                <p className="text-xs text-slate-500">Configure daily opening and closing hours for appointment slots.</p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(
                  (day) => {
                    const dayConf = schedule[day] || { open: '08:00', close: '18:00', isOpen: false };
                    return (
                      <div
                        key={day}
                        className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          !dayConf.isOpen ? 'bg-slate-50/70' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-32">
                          <input
                            type="checkbox"
                            checked={dayConf.isOpen}
                            onChange={(e) => handleScheduleChange(day, 'isOpen', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            id={`schedule-open-${day}`}
                          />
                          <span className="capitalize text-xs font-extrabold text-slate-800">{day}</span>
                        </div>

                        {dayConf.isOpen ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Open:</span>
                            <input
                              type="time"
                              value={dayConf.open || '08:00'}
                              onChange={(e) => handleScheduleChange(day, 'open', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800"
                            />
                            <span className="text-xs text-slate-400">—</span>
                            <span className="text-xs text-slate-500 font-medium">Close:</span>
                            <input
                              type="time"
                              value={dayConf.close || '18:00'}
                              onChange={(e) => handleScheduleChange(day, 'close', e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            Closed
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-800">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Friday prayer break (12:00 PM – 2:00 PM) is automatically protected across all Brunei facilities.</span>
              </div>
            </div>
          )}

          {/* TAB 4: BANKING & PAYMENTS */}
          {activeTab === 'banking' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-150">
                <h3 className="text-sm font-extrabold text-slate-800">Local Brunei Payment Methods</h3>
                <p className="text-xs text-slate-500">
                  Enable bank transfer accounts for customer bookings. All bookings default to Pay on Site at Counter.
                </p>
              </div>

              {/* BIBD Account */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                      BIBD
                    </div>
                    <span className="text-xs font-extrabold text-slate-800">Bank Islam Brunei Darussalam (BIBD)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-600 font-bold">Enable BIBD</span>
                    <input
                      type="checkbox"
                      checked={bibdEnabled}
                      onChange={(e) => setBibdEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                      id="bibd-enabled-checkbox"
                    />
                  </label>
                </div>

                {bibdEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">BIBD Account Name</label>
                      <input
                        type="text"
                        value={bibdAccountName}
                        onChange={(e) => setBibdAccountName(e.target.value)}
                        placeholder="e.g. AUTOSHINE ENTERPRISE"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        id="bibd-account-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">BIBD Account Number</label>
                      <input
                        type="text"
                        value={bibdAccountNo}
                        onChange={(e) => setBibdAccountNo(e.target.value)}
                        placeholder="e.g. 00001010012345"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                        id="bibd-account-no-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Baiduri Account */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs">
                      BAI
                    </div>
                    <span className="text-xs font-extrabold text-slate-800">Baiduri Bank</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-600 font-bold">Enable Baiduri</span>
                    <input
                      type="checkbox"
                      checked={baiduriEnabled}
                      onChange={(e) => setBaiduriEnabled(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300"
                      id="baiduri-enabled-checkbox"
                    />
                  </label>
                </div>

                {baiduriEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Baiduri Account Name</label>
                      <input
                        type="text"
                        value={baiduriAccountName}
                        onChange={(e) => setBaiduriAccountName(e.target.value)}
                        placeholder="e.g. AUTOSHINE CAR CARE"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        id="baiduri-account-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Baiduri Account Number</label>
                      <input
                        type="text"
                        value={baiduriAccountNo}
                        onChange={(e) => setBaiduriAccountNo(e.target.value)}
                        placeholder="e.g. 0800740123456"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                        id="baiduri-account-no-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-150 flex items-center justify-between bg-slate-50/80">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                ownerQrCodeEnabled ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              QR Code is{' '}
              <strong className={ownerQrCodeEnabled ? 'text-emerald-700' : 'text-amber-700'}>
                {ownerQrCodeEnabled ? 'Visible to Owner' : 'Hidden from Owner'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              id="cancel-operations-modal-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              id="save-operations-modal-btn"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
