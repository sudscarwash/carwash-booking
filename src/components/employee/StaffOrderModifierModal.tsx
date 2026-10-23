import React, { useState } from 'react';
import { Order, OrderItem, MenuItem, SelectedAddon } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  Check, 
  Search, 
  Utensils, 
  Receipt, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface StaffOrderModifierModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffOrderModifierModal: React.FC<StaffOrderModifierModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { getMenuItemsByRestaurant, getCategoriesByRestaurant } = useRestaurants();
  const { updateOrderItems, updateOrderTableNumber } = useOrders();
  const { currentUser } = useAuth();

  // Local draft of items for editing
  const [itemsDraft, setItemsDraft] = useState<OrderItem[]>(() => [...order.items]);
  const [tableNumberDraft, setTableNumberDraft] = useState(order.tableNumber || '');
  const [changeReason, setChangeReason] = useState('');
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'ADD_NEW'>('ITEMS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const availableMenuItems = getMenuItemsByRestaurant(order.restaurantId);
  const categories = getCategoriesByRestaurant(order.restaurantId);

  // Filtered menu items for adding new dishes
  const filteredMenuItems = availableMenuItems.filter(item => {
    if (!item.isAvailable) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // Quantity modification
  const handleUpdateQuantity = (orderItemId: string, delta: number) => {
    setItemsDraft(prev => {
      return prev
        .map(item => {
          if (item.id === orderItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null; // Marked for removal
            return {
              ...item,
              quantity: newQty,
              totalPrice: Number((item.unitPrice * newQty).toFixed(2)),
            };
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null);
    });
  };

  // Remove / Cancel specific item
  const handleRemoveItem = (orderItemId: string) => {
    setItemsDraft(prev => prev.filter(item => item.id !== orderItemId));
  };

  // Add new item from menu
  const handleAddNewItem = (menuItem: MenuItem) => {
    const existingIndex = itemsDraft.findIndex(i => i.itemId === menuItem.id && (!i.selectedAddons || i.selectedAddons.length === 0));
    
    if (existingIndex >= 0) {
      // Increase quantity of existing item
      handleUpdateQuantity(itemsDraft[existingIndex].id, 1);
    } else {
      const newItem: OrderItem = {
        id: `oi_mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: menuItem.id,
        itemName: menuItem.name,
        basePrice: menuItem.basePrice,
        unitPrice: menuItem.basePrice,
        quantity: 1,
        totalPrice: menuItem.basePrice,
        selectedAddons: [],
      };
      setItemsDraft(prev => [...prev, newItem]);
    }
  };

  // Calculate draft totals
  const draftSubtotal = itemsDraft.reduce((sum, item) => sum + item.totalPrice, 0);
  const draftTax = Number((draftSubtotal * 0.085).toFixed(2));
  const draftTotal = Number((draftSubtotal + draftTax + (order.deliveryFee || 0) + (order.tip || 0)).toFixed(2));
  const priceDifference = Number((draftTotal - order.totalAmount).toFixed(2));

  // Save changes
  const handleSave = () => {
    const actor = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    const finalReason = changeReason.trim() || 'Dine-in customer requested order update';

    if (tableNumberDraft !== (order.tableNumber || '')) {
      updateOrderTableNumber(order.id, tableNumberDraft, actor);
    }

    updateOrderItems(order.id, itemsDraft, finalReason, actor);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#D9E2D9] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#132218] text-white flex items-center justify-between border-b border-[#2D3E33]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#DE5124] text-[11px] font-extrabold uppercase tracking-wider">
                Order #{order.orderNumber}
              </span>
              {order.serviceType === 'DINE_IN' && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#247545] text-[11px] font-extrabold">
                  Table {order.tableNumber || 'Walk-in'}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black font-display text-white mt-1">
              Edit Table Order & Dishes
            </h2>
            <p className="text-xs text-[#A2B6A6]">
              Add new dishes, cancel/remove items, or adjust quantities for customer
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-[#233529] hover:bg-[#2F4737] text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Header Tabs & Table input */}
        <div className="bg-[#F5F7F4] border-b border-[#D9E2D9] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ITEMS'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Current Items ({itemsDraft.reduce((s, i) => s + i.quantity, 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab('ADD_NEW')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ADD_NEW'
                  ? 'bg-[#DE5124] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dishes from Menu</span>
            </button>
          </div>

          {order.serviceType === 'DINE_IN' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#4F6155]">Table:</span>
              <input
                type="text"
                value={tableNumberDraft}
                onChange={e => setTableNumberDraft(e.target.value)}
                placeholder="e.g. 4 or VIP"
                className="w-20 px-2.5 py-1 text-xs font-extrabold bg-white border border-[#D9E2D9] rounded-lg text-center focus:border-[#DE5124] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'ITEMS' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-[#4F6155]">
                  Active Dishes on Ticket
                </h3>
                <span className="text-xs text-[#7B8E81]">
                  Click minus to decrease or trash icon to cancel dish
                </span>
              </div>

              {itemsDraft.length === 0 ? (
                <div className="p-8 text-center bg-[#FDEEE9] rounded-2xl border border-[#F9D0C4] space-y-2">
                  <AlertTriangle className="w-8 h-8 text-[#DE5124] mx-auto" />
                  <p className="text-sm font-bold text-[#DE5124]">All items have been removed</p>
                  <p className="text-xs text-[#4F6155]">
                    Saving this will cancel the order ticket. Or click &quot;Add Dishes from Menu&quot; to add new items.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {itemsDraft.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#D9E2D9] hover:border-[#B4C5B8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#132218]">
                            {item.itemName}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#4F6155]">
                            ${item.unitPrice.toFixed(2)} each
                          </span>
                        </div>

                        {/* Selected Addons */}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selectedAddons.map(a => (
                              <span
                                key={a.optionId}
                                className="px-2 py-0.5 rounded-md bg-[#F5F7F4] text-[10px] font-semibold text-[#4F6155] border border-[#E0E7E1]"
                              >
                                + {a.optionName} {a.priceDelta > 0 && `(+$${a.priceDelta.toFixed(2)})`}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Special Instructions Note */}
                        {item.specialInstructions && (
                          <div className="mt-1 text-[11px] text-[#DE5124] font-medium italic">
                            Note: {item.specialInstructions}
                          </div>
                        )}
                      </div>

                      {/* Quantity & Delete Controls */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-[#EAEFEA] text-[#132218] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-extrabold text-xs text-[#132218]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-[#EAEFEA] text-[#132218] flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-20 text-right">
                          <span className="font-mono font-black text-sm text-[#132218]">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-8 h-8 rounded-xl bg-[#FDEEE9] hover:bg-[#F9D0C4] text-[#DE5124] flex items-center justify-center transition-colors cursor-pointer"
                          title="Cancel / Remove this item from order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add Banner */}
              <button
                onClick={() => setActiveTab('ADD_NEW')}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#D9E2D9] hover:border-[#DE5124] hover:bg-[#FFF7F4] text-xs font-bold text-[#DE5124] flex items-center justify-center gap-2 transition-all cursor-pointer mt-3"
              >
                <Plus className="w-4 h-4" />
                <span>Add More Dishes to This Table</span>
              </button>
            </div>
          ) : (
            /* ADD NEW DISHES TAB */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B8E81]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search menu dishes to add..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#D9E2D9] rounded-xl focus:border-[#DE5124] focus:outline-none"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-[#132218] text-white'
                        : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#132218] text-white'
                          : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredMenuItems.map(dish => {
                  const alreadyInOrder = itemsDraft.find(i => i.itemId === dish.id);

                  return (
                    <div
                      key={dish.id}
                      className="p-3 rounded-2xl bg-white border border-[#D9E2D9] hover:border-[#DE5124] flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E0E7E1] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#F5F7F4] flex items-center justify-center text-[#7B8E81] shrink-0">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-[#132218] leading-tight">
                            {dish.name}
                          </h4>
                          <span className="font-mono font-extrabold text-xs text-[#DE5124] block mt-0.5">
                            ${dish.basePrice.toFixed(2)}
                          </span>
                          {alreadyInOrder && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-[#247545] bg-[#E0F2E6] px-1.5 py-0.2 rounded">
                              {alreadyInOrder.quantity} on ticket
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddNewItem(dish)}
                        className="px-3 py-1.5 rounded-xl bg-[#132218] hover:bg-[#DE5124] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-[#F5F7F4] rounded-2xl flex items-center justify-between text-xs text-[#4F6155]">
                <span>Added items will be reflected on the ticket bill.</span>
                <button
                  onClick={() => setActiveTab('ITEMS')}
                  className="font-bold text-[#DE5124] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Review Draft Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Reason / Change Note */}
          <div className="p-3.5 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1.5">
            <label className="text-[11px] font-extrabold text-[#4F6155] uppercase tracking-wider block">
              Reason / Kitchen Modification Note (Optional)
            </label>
            <input
              type="text"
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              placeholder="e.g. Customer cancelled soup, added 2 iced teas and dessert"
              className="w-full px-3 py-2 text-xs bg-white border border-[#D9E2D9] rounded-xl focus:border-[#DE5124] focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Footer Summary & Actions */}
        <div className="p-4 sm:p-6 bg-white border-t border-[#D9E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#7B8E81] block">
                Original Total
              </span>
              <span className="font-mono text-sm text-[#4F6155] line-through">
                ${order.totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-[#7B8E81]" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[#7B8E81] block">
                Updated Bill Total
              </span>
              <span className="font-mono text-lg font-black text-[#132218]">
                ${draftTotal.toFixed(2)}
              </span>
            </div>

            {priceDifference !== 0 && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                priceDifference > 0 
                  ? 'bg-[#FDEEE9] text-[#DE5124]' 
                  : 'bg-[#E0F2E6] text-[#247545]'
              }`}>
                {priceDifference > 0 ? `+$${priceDifference.toFixed(2)}` : `-$${Math.abs(priceDifference).toFixed(2)}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D9E2D9] text-xs font-bold text-[#4F6155] hover:text-[#132218] hover:bg-[#F5F7F4] transition-colors cursor-pointer"
            >
              Discard Changes
            </button>

            <button
              onClick={handleSave}
              disabled={isSaved}
              className="px-6 py-2.5 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:bg-[#247545]"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Order Updated!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Update Kitchen Ticket</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
