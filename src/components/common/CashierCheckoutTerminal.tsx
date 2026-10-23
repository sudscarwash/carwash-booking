import React, { useState, useMemo } from 'react';
import { Restaurant, Order, MenuItem, OrderItem, SelectedAddon, PaymentMethodType } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, 
  Receipt, 
  Check, 
  RotateCcw, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  Utensils, 
  Coffee, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Coins, 
  Wallet,
  Clock,
  ArrowRight,
  Layers,
  Percent,
  Smartphone,
  Building,
  Calculator,
  Tag,
  Delete
} from 'lucide-react';

interface CashierCheckoutTerminalProps {
  restaurant: Restaurant;
  preSelectedOrder?: Order | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const CashierCheckoutTerminal: React.FC<CashierCheckoutTerminalProps> = ({
  restaurant,
  preSelectedOrder,
  onClose,
  isModal = false,
}) => {
  const { orders, settleOrderWithCash, createAndSettleCounterOrder } = useOrders();
  const { getMenuItemsByRestaurant, getCategoriesByRestaurant } = useRestaurants();
  const { currentUser } = useAuth();

  // Cashier Operator Name
  const cashierName = `${currentUser.firstName || 'Cashier'} ${currentUser.lastName || ''}`.trim() || 'Floor Staff';

  // Mode: Settle existing open table/ticket OR create brand new counter walk-in sale
  const [activeMode, setActiveMode] = useState<'SETTLE_TABLE' | 'COUNTER_SALE'>(
    preSelectedOrder ? 'SETTLE_TABLE' : 'COUNTER_SALE'
  );

  // Active Unsettled Orders for this restaurant
  const openRestaurantOrders = useMemo(() => {
    return orders.filter(o => 
      o.restaurantId === restaurant.id &&
      !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status) &&
      o.paymentStatus !== 'PAID'
    );
  }, [orders, restaurant.id]);

