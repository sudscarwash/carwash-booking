import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, DollarSign, Smartphone, AlertCircle } from 'lucide-react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { useModalBack } from '../utils/useBackHandler.js';
import { TransferProviderSelector } from './TransferProviderSelector';

interface SettlementConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onConfirm: (bookingId: string, paymentMethod: string, txnReference?: string) => Promise<void> | void;
}

export const SettlementConfirmationModal: React.FC<SettlementConfirmationModalProps> = ({
  isOpen,
  onClose,
  booking,
  onConfirm,
}) => {
  useModalBack(isOpen, onClose, 'settlement-modal');

  const { locations, carWashes } = useApp();
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Transfer'>('Cash');
  const [transferProvider, setTransferProvider] = useState<string>('Bank Transfer');
  const [txnReference, setTxnReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Isolate the car wash specific to this booking so Owner 1 and Owner 2 never share provider methods
  const bookingCarWash = useMemo(() => {
    if (!booking?.carWashId) return null;
    const allLocations = locations || carWashes || [];
    return allLocations.find((cw) => cw.id === booking.carWashId) || null;
  }, [locations, carWashes, booking?.carWashId]);

  const businessMethods = useMemo(() => {
    if (!bookingCarWash) return [];
    const methods: string[] = [];
    if (bookingCarWash.bibdEnabled) methods.push('BIBD');
    if (bookingCarWash.baiduriEnabled) methods.push('Baiduri');
    if (bookingCarWash.customPaymentMethods) {
      bookingCarWash.customPaymentMethods
        .filter((m) => m.isEnabled)
        .forEach((m) => {
          if (m.providerName && !methods.includes(m.providerName)) {
            methods.push(m.providerName);
          }
        });
    }
    return methods;
  }, [bookingCarWash]);

  useEffect(() => {
    if (booking) {
      const bank = (booking.paymentBank || '').trim();
      if (bank && bank.toUpperCase() !== 'CASH') {
        setPaymentMode('Transfer');
        setTransferProvider(bank);
      } else {
        setPaymentMode('Cash');
        setTransferProvider('Bank Transfer');
      }
      setTxnReference(booking.txnReference || '');
      setIsSubmitting(false);
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalBank = paymentMode === 'Cash' ? 'Cash' : (transferProvider.trim() || 'Bank Transfer');
      await onConfirm(
        booking.id,
        finalBank,
        paymentMode === 'Transfer' ? txnReference.trim() || undefined : undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to complete settlement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookingPrice = Number(booking.price) || 15.00;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-auto flex flex-col text-left">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-5 flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                Confirm Settlement & Complete
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5 font-medium">
                Record on-site payment before completing wash
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Order Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Customer & Vehicle</span>
                <span className="text-sm font-extrabold text-slate-800 block">
                  {booking.customerName || 'Customer'}
                </span>
                {booking.vehicleInfo && (
                  <span className="text-xs font-mono font-bold text-slate-600">
                    🚗 {booking.vehicleInfo}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Total Due</span>
                <span className="text-base font-black font-mono text-emerald-600">
                  BND ${bookingPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="text-slate-500 truncate max-w-[240px]">
                {booking.serviceName || 'Standard Car Wash'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {booking.timeSlot}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-2">
              How did the customer pay at counter?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMode === 'Cash'
                    ? 'border-emerald-500 bg-emerald-50/90 text-emerald-900 shadow-xs ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">💵</span>
                <span className="text-xs font-black">Cash</span>
                <span className="text-[10px] text-slate-400 font-medium">Physical cash notes</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('Transfer')}
                className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMode === 'Transfer'
                    ? 'border-sky-500 bg-sky-50/90 text-sky-900 shadow-xs ring-1 ring-sky-400'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">📱</span>
                <span className="text-xs font-black">Bank / Digital Transfer</span>
                <span className="text-[10px] text-slate-400 font-medium">BIBD, Baiduri, TAIB, SCB, Apps</span>
              </button>
            </div>

            {paymentMode === 'Transfer' && (
              <div className="mt-3.5 p-3.5 bg-sky-50/50 border border-sky-200/80 rounded-2xl space-y-3 animate-fade-in">
                <TransferProviderSelector
                  value={transferProvider}
                  onChange={setTransferProvider}
                  businessId={booking?.carWashId}
                  businessMethods={businessMethods}
                  idPrefix="scm"
                />

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Transaction Reference / Approval Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ref code, approval #, or last 4 digits (8492)"
                    value={txnReference}
                    onChange={(e) => setTxnReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 bg-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Confirm & Complete Wash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
