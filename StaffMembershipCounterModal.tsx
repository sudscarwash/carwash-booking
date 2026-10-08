/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CarWash, CustomerMembership, MembershipRedemption } from '../types';
import { useApp } from '../context/AppContext';
import { Award, QrCode, Search, Gift, CheckCircle, AlertTriangle, X, ArrowRight, UserCheck, Camera } from 'lucide-react';
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
  const { showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<'scan_member' | 'redeem_voucher'>('scan_member');

  // Member search & counter points state
  const [memberInput, setMemberInput] = useState('');
  const [searchingMember, setSearchingMember] = useState(false);
  const [foundMember, setFoundMember] = useState<CustomerMembership | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState('Standard Wash');
  const [counterPoints, setCounterPoints] = useState(10);
  const [awardingPoints, setAwardingPoints] = useState(false);

  // Voucher redemption state
  const [voucherInput, setVoucherInput] = useState('');
  const [searchingVoucher, setSearchingVoucher] = useState(false);
  const [foundVoucher, setFoundVoucher] = useState<MembershipRedemption | null>(null);
  const [confirmingVoucher, setConfirmingVoucher] = useState(false);

  // Camera QR Scanner state
  const [cameraScannerMode, setCameraScannerMode] = useState<'member' | 'voucher' | null>(null);

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

  // Award Counter Points
  const handleAwardCounterPoints = async () => {
    if (!foundMember) return;
    setAwardingPoints(true);
    try {
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
          serviceName: selectedServiceName,
          points: counterPoints,
        })
      });
      if (res.ok) {
        const result = await res.json();
        showNotification(`🎉 +${counterPoints} points awarded to ${foundMember.customerName || 'Customer'}! New Balance: ${result.newBalance} pts`, 'success');
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
                        {foundMember.pointsBalance} pts
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-indigo-100 pt-3 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 block">Award Points for Completed Wash:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Service Description</label>
                        <input
                          type="text"
                          value={selectedServiceName}
                          onChange={(e) => setSelectedServiceName(e.target.value)}
                          placeholder="e.g. Deluxe Wash"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Points to Award</label>
                        <input
                          type="number"
                          min="1"
                          value={counterPoints}
                          onChange={(e) => setCounterPoints(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAwardCounterPoints}
                      disabled={awardingPoints}
                      className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
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
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {confirmingVoucher ? 'Confirming...' : 'Confirm Voucher Redemption'}
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-center text-xs font-bold">
                      ✓ This voucher has already been confirmed and redeemed.
                    </div>
                  )}
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