  // Selected existing order to settle
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preSelectedOrder?.id || (openRestaurantOrders[0]?.id || '')
  );

  const activeExistingOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // For COUNTER_SALE: Local ticket items
  const [ticketItems, setTicketItems] = useState<OrderItem[]>([]);
  const [serviceType, setServiceType] = useState<'TAKEAWAY' | 'DINE_IN'>('TAKEAWAY');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [customerLabel, setCustomerLabel] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Financial Discounter
  const [discountPercent, setDiscountPercent] = useState<number>(0); // 0, 5, 10, 15, 20
  const [customDiscountBnd, setCustomDiscountBnd] = useState<string>('');

  // FLEXIBLE TAX / SERVICE CHARGE CONFIGURATION (Default: 0% in Brunei local restaurants)
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0); // 0, 5, 8.5, 10, or custom
  const [customTaxMode, setCustomTaxMode] = useState<'PERCENT' | 'FLAT_BND'>('PERCENT');
  const [customTaxInput, setCustomTaxInput] = useState<string>('');
  const [showTaxConfig, setShowTaxConfig] = useState<boolean>(false);

  // PAYMENT CHANNELS (Cash, QuickPay, Bank Transfer, Tarus, Pocket, Card, Other Custom)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH_ON_DELIVERY');
  const [customPaymentName, setCustomPaymentName] = useState<string>('');
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState<string>('');

  // CASH & CHANGE CALCULATOR STATE
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [showTouchNumpad, setShowTouchNumpad] = useState<boolean>(false);

  // Receipt Modal State
  const [completedOrderForReceipt, setCompletedOrderForReceipt] = useState<Order | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Menu items & categories
  const menuItems = getMenuItemsByRestaurant(restaurant.id);
  const categories = getCategoriesByRestaurant(restaurant.id);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.isAvailable) return false;
      if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // CALCULATE ACTIVE TOTALS
  const { currentSubtotal, currentTax, currentDiscount, grandTotalDue, currentItemsCount, currentDisplayItems, activeTaxLabel } = useMemo(() => {
    let subtotal = 0;
    let itemsCount = 0;
    let displayItems: OrderItem[] = [];

    if (activeMode === 'SETTLE_TABLE' && activeExistingOrder) {
      subtotal = activeExistingOrder.subtotal;
      itemsCount = activeExistingOrder.items.reduce((s, i) => s + i.quantity, 0);
      displayItems = activeExistingOrder.items;
    } else {
      subtotal = ticketItems.reduce((s, i) => s + i.totalPrice, 0);
      itemsCount = ticketItems.reduce((s, i) => s + i.quantity, 0);
      displayItems = ticketItems;
    }

    // Compute Discount
    let discount = 0;
    if (discountPercent > 0) {
      discount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    } else if (parseFloat(customDiscountBnd) > 0) {
      discount = Math.min(subtotal, parseFloat(customDiscountBnd));
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);

    // Compute Tax / Service Charge
    let tax = 0;
    let taxLabel = '0% (No Tax)';

    if (customTaxInput.trim() !== '') {
      const customVal = parseFloat(customTaxInput) || 0;
      if (customTaxMode === 'PERCENT') {
        tax = Number(((discountedSubtotal * customVal) / 100).toFixed(2));
        taxLabel = `${customVal}% Tax`;
      } else {
        tax = Number(customVal.toFixed(2));
        taxLabel = `$${tax.toFixed(2)} Flat`;
      }
    } else if (taxRatePercent > 0) {
      tax = Number(((discountedSubtotal * taxRatePercent) / 100).toFixed(2));
      taxLabel = taxRatePercent === 10 ? '10% Service Charge' : `${taxRatePercent}% Tax`;
    } else {
      tax = 0;
      taxLabel = '0% (No Tax)';
    }

    const grandTotal = Number((discountedSubtotal + tax).toFixed(2));

    return {
      currentSubtotal: subtotal,
      currentTax: tax,
      currentDiscount: discount,
      grandTotalDue: grandTotal,
      currentItemsCount: itemsCount,
      currentDisplayItems: displayItems,
      activeTaxLabel: taxLabel,
    };
  }, [activeMode, activeExistingOrder, ticketItems, discountPercent, customDiscountBnd, taxRatePercent, customTaxMode, customTaxInput]);

  // CASH & CHANGE VALUES
  const cashGivenNumeric = parseFloat(cashTenderedInput) || 0;
  const isCashSufficient = cashGivenNumeric >= grandTotalDue && grandTotalDue > 0;
  const changeToReturn = isCashSufficient ? Number((cashGivenNumeric - grandTotalDue).toFixed(2)) : 0;
  const cashShortage = (!isCashSufficient && cashGivenNumeric > 0) ? Number((grandTotalDue - cashGivenNumeric).toFixed(2)) : 0;

  // Change Denomination Breakdown Helper (Brunei Dollars: B$50, B$20, B$10, B$5, B$1, 50c, 20c, 10c)
  const denominationBreakdown = useMemo(() => {
    if (changeToReturn <= 0) return null;
    let remainder = Math.round(changeToReturn * 100);
    const notes: string[] = [];

    const denominations = [
      { name: 'B$50 bill', cents: 5000 },
      { name: 'B$20 bill', cents: 2000 },
      { name: 'B$10 bill', cents: 1000 },
      { name: 'B$5 bill', cents: 500 },
      { name: 'B$1 bill', cents: 100 },
      { name: '50¢ coin', cents: 50 },
      { name: '20¢ coin', cents: 20 },
      { name: '10¢ coin', cents: 10 },
      { name: '5¢ coin', cents: 5 },
      { name: '1¢ coin', cents: 1 },
    ];

    for (const d of denominations) {
      const count = Math.floor(remainder / d.cents);
      if (count > 0) {
        notes.push(`${count}x ${d.name}`);
        remainder %= d.cents;
      }
    }

    return notes.slice(0, 4).join(', ');
  }, [changeToReturn]);

  // Cash Quick Bill Buttons
  const handleSetExactCash = () => {
    setCashTenderedInput(grandTotalDue.toFixed(2));
  };

  const handleAddBill = (amount: number) => {
    const current = parseFloat(cashTenderedInput) || 0;
    setCashTenderedInput((current + amount).toFixed(2));
  };

  const handleSetBillAbsolute = (amount: number) => {
    setCashTenderedInput(amount.toFixed(2));
  };

  const handleRoundToNearestFiveOrTen = () => {
    if (grandTotalDue <= 0) return;
    const nextFive = Math.ceil(grandTotalDue / 5) * 5;
    const finalVal = nextFive === grandTotalDue ? nextFive + 5 : nextFive;
    setCashTenderedInput(finalVal.toFixed(2));
  };

  // On-screen touch keypad handlers for tablet & mobile cash registers
  const handleTouchNumpadPress = (char: string) => {
    if (char === 'CLEAR') {
      setCashTenderedInput('');
      return;
    }
    if (char === 'BACKSPACE') {
      setCashTenderedInput(prev => prev.slice(0, -1));
      return;
    }
    if (char === '.') {
      if (cashTenderedInput.includes('.')) return;
      setCashTenderedInput(prev => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    if (char === '00') {
      if (cashTenderedInput === '' || cashTenderedInput === '0') return;
      setCashTenderedInput(prev => prev + '00');
      return;
    }
    // Number digit
    setCashTenderedInput(prev => {
      if (prev === '0') return char;
      // Limit to 2 decimal places if dot present
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return prev;
      }
      return prev + char;
    });
  };

  // Add Item to Counter Ticket
  const handleAddItemToCounterTicket = (item: MenuItem) => {
    const unitPrice = item.basePrice;
    setTicketItems(prev => {
      const existingIdx = prev.findIndex(i => i.itemId === item.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          totalPrice: Number((copy[existingIdx].unitPrice * newQty).toFixed(2)),
        };
        return copy;
      } else {
        const newOrderItem: OrderItem = {
          id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          itemId: item.id,
          itemName: item.name,
          basePrice: item.basePrice,
          unitPrice,
          quantity: 1,
          totalPrice: unitPrice,
          selectedAddons: [],
        };
        return [...prev, newOrderItem];
      }
    });
  };

  const handleUpdateTicketQty = (index: number, delta: number) => {
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

  const handleClearTicket = () => {
    setTicketItems([]);
    setCashTenderedInput('');
    setDiscountPercent(0);
    setCustomDiscountBnd('');
  };

  // Resolved channel display name
  const effectiveChannelDisplayName = useMemo(() => {
    switch (paymentMethod) {
      case 'CASH_ON_DELIVERY':
        return 'Physical Cash';
      case 'BANK_TRANSFER_BIBD':
        return 'BIBD QuickPay';
      case 'DIRECT_BANK_TRANSFER':
        return 'Direct Bank Transfer';
      case 'TARUS':
        return 'Tarus e-Wallet';
      case 'POCKET':
        return 'Pocket Brunei';
      case 'STRIPE_CARD':
        return 'Card POS Terminal';
      case 'OTHER_CUSTOM':
        return customPaymentName.trim() || 'Custom Channel';
      default:
        return paymentMethod;
    }
  }, [paymentMethod, customPaymentName]);

  // PROCESS CHECKOUT / PAYMENT SETTLEMENT
  const handleProcessCheckout = () => {
    if (grandTotalDue <= 0) return;

    if (paymentMethod === 'CASH_ON_DELIVERY' && !isCashSufficient) {
      alert(`Please enter cash tendered of at least $${grandTotalDue.toFixed(2)}.`);
      return;
    }

    const finalCashTendered = paymentMethod === 'CASH_ON_DELIVERY' 
      ? cashGivenNumeric 
      : (cashGivenNumeric > 0 ? cashGivenNumeric : grandTotalDue);
    const finalChangeReturned = paymentMethod === 'CASH_ON_DELIVERY' ? changeToReturn : 0;
    const customChannelLabel = paymentMethod === 'OTHER_CUSTOM' 
      ? (customPaymentName.trim() || 'Custom Channel') 
      : (['TARUS', 'POCKET', 'DIRECT_BANK_TRANSFER'].includes(paymentMethod) ? effectiveChannelDisplayName : undefined);

    if (activeMode === 'SETTLE_TABLE') {
      if (!activeExistingOrder) return;

      settleOrderWithCash(activeExistingOrder.id, {
        cashTendered: finalCashTendered,
        changeReturned: finalChangeReturned,
        cashierName,
        paymentMethod,
        status: 'DELIVERED',
        customPaymentChannelName: customChannelLabel,
        paymentReference: paymentReferenceNumber.trim() || undefined,
      });

      const updatedOrderRecord: Order = {
        ...activeExistingOrder,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        paymentMethod,
        cashTendered: finalCashTendered,
        changeReturned: finalChangeReturned,
        settledBy: cashierName,
        settledAt: new Date().toISOString(),
        discountAmount: currentDiscount,
        tax: currentTax,
        totalAmount: grandTotalDue,
        customPaymentChannelName: customChannelLabel,
        paymentReference: paymentReferenceNumber.trim() || undefined,
      };

      setCompletedOrderForReceipt(updatedOrderRecord);
      setSuccessBanner(`Payment settled for Order #${activeExistingOrder.orderNumber} via ${effectiveChannelDisplayName}! Change: $${finalChangeReturned.toFixed(2)}`);
    } else {
      // COUNTER_SALE
      if (ticketItems.length === 0) return;

      const createdOrder = createAndSettleCounterOrder({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantAddress: `${restaurant.address.street}, ${restaurant.address.city}`,
        restaurantPhone: restaurant.phone,
        serviceType,
        tableNumber: serviceType === 'DINE_IN' ? tableNumber : undefined,
        customerName: customerLabel.trim() || (serviceType === 'DINE_IN' ? `Table ${tableNumber}` : 'Walk-in Guest'),
        items: ticketItems,
        subtotal: currentSubtotal,
        tax: currentTax,
        discountAmount: currentDiscount,
        totalAmount: grandTotalDue,
        paymentMethod,
        cashTendered: finalCashTendered,
        changeReturned: finalChangeReturned,
        cashierName,
        markAsDelivered: true,
        customPaymentChannelName: customChannelLabel,
        paymentReference: paymentReferenceNumber.trim() || undefined,
      });

      setCompletedOrderForReceipt(createdOrder);
      setSuccessBanner(`Sale #${createdOrder.orderNumber} completed via ${effectiveChannelDisplayName}! Change: $${finalChangeReturned.toFixed(2)}`);
      setTicketItems([]);
      setCashTenderedInput('');
    }
  };

  const handleResetForNewSale = () => {
    setCompletedOrderForReceipt(null);
    setSuccessBanner(null);
    setCashTenderedInput('');
    setPaymentReferenceNumber('');
    setCustomPaymentName('');
    setDiscountPercent(0);
    setCustomDiscountBnd('');
    if (activeMode === 'COUNTER_SALE') {
      setTicketItems([]);
    } else {
      if (openRestaurantOrders.length > 0) {
        setSelectedOrderId(openRestaurantOrders[0].id);
      } else {
        setActiveMode('COUNTER_SALE');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Mode & Cashier Profile Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#247545] animate-pulse"></span>
            <h2 className="text-lg font-black text-[#132218] font-display flex items-center gap-2">
              <span>{restaurant.name}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2E6] text-[#247545] border border-[#C2E4CD] font-mono">
                Cash Register POS
              </span>
            </h2>
          </div>
          <p className="text-xs text-[#4F6155] mt-0.5">
            Operator: <strong className="text-[#132218]">{cashierName}</strong> • Real-time Brunei change calculator & custom multi-channel tender
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
            <button
              onClick={() => {
                setActiveMode('COUNTER_SALE');
                setCashTenderedInput('');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'COUNTER_SALE'
                  ? 'bg-[#132218] text-white shadow-2xs'
                  : 'text-[#4F6155] hover:text-[#132218]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Walk-in Counter Sale</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('SETTLE_TABLE');
                setCashTenderedInput('');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeMode === 'SETTLE_TABLE'
                  ? 'bg-[#132218] text-white shadow-2xs'
                  : 'text-[#4F6155] hover:text-[#132218]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Settle Dining Table</span>
              {openRestaurantOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#DE5124] text-white">
                  {openRestaurantOrders.length}
                </span>
              )}
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7B8E81] hover:text-[#132218] hover:bg-[#F5F7F4] border border-[#D9E2D9] cursor-pointer"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-[#E0F2E6] border border-[#C2E4CD] text-[#247545] font-bold text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[#247545] hover:underline text-xs cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Register Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Catalog or Open Tables Selector): 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {activeMode === 'SETTLE_TABLE' ? (
            /* Open Tables Selector */
            <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-[#132218] font-display">
                    Select Open Dining Table / Unsettled Ticket
                  </h3>
                  <p className="text-xs text-[#4F6155]">
                    Pick a seated guest or takeaway waiting to settle their bill
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#DE5124]">
                  {openRestaurantOrders.length} Open Tickets
                </span>
              </div>

              {openRestaurantOrders.length === 0 ? (
                <div className="py-12 text-center text-[#7B8E81] space-y-2 border border-dashed border-[#D9E2D9] rounded-2xl p-6">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-[#247545]" />
                  <p className="text-xs font-bold text-[#132218]">All tables and tickets are settled!</p>
                  <p className="text-[11px] text-[#4F6155]">
                    Switch to &quot;Walk-in Counter Sale&quot; above to punch in a new walk-in guest.
                  </p>
                  <button
                    onClick={() => setActiveMode('COUNTER_SALE')}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#DE5124] text-white text-xs font-bold hover:bg-[#BF3F16] cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Open Counter Register</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {openRestaurantOrders.map(ord => {
                    const isSelected = ord.id === selectedOrderId;
                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrderId(ord.id);
                          setCashTenderedInput('');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#FFF6F3] border-[#DE5124] shadow-xs ring-2 ring-[#DE5124]/20'
                            : 'bg-white border-[#D9E2D9] hover:border-[#132218]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7B8E81] block">
                              {ord.serviceType === 'DINE_IN' ? `Table ${ord.tableNumber || '-'}` : 'Takeaway'}
                            </span>
                            <h4 className="font-black text-sm text-[#132218]">
                              #{ord.orderNumber}
                            </h4>
                            <p className="text-xs text-[#4F6155] font-medium mt-0.5">
                              {ord.customerName}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-base font-black text-[#132218] block">
                              ${ord.totalAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#7B8E81]">
                              {ord.items.length} items
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#EDF1EC] flex items-center justify-between text-[11px] text-[#7B8E81]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#7B8E81]" />
                            {new Date(ord.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-bold text-[#DE5124]">
                            {isSelected ? '✓ Selected to Settle' : 'Tap to Settle'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Walk-in Counter Sale Dish Picker */
            <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] space-y-4 shadow-xs">
              {/* Service & Guest Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9]">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D9E2D9]">
                  <button
                    onClick={() => setServiceType('TAKEAWAY')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      serviceType === 'TAKEAWAY'
                        ? 'bg-[#132218] text-white'
                        : 'text-[#4F6155]'
                    }`}
                  >
                    Takeaway / Counter
                  </button>
                  <button
                    onClick={() => setServiceType('DINE_IN')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      serviceType === 'DINE_IN'
                        ? 'bg-[#132218] text-white'
                        : 'text-[#4F6155]'
                    }`}
                  >
                    Dine-In Table
                  </button>
                </div>

                {serviceType === 'DINE_IN' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#4F6155]">Table #:</span>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      className="w-20 px-2 py-1 text-xs bg-white border border-[#D9E2D9] rounded-xl text-center font-bold"
                      placeholder="e.g. 4"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customerLabel}
                    onChange={e => setCustomerLabel(e.target.value)}
                    placeholder="Guest Name or Pickup # (optional)"
                    className="w-full sm:w-56 px-3 py-1 text-xs bg-white border border-[#D9E2D9] rounded-xl"
                  />
                )}
              </div>

              {/* Dish Search & Category Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B8E81]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Quick search dishes to add..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === 'ALL'
                        ? 'bg-[#132218] text-white'
                        : 'bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9]'
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
                          ? 'bg-[#132218] text-white'
                          : 'bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9]'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fast Dish Catalog Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredMenuItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleAddItemToCounterTicket(item)}
                    className="p-3 rounded-2xl bg-white border border-[#D9E2D9] hover:border-[#DE5124] hover:shadow-xs flex flex-col justify-between transition-all cursor-pointer group select-none active:scale-97"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-[#DE5124]">
                          ${item.basePrice.toFixed(2)}
                        </span>
                        <span className="w-5 h-5 rounded-md bg-[#F5F7F4] group-hover:bg-[#DE5124] group-hover:text-white text-[#132218] flex items-center justify-center text-xs font-bold transition-colors">
                          +
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#132218] line-clamp-2 leading-tight group-hover:text-[#DE5124] transition-colors">
                        {item.name}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Order Breakdown Preview */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#4F6155]">
                {activeMode === 'SETTLE_TABLE' 
                  ? (activeExistingOrder ? `Table Items (${activeExistingOrder.serviceType === 'DINE_IN' ? `Table ${activeExistingOrder.tableNumber}` : 'Takeaway'})` : 'No Table Selected')
                  : `Counter Ticket Items (${currentItemsCount})`}
              </span>
              {activeMode === 'COUNTER_SALE' && ticketItems.length > 0 && (
                <button
                  onClick={handleClearTicket}
                  className="text-xs text-[#BA2D2D] hover:underline font-bold cursor-pointer"
                >
                  Clear Ticket
                </button>
              )}
            </div>

            <div className="divide-y divide-[#EDF1EC] max-h-48 overflow-y-auto pr-1">
              {currentDisplayItems.length === 0 ? (
                <div className="py-6 text-center text-[#7B8E81] text-xs">
                  Ticket is currently empty. Tap items from above to populate the bill.
                </div>
              ) : (
                currentDisplayItems.map((item, idx) => (
                  <div key={item.id} className="py-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[#132218] block truncate">
                        {item.itemName}
                      </span>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <span className="text-[10px] text-[#7B8E81] block truncate">
                          {item.selectedAddons.map(a => a.optionName).join(', ')}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#7B8E81]">
                        ${item.unitPrice.toFixed(2)} ea
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeMode === 'COUNTER_SALE' ? (
                        <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-lg border border-[#D9E2D9]">
                          <button
                            onClick={() => handleUpdateTicketQty(idx, -1)}
                            className="w-5 h-5 rounded bg-white text-[#132218] flex items-center justify-center text-xs hover:bg-[#EAEFEA] cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-xs text-[#132218]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateTicketQty(idx, 1)}
                            className="w-5 h-5 rounded bg-white text-[#132218] flex items-center justify-center text-xs hover:bg-[#EAEFEA] cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#F5F7F4] font-mono font-bold text-xs text-[#132218]">
                          x{item.quantity}
                        </span>
                      )}

                      <span className="w-16 text-right font-mono font-black text-xs text-[#132218]">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (CASH REGISTER & CHANGE CALCULATOR): 5 cols */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-white rounded-3xl border-2 border-[#132218] shadow-lg overflow-hidden">
            {/* Cashier Register Top Display */}
            <div className="p-4 bg-[#132218] text-white space-y-1">
              <div className="flex items-center justify-between text-xs text-[#A2B6A6]">
                <span className="uppercase font-extrabold tracking-wider">Total Amount Due</span>
                <span className="font-mono">{restaurant.currency || 'BND'}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-[#FFF6F3] tracking-tight">
                  ${grandTotalDue.toFixed(2)}
                </span>
                <span className="text-xs text-[#A2B6A6]">
                  {currentItemsCount} items
                </span>
              </div>
            </div>

            {/* Bill Adjustments: Discount & Tax Bar */}
            <div className="p-4 bg-[#FAFBF9] border-b border-[#D9E2D9] space-y-3">
              {/* Discount Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#4F6155]">
                  <span className="font-bold flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-[#DE5124]" />
                    <span>Bill Discount:</span>
                  </span>
                  {currentDiscount > 0 && (
                    <span className="font-mono font-bold text-[#247545]">
                      -${currentDiscount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { label: '0%', val: 0 },
                    { label: '5%', val: 5 },
                    { label: '10%', val: 10 },
                    { label: '15%', val: 15 },
                  ].map(d => (
                    <button
                      key={d.val}
                      onClick={() => {
                        setDiscountPercent(d.val);
                        setCustomDiscountBnd('');
                      }}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        discountPercent === d.val && !customDiscountBnd
                          ? 'bg-[#132218] text-white'
                          : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax / Service Charge Selector (Flexible: 0%, 5%, 8.5%, 10% or Custom) */}
              <div className="space-y-1.5 pt-2 border-t border-[#EDF1EC]">
                <div className="flex items-center justify-between text-xs text-[#4F6155]">
                  <span className="font-bold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#247545]" />
                    <span>Tax / Service Rate:</span>
                  </span>
                  <span className="font-mono font-bold text-[#132218]">
                    {currentTax > 0 ? `+$${currentTax.toFixed(2)} (${activeTaxLabel})` : '$0.00 (0% Tax)'}
                  </span>
                </div>

                {/* Preset Tax Buttons */}
                <div className="flex items-center gap-1.5">
                  {[
                    { label: '0% (None)', val: 0 },
                    { label: '5%', val: 5 },
                    { label: '8.5%', val: 8.5 },
                    { label: '10% Svc', val: 10 },
                  ].map(t => (
                    <button
                      key={t.val}
                      onClick={() => {
                        setTaxRatePercent(t.val);
                        setCustomTaxInput('');
                        setShowTaxConfig(false);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        taxRatePercent === t.val && customTaxInput === ''
                          ? 'bg-[#247545] text-white shadow-2xs'
                          : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowTaxConfig(!showTaxConfig)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      customTaxInput !== '' || showTaxConfig
                        ? 'bg-[#132218] text-white border-[#132218]'
                        : 'bg-white border-[#D9E2D9] text-[#4F6155]'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Optional Custom Tax / Svc Charge input */}
                {showTaxConfig && (
                  <div className="p-2.5 bg-white border border-[#D9E2D9] rounded-xl flex items-center gap-2 text-xs animate-fadeIn">
                    <select
                      value={customTaxMode}
                      onChange={e => setCustomTaxMode(e.target.value as any)}
                      className="px-2 py-1 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg font-bold text-xs"
                    >
                      <option value="PERCENT">Custom %</option>
                      <option value="FLAT_BND">Custom $</option>
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customTaxInput}
                      onChange={e => setCustomTaxInput(e.target.value)}
                      placeholder={customTaxMode === 'PERCENT' ? 'e.g. 6 (for 6%)' : 'e.g. 2.00'}
                      className="w-full px-2 py-1 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg font-mono font-bold text-xs"
                    />
                    {customTaxInput && (
                      <button
                        onClick={() => setCustomTaxInput('')}
                        className="text-xs text-[#7B8E81] hover:text-[#132218] cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 space-y-1.5 text-xs text-[#4F6155] border-b border-[#D9E2D9]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-[#132218]">${currentSubtotal.toFixed(2)}</span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between text-[#247545]">
                  <span>Applied Discount</span>
                  <span className="font-mono font-bold">-${currentDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax / Service ({activeTaxLabel})</span>
                <span className="font-mono font-bold text-[#132218]">${currentTax.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#EDF1EC] flex justify-between font-black text-sm text-[#132218]">
                <span>Net Total to Collect</span>
                <span className="font-mono text-base text-[#DE5124]">${grandTotalDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Multi-Channel Payment Method Selector */}
            <div className="p-4 bg-[#FAFBF9] border-b border-[#D9E2D9] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#7B8E81] block">
                  Select Payment Channel
                </span>
                <span className="text-[11px] font-bold text-[#DE5124]">
                  {effectiveChannelDisplayName}
                </span>
              </div>

              {/* Grid of Brunei & Modern Payment Channels */}
              <div className="grid grid-cols-4 gap-1.5">
                {/* 1. Cash */}
                <button
                  onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'bg-[#DE5124] text-white shadow-xs'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span className="text-[11px]">Cash</span>
                </button>

                {/* 2. BIBD QuickPay */}
                <button
                  onClick={() => setPaymentMethod('BANK_TRANSFER_BIBD')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'BANK_TRANSFER_BIBD'
                      ? 'bg-[#132218] text-white shadow-xs'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px]">BIBD QPay</span>
                </button>

                {/* 3. Tarus e-Wallet */}
                <button
                  onClick={() => setPaymentMethod('TARUS')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'TARUS'
                      ? 'bg-[#132218] text-white shadow-xs ring-2 ring-purple-400'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span className="text-[11px]">Tarus</span>
                </button>

                {/* 4. Pocket Brunei */}
                <button
                  onClick={() => setPaymentMethod('POCKET')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'POCKET'
                      ? 'bg-[#132218] text-white shadow-xs ring-2 ring-blue-400'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-sky-500" />
                  <span className="text-[11px]">Pocket</span>
                </button>

                {/* 5. Direct Bank Transfer */}
                <button
                  onClick={() => setPaymentMethod('DIRECT_BANK_TRANSFER')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'DIRECT_BANK_TRANSFER'
                      ? 'bg-[#132218] text-white shadow-xs'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <Building className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px]">Bank Trans</span>
                </button>

                {/* 6. Card POS */}
                <button
                  onClick={() => setPaymentMethod('STRIPE_CARD')}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer text-center ${
                    paymentMethod === 'STRIPE_CARD'
                      ? 'bg-[#132218] text-white shadow-xs'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px]">Card POS</span>
                </button>

                {/* 7. Other / Custom (Extensible for any future channel) */}
                <button
                  onClick={() => setPaymentMethod('OTHER_CUSTOM')}
                  className={`col-span-2 py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'OTHER_CUSTOM'
                      ? 'bg-[#247545] text-white shadow-xs'
                      : 'bg-white border border-[#D9E2D9] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Other / Custom</span>
                </button>
              </div>

              {/* Custom Channel Name Input (if OTHER_CUSTOM) */}
              {paymentMethod === 'OTHER_CUSTOM' && (
                <div className="space-y-1 pt-1 animate-fadeIn">
                  <label className="text-[10px] font-bold text-[#4F6155] uppercase">
                    Custom Payment Method Name:
                  </label>
                  <input
                    type="text"
                    value={customPaymentName}
                    onChange={e => setCustomPaymentName(e.target.value)}
                    placeholder="e.g. Corporate Tab, Loyalty Points, Brunei e-Tunai, Voucher"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9E2D9] rounded-xl focus:border-[#247545] focus:outline-none font-bold"
                  />
                </div>
              )}

              {/* Reference Number / Approval Code (for non-cash or e-wallet channels) */}
              {paymentMethod !== 'CASH_ON_DELIVERY' && (
                <div className="space-y-1 pt-1 animate-fadeIn">
                  <label className="text-[10px] font-bold text-[#4F6155] uppercase">
                    Transaction / Approval Reference # (Optional):
                  </label>
                  <input
                    type="text"
                    value={paymentReferenceNumber}
                    onChange={e => setPaymentReferenceNumber(e.target.value)}
                    placeholder="e.g. Tarus Ref #84920, Bank Slip #, or App Receipt ID"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D9E2D9] rounded-xl focus:border-[#DE5124] focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>

            {/* CASH TENDERED & CHANGE RETURN CALCULATOR (Hero Section) */}
            <div className="p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#132218] flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#247545]" />
                  <span>
                    {paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'Cash Handed by Customer'
                      : 'Amount Paid by Guest'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTouchNumpad(!showTouchNumpad)}
                    className="text-[11px] font-bold text-[#4F6155] hover:text-[#132218] flex items-center gap-1 cursor-pointer bg-[#F5F7F4] px-2 py-0.5 rounded-lg border border-[#D9E2D9]"
                  >
                    <span>{showTouchNumpad ? 'Hide Keypad' : 'Touch Keypad'}</span>
                  </button>
                  <button
                    onClick={handleSetExactCash}
                    className="text-[11px] font-bold text-[#DE5124] hover:underline cursor-pointer"
                  >
                    Exact: ${grandTotalDue.toFixed(2)}
                  </button>
                </div>
              </div>

              {/* Direct Amount Input Box */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-lg text-[#7B8E81]">
                  $
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={cashTenderedInput}
                  onChange={e => setCashTenderedInput(e.target.value)}
                  placeholder={grandTotalDue > 0 ? grandTotalDue.toFixed(2) : '0.00'}
                  className="w-full pl-8 pr-12 py-3 text-xl font-mono font-black text-[#132218] bg-[#F5F7F4] border-2 border-[#D9E2D9] rounded-2xl focus:bg-white focus:border-[#DE5124] focus:outline-none text-right"
                />
                {cashTenderedInput && (
                  <button
                    onClick={() => setCashTenderedInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7B8E81] hover:text-[#132218] cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Interactive On-Screen Touch Numpad (for touch monitors / tablets) */}
              {showTouchNumpad && (
                <div className="p-2.5 bg-[#FAFBF9] border border-[#D9E2D9] rounded-2xl space-y-1.5 animate-fadeIn">
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-sm font-bold">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleTouchNumpadPress(k)}
                        className="py-2.5 bg-white hover:bg-[#EDF1EC] active:scale-95 rounded-xl border border-[#D9E2D9] text-[#132218] transition-all cursor-pointer shadow-2xs"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTouchNumpadPress('BACKSPACE')}
                      className="py-2 bg-[#FDEEE9] hover:bg-[#FAD8CF] text-[#DE5124] rounded-xl border border-[#F9D0C4] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>⌫ Backspace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTouchNumpadPress('CLEAR')}
                      className="py-2 bg-white hover:bg-[#F5F7F4] text-[#4F6155] rounded-xl border border-[#D9E2D9] text-xs font-bold transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Brunei Cash Quick Bills Shortcuts */}
              {paymentMethod === 'CASH_ON_DELIVERY' && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#7B8E81] block">
                    Brunei Cash Denominations:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={handleSetExactCash}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                    >
                      Exact
                    </button>
                    <button
                      onClick={handleRoundToNearestFiveOrTen}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                      title="Next rounded $5 or $10"
                    >
                      Round 5
                    </button>
                    <button
                      onClick={() => handleSetBillAbsolute(10)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                    >
                      $10
                    </button>
                    <button
                      onClick={() => handleSetBillAbsolute(20)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                    >
                      $20
                    </button>
                    <button
                      onClick={() => handleSetBillAbsolute(50)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                    >
                      $50
                    </button>
                    <button
                      onClick={() => handleSetBillAbsolute(100)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218] cursor-pointer"
                    >
                      $100
                    </button>
                    <button
                      onClick={() => handleAddBill(5)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#DE5124] cursor-pointer"
                    >
                      +$5
                    </button>
                    <button
                      onClick={() => handleAddBill(10)}
                      className="py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] text-xs font-mono font-bold text-[#DE5124] cursor-pointer"
                    >
                      +$10
                    </button>
                  </div>
                </div>
              )}

              {/* THE RESULT: DYNAMIC CHANGE DISPLAY (FOR CASH) */}
              {paymentMethod === 'CASH_ON_DELIVERY' ? (
                isCashSufficient ? (
                  <div className="p-3.5 rounded-2xl bg-[#E0F2E6] border-2 border-[#247545] space-y-1 animate-fadeIn">
                    <div className="flex items-center justify-between text-[#247545]">
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-[#247545]" />
                        <span>Change to Return</span>
                      </span>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-[#C2E4CD]">
                        {changeToReturn === 0 ? 'Exact Amount' : 'Dispense to Diner'}
                      </span>
                    </div>

                    <div className="text-2xl font-black font-mono text-[#185331]">
                      ${changeToReturn.toFixed(2)}
                    </div>

                    {denominationBreakdown && (
                      <p className="text-[11px] text-[#185331] font-semibold pt-1 border-t border-[#C2E4CD]/60">
                        Dispense breakdown: <span className="font-bold">{denominationBreakdown}</span>
                      </p>
                    )}
                  </div>
                ) : cashGivenNumeric > 0 ? (
                  <div className="p-3 rounded-2xl bg-[#FFF4ED] border border-[#F9D0C4] text-[#DE5124] space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Insufficient cash entered</span>
                    </div>
                    <p className="text-xs font-mono font-extrabold pl-5">
                      Short by: ${cashShortage.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#F5F7F4] text-[#7B8E81] text-[11px] text-center">
                    Enter customer cash tendered or tap a denomination above to calculate change.
                  </div>
                )
              ) : (
                /* Non-cash confirmation box */
                <div className="p-3.5 rounded-2xl bg-[#F5F7F4] border border-[#D9E2D9] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#132218]">
                    <span>Tender via {effectiveChannelDisplayName}</span>
                    <span className="font-mono text-[#247545]">${grandTotalDue.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-[#4F6155]">
                    Confirm receipt of {effectiveChannelDisplayName} from customer before completing sale.
                  </p>
                </div>
              )}
            </div>

            {/* ACTION BUTTON: COMPLETE PAYMENT */}
            <div className="p-4 bg-[#FAFBF9] border-t border-[#D9E2D9] space-y-2">
              <button
                onClick={handleProcessCheckout}
                disabled={
                  grandTotalDue <= 0 ||
                  (paymentMethod === 'CASH_ON_DELIVERY' && !isCashSufficient)
                }
                className="w-full py-3.5 rounded-2xl bg-[#DE5124] hover:bg-[#BF3F16] disabled:bg-[#D9E2D9] disabled:text-[#7B8E81] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {paymentMethod === 'CASH_ON_DELIVERY'
                    ? isCashSufficient
                      ? `Complete Cash Sale (Return $${changeToReturn.toFixed(2)})`
                      : 'Awaiting Sufficient Cash'
                    : `Confirm Paid via ${effectiveChannelDisplayName} ($${grandTotalDue.toFixed(2)})`}
                </span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-[#7B8E81] pt-1">
                <span>Fast Register • 0 Backend Data Used</span>
                <span>Auto Thermal Receipt Slip</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETED TRANSACTION THERMAL RECEIPT MODAL */}
      {completedOrderForReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#D9E2D9] animate-fadeIn">
            {/* Thermal Slip Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-[#132218] space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#E0F2E6] text-[#247545] flex items-center justify-center mx-auto mb-1">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <h3 className="font-black text-base text-[#132218] font-display">
                {restaurant.name}
              </h3>
              <p className="text-[10px] text-[#4F6155]">
                {restaurant.address.street}, {restaurant.address.city}
              </p>
              <p className="text-[10px] text-[#7B8E81]">
                ROCBN: {restaurant.rocbnNumber || 'RC/2024/FOODFINDR'} • Tel: {restaurant.phone}
              </p>
              <div className="pt-1 text-[11px] font-mono text-[#132218] font-bold">
                {completedOrderForReceipt.serviceType === 'DINE_IN'
                  ? `Table ${completedOrderForReceipt.tableNumber || '-'}`
                  : 'Counter Takeaway'}{' '}
                • #{completedOrderForReceipt.orderNumber}
              </div>
              <p className="text-[10px] text-[#7B8E81]">
                Cashier: {completedOrderForReceipt.settledBy || cashierName} •{' '}
                {new Date(completedOrderForReceipt.settledAt || completedOrderForReceipt.placedAt).toLocaleString()}
              </p>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs divide-y divide-[#F5F7F4] font-mono">
              {completedOrderForReceipt.items.map(item => (
                <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                  <div className="flex-1 truncate pr-2">
                    <span>{item.quantity}x {item.itemName}</span>
                  </div>
                  <span className="font-bold shrink-0">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals & Payment Method Breakdown */}
            <div className="pt-3 border-t-2 border-dashed border-[#132218] space-y-1 text-xs font-mono">
              <div className="flex justify-between text-[#4F6155]">
                <span>Subtotal</span>
                <span>${completedOrderForReceipt.subtotal.toFixed(2)}</span>
              </div>
              {completedOrderForReceipt.discountAmount && completedOrderForReceipt.discountAmount > 0 ? (
                <div className="flex justify-between text-[#247545]">
                  <span>Discount</span>
                  <span>-${completedOrderForReceipt.discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[#4F6155]">
                <span>Tax / Service</span>
                <span>${(completedOrderForReceipt.tax || 0).toFixed(2)}</span>
              </div>
              <div className="pt-1.5 border-t border-[#132218] flex justify-between font-black text-sm text-[#132218]">
                <span>TOTAL PAID</span>
                <span>${completedOrderForReceipt.totalAmount.toFixed(2)}</span>
              </div>

              {/* Payment Channel Indicator */}
              <div className="pt-2 mt-1 border-t border-dashed border-[#D9E2D9] space-y-0.5 bg-[#F5F7F4] p-2 rounded-xl text-[11px]">
                <div className="flex justify-between text-[#132218] font-bold">
                  <span>Payment Method:</span>
                  <span className="text-[#DE5124] uppercase">
                    {completedOrderForReceipt.customPaymentChannelName || 
                     (completedOrderForReceipt.paymentMethod === 'CASH_ON_DELIVERY' ? 'PHYSICAL CASH' : 
                      completedOrderForReceipt.paymentMethod === 'BANK_TRANSFER_BIBD' ? 'BIBD QUICKPAY' : 
                      completedOrderForReceipt.paymentMethod === 'DIRECT_BANK_TRANSFER' ? 'DIRECT BANK TRANSFER' : 
                      completedOrderForReceipt.paymentMethod === 'TARUS' ? 'TARUS E-WALLET' : 
                      completedOrderForReceipt.paymentMethod === 'POCKET' ? 'POCKET BRUNEI' : 
                      completedOrderForReceipt.paymentMethod === 'STRIPE_CARD' ? 'CARD POS' : 
                      completedOrderForReceipt.paymentMethod)}
                  </span>
                </div>
                {completedOrderForReceipt.paymentReference && (
                  <div className="flex justify-between text-[#4F6155] text-[10px]">
                    <span>Reference / Code:</span>
                    <span>{completedOrderForReceipt.paymentReference}</span>
                  </div>
                )}
                {completedOrderForReceipt.paymentMethod === 'CASH_ON_DELIVERY' && (
                  <>
                    <div className="flex justify-between text-[#132218] font-bold">
                      <span>Cash Tendered:</span>
                      <span>${(completedOrderForReceipt.cashTendered || completedOrderForReceipt.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#247545] font-black">
                      <span>Change Returned:</span>
                      <span>${(completedOrderForReceipt.changeReturned || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center text-[10px] text-[#7B8E81] pt-1 border-t border-dashed border-[#D9E2D9]">
              Terima Kasih! Thank you for dining with us!
            </div>

            {/* Print & Next Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-[#132218] text-white text-xs font-bold hover:bg-[#DE5124] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Slip</span>
              </button>

              <button
                onClick={handleResetForNewSale}
                className="px-4 py-2.5 rounded-xl bg-[#247545] hover:bg-[#1B5733] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
