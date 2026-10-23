import React, { useState } from 'react';
import { Restaurant, RestaurantTable } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { 
  QrCode, 
  Smartphone, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Printer, 
  Users, 
  Flame 
} from 'lucide-react';

interface StaffTableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: RestaurantTable;
  restaurant: Restaurant;
  onTestCustomerOrder?: (tableNum: string) => void;
}

export const StaffTableQrModal: React.FC<StaffTableQrModalProps> = ({
  isOpen,
  onClose,
  table,
  restaurant,
  onTestCustomerOrder
}) => {
  const { verifyTableQrSession } = useOrders();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const tableIdentifier = table.tableNumber || table.name;
  const tableUrl = `${window.location.origin}${window.location.pathname}#restaurant=${restaurant.id}&table=${encodeURIComponent(tableIdentifier)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(tableUrl)}&color=19-34-24`;
  const pin = table.tablePin || `4${(table.tableNumber || '1').replace(/\D/g, '').padStart(3, '0')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestDirectly = () => {
    // Authenticate session for this table
    verifyTableQrSession(table.name);
    if (onTestCustomerOrder) {
      onTestCustomerOrder(table.name);
    } else {
      window.location.hash = `#restaurant=${restaurant.id}&table=${encodeURIComponent(tableIdentifier)}`;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#D9E2D9] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D9E2D9] bg-[#FAFBF9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#247545] text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#132218]">{table.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                  Staff Presenter
                </span>
              </div>
              <p className="text-xs text-[#4F6155]">{restaurant.name} • Capacity: {table.capacity} Pax</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-[#4F6155] hover:text-[#132218] flex items-center justify-center border border-[#D9E2D9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center flex-1 overflow-y-auto">
          {/* Instructions banner for staff */}
          <div className="p-3 bg-[#E1F0E6] rounded-2xl border border-[#247545]/20 text-xs text-[#132218] flex items-center gap-2 text-left">
            <Smartphone className="w-5 h-5 text-[#247545] shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>Show this screen to guest:</strong> Diners can point their phone camera at this QR code to immediately unlock table ordering for <strong>{table.name}</strong>.
            </p>
          </div>

          {/* QR Box */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-4 bg-white border-2 border-[#132218] rounded-3xl shadow-md inline-block">
              <img
                src={qrImageUrl}
                alt={`QR Code for ${table.name}`}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto"
              />
              <div className="text-[10px] font-mono text-[#4F6155] mt-2 font-bold tracking-wider">
                {restaurant.name} • {table.name}
              </div>
            </div>
          </div>

          {/* Table Stand PIN */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 inline-block w-full">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#4F6155] block">
              Physical Table Stand Security PIN
            </span>
            <span className="font-mono text-xl font-black text-[#132218] tracking-widest block my-0.5">
              {pin}
            </span>
            <span className="text-[10px] text-[#7A8E80]">
              Give this 4-digit PIN to the seated diner if table security prompt appears
            </span>
          </div>

          {/* Interactive Test Action for User & Tester */}
          <div className="p-4 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#132218]">
              <Sparkles className="w-4 h-4 text-[#DE5124]" />
              <span>Developer & Staff Test Sandbox</span>
            </div>
            <p className="text-[11px] text-[#4F6155] leading-relaxed">
              Want to test ordering right now without scanning from another phone? Click below to immediately enter the customer ordering experience as a seated guest at <strong>{table.name}</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestDirectly}
                className="py-2.5 px-3 bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>🧪 Test Seated Order</span>
              </button>

              <a
                href={tableUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-white hover:bg-emerald-50 text-[#247545] border border-[#247545]/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAFBF9] border-t border-[#D9E2D9] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-[#F5F7F4] text-[#132218] border border-[#D9E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-[#247545]" /> : <Copy className="w-4 h-4 text-[#4F6155]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Guest Table URL'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="py-2.5 px-3 bg-white hover:bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            title="Print table QR slip"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
