import React, { createContext, useContext, useState } from 'react';
import { 
  Order, 
  OrderItem,
  CartItem, 
  OrderStatus, 
  MenuItem, 
  SelectedAddon, 
  DeliveryAddress, 
  PaymentMethodType, 
  AuditLog, 
  AppNotification,
  ServiceType,
  RunnerType,
  RunnerDeliveryMilestone,
  DeliveryTelemetry
} from '../types';
import { INITIAL_ORDERS, INITIAL_AUDIT_LOGS, INITIAL_NOTIFICATIONS } from '../mockData';
import confetti from 'canvas-confetti';
import { 
  playNotificationSound, 
  requestNotificationPermission, 
  sendDesktopNotification, 
  startBackgroundTitleAlert, 
  ChimeTone 
} from '../utils/notificationSound';

interface OrderContextType {
  orders: Order[];
  cart: CartItem[];
  cartRestaurantId: string | null;
  cartServiceType: ServiceType;
  setCartServiceType: (service: ServiceType) => void;
  cartTableNumber: string;
  setCartTableNumber: (table: string) => void;
  cartPickupTime: string;
  setCartPickupTime: (time: string) => void;
  hasScannedTableQr: boolean;
  setHasScannedTableQr: (scanned: boolean) => void;
  scannedTableNumber: string | null;
  tableSessionStartedAt: number | null;
  tableSessionEpoch: number | null;
  verifyTableQrSession: (tableNumber: string, sessionEpoch?: number) => void;
  clearTableQrSession: () => void;
  isTableSessionExpired: (tableLastClearedAt?: string) => boolean;
  activeOrder: Order | null;
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  // Background & Pop-up Notification System
  activePopupNotif: AppNotification | null;
  dismissPopupNotif: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  testNotificationSound: () => void;
  requestDesktopPermission: () => Promise<NotificationPermission>;
  desktopPermission: NotificationPermission;
  // Cart Actions
  addToCart: (menuItem: MenuItem, quantity: number, selectedAddons: SelectedAddon[], specialInstructions?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  // Order Actions
  placeOrder: (
    customerId: string,
    customerName: string,
    customerPhone: string,
    customerEmail: string,
    restaurantId: string,
    restaurantName: string,
    restaurantAddress: string,
    restaurantPhone: string,
    options: {
      serviceType: ServiceType;
      deliveryAddress?: DeliveryAddress;
      restaurantDistrict?: string;
      deliveryDistrict?: string;
      isCrossDistrict?: boolean;
      routeDistanceKm?: number;
      deliveryFee?: number;
      tableNumber?: string;
      tablePinEntered?: string;
      isTableVerifiedByStaff?: boolean;
      dineInNotes?: string;
      pickupTime?: string;
      runnerType?: RunnerType;
      paymentMethod: PaymentMethodType;
      tip?: number;
      specialNotes?: string;
      discountAmount?: number;
      promoCode?: string;
    }
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, actorName?: string, actorRole?: any, reason?: string) => void;
  claimRunnerJob: (orderId: string, runnerId: string, runnerName: string, runnerPhone: string, runnerType?: RunnerType) => void;
  updateRunnerMilestone: (
    orderId: string,
    milestone: RunnerDeliveryMilestone,
    coords?: { latitude: number; longitude: number },
    actorName?: string,
    note?: string
  ) => void;
  requestOnDemandLocationPing: (orderId: string, actorName?: string) => void;
  uploadProofOfDelivery: (orderId: string, proofUrl: string) => void;
  cancelOrder: (orderId: string, reason: string, cancelledByCustomer?: boolean) => boolean;
  requestOrderCancellation: (orderId: string, reason: string, requestedBy?: string) => Promise<boolean>;
  resolveCancellationRequest: (orderId: string, decision: 'APPROVE' | 'REJECT', note?: string, actorName?: string) => void;
  cancelOrderEnRouteWithProtection: (orderId: string, reason: string, actorName?: string) => void;
  getOrdersByRestaurant: (restaurantId: string) => Order[];
  createStaffOrder: (params: {
    restaurantId: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    serviceType: ServiceType;
    tableNumber?: string;
    dineInNotes?: string;
    customerName?: string;
    customerPhone?: string;
    items: OrderItem[];
    waiterName?: string;
    specialNotes?: string;
    tax?: number;
  }) => Order;
  updateOrderItems: (
    orderId: string,
    newItems: OrderItem[],
    changeReason?: string,
    actorName?: string
  ) => void;
  updateOrderTableNumber: (orderId: string, newTableNumber: string, actorName?: string) => void;
  appendItemsToExistingOrder: (orderId: string, extraItems: OrderItem[], note?: string) => void;
  callStaffForAssistance: (orderId: string, requestType: 'CALL_WAITER' | 'REQUEST_BILL' | 'EXTRA_CUTLERY_WATER', details?: string) => void;
  settleOrderWithCash: (
    orderId: string,
    params: {
      cashTendered: number;
      changeReturned: number;
      cashierName: string;
      paymentMethod?: PaymentMethodType;
      status?: OrderStatus;
      customPaymentChannelName?: string;
      paymentReference?: string;
    }
  ) => void;
  createAndSettleCounterOrder: (params: {
    restaurantId: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    serviceType: ServiceType;
    tableNumber?: string;
    customerName?: string;
    items: OrderItem[];
    subtotal?: number;
    tax?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod: PaymentMethodType;
    cashTendered: number;
    changeReturned: number;
    cashierName: string;
    specialNotes?: string;
    markAsDelivered?: boolean;
    customPaymentChannelName?: string;
    paymentReference?: string;
  }) => Order;
  setActiveOrder: (order: Order | null) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [hasScannedTableQr, setHasScannedTableQr] = useState<boolean>(false);
  const [scannedTableNumber, setScannedTableNumber] = useState<string | null>(null);
  const [tableSessionStartedAt, setTableSessionStartedAt] = useState<number | null>(null);
  const [tableSessionEpoch, setTableSessionEpoch] = useState<number | null>(null);
  const [cartServiceType, setCartServiceType] = useState<ServiceType>('DELIVERY');
  const [cartTableNumber, setCartTableNumber] = useState<string>('');
  const [cartPickupTime, setCartPickupTime] = useState<string>('As soon as ready (~20 mins)');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const verifyTableQrSession = (table: string, sessionEpoch?: number) => {
    setHasScannedTableQr(true);
    setScannedTableNumber(table);
    setCartTableNumber(table);
    setCartServiceType('DINE_IN');
    setTableSessionStartedAt(Date.now());
    if (sessionEpoch !== undefined) {
      setTableSessionEpoch(sessionEpoch);
    }
  };

  const clearTableQrSession = () => {
    setHasScannedTableQr(false);
    setScannedTableNumber(null);
    setTableSessionStartedAt(null);
    setTableSessionEpoch(null);
    setCartTableNumber('');
    setCartServiceType('DELIVERY');
  };

  const isTableSessionExpired = (tableLastClearedAt?: string): boolean => {
    if (!hasScannedTableQr || !tableSessionStartedAt) return true;
    // Check 1: Session Max Lifespan (2.5 hours TTL)
    const twoAndHalfHoursMs = 2.5 * 60 * 60 * 1000;
    if (Date.now() - tableSessionStartedAt > twoAndHalfHoursMs) {
      clearTableQrSession();
      return true;
    }
    // Check 2: Table has been settled and cleared by restaurant staff since this customer sat down
    if (tableLastClearedAt) {
      const clearedTime = new Date(tableLastClearedAt).getTime();
      if (clearedTime > tableSessionStartedAt) {
        clearTableQrSession();
        return true;
      }
    }
    return false;
  };
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [activePopupNotif, setActivePopupNotif] = useState<AppNotification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestDesktopPermission = async (): Promise<NotificationPermission> => {
    const perm = await requestNotificationPermission();
    setDesktopPermission(perm);
    return perm;
  };

  const testNotificationSound = () => {
    playNotificationSound('ALERT');
  };

  const dismissPopupNotif = () => {
    setActivePopupNotif(null);
  };

  // Auto-dismiss popup toast after 7 seconds
  React.useEffect(() => {
    if (!activePopupNotif) return;
    const timer = setTimeout(() => {
      setActivePopupNotif(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activePopupNotif]);

  // Cart helper functions
  const addToCart = (
    menuItem: MenuItem, 
    quantity: number, 
    selectedAddons: SelectedAddon[], 
    specialInstructions?: string
  ) => {
    // If cart has items from another restaurant, reset cart with confirmation
    if (cartRestaurantId && cartRestaurantId !== menuItem.restaurantId && cart.length > 0) {
      if (!window.confirm('Adding items from a new restaurant will clear your current cart. Continue?')) {
        return;
      }
      setCart([]);
    }

    setCartRestaurantId(menuItem.restaurantId);

    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.priceDelta, 0);
    const unitPrice = menuItem.basePrice + addonsPrice;
    const itemTotal = unitPrice * quantity;
    const cartItemId = `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newItem: CartItem = {
      cartItemId,
      menuItem,
      quantity,
      selectedAddons,
      specialInstructions,
      itemTotal,
    };

    setCart(prev => [...prev, newItem]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => {
      const filtered = prev.filter(item => item.cartItemId !== cartItemId);
      if (filtered.length === 0) setCartRestaurantId(null);
      return filtered;
    });
  };

  const updateCartQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const addonsPrice = item.selectedAddons.reduce((sum, a) => sum + a.priceDelta, 0);
          const unitPrice = item.menuItem.basePrice + addonsPrice;
          return {
            ...item,
            quantity: newQuantity,
            itemTotal: unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurantId(null);
  };

  const getCartSubtotal = (): number => {
    return cart.reduce((sum, item) => sum + item.itemTotal, 0);
  };

  const recordAuditLog = (
    actorName: string,
    actorRole: any,
    action: string,
    entityType: 'ORDER' | 'RESTAURANT' | 'MENU_ITEM' | 'USER' | 'SYSTEM_CONFIG',
    entityId: string,
    details: string,
    tenantId?: string
  ) => {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorId: `actor_${Date.now()}`,
      actorName,
      actorRole,
      tenantId,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const dispatchNotification = (
    userId: string,
    title: string,
    message: string,
    type: any,
    orderId?: string,
    restaurantId?: string
  ) => {
    const notif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      restaurantId,
      title,
      message,
      type,
      channel: 'IN_APP',
      orderId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [notif, ...prev]);

    // 1. Trigger floating popup card for immediate visibility across any screen
    setActivePopupNotif(notif);

    // 2. Play distinct synthesized audio chime if sound is enabled
    if (soundEnabled) {
      let tone: ChimeTone = 'MELODIC';
      const text = `${title} ${message}`.toLowerCase();
      if (
        type === 'ORDER_CANCELLED' || 
        type === 'CANCELLATION_REQUESTED' || 
        text.includes('cancelled') || 
        text.includes('urgent') || 
        text.includes('emergency')
      ) {
        tone = 'URGENT';
      } else if (
        text.includes('nearby') || 
        text.includes('doorstep') || 
        text.includes('arrived') || 
        text.includes('simp')
      ) {
        tone = 'PROXIMITY';
      } else if (
        type === 'ORDER_READY' || 
        type === 'ORDER_PLACED' || 
        type === 'ORDER_ACCEPTED' || 
        text.includes('ready')
      ) {
        tone = 'ALERT';
      } else if (
        type === 'REFUND_PROCESSED' || 
        type === 'RUNNER_COMPENSATION' || 
        text.includes('refund') || 
        text.includes('payout')
      ) {
        tone = 'CASH';
      }
      playNotificationSound(tone);
    }

    // 3. Desktop / OS background notification for off-screen users
    if (typeof document !== 'undefined' && document.hidden) {
      startBackgroundTitleAlert(`(1) 🔔 ${title.substring(0, 22)}...`);
    }

    sendDesktopNotification({
      title,
      body: message,
      tag: orderId || notif.id,
      onClick: () => {
        window.focus();
        if (orderId) {
          const match = orders.find(o => o.id === orderId);
          if (match) setActiveOrder(match);
        }
      }
    });
  };

  // Place Order with full ServiceType & District support
  const placeOrder = async (
    customerId: string,
    customerName: string,
    customerPhone: string,
    customerEmail: string,
    restaurantId: string,
    restaurantName: string,
    restaurantAddress: string,
    restaurantPhone: string,
    options: {
      serviceType: ServiceType;
      deliveryAddress?: DeliveryAddress;
      restaurantDistrict?: string;
      deliveryDistrict?: string;
      isCrossDistrict?: boolean;
      routeDistanceKm?: number;
      deliveryFee?: number;
      tableNumber?: string;
      tablePinEntered?: string;
      isTableVerifiedByStaff?: boolean;
      dineInNotes?: string;
      pickupTime?: string;
      runnerType?: RunnerType;
      paymentMethod: PaymentMethodType;
      tip?: number;
      specialNotes?: string;
      discountAmount?: number;
      promoCode?: string;
    }
  ): Promise<Order> => {
    const subtotal = getCartSubtotal();
    const discount = options.discountAmount ?? 0.00;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Number((discountedSubtotal * 0.085).toFixed(2));
    const deliveryFee = options.serviceType === 'DELIVERY' ? (options.deliveryFee ?? 3.00) : 0.00;
    const tip = options.tip ?? 0.00;
    const totalAmount = Number((discountedSubtotal + tax + deliveryFee + tip).toFixed(2));

    const orderNumber = `FD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      restaurantId,
      restaurantName,
      restaurantAddress,
      restaurantPhone,
      status: 'PENDING',
      serviceType: options.serviceType,
      tableNumber: options.tableNumber,
      tablePinEntered: options.tablePinEntered,
      isTableVerifiedByStaff: options.isTableVerifiedByStaff,
      dineInNotes: options.dineInNotes,
      pickupTime: options.pickupTime,
      restaurantDistrict: options.restaurantDistrict,
      deliveryDistrict: options.deliveryDistrict,
      isCrossDistrict: options.isCrossDistrict,
      routeDistanceKm: options.routeDistanceKm,
      runnerType: options.runnerType,
      items: cart.map(c => ({
        id: `oi_${Math.random().toString(36).substring(2, 8)}`,
        itemId: c.menuItem.id,
        itemName: c.menuItem.name,
        basePrice: c.menuItem.basePrice,
        unitPrice: c.menuItem.basePrice + c.selectedAddons.reduce((s, a) => s + a.priceDelta, 0),
        quantity: c.quantity,
        totalPrice: c.itemTotal,
        selectedAddons: c.selectedAddons,
        specialInstructions: c.specialInstructions,
      })),
      subtotal,
      discountAmount: discount,
      promoCode: options.promoCode,
      tax,
      deliveryFee,
      tip,
      totalAmount,
      paymentMethod: options.paymentMethod,
      paymentStatus: 'PAID',
      deliveryAddress: options.deliveryAddress,
      specialNotes: options.specialNotes,
      placedAt: new Date().toISOString(),
      estimatedDeliveryAt: options.serviceType === 'DELIVERY' ? new Date(Date.now() + 35 * 60 * 1000).toISOString() : undefined,
      estimatedReadyAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);
    clearCart();

    // Trigger visual confetti
    try {
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#E0562B', '#2F7A4F', '#C98B1F']
      });
    } catch {
      // safe fallback
    }

    recordAuditLog(
      customerName,
      'CUSTOMER',
      'ORDER_PLACED',
      'ORDER',
      newOrder.id,
      `Placed ${options.serviceType} order ${orderNumber} for $${totalAmount.toFixed(2)} at ${restaurantName}`,
      restaurantId
    );

    const serviceLabels = {
      DELIVERY: 'Delivery',
      DINE_IN: `Dine-In (${options.tableNumber || 'Table'})`,
      TAKEAWAY: 'Takeaway / Pickup',
    };

    dispatchNotification(
      customerId,
      `${serviceLabels[options.serviceType]} Order ${orderNumber} Placed! 🎉`,
      `Your order has been sent to ${restaurantName} for preparation.`,
      'ORDER_PLACED',
      newOrder.id
    );

    return newOrder;
  };

