/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import {
  Sparkles,
  MapPin,
  Key,
  Info,
  Search,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  PlusCircle,
  Building2,
  Save,
  Navigation,
  Star,
  Trash2,
  RefreshCw,
  Filter,
  Lock,
  Unlock,
  Sliders,
  QrCode,
  EyeOff,
  Award,
  ChevronDown,
  Users,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Ban,
  Building,
  X,
  Calendar,
} from 'lucide-react';
import { CarWash, Role, Review, User } from '../types.js';
import { FEATURES } from '../config/features.js';
import { useTabBack, useModalBack } from '../utils/useBackHandler.js';
import { CarWashOperationsModal } from '../components/CarWashOperationsModal.js';

// Quick Brunei location presets for rapid mapping
const BRUNEI_PRESETS = [
  { name: 'Bandar Seri Begawan', lat: 4.8917, lng: 114.9401 },
  { name: 'Gadong', lat: 4.9015, lng: 114.9175 },
  { name: 'Kiulap', lat: 4.8892, lng: 114.9284 },
  { name: 'Jerudong', lat: 4.9422, lng: 114.8322 },
  { name: 'Sengkurong', lat: 4.9250, lng: 114.8500 },
  { name: 'Berakas', lat: 4.9350, lng: 114.9450 },
  { name: 'Tutong Town', lat: 4.8021, lng: 114.6534 },
  { name: 'Kuala Belait', lat: 4.5833, lng: 114.2333 },
  { name: 'Seria', lat: 4.6064, lng: 114.3267 },
  { name: 'Bangar (Temburong)', lat: 4.7083, lng: 115.0667 },
];

