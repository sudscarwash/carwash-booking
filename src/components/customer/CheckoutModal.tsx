import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { usePlatform } from '../../context/PlatformContext';
import { PaymentMethodType, DeliveryAddress, ServiceType, Promotion } from '../../types';
import { getDistrictRoute, BRUNEI_DISTRICTS } from '../../utils/districtRates';
import { SHOW_DEMO_ACCOUNTS } from '../../config/environment';
import { 
  X, 
  CreditCard, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Check, 
  ArrowRight,
  DollarSign,
  AlertCircle,
  Utensils,
  ShoppingBag,
  Bike,
  Clock,
  Info,
  Tag,
  Percent,
  CheckCircle2,
  Crosshair,
  Navigation,
  Compass,
  Users
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted,
}) => {
  if (!isOpen) return null;

  const { currentUser } = useAuth();
  const { 
    orders,
    cart, 
    cartRestaurantId, 
    getCartSubtotal, 
    placeOrder, 
    cartServiceType, 
    setCartServiceType, 
    cartTableNumber, 
    setCartTableNumber, 
    cartPickupTime, 
    setCartPickupTime,
    hasScannedTableQr,
    isTableSessionExpired
  } = useOrders();
  const { getRestaurantById, getPromotionsByRestaurant } = useRestaurants();
  const { config } = usePlatform();

  const currentRestaurant = cartRestaurantId ? getRestaurantById(cartRestaurantId) : null;
  const availablePromos = currentRestaurant ? getPromotionsByRestaurant(currentRestaurant.id) : [];

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);

  // Supported services from restaurant
  const supportedServices: ServiceType[] = currentRestaurant?.supportedServices || ['DELIVERY', 'TAKEAWAY', 'DINE_IN'];
  
  // Selected Service initialized from cartServiceType (only allow DINE_IN if hasScannedTableQr is true)
  const [selectedService, setSelectedService] = useState<ServiceType>(() => {
    if (cartServiceType === 'DINE_IN' && hasScannedTableQr) return 'DINE_IN';
    if (supportedServices.includes('DELIVERY')) return 'DELIVERY';
    if (supportedServices.includes('TAKEAWAY')) return 'TAKEAWAY';
    if (hasScannedTableQr && supportedServices.includes('DINE_IN')) return 'DINE_IN';
    return supportedServices[0] || 'DELIVERY';
  });

  // Dine In Details & Table Security (locked to verified scanned table)
  const [tableNumber, setTableNumber] = useState(cartTableNumber || '');
  const [dineInNotes, setDineInNotes] = useState('');
  const [tablePinInput, setTablePinInput] = useState('');
  const [tablePinError, setTablePinError] = useState<string | null>(null);

  const currentTableObj = currentRestaurant?.tables?.find(t => 
    t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    t.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  const expectedTablePin = currentTableObj?.tablePin || (currentTableObj ? `4${(currentTableObj.tableNumber || '1').replace(/\D/g, '').padStart(3, '0')}` : '4821');

  // Check for multi-user active session on this table
  const activeTableOrder = orders.find(o => 
    o.restaurantId === currentRestaurant?.id &&
    o.serviceType === 'DINE_IN' &&
    o.tableNumber &&
    o.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '') &&
    !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)
  );

  // Takeaway Details
  const [pickupTime, setPickupTime] = useState(cartPickupTime || 'As soon as ready (~20 mins)');

  // Delivery Form State (In production, start clean; in dev demo mode, pre-fill sample for testing)
  const [fullName, setFullName] = useState(() => {
    if (currentUser.firstName && currentUser.id !== 'usr_guest') {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return SHOW_DEMO_ACCOUNTS ? 'Sarah Jenkins' : '';
  });
  const [phone, setPhone] = useState(() => {
    if (currentUser.phone) return currentUser.phone;
    return SHOW_DEMO_ACCOUNTS ? '+673 892 3456' : '';
  });
  const [district, setDistrict] = useState<string>('Brunei-Muara');
  const [street, setStreet] = useState(SHOW_DEMO_ACCOUNTS ? 'Jalan Mabohai' : '');
  const [simpang, setSimpang] = useState(SHOW_DEMO_ACCOUNTS ? 'Simpang 58' : '');
  const [kampong, setKampong] = useState(SHOW_DEMO_ACCOUNTS ? 'Kampong Mabohai' : '');
  const [landmark, setLandmark] = useState(SHOW_DEMO_ACCOUNTS ? 'Opposite Mabohai Shopping Complex, Yellow Gate' : '');
  const [aptOrSuite, setAptOrSuite] = useState(SHOW_DEMO_ACCOUNTS ? 'Villa 4B' : '');
  const [city, setCity] = useState(SHOW_DEMO_ACCOUNTS ? 'Bandar Seri Begawan' : '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    SHOW_DEMO_ACCOUNTS ? 'Gate code #4012. Ring doorbell upon dropoff.' : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH_ON_DELIVERY');
  const [tipAmount, setTipAmount] = useState<number>(2.00);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lightweight GPS Coordinates (4-decimal precision = ~11m accuracy, negligible data size ~16 bytes)
  const [geoCoords, setGeoCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 4.8912,
    longitude: 114.9382,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationSource, setLocationSource] = useState<'AUTO_GPS' | 'MANUAL' | 'DEFAULT'>('DEFAULT');

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to 4 decimal places for compact transmission (under 32 bytes)
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        setGeoCoords({ latitude: lat, longitude: lng });
        setLocationSource('AUTO_GPS');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Browser GPS permission declined or unavailable; maintaining district calibrated coordinates', err);
        // Fallback default coordinates within district
        setGeoCoords({ latitude: 4.8903, longitude: 114.9402 });
        setLocationSource('DEFAULT');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const restaurantDistrict = currentRestaurant?.address?.district || 'Brunei-Muara';
  const routeInfo = useMemo(() => {
    return getDistrictRoute(restaurantDistrict, district);
  }, [restaurantDistrict, district]);

  // Calculate delivery fee based on selected district and cross-district routing
  const districtRate = useMemo(() => {
    if (selectedService !== 'DELIVERY') return { fee: 0, time: '', isCrossDistrict: false, distanceKm: 0, description: '' };
    
    // Check restaurant specific rates first
    const restRate = currentRestaurant?.districtDeliveryRates?.find(r => r.district === district);
    if (restRate && restRate.isAvailable) {
      return { 
        fee: restRate.fee, 
        time: `${restRate.estimatedMinMinutes}-${restRate.estimatedMaxMinutes} mins`,
        isCrossDistrict: routeInfo.isCrossDistrict,
        distanceKm: routeInfo.distanceKm,
        description: routeInfo.description
      };
    }

    // Standard platform route pricing
    return {
      fee: routeInfo.defaultFee,
      time: routeInfo.estimatedMinutes,
      isCrossDistrict: routeInfo.isCrossDistrict,
      distanceKm: routeInfo.distanceKm,
      description: routeInfo.description
    };
  }, [selectedService, district, currentRestaurant, routeInfo]);

  const rawSubtotal = getCartSubtotal();
  const rawDeliveryFee = selectedService === 'DELIVERY' ? districtRate.fee : 0.00;

  // Calculate discount from applied promotion
  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (rawSubtotal < appliedPromo.minSpend) return 0;

    // Check service type match
    if (appliedPromo.serviceTypes && !appliedPromo.serviceTypes.includes(selectedService)) {
      return 0;
    }

    if (appliedPromo.type === 'PERCENTAGE') {
      const calc = (rawSubtotal * appliedPromo.value) / 100;
      if (appliedPromo.maxDiscount && calc > appliedPromo.maxDiscount) {
        return appliedPromo.maxDiscount;
      }
      return Number(calc.toFixed(2));
    } else if (appliedPromo.type === 'FIXED_AMOUNT') {
      return Math.min(rawSubtotal, appliedPromo.value);
    } else if (appliedPromo.type === 'FREE_DELIVERY') {
      return rawDeliveryFee;
    }
    return 0;
  }, [appliedPromo, rawSubtotal, selectedService, rawDeliveryFee]);

  const subtotal = rawSubtotal;
  const discountedFoodTotal = Math.max(0, rawSubtotal - (appliedPromo?.type !== 'FREE_DELIVERY' ? discountAmount : 0));
  const tax = Number((discountedFoodTotal * 0.085).toFixed(2));
  const effectiveDeliveryFee = appliedPromo?.type === 'FREE_DELIVERY' ? 0.00 : rawDeliveryFee;
  const total = Number((discountedFoodTotal + tax + effectiveDeliveryFee + (selectedService === 'DELIVERY' ? tipAmount : 0)).toFixed(2));

  // Apply Promo Handler
  const handleApplyPromo = (codeToApply?: string) => {
    const targetCode = (codeToApply || promoCodeInput).trim().toUpperCase();
    setPromoError(null);
    setPromoSuccessMsg(null);

    if (!targetCode) {
      setPromoError('Please enter a voucher code');
      return;
    }

    const foundPromo = availablePromos.find(p => p.code.toUpperCase() === targetCode);
    if (!foundPromo) {
      setPromoError(`Code "${targetCode}" is invalid for this restaurant.`);
      setAppliedPromo(null);
      return;
    }

    if (!foundPromo.isActive) {
      setPromoError(`Code "${targetCode}" is no longer active.`);
      setAppliedPromo(null);
      return;
    }

    if (new Date(foundPromo.endDate) < new Date()) {
      setPromoError(`Code "${targetCode}" has expired.`);
      setAppliedPromo(null);
      return;
    }

    if (rawSubtotal < foundPromo.minSpend) {
      setPromoError(`Minimum spend of $${foundPromo.minSpend.toFixed(2)} required for this coupon.`);
      setAppliedPromo(null);
      return;
    }

    if (foundPromo.serviceTypes && !foundPromo.serviceTypes.includes(selectedService)) {
      setPromoError(`Coupon applies only to: ${foundPromo.serviceTypes.join(', ')}`);
      setAppliedPromo(null);
      return;
    }

    setAppliedPromo(foundPromo);
    setPromoCodeInput(foundPromo.code);
    setPromoSuccessMsg(`Coupon applied: ${foundPromo.title}!`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoSuccessMsg(null);
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRestaurant) return;

    setIsSubmitting(true);

    const deliveryAddress: DeliveryAddress | undefined = selectedService === 'DELIVERY' ? {
      fullName,
      phone,
      street,
      aptOrSuite,
      city,
      district,
      state: district,
      zipCode: 'BA1111',
      simpang: simpang || undefined,
      kampong: kampong || undefined,
      landmark: landmark || undefined,
      instructions: deliveryInstructions,
      latitude: geoCoords.latitude,
      longitude: geoCoords.longitude,
    } : undefined;

    const effectiveCustomerName = fullName.trim() || (selectedService === 'DINE_IN' ? `Diner (${tableNumber})` : 'Guest Customer');
    const effectivePhone = phone.trim() || (selectedService === 'DINE_IN' ? '-' : '+673 800 0000');
    const effectiveEmail = currentUser.email || 'guest@foodfindr.bn';

    if (selectedService === 'DINE_IN') {
      if (!hasScannedTableQr) {
        alert('Dine-In orders can only be placed from a verified table QR stand inside the restaurant.');
        setIsSubmitting(false);
        return;
      }

      if (isTableSessionExpired(currentTableObj?.lastClearedAt)) {
        alert('Your dining session for this table has expired or was settled by restaurant staff after your visit. Please scan the physical table QR code again.');
        setIsSubmitting(false);
        onClose();
        return;
      }
    }

    if (selectedService === 'DINE_IN' && currentRestaurant?.dineInSecurityMode === 'TABLE_PIN') {
      if (tablePinInput.trim() !== expectedTablePin) {
        setTablePinError(`Invalid Table PIN "${tablePinInput}". Please enter the 4-digit PIN printed on your physical table stand (e.g. ${expectedTablePin}).`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await placeOrder(
        currentUser.id,
        effectiveCustomerName,
        effectivePhone,
        effectiveEmail,
        currentRestaurant.id,
        currentRestaurant.name,
        `${currentRestaurant.address.street}, ${currentRestaurant.address.city}`,
        currentRestaurant.phone,
        {
          serviceType: selectedService,
          deliveryAddress,
          restaurantDistrict,
          deliveryDistrict: selectedService === 'DELIVERY' ? district : undefined,
          isCrossDistrict: districtRate.isCrossDistrict,
          routeDistanceKm: districtRate.distanceKm,
          deliveryFee: effectiveDeliveryFee,
          tableNumber: selectedService === 'DINE_IN' ? tableNumber : undefined,
          tablePinEntered: selectedService === 'DINE_IN' ? (tablePinInput || expectedTablePin) : undefined,
          isTableVerifiedByStaff: false,
          dineInNotes: selectedService === 'DINE_IN' ? dineInNotes : undefined,
          pickupTime: selectedService === 'TAKEAWAY' ? pickupTime : undefined,
          runnerType: currentRestaurant.fulfillmentType === 'IN_HOUSE_RUNNER' 
            ? 'IN_HOUSE_DEDICATED' 
            : 'PLATFORM_PUBLIC',
          paymentMethod,
          tip: selectedService === 'DELIVERY' ? tipAmount : 0,
          specialNotes: selectedService === 'DELIVERY' ? deliveryInstructions : undefined,
          discountAmount,
          promoCode: appliedPromo?.code,
        }
      );

      setIsSubmitting(false);
      onClose();
      onOrderCompleted();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert('Error placing order. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[#DCE3DD]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#DCE3DD] flex items-center justify-between bg-[#F6F7F5]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2F7A4F]"></span>
              <h2 className="font-extrabold text-lg text-[#16241B]">Confirm & Place Order</h2>
            </div>
            <p className="text-xs text-[#526056] mt-0.5">
              Ordering from <strong className="text-[#16241B]">{currentRestaurant?.name}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-[#526056] hover:text-[#16241B] flex items-center justify-center border border-[#DCE3DD] cursor-pointer shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Service Mode Selector */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#16241B] block mb-2">
              Select Dining / Service Option
            </label>
            <div className={`grid ${hasScannedTableQr && supportedServices.includes('DINE_IN') ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
              {supportedServices.includes('DELIVERY') && (
                <button
                  type="button"
                  onClick={() => setSelectedService('DELIVERY')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedService === 'DELIVERY'
                      ? 'border-[#E0562B] bg-[#FBE4DA]/40 ring-2 ring-[#E0562B]'
                      : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Bike className={`w-4 h-4 ${selectedService === 'DELIVERY' ? 'text-[#E0562B]' : 'text-[#526056]'}`} />
                    {selectedService === 'DELIVERY' && <Check className="w-3.5 h-3.5 text-[#E0562B] stroke-[3]" />}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-[#16241B] block">Delivery</span>
                    <span className="text-[10px] text-[#526056]">To your doorstep</span>
                  </div>
                </button>
              )}

              {supportedServices.includes('TAKEAWAY') && (
                <button
                  type="button"
                  onClick={() => setSelectedService('TAKEAWAY')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedService === 'TAKEAWAY'
                      ? 'border-[#E0562B] bg-[#FBE4DA]/40 ring-2 ring-[#E0562B]'
                      : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <ShoppingBag className={`w-4 h-4 ${selectedService === 'TAKEAWAY' ? 'text-[#E0562B]' : 'text-[#526056]'}`} />
                    {selectedService === 'TAKEAWAY' && <Check className="w-3.5 h-3.5 text-[#E0562B] stroke-[3]" />}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-[#16241B] block">Takeaway</span>
                    <span className="text-[10px] text-[#526056]">Self-pickup ($0 fee)</span>
                  </div>
                </button>
              )}

              {hasScannedTableQr && supportedServices.includes('DINE_IN') && (
                <button
                  type="button"
                  onClick={() => setSelectedService('DINE_IN')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedService === 'DINE_IN'
                      ? 'border-[#E0562B] bg-[#FBE4DA]/40 ring-2 ring-[#E0562B]'
                      : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Utensils className={`w-4 h-4 ${selectedService === 'DINE_IN' ? 'text-[#E0562B]' : 'text-[#526056]'}`} />
                    {selectedService === 'DINE_IN' && <Check className="w-3.5 h-3.5 text-[#E0562B] stroke-[3]" />}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-bold text-[#16241B] block">Dine-In</span>
                    <span className="text-[10px] text-[#526056]">Table order ($0 fee)</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* DINE-IN SERVICE DETAILS */}
          {selectedService === 'DINE_IN' && (
            <div className="p-4 bg-[#E1F0E6] border border-[#2F7A4F]/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#2F7A4F]" />
                  <span className="text-xs font-bold text-[#2F7A4F]">In-Restaurant Table Dining</span>
                </div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-[#2F7A4F] border border-[#2F7A4F]/30">
                  ⚡ Authenticated via Table QR
                </span>
              </div>

              {/* Group Dining Session Active Banner */}
              {activeTableOrder && (
                <div className="p-3 bg-white/90 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Table Group Dining Session Active</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    There is an active ticket for <strong>{tableNumber}</strong> (#{activeTableOrder.orderNumber} - {activeTableOrder.items.length} items by {activeTableOrder.customerName}). Your dishes will automatically append to this table&apos;s live group tab!
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">Seated Table</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      readOnly
                      value={tableNumber}
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-extrabold text-[#2F7A4F] cursor-not-allowed"
                    />
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-300 shrink-0">
                      ✓ QR Locked
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#16241B] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2F7A4F]" />
                      <span>Table Stand PIN</span>
                      {currentRestaurant?.dineInSecurityMode === 'TABLE_PIN' ? (
                        <span className="text-red-500">*</span>
                      ) : (
                        <span className="text-[#526056] font-normal text-[10px]">(Optional)</span>
                      )}
                    </label>
                    <span className="text-[10px] text-[#526056]">Printed on stand</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={tablePinInput}
                    onChange={(e) => {
                      setTablePinInput(e.target.value);
                      setTablePinError(null);
                    }}
                    placeholder={`e.g. ${expectedTablePin}`}
                    className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F] ${
                      tablePinError ? 'border-red-400 bg-red-50/50' : 'border-[#DCE3DD]'
                    }`}
                  />
                  {tablePinError && (
                    <p className="text-[10px] text-red-600 font-bold mt-1">{tablePinError}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">
                    Your Name <span className="text-[#526056] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah or Guest Diner"
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">
                    Kitchen / Seating Requests <span className="text-[#526056] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={dineInNotes}
                    onChange={(e) => setDineInNotes(e.target.value)}
                    placeholder="e.g. Extra cutlery, water with ice, baby chair"
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2F7A4F]"
                  />
                </div>

                {/* Anti-Phantom Guard Verification Notice */}
                <div className="sm:col-span-2 p-2.5 bg-white/80 rounded-xl border border-emerald-200/80 text-[11px] text-[#2F7A4F] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#2F7A4F]" />
                  <span>
                    <strong>Anti-Phantom Order Protection:</strong> Guest table orders require seated presence verification by floor staff before firing to kitchen stoves.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAKEAWAY SERVICE DETAILS */}
          {selectedService === 'TAKEAWAY' && (
            <div className="p-4 bg-[#DFEDF4] border border-[#2C6E8E]/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#2C6E8E]" />
                <span className="text-xs font-bold text-[#2C6E8E]">Self-Pickup Counter Order</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">Pickup Time Target</label>
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2C6E8E]"
                  >
                    <option value="As soon as ready (~20 mins)">As soon as ready (~20 mins)</option>
                    <option value="In 45 minutes">In 45 minutes</option>
                    <option value="Today at 1:00 PM">Today at 1:00 PM</option>
                    <option value="Today at 6:30 PM">Today at 6:30 PM</option>
                    <option value="Today at 7:45 PM">Today at 7:45 PM</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#16241B] block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#2C6E8E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DELIVERY SERVICE DETAILS */}
          {selectedService === 'DELIVERY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E0562B]" />
                  Delivery Destination & Runner Fleet
                </h3>
                <span className="text-[11px] text-[#2F7A4F] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> {districtRate.time} Delivery
                </span>
              </div>

              {/* District Selector & Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#16241B]">
                    Brunei District Delivery Zone
                  </label>
                  <span className="text-[10px] text-[#526056]">
                    Kitchen Origin: <strong className="text-[#16241B]">{restaurantDistrict}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRUNEI_DISTRICTS.map(dId => {
                    const route = getDistrictRoute(restaurantDistrict, dId);
                    const restRate = currentRestaurant?.districtDeliveryRates?.find(r => r.district === dId);
                    const fee = restRate ? restRate.fee : route.defaultFee;
                    const time = restRate ? `${restRate.estimatedMinMinutes}-${restRate.estimatedMaxMinutes}m` : route.estimatedMinutes;
                    const isCross = restaurantDistrict !== dId;

                    return (
                      <button
                        key={dId}
                        type="button"
                        onClick={() => setDistrict(dId)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          district === dId
                            ? 'border-[#E0562B] bg-[#FBE4DA] text-[#E0562B] font-bold shadow-xs'
                            : 'border-[#DCE3DD] bg-[#F6F7F5] text-[#526056] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs truncate block">{dId}</span>
                          {isCross && (
                            <span className="text-[8px] uppercase tracking-wider font-extrabold px-1 py-0.5 rounded bg-[#E0562B]/15 text-[#E0562B]">
                              Inter
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#526056] font-mono mt-0.5 block">
                          ${fee.toFixed(2)} • {time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cross-District Surcharge Explanation Banner */}
              {districtRate.isCrossDistrict && (
                <div className="p-3.5 bg-[#FFF3EB] border border-[#E0562B]/30 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#E0562B] flex items-center gap-1.5">
                      <Bike className="w-4 h-4" />
                      Cross-District Courier Transit: {restaurantDistrict} ➔ {district}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#E0562B] bg-white px-2 py-0.5 rounded-md border border-[#E0562B]/30">
                      ~{districtRate.distanceKm} km route
                    </span>
                  </div>
                  <p className="text-[11px] text-[#783823] leading-relaxed">
                    This order requires long-distance highway courier transit across district borders. The delivery fee of <strong>${effectiveDeliveryFee.toFixed(2)}</strong> is awarded directly to the runner to cover extended travel time and fuel.
                  </p>
                </div>
              )}

              {/* Runner dispatch info note */}
              <div className="p-3 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl flex items-center gap-2.5 text-xs text-[#526056]">
                <Bike className="w-4 h-4 text-[#2C6E8E] shrink-0" />
                <span>
                  Fulfillment Model: <strong className="text-[#16241B]">
                    {currentRestaurant?.fulfillmentType === 'IN_HOUSE_RUNNER' 
                      ? 'In-House Restaurant Courier' 
                      : 'FOODFINDR Public Runner Fleet'}
                  </strong>
                </span>
              </div>

              {/* Brunei Precision Location & GPS Pin Bar */}
              <div className="p-3.5 bg-white border border-[#DCE3DD] rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#16241B] flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-[#E0562B]" />
                      <span>Pin Precise Delivery Dropoff Point</span>
                    </span>
                    <p className="text-[11px] text-[#526056] mt-0.5">
                      Provides courier with exact pinpoint coordinates and Brunei Simpang navigation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Acquiring GPS...' : 'Use Current Device GPS'}</span>
                  </button>
                </div>

                {/* Lightweight Data Footprint Indicator */}
                <div className="p-2.5 bg-[#F6F7F5] rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#16241B]">
                      {geoCoords.latitude.toFixed(4)}, {geoCoords.longitude.toFixed(4)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      locationSource === 'AUTO_GPS' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-stone-200 text-stone-700'
                    }`}>
                      {locationSource === 'AUTO_GPS' ? '✓ High-Precision GPS' : 'Calibrated Pin'}
                    </span>
                  </div>
                  <span className="text-stone-500 text-[10px]">
                    Lightweight 4-decimal payload (&lt;32 bytes, low mobile data consumption)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Jalan / Road Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jalan Tutong or Jalan Mabohai"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Simpang (Crucial in Brunei)</label>
                  <input
                    type="text"
                    placeholder="e.g. Simpang 58 or Spg 124-10"
                    value={simpang}
                    onChange={(e) => setSimpang(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">House / Unit / Block No.</label>
                  <input
                    type="text"
                    placeholder="e.g. No. 14, Block B, Flat 3"
                    value={aptOrSuite}
                    onChange={(e) => setAptOrSuite(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Kampong / Mukim</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kg. Mabohai, Mukim Kianggeh"
                    value={kampong}
                    onChange={(e) => setKampong(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Landmark / House Visual Cue</label>
                  <input
                    type="text"
                    placeholder="e.g. Green roof, opposite Mabohai Shopping Complex, white gate"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[#526056] block mb-1">Drop-off Instructions</label>
                  <input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="e.g. Ring doorbell, leave on table on porch..."
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Provider */}
          <div className="space-y-3 pt-4 border-t border-[#DCE3DD]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#2C6E8E]" />
              Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'CASH_ON_DELIVERY', name: 'Cash on Delivery / Counter', sub: selectedService === 'DELIVERY' ? 'Pay runner cash upon arrival' : 'Pay cashier at counter', badge: 'Cash (Default)' },
                { id: 'BANK_TRANSFER_BIBD', name: 'BIBD / Baiduri QR Pay', sub: 'Instant bank transfer or QR code', badge: 'Brunei QR' },
                { id: 'STRIPE_CARD', name: 'Credit / Debit Card', sub: 'Instant online card payment', badge: 'Online' },
                { id: 'APPLE_PAY', name: 'Apple Pay / Google Pay', sub: 'Biometric 1-tap mobile pay', badge: 'Digital' },
              ].map(method => (
                <div
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethodType)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === method.id
                      ? 'bg-[#FBE4DA]/40 border-[#E0562B] ring-1 ring-[#E0562B]'
                      : 'bg-[#F6F7F5] border-[#DCE3DD] hover:border-[#526056]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === method.id ? 'bg-[#E0562B] border-[#E0562B] text-white' : 'border-[#526056]'
                    }`}>
                      {paymentMethod === method.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#16241B]">{method.name}</p>
                      <p className="text-[10px] text-[#526056]">{method.sub}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white border border-[#DCE3DD] rounded-md text-[#526056]">
                    {method.badge}
                  </span>
                </div>
              ))}
            </div>

            {paymentMethod === 'CASH_ON_DELIVERY' && (
              <div className="p-3 bg-[#E1F0E6] border border-[#2F7A4F]/30 rounded-xl text-[11px] text-[#16241B] flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2F7A4F] shrink-0" />
                <span>
                  <strong>Cash Settlement:</strong> {selectedService === 'DELIVERY' ? 'Please prepare exact cash for the runner upon arrival. The runner collects the full amount and retains the delivery fee.' : 'Please settle the bill in cash at the cashier counter.'}
                </span>
              </div>
            )}

            {paymentMethod === 'BANK_TRANSFER_BIBD' && (
              <div className="p-3 bg-[#F6F7F5] border border-[#2C6E8E]/30 rounded-xl text-[11px] text-[#16241B] space-y-1">
                <div className="flex items-center justify-between font-bold text-[#2C6E8E]">
                  <span>BIBD Account: 00-015-01-0029384</span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#DCE3DD]">Trattoria Bella</span>
                </div>
                <p className="text-[#526056]">Reference: Use your order number as payment reference. You can show screenshot to the runner or cashier.</p>
              </div>
            )}
          </div>

          {/* Courier Tip for Delivery */}
          {selectedService === 'DELIVERY' && (
            <div className="space-y-2 pt-4 border-t border-[#DCE3DD]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#2F7A4F]" />
                  Courier Gratuity (100% to Runner)
                </label>
                <span className="text-xs font-mono font-bold text-[#2F7A4F]">${tipAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                {[1.50, 3.00, 5.00, 7.00].map(tip => (
                  <button
                    type="button"
                    key={tip}
                    onClick={() => setTipAmount(tip)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      tipAmount === tip
                        ? 'bg-[#E1F0E6] border-[#2F7A4F] text-[#2F7A4F]'
                        : 'bg-[#F6F7F5] border-[#DCE3DD] text-[#526056] hover:bg-white'
                    }`}
                  >
                    ${tip.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voucher / Promo Code Box */}
          <div className="p-4 rounded-2xl bg-[#F6F7F5] border border-[#DCE3DD] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#E0562B]" />
                <span>Have a Promo Code or Voucher?</span>
              </label>
              {appliedPromo && (
                <span className="text-[11px] font-bold text-[#2F7A4F] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Code Applied
                </span>
              )}
            </div>

            {/* Input and apply button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME20, FREEDEL30"
                disabled={!!appliedPromo}
                className="flex-1 bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-[#526056] focus:ring-2 focus:ring-[#E0562B] disabled:bg-[#F6F7F5]"
              />
              {appliedPromo ? (
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="px-3.5 py-2 bg-[#FBE4DA] text-[#E0562B] hover:bg-[#E0562B] hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyPromo()}
                  className="px-4 py-2 bg-[#16241B] hover:bg-[#2F7A4F] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Error or Success notification */}
            {promoError && (
              <p className="text-[11px] text-[#E0562B] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {promoError}
              </p>
            )}

            {promoSuccessMsg && (
              <p className="text-[11px] text-[#2F7A4F] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {promoSuccessMsg}
              </p>
            )}

            {/* Available Deals for Restaurant (1-click apply) */}
            {availablePromos.length > 0 && !appliedPromo && (
              <div className="pt-2 border-t border-[#DCE3DD]/60">
                <span className="text-[10px] uppercase font-bold text-[#526056] block mb-1.5">
                  Available Restaurant Offers (Tap to Apply):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {availablePromos.filter(p => p.isActive).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPromo(p.code)}
                      className="px-2.5 py-1 bg-white hover:bg-[#EBF3EE] border border-[#DCE3DD] hover:border-[#2F7A4F] rounded-lg text-[11px] font-mono font-bold text-[#16241B] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Percent className="w-3 h-3 text-[#2F7A4F]" />
                      <span>{p.code}</span>
                      <span className="text-[10px] text-[#526056] font-sans font-normal">
                        ({p.type === 'PERCENTAGE' ? `${p.value}% OFF` : p.type === 'FIXED_AMOUNT' ? `$${p.value} OFF` : 'Free Delivery'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary Breakdown */}
          <div className="p-4 rounded-2xl bg-[#F6F7F5] border border-[#DCE3DD] space-y-1.5 text-xs text-[#526056]">
            <div className="flex justify-between">
              <span>Dishes ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="font-mono text-[#16241B]">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[#2F7A4F] font-bold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Promo Discount ({appliedPromo?.code})</span>
                </span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Service Mode</span>
              <span className="font-bold text-[#16241B] uppercase">
                {selectedService === 'DINE_IN' ? `Dine-In (${tableNumber})` : selectedService === 'TAKEAWAY' ? 'Takeaway' : `Delivery (${district})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (8.5%)</span>
              <span className="font-mono text-[#16241B]">${tax.toFixed(2)}</span>
            </div>
            {selectedService === 'DELIVERY' && (
              <>
                <div className="flex justify-between">
                  <span>District Delivery Fee ({district})</span>
                  <span className="font-mono text-[#16241B]">
                    {appliedPromo?.type === 'FREE_DELIVERY' ? (
                      <span className="text-[#2F7A4F] font-bold">FREE ($0.00)</span>
                    ) : (
                      `$${effectiveDeliveryFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Runner Tip</span>
                  <span className="font-mono text-[#16241B]">${tipAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="pt-2 border-t border-[#DCE3DD] flex justify-between text-sm font-extrabold text-[#16241B]">
              <span>Final Total</span>
              <span className="font-mono text-base text-[#E0562B]">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              selectedService === 'DINE_IN'
                ? 'bg-[#247545] hover:bg-[#1E6038]'
                : 'bg-[#E0562B] hover:bg-[#B5431E]'
            }`}
          >
            {selectedService === 'DINE_IN' ? <Utensils className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>
              {isSubmitting 
                ? 'Sending Ticket to Kitchen...' 
                : selectedService === 'DINE_IN'
                ? `Send Order to Kitchen (${tableNumber}) • $${total.toFixed(2)}`
                : selectedService === 'TAKEAWAY'
                ? `Confirm Takeaway Pickup • $${total.toFixed(2)}`
                : `Confirm & Pay $${total.toFixed(2)}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

