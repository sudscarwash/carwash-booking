import React, { useState } from 'react';
import { Restaurant, Promotion, PromotionType, ServiceType } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Percent, 
  DollarSign, 
  Truck, 
  Calendar, 
  Sparkles,
  Copy,
  AlertCircle
} from 'lucide-react';

interface PromotionManagerProps {
  restaurant: Restaurant;
}

export const PromotionManager: React.FC<PromotionManagerProps> = ({ restaurant }) => {
  const { getPromotionsByRestaurant, addPromotion, updatePromotion, deletePromotion, togglePromotionStatus } = useRestaurants();
  const promos = getPromotionsByRestaurant(restaurant.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('PERCENTAGE');
  const [value, setValue] = useState('15');
  const [minSpend, setMinSpend] = useState('20.00');
  const [maxDiscount, setMaxDiscount] = useState('10.00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(['DINE_IN', 'TAKEAWAY', 'DELIVERY']);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingPromoId(null);
    setCode('PROMO' + Math.floor(10 + Math.random() * 90));
    setTitle('15% Off Special Discount');
    setDescription('Enjoy 15% discount on all orders above $20.');
    setType('PERCENTAGE');
    setValue('15');
    setMinSpend('20.00');
    setMaxDiscount('10.00');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setSelectedServices(['DINE_IN', 'TAKEAWAY', 'DELIVERY']);
    setIsModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromoId(promo.id);
    setCode(promo.code);
    setTitle(promo.title);
    setDescription(promo.description);
    setType(promo.type);
    setValue(promo.value.toString());
    setMinSpend(promo.minSpend.toString());
    setMaxDiscount(promo.maxDiscount?.toString() || '');
    setStartDate(promo.startDate);
    setEndDate(promo.endDate);
    setSelectedServices(promo.serviceTypes || ['DINE_IN', 'TAKEAWAY', 'DELIVERY']);
    setIsModalOpen(true);
  };

  const handleServiceToggle = (srv: ServiceType) => {
    if (selectedServices.includes(srv)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(s => s !== srv));
      }
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      alert('Please fill in promotion code and title');
      return;
    }

    const payload = {
      restaurantId: restaurant.id,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      type,
      value: parseFloat(value) || 0,
      minSpend: parseFloat(minSpend) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      serviceTypes: selectedServices,
      startDate,
      endDate,
      isActive: true,
    };

    if (editingPromoId) {
      updatePromotion(editingPromoId, payload);
    } else {
      addPromotion(payload);
    }

    setIsModalOpen(false);
  };

  const copyToClipboard = (promoCode: string) => {
    navigator.clipboard?.writeText(promoCode);
    setCopiedCode(promoCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Quick Preset Generator
  const applyPreset = (presetType: 'WELCOME' | 'FREE_DELIVERY' | 'WEEKEND_CASH') => {
    if (presetType === 'WELCOME') {
      setCode('WELCOME20');
      setTitle('20% Off Welcome Voucher');
      setDescription('20% discount on first online order, min spend $15.');
      setType('PERCENTAGE');
      setValue('20');
      setMinSpend('15.00');
      setMaxDiscount('8.00');
    } else if (presetType === 'FREE_DELIVERY') {
      setCode('FREEDEL30');
      setTitle('Free Delivery on Orders $30+');
      setDescription('100% free delivery fee waiver across all districts.');
      setType('FREE_DELIVERY');
      setValue('0');
      setMinSpend('30.00');
      setSelectedServices(['DELIVERY']);
    } else if (presetType === 'WEEKEND_CASH') {
      setCode('SAVE5');
      setTitle('Flat $5 Off Feast');
      setDescription('Instant $5 cash deduction on orders $25 and above.');
      setType('FIXED_AMOUNT');
      setValue('5.00');
      setMinSpend('25.00');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-[#DCE3DD] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#E0562B]" />
            <h3 className="font-bold text-base text-[#16241B] font-display">Promotions & Voucher Campaigns</h3>
          </div>
          <p className="text-xs text-[#526056] mt-0.5">
            Create coupon codes to boost repeat orders, drive dine-in QR traffic, or offer free delivery promotions.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#E0562B] hover:bg-[#B5431E] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Promo</span>
        </button>
      </div>

      {/* Promotions List */}
      {promos.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#DCE3DD] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F7F5] flex items-center justify-center mx-auto text-[#526056]">
            <Tag className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-[#16241B]">No active promotions yet</h4>
          <p className="text-xs text-[#526056] max-w-md mx-auto">
            Give customers an incentive to order! Create a percentage discount, a flat dollar off, or a free delivery code.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#16241B] text-white rounded-xl text-xs font-bold hover:bg-[#2F7A4F] transition-all cursor-pointer"
          >
            Launch First Promo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map(promo => {
            const isExpired = new Date(promo.endDate) < new Date();
            return (
              <div 
                key={promo.id} 
                className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                  !promo.isActive || isExpired ? 'border-[#DCE3DD] opacity-70 bg-[#F6F7F5]/50' : 'border-[#2F7A4F]/30 hover:border-[#2F7A4F]'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EBF3EE] text-[#2F7A4F] font-mono font-bold text-xs">
                      {promo.type === 'PERCENTAGE' && <Percent className="w-3.5 h-3.5" />}
                      {promo.type === 'FIXED_AMOUNT' && <DollarSign className="w-3.5 h-3.5" />}
                      {promo.type === 'FREE_DELIVERY' && <Truck className="w-3.5 h-3.5" />}
                      <span>
                        {promo.type === 'PERCENTAGE' ? `${promo.value}% OFF` : promo.type === 'FIXED_AMOUNT' ? `$${promo.value.toFixed(2)} OFF` : 'FREE DELIVERY'}
                      </span>
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !promo.isActive ? 'bg-[#FBE4DA] text-[#E0562B]' : isExpired ? 'bg-[#F6F7F5] text-[#526056]' : 'bg-[#EBF3EE] text-[#2F7A4F]'
                    }`}>
                      {!promo.isActive ? 'Paused' : isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>

                  {/* Promo Code Box */}
                  <div className="flex items-center justify-between p-2.5 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl mb-3">
                    <div>
                      <span className="text-[10px] text-[#526056] block uppercase tracking-wider font-semibold">Promo Code</span>
                      <span className="font-mono font-extrabold text-sm text-[#16241B]">{promo.code}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(promo.code)}
                      className="p-1.5 hover:bg-white text-[#526056] hover:text-[#16241B] rounded-lg transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode === promo.code ? <Check className="w-4 h-4 text-[#2F7A4F]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-[#16241B]">{promo.title}</h4>
                  <p className="text-xs text-[#526056] mt-1 line-clamp-2">{promo.description}</p>

                  <div className="mt-3 pt-3 border-t border-[#DCE3DD]/60 space-y-1 text-[11px] text-[#526056]">
                    <div className="flex justify-between">
                      <span>Minimum Spend:</span>
                      <span className="font-mono font-semibold text-[#16241B]">${promo.minSpend.toFixed(2)}</span>
                    </div>
                    {promo.maxDiscount && (
                      <div className="flex justify-between">
                        <span>Max Discount Cap:</span>
                        <span className="font-mono font-semibold text-[#16241B]">${promo.maxDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Times Claimed:</span>
                      <span className="font-mono font-semibold text-[#2F7A4F]">{promo.timesUsed} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Until:</span>
                      <span className="font-mono text-[#526056]">{promo.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-[#DCE3DD]">
                  <button
                    onClick={() => togglePromotionStatus(promo.id)}
                    className="text-xs font-semibold text-[#526056] hover:text-[#16241B] cursor-pointer"
                  >
                    {promo.isActive ? 'Pause' : 'Activate'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(promo)}
                      className="p-1.5 bg-[#F6F7F5] hover:bg-[#EBF3EE] text-[#526056] hover:text-[#2F7A4F] rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete promotion code "${promo.code}"?`)) {
                          deletePromotion(promo.id);
                        }
                      }}
                      className="p-1.5 bg-[#F6F7F5] hover:bg-[#FBE4DA] text-[#526056] hover:text-[#E0562B] rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Promotion Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#DCE3DD] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3DD]">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#E0562B]" />
                <h3 className="font-bold text-base text-[#16241B]">
                  {editingPromoId ? 'Edit Promotion' : 'Create New Promotion'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#526056] hover:text-[#16241B] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Presets for quick 1-click creation */}
            {!editingPromoId && (
              <div className="p-3 bg-[#F6F7F5] border border-[#DCE3DD] rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#16241B]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E0562B]" />
                  <span>1-Click Preset Ideas:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('WELCOME')}
                    className="px-2.5 py-1 bg-white hover:bg-[#EBF3EE] border border-[#DCE3DD] text-[11px] font-bold text-[#16241B] rounded-lg transition-all cursor-pointer"
                  >
                    🎉 20% Welcome Voucher
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('FREE_DELIVERY')}
                    className="px-2.5 py-1 bg-white hover:bg-[#EBF3EE] border border-[#DCE3DD] text-[11px] font-bold text-[#16241B] rounded-lg transition-all cursor-pointer"
                  >
                    🛵 Free Delivery over $30
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('WEEKEND_CASH')}
                    className="px-2.5 py-1 bg-white hover:bg-[#EBF3EE] border border-[#DCE3DD] text-[11px] font-bold text-[#16241B] rounded-lg transition-all cursor-pointer"
                  >
                    💵 Flat $5 Off
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#526056] block mb-1">Promo Code (Uppercase)</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE15"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono font-bold text-sm text-[#16241B] uppercase focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#526056] block mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PromotionType)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="FIXED_AMOUNT">Fixed Dollar ($) Off</option>
                    <option value="FREE_DELIVERY">100% Free Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#526056] block mb-1">Promotion Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 15% Off Your Entire Feast"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#526056] block mb-1">Customer Description / Conditions</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short note explaining conditions to customer..."
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {type !== 'FREE_DELIVERY' && (
                  <div>
                    <label className="font-semibold text-[#526056] block mb-1">
                      {type === 'PERCENTAGE' ? 'Discount (%)' : 'Discount ($)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono text-xs text-[#16241B]"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-[#526056] block mb-1">Min. Order ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono text-xs text-[#16241B]"
                  />
                </div>

                {type === 'PERCENTAGE' && (
                  <div>
                    <label className="font-semibold text-[#526056] block mb-1">Max Cap ($)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="No limit"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono text-xs text-[#16241B]"
                    />
                  </div>
                )}
              </div>

              {/* Service Type Selection */}
              <div>
                <label className="font-semibold text-[#526056] block mb-1">Applies to Service Modes:</label>
                <div className="flex gap-2">
                  {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as ServiceType[]).map(srv => (
                    <button
                      type="button"
                      key={srv}
                      onClick={() => handleServiceToggle(srv)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedServices.includes(srv)
                          ? 'bg-[#EBF3EE] border-[#2F7A4F] text-[#2F7A4F]'
                          : 'bg-[#F6F7F5] border-[#DCE3DD] text-[#526056]'
                      }`}
                    >
                      {srv === 'DINE_IN' ? '🍽️ Dine-In' : srv === 'TAKEAWAY' ? '🥡 Takeaway' : '🛵 Delivery'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#526056] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#526056] block mb-1">End Date (Expiry)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#F6F7F5] text-[#526056] font-bold rounded-xl hover:bg-[#DCE3DD] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E0562B] hover:bg-[#B5431E] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  {editingPromoId ? 'Update Promotion' : 'Launch Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