export const SpecialUserDashboard: React.FC = () => {
  const {
    locations,
    adminUsersList,
    createOwnerWithBusiness,
    updateLocationConfig,
    token,
    fetchLocations,
    fetchAdminUsers,
    adminUpdateUser,
    fetchAdminUsersPaginated,
    enforceExpiryNow,
    showNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'directory' | 'onboard' | 'edit_existing'>('directory');
  useTabBack(activeTab, setActiveTab, 'directory', 'specialTab');

  // Carwash Owner Expiry Directory State for Special Users
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const directoryRoleFilter = Role.OWNER; // Strictly restricted to Carwash Owners
  const [directoryCurrentPage, setDirectoryCurrentPage] = useState(1);
  const [directoryPageSize] = useState(10);
  const [directoryTotalPages, setDirectoryTotalPages] = useState(1);
  const [directoryTotalUsers, setDirectoryTotalUsers] = useState(0);
  const [isEnforcingExpiry, setIsEnforcingExpiry] = useState(false);
  const [inlineExpiryDrafts, setInlineExpiryDrafts] = useState<Record<string, string>>({});

  const loadDirectoryUsers = async (page = directoryCurrentPage, limit = directoryPageSize, search = directorySearch) => {
    setDirectoryLoading(true);
    try {
      const res = await fetchAdminUsersPaginated({
        page,
        limit,
        search: search.trim() || undefined,
        role: Role.OWNER,
      });
      if (res) {
        // Enforce strict data isolation: only Carwash Owners
        const ownersOnly = (res.users || []).filter((u: User) => u.role === Role.OWNER);
        setDirectoryUsers(ownersOnly);
        setDirectoryTotalPages(res.totalPages || 1);
        setDirectoryTotalUsers(res.total || ownersOnly.length);
        setDirectoryCurrentPage(res.page || 1);
      }
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'directory') {
      loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch);
    }
  }, [activeTab, directoryCurrentPage]);

  // Debounced search for Carwash Owner Directory
  useEffect(() => {
    if (activeTab !== 'directory') return;
    const timer = setTimeout(() => {
      setDirectoryCurrentPage(1);
      loadDirectoryUsers(1, directoryPageSize, directorySearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [directorySearch]);

  const handleSpecialUpdateOperatorExpiry = async (operatorId: string, expiryDate: string | null) => {
    const isFutureOrPermanent = !expiryDate || new Date(expiryDate).getTime() > Date.now();
    const success = await adminUpdateUser(operatorId, {
      expiryDate,
      status: isFutureOrPermanent ? 'Active' : 'Suspended',
      isActive: isFutureOrPermanent,
    });
    if (success) {
      loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch);
    }
  };

  const handleSpecialToggleUserStatus = async (userToToggle: User) => {
    const data = {
      isActive: !userToToggle.isActive,
      status: !userToToggle.isActive ? 'Active' : 'Suspended',
    };
    const success = await adminUpdateUser(userToToggle.id, data);
    if (success) {
      loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch);
    }
  };

  const handleSpecialEnforceExpiry = async () => {
    setIsEnforcingExpiry(true);
    try {
      await enforceExpiryNow();
      await loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch);
    } finally {
      setIsEnforcingExpiry(false);
    }
  };

  useEffect(() => {
    if (fetchAdminUsers) {
      fetchAdminUsers();
    }
    fetchLocations();
  }, []);

  // Special onboard form states
  const [onboardOwnerMode, setOnboardOwnerMode] = useState<'new' | 'existing'>('new');
  const [selectedOnboardOwnerId, setSelectedOnboardOwnerId] = useState<string>('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('owner123'); // Default initial
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLat, setBusinessLat] = useState<number>(4.8917);
  const [businessLng, setBusinessLng] = useState<number>(114.9401);
  const [latInput, setLatInput] = useState<string>('4.8917');
  const [lngInput, setLngInput] = useState<string>('114.9401');
  const [businessDesc, setBusinessDesc] = useState('');
  const [allowOwnerQrImmediately, setAllowOwnerQrImmediately] = useState<boolean>(false);
  const [allowMembershipImmediately, setAllowMembershipImmediately] = useState<boolean>(false);
  const [operationsModalCarWash, setOperationsModalCarWash] = useState<CarWash | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  // New Owner Expiry Date Assignment
  const [onboardExpiryDate, setOnboardExpiryDate] = useState<string>(() => {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  });
  const [onboardNoExpiry, setOnboardNoExpiry] = useState<boolean>(false);

  // Existing Owner Profile & Expiry Editing Modal State
  const [editingOwner, setEditingOwner] = useState<User | null>(null);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerStatus, setEditOwnerStatus] = useState<string>('Active');
  const [editOwnerExpiryDate, setEditOwnerExpiryDate] = useState('');
  const [editOwnerNoExpiry, setEditOwnerNoExpiry] = useState(false);
  const [editOwnerSubmitting, setEditOwnerSubmitting] = useState(false);

  useModalBack(Boolean(editingOwner), () => setEditingOwner(null), 'special-edit-owner-modal');

  const handleOpenEditOwner = (u: User) => {
    setEditingOwner(u);
    setEditOwnerName(u.name);
    setEditOwnerEmail(u.email);
    setEditOwnerStatus(u.status || (u.isActive ? 'Active' : 'Suspended'));
    if (!u.expiryDate) {
      setEditOwnerNoExpiry(true);
      setEditOwnerExpiryDate('');
    } else {
      setEditOwnerNoExpiry(false);
      setEditOwnerExpiryDate(u.expiryDate.substring(0, 10));
    }
  };

  const handleSaveOwnerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwner) return;
    setEditOwnerSubmitting(true);
    try {
      const targetExpiry = editOwnerNoExpiry
        ? null
        : editOwnerExpiryDate
        ? new Date(editOwnerExpiryDate + 'T23:59:59.999Z').toISOString()
        : null;
      const isFutureOrPermanent = !targetExpiry || new Date(targetExpiry).getTime() > Date.now();
      const isStatusActive = editOwnerStatus === 'Active';
      const effectiveActive = isStatusActive && isFutureOrPermanent;
      const effectiveStatus = effectiveActive ? 'Active' : 'Suspended';

      const data = {
        name: editOwnerName.trim(),
        email: editOwnerEmail.trim(),
        status: effectiveStatus,
        isActive: effectiveActive,
        expiryDate: targetExpiry,
      };

      const success = await adminUpdateUser(editingOwner.id, data);
      if (success) {
        showToast('Owner profile & account expiry date updated successfully!');
        setEditingOwner(null);
        await fetchLocations();
        if (fetchAdminUsers) await fetchAdminUsers();
        loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch);
      }
    } finally {
      setEditOwnerSubmitting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Existing location editor states
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [existOwnerId, setExistOwnerId] = useState<string>('');
  const [existLat, setExistLat] = useState<number>(4.8917);
  const [existLng, setExistLng] = useState<number>(114.9401);
  const [existLatInput, setExistLatInput] = useState<string>('4.8917');
  const [existLngInput, setExistLngInput] = useState<string>('114.9401');
  const [existMembership, setExistMembership] = useState<boolean>(true);
  const [existOwnerQr, setExistOwnerQr] = useState<boolean>(false);
  const [existQuickQuery, setExistQuickQuery] = useState('');
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState('');
  const [operatorFilterTab, setOperatorFilterTab] = useState<'ALL' | 'LOYALTY_ACTIVE' | 'LOYALTY_OFF' | 'QR_ALLOWED' | 'QR_HIDDEN'>('ALL');
  const [isOperatorListOpen, setIsOperatorListOpen] = useState(false);
  const [isTogglingQr, setIsTogglingQr] = useState(false);
  const [isTogglingLoyalty, setIsTogglingLoyalty] = useState(false);

  // Initialize selected existing business when switching tabs or loading locations
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedExistingId) {
      const first = locations[0];
      setSelectedExistingId(first.id);
      setExistOwnerId(first.ownerId || '');
      setExistLat(first.locationLat);
      setExistLng(first.locationLng);
      setExistLatInput(first.locationLat.toString());
      setExistLngInput(first.locationLng.toString());
      setExistMembership(first.membershipEnabled === true);
      setExistOwnerQr(first.ownerQrCodeEnabled === true);
    }
  }, [locations]);

  // Keep form's existMembership & existOwnerQr synchronized whenever locations or selected business updates
  useEffect(() => {
    if (selectedExistingId && locations && locations.length > 0) {
      const current = locations.find((l) => l.id === selectedExistingId);
      if (current) {
        setExistMembership(current.membershipEnabled === true);
        setExistOwnerQr(current.ownerQrCodeEnabled === true);
      }
    }
  }, [locations, selectedExistingId]);

  // Sync state when picking a different business to edit
  const handleSelectExistingBusiness = (id: string) => {
    setSelectedExistingId(id);
    const found = locations.find((loc) => loc.id === id);
    if (found) {
      setExistOwnerId(found.ownerId || '');
      setExistLat(found.locationLat);
      setExistLng(found.locationLng);
      setExistLatInput(found.locationLat.toString());
      setExistLngInput(found.locationLng.toString());
      setExistMembership(found.membershipEnabled === true);
      setExistOwnerQr(found.ownerQrCodeEnabled === true);
    }
    setIsOperatorListOpen(false);
  };

  // Helper to update Onboard Lat/Lng cleanly
  const updateOnboardCoords = (lat: number, lng: number) => {
    setBusinessLat(lat);
    setBusinessLng(lng);
    setLatInput(lat.toString());
    setLngInput(lng.toString());
  };

  // Helper to update Existing Lat/Lng cleanly
  const updateExistCoords = (lat: number, lng: number) => {
    setExistLat(lat);
    setExistLng(lng);
    setExistLatInput(lat.toString());
    setExistLngInput(lng.toString());
  };

  // Parse GPS coordinates string or landmark search
  const handleApplyQuickSearch = (isForExisting = false) => {
    const query = (isForExisting ? existQuickQuery : quickSearchQuery).trim();
    if (!query) return;

    // Check if query is formatted as "lat, lng" e.g., "4.8917, 114.9401"
    const parts = query.split(/[\s,]+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        if (isForExisting) {
          updateExistCoords(lat, lng);
        } else {
          updateOnboardCoords(lat, lng);
        }
        showToast(`Jumped to coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        return;
      }
    }

    // Match Brunei town presets
    const matched = BRUNEI_PRESETS.find((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (matched) {
      if (isForExisting) {
        updateExistCoords(matched.lat, matched.lng);
      } else {
        updateOnboardCoords(matched.lat, matched.lng);
      }
      showToast(`Located area: ${matched.name}`);
    } else {
      showToast('Could not parse coordinates. Please enter as "Latitude, Longitude" (e.g. 4.8917, 114.9401)');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !businessAddress) return;

    setIsSubmitting(true);
    let success = false;

    if (onboardOwnerMode === 'existing') {
      if (!selectedOnboardOwnerId) {
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch('/api/car-washes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: businessName,
            address: businessAddress,
            description: businessDesc,
            locationLat: businessLat,
            locationLng: businessLng,
            ownerId: selectedOnboardOwnerId,
            slotDuration: 30,
            capacityPerSlot: 2,
            ownerNavigationEnabled: true,
            ownerQrCodeEnabled: allowOwnerQrImmediately,
            membershipEnabled: allowMembershipImmediately,
          })
        });
        success = res.ok;
        if (success) {
          await fetchLocations();
          if (fetchAdminUsers) await fetchAdminUsers();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!ownerName || !ownerEmail) {
        setIsSubmitting(false);
        return;
      }
      const targetExpiry = onboardNoExpiry
        ? null
        : onboardExpiryDate
        ? new Date(onboardExpiryDate + 'T23:59:59.999Z').toISOString()
        : null;

      const data = {
        ownerEmail,
        ownerPassword,
        ownerName,
        businessName,
        businessAddress,
        businessLat,
        businessLng,
        businessDesc,
        ownerNavigationEnabled: true,
        ownerQrCodeEnabled: allowOwnerQrImmediately,
        membershipEnabled: allowMembershipImmediately,
        expiryDate: targetExpiry,
      };
      success = await createOwnerWithBusiness(data);
    }

    setIsSubmitting(false);

    if (success) {
      showToast(`Successfully onboarded "${businessName}"!`);
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('owner123');
      setOnboardExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
      setOnboardNoExpiry(false);
      setBusinessName('');
      setBusinessAddress('');
      setBusinessDesc('');
      setSelectedOnboardOwnerId('');
      await fetchLocations();
      if (fetchAdminUsers) await fetchAdminUsers();
    }
  };

  const handleUpdateExistingCoords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingId) return;

    const selectedWash = locations.find((loc) => loc.id === selectedExistingId);
    if (!selectedWash) return;

    setIsUpdatingExisting(true);
    const success = await updateLocationConfig(selectedExistingId, {
      locationLat: existLat,
      locationLng: existLng,
      ownerId: existOwnerId || undefined,
      membershipEnabled: existMembership,
      ownerQrCodeEnabled: existOwnerQr,
    });
    setIsUpdatingExisting(false);

    if (success) {
      showToast(`Updated location details for "${selectedWash.name}"!`);
    } else {
      showToast('Failed to update location. Please try again.');
    }
  };

  const selectedWashObj = locations.find((loc) => loc.id === selectedExistingId);

  const filteredExistingLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (operatorSearchQuery.trim()) {
        const q = operatorSearchQuery.toLowerCase();
        const matchName = loc.name.toLowerCase().includes(q);
        const matchAddr = (loc.address || '').toLowerCase().includes(q);
        const matchEmail = (loc.ownerEmail || '').toLowerCase().includes(q);
        const matchId = loc.id.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchEmail && !matchId) return false;
      }
      if (operatorFilterTab === 'LOYALTY_ACTIVE' && !loc.membershipEnabled) return false;
      if (operatorFilterTab === 'LOYALTY_OFF' && loc.membershipEnabled) return false;
      if (operatorFilterTab === 'QR_ALLOWED' && !loc.ownerQrCodeEnabled) return false;
      if (operatorFilterTab === 'QR_HIDDEN' && loc.ownerQrCodeEnabled) return false;
      return true;
    });
  }, [locations, operatorSearchQuery, operatorFilterTab]);

  const handleQuickToggleQr = async () => {
    if (!selectedWashObj || isTogglingQr) return;
    setIsTogglingQr(true);
    const next = !selectedWashObj.ownerQrCodeEnabled;
    try {
      const success = await updateLocationConfig(selectedWashObj.id, {
        ownerNavigationEnabled: true,
        ownerQrCodeEnabled: next,
      });
      if (success) {
        setExistOwnerQr(next);
        showToast(`Owner QR Code ${next ? 'enabled' : 'hidden'} for "${selectedWashObj.name}"`);
        if (fetchLocations) await fetchLocations();
      }
    } finally {
      setIsTogglingQr(false);
    }
  };

  const handleQuickToggleLoyalty = async () => {
    if (!selectedWashObj || isTogglingLoyalty) return;
    setIsTogglingLoyalty(true);
    const next = !selectedWashObj.membershipEnabled;
    try {
      const success = await updateLocationConfig(selectedWashObj.id, {
        membershipEnabled: next,
      });
      if (success) {
        setExistMembership(next);
        showToast(`Loyalty Programme ${next ? 'enabled' : 'disabled'} for "${selectedWashObj.name}"`);
        if (fetchLocations) await fetchLocations();
      }
    } finally {
      setIsTogglingLoyalty(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[9999] bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-tr from-emerald-700 via-teal-600 to-cyan-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 pointer-events-none">
          <MapPin className="w-96 h-96" />
        </div>
        <span className="bg-white/20 text-white text-[10px] font-extrabold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider backdrop-blur-xs">
          Special Partner Agent Console
        </span>
        <h1 className="text-xl sm:text-3xl font-black mt-3 tracking-tight">Car Wash Merchant & Mapping Hub</h1>
        <p className="text-xs sm:text-sm text-emerald-50 mt-1 max-w-2xl font-medium">
          Onboard new car wash owners, pinpoint exact GPS coordinates via interactive map click, paste latitude/longitude values, or manage existing facility locations.
        </p>

        {/* Tab Switcher */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-white text-emerald-900 shadow-md ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
            id="special-tab-directory"
          >
            <Users className="w-4 h-4" />
            <span>Carwash Owner Directory &amp; Expiry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('onboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'onboard'
                ? 'bg-white text-emerald-900 shadow-md ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard New Owner Business</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit_existing')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'edit_existing'
                ? 'bg-white text-emerald-900 shadow-md ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Update Location Coordinates ({locations.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ONBOARD NEW BUSINESS */}
      {activeTab === 'onboard' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Form Side (7 cols) */}
          <div className="md:col-span-7">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs">
              <h2 className="text-base sm:text-lg font-black text-slate-800 pb-3 border-b border-slate-100 mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                Merchant Onboarding Registration
              </h2>

              <form onSubmit={handleSubmitOnboarding} className="space-y-6 text-xs sm:text-sm">
                {/* Part 1: Owner Profile */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold">
                        1
                      </span>
                      Owner Account Credentials
                    </h3>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setOnboardOwnerMode('new')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${onboardOwnerMode === 'new' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                      >
                        New Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardOwnerMode('existing')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${onboardOwnerMode === 'existing' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                      >
                        Existing Owner
                      </button>
                    </div>
                  </div>

                  {onboardOwnerMode === 'existing' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Select Existing Owner Account</label>
                      <select
                        value={selectedOnboardOwnerId}
                        onChange={(e) => setSelectedOnboardOwnerId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium bg-white text-slate-800"
                        required
                      >
                        <option value="">-- Select Registered Owner --</option>
                        {adminUsersList
                          .filter((u) => u.role === Role.OWNER)
                          .map((owner) => (
                            <option key={owner.id} value={owner.id}>
                              {owner.name} ({owner.email}) - {owner.id}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Owner Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Haji Razak"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium"
                            required={onboardOwnerMode === 'new'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Email Address (Login ID)</label>
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium"
                            required={onboardOwnerMode === 'new'}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Initial Password</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-mono font-bold"
                            required={onboardOwnerMode === 'new'}
                          />
                        </div>
                      </div>

                      {/* Account Expiry Date Assignment for New Owner */}
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-3" id="special-new-owner-expiry-card">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-700" />
                            Account Access / Expiry Date
                          </label>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                            {onboardNoExpiry ? 'Permanent (No Expiry)' : (onboardExpiryDate ? `Expires: ${onboardExpiryDate}` : 'Not Set')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                          <input
                            type="date"
                            disabled={onboardNoExpiry}
                            value={onboardExpiryDate}
                            onChange={(e) => setOnboardExpiryDate(e.target.value)}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-2xs"
                            id="special-onboard-expiry-input"
                          />

                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-emerald-950">
                            <input
                              type="checkbox"
                              checked={onboardNoExpiry}
                              onChange={(e) => {
                                setOnboardNoExpiry(e.target.checked);
                                if (e.target.checked) setOnboardExpiryDate('');
                                else setOnboardExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <span>Permanent (No Expiry Date)</span>
                          </label>
                        </div>

                        {/* Quick Presets */}
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase mr-1">Quick Presets:</span>
                          {[
                            { label: '+30 Days', days: 30 },
                            { label: '+60 Days', days: 60 },
                            { label: '+90 Days', days: 90 },
                            { label: '+1 Year', days: 365 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setOnboardNoExpiry(false);
                                setOnboardExpiryDate(new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
                              }}
                              className="px-2 py-0.5 bg-white hover:bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              {preset.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setOnboardNoExpiry(true);
                              setOnboardExpiryDate('');
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border shadow-2xs ${
                              onboardNoExpiry
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white hover:bg-emerald-100/60 border-emerald-200 text-emerald-800'
                            }`}
                          >
                            Permanent
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                          Sets the initial operational access window for this Carwash Owner. When the access period lapses, operations will automatically suspend unless renewed.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Part 2: Facility Info */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold">
                      2
                    </span>
                    Car Wash Facility Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Car Wash Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ShinePro Detailing Jerudong"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Physical Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Spg 45, Jalan Jerudong, Brunei"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Short Description & Amenities</label>
                    <textarea
                      placeholder="Describe services offered (e.g., Premium Foam Wash, Ceramic Coating, Underbody Wash)..."
                      rows={2}
                      value={businessDesc}
                      onChange={(e) => setBusinessDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Owner QR Code Permission Configuration */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow-owner-qr-toggle"
                    checked={allowOwnerQrImmediately}
                    onChange={(e) => setAllowOwnerQrImmediately(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="allow-owner-qr-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Allow Owner QR Code Access Immediately
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Default is unchecked: keeps the QR Code & printable poster hidden from the owner until verified, while the owner can immediately access and navigate all other operational tabs (Bookings, Calendar, Services, Operations).
                    </p>
                  </div>
                </div>

                {/* Loyalty & Rewards Membership Permission Configuration */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="allow-membership-toggle"
                    checked={allowMembershipImmediately}
                    onChange={(e) => setAllowMembershipImmediately(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="allow-membership-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">
                      Enable Loyalty &amp; Rewards Programme Immediately
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Activates points earning on online bookings and walk-ins, digital QR membership passes, and redeemable rewards catalogue for this facility.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  id="submit-onboarding-btn"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registering Merchant...' : 'Complete Business Onboarding'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Map & Coordinates Picker Side (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Set Location GPS Coordinates
                  </h3>
                  <p className="text-[11px] text-slate-500">Click anywhere on the map to place pin</p>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(`${businessLat}, ${businessLng}`)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Copy Lat, Lng"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                </button>
              </div>

              {/* Quick Search or Paste Coords Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search area or paste 'Lat, Lng'..."
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyQuickSearch(false);
                      }
                    }}
                    className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyQuickSearch(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Go
                </button>
              </div>

              {/* Quick Brunei Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Brunei Town Presets:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                  {BRUNEI_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => updateOnboardCoords(preset.lat, preset.lng)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[320px] shadow-inner">
                <MapSimulation
                  locations={[]}
                  interactiveSelectCoords={{ lat: businessLat, lng: businessLng }}
                  onMapClickSelectCoords={(coords) => {
                    updateOnboardCoords(coords.lat, coords.lng);
                  }}
                  userLat={businessLat}
                  userLng={businessLng}
                  compact={true}
                />
              </div>

              {/* Manual Lat & Lng Input Fields */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Manual Coordinate Inputs (Decimal GPS)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLatInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
                          setBusinessLat(parsed);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-mono font-bold text-xs text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lngInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLngInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
                          setBusinessLng(parsed);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-mono font-bold text-xs text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                  <span>Pin: {businessLat.toFixed(6)}, {businessLng.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${businessLat},${businessLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EDIT EXISTING CAR WASH COORDINATES */}
      {activeTab === 'edit_existing' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fade-in">
          {/* Select & Details Side (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
              <h2 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                Select Existing Business
              </h2>

              {locations.length === 0 ? (
                <p className="text-xs text-slate-500">No car wash businesses registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {/* Clean Operator Switcher & Scalable Browser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Car Wash Facility</label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {selectedWashObj ? `Selected: ${selectedWashObj.name}` : `Total ${locations.length} operators`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOperatorListOpen((prev) => !prev)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        id="special-toggle-operators-btn"
                      >
                        <span>{isOperatorListOpen ? 'Close List' : `Switch Facility (${locations.length})`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOperatorListOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expandable Operator Browser */}
                    {isOperatorListOpen && (
                      <div className="space-y-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 animate-fade-in">
                        {/* Instant Search Bar */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search operator name, address, owner email..."
                            value={operatorSearchQuery}
                            onChange={(e) => setOperatorSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                            autoFocus
                          />
                          {operatorSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setOperatorSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setOperatorFilterTab('ALL')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              operatorFilterTab === 'ALL'
                                ? 'bg-slate-800 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200/80'
                            }`}
                          >
                            All ({locations.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOperatorFilterTab('LOYALTY_ACTIVE')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              operatorFilterTab === 'LOYALTY_ACTIVE'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                            }`}
                          >
                            ⭐ Loyalty ({locations.filter((l) => l.membershipEnabled).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOperatorFilterTab('LOYALTY_OFF')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              operatorFilterTab === 'LOYALTY_OFF'
                                ? 'bg-slate-700 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200/80'
                            }`}
                          >
                            No Loyalty ({locations.filter((l) => !l.membershipEnabled).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOperatorFilterTab('QR_ALLOWED')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              operatorFilterTab === 'QR_ALLOWED'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                            }`}
                          >
                            QR Allowed ({locations.filter((l) => l.ownerQrCodeEnabled).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOperatorFilterTab('QR_HIDDEN')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              operatorFilterTab === 'QR_HIDDEN'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            QR Hidden ({locations.filter((l) => !l.ownerQrCodeEnabled).length})
                          </button>
                        </div>

                        {/* Quick Select Dropdown / Searchable List */}
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin rounded-xl border border-slate-200/90 bg-white p-1.5">
                          {filteredExistingLocations.length === 0 ? (
                            <p className="text-center py-4 text-xs text-slate-400 font-medium">No operators matched your filter.</p>
                          ) : (
                            filteredExistingLocations.map((wash) => {
                              const isSelected = wash.id === selectedExistingId;
                              return (
                                <button
                                  key={wash.id}
                                  type="button"
                                  onClick={() => handleSelectExistingBusiness(wash.id)}
                                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                                    isSelected
                                      ? 'bg-emerald-50/50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                      : 'bg-white hover:bg-slate-50 border-slate-200/70'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-xs text-slate-800 truncate block">
                                        {wash.name}
                                      </span>
                                      {isSelected && (
                                        <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-sm shrink-0">
                                          CURRENT
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                      {wash.address || 'No Address Set'}
                                      {wash.ownerEmail ? ` • ${wash.ownerEmail}` : ''}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          wash.membershipEnabled
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {wash.membershipEnabled ? '⭐ Loyalty Active' : 'No Loyalty'}
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          wash.ownerQrCodeEnabled
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                        }`}
                                      >
                                        {wash.ownerQrCodeEnabled ? 'QR Allowed' : 'QR Hidden'}
                                      </span>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedWashObj && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                          Current Record
                        </span>
                        <h3 className="font-extrabold text-slate-800 text-sm">{selectedWashObj.name}</h3>
                        <p className="text-xs text-slate-600">{selectedWashObj.address}</p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Owner QR Code:</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                              selectedWashObj.ownerQrCodeEnabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {selectedWashObj.ownerQrCodeEnabled ? 'Allowed (Visible)' : 'Hidden'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Loyalty &amp; Rewards:</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                              selectedWashObj.membershipEnabled
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {selectedWashObj.membershipEnabled ? '⭐ Active (Enabled)' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Owner Email:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.ownerEmail || 'N/A'}</span>
                        </div>

                        {/* Owner Account Expiry Timeline & Edit Button */}
                        {(() => {
                          const linkedOwner = adminUsersList.find(
                            (u) => u.id === selectedWashObj.ownerId || (selectedWashObj.ownerEmail && u.email.toLowerCase() === selectedWashObj.ownerEmail.toLowerCase())
                          );
                          const hasExpiry = Boolean(linkedOwner?.expiryDate);
                          const isExpired = hasExpiry && new Date(linkedOwner!.expiryDate!).getTime() < Date.now();
                          const daysLeft = hasExpiry
                            ? Math.ceil((new Date(linkedOwner!.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                            : null;

                          return (
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 my-1" id="special-existing-owner-expiry-info">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-bold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> Account Expiry:
                                </span>
                                {linkedOwner ? (
                                  isExpired ? (
                                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      Expired ({new Date(linkedOwner.expiryDate!).toLocaleDateString()})
                                    </span>
                                  ) : hasExpiry ? (
                                    <span className={`font-bold px-2 py-0.5 rounded border ${
                                      daysLeft !== null && daysLeft <= 7
                                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    }`}>
                                      {daysLeft} days left ({new Date(linkedOwner.expiryDate!).toLocaleDateString()})
                                    </span>
                                  ) : (
                                    <span className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      Permanent (No Expiry)
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 font-mono">Not Linked</span>
                                )}
                              </div>
                              {linkedOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditOwner(linkedOwner)}
                                  className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                  id="special-edit-existing-owner-expiry-btn"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Edit Owner Profile &amp; Expiry Date</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Current Lat:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.locationLat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Current Lng:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.locationLng}</span>
                        </div>
                      </div>

                      {/* Owner QR Code & Loyalty Quick Toggles & Operations Button */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 font-bold">Quick Toggles:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              disabled={isTogglingQr}
                              onClick={handleQuickToggleQr}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                                selectedWashObj.ownerQrCodeEnabled
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              } disabled:opacity-50`}
                              id="special-quick-toggle-owner-qr-btn"
                              title="Toggle Owner QR code access"
                            >
                              {isTogglingQr ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : selectedWashObj.ownerQrCodeEnabled ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Hide QR</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Allow QR</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isTogglingLoyalty}
                              onClick={handleQuickToggleLoyalty}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                                selectedWashObj.membershipEnabled
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                              } disabled:opacity-50`}
                              id="special-quick-toggle-loyalty-btn"
                              title="Toggle Loyalty & Rewards membership for this car wash"
                            >
                              {isTogglingLoyalty ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Award className="w-3.5 h-3.5" />
                                  <span>{selectedWashObj.membershipEnabled ? 'Disable Loyalty' : 'Enable Loyalty'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>


                        <button
                          type="button"
                          onClick={() => setOperationsModalCarWash(selectedWashObj)}
                          className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          id="special-manage-operations-btn"
                        >
                          <Sliders className="w-4 h-4" />
                          <span>Configure Operations, Services & Schedule</span>
                        </button>
                      </div>

                      <a
                        href={`https://www.google.com/maps?q=${selectedWashObj.locationLat},${selectedWashObj.locationLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:underline pt-1"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>View Current Pin on Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Map & Coords Form (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Reposition Map Pin & Update Coordinates
                  </h3>
                  <p className="text-[11px] text-slate-500">Click anywhere on map to reposition the pin</p>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(`${existLat}, ${existLng}`)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                </button>
              </div>

              {/* Quick Search Box */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search town or paste 'Lat, Lng'..."
                    value={existQuickQuery}
                    onChange={(e) => setExistQuickQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyQuickSearch(true);
                      }
                    }}
                    className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyQuickSearch(true)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Go
                </button>
              </div>

              {/* Quick Brunei Town Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Brunei Town Presets:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
                  {BRUNEI_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => updateExistCoords(preset.lat, preset.lng)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Component */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[360px] shadow-inner">
                <MapSimulation
                  locations={selectedWashObj ? [selectedWashObj] : []}
                  interactiveSelectCoords={{ lat: existLat, lng: existLng }}
                  onMapClickSelectCoords={(coords) => {
                    updateExistCoords(coords.lat, coords.lng);
                  }}
                  userLat={existLat}
                  userLng={existLng}
                  compact={true}
                />
              </div>

              {/* Lat/Lng Input & Save */}
              <form onSubmit={handleUpdateExistingCoords} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Assigned Business Owner
                  </label>
                  <select
                    value={existOwnerId}
                    onChange={(e) => setExistOwnerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-medium text-xs text-slate-800 outline-none"
                  >
                    <option value="">-- Select Owner Account --</option>
                    {adminUsersList
                      .filter((u) => u.role === Role.OWNER)
                      .map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.name} ({owner.email}) - {owner.id}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Loyalty &amp; Membership Programme
                  </label>
                  <select
                    value={existMembership ? 'enabled' : 'disabled'}
                    onChange={(e) => setExistMembership(e.target.value === 'enabled')}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-medium text-xs text-slate-800 outline-none"
                  >
                    <option value="enabled">⭐ Enabled (Loyalty Club &amp; Points Active)</option>
                    <option value="disabled">Disabled (Hidden from Customers &amp; Inactive)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enabling grants the car wash owner and bay operators active loyalty points awarding and customer reward redemptions.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Owner QR Code Access (Visible / Hidden)
                  </label>
                  <select
                    value={existOwnerQr ? 'allowed' : 'hidden'}
                    onChange={(e) => setExistOwnerQr(e.target.value === 'allowed')}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-medium text-xs text-slate-800 outline-none"
                    id="special-form-owner-qr-select"
                  >
                    <option value="allowed">Allowed (Visible on Portal &amp; Mobile Booking Page)</option>
                    <option value="hidden">Hidden (Restricted / Internal Operations Only)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Controls whether the car wash facility's public booking QR code and promotional badges are displayed to the public.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Latitude Coordinate
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={existLatInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExistLatInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= -90 && parsed <= 90) {
                          setExistLat(parsed);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-mono font-bold text-xs text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Longitude Coordinate
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={existLngInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExistLngInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= -180 && parsed <= 180) {
                          setExistLng(parsed);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 rounded-xl bg-white font-mono font-bold text-xs text-slate-800"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingExisting || !selectedExistingId}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdatingExisting ? 'Saving GPS Changes...' : 'Save Updated GPS Location'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CARWASH OWNER DIRECTORY & EXPIRY MANAGEMENT (SPECIAL USER EXCLUSIVE SCOPE) */}
      {activeTab === 'directory' && (() => {
        const displayedUsers = (directoryUsers.length > 0 ? directoryUsers : adminUsersList).filter((u) => u.role === Role.OWNER);
        const countTotal = directoryTotalUsers > 0 ? directoryTotalUsers : displayedUsers.length;

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5" id="system-marketplace-directory">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Carwash Owner Directory &amp; Expiry Management</h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono">
                    {countTotal} {countTotal === 1 ? 'Carwash Owner' : 'Carwash Owners'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage marketplace carwash owners, subscription access periods, and account expiration dates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isEnforcingExpiry}
                  onClick={handleSpecialEnforceExpiry}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Check all owner expiry dates and immediately suspend expired accounts and their carwashes"
                  id="special-enforce-expiry-btn"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isEnforcingExpiry ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                  <span>{isEnforcingExpiry ? 'Checking Expirations...' : 'Run Expiry Check'}</span>
                </button>
              </div>
            </div>

            {/* Search controls & Strict Scope Info */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Carwash Owners by Name, Email, or Business Name..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium shadow-2xs"
                    id="special-user-search-input"
                  />
                  {directorySearch && (
                    <button
                      type="button"
                      onClick={() => setDirectorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadDirectoryUsers(directoryCurrentPage, directoryPageSize, directorySearch)}
                    className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${directoryLoading ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Data Isolation Scope Badge - Visibility Stripping for Employees/Customers/Special Users */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Scope:</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  <Building className="w-3 h-3" />
                  Carwash Owners Exclusively
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  (Special User role is strictly scoped to Carwash Owner accounts &amp; subscription expiry management)
                </span>
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="special-users-table">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Carwash Owner / Business</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 min-w-[240px]">Account Expiry Date</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                  {directoryLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                        Loading carwash owner directory...
                      </td>
                    </tr>
                  ) : displayedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                        No carwash owner accounts found matching current query.
                      </td>
                    </tr>
                  ) : (
                    displayedUsers.map((u) => {
                      const isOwner = u.role === Role.OWNER;
                      const hasExpiry = Boolean(u.expiryDate);
                      const isExpired = hasExpiry && new Date(u.expiryDate!).getTime() < Date.now();
                      const daysRemaining = hasExpiry
                        ? Math.ceil((new Date(u.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;

                      const draftVal = inlineExpiryDrafts[u.id] !== undefined
                        ? inlineExpiryDrafts[u.id]
                        : (u.expiryDate ? u.expiryDate.substring(0, 10) : '');

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* User & Business details */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-start gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                                isExpired || !u.isActive ? 'bg-rose-500' : 'bg-emerald-500'
                              }`} />
                              <div>
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">{u.name}</div>
                                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{u.email}</div>
                                {Boolean(u.businessName) && (
                                  <div className="flex items-center gap-1 text-[11px] text-sky-800 font-semibold mt-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80 w-fit">
                                    <Building className="h-3 w-3 text-sky-600 shrink-0" />
                                    <span>{u.businessName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                              u.role === Role.ADMIN
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : u.role === Role.OWNER
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : u.role === Role.EMPLOYEE
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : u.role === Role.SPECIAL
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-sky-50 border-sky-200 text-sky-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit uppercase">
                                  <Ban className="h-3 w-3" /> EXPIRED
                                </span>
                              ) : u.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit uppercase">
                                  <ShieldCheck className="h-3 w-3" /> ACTIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit uppercase">
                                  <Ban className="h-3 w-3" /> SUSPENDED
                                </span>
                              )}
                              {u.isEmailVerified === false && (
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-mono font-bold w-fit">
                                  UNVERIFIED
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Granular Expiry Date Management (Carwash Owners) */}
                          <td className="py-3.5 px-4">
                            {isOwner ? (
                              <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 max-w-xs">
                                <div className="flex items-center justify-between text-[11px]">
                                  {isExpired ? (
                                    <span className="font-bold text-rose-700 flex items-center gap-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                      Expired on {new Date(u.expiryDate!).toLocaleDateString()}
                                    </span>
                                  ) : hasExpiry ? (
                                    <span className={`font-bold flex items-center gap-1 ${
                                      daysRemaining !== null && daysRemaining <= 7 ? 'text-amber-700' : 'text-emerald-700'
                                    }`}>
                                      <Clock className="h-3.5 w-3.5" />
                                      {daysRemaining !== null && daysRemaining <= 0
                                        ? 'Expires today'
                                        : `${daysRemaining} days remaining`}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-slate-600 flex items-center gap-1">
                                      ♾️ Permanent (No Expiry)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={draftVal}
                                    onChange={(e) => {
                                      setInlineExpiryDrafts((prev) => ({
                                        ...prev,
                                        [u.id]: e.target.value,
                                      }));
                                    }}
                                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 w-36 shadow-2xs"
                                    title="Select Account Expiry Date"
                                  />

                                  {draftVal !== (u.expiryDate ? u.expiryDate.substring(0, 10) : '') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (draftVal) {
                                          handleSpecialUpdateOperatorExpiry(u.id, new Date(draftVal + 'T23:59:59.999Z').toISOString());
                                        }
                                      }}
                                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer shadow-xs transition-colors"
                                      title="Save Expiry Date"
                                    >
                                      Save
                                    </button>
                                  )}

                                  {/* Non-Expiring / Permanent Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (hasExpiry) {
                                        // Set to permanent
                                        handleSpecialUpdateOperatorExpiry(u.id, null);
                                        setInlineExpiryDrafts((prev) => {
                                          const copy = { ...prev };
                                          delete copy[u.id];
                                          return copy;
                                        });
                                      } else {
                                        // Set 30 days subscription access
                                        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
                                        handleSpecialUpdateOperatorExpiry(u.id, new Date(d + 'T23:59:59.999Z').toISOString());
                                      }
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border transition-colors ${
                                      !hasExpiry
                                        ? 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
                                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                                    }`}
                                    title="Toggle between permanent access and expiration date"
                                  >
                                    {!hasExpiry ? 'Add Expiry' : 'No Expiry'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">— (Permanent)</span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                            {u.createdAt ? u.createdAt.substring(0, 10) : 'N/A'}
                          </td>

                          {/* Operations */}
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {u.role !== Role.ADMIN && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditOwner(u)}
                                className="px-2.5 py-1 font-bold text-xs rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Edit Profile & Expiry Date"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Profile</span>
                              </button>
                            )}
                            {u.role !== Role.ADMIN && (
                              <button
                                onClick={() => handleSpecialToggleUserStatus(u)}
                                className={`p-1.5 font-bold text-xs rounded-lg transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'text-rose-600 hover:bg-rose-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.isActive ? 'Suspend User account' : 'Reactivate User account'}
                              >
                                {u.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {directoryTotalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                <div>
                  Page <strong className="font-bold text-slate-800">{directoryCurrentPage}</strong> of{' '}
                  <strong className="font-bold text-slate-800">{directoryTotalPages}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={directoryCurrentPage <= 1}
                    onClick={() => setDirectoryCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={directoryCurrentPage >= directoryTotalPages}
                    onClick={() => setDirectoryCurrentPage((p) => Math.min(directoryTotalPages, p + 1))}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* Footer Info Box */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-900 flex gap-3 shadow-xs">
        <Info className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="font-medium">
          <strong>Special Partner Mapping Notice:</strong> Accurate GPS coordinates ensure customer distance calculations and nearest-facility maps work flawlessly across Brunei. Clicking directly on the interactive map sets exact pin locations with 6-digit decimal precision.
        </p>
      </div>

      {/* Special User: Edit Owner Profile & Expiry Date Modal */}
      {editingOwner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="relative my-auto bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-left max-h-[90vh] overflow-y-auto overscroll-contain space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Edit Owner Profile &amp; Expiry</h3>
                  <p className="text-[11px] text-slate-500">Manage operator credentials &amp; subscription timeline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOwner(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOwnerEdit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Owner Name</label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-semibold text-slate-800 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email (Login ID)</label>
                <input
                  type="email"
                  value={editOwnerEmail}
                  onChange={(e) => setEditOwnerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-mono font-medium text-slate-800 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Account Operational Status</label>
                <select
                  value={editOwnerStatus}
                  onChange={(e) => setEditOwnerStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-slate-800 bg-white"
                >
                  <option value="Active">ACTIVE (Operational &amp; Visible)</option>
                  <option value="Suspended">SUSPENDED (Hidden from Marketplace)</option>
                </select>
              </div>

              {/* Account Expiry Date UI */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    Account Access / Expiry Date
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                    {editOwnerNoExpiry ? 'Permanent (No Expiry)' : (editOwnerExpiryDate || 'Not Set')}
                  </span>
                </div>

                {/* Current Expiry Timeline info */}
                {editingOwner.expiryDate ? (() => {
                  const expiryMs = new Date(editingOwner.expiryDate).getTime();
                  const nowMs = Date.now();
                  const daysLeft = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));
                  const isPast = daysLeft <= 0;
                  return (
                    <div className={`p-2 rounded-xl text-xs font-medium flex items-center justify-between border ${
                      isPast ? 'bg-rose-50 text-rose-800 border-rose-200' : daysLeft <= 7 ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-white text-emerald-900 border-emerald-200'
                    }`}>
                      <span>Current Access:</span>
                      <strong className="font-bold">
                        {isPast ? `Expired (${Math.abs(daysLeft)} days ago)` : `${daysLeft} days remaining`}
                      </strong>
                    </div>
                  );
                })() : (
                  <div className="p-2 rounded-xl text-xs font-medium bg-white text-emerald-900 border border-emerald-200 flex items-center justify-between">
                    <span>Current Access:</span>
                    <strong className="font-bold">♾️ Permanent (No Expiry)</strong>
                  </div>
                )}

                <input
                  type="date"
                  disabled={editOwnerNoExpiry}
                  value={editOwnerExpiryDate}
                  onChange={(e) => setEditOwnerExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-2xs"
                  id="special-edit-owner-expiry-input"
                />

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={editOwnerNoExpiry}
                    onChange={(e) => {
                      setEditOwnerNoExpiry(e.target.checked);
                      if (e.target.checked) setEditOwnerExpiryDate('');
                      else setEditOwnerExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Permanent Account (No Expiration Date)</span>
                </label>

                {/* Duration Presets */}
                <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase mr-1">Quick Presets:</span>
                  {[
                    { label: '+30 Days', days: 30 },
                    { label: '+60 Days', days: 60 },
                    { label: '+90 Days', days: 90 },
                    { label: '+1 Year', days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setEditOwnerNoExpiry(false);
                        setEditOwnerExpiryDate(new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEditOwnerNoExpiry(true);
                      setEditOwnerExpiryDate('');
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border shadow-2xs ${
                      editOwnerNoExpiry
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white hover:bg-emerald-100/60 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    Permanent
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editOwnerSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  id="special-save-owner-edit-btn"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editOwnerSubmitting ? 'Saving...' : 'Save Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Car Wash Operations & Services Management Modal */}
      {operationsModalCarWash && (
        <CarWashOperationsModal
          carWash={operationsModalCarWash}
          isOpen={!!operationsModalCarWash}
          onClose={() => setOperationsModalCarWash(null)}
        />
      )}
    </div>
  );
};
