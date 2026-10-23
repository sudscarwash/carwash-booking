import React, { useState } from 'react';
import { Order, OrderStatus, OrderItem, MenuItem } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Clock, 
  CheckCircle2, 
  Flame, 
  PackageCheck, 
  Bike, 
  Check, 
  MapPin, 
  Phone, 
  Store, 
  AlertCircle, 
  X,
  Navigation,
  Sparkles,
  Crosshair,
  Radio,
  Lock,
  HelpCircle,
  Plus,
  Minus,
  Bell,
  Utensils,
  Receipt,
  Droplets,
  ArrowRight,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  MessageCircle,
  Ban,
  UserCheck,
  Key,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';

interface OrderTrackerProps {
  order: Order;
  onBackToExplore?: () => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  order,
  onBackToExplore,
}) => {
  const { 
    orders, 
    cancelOrder, 
    requestOrderCancellation, 
    cancelOrderEnRouteWithProtection, 
    appendItemsToExistingOrder, 
    callStaffForAssistance, 
    requestOnDemandLocationPing 
  } = useOrders();
  const { getRestaurantById, getMenuItemsByRestaurant } = useRestaurants();

  // Reactive order state synchronized with context updates
  const liveOrder = orders.find(o => o.id === order.id) || order;

  const restaurant = getRestaurantById(liveOrder.restaurantId);
  const restaurantMenuItems = getMenuItemsByRestaurant(liveOrder.restaurantId);

  // Modal & Interactive states
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [extraItemsQuantities, setExtraItemsQuantities] = useState<Record<string, number>>({});
  const [extraNotes, setExtraNotes] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isPingingLocation, setIsPingingLocation] = useState(false);
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  const handleTriggerLocationPing = () => {
    setIsPingingLocation(true);
    requestOnDemandLocationPing(liveOrder.id, 'Customer');
    setTimeout(() => {
      setIsPingingLocation(false);
      setPingMessage('Fresh courier coordinate pulse received (32 bytes). GPS active.');
      setTimeout(() => setPingMessage(null), 4000);
    }, 700);
  };

  const { currentUser, openAuthModal } = useAuth();

  // Cancel Order Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLockedCancelModal, setShowLockedCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('Placed by mistake');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [guestPhoneAuthInput, setGuestPhoneAuthInput] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [kitchenReviewReason, setKitchenReviewReason] = useState('Change of plan, please cancel if not yet cooking');
  const [isSubmittingEnRouteCancel, setIsSubmittingEnRouteCancel] = useState(false);

  const handleSendKitchenReviewRequest = async () => {
    setIsSubmittingReview(true);
    await requestOrderCancellation(
      liveOrder.id, 
      kitchenReviewReason, 
      currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : (liveOrder.customerName || 'Customer')
    );
    setIsSubmittingReview(false);
    setShowLockedCancelModal(false);
    setFeedbackToast('Cancellation request sent to kitchen! A chef will review in KDS.');
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const handleConfirmEnRouteEmergencyCancel = () => {
    setIsSubmittingEnRouteCancel(true);
    setTimeout(() => {
      cancelOrderEnRouteWithProtection(liveOrder.id, 'Customer Emergency Cancellation En Route');
      setIsSubmittingEnRouteCancel(false);
      setShowLockedCancelModal(false);
      setFeedbackToast(`Order cancelled in transit. Courier compensation protected; remaining refunded.`);
      setTimeout(() => setFeedbackToast(null), 5000);
    }, 400);
  };

  // Authentication & Authorization checks
  const isOrderCustomer = Boolean(
    currentUser && (
      currentUser.id === liveOrder.customerId ||
      currentUser.email?.toLowerCase() === liveOrder.customerEmail?.toLowerCase() ||
      (currentUser.phone && liveOrder.customerPhone && currentUser.phone.replace(/\D/g, '') === liveOrder.customerPhone.replace(/\D/g, ''))
    )
  );

  const isStaffOrAdmin = Boolean(
    currentUser && (
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'SPECIAL_USER' ||
      currentUser.restaurantId === liveOrder.restaurantId ||
      currentUser.role === 'RESTAURANT_OWNER' ||
      currentUser.role === 'EMPLOYEE'
    )
  );

  const isGuestPhoneVerified = Boolean(
    guestPhoneAuthInput.trim().length >= 4 &&
    (liveOrder.customerPhone?.replace(/\D/g, '').includes(guestPhoneAuthInput.trim().replace(/\D/g, '')) || 
     liveOrder.customerEmail?.toLowerCase() === guestPhoneAuthInput.trim().toLowerCase())
  );

  const isAuthorized = isOrderCustomer || isStaffOrAdmin || isGuestPhoneVerified;

  const handleCancelButtonClick = () => {
    if (liveOrder.status === 'PENDING') {
      setAuthErrorMsg(null);
      setShowCancelModal(true);
    } else {
      setShowLockedCancelModal(true);
    }
  };

  const handleConfirmCancel = () => {
    setAuthErrorMsg(null);

    // Authentication enforcement
    if (!isAuthorized) {
      setAuthErrorMsg('Please verify your phone number or email used when placing this order, or sign in to your account.');
      return;
    }

    if (liveOrder.status !== 'PENDING') {
      setShowCancelModal(false);
      setShowLockedCancelModal(true);
      return;
    }

    const finalReason = selectedCancelReason === 'Other / Custom Reason'
      ? (customCancelReason.trim() || 'Customer requested cancellation')
      : (customCancelReason.trim() ? `${selectedCancelReason}: ${customCancelReason.trim()}` : selectedCancelReason);

    setIsSubmittingCancel(true);
    setTimeout(() => {
      const ok = cancelOrder(liveOrder.id, finalReason, true);
      setIsSubmittingCancel(false);
      setShowCancelModal(false);
      if (ok) {
        setFeedbackToast(`Order #${liveOrder.orderNumber} successfully cancelled. Full refund confirmed.`);
        setTimeout(() => setFeedbackToast(null), 5000);
      }
    }, 350);
  };

  // Dynamic steps based on service type
  const isDineIn = liveOrder.serviceType === 'DINE_IN';
  const isTakeaway = liveOrder.serviceType === 'TAKEAWAY';
  const isDelivery = liveOrder.serviceType === 'DELIVERY' || !liveOrder.serviceType;

  const steps = isDineIn ? [
    { status: 'PENDING' as OrderStatus, label: 'Order Sent', icon: <Clock className="w-4 h-4" />, desc: 'Sent to kitchen queue' },
    { status: 'PREPARING' as OrderStatus, label: 'Kitchen Cooking', icon: <Flame className="w-4 h-4" />, desc: 'Chefs preparing dishes fresh' },
    { status: 'READY_FOR_PICKUP' as OrderStatus, label: 'Plated & Ready', icon: <Utensils className="w-4 h-4" />, desc: 'Plated and ready to serve' },
    { status: 'DELIVERED' as OrderStatus, label: 'Served to Table', icon: <Check className="w-4 h-4" />, desc: `Delivered to ${liveOrder.tableNumber || 'Table'}` },
  ] : isTakeaway ? [
    { status: 'PENDING' as OrderStatus, label: 'Order Sent', icon: <Clock className="w-4 h-4" />, desc: 'Kitchen received order' },
    { status: 'PREPARING' as OrderStatus, label: 'Kitchen Cooking', icon: <Flame className="w-4 h-4" />, desc: 'Preparing fresh for pickup' },
    { status: 'READY_FOR_PICKUP' as OrderStatus, label: 'Ready for Pickup', icon: <PackageCheck className="w-4 h-4" />, desc: 'Packaged & hot at counter' },
    { status: 'DELIVERED' as OrderStatus, label: 'Collected', icon: <Check className="w-4 h-4" />, desc: 'Collected by customer' },
  ] : [
    { status: 'PENDING' as OrderStatus, label: 'Order Sent', icon: <Clock className="w-4 h-4" />, desc: 'Waiting for kitchen confirmation' },
    { status: 'PREPARING' as OrderStatus, label: 'Kitchen Cooking', icon: <Flame className="w-4 h-4" />, desc: 'Dishes being fired up fresh' },
    { status: 'READY_FOR_PICKUP' as OrderStatus, label: 'Ready for Pickup', icon: <PackageCheck className="w-4 h-4" />, desc: 'Packaged & hot at counter' },
    { status: 'OUT_FOR_DELIVERY' as OrderStatus, label: 'On The Way', icon: <Bike className="w-4 h-4" />, desc: 'Runner en route to your address' },
    { status: 'DELIVERED' as OrderStatus, label: 'Delivered', icon: <Check className="w-4 h-4" />, desc: 'Enjoy your meal!' },
  ];

  const statusOrder: Record<OrderStatus, number> = isDineIn || isTakeaway ? {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 1,
    READY_FOR_PICKUP: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: 3,
    CANCELLED: -1,
    REJECTED: -1,
  } : {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 1,
    READY_FOR_PICKUP: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
    CANCELLED: -1,
    REJECTED: -1,
  };

  const currentStepIndex = statusOrder[liveOrder.status] ?? 0;
  const isCancelled = liveOrder.status === 'CANCELLED' || liveOrder.status === 'REJECTED';

  const handleTriggerStaffCall = (type: 'CALL_WAITER' | 'REQUEST_BILL' | 'EXTRA_CUTLERY_WATER') => {
    callStaffForAssistance(order.id, type);
    setShowCallStaffModal(false);
    const msgs = {
      CALL_WAITER: `Floor server notified! A waiter is walking over to ${order.tableNumber || 'your table'}.`,
      EXTRA_CUTLERY_WATER: `Water & cutlery request dispatched to kitchen & floor staff.`,
      REQUEST_BILL: `Bill request received! Floor staff are printing your final check.`
    };
    setFeedbackToast(msgs[type]);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleConfirmAddItems = () => {
    const itemsToAdd: OrderItem[] = [];
    Object.entries(extraItemsQuantities).forEach(([itemId, rawQty]) => {
      const qty = Number(rawQty) || 0;
      if (qty > 0) {
        const menuItem = restaurantMenuItems.find(m => m.id === itemId);
        if (menuItem) {
          itemsToAdd.push({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            itemId: menuItem.id,
            itemName: menuItem.name,
            basePrice: menuItem.basePrice,
            unitPrice: menuItem.basePrice,
            quantity: qty,
            selectedAddons: [],
            totalPrice: menuItem.basePrice * qty,
          });
        }
      }
    });

    if (itemsToAdd.length === 0) {
      alert('Please select at least 1 item to add.');
      return;
    }

    appendItemsToExistingOrder(order.id, itemsToAdd, extraNotes);
    setShowAddItemsModal(false);
    setExtraItemsQuantities({});
    setExtraNotes('');
    setFeedbackToast(`✅ Successfully added ${itemsToAdd.reduce((s, i) => s + i.quantity, 0)} new item(s) to ${order.orderNumber}! Kitchen has been notified.`);
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Dynamic Feedback Toast */}
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-[#16241B] text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-[#2F7A4F] flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F7A4F] animate-ping" />
            <span className="text-xs font-bold">{feedbackToast}</span>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDF1EC] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-[#7A8E80]">Order Number:</span>
              <span className="text-base font-extrabold text-[#132218] font-mono">{liveOrder.orderNumber}</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                isDineIn 
                  ? 'bg-emerald-50 text-[#247545] border-emerald-200' 
                  : isTakeaway 
                  ? 'bg-sky-50 text-[#2C6E8E] border-sky-200' 
                  : 'bg-orange-50 text-[#DE5124] border-orange-200'
              }`}>
                {isDineIn ? `🍽️ ${liveOrder.tableNumber || 'Table'}` : isTakeaway ? '🥡 Takeaway Pickup' : '🛵 Doorstep Delivery'}
              </span>
            </div>
            <p className="text-xs text-[#4F6155] mt-0.5">
              Placed {new Date(liveOrder.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {liveOrder.items.length} items total
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={liveOrder.status} size="md" />

            {liveOrder.status === 'PENDING' ? (
              <button
                type="button"
                onClick={handleCancelButtonClick}
                className="text-xs font-bold text-[#BA2D2D] hover:bg-[#FDE8E8] px-3.5 py-1.5 rounded-xl border border-[#F8C1C1] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
                title="Cancel order while still in pending status for 100% full refund."
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Order</span>
              </button>
            ) : !isCancelled && liveOrder.status !== 'DELIVERED' ? (
              <button 
                type="button"
                onClick={handleCancelButtonClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-[11px] text-stone-600 font-semibold cursor-pointer transition-colors"
                title="View cancellation policy & emergency support options for orders in progress"
              >
                <Lock className="w-3 h-3 text-stone-400" />
                <span>
                  {liveOrder.status === 'PREPARING' ? 'Kitchen Cooking' :
                   liveOrder.status === 'READY_FOR_PICKUP' ? 'Packaged & Ready' :
                   liveOrder.status === 'OUT_FOR_DELIVERY' ? 'On The Way' : 'In Progress'}
                </span>
                <span className="text-[10px] text-stone-400 underline ml-0.5">Need to cancel?</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Estimated Fulfillment Banner */}
        {!isCancelled && liveOrder.status !== 'DELIVERED' && (
          <div className="bg-gradient-to-r from-[#FDEEE9] to-[#FFF9F7] rounded-2xl p-4 border border-[#F9D0C4] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DE5124] text-white flex items-center justify-center shadow-xs">
                {isDineIn ? <Utensils className="w-5 h-5" /> : isTakeaway ? <PackageCheck className="w-5 h-5" /> : <Bike className="w-5 h-5 animate-pulse" />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#DE5124] uppercase tracking-wider">
                  {isDineIn ? 'Table Service Timing' : isTakeaway ? 'Counter Pickup Time' : 'Estimated Delivery'}
                </p>
                <p className="text-lg font-extrabold text-[#132218] font-display">
                  {isDineIn 
                    ? 'Cooking fresh (~15-20 mins)' 
                    : isTakeaway 
                    ? (liveOrder.pickupTime || 'Ready in ~20 mins') 
                    : (liveOrder.estimatedDeliveryAt
                      ? new Date(liveOrder.estimatedDeliveryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '25 - 35 mins')}
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white text-[#247545] font-bold border border-[#C2E4CD] shadow-2xs">
                {liveOrder.status === 'PREPARING' ? 'Chefs Firing' : 'On Schedule'}
              </span>
            </div>
          </div>
        )}

        {/* Active Cancellation Review Notice */}
        {liveOrder.cancellationRequested && liveOrder.cancellationRequestStatus === 'PENDING_REVIEW' && !isCancelled && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-300 text-xs text-amber-950 space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2 text-amber-800">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                Cancellation Review In Progress
              </span>
              <span className="font-mono text-[10px] bg-white text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 font-bold">
                Pending Kitchen Staff
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              We notified the kitchen team at <strong>{liveOrder.restaurantName}</strong> with your note: <em>"{liveOrder.cancellationRequestReason}"</em>. If preparation has not started, they will approve and issue an instant 100% refund.
            </p>
          </div>
        )}

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="bg-[#FDE8E8] rounded-2xl p-5 border border-[#F8C1C1] text-xs text-[#BA2D2D] space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#BA2D2D]" />
                <span>Order {liveOrder.status === 'CANCELLED' ? 'Cancelled' : 'Declined'}</span>
              </p>
              <span className="font-mono text-xs bg-white text-[#BA2D2D] px-2.5 py-1 rounded-lg border border-[#F8C1C1] font-bold shadow-2xs">
                {liveOrder.refundStatus === 'PROCESSED' ? '✓ Refund Processed' : 'Voided'}
              </span>
            </div>
            
            <p className="text-[#872020] font-medium leading-relaxed">
              Reason: {liveOrder.cancellationReason || 'Order was stopped prior to fulfillment.'}
            </p>

            {/* Verified Refund & Payment Settlement Certificate */}
            <div className="p-3.5 bg-white/90 rounded-xl border border-rose-200 text-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Settlement Breakdown</span>
                </span>
                <span className="font-mono text-emerald-700">
                  Ref: REF-{liveOrder.orderNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500 block">Total Refund Amount:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    ${(liveOrder.refundAmount ?? liveOrder.totalAmount).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Payment Method:</span>
                  <span className="font-semibold text-stone-700">
                    {liveOrder.paymentMethod.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              {liveOrder.runnerCompensationPaid && (
                <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-sky-800">
                  <span>🛵 Courier Road Protection Paid:</span>
                  <span className="font-mono font-bold">${liveOrder.runnerCompensationPaid.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-stone-600">Kitchen queue cleared. Inventory and tickets released.</span>
              {onBackToExplore && (
                <button
                  type="button"
                  onClick={onBackToExplore}
                  className="px-4 py-2 rounded-xl bg-[#BA2D2D] hover:bg-[#962424] text-white font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Explore Other Menus
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Stepper */}
        {!isCancelled && (
          <div className="py-6 px-2">
            <div className="relative flex items-center justify-between">
              {/* Connector line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#EDF1EC] -translate-y-1/2 z-0"></div>
              <div
                className="absolute top-1/2 left-0 h-1 bg-[#DE5124] -translate-y-1/2 z-0 transition-all duration-500"
                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step, idx) => {
                const isCompleted = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.status} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? 'bg-[#DE5124] text-white ring-4 ring-[#FDEEE9] scale-110'
                          : isCompleted
                          ? 'bg-[#247545] text-white'
                          : 'bg-white border-2 border-[#D9E2D9] text-[#7A8E80]'
                      }`}
                    >
                      {isCompleted && !isCurrent ? <Check className="w-4 h-4 stroke-[3]" /> : step.icon}
                    </div>
                    <span className={`text-[11px] font-bold mt-2 text-center max-w-[70px] ${
                      isCurrent ? 'text-[#DE5124]' : isCompleted ? 'text-[#132218]' : 'text-[#7A8E80]'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DINE-IN SERVICE CARD */}
      {isDineIn && !isCancelled && (
        <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#247545] border border-emerald-200 flex items-center justify-center text-xl font-bold shadow-xs">
                🍽️
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#132218] font-display flex items-center gap-2">
                  <span>Dine-In Table Service: {order.tableNumber || 'Table 4'}</span>
                  {liveOrder.status === 'DELIVERED' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Paid & Completed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#4F6155]">
                  Restaurant: <span className="font-semibold text-[#132218]">{order.restaurantName}</span>
                </p>
              </div>
            </div>

            {liveOrder.status !== 'DELIVERED' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCallStaffModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#F5F7F4] hover:bg-[#EBF3EE] text-[#247545] border border-[#C2E4CD] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Call Waiter / Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddItemsModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Dishes</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onBackToExplore}
                className="px-4 py-2 bg-[#247545] hover:bg-[#1E6038] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Reset Table for Next Diner</span>
              </button>
            )}
          </div>

          {liveOrder.status === 'DELIVERED' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 text-xs text-emerald-950">
              <p className="font-bold flex items-center gap-1.5 text-sm text-[#247545]">
                <span>🎉</span> Meal Completed & Bill Settled — Terima Kasih!
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Thank you for dining at <strong>{liveOrder.restaurantName}</strong>! Your table ticket has been marked paid and cleared by the cashier. {liveOrder.tableNumber || 'This table'} is now free and ready for the next incoming diners.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-xs text-[#247545] space-y-1">
              <p className="font-bold">✨ Live Table Connected</p>
              <p className="text-[11px] text-[#4F6155]">
                Dishes are prepped in sequence. You can order additional drinks, appetizers, or desserts at any time — they will automatically merge into this table ticket for your floor waiter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAKEAWAY SERVICE CARD */}
      {isTakeaway && !isCancelled && (
        <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#2C6E8E] border border-sky-200 flex items-center justify-center text-xl font-bold shadow-xs">
                🥡
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#132218] font-display">
                  Self-Pickup at {order.restaurantName}
                </h3>
                <p className="text-xs text-[#4F6155]">
                  Ready by: <span className="font-semibold text-[#132218]">{order.pickupTime || 'In ~20 mins'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddItemsModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dishes to Order</span>
            </button>
          </div>

          <div className="p-3.5 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#DE5124] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#132218] block">Kitchen Pickup Address:</span>
                <span className="text-[#4F6155]">{order.restaurantAddress || restaurant?.address || 'Simpang 58, Bandar Seri Begawan'}</span>
              </div>
            </div>
            {restaurant?.phone && (
              <div className="flex items-center gap-2 pt-1 border-t border-[#E8ECE8]">
                <Phone className="w-3.5 h-3.5 text-[#247545]" />
                <span className="text-[#4F6155]">Kitchen direct line: <a href={`tel:${restaurant.phone}`} className="font-bold text-[#132218] underline">{restaurant.phone}</a></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELIVERY SERVICE CARD (Simulated Live Route Map & Runner Details) */}
      {isDelivery && !isCancelled && (() => {
        const currentMilestone = liveOrder.deliveryMilestone || (
          liveOrder.status === 'DELIVERED' ? 'COMPLETED' :
          liveOrder.status === 'OUT_FOR_DELIVERY' ? 'PICKED_UP_EN_ROUTE' :
          liveOrder.status === 'READY_FOR_PICKUP' ? 'ARRIVED_AT_RESTAURANT' :
          liveOrder.runnerName ? 'ASSIGNED_HEADING_TO_RESTAURANT' : 'ASSIGNED_HEADING_TO_RESTAURANT'
        );

        const milestoneOrder: Record<string, number> = {
          ASSIGNED_HEADING_TO_RESTAURANT: 1,
          ARRIVED_AT_RESTAURANT: 2,
          PICKED_UP_EN_ROUTE: 3,
          NEARBY_APPROACHING: 4,
          ARRIVED_AT_DOORSTEP: 5,
          COMPLETED: 6
        };

        const currentStepIdx = milestoneOrder[currentMilestone] || 1;
        const isProximityActive = currentMilestone === 'NEARBY_APPROACHING' || currentMilestone === 'ARRIVED_AT_DOORSTEP';
        const isDelivered = currentMilestone === 'COMPLETED' || liveOrder.status === 'DELIVERED';
        const safeHandoffPin = liveOrder.deliveryTelemetry?.handoffPin || liveOrder.handoffPin || '4821';

        const milestoneSteps = [
          { key: 'ASSIGNED_HEADING_TO_RESTAURANT', label: 'Dispatched', desc: 'Heading to Kitchen', num: 1 },
          { key: 'ARRIVED_AT_RESTAURANT', label: 'At Kitchen', desc: 'Awaiting Packaged Food', num: 2 },
          { key: 'PICKED_UP_EN_ROUTE', label: 'In Transit', desc: 'Food On The Way', num: 3 },
          { key: 'NEARBY_APPROACHING', label: 'Nearby Beacon', desc: 'Entering Simpang (<1.5km)', num: 4 },
          { key: 'ARRIVED_AT_DOORSTEP', label: 'At Doorstep', desc: 'Ready for Handover', num: 5 },
          { key: 'COMPLETED', label: 'Delivered', desc: 'PIN Verified', num: 6 },
        ];

        return (
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#132218] flex items-center gap-2 font-display">
                  <Navigation className="w-4 h-4 text-[#236885]" />
                  <span>Courier Dispatch & Milestone Tracking</span>
                </h3>
                <p className="text-xs text-[#4F6155] mt-0.5">
                  Event-based checkpoints • Proximity-gated live location
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerLocationPing}
                  disabled={isPingingLocation || isDelivered}
                  className="px-3 py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#E8ECE8] border border-[#D9E2D9] text-xs font-bold text-[#132218] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Query courier GPS beacon on demand without continuous battery drain"
                >
                  <Radio className={`w-3.5 h-3.5 text-[#247545] ${isPingingLocation ? 'animate-spin' : 'animate-pulse'}`} />
                  <span>{isPingingLocation ? 'Pinging GPS...' : 'Check Proximity (Ping)'}</span>
                </button>

                {liveOrder.status === 'PREPARING' && (
                  <button
                    type="button"
                    onClick={() => setShowAddItemsModal(true)}
                    className="text-xs font-bold text-[#DE5124] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Extra Item</span>
                  </button>
                )}
              </div>
            </div>

            {pingMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pingMessage}</span>
              </div>
            )}

            {/* MILESTONE PROGRESS STEPPER */}
            <div className="bg-[#FAFBF9] rounded-2xl p-4 border border-[#E3E8E3] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#132218]">
                <span>Journey Progression</span>
                <span className="font-mono text-[11px] text-[#247545] bg-[#E0F2E6] px-2 py-0.5 rounded-full border border-[#C2E4CD]">
                  Step {currentStepIdx} of 6: {milestoneSteps[currentStepIdx - 1]?.label || 'Active'}
                </span>
              </div>

              {/* Stepper Dots & Line */}
              <div className="grid grid-cols-6 gap-1 relative">
                {milestoneSteps.map((step) => {
                  const isDone = currentStepIdx > step.num;
                  const isCurrent = currentStepIdx === step.num;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? 'bg-[#247545] text-white'
                            : isCurrent
                            ? 'bg-[#DE5124] text-white ring-4 ring-[#DE5124]/20 scale-110'
                            : 'bg-[#E3E8E3] text-[#7A8E80]'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.num}
                      </div>
                      <span className={`text-[10px] font-bold mt-1.5 leading-tight ${
                        isCurrent ? 'text-[#DE5124]' : isDone ? 'text-[#247545]' : 'text-[#7A8E80]'
                      }`}>
                        {step.label}
                      </span>
                      <span className="hidden sm:block text-[9px] text-[#7A8E80] leading-none mt-0.5">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PROXIMITY ALERT BANNER (When courier is in Simpang or <1.5km) */}
            {isProximityActive && !isDelivered && (
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl p-4 border-2 border-emerald-500/40 shadow-sm space-y-3 animate-fadeIn">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#247545] text-white flex items-center justify-center shadow-md shrink-0">
                      <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-[#132218]">
                          {currentMilestone === 'ARRIVED_AT_DOORSTEP' ? '🚪 Courier Arrived at Doorstep!' : '🛵 Courier Approaching Your Simpang!'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold animate-pulse">
                          ~{liveOrder.deliveryTelemetry?.estimatedArrivalMins || 2} MINS AWAY
                        </span>
                      </div>
                      <p className="text-xs text-[#4F6155] mt-0.5">
                        {currentMilestone === 'ARRIVED_AT_DOORSTEP' 
                          ? 'Courier is at your gate/entrance. Please meet them with your verification PIN.'
                          : 'Proximity beacon active: Courier is entering your neighborhood. Watch for their vehicle.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Safe Handoff PIN Card */}
                <div className="bg-white rounded-xl p-3 border border-emerald-300 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#247545]">
                      <ShieldCheck className="w-4 h-4 text-[#247545]" />
                      <span>Safe Handoff Verification PIN</span>
                    </div>
                    <p className="text-[11px] text-[#4F6155] mt-0.5">
                      Share this 4-digit code with the courier upon delivery to verify correct order handover.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-mono text-2xl font-black text-[#DE5124] bg-[#FDEEE9] px-4 py-1 rounded-xl border border-[#F9D0C4] tracking-widest shadow-inner">
                      {safeHandoffPin}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                      Show to Runner
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Simulated Map Canvas */}
            <div className="relative h-48 rounded-2xl bg-[#E8EFE9] border border-[#D9E2D9] overflow-hidden flex items-center justify-center p-4">
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#7A8E80_1px,transparent_1px),linear-gradient(to_bottom,#7A8E80_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 60 120 Q 200 40 380 100 T 600 70"
                  fill="none"
                  stroke={isProximityActive ? '#247545' : '#DE5124'}
                  strokeWidth="4"
                  strokeDasharray="8 6"
                  className="animate-pulse"
                />
              </svg>

              {/* Restaurant Marker */}
              <div className="absolute left-8 bottom-8 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#132218] text-white flex items-center justify-center shadow-md border-2 border-white">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#132218] bg-white px-2 py-0.5 rounded shadow-2xs mt-1">
                  {liveOrder.restaurantName}
                </span>
              </div>

              {/* Runner Icon moving on map */}
              <div className={`absolute ${
                currentMilestone === 'ARRIVED_AT_DOORSTEP' || isDelivered ? 'right-20 top-12' :
                currentMilestone === 'NEARBY_APPROACHING' ? 'right-28 top-16' :
                currentMilestone === 'PICKED_UP_EN_ROUTE' ? 'left-1/2 top-1/3' :
                'left-24 bottom-14'
              } -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ${!isDelivered ? 'animate-bounce' : ''}`}>
                <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white ${
                  isProximityActive ? 'bg-[#247545]' : 'bg-[#DE5124]'
                }`}>
                  <Bike className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-2xs mt-1 whitespace-nowrap ${
                  isProximityActive ? 'bg-[#247545]' : 'bg-[#DE5124]'
                }`}>
                  {liveOrder.runnerName || 'Courier Assigned'} {isProximityActive ? '• Proximity Ping' : ''}
                </span>
              </div>

              {/* Customer Destination Marker */}
              <div className="absolute right-8 top-8 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#247545] text-white flex items-center justify-center shadow-md border-2 border-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-[#132218] bg-white px-2 py-0.5 rounded shadow-2xs mt-1">
                  Your Doorstep
                </span>
              </div>

              {/* Proximity / Privacy indicator tag overlay */}
              <div className="absolute top-2 left-2 z-10">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs ${
                  isProximityActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white/90 text-stone-700 border border-stone-200'
                }`}>
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>
                    {isDelivered 
                      ? 'Trip Concluded (GPS Purged)' 
                      : isProximityActive 
                      ? 'Live Proximity Beacon Active (<1.5km)' 
                      : 'Milestone Tracking Active (GPS Sleep Mode)'}
                  </span>
                </span>
              </div>
            </div>

            {/* Real-time Lightweight Coordinate Telemetry Bar */}
            <div className="p-3.5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#247545] animate-pulse" />
                  <span className="font-bold text-[#132218]">Active Location Telemetry:</span>
                  <span className="font-mono text-[11px] text-[#4F6155] bg-white px-2 py-0.5 rounded border border-[#D9E2D9]">
                    Dropoff: {liveOrder.deliveryAddress?.latitude?.toFixed(4) || '4.8912'}, {liveOrder.deliveryAddress?.longitude?.toFixed(4) || '114.9382'}
                  </span>
                  {!isDelivered && (
                    <span className="font-mono text-[11px] text-[#DE5124] bg-white px-2 py-0.5 rounded border border-[#D9E2D9]">
                      Runner: {liveOrder.runnerLocation?.latitude ? liveOrder.runnerLocation.latitude.toFixed(4) : (liveOrder.deliveryAddress?.latitude ? (liveOrder.deliveryAddress.latitude - 0.005).toFixed(4) : '4.8862')}, {liveOrder.runnerLocation?.longitude ? liveOrder.runnerLocation.longitude.toFixed(4) : (liveOrder.deliveryAddress?.longitude ? (liveOrder.deliveryAddress.longitude - 0.003).toFixed(4) : '114.9352')}
                    </span>
                  )}
                  {isDelivered && (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      Location Securely Purged
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full font-medium">
                  32-byte packet ping • Zero data waste
                </span>
              </div>

              {/* Brunei Street & Landmark Specs */}
              {liveOrder.deliveryAddress && (
                <div className="pt-2 border-t border-[#E8ECE8] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#4F6155]">
                  <div>
                    <span className="font-bold text-[#132218] block">Drop-off Address:</span>
                    <span>{liveOrder.deliveryAddress.street}</span>
                    {liveOrder.deliveryAddress.simpang && (
                      <span className="text-[#DE5124] font-bold block">{liveOrder.deliveryAddress.simpang}</span>
                    )}
                    <span>
                      {liveOrder.deliveryAddress.aptOrSuite ? `${liveOrder.deliveryAddress.aptOrSuite}, ` : ''}
                      {liveOrder.deliveryAddress.kampong || liveOrder.deliveryAddress.city} ({liveOrder.deliveryAddress.district || 'Brunei-Muara'})
                    </span>
                  </div>

                  <div>
                    {liveOrder.deliveryAddress.landmark && (
                      <div className="bg-amber-50 p-2 rounded-lg border border-amber-200/60 mb-1">
                        <span className="font-bold text-amber-900 block">House Landmark:</span>
                        <span className="text-amber-800">{liveOrder.deliveryAddress.landmark}</span>
                      </div>
                    )}
                    {liveOrder.deliveryAddress.instructions && (
                      <div className="text-[10px] text-stone-500">
                        <span className="font-bold">Instructions: </span>{liveOrder.deliveryAddress.instructions}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Courier Contact Row & Vehicle Identification */}
            {liveOrder.runnerName ? (
              <div className="p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#236885] text-white flex items-center justify-center font-bold">
                    {liveOrder.runnerName.split(' ')[0][0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#132218]">{liveOrder.runnerName}</p>
                      <span className="text-[10px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded font-mono font-bold">
                        Plate: BA 8419
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A8E80]">Dedicated FOODFINDR Runner • 4.9★</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={getWhatsAppUrl(
                      liveOrder.runnerPhone || '+673 876 5432',
                      `Assalamualaikom ${liveOrder.runnerName}! This is ${liveOrder.customerName} regarding delivery order #${liveOrder.orderNumber}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    title="Text courier on WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Courier</span>
                  </a>

                  <a
                    href={getPhoneCallUrl(liveOrder.runnerPhone || '+673 876 5432')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D9E2D9] text-xs font-bold text-[#132218] hover:bg-[#EDF1EC] transition-colors cursor-pointer"
                    title="Direct voice call to courier"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#247545]" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#7A8E80] italic text-center py-2">
                Runner assignment in progress with optimal route matching...
              </p>
            )}

            {/* PRIVACY & BATTERY CONSERVATION NOTICE */}
            <div className="p-3.5 rounded-2xl bg-[#F0F5F1] border border-[#C5DDCB] text-xs text-[#2A4B35] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#1B3825]">
                <ShieldCheck className="w-4 h-4 text-[#247545]" />
                <span>Privacy-First Telemetry Architecture</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#3B5B46]">
                Why continuous GPS is not used: To safeguard runner privacy and conserve phone battery/mobile data across Brunei telecom networks, our fleet uses event-based checkpoint telemetry. Precise coordinates are only shared when the runner approaches your Simpang (&lt;1.5km), and are permanently deleted once your order is safely received.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Order Itemized Receipt Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#132218] font-display">Receipt & Order Summary</h3>
          <button
            type="button"
            onClick={() => setShowAddItemsModal(true)}
            className="text-xs font-bold text-[#DE5124] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add More Dishes</span>
          </button>
        </div>

        <div className="divide-y divide-[#EDF1EC] text-xs">
          {order.items.map(item => (
            <div key={item.id} className="py-3 flex justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#DE5124]">{item.quantity}x</span>
                  <span className="font-bold text-[#132218]">{item.itemName}</span>
                </div>
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <p className="text-[11px] text-[#7A8E80] pl-5 mt-0.5">
                    {item.selectedAddons.map(a => a.optionName).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-mono font-semibold text-[#132218]">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#EDF1EC] space-y-1.5 text-xs text-[#4F6155]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-[#132218]">${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (8.5%)</span>
            <span className="font-mono text-[#132218]">${order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{isDineIn ? 'Table Fee' : isTakeaway ? 'Pickup Fee' : 'Delivery Fee'}</span>
            <span className="font-mono text-[#132218]">
              {order.deliveryFee === 0 ? <span className="text-[#247545] font-bold">FREE ($0.00)</span> : `$${order.deliveryFee.toFixed(2)}`}
            </span>
          </div>
          {order.tip > 0 && (
            <div className="flex justify-between">
              <span>Courier Tip</span>
              <span className="font-mono text-[#132218]">${order.tip.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-[#D9E2D9] flex justify-between text-sm font-bold text-[#132218]">
            <span>Total Amount</span>
            <span className="font-mono text-base text-[#DE5124]">${liveOrder.totalAmount.toFixed(2)}</span>
          </div>

          {/* Transparent Payment & Settlement Breakdown */}
          <div className="pt-3 border-t border-[#EDF1EC] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#2C6E8E]" />
                <span>Payment Method</span>
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-[#F5F7F4] border border-[#D9E2D9] text-stone-700 text-[11px]">
                {liveOrder.paymentMethod.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700">Payment Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                liveOrder.refundStatus === 'PROCESSED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : liveOrder.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {liveOrder.refundStatus === 'PROCESSED' ? 'REFUNDED (100%)' : liveOrder.paymentStatus}
              </span>
            </div>

            {liveOrder.refundStatus === 'PROCESSED' && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Instant Refund Issued</span>
                  </span>
                  <span className="font-mono text-emerald-700">${(liveOrder.refundAmount ?? liveOrder.totalAmount).toFixed(2)}</span>
                </div>
                <p className="text-emerald-700 text-[10px]">
                  Released back to {liveOrder.paymentMethod.replace(/_/g, ' ')}. Processing time: Instant.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD MORE DISHES TO CURRENT ORDER */}
      {showAddItemsModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#D9E2D9] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EDF1EC] flex items-center justify-between bg-[#F5F7F4] rounded-t-3xl">
              <div>
                <h3 className="font-bold text-sm text-[#132218] font-display">
                  Add Dishes to Order #{order.orderNumber}
                </h3>
                <p className="text-xs text-[#4F6155]">
                  {isDineIn ? `Serving straight to ${order.tableNumber || 'your table'}` : 'Items will merge with your order ticket'}
                </p>
              </div>
              <button
                onClick={() => setShowAddItemsModal(false)}
                className="w-8 h-8 rounded-full bg-white text-[#4F6155] hover:text-[#132218] flex items-center justify-center border border-[#D9E2D9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              <p className="text-xs font-bold text-[#7A8E80] uppercase tracking-wider">Available Dishes</p>
              <div className="space-y-2.5 divide-y divide-[#EDF1EC]">
                {restaurantMenuItems.map(item => {
                  const currentQty = extraItemsQuantities[item.id] || 0;
                  return (
                    <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#132218] truncate">{item.name}</h4>
                        <span className="text-xs font-mono font-bold text-[#DE5124]">
                          ${item.basePrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
                        <button
                          type="button"
                          onClick={() => setExtraItemsQuantities(prev => ({
                            ...prev,
                            [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                          }))}
                          className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-[#4F6155] hover:bg-[#EDF1EC] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold text-[#132218]">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraItemsQuantities(prev => ({
                            ...prev,
                            [item.id]: (prev[item.id] || 0) + 1
                          }))}
                          className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-[#4F6155] hover:bg-[#EDF1EC] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#EDF1EC]">
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Kitchen Notes / Special Requests (Optional)
                </label>
                <input
                  type="text"
                  value={extraNotes}
                  onChange={e => setExtraNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, serve dessert after main course..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D9E2D9] bg-white focus:outline-none focus:border-[#DE5124]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#EDF1EC] bg-[#F5F7F4] rounded-b-3xl flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddItemsModal(false)}
                className="px-4 py-2 rounded-xl border border-[#D9E2D9] text-xs font-bold text-[#4F6155] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddItems}
                className="px-5 py-2.5 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Send to Kitchen</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CALL FLOOR STAFF & ASSISTANCE */}
      {showCallStaffModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#D9E2D9] p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EDF1EC] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#247545]" />
                <h3 className="font-bold text-sm text-[#132218] font-display">
                  Table Assistance ({order.tableNumber || 'Table 4'})
                </h3>
              </div>
              <button
                onClick={() => setShowCallStaffModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-[#4F6155]">
              Select what you need and a floor server will be alerted at the service station immediately:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTriggerStaffCall('CALL_WAITER')}
                className="w-full p-3 rounded-2xl border border-[#D9E2D9] hover:border-[#247545] hover:bg-emerald-50/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#247545] flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#132218] group-hover:text-[#247545]">Call Waiter</p>
                  <p className="text-[11px] text-[#7A8E80]">Assistance at table for ordering or inquiries</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerStaffCall('EXTRA_CUTLERY_WATER')}
                className="w-full p-3 rounded-2xl border border-[#D9E2D9] hover:border-[#2C6E8E] hover:bg-sky-50/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#2C6E8E] flex items-center justify-center font-bold">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#132218] group-hover:text-[#2C6E8E]">Water & Extra Cutlery</p>
                  <p className="text-[11px] text-[#7A8E80]">Refill drinking water, napkins, or utensils</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerStaffCall('REQUEST_BILL')}
                className="w-full p-3 rounded-2xl border border-[#D9E2D9] hover:border-[#DE5124] hover:bg-orange-50/50 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#DE5124] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#132218] group-hover:text-[#DE5124]">Request Bill / Settlement</p>
                  <p className="text-[11px] text-[#7A8E80]">Bring bill folder for cash or BIBD QuickPay</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CANCEL ORDER CONFIRMATION MODAL (For PENDING status with Authentication) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#D9E2D9] animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#EDF1EC] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#BA2D2D] border border-rose-200 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#132218] font-display">
                    Cancel Order #{liveOrder.orderNumber}?
                  </h3>
                  <p className="text-xs text-[#7A8E80]">
                    {liveOrder.restaurantName} • ${liveOrder.totalAmount.toFixed(2)} ({liveOrder.items.length} items)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Authentication Verification Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6155] block">
                Identity & Authorization Verification
              </span>

              {isOrderCustomer ? (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-900 block">Verified Customer Identity</span>
                    <span className="text-[11px] text-emerald-700">
                      Logged in as {currentUser.firstName} ({currentUser.email || currentUser.phone})
                    </span>
                  </div>
                </div>
              ) : isStaffOrAdmin ? (
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0" />
                  <div>
                    <span className="font-bold text-indigo-900 block">Staff / Management Session</span>
                    <span className="text-[11px] text-indigo-700">
                      Authorized override as {currentUser.role} ({currentUser.firstName})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <Key className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Customer Authentication Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    To prevent unauthorized cancellation, please confirm the phone number or email registered for this order ({liveOrder.customerName}).
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="e.g. +673 876 5432 or email"
                      value={guestPhoneAuthInput}
                      onChange={(e) => {
                        setGuestPhoneAuthInput(e.target.value);
                        setAuthErrorMsg(null);
                      }}
                      className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => openAuthModal('SIGN_IN')}
                      className="px-3 py-2 bg-amber-200 hover:bg-amber-300 rounded-xl text-[11px] font-bold text-amber-900 cursor-pointer whitespace-nowrap"
                    >
                      Sign In Instead
                    </button>
                  </div>
                  {isGuestPhoneVerified && (
                    <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Phone/Email matches order record. Verification approved.</span>
                    </p>
                  )}
                  {authErrorMsg && (
                    <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {authErrorMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cancellation Reason Selection */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6155] block">
                Why are you cancelling?
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Placed by mistake',
                  'Change delivery address',
                  'Wait time is too long',
                  'Change of mind / Found other meal',
                  'Duplicate order',
                  'Other / Custom Reason'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedCancelReason(reason)}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                      selectedCancelReason === reason
                        ? 'bg-[#BA2D2D] text-white border-[#BA2D2D] shadow-xs'
                        : 'bg-[#F5F7F4] text-[#132218] border-[#D9E2D9] hover:bg-[#EAEFEA]'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Optional notes or feedback for restaurant / courier..."
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl p-2.5 text-xs text-[#132218] focus:outline-none focus:border-[#BA2D2D] placeholder:text-stone-400"
              />
            </div>

            {/* Guarantee and Real-Time Refund Notice */}
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Instant Refund Policy</span>
              </span>
              <p className="text-[#3B5B46] leading-relaxed">
                Because this order is still in <strong>Pending</strong> status, kitchen stoves have not been fired. Your card/prepaid balance of <strong>${liveOrder.totalAmount.toFixed(2)}</strong> will be immediately released without penalty.
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#EDF1EC]">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#F5F7F4] hover:bg-[#EAEFEA] text-xs font-bold text-[#4F6155] cursor-pointer transition-colors"
              >
                Keep My Order
              </button>

              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="flex-1 py-3 rounded-2xl bg-[#BA2D2D] hover:bg-[#9E2424] text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingCancel ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOCKED CANCELLATION ASSISTANCE MODAL (For Orders Already in Preparation or On The Way) */}
      {showLockedCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#D9E2D9] animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#EDF1EC] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#132218] font-display">
                    Cancellation Notice & Policy
                  </h3>
                  <p className="text-xs text-[#7A8E80]">
                    Status: <strong className="text-amber-800">{liveOrder.status.replace(/_/g, ' ')}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLockedCancelModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation card based on active status */}
            {liveOrder.status === 'PREPARING' && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Flame className="w-4 h-4 text-amber-700" />
                  <span>Chefs Are Cooking Your Food</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The kitchen staff at <strong>{liveOrder.restaurantName}</strong> have already confirmed your ticket and are currently cooking your dishes on the stove. Automatic 1-click cancellation is locked to protect restaurant partners from food wastage.
                </p>

                {/* Submit Kitchen Cancellation Review Request */}
                <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2">
                  <span className="font-bold text-[11px] text-amber-900 block">
                    Submit Cancellation Request for Kitchen Review
                  </span>
                  <input
                    type="text"
                    value={kitchenReviewReason}
                    onChange={(e) => setKitchenReviewReason(e.target.value)}
                    placeholder="Reason (e.g. unexpected emergency, wrong items)..."
                    className="w-full bg-[#F5F7F4] border border-amber-200 rounded-lg p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    disabled={isSubmittingReview || !kitchenReviewReason.trim()}
                    onClick={handleSendKitchenReviewRequest}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingReview ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        <span>Send Urgent Request to Kitchen Chefs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {liveOrder.status === 'OUT_FOR_DELIVERY' && (
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 space-y-3 text-xs text-sky-950">
                <div className="flex items-center gap-2 font-bold text-sm text-sky-900">
                  <Bike className="w-4 h-4 text-[#2C6E8E]" />
                  <span>Courier Is En Route On The Road</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Your delivery runner <strong>{liveOrder.runnerName || 'Courier'}</strong> has collected your hot food bags and is actively traveling to your delivery address.
                </p>

                {/* Fair-Share On-The-Road Cancellation Option */}
                <div className="p-3 bg-white rounded-xl border border-sky-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-sky-900">Emergency Stop in Transit</span>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px]">
                      Courier Fee Protected
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-600 leading-relaxed">
                    Under platform fair-share policy, cancelling en route protects your runner: the delivery fee (${(liveOrder.deliveryFee || 3.50).toFixed(2)}) is guaranteed and credited to their Runner Wallet for road fuel and time.
                  </p>
                  <button
                    type="button"
                    disabled={isSubmittingEnRouteCancel}
                    onClick={() => {
                      if (window.confirm(`Confirm emergency cancellation? The courier delivery fee of $${(liveOrder.deliveryFee || 3.50).toFixed(2)} will be paid to courier ${liveOrder.runnerName || 'runner'} for road dispatch time.`)) {
                        handleConfirmEnRouteEmergencyCancel();
                      }
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingEnRouteCancel ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        <span>Confirm Emergency Cancel (With Courier Payout)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {liveOrder.status === 'READY_FOR_PICKUP' && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <PackageCheck className="w-4 h-4 text-emerald-700" />
                  <span>Food Boxed & Packaged at Counter</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Your dishes are packaged in takeaway boxes and ready at the store counter. Please call the store directly if you are unable to collect.
                </p>
              </div>
            )}

            {/* Direct Resolution Actions */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6155] block">
                Direct Contact & Support Channels
              </span>

              {/* Kitchen Contact (WhatsApp & Phone) */}
              {restaurant?.phone && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getWhatsAppUrl(
                      restaurant.whatsappPhone || restaurant.phone,
                      `Assalamualaikom ${restaurant.name}! This is ${liveOrder.customerName} regarding my order #${liveOrder.orderNumber}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Kitchen</span>
                  </a>

                  <a
                    href={getPhoneCallUrl(restaurant.phone)}
                    className="p-3 rounded-2xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] flex items-center justify-center gap-2 text-xs font-bold text-[#132218] transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#247545]" />
                    <span>Call Kitchen</span>
                  </a>
                </div>
              )}

              {/* Courier Contact (WhatsApp & Phone) */}
              {liveOrder.runnerPhone && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getWhatsAppUrl(
                      liveOrder.runnerPhone,
                      `Assalamualaikom ${liveOrder.runnerName}! This is ${liveOrder.customerName} regarding delivery order #${liveOrder.orderNumber}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 flex items-center justify-center gap-2 text-xs font-extrabold text-[#128C7E] transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Courier</span>
                  </a>

                  <a
                    href={getPhoneCallUrl(liveOrder.runnerPhone)}
                    className="p-3 rounded-2xl bg-[#F5F7F4] hover:bg-[#EAEFEA] border border-[#D9E2D9] flex items-center justify-center gap-2 text-xs font-bold text-[#132218] transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#247545]" />
                    <span>Call Courier</span>
                  </a>
                </div>
              )}

              {/* For Dine In: Call Waiter */}
              {isDineIn && (
                <button
                  type="button"
                  onClick={() => {
                    setShowLockedCancelModal(false);
                    setShowCallStaffModal(true);
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-emerald-700" />
                    <span>Call Waiter to {liveOrder.tableNumber || 'Table'}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700">Floor Assistance →</span>
                </button>
              )}
            </div>

            {/* Privileged Staff / Manager Emergency Override */}
            {isStaffOrAdmin && (
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#BA2D2D]">
                  <AlertTriangle className="w-4 h-4 text-[#BA2D2D]" />
                  <span>Management Force-Void Override</span>
                </div>
                <p className="text-[11px] text-rose-800">
                  As an authorized manager/admin, you can force-void this ticket (e.g., kitchen out-of-stock or customer emergency).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm('Are you sure you want to force-void this active ticket? Kitchen waste will be recorded.');
                    if (ok) {
                      cancelOrder(liveOrder.id, 'Management Override: Kitchen Void', false);
                      setShowLockedCancelModal(false);
                    }
                  }}
                  className="w-full py-2 bg-[#BA2D2D] hover:bg-[#9E2424] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                >
                  Force Cancel Ticket (Manager Override)
                </button>
              </div>
            )}

            {/* Dismiss Button */}
            <div className="pt-2 border-t border-[#EDF1EC]">
              <button
                type="button"
                onClick={() => setShowLockedCancelModal(false)}
                className="w-full py-3 rounded-2xl bg-[#132218] hover:bg-[#253A2C] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                I Understand • Return to Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
