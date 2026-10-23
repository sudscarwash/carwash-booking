import React, { useState } from 'react';
import { Restaurant, RestaurantTable } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { QrCode, Smartphone, X, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface TableQrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
}

export const TableQrScanModal: React.FC<TableQrScanModalProps> = ({
  isOpen,
  onClose,
  restaurant,
}) => {
  const { verifyTableQrSession } = useOrders();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const tables: RestaurantTable[] = restaurant.tables && restaurant.tables.length > 0
    ? restaurant.tables
    : [
        { id: 'T1', restaurantId: restaurant.id, name: 'Table 1', tableNumber: '1', capacity: 2, zoneId: 'zone_main', isActive: true },
        { id: 'T2', restaurantId: restaurant.id, name: 'Table 2', tableNumber: '2', capacity: 2, zoneId: 'zone_main', isActive: true },
        { id: 'T3', restaurantId: restaurant.id, name: 'Table 3', tableNumber: '3', capacity: 4, zoneId: 'zone_main', isActive: true },
        { id: 'T4', restaurantId: restaurant.id, name: 'Table 4', tableNumber: '4', capacity: 4, zoneId: 'zone_main', isActive: true },
        { id: 'T5', restaurantId: restaurant.id, name: 'Table 5', tableNumber: '5', capacity: 6, zoneId: 'zone_main', isActive: true },
      ];

  const handleVerify = (tableObj: RestaurantTable) => {
    // If restaurant has table PIN security enabled, check PIN
    const expectedPin = tableObj.tablePin || `4${(tableObj.tableNumber || '1').replace(/\D/g, '').padStart(3, '0')}`;
    if (restaurant.dineInSecurityMode === 'TABLE_PIN' && pinInput.trim() !== expectedPin) {
      setErrorMsg(`Invalid PIN for ${tableObj.name}. Enter the 4-digit PIN printed physically on the stand (e.g. ${expectedPin}).`);
      return;
    }

    verifyTableQrSession(tableObj.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#DCE3DD]">
        {/* Header */}
        <div className="p-5 border-b border-[#DCE3DD] flex items-center justify-between bg-[#F6F7F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2F7A4F] text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#16241B]">In-Store Table Authentication</h3>
              <p className="text-[11px] text-[#526056]">{restaurant.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white text-[#526056] hover:text-[#16241B] flex items-center justify-center border border-[#DCE3DD] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Anti-Phantom Order Protection:</strong> To prevent remote outsiders from placing fake orders to empty restaurant tables, Dine-In ordering is locked to guests who are physically in the restaurant.
            </div>
          </div>

          <div className="space-y-1.5 text-center py-2">
            <Smartphone className="w-8 h-8 text-[#2F7A4F] mx-auto" />
            <h4 className="text-xs font-bold text-[#16241B]">Scan Physical Table QR Stand</h4>
            <p className="text-[11px] text-[#526056]">
              Point your smartphone camera at the QR code stand sitting on your dining table.
            </p>
          </div>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-[#DCE3DD] w-full"></div>
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-[#526056] absolute">
              Or Select Your Table
            </span>
          </div>

          {/* Quick Table Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#16241B] block">
              Which table are you seated at?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tables.map(tbl => (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTable(tbl.name);
                    setErrorMsg(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedTable === tbl.name
                      ? 'border-[#2F7A4F] bg-emerald-50 text-[#2F7A4F] ring-2 ring-[#2F7A4F]/20'
                      : 'border-[#DCE3DD] hover:bg-[#F6F7F5] text-[#16241B]'
                  }`}
                >
                  <span>{tbl.name}</span>
                  {selectedTable === tbl.name && <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7A4F]" />}
                </button>
              ))}
            </div>
          </div>

          {/* If table selected and PIN required */}
          {selectedTable && (
            <div className="space-y-2 pt-2 border-t border-[#EDF1EC]">
              {restaurant.dineInSecurityMode === 'TABLE_PIN' && (
                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">
                    4-Digit Table Stand PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Printed on your table stand"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F]"
                  />
                  <p className="text-[10px] text-[#526056] mt-1">Look at the printed card on your table stand.</p>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  const match = tables.find(t => t.name === selectedTable);
                  if (match) handleVerify(match);
                }}
                className="w-full py-2.5 bg-[#2F7A4F] hover:bg-[#1E6038] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm I Am Seated at {selectedTable}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
