import React, { useState } from 'react';
import { Order } from '../../types';
import { 
  AlertOctagon, 
  X, 
  Camera, 
  PhoneCall, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Upload,
  Radio
} from 'lucide-react';

interface NoShowVerificationModalProps {
  order: Order;
  onClose: () => void;
  onConfirmNoShow: (reasonNotes: string, photoProofUrl?: string) => void;
}

export const NoShowVerificationModal: React.FC<NoShowVerificationModalProps> = ({
  order,
  onClose,
  onConfirmNoShow,
}) => {
  const [calledCustomer, setCalledCustomer] = useState(false);
  const [waMessageSent, setWaMessageSent] = useState(false);
  const [hasPhotoProof, setHasPhotoProof] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [gpsVerified, setGpsVerified] = useState(true); // simulated within 50m of delivery pin
  const [extraNotes, setExtraNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSimulatePhotoUpload = () => {
    // Simulate capturing/uploading photo of house door / gate
    setPhotoUrl('https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80');
    setHasPhotoProof(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calledCustomer && !waMessageSent) {
      alert('You must confirm at least one attempt to call or WhatsApp message the customer before submitting.');
      return;
    }
    if (!hasPhotoProof) {
      alert('Please snap or upload a photo of the house gate or door as evidence of arrival.');
      return;
    }

    setIsSubmitting(true);
    const compiledNotes = `Customer No-Show [Verified]: 7-min timer expired. Phone/WA contacted: ${calledCustomer ? 'Yes' : 'No'}. House photo uploaded. GPS proximity verified. ${extraNotes}`;
    onConfirmNoShow(compiledNotes, photoUrl || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#DCE3DD] max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="p-6 bg-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-rose-900 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold font-display">Customer No-Show Protocol</h3>
              <p className="text-xs text-rose-200">Order #{order.orderNumber} • {order.deliveryAddress.street}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Safeguard explanation */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Anti-Fraud & Proof Requirement</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              To ensure couriers do not falsely report customers who are waiting at the door, FoodFindr requires arrival photo proof, GPS verification, and contact confirmation. 
              The customer receives an instant notification to confirm or dispute.
            </p>
          </div>

          {/* Verification Checklist */}
          <div className="space-y-3">
            <span className="text-xs font-black text-[#16241B] uppercase tracking-wider block">
              Required Verification Steps:
            </span>

            {/* Step 1: 7-min wait */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2F7A4F]" />
                <span className="font-bold text-[#16241B]">1. 7-Minute Grace Period</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Timer Completed
              </span>
            </div>

            {/* Step 2: GPS Check */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E0562B]" />
                <div>
                  <span className="font-bold text-[#16241B] block">2. Geofence GPS Check</span>
                  <span className="text-[10px] text-stone-500">Current device position within 30m of delivery pin</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Location Confirmed
              </span>
            </div>

            {/* Step 3: Contact attempts */}
            <div className="p-3 rounded-xl bg-white border border-[#DCE3DD] space-y-2 text-xs">
              <span className="font-bold text-[#16241B] block">3. Contact Attempts (Select at least one):</span>
              <label className="flex items-center gap-2.5 cursor-pointer text-[#16241B]">
                <input
                  type="checkbox"
                  checked={calledCustomer}
                  onChange={(e) => setCalledCustomer(e.target.checked)}
                  className="rounded text-[#2F7A4F] focus:ring-[#2F7A4F] w-4 h-4"
                />
                <span>I placed at least one phone call (no answer / voicemail)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-[#16241B]">
                <input
                  type="checkbox"
                  checked={waMessageSent}
                  onChange={(e) => setWaMessageSent(e.target.checked)}
                  className="rounded text-[#2F7A4F] focus:ring-[#2F7A4F] w-4 h-4"
                />
                <span>I sent a WhatsApp message / ring with no reply</span>
              </label>
            </div>

            {/* Step 4: Photo Proof */}
            <div className="p-3 rounded-xl bg-white border border-[#DCE3DD] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#16241B]">4. House Gate / Doorstep Photo:</span>
                {hasPhotoProof && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Photo Attached
                  </span>
                )}
              </div>
              {photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-stone-200">
                  <img src={photoUrl} alt="Proof" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl(null);
                      setHasPhotoProof(false);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-lg text-xs"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSimulatePhotoUpload}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-stone-300 hover:border-[#2F7A4F] text-stone-600 hover:text-[#2F7A4F] flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors bg-stone-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap House / Door Photo</span>
                </button>
              )}
            </div>

            {/* Additional notes */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Additional Notes (Optional)
              </label>
              <input
                type="text"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="e.g. Knocked on gate 3 times, lights off, car in driveway"
                className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              Cancel & Keep Waiting
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!calledCustomer && !waMessageSent) || !hasPhotoProof}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{isSubmitting ? 'Logging No-Show...' : 'Submit Verified No-Show'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
