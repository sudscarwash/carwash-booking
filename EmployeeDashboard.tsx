/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import { BookingStatus, Booking } from '../types.js';
import { Briefcase as BriefcaseIcon, Calendar as CalendarIcon, Clock as ClockIcon, Check as CheckIcon, ChevronRight as ChevronRightIcon, CheckCircle as CheckCircleIcon, Info as InfoIcon, MapPin as MapPinIcon } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user, bookings, updateBookingStatus, locations } = useApp();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'station'>('queue');

  // Employees can view and manage bookings for their assigned business
  const filteredBookings = bookings.filter((b) => b.carWashId === user?.businessId);

  const myLocation = locations.find((loc) => loc.id === user?.businessId);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdatingId(bookingId);
    await updateBookingStatus(bookingId, status);
    setUpdatingId(null);
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
              Welcome back, <strong className="text-slate-700">{user?.name}</strong>. Manage your active washing queue.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs">
          <span className="text-slate-400 block uppercase font-bold tracking-wider text-[9px]">Station Reference</span>
          <strong className="text-slate-700">{myLocation ? myLocation.name : 'Unassigned Station'}</strong>
        </div>
      </div>

      {/* Responsive Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-6 py-2.5 flex justify-around items-center z-40 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-t-2xl">
        <button
          onClick={() => {
            setActiveTab('queue');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'queue'
              ? 'text-amber-600 font-extrabold scale-110'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-emp-nav-queue"
        >
          <ClockIcon className="w-5.5 h-5.5" />
          <span className="text-[10px]">Wash Queue</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('station');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeTab === 'station'
              ? 'text-amber-600 font-extrabold scale-110'
              : 'text-slate-400 font-medium hover:text-slate-600'
          }`}
          id="btn-emp-nav-station"
        >
          <MapPinIcon className="w-5.5 h-5.5" />
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
                        </div>

                        <div className="text-left">
                          <strong className="text-slate-800 text-sm sm:text-base block">{bk.customerName}</strong>
                          <span className="text-xs text-slate-400 font-mono block">{bk.customerEmail}</span>
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

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-xs text-slate-500 text-left">
        <InfoIcon className="h-5 w-5 text-slate-400 shrink-0" />
        <p>
          As an Operator Staff member, your access is restricted to the active operational wash queue. You do not have permissions to modify business parameters, prices, slot configurations, or view system-wide platform logs.
        </p>
      </div>
    </div>
  );
};
