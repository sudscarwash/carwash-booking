import React, { useState } from 'react';
import { MenuItem, SelectedAddon, AddonOption } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { X, Plus, Minus, Check, Flame, Leaf, WheatOff, LogIn, Utensils } from 'lucide-react';

interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, selectedAddons: SelectedAddon[], instructions?: string) => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  if (!item) return null;

  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { cartServiceType, cartTableNumber } = useOrders();
  const isGuest = !isAuthenticated || currentUser.id === 'usr_guest';
  const isGuestDineIn = isGuest && cartServiceType === 'DINE_IN';

  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Handle single-select or multi-select add-on options
  const toggleAddon = (groupId: string, groupName: string, option: AddonOption, maxSelection: number) => {
    const isAlreadySelected = selectedAddons.some(a => a.optionId === option.id);

    if (isAlreadySelected) {
      // Unselect
      setSelectedAddons(prev => prev.filter(a => a.optionId !== option.id));
    } else {
      if (maxSelection === 1) {
        // Radio behavior: remove any existing from this group, add this one
        setSelectedAddons(prev => [
          ...prev.filter(a => a.groupId !== groupId),
          {
            groupId,
            groupName,
            optionId: option.id,
            optionName: option.name,
            priceDelta: option.priceDelta,
          }
        ]);
      } else {
        // Multi-select behavior up to maxSelection
        const currentInGroup = selectedAddons.filter(a => a.groupId === groupId);
        if (currentInGroup.length < maxSelection) {
          setSelectedAddons(prev => [
            ...prev,
            {
              groupId,
              groupName,
              optionId: option.id,
              optionName: option.name,
              priceDelta: option.priceDelta,
            }
          ]);
        }
      }
    }
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.priceDelta, 0);
  const unitPrice = item.basePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  // Validation: check if all required groups are satisfied
  const isRequiredSatisfied = (item.addonGroups || []).every(group => {
    if (!group.isRequired) return true;
    const count = selectedAddons.filter(a => a.groupId === group.id).length;
    return count >= group.minSelection;
  });

  const handleAdd = () => {
    if (isGuest && !isGuestDineIn) {
      onClose();
      openAuthModal();
      return;
    }

    if (!isRequiredSatisfied) {
      alert('Please complete all required selections before adding to cart.');
      return;
    }
    onAddToCart(item, quantity, selectedAddons, specialInstructions.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#D9E2D9] animate-in zoom-in-95 duration-150">
        {/* Modal Image Header */}
        <div className="relative h-56 w-full bg-[#EDF1EC]">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 text-[#132218] flex items-center justify-center shadow-md hover:bg-white transition-transform active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-[#132218] font-display">{item.name}</h2>
              <span className="text-lg font-extrabold text-[#DE5124] font-mono shrink-0">
                ${item.basePrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-[#4F6155] mt-1.5 leading-relaxed">{item.description}</p>

            {/* Dietary Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {item.isVegetarian && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F2E6] text-[#247545] text-[11px] font-semibold">
                  <Leaf className="w-3 h-3" /> Vegetarian
                </span>
              )}
              {item.isGlutenFree && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDF3E1] text-[#C48214] text-[11px] font-semibold">
                  <WheatOff className="w-3 h-3" /> Gluten-Free
                </span>
              )}
              {item.isSpicy && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDEEE9] text-[#DE5124] text-[11px] font-semibold">
                  <Flame className="w-3 h-3" /> Spicy
                </span>
              )}
            </div>
          </div>

          {/* Add-on Groups */}
          {item.addonGroups && item.addonGroups.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-[#EDF1EC]">
              {item.addonGroups.map(group => {
                const isRadio = group.maxSelection === 1;
                const groupSelections = selectedAddons.filter(a => a.groupId === group.id);

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#132218]">{group.name}</h4>
                        <p className="text-[11px] text-[#7A8E80]">
                          {group.isRequired ? 'Required' : 'Optional'} • {isRadio ? 'Choose 1' : `Choose up to ${group.maxSelection}`}
                        </p>
                      </div>
                      {group.isRequired && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          groupSelections.length >= group.minSelection
                            ? 'bg-[#E0F2E6] text-[#247545]'
                            : 'bg-[#FDEEE9] text-[#DE5124]'
                        }`}>
                          {groupSelections.length >= group.minSelection ? 'Selected' : 'Required'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {group.options.map(option => {
                        const isSelected = selectedAddons.some(a => a.optionId === option.id);

                        return (
                          <div
                            key={option.id}
                            onClick={() => toggleAddon(group.id, group.name, option, group.maxSelection)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFF9F7] border-[#DE5124]'
                                : 'bg-[#F5F7F4] border-[#D9E2D9] hover:border-[#B8C7B8]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-${isRadio ? 'full' : 'md'} border flex items-center justify-center ${
                                isSelected ? 'bg-[#DE5124] border-[#DE5124] text-white' : 'border-[#7A8E80]'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-semibold text-[#132218]">{option.name}</span>
                            </div>
                            <span className="text-xs font-mono font-medium text-[#4F6155]">
                              {option.priceDelta > 0 ? `+$${option.priceDelta.toFixed(2)}` : 'Free'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2 pt-4 border-t border-[#EDF1EC]">
            <label className="text-xs font-bold text-[#132218] block">
              Special Kitchen Notes / Allergies
            </label>
            <input
              type="text"
              placeholder="e.g., Dressing on the side, extra crispy, no cutlery..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3.5 py-2 text-xs text-[#132218] placeholder-[#7A8E80] focus:outline-none focus:ring-2 focus:ring-[#DE5124]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#F5F7F4] border-t border-[#D9E2D9] flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center bg-white border border-[#D9E2D9] rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4F6155] hover:bg-[#EDF1EC] transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center text-xs font-bold font-mono text-[#132218]">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4F6155] hover:bg-[#EDF1EC] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAdd}
            disabled={!isRequiredSatisfied && !(isGuest && !isGuestDineIn)}
            className={`flex-1 flex items-center justify-between px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer ${
              isGuest && !isGuestDineIn
                ? 'bg-[#DE5124] hover:bg-[#BF3F16] text-white'
                : isRequiredSatisfied
                ? isGuestDineIn
                  ? 'bg-[#247545] hover:bg-[#1E6038] text-white'
                  : 'bg-[#DE5124] hover:bg-[#BF3F16] text-white'
                : 'bg-[#D9E2D9] text-[#7A8E80] cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {isGuest && !isGuestDineIn && <LogIn className="w-3.5 h-3.5" />}
              {isGuestDineIn && <Utensils className="w-3.5 h-3.5" />}
              {isGuest && !isGuestDineIn ? 'Sign In to Order' : isGuestDineIn ? `Add to ${cartTableNumber}` : 'Add to Cart'}
            </span>
            <span className="font-mono text-sm">${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
