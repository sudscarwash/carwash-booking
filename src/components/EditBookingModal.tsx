import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, Tag, Car, FileText, AlertCircle, Sparkles, DollarSign, Phone } from 'lucide-react';
import { Booking, CarWash, WashService } from '../types';
import { useApp } from '../context/AppContext';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  location?: CarWash | null;
}

interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

const roundTwo = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

function parseItemString(str: string): { name: string; price: number | null } {
  const trimmed = str.trim();
  const match = trimmed.match(/^(.*?)\s*\(\$([0-9]+(?:\.[0-9]+)?)\)$/);
  if (match) {
    return {
      name: match[1].trim(),
      price: roundTwo(parseFloat(match[2])),
    };
  }
  return {
    name: trimmed,
    price: null,
  };
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  location,
}) => {
  const { updateBookingDetails, locations } = useApp();

  // Find carwash location if not passed
  const activeLocation = location || locations.find((loc) => loc.id === booking?.carWashId);

  const [selectedMainServiceId, setSelectedMainServiceId] = useState<string>('');
  const [selectedMainServiceName, setSelectedMainServiceName] = useState<string>('');
  const [selectedMainServicePrice, setSelectedMainServicePrice] = useState<number>(0);

  const [addonsList, setAddonsList] = useState<SelectedAddon[]>([]);
  const [customAddonName, setCustomAddonName] = useState<string>('');
  const [customAddonPrice, setCustomAddonPrice] = useState<string>('');

  const [vehicleInfo, setVehicleInfo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Derived total price from main service price + add-ons
  const totalPrice = roundTwo(selectedMainServicePrice + addonsList.reduce((sum, a) => sum + a.price, 0));

  // Extract available services from location
  const allLocServices = activeLocation?.services || [];
  const availableServices = allLocServices.filter((s) => (s.type === 'service' || !s.type) && s.isAvailable);
  const availableAddons = allLocServices.filter((s) => (s.type === 'addon' || s.type === 'product') && s.isAvailable);

  useEffect(() => {
    if (booking) {
      setVehicleInfo(booking.vehicleInfo || '');
      setNotes(booking.notes || '');
      const initialTotalPrice = roundTwo(Number(booking.price) || 0);

      const rawServiceName = booking.serviceName || 'Standard Car Wash';

      // 1. Split booking.serviceName by '+' to separate main service from add-ons
      const parts = rawServiceName.split('+').map((p) => p.trim()).filter(Boolean);
      const firstPart = parts[0] || 'Standard Car Wash';
      const addonParts = parts.slice(1);

      // Parse Main Wash Service
      const parsedMain = parseItemString(firstPart);
      const mainCandidateName = parsedMain.name;

      const matchedMain = availableServices.find(
        (s) => s.id === booking.serviceId || s.name.toLowerCase() === mainCandidateName.toLowerCase()
      ) || allLocServices.find((s) => s.name.toLowerCase() === mainCandidateName.toLowerCase());

      let mainSvcId = matchedMain ? matchedMain.id : 'custom';
      let mainSvcName = mainCandidateName;
      let mainSvcPrice = 0;

      if (parsedMain.price !== null) {
        mainSvcPrice = parsedMain.price;
      } else if (matchedMain) {
        mainSvcPrice = roundTwo(matchedMain.price);
      }

      // Parse Add-ons
      const parsedAddons: SelectedAddon[] = [];
      let knownAddonsTotal = 0;
      const unpricedAddonIndices: number[] = [];

      addonParts.forEach((addonStr, idx) => {
        const parsedAddon = parseItemString(addonStr);
        const addonName = parsedAddon.name;

        if (parsedAddon.price !== null) {
          parsedAddons.push({
            id: `addon_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            name: addonName,
            price: parsedAddon.price,
          });
          knownAddonsTotal += parsedAddon.price;
        } else {
          const foundInLoc = allLocServices.find((a) => a.name.toLowerCase() === addonName.toLowerCase());
          if (foundInLoc) {
            const addPrice = roundTwo(foundInLoc.price);
            parsedAddons.push({
              id: foundInLoc.id,
              name: foundInLoc.name,
              price: addPrice,
            });
            knownAddonsTotal += addPrice;
          } else {
            parsedAddons.push({
              id: `addon_custom_${idx}_${Math.random().toString(36).substr(2, 5)}`,
              name: addonName,
              price: 0,
            });
            unpricedAddonIndices.push(idx);
          }
        }
      });

      // Reconcile missing prices if not explicitly stored
      if (parsedMain.price === null) {
        if (!matchedMain) {
          mainSvcPrice = roundTwo(Math.max(0, initialTotalPrice - knownAddonsTotal));
        } else if (unpricedAddonIndices.length > 0) {
          const remainingForAddons = Math.max(0, initialTotalPrice - mainSvcPrice - knownAddonsTotal);
          const perAddonPrice = roundTwo(remainingForAddons / unpricedAddonIndices.length);
          unpricedAddonIndices.forEach((idx) => {
            parsedAddons[idx].price = perAddonPrice;
          });
        }
      }

      setSelectedMainServiceId(mainSvcId);
      setSelectedMainServiceName(mainSvcName);
      setSelectedMainServicePrice(mainSvcPrice);
      setAddonsList(parsedAddons);
      setErrorMessage('');
    }
  }, [booking, activeLocation]);

  if (!isOpen || !booking) return null;

  // Recalculate price when main service or add-ons change
  const handleMainServiceChange = (svcId: string) => {
    const found = availableServices.find((s) => s.id === svcId);
    if (found) {
      const mainPrice = roundTwo(found.price);
      setSelectedMainServiceId(found.id);
      setSelectedMainServiceName(found.name);
      setSelectedMainServicePrice(mainPrice);
    }
  };

  const handleUpdateMainServicePrice = (newPrice: number) => {
    const rounded = roundTwo(newPrice);
    setSelectedMainServicePrice(rounded);
  };

  const handleToggleAddon = (addonSvc: WashService) => {
    const exists = addonsList.some((a) => a.id === addonSvc.id || a.name.toLowerCase() === addonSvc.name.toLowerCase());
    let updatedAddons: SelectedAddon[];

    if (exists) {
      // Remove
      updatedAddons = addonsList.filter((a) => a.id !== addonSvc.id && a.name.toLowerCase() !== addonSvc.name.toLowerCase());
    } else {
      // Add
      updatedAddons = [...addonsList, { id: addonSvc.id, name: addonSvc.name, price: roundTwo(addonSvc.price) }];
    }

    setAddonsList(updatedAddons);
  };

  const handleUpdateAddonPrice = (id: string, newPrice: number) => {
    const roundedPrice = roundTwo(newPrice);
    const updatedAddons = addonsList.map((a) => (a.id === id ? { ...a, price: roundedPrice } : a));
    setAddonsList(updatedAddons);
  };

  const handleAddCustomAddon = () => {
    if (!customAddonName.trim()) return;
    const priceNum = roundTwo(parseFloat(customAddonPrice) || 0);

    const newAddon: SelectedAddon = {
      id: `custom_${Math.random().toString(36).substr(2, 6)}`,
      name: customAddonName.trim(),
      price: priceNum,
    };

    const updatedAddons = [...addonsList, newAddon];
    setAddonsList(updatedAddons);

    setCustomAddonName('');
    setCustomAddonPrice('');
  };

  const handleRemoveAddon = (id: string) => {
    const updatedAddons = addonsList.filter((a) => a.id !== id);
    setAddonsList(updatedAddons);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    // Compose final service name with explicit itemized prices
    let finalServiceName = `${selectedMainServiceName} ($${selectedMainServicePrice.toFixed(2)})`;
    if (addonsList.length > 0) {
      finalServiceName += ' + ' + addonsList.map((a) => `${a.name} ($${a.price.toFixed(2)})`).join(' + ');
    }

    const success = await updateBookingDetails(booking.id, {
      serviceId: selectedMainServiceId !== 'custom' ? selectedMainServiceId : booking.serviceId,
      serviceName: finalServiceName,
      price: totalPrice,
      vehicleInfo: vehicleInfo.trim(),
      notes: notes.trim(),
    });

    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMessage('Failed to save changes. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-amber-400/30">
              <Sparkles className="w-3 h-3" />
              <span>Modify Order / Add-ons</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Edit Booking Services & Add-ons
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium mt-1">
              <span>Customer: <strong className="text-amber-300 font-extrabold">{booking.customerName}</strong></span>
              {booking.customerPhone && (
                <span className="inline-flex items-center gap-1 font-mono text-emerald-300 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-slate-300 font-sans uppercase font-bold">Phone:</span>
                  <span>{booking.customerPhone}</span>
                </span>
              )}
              <span className="text-slate-400">({booking.date} @ {booking.timeSlot})</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Main Wash Service Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                1. Main Wash Service
              </label>
              <div className="flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-extrabold text-indigo-600">Item #1 Price: $</span>
                <input
                  type="number"
                  step="0.01"
                  value={selectedMainServicePrice === 0 ? '' : selectedMainServicePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleUpdateMainServicePrice(val === '' ? 0 : parseFloat(val) || 0);
                  }}
                  placeholder="0.00"
                  className="w-20 text-right font-mono text-xs font-black text-indigo-700 bg-transparent outline-none focus:ring-1 focus:ring-indigo-400 rounded-md"
                  title="Edit price for Main Wash Service"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableServices.map((svc) => {
                const isSelected = selectedMainServiceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleMainServiceChange(svc.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/30 text-indigo-950 font-black'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-bold'
                    }`}
                  >
                    <div>
                      <span className="text-xs block">{svc.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">{svc.duration} mins</span>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-100 shadow-2xs">
                      ${svc.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Available Add-ons / Extras / Products */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block flex items-center justify-between">
              <span>2. Select Extras & Add-ons (Optional)</span>
              <span className="text-[10px] text-slate-400 font-medium">Click to add/remove from order</span>
            </label>

            {availableAddons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableAddons.map((addon) => {
                  const isChecked = addonsList.some(
                    (a) => a.id === addon.id || a.name.toLowerCase() === addon.name.toLowerCase()
                  );
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => handleToggleAddon(addon)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs">{addon.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-800">+${addon.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                No predefined add-ons listed for this location. You can type a custom extra below.
              </p>
            )}
          </div>

          {/* Section 3: Custom Item or Cancellation Adjustment */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Custom Extra / Adjustment Item</span>
            </label>
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="e.g. Pet Hair Removal, Scratch Wax, Item Cancelled"
                value={customAddonName}
                onChange={(e) => setCustomAddonName(e.target.value)}
                className="col-span-7 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price (+/-)"
                value={customAddonPrice}
                onChange={(e) => setCustomAddonPrice(e.target.value)}
                className="col-span-3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddCustomAddon}
                className="col-span-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* List of currently attached add-ons */}
            {addonsList.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Add-ons ({addonsList.length}):</span>
                {addonsList.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs gap-2">
                    <span className="font-bold text-slate-800 flex-1 truncate">{a.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                        <span className="text-[10px] font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={a.price === 0 ? '' : a.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateAddonPrice(a.id, val === '' ? 0 : parseFloat(val) || 0);
                          }}
                          placeholder="0.00"
                          className="w-16 text-right font-mono text-xs font-extrabold text-emerald-700 bg-transparent outline-none"
                          title="Click to edit item price"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(a.id)}
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove Add-on"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Vehicle Plate & Staff Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Vehicle Plate No.</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BA1234"
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Staff Notes / Instructions</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Customer requested extra clean on wheels"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Section 5: Real-time Price Calculation Summary */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-indigo-800/60 pb-2">
              <span className="text-indigo-200 font-medium">1. Main Wash Service Price:</span>
              <span className="font-mono font-bold text-white">BND ${selectedMainServicePrice.toFixed(2)}</span>
            </div>

            {addonsList.length > 0 && (
              <div className="flex items-center justify-between text-xs border-b border-indigo-800/60 pb-2">
                <span className="text-indigo-200 font-medium">2. Add-ons & Extras ({addonsList.length} items):</span>
                <span className="font-mono font-bold text-emerald-300">+${addonsList.reduce((s, a) => s + a.price, 0).toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-300 block">Calculated Total Booking Price</span>
                <span className="text-[10px] text-indigo-400 font-medium">Automatically calculated sum (Main Service + Add-ons)</span>
              </div>

              <div className="px-3.5 py-1.5 bg-slate-800/90 border border-emerald-400/50 rounded-xl text-right font-mono font-black text-xl text-emerald-300 shadow-inner">
                BND ${totalPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Booking Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
