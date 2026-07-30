/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Navigation
} from 'lucide-react';
import { CarWash, Role } from '../types.js';

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
  const { locations, adminUsersList, createOwnerWithBusiness, updateLocationConfig, token } = useApp();

  const [activeTab, setActiveTab] = useState<'onboard' | 'edit_existing'>('onboard');

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
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

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
  const [existQuickQuery, setExistQuickQuery] = useState('');
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);

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
    }
  }, [locations]);

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
    }
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
            capacityPerSlot: 2
          })
        });
        success = res.ok;
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!ownerName || !ownerEmail) {
        setIsSubmitting(false);
        return;
      }
      const data = {
        ownerEmail,
        ownerPassword,
        ownerName,
        businessName,
        businessAddress,
        businessLat,
        businessLng,
        businessDesc,
      };
      success = await createOwnerWithBusiness(data);
    }

    setIsSubmitting(false);

    if (success) {
      showToast(`Successfully onboarded "${businessName}"!`);
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('owner123');
      setBusinessName('');
      setBusinessAddress('');
      setBusinessDesc('');
      setSelectedOnboardOwnerId('');
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
    });
    setIsUpdatingExisting(false);

    if (success) {
      showToast(`Updated location details for "${selectedWash.name}"!`);
    } else {
      showToast('Failed to update location. Please try again.');
    }
  };

  const selectedWashObj = locations.find((loc) => loc.id === selectedExistingId);

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
            onClick={() => setActiveTab('onboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'onboard'
                ? 'bg-white text-emerald-900 shadow-md ring-2 ring-white/50'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard New Business</span>
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
            <span>Update Existing Location Coordinates ({locations.length})</span>
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
                            placeholder="owner@carwash.bn"
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
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Choose Car Wash Facility</label>
                    <select
                      value={selectedExistingId}
                      onChange={(e) => handleSelectExistingBusiness(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-bold text-slate-800 bg-white"
                    >
                      {locations.map((wash) => (
                        <option key={wash.id} value={wash.id}>
                          {wash.name} ({wash.address || 'No Address'})
                        </option>
                      ))}
                    </select>
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
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Owner Email:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.ownerEmail || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Current Lat:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.locationLat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Current Lng:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedWashObj.locationLng}</span>
                        </div>
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

      {/* Footer Info Box */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-900 flex gap-3 shadow-xs">
        <Info className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="font-medium">
          <strong>Special Partner Mapping Notice:</strong> Accurate GPS coordinates ensure customer distance calculations and nearest-facility maps work flawlessly across Brunei. Clicking directly on the interactive map sets exact pin locations with 6-digit decimal precision.
        </p>
      </div>
    </div>
  );
};
