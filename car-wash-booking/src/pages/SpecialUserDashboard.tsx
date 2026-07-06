/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import { Sparkles, User, Sliders, MapPin, Key, Info, HelpCircle } from 'lucide-react';

export const SpecialUserDashboard: React.FC = () => {
  const { createOwnerWithBusiness } = useApp();

  // Special onboard form states
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('owner123'); // Default initial
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLat, setBusinessLat] = useState(37.7749);
  const [businessLng, setBusinessLng] = useState(-122.4194);
  const [businessDesc, setBusinessDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !ownerEmail || !businessName || !businessAddress) return;

    setIsSubmitting(true);
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

    const success = await createOwnerWithBusiness(data);
    setIsSubmitting(false);

    if (success) {
      // Clear forms
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('owner123');
      setBusinessName('');
      setBusinessAddress('');
      setBusinessDesc('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Hero Banner */}
      <div className="bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/15 uppercase tracking-wider">
          Partner Agent Console
        </span>
        <h1 className="text-xl sm:text-3xl font-extrabold mt-3 tracking-tight">Onboard New Businesses</h1>
        <p className="text-xs sm:text-sm text-emerald-50 mt-1 max-w-xl">
          Create new Owner accounts and register their physical car wash facilities on our platform. High-level merchant onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Onboarding Form (7 columns) */}
        <div className="md:col-span-7">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 pb-3 border-b border-slate-100 mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Onboarding Form details
            </h2>

            <form onSubmit={handleSubmitOnboarding} className="space-y-6 text-xs sm:text-sm">
              {/* Part 1: Owner Details */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">1</span>
                  Merchant Account Profile
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Owner Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jack Owner"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="owner@carwash.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Business details */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">2</span>
                  Business Location Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Facility Name</label>
                    <input
                      type="text"
                      placeholder="Downtown Crystal Clean"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Physical Address</label>
                    <input
                      type="text"
                      placeholder="455 Market St, San Francisco, CA"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
                  <textarea
                    placeholder="Describe specific cleaning and detailing amenities..."
                    rows={2}
                    value={businessDesc}
                    onChange={(e) => setBusinessDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-xl outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                id="submit-onboarding-btn"
              >
                {isSubmitting ? 'Onboarding in progress...' : 'Complete Business Onboarding'}
              </button>
            </form>
          </div>
        </div>

        {/* Coords Selection Assist map on Right (5 columns) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Select Map Coordinates</h3>
              <p className="text-xs text-slate-400 mt-0.5">Click the map to drop a visual pin</p>
            </div>

            <div className="flex-1 mt-4 rounded-2xl border border-slate-200 overflow-hidden relative min-h-[480px] sm:min-h-[350px]">
              <MapSimulation
                locations={[]}
                interactiveSelectCoords={{ lat: businessLat, lng: businessLng }}
                onMapClickSelectCoords={(coords) => {
                  setBusinessLat(coords.lat);
                  setBusinessLng(coords.lng);
                }}
                userLat={businessLat}
                userLng={businessLng}
              />
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-4 text-xs font-mono text-slate-500 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Latitude (GPS Coordinate)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={businessLat}
                  onChange={(e) => setBusinessLat(parseFloat(e.target.value) || 37.7749)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Longitude (GPS Coordinate)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={businessLng}
                  onChange={(e) => setBusinessLng(parseFloat(e.target.value) || -122.4194)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-800 flex gap-3">
        <Info className="h-5 w-5 text-emerald-600 shrink-0" />
        <p>
          Special Partner accounts help expand the marketplace dynamically. Merchants onboarded through this form will have full OWNER access instantly. Their default login credentials will be their provided email and the specified password.
        </p>
      </div>
    </div>
  );
};
