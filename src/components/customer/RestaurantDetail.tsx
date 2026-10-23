import React, { useState } from 'react';
import { Restaurant, MenuItem, SelectedAddon, MenuBookPage } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../context/AuthContext';
import { MenuItemModal } from './MenuItemModal';
import { MenuBookViewerModal } from './MenuBookViewerModal';
import { TableQrScanModal } from './TableQrScanModal';
import { OrderingModeBadge } from '../common/StatusBadge';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Bike, 
  MapPin, 
  Phone, 
  MessageSquare,
  Mail, 
  Info, 
  Plus, 
  Sparkles, 
  Flame, 
  Leaf, 
  WheatOff, 
  AlertTriangle, 
  Utensils, 
  ShoppingBag, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Check, 
  QrCode, 
  LogIn,
  BookOpen,
  Eye,
  Zap,
  Maximize2,
  ArrowRight,
  Sparkle
} from 'lucide-react';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
  onOpenCart?: () => void;
  onProceedToCheckout?: () => void;
}

export const RestaurantDetail: React.FC<RestaurantDetailProps> = ({
  restaurant,
  onBack,
  onOpenCart,
  onProceedToCheckout,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { getMenuItemsByRestaurant, getCategoriesByRestaurant } = useRestaurants();
  const { 
    cart, 
    cartRestaurantId, 
    getCartSubtotal, 
    addToCart,
    cartServiceType,
    setCartServiceType,
    cartTableNumber,
    setCartTableNumber,
    hasScannedTableQr,
    clearTableQrSession,
    cartPickupTime,
    setCartPickupTime
  } = useOrders();
  const { config } = usePlatform();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeItemForCustomization, setActiveItemForCustomization] = useState<MenuItem | null>(null);
  const [showDistrictRates, setShowDistrictRates] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showMenuBookModal, setShowMenuBookModal] = useState(false);
  const [menuBookInitialPage, setMenuBookInitialPage] = useState(0);
  const [menuViewTab, setMenuViewTab] = useState<'ITEMS' | 'BOOKLET'>('ITEMS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showTableQrScanModal, setShowTableQrScanModal] = useState(false);

  const isGuest = !isAuthenticated || currentUser.id === 'usr_guest';

  // Fulfillment Channels supported by this restaurant
  const supportedServices = restaurant.supportedServices && restaurant.supportedServices.length > 0
    ? restaurant.supportedServices
    : ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
  
  const isDineInOnly = supportedServices.length === 1 && supportedServices.includes('DINE_IN');
  const isTakeawayOnly = supportedServices.length === 1 && supportedServices.includes('TAKEAWAY');
  const isDeliveryOnly = supportedServices.length === 1 && supportedServices.includes('DELIVERY');

  // Auto-synchronize fulfillment service
  React.useEffect(() => {
    if (!hasScannedTableQr) {
      // Browsing publicly from web/home: default to delivery or takeaway
      if (cartServiceType === 'DINE_IN' || !supportedServices.includes(cartServiceType)) {
        if (supportedServices.includes('DELIVERY')) {
          setCartServiceType('DELIVERY');
        } else if (supportedServices.includes('TAKEAWAY')) {
          setCartServiceType('TAKEAWAY');
        } else {
          // Dine-In only restaurant
          setCartServiceType('DINE_IN');
        }
      }
    } else {
      setCartServiceType('DINE_IN');
    }
  }, [supportedServices, cartServiceType, setCartServiceType, hasScannedTableQr]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#restaurant=${restaurant.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const categories = getCategoriesByRestaurant(restaurant.id);
  const menuItems = getMenuItemsByRestaurant(restaurant.id);

  const filteredItems = selectedCategory === 'ALL'
    ? menuItems
    : menuItems.filter(item => item.categoryId === selectedCategory);

  const isGlobalDisabled = !config.globalOrderingEnabled;
  const isRestaurantOrderingDisabled = restaurant.orderingMode !== 'ENABLED';
  const canPlaceOrders = !isGlobalDisabled && !isRestaurantOrderingDisabled;

  const handleAddItemClick = (item: MenuItem) => {
    // If restaurant is Dine-In Only and user hasn't scanned QR code, prompt in-store scan
    if (isDineInOnly && !hasScannedTableQr) {
      setShowTableQrScanModal(true);
      return;
    }

    // Delivery orders require a registered/authenticated account for GPS courier dispatch
    // DINE-IN orders are 100% guest-friendly (customers can sit at a table and order without registering)
    if (isGuest && cartServiceType === 'DELIVERY') {
      openAuthModal('SIGN_IN');
      return;
    }

    if (!canPlaceOrders) {
      alert('Ordering is currently set to Directory Only for this restaurant.');
      return;
    }
    // If dish has add-on options, open customization modal; otherwise add directly
    if (item.addonGroups && item.addonGroups.length > 0) {
      setActiveItemForCustomization(item);
    } else {
      addToCart(item, 1, []);
      setToastMessage(
        cartServiceType === 'DINE_IN'
          ? `Added "${item.name}" to ${cartTableNumber}'s ticket!`
          : `Added "${item.name}" to your order!`
      );
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const districtRates = restaurant.districtDeliveryRates || config.defaultDistrictRates || [
    { district: 'Brunei-Muara', fee: 3.00, estimatedMinMinutes: 20, estimatedMaxMinutes: 35, isAvailable: true },
    { district: 'Tutong', fee: 5.50, estimatedMinMinutes: 35, estimatedMaxMinutes: 50, isAvailable: true },
    { district: 'Belait', fee: 8.00, estimatedMinMinutes: 45, estimatedMaxMinutes: 65, isAvailable: true },
    { district: 'Temburong', fee: 10.00, estimatedMinMinutes: 55, estimatedMaxMinutes: 75, isAvailable: true },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#526056] hover:text-[#16241B] bg-white border border-[#DCE3DD] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs hover:bg-[#F6F7F5]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Listings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16241B] bg-white hover:bg-[#F6F7F5] border border-[#DCE3DD] px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
            title="Copy direct link for QR Code menus & table ordering"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#2F7A4F]" />
                <span className="text-[#2F7A4F]">Link Copied!</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5 text-[#E0562B]" />
                <span className="hidden sm:inline">QR / Direct Link</span>
                <Share2 className="w-3 h-3 text-[#526056]" />
              </>
            )}
          </button>
          <OrderingModeBadge mode={restaurant.orderingMode} />
        </div>
      </div>

      {/* Public Guest Information Notice (Only shown to unauthenticated remote visitors who haven't scanned an in-store table QR) */}
      {isGuest && !hasScannedTableQr && (
        <div className="bg-[#EBF3EE] border border-[#2F7A4F]/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#16241B] shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2F7A4F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[#16241B] text-xs">You are browsing in Public Guest Mode</p>
              <p className="text-[#526056] text-[11px] mt-0.5">
                Explore full menus, dishes, and direct WhatsApp contacts. Sign in or register an account to place online orders.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal()}
            className="px-4 py-2 bg-[#E0562B] hover:bg-[#B5431E] text-white rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Order</span>
          </button>
        </div>
      )}

      {/* Restaurant Hero Card */}
      <div className="bg-white rounded-3xl border border-[#DCE3DD] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="relative h-64 sm:h-80 w-full bg-[#F6F7F5]">
          <img
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>

          {/* Top Info Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#16241B] shadow-xs">
              {restaurant.establishmentType || 'Restaurant'}
            </span>

            <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
              <Star className="w-4 h-4 fill-[#C98B1F] text-[#C98B1F]" />
              <span className="text-sm font-extrabold text-[#16241B]">{restaurant.rating.toFixed(1)}</span>
              <span className="text-xs text-[#526056]">({restaurant.reviewCount})</span>
            </div>
          </div>

          {/* Banner Details */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {restaurant.cuisineTypes.map(c => (
                <span key={c} className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {c}
                </span>
              ))}
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono">
                {restaurant.priceLevel}
              </span>
              {restaurant.halalStatus && (
                <span className="bg-[#2F7A4F]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold text-white">
                  ✓ {restaurant.halalStatus.replace('_', ' ')}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {restaurant.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#F6F7F5] max-w-2xl leading-relaxed line-clamp-2">
              {restaurant.description}
            </p>
          </div>
        </div>

        {/* Services & Contact Action Bar */}
        <div className="p-4 sm:p-6 bg-white border-b border-[#DCE3DD] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-[#526056]">
              <div className="w-9 h-9 rounded-xl bg-[#FBE4DA] text-[#E0562B] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#526056]">Est. Prep / Delivery</p>
                <p className="font-bold text-[#16241B]">{restaurant.estimatedDeliveryMin}-{restaurant.estimatedDeliveryMax} mins</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#526056]">
              <div className="w-9 h-9 rounded-xl bg-[#E1F0E6] text-[#2F7A4F] flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#526056]">Delivery Base</p>
                <p className="font-bold text-[#16241B]">From ${restaurant.deliveryFee.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[#526056]">
              <div className="w-9 h-9 rounded-xl bg-[#FBEED8] text-[#C98B1F] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] uppercase font-bold text-[#526056]">District / Location</p>
                <p className="font-bold text-[#16241B] truncate">{restaurant.address.street}, {restaurant.address.district || restaurant.address.city}</p>
              </div>
            </div>

            {/* Direct Contact Actions */}
            <div className="flex items-center gap-2">
              {restaurant.whatsappPhone && (
                <a
                  href={`https://wa.me/${restaurant.whatsappPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 bg-[#E1F0E6] hover:bg-[#2F7A4F] text-[#2F7A4F] hover:text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
              <a
                href={`tel:${restaurant.phone}`}
                className="flex-1 py-2 px-3 bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            </div>
          </div>

          {/* Interactive Fulfillment Choice & Table Selection */}
          <div className="pt-4 border-t border-[#DCE3DD] space-y-3">
            {/* If Restaurant is Dine-In Only and User Has NOT Scanned Table QR */}
            {isDineInOnly && !hasScannedTableQr && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <span className="font-extrabold block text-sm text-amber-900">In-Restaurant Table QR Ordering Only</span>
                    <span className="text-[11px] text-amber-800">
                      This establishment serves seated diners exclusively. Please scan the physical QR stand on your dining table to order.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableQrScanModal(true)}
                  className="px-4 py-2 bg-[#2F7A4F] hover:bg-[#1E6038] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan Table QR / Authenticate</span>
                </button>
              </div>
            )}

            {/* If User Has Authenticated a Table QR */}
            {hasScannedTableQr && (() => {
              const seatedTable = (restaurant.tables || []).find(t => 
                t.tableNumber === cartTableNumber || 
                t.name.toLowerCase() === cartTableNumber.toLowerCase() ||
                cartTableNumber.includes(t.tableNumber)
              );
              const standPin = seatedTable?.tablePin || `4${(seatedTable?.tableNumber || cartTableNumber || '1').replace(/\D/g, '').padStart(3, '0')}`;

              return (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="text-2xl shrink-0">🍽️</span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#16241B] text-sm">Dining In at {cartTableNumber}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                          ✓ Table Session Active
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200">
                          👥 Multi-Guest Friendly
                        </span>
                      </div>
                      <p className="text-[#526056] text-[11px] mt-0.5">
                        Multiple guests at this table can scan and order simultaneously using permanent Stand PIN <strong className="font-mono text-[#16241B] bg-white px-1.5 py-0.5 rounded border border-emerald-300">{standPin}</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearTableQrSession()}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer shrink-0 self-end sm:self-center"
                  >
                    Leave Table
                  </button>
                </div>
              );
            })()}

            {/* If NOT Dine-In Only, show public channels (Takeaway and Delivery) */}
            {!isDineInOnly && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#16241B]">Fulfillment Mode:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Only show Dine-In button if user has actually scanned a table QR */}
                    {hasScannedTableQr && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('DINE_IN')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          cartServiceType === 'DINE_IN'
                            ? 'bg-[#2F7A4F] text-white border-[#2F7A4F] shadow-sm'
                            : 'bg-emerald-50/80 text-[#2F7A4F] border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span>🍽️ Dine-In ({cartTableNumber})</span>
                        {cartServiceType === 'DINE_IN' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    )}

                    {supportedServices.includes('TAKEAWAY') && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('TAKEAWAY')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          cartServiceType === 'TAKEAWAY'
                            ? 'bg-[#2C6E8E] text-white border-[#2C6E8E] shadow-sm'
                            : 'bg-sky-50/80 text-[#2C6E8E] border-sky-200 hover:bg-sky-100'
                        }`}
                      >
                        <span>🥡 Takeaway (Pickup)</span>
                        {cartServiceType === 'TAKEAWAY' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    )}

                    {supportedServices.includes('DELIVERY') && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('DELIVERY')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          cartServiceType === 'DELIVERY'
                            ? 'bg-[#E0562B] text-white border-[#E0562B] shadow-sm'
                            : 'bg-orange-50/80 text-[#E0562B] border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        <span>🛵 Delivery</span>
                        {cartServiceType === 'DELIVERY' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Discrete scan button for diners visiting in person */}
                  {supportedServices.includes('DINE_IN') && !hasScannedTableQr && (
                    <button
                      type="button"
                      onClick={() => setShowTableQrScanModal(true)}
                      className="text-xs font-bold text-[#2F7A4F] hover:underline flex items-center gap-1 cursor-pointer"
                      title="At the restaurant? Scan physical table QR stand"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>At the restaurant? Scan Table QR</span>
                    </button>
                  )}

                  {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
                    <button
                      onClick={() => {
                        setMenuBookInitialPage(0);
                        setShowMenuBookModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EBF3EE] hover:bg-[#D4E8DC] text-[#2F7A4F] border border-[#2F7A4F]/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Open full-page physical menu scan booklet"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quick Look Menu ({restaurant.menuBookPages.length} Pgs)</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#2F7A4F] text-white text-[9px] font-mono">
                        <Zap className="w-2.5 h-2.5" /> Data-Saved
                      </span>
                    </button>
                  )}

                  {!isDineInOnly && supportedServices.includes('DELIVERY') && (
                    <button
                      onClick={() => setShowDistrictRates(!showDistrictRates)}
                      className="text-xs font-bold text-[#E0562B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View District Rates</span>
                      {showDistrictRates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Helper Banner for Takeaway or Delivery */}
            {!isDineInOnly && (
              <div className="p-3.5 rounded-2xl bg-[#F6F7F5] border border-[#DCE3DD] text-xs space-y-2">
                {cartServiceType === 'TAKEAWAY' && (
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥡</span>
                    <div>
                      <p className="font-bold text-[#16241B]">Takeaway Self-Pickup</p>
                      <p className="text-[#526056] text-[11px]">Pay online or at counter. Collect directly from {restaurant.name} in ~20 mins. ($0 Delivery Fee)</p>
                    </div>
                  </div>
                )}
                {cartServiceType === 'DELIVERY' && (
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛵</span>
                    <div>
                      <p className="font-bold text-[#16241B]">Doorstep Runner Delivery</p>
                      <p className="text-[#526056] text-[11px]">Delivered to your house, office, or kampong address with real-time runner GPS tracking.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expandable District Delivery Rates Matrix */}
          {showDistrictRates && (
            <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-[#16241B]">
                <span>District Delivery Matrix & Runner Fleet Rates</span>
                <span className="text-[10px] text-[#526056]">
                  Fleet: {restaurant.fulfillmentType === 'IN_HOUSE_ONLY' ? 'In-House Restaurant Staff' : 'Public Runner Network'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {districtRates.map(d => (
                  <div key={d.district} className="bg-white p-2.5 rounded-xl border border-[#DCE3DD] text-center">
                    <span className="text-xs font-bold text-[#16241B] block">{d.district}</span>
                    <span className="text-xs font-mono font-extrabold text-[#E0562B] block">${d.fee.toFixed(2)}</span>
                    <span className="text-[10px] text-[#526056]">{d.estimatedMinMinutes}-{d.estimatedMaxMinutes} mins</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Directory Only / View Only Warning Notification */}
        {!canPlaceOrders && (
          <div className="p-4 bg-[#FBEED8] border-b border-[#C98B1F]/30 flex items-start gap-3 text-xs text-[#C98B1F]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#C98B1F]" />
            <div>
              <p className="font-bold text-[#16241B]">
                {isGlobalDisabled
                  ? 'System-Wide Online Ordering is Temporarily Paused'
                  : 'Directory Only Listing'}
              </p>
              <p className="text-[#526056] mt-0.5">
                {isGlobalDisabled
                  ? 'The platform is currently operating in catalog-only mode. You can browse menu items and contact the kitchen directly by phone or WhatsApp.'
                  : 'This merchant is listed for directory discovery. You can review the menu and visit in-person at ' + restaurant.address.street + '.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Menu Section View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#DCE3DD] shadow-2xs">
          <button
            onClick={() => setMenuViewTab('ITEMS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              menuViewTab === 'ITEMS'
                ? 'bg-[#16241B] text-white shadow-xs'
                : 'text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Order Online ({menuItems.length} Dishes)</span>
          </button>

          <button
            onClick={() => setMenuViewTab('BOOKLET')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              menuViewTab === 'BOOKLET'
                ? 'bg-[#2F7A4F] text-white shadow-xs'
                : 'text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Physical Menu Booklet ({restaurant.menuBookPages?.length || 0} Pages)</span>
            {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
          <button
            onClick={() => {
              setMenuBookInitialPage(0);
              setShowMenuBookModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F7A4F] hover:underline cursor-pointer self-start sm:self-auto bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Open Interactive Booklet Reader</span>
          </button>
        )}
      </div>

      {menuViewTab === 'BOOKLET' ? (
        /* Physical Menu Booklet Gallery */
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-[#DCE3DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-[#16241B] font-display flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2F7A4F]" />
                <span>Original Printed Restaurant Menu</span>
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Browse authentic chef menus and specialty seasonal pages. Images are client-compressed for lightning-fast mobile loading and low cellular data usage.
              </p>
            </div>

            <button
              onClick={() => setMenuViewTab('ITEMS')}
              className="px-3.5 py-1.5 rounded-xl bg-[#E0562B] text-white text-xs font-bold hover:bg-[#B5431E] transition-colors self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
            >
              Go to Order Online Dishes
            </button>
          </div>

          {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurant.menuBookPages.map((page, idx) => (
                <div
                  key={page.id}
                  onClick={() => {
                    setMenuBookInitialPage(idx);
                    setShowMenuBookModal(true);
                  }}
                  className="group bg-white rounded-2xl border border-[#DCE3DD] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#2F7A4F]/60 transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-[#F6F7F5] overflow-hidden">
                    <img
                      src={page.imageUrl}
                      alt={page.title || `Menu Page ${page.pageNumber}`}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3.5 py-1.5 bg-black/80 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Tap to Zoom</span>
                      </span>
                    </div>

                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-bold backdrop-blur-xs">
                      Page {page.pageNumber}
                    </div>

                    {page.fileSizeKb && (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-xs">
                        <Zap className="w-2.5 h-2.5 text-emerald-400" />
                        <span>~{page.fileSizeKb} KB</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-[#DCE3DD] bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#16241B] truncate">{page.title || `Menu Page ${page.pageNumber}`}</p>
                      <p className="text-[11px] text-[#526056]">Click to read & zoom</p>
                    </div>
                    <span className="p-1.5 rounded-lg bg-[#F6F7F5] text-[#2F7A4F] group-hover:bg-[#2F7A4F] group-hover:text-white transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-[#DCE3DD] text-center space-y-3">
              <BookOpen className="w-10 h-10 text-[#526056]/40 mx-auto" />
              <div>
                <p className="font-bold text-sm text-[#16241B]">No Physical Menu Booklet Uploaded Yet</p>
                <p className="text-xs text-[#526056] mt-1 max-w-md mx-auto">
                  This merchant hasn't published high-resolution menu book scans yet. You can explore and order from their individual dish catalog.
                </p>
              </div>
              <button
                onClick={() => setMenuViewTab('ITEMS')}
                className="px-4 py-2 bg-[#16241B] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors cursor-pointer"
              >
                Browse Individual Dishes
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Standard Online Dish Ordering View */
        <div className="space-y-4">
          {/* Menu Categories Bar */}
          <div className="sticky top-20 z-30 bg-[#F6F7F5]/95 backdrop-blur-md py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-[#16241B] text-white shadow-xs'
                  : 'bg-white text-[#526056] border border-[#DCE3DD] hover:text-[#16241B]'
              }`}
            >
              All Items ({menuItems.length})
            </button>

            {categories.map(cat => {
              const count = menuItems.filter(i => i.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#16241B] text-white shadow-xs'
                      : 'bg-white text-[#526056] border border-[#DCE3DD] hover:text-[#16241B]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-[#DCE3DD] hover:border-[#E0562B]/50 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="flex gap-4">
                  {/* Text Info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[#16241B]">{item.name}</h3>
                      {item.isPopular && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-[#FBE4DA] text-[#E0562B] text-[10px] font-bold">
                          <Sparkles className="w-2.5 h-2.5" /> Popular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#526056] line-clamp-2 leading-relaxed">{item.description}</p>

                    {/* Dietary Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.isVegetarian && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2F7A4F] bg-[#E1F0E6] px-2 py-0.5 rounded-md">
                          <Leaf className="w-2.5 h-2.5" /> Vegetarian
                        </span>
                      )}
                      {item.isGlutenFree && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C98B1F] bg-[#FBEED8] px-2 py-0.5 rounded-md">
                          <WheatOff className="w-2.5 h-2.5" /> GF
                        </span>
                      )}
                      {item.isSpicy && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E0562B] bg-[#FBE4DA] px-2 py-0.5 rounded-md">
                          <Flame className="w-2.5 h-2.5" /> Spicy
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dish Image */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#F6F7F5] shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Price and Add Button */}
                <div className="pt-3 mt-3 border-t border-[#DCE3DD] flex items-center justify-between">
                  <span className="font-extrabold text-base text-[#16241B] font-mono">
                    ${item.basePrice.toFixed(2)}
                  </span>

                  <button
                    onClick={() => handleAddItemClick(item)}
                    disabled={!canPlaceOrders}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      canPlaceOrders
                        ? 'bg-[#E0562B] hover:bg-[#B5431E] text-white active:scale-95'
                        : 'bg-[#DCE3DD] text-[#526056] cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{item.addonGroups && item.addonGroups.length > 0 ? 'Customize' : 'Add'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Customization Modal */}
      {activeItemForCustomization && (
        <MenuItemModal
          item={activeItemForCustomization}
          onClose={() => setActiveItemForCustomization(null)}
          onAddToCart={(menuItem, qty, addons, notes) => {
            addToCart(menuItem, qty, addons, notes);
            setToastMessage(`Added "${menuItem.name}" (${qty}x) to your order!`);
            setTimeout(() => setToastMessage(null), 3000);
          }}
        />
      )}

      {/* Fullscreen Interactive Menu Booklet Viewer Modal */}
      {showMenuBookModal && restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
        <MenuBookViewerModal
          restaurant={restaurant}
          restaurantName={restaurant.name}
          pages={restaurant.menuBookPages}
          initialPageIndex={menuBookInitialPage}
          onClose={() => setShowMenuBookModal(false)}
          onSwitchToOrdering={() => {
            setShowMenuBookModal(false);
            setMenuViewTab('ITEMS');
          }}
        />
      )}

      {/* Dynamic Floating Toast Notification when dishes are added */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#16241B] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#2F7A4F] flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F7A4F] animate-ping" />
            <span className="text-xs font-bold">{toastMessage}</span>
            <button
              onClick={() => onOpenCart?.()}
              className="ml-2 text-xs font-black text-[#E0562B] hover:text-[#B5431E] underline cursor-pointer"
            >
              View Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Floating Cart Bar for Instant Checkout Access */}
      {cart.length > 0 && cartRestaurantId === restaurant.id && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-[420px] z-40">
          <div className="bg-[#16241B] text-white rounded-2xl p-3.5 shadow-2xl border-2 border-[#E0562B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 rounded-xl bg-[#E0562B] text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-[#E0562B] text-[11px] font-mono font-black flex items-center justify-center border-2 border-[#16241B]">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-sm font-black text-white font-mono">
                    ${getCartSubtotal().toFixed(2)}
                  </span>
                  <span className="text-[10px] bg-white/20 text-[#F6F7F5] px-2 py-0.5 rounded-full font-semibold truncate">
                    {cartServiceType === 'DINE_IN'
                      ? `🍽️ ${cartTableNumber}`
                      : cartServiceType === 'TAKEAWAY'
                      ? '🥡 Takeaway'
                      : '🛵 Delivery'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A2B6A6] truncate">
                  {cart.reduce((s, i) => s + i.quantity, 0)} item{cart.length !== 1 ? 's' : ''} in your order
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenCart?.()}
              className="px-4 py-2.5 rounded-xl bg-[#E0562B] hover:bg-[#B5431E] text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <span>View Cart & Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* In-Store Table QR Scanner & Verification Modal */}
      <TableQrScanModal
        isOpen={showTableQrScanModal}
        onClose={() => setShowTableQrScanModal(false)}
        restaurant={restaurant}
      />
    </div>
  );
};

