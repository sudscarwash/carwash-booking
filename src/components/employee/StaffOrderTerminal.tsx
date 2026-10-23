import React, { useState } from 'react';
import { Restaurant, MenuItem, OrderItem, SelectedAddon, AddonOption, Order } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { MenuBookViewerModal } from '../customer/MenuBookViewerModal';
import { CashierCheckoutTerminal } from '../common/CashierCheckoutTerminal';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Utensils, 
  Search, 
  Send, 
  Check, 
  BookOpen, 
  Coffee, 
  User, 
  Sparkles, 
  ChevronRight, 
  Info,
  DollarSign
} from 'lucide-react';

interface StaffOrderTerminalProps {
  restaurant: Restaurant;
  onOrderCreated?: () => void;
  initialTableNumber?: string;
}

const DEFAULT_TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', 'Bar 1', 'VIP 1'];

export const StaffOrderTerminal: React.FC<StaffOrderTerminalProps> = ({
  restaurant,
  onOrderCreated,
  initialTableNumber,
}) => {
  const { getMenuItemsByRestaurant, getCategoriesByRestaurant } = useRestaurants();
  const { createStaffOrder } = useOrders();
  const { currentUser } = useAuth();

  const [serviceType, setServiceType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<string>(initialTableNumber || '1');
  const [customTable, setCustomTable] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNotes, setTableNotes] = useState<string>('');
  const [ticketItems, setTicketItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customization modal for dish with add-ons
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedAddonsDraft, setSelectedAddonsDraft] = useState<SelectedAddon[]>([]);
  const [customItemNotes, setCustomItemNotes] = useState('');
  const [itemQuantityDraft, setItemQuantityDraft] = useState(1);

  // Menu Booklet modal
  const [isBookletOpen, setIsBookletOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orderForCashierCheckout, setOrderForCashierCheckout] = useState<Order | null>(null);

  // Tax & Service Charge (Default 0% for Brunei eateries)
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [customTaxAmount, setCustomTaxAmount] = useState<string>('');

  const menuItems = getMenuItemsByRestaurant(restaurant.id);
  const categories = getCategoriesByRestaurant(restaurant.id);

  const filteredItems = menuItems.filter(item => {
    if (!item.isAvailable) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeTableNumber = customTable.trim() || selectedTable;

  // Handle clicking a dish
  const handleItemClick = (item: MenuItem) => {
    if (item.addonGroups && item.addonGroups.length > 0) {
      setCustomizingItem(item);
      setSelectedAddonsDraft([]);
      setCustomItemNotes('');
      setItemQuantityDraft(1);
    } else {
      // Quick add directly
      addItemToTicket(item, 1, [], '');
    }
  };

  const addItemToTicket = (
    item: MenuItem, 
    qty: number, 
    addons: SelectedAddon[], 
    instructions: string
  ) => {
    const addonsDelta = addons.reduce((sum, a) => sum + a.priceDelta, 0);
    const unitPrice = item.basePrice + addonsDelta;
    const totalPrice = Number((unitPrice * qty).toFixed(2));

    const existingIndex = ticketItems.findIndex(i => 
      i.itemId === item.id && 
      JSON.stringify(i.selectedAddons) === JSON.stringify(addons) &&
      (i.specialInstructions || '') === instructions
    );

    if (existingIndex >= 0) {
      setTicketItems(prev => {
        const copy = [...prev];
        const updatedQty = copy[existingIndex].quantity + qty;
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: updatedQty,
          totalPrice: Number((copy[existingIndex].unitPrice * updatedQty).toFixed(2)),
        };
        return copy;
      });
    } else {
      const newOrderItem: OrderItem = {
        id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemId: item.id,
        itemName: item.name,
        basePrice: item.basePrice,
        unitPrice,
        quantity: qty,
        totalPrice,
        selectedAddons: addons,
        specialInstructions: instructions || undefined,
      };
      setTicketItems(prev => [...prev, newOrderItem]);
    }

    setCustomizingItem(null);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setTicketItems(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, idx) => idx !== index);
      }
      copy[index] = {
        ...copy[index],
        quantity: newQty,
        totalPrice: Number((copy[index].unitPrice * newQty).toFixed(2)),
      };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setTicketItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = ticketItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = customTaxAmount.trim() !== '' 
    ? Math.max(0, parseFloat(customTaxAmount) || 0)
    : Number(((subtotal * taxRatePercent) / 100).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  // Submit order to kitchen
  const handleSendToKitchen = () => {
    if (ticketItems.length === 0) return;

    const waiterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Floor Server';

    const order = createStaffOrder({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: `${restaurant.address.street}, ${restaurant.address.city}`,
      restaurantPhone: restaurant.phone,
      serviceType,
      tableNumber: serviceType === 'DINE_IN' ? activeTableNumber : undefined,
      customerName: customerName.trim() || (serviceType === 'DINE_IN' ? `Table ${activeTableNumber}` : 'Takeaway Guest'),
      items: ticketItems,
      waiterName,
      specialNotes: tableNotes.trim() || undefined,
      tax,
    });

    setSuccessMessage(`Order #${order.orderNumber} sent to kitchen for ${serviceType === 'DINE_IN' ? `Table ${activeTableNumber}` : 'Takeaway'}!`);
    setTicketItems([]);
    setTableNotes('');
    setCustomerName('');

    setTimeout(() => {
      setSuccessMessage(null);
      if (onOrderCreated) {
        onOrderCreated();
      }
    }, 2500);
  };

  const handleOpenCashierCheckout = () => {
    if (ticketItems.length === 0) return;
    const waiterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Floor Server';
    const order = createStaffOrder({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: `${restaurant.address.street}, ${restaurant.address.city}`,
      restaurantPhone: restaurant.phone,
      serviceType,
      tableNumber: serviceType === 'DINE_IN' ? activeTableNumber : undefined,
      customerName: customerName.trim() || (serviceType === 'DINE_IN' ? `Table ${activeTableNumber}` : 'Takeaway Guest'),
      items: ticketItems,
      waiterName,
      specialNotes: tableNotes.trim() || undefined,
      tax,
    });
    setTicketItems([]);
    setTableNotes('');
    setCustomerName('');
    setOrderForCashierCheckout(order);
  };

  return (
    <div className="space-y-6">
      {/* Top POS Action & Mode Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#247545]"></span>
            <h2 className="text-lg font-extrabold text-[#132218] font-display">
              {restaurant.name} • Floor POS & Order Entry
            </h2>
          </div>
          <p className="text-xs text-[#4F6155] mt-0.5">
            Take dine-in table orders and takeaway orders directly on behalf of guests
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Menu Booklet Link */}
          <button
            onClick={() => setIsBookletOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] text-[#132218] border border-[#D9E2D9] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open physical menu booklet scan"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#DE5124]" />
            <span>View Full Menu Booklet ({restaurant.menuBookPages?.length || 0} Pages)</span>
          </button>

          {/* Service Type Switcher */}
          <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
            <button
              onClick={() => setServiceType('DINE_IN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                serviceType === 'DINE_IN'
                  ? 'bg-[#132218] text-white shadow-2xs'
                  : 'text-[#4F6155] hover:text-[#132218]'
              }`}
            >
              Dine-In Table
            </button>
            <button
              onClick={() => setServiceType('TAKEAWAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                serviceType === 'TAKEAWAY'
                  ? 'bg-[#132218] text-white shadow-2xs'
                  : 'text-[#4F6155] hover:text-[#132218]'
              }`}
            >
              Takeaway / Counter
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#E0F2E6] border border-[#C2E4CD] text-[#247545] font-bold text-xs flex items-center gap-2 shadow-xs animate-bounce">
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main POS Layout (2 Columns on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Table Selector & Menu Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Table Selection Bar (if DINE_IN) */}
          {serviceType === 'DINE_IN' ? (
            <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#4F6155]">
                  Select Table Number
                </span>
                <span className="text-xs font-mono font-bold text-[#DE5124]">
                  Active: Table {activeTableNumber}
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {DEFAULT_TABLES.map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTable(t);
                      setCustomTable('');
                    }}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      selectedTable === t && !customTable
                        ? 'bg-[#DE5124] text-white border-[#DE5124] shadow-xs scale-105'
                        : 'bg-[#F5F7F4] text-[#132218] border-[#D9E2D9] hover:border-[#132218]'
                    }`}
                  >
                    T{t}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs text-[#7B8E81] whitespace-nowrap">Or custom table:</span>
                <input
                  type="text"
                  value={customTable}
                  onChange={e => setCustomTable(e.target.value)}
                  placeholder="e.g. Patio 3, VIP, Outdoor 2"
                  className="w-full px-3 py-1.5 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] space-y-2 shadow-xs">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#4F6155]">
                Takeaway Customer Details
              </span>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer Name / Pickup Callout (e.g. John C.)"
                className="w-full px-3 py-2 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
              />
            </div>
          )}

          {/* Menu Search & Category Filter */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B8E81]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search full menu dishes..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#132218] text-white shadow-2xs'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  All ({menuItems.length})
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-[#132218] text-white shadow-2xs'
                        : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="p-3 rounded-2xl bg-white border border-[#D9E2D9] hover:border-[#DE5124] hover:shadow-xs flex items-start gap-3 transition-all cursor-pointer group select-none"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[#E0E7E1] shrink-0 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#F5F7F4] flex items-center justify-center text-[#7B8E81] shrink-0">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#132218] leading-tight group-hover:text-[#DE5124] transition-colors truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-[#7B8E81] line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono font-extrabold text-xs text-[#132218]">
                        ${item.basePrice.toFixed(2)}
                      </span>
                      {item.addonGroups && item.addonGroups.length > 0 ? (
                        <span className="text-[10px] font-bold text-[#DE5124] bg-[#FDEEE9] px-2 py-0.5 rounded-md">
                          Options +
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-[#132218] group-hover:bg-[#DE5124] text-white flex items-center justify-center text-xs font-bold">
                          +
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Order Ticket (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-white rounded-3xl border border-[#D9E2D9] shadow-md overflow-hidden flex flex-col">
            {/* Ticket Header */}
            <div className="p-4 bg-[#132218] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A2B6A6] tracking-wider block">
                  Active Floor Ticket
                </span>
                <h3 className="text-base font-black font-display text-white">
                  {serviceType === 'DINE_IN' ? `Table ${activeTableNumber}` : 'Takeaway Ticket'}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#A2B6A6] block">
                  Server
                </span>
                <span className="text-xs font-bold text-white">
                  {currentUser.firstName}
                </span>
              </div>
            </div>

            {/* Ticket Items List */}
            <div className="p-4 flex-1 max-h-80 overflow-y-auto divide-y divide-[#EDF1EC] space-y-2">
              {ticketItems.length === 0 ? (
                <div className="py-12 text-center text-[#7B8E81] space-y-2">
                  <Utensils className="w-8 h-8 mx-auto text-[#C5D5C8]" />
                  <p className="text-xs font-bold">Ticket is empty</p>
                  <p className="text-[11px]">
                    Tap dishes from the left to start building this table&apos;s order
                  </p>
                </div>
              ) : (
                ticketItems.map((item, idx) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#132218]">
                          {item.itemName}
                        </span>
                      </div>

                      {/* Addons */}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="text-[10px] text-[#7B8E81] space-y-0.5 mt-0.5">
                          {item.selectedAddons.map(a => (
                            <div key={a.optionId}>+ {a.optionName}</div>
                          ))}
                        </div>
                      )}

                      {/* Instructions */}
                      {item.specialInstructions && (
                        <div className="text-[10px] text-[#DE5124] italic mt-0.5">
                          Note: {item.specialInstructions}
                        </div>
                      )}

                      <span className="text-[11px] font-mono text-[#4F6155] block mt-0.5">
                        ${item.unitPrice.toFixed(2)} ea
                      </span>
                    </div>

                    {/* Quantity modifier */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-lg border border-[#D9E2D9]">
                        <button
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="w-5 h-5 rounded bg-white text-[#132218] flex items-center justify-center text-xs hover:bg-[#EAEFEA] cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs text-[#132218]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="w-5 h-5 rounded bg-white text-[#132218] flex items-center justify-center text-xs hover:bg-[#EAEFEA] cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <span className="w-14 text-right font-mono font-black text-xs text-[#132218]">
                        ${item.totalPrice.toFixed(2)}
                      </span>

                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-[#BA2D2D] hover:text-[#DE5124] p-1 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes & Kitchen instructions */}
            <div className="p-3 bg-[#F5F7F4] border-t border-[#D9E2D9]">
              <input
                type="text"
                value={tableNotes}
                onChange={e => setTableNotes(e.target.value)}
                placeholder="Table note (e.g. VIP guests, rush order, serve soup first)"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9E2D9] rounded-xl focus:border-[#DE5124] focus:outline-none"
              />
            </div>

            {/* Financial Totals & Tax Configuration */}
            <div className="p-4 bg-white border-t border-[#D9E2D9] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#4F6155]">
                <span>Subtotal ({ticketItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
              </div>

              {/* Tax / Service Charge Selector */}
              <div className="pt-1.5 pb-1 border-t border-dashed border-[#EAEFEA] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#4F6155]">Tax / Service Charge:</span>
                  <span className="font-mono font-bold text-[#132218]">${tax.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '0% Net', pct: 0 },
                    { label: '10% Svc', pct: 10 },
                    { label: '8.5%', pct: 8.5 },
                  ].map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        setTaxRatePercent(t.pct);
                        setCustomTaxAmount('');
                      }}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        taxRatePercent === t.pct && customTaxAmount === ''
                          ? 'bg-[#132218] text-white border-[#132218]'
                          : 'bg-[#F5F7F4] text-[#4F6155] border-[#D9E2D9] hover:border-[#132218]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="$ Flat"
                      value={customTaxAmount}
                      onChange={e => {
                        setCustomTaxAmount(e.target.value);
                      }}
                      className="w-full py-1 px-1.5 text-[10px] text-center font-mono font-bold bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg focus:outline-none focus:border-[#DE5124]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D9E2D9] flex items-center justify-between">
                <span className="text-sm font-black font-display text-[#132218]">Total Bill</span>
                <span className="text-lg font-mono font-black text-[#DE5124]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons: Cashier Register or Kitchen */}
            <div className="p-4 bg-[#F5F7F4] border-t border-[#D9E2D9] space-y-2">
              <button
                type="button"
                onClick={handleOpenCashierCheckout}
                disabled={ticketItems.length === 0}
                className="w-full py-3.5 rounded-2xl bg-[#247545] hover:bg-[#1B5733] disabled:bg-[#D9E2D9] disabled:text-[#7B8E81] text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cashier Checkout (Cash & Return Change)</span>
              </button>

              <button
                onClick={handleSendToKitchen}
                disabled={ticketItems.length === 0}
                className="w-full py-2.5 rounded-2xl bg-[#132218] hover:bg-[#2B3F31] disabled:bg-[#D9E2D9] disabled:text-[#7B8E81] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Send to Kitchen Only ({serviceType === 'DINE_IN' ? `Table ${activeTableNumber}` : 'Takeaway'})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dish Customization Modal (if dish has options/addons) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#D9E2D9]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#132218] font-display">
                  Customize {customizingItem.name}
                </h3>
                <span className="text-xs font-mono font-bold text-[#DE5124]">
                  Base Price: ${customizingItem.basePrice.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="text-[#7B8E81] hover:text-[#132218] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Addon groups */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {customizingItem.addonGroups?.map(group => (
                <div key={group.id} className="p-3 rounded-2xl bg-[#F5F7F4] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#132218]">
                      {group.name} {group.isRequired && <span className="text-[#DE5124]">*</span>}
                    </span>
                    <span className="text-[10px] text-[#7B8E81]">
                      Max {group.maxSelection}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.options.map(opt => {
                      const isSelected = selectedAddonsDraft.some(a => a.optionId === opt.id);

                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white border-[#DE5124] text-[#DE5124] font-bold'
                              : 'bg-white border-[#D9E2D9] text-[#132218]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedAddonsDraft(prev => prev.filter(a => a.optionId !== opt.id));
                                } else {
                                  // Add
                                  setSelectedAddonsDraft(prev => [
                                    ...prev,
                                    {
                                      groupId: group.id,
                                      groupName: group.name,
                                      optionId: opt.id,
                                      optionName: opt.name,
                                      priceDelta: opt.priceDelta,
                                    },
                                  ]);
                                }
                              }}
                              className="rounded text-[#DE5124] focus:ring-0"
                            />
                            <span>{opt.name}</span>
                          </div>
                          {opt.priceDelta > 0 && (
                            <span className="font-mono text-[11px]">
                              +${opt.priceDelta.toFixed(2)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#4F6155]">Cooking / Chef Notes</label>
              <input
                type="text"
                value={customItemNotes}
                onChange={e => setCustomItemNotes(e.target.value)}
                placeholder="e.g. Less spicy, dressing on side, no celery"
                className="w-full px-3 py-2 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#4F6155]">Quantity:</span>
                <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
                  <button
                    onClick={() => setItemQuantityDraft(Math.max(1, itemQuantityDraft - 1))}
                    className="w-6 h-6 rounded bg-white text-[#132218] flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-xs">
                    {itemQuantityDraft}
                  </span>
                  <button
                    onClick={() => setItemQuantityDraft(itemQuantityDraft + 1)}
                    className="w-6 h-6 rounded bg-white text-[#132218] flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => addItemToTicket(customizingItem, itemQuantityDraft, selectedAddonsDraft, customItemNotes)}
                className="px-5 py-2.5 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-extrabold cursor-pointer"
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Book Viewer Modal */}
      {isBookletOpen && (
        <MenuBookViewerModal
          isOpen={isBookletOpen}
          onClose={() => setIsBookletOpen(false)}
          restaurant={restaurant}
        />
      )}

      {/* Cashier Checkout Modal */}
      {orderForCashierCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#F5F7F4] rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#D9E2D9] my-6 max-h-[92vh] overflow-y-auto">
            <CashierCheckoutTerminal
              restaurant={restaurant}
              preSelectedOrder={orderForCashierCheckout}
              onClose={() => {
                setOrderForCashierCheckout(null);
                if (onOrderCreated) onOrderCreated();
              }}
              isModal
            />
          </div>
        </div>
      )}
    </div>
  );
};