  // State Machine transition for orders
  const updateOrderStatus = (
    orderId: string, 
    newStatus: OrderStatus, 
    actorName = 'System Staff', 
    actorRole = 'EMPLOYEE',
    reason?: string
  ) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const updated: Order = {
            ...ord,
            status: newStatus,
            cancellationReason: reason || ord.cancellationReason,
          };
          if (newStatus === 'READY_FOR_PICKUP') {
            updated.readyAt = new Date().toISOString();
          } else if (newStatus === 'OUT_FOR_DELIVERY') {
            updated.pickedUpAt = new Date().toISOString();
          } else if (newStatus === 'DELIVERED') {
            updated.deliveredAt = new Date().toISOString();
          } else if (newStatus === 'CANCELLED' || newStatus === 'REJECTED') {
            delete updated.runnerLocation;
            if (updated.deliveryTelemetry) {
              updated.deliveryTelemetry = {
                ...updated.deliveryTelemetry,
                completedAt: new Date().toISOString()
              };
            }
          }
          return updated;
        }
        return ord;
      })
    );

    // Sync activeOrder if matched
    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        return { ...prev, status: newStatus, cancellationReason: reason || prev.cancellationReason };
      }
      return prev;
    });

    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      recordAuditLog(
        actorName,
        actorRole,
        `ORDER_STATUS_${newStatus}`,
        'ORDER',
        orderId,
        `Order ${targetOrder.orderNumber} status changed to ${newStatus}${reason ? `: ${reason}` : ''}`,
        targetOrder.restaurantId
      );

      // Customer notifications
      const statusMessages: Record<OrderStatus, { title: string; body: string }> = {
        PENDING: { title: 'Order Received', body: 'Order is waiting for kitchen confirmation.' },
        CONFIRMED: { title: 'Kitchen Confirmed', body: `${targetOrder.restaurantName} confirmed your order.` },
        PREPARING: { title: 'Kitchen is Cooking 🍳', body: `Your food is currently being prepared fresh.` },
        READY_FOR_PICKUP: { title: 'Food is Ready! 📦', body: `Order is boxed and waiting for pickup.` },
        OUT_FOR_DELIVERY: { title: 'Runner En Route 🛵', body: `Your delivery runner is on the way!` },
        DELIVERED: { title: 'Order Delivered! 🍽️', body: `Enjoy your meal! Please rate your experience.` },
        CANCELLED: { title: 'Order Cancelled', body: `Your order was cancelled${reason ? `: ${reason}` : ''}.` },
        REJECTED: { title: 'Order Declined', body: `The kitchen was unable to fulfill this order.` },
      };

      const msg = statusMessages[newStatus];
      if (msg) {
        dispatchNotification(targetOrder.customerId, msg.title, msg.body, `ORDER_${newStatus}`, targetOrder.id);
      }
    }
  };

  const claimRunnerJob = (
    orderId: string, 
    runnerId: string, 
    runnerName: string, 
    runnerPhone: string,
    runnerType: RunnerType = 'PLATFORM_PUBLIC'
  ) => {
    const target = orders.find(o => o.id === orderId);
    const pin = target?.handoffPin || target?.orderNumber?.replace(/\D/g, '') || String(Math.floor(1000 + Math.random() * 9000));
    const now = new Date().toISOString();

    const telemetry: DeliveryTelemetry = {
      milestone: 'ASSIGNED_HEADING_TO_RESTAURANT',
      lastPingAt: now,
      handoffPin: pin,
      distanceRemainingKm: target?.routeDistanceKm || 4.5,
      estimatedArrivalMins: 15,
      isNearbyProximityTriggered: false,
    };

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          return {
            ...ord,
            runnerId,
            runnerName,
            runnerPhone,
            runnerType,
            deliveryMilestone: 'ASSIGNED_HEADING_TO_RESTAURANT',
            deliveryTelemetry: telemetry,
            handoffPin: pin,
          };
        }
        return ord;
      })
    );

    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        return {
          ...prev,
          runnerId,
          runnerName,
          runnerPhone,
          runnerType,
          deliveryMilestone: 'ASSIGNED_HEADING_TO_RESTAURANT',
          deliveryTelemetry: telemetry,
          handoffPin: pin,
        };
      }
      return prev;
    });

    if (target) {
      recordAuditLog(
        runnerName,
        'RUNNER',
        'RUNNER_CLAIMED_DELIVERY',
        'ORDER',
        orderId,
        `Courier ${runnerName} accepted delivery mission for Order #${target.orderNumber}. Dispatched & Heading to store.`
      );
      dispatchNotification(
        target.customerId,
        'Courier Dispatched! 🛵',
        `${runnerName} accepted your delivery from ${target.restaurantName} and is en route to collect your order.`,
        'RUNNER_ASSIGNED',
        orderId,
        target.restaurantId
      );
      dispatchNotification(
        'staff_all',
        `Courier Heading to Store 🛵`,
        `Courier ${runnerName} is en route to pick up Order #${target.orderNumber}.`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    }
  };

  const updateRunnerMilestone = (
    orderId: string,
    milestone: RunnerDeliveryMilestone,
    coords?: { latitude: number; longitude: number },
    actorName?: string,
    note?: string
  ) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const runner = actorName || target.runnerName || 'Courier';
    const now = new Date().toISOString();
    const pin = target.handoffPin || target.orderNumber.replace(/\D/g, '') || '1234';

    let nextStatus: OrderStatus = target.status;
    let pickedUpAt = target.pickedUpAt;
    let deliveredAt = target.deliveredAt;

    if (milestone === 'PICKED_UP_EN_ROUTE') {
      nextStatus = 'OUT_FOR_DELIVERY';
      pickedUpAt = now;
    } else if (milestone === 'COMPLETED') {
      nextStatus = 'DELIVERED';
      deliveredAt = now;
    }

    const updatedTelemetry: DeliveryTelemetry = {
      ...(target.deliveryTelemetry || {
        milestone,
        lastPingAt: now,
        handoffPin: pin
      }),
      milestone,
      lastPingAt: now,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      isNearbyProximityTriggered: 
        milestone === 'NEARBY_APPROACHING' || milestone === 'ARRIVED_AT_DOORSTEP' 
          ? true 
          : target.deliveryTelemetry?.isNearbyProximityTriggered || false,
    };

    if (milestone === 'ARRIVED_AT_RESTAURANT') {
      updatedTelemetry.arrivedAtStoreAt = now;
    } else if (milestone === 'PICKED_UP_EN_ROUTE') {
      updatedTelemetry.pickedUpAt = now;
      updatedTelemetry.distanceRemainingKm = target.routeDistanceKm || 3.8;
      updatedTelemetry.estimatedArrivalMins = Math.max(5, Math.round((target.routeDistanceKm || 3.8) * 2.2));
    } else if (milestone === 'NEARBY_APPROACHING') {
      updatedTelemetry.proximityTriggeredAt = now;
      updatedTelemetry.distanceRemainingKm = 0.8;
      updatedTelemetry.estimatedArrivalMins = 3;
    } else if (milestone === 'ARRIVED_AT_DOORSTEP') {
      updatedTelemetry.arrivedAtDoorAt = now;
      updatedTelemetry.distanceRemainingKm = 0.05;
      updatedTelemetry.estimatedArrivalMins = 0;
    } else if (milestone === 'COMPLETED') {
      updatedTelemetry.completedAt = now;
      updatedTelemetry.proofType = 'PIN_VERIFIED';
    }

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const updated: Order = {
            ...ord,
            status: nextStatus,
            deliveryMilestone: milestone,
            deliveryTelemetry: updatedTelemetry,
            pickedUpAt,
            deliveredAt,
          };
          if (milestone === 'COMPLETED') {
            // Security & Privacy: Purge active continuous GPS location once delivered
            delete updated.runnerLocation;
          } else if (coords) {
            updated.runnerLocation = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              lastUpdatedAt: now,
            };
          }
          return updated;
        }
        return ord;
      })
    );

    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        const updated: Order = {
          ...prev,
          status: nextStatus,
          deliveryMilestone: milestone,
          deliveryTelemetry: updatedTelemetry,
          pickedUpAt,
          deliveredAt,
        };
        if (milestone === 'COMPLETED') {
          delete updated.runnerLocation;
        } else if (coords) {
          updated.runnerLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            lastUpdatedAt: now,
          };
        }
        return updated;
      }
      return prev;
    });

    // Milestone Event Notifications & Audit Logs:
    if (milestone === 'ARRIVED_AT_RESTAURANT') {
      recordAuditLog(
        runner,
        'RUNNER',
        'RUNNER_ARRIVED_AT_RESTAURANT',
        'ORDER',
        orderId,
        `Courier ${runner} is stationed at pickup counter for Order #${target.orderNumber}`,
        target.restaurantId
      );
      dispatchNotification(
        'staff_all',
        `🛵 Courier at Counter!`,
        `Courier ${runner} arrived at store for Order #${target.orderNumber}. Please expedite bagging & handover.`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
      dispatchNotification(
        target.customerId,
        `Courier at Restaurant 🥡`,
        `${runner} is at ${target.restaurantName}. Your dishes are being packaged and checked fresh.`,
        'ORDER_PREPARING',
        orderId,
        target.restaurantId
      );
    } else if (milestone === 'PICKED_UP_EN_ROUTE') {
      recordAuditLog(
        runner,
        'RUNNER',
        'RUNNER_DEPARTED_STORE',
        'ORDER',
        orderId,
        `Courier ${runner} collected dishes and departed towards customer for Order #${target.orderNumber}`
      );
      dispatchNotification(
        target.customerId,
        `Dishes on the Way! 🛵`,
        `${runner} collected your order from ${target.restaurantName} and is en route to your address.`,
        'ORDER_OUT_FOR_DELIVERY',
        orderId,
        target.restaurantId
      );
      dispatchNotification(
        'staff_all',
        `Handover Complete`,
        `Order #${target.orderNumber} successfully collected by ${runner}.`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    } else if (milestone === 'NEARBY_APPROACHING') {
      recordAuditLog(
        runner,
        'RUNNER',
        'RUNNER_PROXIMITY_ALERT',
        'ORDER',
        orderId,
        `Proximity geofence triggered: Courier ${runner} is approaching customer area (<1.5km) for Order #${target.orderNumber}`
      );
      dispatchNotification(
        target.customerId,
        `⚡ Courier is Nearby (~3 mins away)!`,
        `${runner} is approaching your simpang / street! Please prepare to receive. Safe Handoff PIN: ${pin}`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    } else if (milestone === 'ARRIVED_AT_DOORSTEP') {
      recordAuditLog(
        runner,
        'RUNNER',
        'RUNNER_ARRIVED_DOORSTEP',
        'ORDER',
        orderId,
        `Courier ${runner} reached doorstep/gate for Order #${target.orderNumber}. Doorbell rang.`
      );
      dispatchNotification(
        target.customerId,
        `🔔 Courier Arrived at Door / Gate!`,
        `${runner} is at your doorstep or gate. Please meet courier or provide PIN ${pin}.`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    } else if (milestone === 'COMPLETED') {
      recordAuditLog(
        runner,
        'RUNNER',
        'DELIVERY_COMPLETED_HANDOFF',
        'ORDER',
        orderId,
        `Order #${target.orderNumber} delivered safely. PIN ${pin} verified. Location telemetry purged.`,
        target.restaurantId
      );
      dispatchNotification(
        target.customerId,
        `Order Delivered! 🍕`,
        `Enjoy your meal from ${target.restaurantName}! Your handoff was verified. Live tracking closed.`,
        'ORDER_DELIVERED',
        orderId,
        target.restaurantId
      );
    }
  };

  const requestOnDemandLocationPing = (orderId: string, actorName = 'Platform Admin') => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const now = new Date().toISOString();

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId && ord.deliveryTelemetry) {
          return {
            ...ord,
            deliveryTelemetry: {
              ...ord.deliveryTelemetry,
              lastPingAt: now,
            }
          };
        }
        return ord;
      })
    );

    recordAuditLog(
      actorName,
      'SUPER_ADMIN',
      'ON_DEMAND_PING_REQUESTED',
      'ORDER',
      orderId,
      `Requested on-demand status ping for active delivery Order #${target.orderNumber} (Courier: ${target.runnerName || 'Unassigned'})`
    );
  };

  const uploadProofOfDelivery = (orderId: string, proofUrl: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          return {
            ...ord,
            proofOfDeliveryUrl: proofUrl,
            status: 'DELIVERED',
            deliveredAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );

    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        return {
          ...prev,
          proofOfDeliveryUrl: proofUrl,
          status: 'DELIVERED',
          deliveredAt: new Date().toISOString(),
        };
      }
      return prev;
    });
  };

  const cancelOrder = (orderId: string, reason: string, cancelledByCustomer = false): boolean => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return false;

    // Rules: Customer can only cancel directly if status is PENDING
    if (cancelledByCustomer && target.status !== 'PENDING') {
      return false;
    }

    const actor = cancelledByCustomer ? (target.customerName || 'Customer') : 'Manager';
    const role = cancelledByCustomer ? 'CUSTOMER' : 'RESTAURANT_OWNER';
    const now = new Date().toISOString();
    const fullRefund = target.totalAmount;

    // Runner Protection: If runner was already assigned or on the way, guarantee their fee
    let runnerCompensation: number | undefined = undefined;
    if (target.runnerId) {
      if (target.status === 'OUT_FOR_DELIVERY' || target.deliveryMilestone === 'PICKED_UP_EN_ROUTE' || target.deliveryMilestone === 'ARRIVED_AT_RESTAURANT') {
        runnerCompensation = target.deliveryFee || 3.50;
      }
      
      dispatchNotification(
        target.runnerId,
        runnerCompensation ? `Mission Cancelled • Guaranteed Payout 💰` : 'Mission Cancelled 🚫',
        runnerCompensation 
          ? `Order #${target.orderNumber} was cancelled. Your courier fee of $${runnerCompensation.toFixed(2)} is protected and credited to your Runner Wallet!`
          : `Order #${target.orderNumber} was cancelled in queue. Ticket released.`,
        'RUNNER_COMPENSATION',
        target.id,
        target.restaurantId
      );
    }

    // Update order with cancellation & refund data
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id === orderId) {
          const updated: Order = {
            ...ord,
            status: 'CANCELLED',
            cancellationReason: reason,
            cancellationRequested: false,
            cancellationRequestStatus: 'APPROVED',
            refundAmount: fullRefund,
            refundStatus: 'PROCESSED',
            refundProcessedAt: now,
            refundMethod: target.paymentMethod === 'CASH_ON_DELIVERY' ? 'CASH_VOID' : 'ORIGINAL_PAYMENT_METHOD',
            runnerCompensationPaid: runnerCompensation,
          };
          delete updated.runnerLocation;
          return updated;
        }
        return ord;
      })
    );

    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        const updated: Order = {
          ...prev,
          status: 'CANCELLED',
          cancellationReason: reason,
          cancellationRequested: false,
          cancellationRequestStatus: 'APPROVED',
          refundAmount: fullRefund,
          refundStatus: 'PROCESSED',
          refundProcessedAt: now,
          refundMethod: target.paymentMethod === 'CASH_ON_DELIVERY' ? 'CASH_VOID' : 'ORIGINAL_PAYMENT_METHOD',
          runnerCompensationPaid: runnerCompensation,
        };
        delete updated.runnerLocation;
        return updated;
      }
      return prev;
    });

    recordAuditLog(
      actor,
      role,
      'ORDER_CANCELLED',
      'ORDER',
      orderId,
      `Order #${target.orderNumber} cancelled (${reason}). Full 100% refund of $${fullRefund.toFixed(2)} issued to ${target.paymentMethod}.`,
      target.restaurantId
    );

    // Notify restaurant kitchen
    dispatchNotification(
      'staff_all',
      `Order Cancelled #${target.orderNumber} ❌`,
      `${actor} cancelled Order #${target.orderNumber} (${reason}). Ticket removed from queue.`,
      'ORDER_CANCELLED',
      target.id,
      target.restaurantId
    );

    // Notify customer
    dispatchNotification(
      target.customerId,
      `Order Cancelled & Refunded 💳`,
      `Order #${target.orderNumber} was cancelled. Full refund of $${fullRefund.toFixed(2)} processed to your account.`,
      'REFUND_PROCESSED',
      target.id,
      target.restaurantId
    );

    return true;
  };

  const requestOrderCancellation = async (orderId: string, reason: string, requestedBy = 'Customer'): Promise<boolean> => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cancellationRequested: true,
          cancellationRequestedAt: now,
          cancellationRequestReason: reason,
          cancellationRequestStatus: 'PENDING_REVIEW'
        };
      }
      return o;
    }));

    setActiveOrder(prev => {
      if (prev && prev.id === orderId) {
        return {
          ...prev,
          cancellationRequested: true,
          cancellationRequestedAt: now,
          cancellationRequestReason: reason,
          cancellationRequestStatus: 'PENDING_REVIEW'
        };
      }
      return prev;
    });

    recordAuditLog(
      requestedBy,
      'CUSTOMER',
      'CANCELLATION_REVIEW_REQUESTED',
      'ORDER',
      orderId,
      `Customer requested cancellation review for active Order #${target.orderNumber} (Status: ${target.status}): "${reason}"`,
      target.restaurantId
    );

    // Urgent notification to restaurant kitchen staff
    dispatchNotification(
      'staff_all',
      `⚠️ Customer Cancellation Request: Order #${target.orderNumber}`,
      `Customer requested cancellation: "${reason}". Please review and confirm in Kitchen Display System.`,
      'CANCELLATION_REQUESTED',
      orderId,
      target.restaurantId
    );

    // If runner assigned, inform runner
    if (target.runnerId) {
      dispatchNotification(
        target.runnerId,
        `⚠️ Order #${target.orderNumber} Cancellation Review`,
        `Customer requested cancellation review. Please standby for kitchen decision.`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    }

    // Acknowledge customer
    dispatchNotification(
      target.customerId,
      `Cancellation Request Received ⏳`,
      `Your cancellation request for Order #${target.orderNumber} was submitted to ${target.restaurantName}. Kitchen staff are reviewing.`,
      'SYSTEM_ALERT',
      orderId,
      target.restaurantId
    );

    return true;
  };

  const resolveCancellationRequest = (
    orderId: string, 
    decision: 'APPROVE' | 'REJECT', 
    note = '', 
    actorName = 'Staff'
  ) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    if (decision === 'APPROVE') {
      cancelOrder(orderId, `Kitchen Approved Request: ${note || target.cancellationRequestReason || 'Customer requested cancel'}`, false);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, cancellationRequested: false, cancellationRequestStatus: 'APPROVED' } : o));
      setActiveOrder(prev => prev && prev.id === orderId ? { ...prev, cancellationRequested: false, cancellationRequestStatus: 'APPROVED' } : prev);
      
      dispatchNotification(
        target.customerId,
        `Cancellation Approved & Refunded ✅`,
        `${target.restaurantName} approved your cancellation request. 100% refund of $${target.totalAmount.toFixed(2)} processed.`,
        'CANCELLATION_APPROVED',
        orderId,
        target.restaurantId
      );
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, cancellationRequested: false, cancellationRequestStatus: 'REJECTED' } : o));
      setActiveOrder(prev => prev && prev.id === orderId ? { ...prev, cancellationRequested: false, cancellationRequestStatus: 'REJECTED' } : prev);
      
      recordAuditLog(
        actorName,
        'EMPLOYEE',
        'CANCELLATION_REQUEST_REJECTED',
        'ORDER',
        orderId,
        `Staff declined cancellation request for Order #${target.orderNumber}: "${note || 'Food already cooked'}"`,
        target.restaurantId
      );

      dispatchNotification(
        target.customerId,
        `Cancellation Request Declined ⚠️`,
        `${target.restaurantName} was unable to cancel Order #${target.orderNumber} because preparation is complete. ${note ? `Note: ${note}` : ''}`,
        'CANCELLATION_REJECTED',
        orderId,
        target.restaurantId
      );
    }
  };

  const cancelOrderEnRouteWithProtection = (orderId: string, reason: string, actorName = 'Emergency Override') => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const runnerPayout = target.deliveryFee || 3.50;
    const now = new Date().toISOString();

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledEnRoute: true,
          runnerCompensationPaid: runnerPayout,
          refundAmount: Math.max(0, target.totalAmount - runnerPayout),
          refundStatus: 'PROCESSED',
          refundProcessedAt: now,
          refundMethod: 'PARTIAL_REFUND_WITH_RUNNER_PROTECTION'
        };
      }
      return o;
    }));

    setActiveOrder(prev => prev && prev.id === orderId ? {
      ...prev,
      status: 'CANCELLED',
      cancellationReason: reason,
      cancelledEnRoute: true,
      runnerCompensationPaid: runnerPayout,
      refundAmount: Math.max(0, target.totalAmount - runnerPayout),
      refundStatus: 'PROCESSED',
      refundProcessedAt: now,
    } : prev);

    if (target.runnerId) {
      dispatchNotification(
        target.runnerId,
        `En Route Cancelled • $${runnerPayout.toFixed(2)} Guaranteed Payout 💰`,
        `Order #${target.orderNumber} was cancelled by customer while you were en route. Your full delivery fee ($${runnerPayout.toFixed(2)}) is guaranteed and credited to your Runner Wallet!`,
        'RUNNER_COMPENSATION',
        orderId,
        target.restaurantId
      );
    }

    dispatchNotification(
      target.customerId,
      `Order Cancelled En Route 🛵`,
      `Order #${target.orderNumber} was cancelled while in transit. Courier compensation of $${runnerPayout.toFixed(2)} was applied; remaining balance refunded.`,
      'ORDER_CANCELLED',
      orderId,
      target.restaurantId
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getOrdersByRestaurant = (restaurantId: string) => {
    return orders.filter(o => o.restaurantId === restaurantId);
  };

  const createStaffOrder = (params: {
    restaurantId: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    serviceType: ServiceType;
    tableNumber?: string;
    dineInNotes?: string;
    customerName?: string;
    customerPhone?: string;
    items: OrderItem[];
    waiterName?: string;
    specialNotes?: string;
    tax?: number;
  }): Order => {
    const subtotal = params.items.reduce((sum, it) => sum + it.totalPrice, 0);
    const tax = params.tax !== undefined ? Number(params.tax.toFixed(2)) : 0;
    const totalAmount = Number((subtotal + tax).toFixed(2));
    const orderNumber = `FD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord_staff_${Date.now()}`,
      orderNumber,
      customerId: 'usr_walkin',
      customerName: params.customerName || (params.serviceType === 'DINE_IN' ? `Table ${params.tableNumber || 'Walk-in'}` : 'Takeaway Guest'),
      customerPhone: params.customerPhone || '+673 200 0000',
      customerEmail: 'walkin@restaurant.local',
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      restaurantAddress: params.restaurantAddress,
      restaurantPhone: params.restaurantPhone,
      status: 'PENDING',
      serviceType: params.serviceType,
      tableNumber: params.tableNumber,
      dineInNotes: params.dineInNotes,
      items: params.items,
      subtotal,
      discountAmount: 0,
      tax,
      deliveryFee: 0,
      tip: 0,
      totalAmount,
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
      specialNotes: params.specialNotes,
      placedAt: new Date().toISOString(),
      estimatedReadyAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);

    recordAuditLog(
      params.waiterName || 'Staff Member',
      'EMPLOYEE',
      'STAFF_CREATED_ORDER',
      'ORDER',
      newOrder.id,
      `Staff ${params.waiterName || 'Staff'} created ${params.serviceType === 'DINE_IN' ? `Dine-In order for Table ${params.tableNumber || '-'}` : 'Takeaway order'} #${orderNumber} ($${totalAmount.toFixed(2)})`,
      params.restaurantId
    );

    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch (_) {}

    return newOrder;
  };

  const updateOrderItems = (
    orderId: string,
    newItems: OrderItem[],
    changeReason?: string,
    actorName = 'Staff'
  ) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;

        if (newItems.length === 0) {
          return {
            ...ord,
            items: [],
            subtotal: 0,
            tax: 0,
            totalAmount: 0,
            status: 'CANCELLED',
            cancellationReason: changeReason || 'All items cancelled by staff',
          };
        }

        const subtotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const discount = ord.discountAmount || 0;
        const discountedSubtotal = Math.max(0, subtotal - discount);
        const tax = Number((discountedSubtotal * 0.085).toFixed(2));
        const totalAmount = Number((discountedSubtotal + tax + ord.deliveryFee + ord.tip).toFixed(2));

        return {
          ...ord,
          items: newItems,
          subtotal,
          tax,
          totalAmount,
        };
      })
    );

    setActiveOrder(prev => {
      if (!prev || prev.id !== orderId) return prev;
      if (newItems.length === 0) {
        return {
          ...prev,
          items: [],
          subtotal: 0,
          tax: 0,
          totalAmount: 0,
          status: 'CANCELLED',
          cancellationReason: changeReason || 'All items cancelled by staff',
        };
      }
      const subtotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
      const discount = prev.discountAmount || 0;
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const tax = Number((discountedSubtotal * 0.085).toFixed(2));
      const totalAmount = Number((discountedSubtotal + tax + prev.deliveryFee + prev.tip).toFixed(2));
      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        totalAmount,
      };
    });

    const target = orders.find(o => o.id === orderId);
    if (target) {
      recordAuditLog(
        actorName,
        'EMPLOYEE',
        'ORDER_ITEMS_MODIFIED',
        'ORDER',
        orderId,
        `${actorName} updated items on Order #${target.orderNumber}${changeReason ? `: ${changeReason}` : ''}`,
        target.restaurantId
      );
      dispatchNotification(
        target.customerId,
        'Order Updated by Staff',
        `Items on order #${target.orderNumber} were modified by table staff.`,
        'ORDER_UPDATED',
        orderId
      );
    }
  };

  const updateOrderTableNumber = (orderId: string, newTableNumber: string, actorName = 'Staff') => {
    setOrders(prev =>
      prev.map(ord => (ord.id === orderId ? { ...ord, tableNumber: newTableNumber } : ord))
    );
    setActiveOrder(prev => (prev && prev.id === orderId ? { ...prev, tableNumber: newTableNumber } : prev));

    const target = orders.find(o => o.id === orderId);
    if (target) {
      recordAuditLog(
        actorName,
        'EMPLOYEE',
        'ORDER_TABLE_CHANGED',
        'ORDER',
        orderId,
        `Table reassigned to Table ${newTableNumber} for Order #${target.orderNumber}`,
        target.restaurantId
      );
    }
  };

  const appendItemsToExistingOrder = (orderId: string, extraItems: OrderItem[], note?: string) => {
    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        const combined = [...ord.items, ...extraItems];
        const subtotal = combined.reduce((sum, i) => sum + i.totalPrice, 0);
        const discount = ord.discountAmount || 0;
        const discountedSubtotal = Math.max(0, subtotal - discount);
        const tax = Number((discountedSubtotal * 0.085).toFixed(2));
        const totalAmount = Number((discountedSubtotal + tax + ord.deliveryFee + ord.tip).toFixed(2));
        return {
          ...ord,
          items: combined,
          subtotal,
          tax,
          totalAmount,
          specialNotes: note ? (ord.specialNotes ? `${ord.specialNotes} | Extra: ${note}` : `Extra: ${note}`) : ord.specialNotes,
        };
      })
    );

    setActiveOrder(prev => {
      if (!prev || prev.id !== orderId) return prev;
      const combined = [...prev.items, ...extraItems];
      const subtotal = combined.reduce((sum, i) => sum + i.totalPrice, 0);
      const discount = prev.discountAmount || 0;
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const tax = Number((discountedSubtotal * 0.085).toFixed(2));
      const totalAmount = Number((discountedSubtotal + tax + prev.deliveryFee + prev.tip).toFixed(2));
      return {
        ...prev,
        items: combined,
        subtotal,
        tax,
        totalAmount,
        specialNotes: note ? (prev.specialNotes ? `${prev.specialNotes} | Extra: ${note}` : `Extra: ${note}`) : prev.specialNotes,
      };
    });

    const target = orders.find(o => o.id === orderId);
    if (target) {
      const extraItemsSummary = extraItems.map(i => `${i.quantity}x ${i.itemName}`).join(', ');
      recordAuditLog(
        target.customerName || 'Customer',
        'CUSTOMER',
        'ORDER_ITEMS_APPENDED',
        'ORDER',
        orderId,
        `Customer added extra items to Order #${target.orderNumber}: ${extraItemsSummary}`,
        target.restaurantId
      );
      dispatchNotification(
        'staff_all',
        `Extra Order for Table ${target.tableNumber || target.orderNumber}`,
        `New dishes added: ${extraItemsSummary}`,
        'SYSTEM_ALERT',
        orderId,
        target.restaurantId
      );
    }
  };

  const callStaffForAssistance = (
    orderId: string,
    requestType: 'CALL_WAITER' | 'REQUEST_BILL' | 'EXTRA_CUTLERY_WATER',
    details?: string
  ) => {
    const target = orders.find(o => o.id === orderId);
    const tableLabel = target?.tableNumber ? `Table ${target.tableNumber}` : 'Customer Ticket';
    const typeLabels: Record<string, string> = {
      CALL_WAITER: '🛎️ Waiter Assistance Requested',
      REQUEST_BILL: '🧾 Bill & Receipt Requested',
      EXTRA_CUTLERY_WATER: '💧 Water & Cutlery Needed',
    };

    recordAuditLog(
      target?.customerName || 'Guest',
      'CUSTOMER',
      'STAFF_SERVICE_CALL',
      'ORDER',
      orderId,
      `${typeLabels[requestType]} at ${tableLabel}${details ? `: ${details}` : ''}`,
      target?.restaurantId
    );

    dispatchNotification(
      'staff_all',
      `${typeLabels[requestType]} - ${tableLabel}`,
      `${target?.customerName || 'Diner'} at ${tableLabel} requested service${details ? `: ${details}` : ''}.`,
      'SYSTEM_ALERT',
      orderId,
      target?.restaurantId
    );
  };

  const settleOrderWithCash = (
    orderId: string,
    params: {
      cashTendered: number;
      changeReturned: number;
      cashierName: string;
      paymentMethod?: PaymentMethodType;
      status?: OrderStatus;
      customPaymentChannelName?: string;
      paymentReference?: string;
    }
  ) => {
    const now = new Date().toISOString();
    const finalMethod = params.paymentMethod || 'CASH_ON_DELIVERY';
    const finalStatus: OrderStatus = params.status || 'DELIVERED';

    setOrders(prev =>
      prev.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          paymentStatus: 'PAID',
          paymentMethod: finalMethod,
          status: finalStatus,
          cashTendered: params.cashTendered,
          changeReturned: params.changeReturned,
          settledBy: params.cashierName,
          settledAt: now,
          deliveredAt: finalStatus === 'DELIVERED' ? now : ord.deliveredAt,
          customPaymentChannelName: params.customPaymentChannelName,
          paymentReference: params.paymentReference,
        };
      })
    );

    setActiveOrder(prev => {
      if (!prev || prev.id !== orderId) return prev;
      return {
        ...prev,
        paymentStatus: 'PAID',
        paymentMethod: finalMethod,
        status: finalStatus,
        cashTendered: params.cashTendered,
        changeReturned: params.changeReturned,
        settledBy: params.cashierName,
        settledAt: now,
        deliveredAt: finalStatus === 'DELIVERED' ? now : prev.deliveredAt,
        customPaymentChannelName: params.customPaymentChannelName,
        paymentReference: params.paymentReference,
      };
    });

    const target = orders.find(o => o.id === orderId);
    if (target) {
      const displayMethod = params.customPaymentChannelName || finalMethod;
      recordAuditLog(
        params.cashierName || 'Cashier',
        'EMPLOYEE',
        'CASHIER_PAYMENT_SETTLED',
        'ORDER',
        orderId,
        `Register checkout: Order #${target.orderNumber} settled ($${target.totalAmount.toFixed(2)}) via ${displayMethod}${params.paymentReference ? ` [Ref: ${params.paymentReference}]` : ''}. Cash Tendered: $${params.cashTendered.toFixed(2)}, Change Returned: $${params.changeReturned.toFixed(2)}`,
        target.restaurantId
      );

      dispatchNotification(
        'staff_all',
        `💰 Payment Received: Order #${target.orderNumber}`,
        `${target.serviceType === 'DINE_IN' ? `Table ${target.tableNumber || ''}` : 'Counter Order'} settled at cash register via ${displayMethod} by ${params.cashierName} ($${target.totalAmount.toFixed(2)}).`,
        'ORDER_DELIVERED',
        orderId,
        target.restaurantId
      );
    }

    try {
      confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 } });
    } catch (_) {}
  };

  const createAndSettleCounterOrder = (params: {
    restaurantId: string;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    serviceType: ServiceType;
    tableNumber?: string;
    customerName?: string;
    items: OrderItem[];
    subtotal?: number;
    tax?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod: PaymentMethodType;
    cashTendered: number;
    changeReturned: number;
    cashierName: string;
    specialNotes?: string;
    markAsDelivered?: boolean;
    customPaymentChannelName?: string;
    paymentReference?: string;
  }): Order => {
    const calcSubtotal = params.subtotal !== undefined 
      ? params.subtotal 
      : params.items.reduce((sum, it) => sum + it.totalPrice, 0);
    const calcTax = params.tax !== undefined ? params.tax : 0;
    const now = new Date().toISOString();
    const orderNumber = `FD-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalStatus: OrderStatus = params.markAsDelivered !== false ? 'DELIVERED' : 'PREPARING';

    const newOrder: Order = {
      id: `ord_cashier_${Date.now()}`,
      orderNumber,
      customerId: 'usr_walkin',
      customerName: params.customerName || (params.serviceType === 'DINE_IN' ? `Table ${params.tableNumber || 'Walk-in'}` : 'Counter Walk-in'),
      customerPhone: '+673 200 0000',
      customerEmail: 'counter@restaurant.local',
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName,
      restaurantAddress: params.restaurantAddress,
      restaurantPhone: params.restaurantPhone,
      status: finalStatus,
      serviceType: params.serviceType,
      tableNumber: params.tableNumber,
      items: params.items,
      subtotal: calcSubtotal,
      discountAmount: params.discountAmount || 0,
      tax: calcTax,
      deliveryFee: 0,
      tip: 0,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'PAID',
      specialNotes: params.specialNotes,
      placedAt: now,
      deliveredAt: finalStatus === 'DELIVERED' ? now : undefined,
      cashTendered: params.cashTendered,
      changeReturned: params.changeReturned,
      settledBy: params.cashierName,
      settledAt: now,
      customPaymentChannelName: params.customPaymentChannelName,
      paymentReference: params.paymentReference,
    };

    setOrders(prev => [newOrder, ...prev]);

    const displayMethod = params.customPaymentChannelName || params.paymentMethod;
    recordAuditLog(
      params.cashierName || 'Cashier',
      'EMPLOYEE',
      'CASHIER_COUNTER_SALE',
      'ORDER',
      newOrder.id,
      `Counter POS sale #${orderNumber} ($${params.totalAmount.toFixed(2)}) settled via ${displayMethod}${params.paymentReference ? ` [Ref: ${params.paymentReference}]` : ''} by ${params.cashierName}. Cash Tendered: $${params.cashTendered.toFixed(2)}, Change Returned: $${params.changeReturned.toFixed(2)}`,
      params.restaurantId
    );

    try {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } });
    } catch (_) {}

    return newOrder;
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        cart,
        cartRestaurantId,
        cartServiceType,
        setCartServiceType,
        cartTableNumber,
        setCartTableNumber,
        cartPickupTime,
        setCartPickupTime,
        hasScannedTableQr,
        setHasScannedTableQr,
        scannedTableNumber,
        tableSessionStartedAt,
        tableSessionEpoch,
        verifyTableQrSession,
        clearTableQrSession,
        isTableSessionExpired,
        activeOrder,
        auditLogs,
        notifications,
        activePopupNotif,
        dismissPopupNotif,
        soundEnabled,
        setSoundEnabled,
        testNotificationSound,
        requestDesktopPermission,
        desktopPermission,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        getCartSubtotal,
        placeOrder,
        updateOrderStatus,
        claimRunnerJob,
        updateRunnerMilestone,
        requestOnDemandLocationPing,
        uploadProofOfDelivery,
        cancelOrder,
        requestOrderCancellation,
        resolveCancellationRequest,
        cancelOrderEnRouteWithProtection,
        getOrdersByRestaurant,
        createStaffOrder,
        updateOrderItems,
        updateOrderTableNumber,
        appendItemsToExistingOrder,
        callStaffForAssistance,
        settleOrderWithCash,
        createAndSettleCounterOrder,
        setActiveOrder,
        markNotificationAsRead,
        clearAllNotifications,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
