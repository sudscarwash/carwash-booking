/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CarWash, CustomerMembership, MembershipRedemption, MembershipPointsRule, WashService } from '../types';
import { useApp } from '../context/AppContext';
import { Award, QrCode, Search, Gift, CheckCircle, AlertTriangle, X, ArrowRight, UserCheck, Camera, Plus, Check, RotateCcw } from 'lucide-react';
import { CameraQrScannerModal } from './CameraQrScannerModal.js';

interface StaffMembershipCounterModalProps {
  carWashId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffMembershipCounterModal: React.FC<StaffMembershipCounterModalProps> = ({
  carWashId,
  isOpen,
  onClose,
}) => {
  const { locations, showNotification } = useApp();
  const currentCarWash = locations.find((l) => l.id === carWashId);

  const [activeTab, setActiveTab] = useState<'scan_member' | 'redeem_voucher'>('scan_member');

  // Member search & counter points state
  const [memberInput, setMemberInput] = useState('');
  const [searchingMember, setSearchingMember] = useState(false);
  const [foundMember, setFoundMember] = useState<CustomerMembership | null>(null);

  // Multi-Service Points Award State
  const [pointsRules, setPointsRules] = useState<MembershipPointsRule[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [hasCustomService, setHasCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePoints, setCustomServicePoints] = useState<number>(10);
  const [counterPoints, setCounterPoints] = useState<number>(10);
  const [manualPointsOverride, setManualPointsOverride] = useState<boolean>(false);
  const [awardingPoints, setAwardingPoints] = useState(false);

  // Voucher redemption state
  const [voucherInput, setVoucherInput] = useState('');
  const [searchingVoucher, setSearchingVoucher] = useState(false);
  const [foundVoucher, setFoundVoucher] = useState<MembershipRedemption | null>(null);
  const [confirmingVoucher, setConfirmingVoucher] = useState(false);
  const [confirmedSessionVouchers, setConfirmedSessionVouchers] = useState<MembershipRedemption[]>([]);

  // Camera QR Scanner state
  const [cameraScannerMode, setCameraScannerMode] = useState<'member' | 'voucher' | null>(null);

  // Fetch points rules for this location
  useEffect(() => {
    if (!carWashId || !isOpen) return;
    fetch(`/api/membership/points-rules/${carWashId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rules) => {
        if (Array.isArray(rules)) setPointsRules(rules);
      })
      .catch(() => {});
  }, [carWashId, isOpen]);

  // Points helper for a service
  const getServicePoints = useCallback((svc: WashService): number => {
    const matchRule = pointsRules.find((r) => r.serviceId === svc.id);
    if (matchRule && typeof matchRule.pointsAwarded === 'number' && matchRule.pointsAwarded > 0) {
      return matchRule.pointsAwarded;
    }
    if (typeof svc.points === 'number' && svc.points > 0) {
      return svc.points;
    }
    return Math.max(1, Math.round(Number(svc.price) || 10));
  }, [pointsRules]);

  // Total points calculation helper
  const calculateTotalPoints = useCallback((serviceIds: string[], withCustom: boolean, customPts: number): number => {
    let sum = 0;
    for (const id of serviceIds) {
      const svc = currentCarWash?.services?.find((s) => s.id === id);
      if (svc) sum += getServicePoints(svc);
    }
    if (withCustom && customPts > 0) {
      sum += customPts;
    }
    return sum;
  }, [currentCarWash?.services, getServicePoints]);

  // Modular Search Member
  const lookupMember = async (inputStr: string) => {
    const clean = inputStr.trim();
    if (!clean) return;
    setSearchingMember(true);
    setFoundMember(null);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/identify/${encodeURIComponent(clean)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFoundMember(data);

        // Pre-select first service if nothing is selected
        if (currentCarWash?.services && currentCarWash.services.length > 0 && selectedServiceIds.length === 0) {
          const first = currentCarWash.services[0];
          const initialIds = [first.id];
          setSelectedServiceIds(initialIds);
          const autoPts = calculateTotalPoints(initialIds, false, 0);
          setCounterPoints(autoPts || 10);
          setManualPointsOverride(false);
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Member not found with this code, phone or QR pass', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Error looking up member', 'error');
    } finally {
      setSearchingMember(false);
    }
  };

  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    lookupMember(memberInput);
  };

  // Toggle multi-service
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      if (!manualPointsOverride) {
        const total = calculateTotalPoints(next, hasCustomService, customServicePoints);
        setCounterPoints(total);
      }
      return next;
    });
  };

  const handleSelectAllServices = () => {
    const allIds = (currentCarWash?.services || []).map((s) => s.id);
    setSelectedServiceIds(allIds);
    if (!manualPointsOverride) {
      setCounterPoints(calculateTotalPoints(allIds, hasCustomService, customServicePoints));
    }
  };

  const handleClearAllServices = () => {
    setSelectedServiceIds([]);
    if (!manualPointsOverride) {
      setCounterPoints(calculateTotalPoints([], hasCustomService, customServicePoints));
    }
  };

  const handleCustomServiceToggle = (enabled: boolean) => {
    setHasCustomService(enabled);
    if (!manualPointsOverride) {
      setCounterPoints(calculateTotalPoints(selectedServiceIds, enabled, customServicePoints));
    }
  };

  const handleCustomPointsChange = (pts: number) => {
    const validPts = Math.max(0, pts);
    setCustomServicePoints(validPts);
    if (!manualPointsOverride) {
      setCounterPoints(calculateTotalPoints(selectedServiceIds, hasCustomService, validPts));
    }
  };

  const handleResetToCalculated = () => {
    setManualPointsOverride(false);
    setCounterPoints(calculateTotalPoints(selectedServiceIds, hasCustomService, customServicePoints));
  };

  // Award Counter Points with Multiple Services
  const handleAwardCounterPoints = async () => {
    if (!foundMember) return;

    if (selectedServiceIds.length === 0 && (!hasCustomService || !customServiceName.trim())) {
      showNotification('Please select at least one wash service or add a custom service.', 'error');
      return;
    }

    if (counterPoints <= 0) {
      showNotification('Points to award must be greater than zero.', 'error');
      return;
    }

    setAwardingPoints(true);
    try {
      const selectedNames = (currentCarWash?.services || [])
        .filter((s) => selectedServiceIds.includes(s.id))
        .map((s) => s.name);

      if (hasCustomService && customServiceName.trim()) {
        selectedNames.push(customServiceName.trim());
      }

      const effectiveName = selectedNames.length > 0
        ? (selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.join(', ')} (${selectedNames.length} services)`)
        : (customServiceName || 'Walk-in Wash');

      const token = localStorage.getItem('cw_token');
      const res = await fetch('/api/membership/counter-award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membershipId: foundMember.id,
          carWashId,
          serviceName: effectiveName,
          services: selectedNames,
          points: counterPoints,
        })
      });
      if (res.ok) {
        const result = await res.json();
        showNotification(`🎉 +${counterPoints} points awarded to ${foundMember.customerName || 'Customer'}! Services: ${effectiveName}. New Balance: ${result.newBalance} pts`, 'success');
        setFoundMember({
          ...foundMember,
          pointsBalance: result.newBalance,
        });
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to award points', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Error awarding points', 'error');
    } finally {
      setAwardingPoints(false);
    }
  };

  // Modular Inspect Voucher
  const inspectVoucher = async (inputStr: string) => {
    const clean = inputStr.trim();
    if (!clean) return;
    setSearchingVoucher(true);
    setFoundVoucher(null);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch(`/api/membership/voucher/${encodeURIComponent(clean)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFoundVoucher(data);
      } else {
        const err = await res.json();
        showNotification(err.error || 'Voucher not found with this code or QR barcode', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Error looking up voucher', 'error');
    } finally {
      setSearchingVoucher(false);
    }
  };

  const handleSearchVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    inspectVoucher(voucherInput);
  };

  // Confirm Redemption
  const handleConfirmRedeem = async () => {
    if (!foundVoucher) return;
    setConfirmingVoucher(true);
    try {
      const token = localStorage.getItem('cw_token');
      const res = await fetch('/api/membership/confirm-redemption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tokenOrCode: foundVoucher.redemptionToken || foundVoucher.redemptionCode,
          carWashId,
        })
      });
      if (res.ok) {
        const data = await res.json();
        showNotification(`✅ Voucher ${data.redemptionCode} redeemed successfully!`, 'success');
        setFoundVoucher(data);
        setConfirmedSessionVouchers((prev) => [data, ...prev.filter((v) => v.id !== data.id)]);
      } else {
        const err = await res.json();
        showNotification(err.error || 'Redemption failed', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Error redeeming voucher', 'error');
    } finally {
      setConfirmingVoucher(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Counter Membership Desk</h2>
              <p className="text-xs text-slate-400">Look up members, award points, and redeem customer vouchers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('scan_member')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'scan_member'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Award Counter Points</span>
          </button>
          <button
            onClick={() => setActiveTab('redeem_voucher')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'redeem_voucher'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Redeem Voucher</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* TAB 1: SCAN MEMBER / AWARD POINTS */}
          {activeTab === 'scan_member' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCameraScannerMode('member')}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Camera className="w-4 h-4" /> Scan Member QR with Camera
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">or enter code / phone</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleSearchMember} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={memberInput}
                        onChange={(e) => setMemberInput(e.target.value)}
                        placeholder="e.g. ASH-104928 or scan QR..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchingMember}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      {searchingMember ? 'Searching...' : 'Find Member'}
                    </button>
                  </div>
                </form>
              </div>

              {foundMember && (
                <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700">
                        {foundMember.membershipNumber}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        {foundMember.customerName || 'Customer Member'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {foundMember.customerPhone || foundMember.customerEmail || 'No contact'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Balance</span>
                      <p className="text-xl font-black text-indigo-600">
                        {Number(foundMember?.pointsBalance ?? 0).toLocaleString()} pts
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-indigo-100 pt-3 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 block">Select Completed Services (Choose Several):</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={handleSelectAllServices}
                          className="px-2 py-0.5 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllServices}
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Multi-Service Cards Grid */}
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {currentCarWash?.services && currentCarWash.services.length > 0 ? (
                        currentCarWash.services.map((svc) => {
                          const isSelected = selectedServiceIds.includes(svc.id);
                          const pts = getServicePoints(svc);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-400 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{svc.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">BND {Number(svc.price).toFixed(2)}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 font-mono ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                +{pts} PTS
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic">No services listed for this location.</p>
                      )}
                    </div>

                    {/* Optional Custom Walk-In Service */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasCustomService}
                          onChange={(e) => handleCustomServiceToggle(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>Add Custom / Other Walk-In Service</span>
                      </label>

                      {hasCustomService && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-fade-in">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Service Name</label>
                            <input
                              type="text"
                              value={customServiceName}
                              onChange={(e) => setCustomServiceName(e.target.value)}
                              placeholder="e.g. Engine Degrease"
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              required={hasCustomService}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Points</label>
                            <input
                              type="number"
                              min="0"
                              value={customServicePoints}
                              onChange={(e) => handleCustomPointsChange(parseInt(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Points Sum Bar */}
                    <div className="bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-150 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">Total Points to Award:</span>
                        <span className="text-[10px] text-slate-500">
                          {selectedServiceIds.length + (hasCustomService && customServiceName.trim() ? 1 : 0)} services selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {manualPointsOverride && (
                          <button
                            type="button"
                            onClick={handleResetToCalculated}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                            title="Reset to calculated total"
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Auto
                          </button>
                        )}
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={counterPoints}
                          onChange={(e) => {
                            setCounterPoints(Math.max(0, parseInt(e.target.value) || 0));
                            setManualPointsOverride(true);
                          }}
                          className="w-20 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-sm font-black font-mono text-indigo-700 text-right"
                          required
                        />
                        <span className="text-xs font-extrabold text-indigo-900 font-mono">PTS</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAwardCounterPoints}
                      disabled={awardingPoints}
                      className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {awardingPoints ? 'Awarding Points...' : `Award +${counterPoints} Points Now`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REDEEM VOUCHER */}
          {activeTab === 'redeem_voucher' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCameraScannerMode('voucher')}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Camera className="w-4 h-4" /> Scan Voucher QR with Camera
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">or enter voucher code</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleSearchVoucher} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Gift className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value)}
                        placeholder="e.g. RED-5258 or scan voucher token..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchingVoucher}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      {searchingVoucher ? 'Checking...' : 'Check Voucher'}
                    </button>
                  </div>
                </form>
              </div>

              {foundVoucher && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-indigo-700">
                        {foundVoucher.redemptionCode}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        {foundVoucher.rewardTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Customer: {foundVoucher.customerName || foundVoucher.customerId}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        foundVoucher.status === 'REDEEMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      {foundVoucher.status}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Points Redeemed:</span>
                      <span className="font-bold">{foundVoucher.pointsSpent} pts</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Created On:</span>
                      <span>{new Date(foundVoucher.createdAt).toLocaleDateString()}</span>
                    </div>
                    {foundVoucher.expiresAt && (
                      <div className="flex justify-between text-slate-600">
                        <span>Expires:</span>
                        <span>{new Date(foundVoucher.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {foundVoucher.status === 'PENDING' ? (
                    <button
                      onClick={handleConfirmRedeem}
                      disabled={confirmingVoucher}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {confirmingVoucher ? 'Confirming...' : 'Confirm Voucher Redemption'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-center text-xs font-bold border border-emerald-200">
                        ✓ This voucher has been confirmed and redeemed.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFoundVoucher(null);
                          setVoucherInput('');
                        }}
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                      >
                        <Plus className="h-3.5 w-3.5" /> Validate Another Voucher for Customer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Session Confirmed Vouchers List */}
              {confirmedSessionVouchers.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Session Confirmed Vouchers ({confirmedSessionVouchers.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmedSessionVouchers([])}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-normal cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="divide-y divide-slate-200/60 max-h-32 overflow-y-auto">
                    {confirmedSessionVouchers.map((v) => (
                      <div key={v.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-bold text-slate-900 block text-[11px]">{v.redemptionCode}</span>
                          <span className="text-[10px] text-slate-500 truncate block">{v.rewardTitle}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                          REDEEMED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={cameraScannerMode !== null}
        onClose={() => setCameraScannerMode(null)}
        onScan={(scanned) => {
          const mode = cameraScannerMode;
          setCameraScannerMode(null);
          const clean = scanned.trim();
          if (mode === 'member') {
            setMemberInput(clean);
            lookupMember(clean);
          } else if (mode === 'voucher') {
            setVoucherInput(clean);
            inspectVoucher(clean);
          }
        }}
        title={cameraScannerMode === 'member' ? 'Scan Customer Member QR' : 'Scan Reward Voucher QR'}
        subtitle={
          cameraScannerMode === 'member'
            ? 'Point camera at customer’s Member Card QR pass'
            : 'Point camera at customer’s voucher QR barcode'
        }
      />
    </div>
  );
};
