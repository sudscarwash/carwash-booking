import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { OrderingMode, OrderStatus, FulfillmentType, ServiceType } from '../../types';
import { compressImageFile } from '../../utils/imageCompressor';
import { MenuManager } from './MenuManager';
import { MenuBookManager } from './MenuBookManager';
import { StaffManager } from './StaffManager';
import { PromotionManager } from './PromotionManager';
import { FinancialReports } from './FinancialReports';
import { TableQrManager } from './TableQrManager';
import { Quick86Manager } from '../common/Quick86Manager';
import { KycSubscriptionManager } from './KycSubscriptionManager';
import { B2BWholesaleHub } from './B2BWholesaleHub';
import { CashierCheckoutTerminal } from '../common/CashierCheckoutTerminal';
import { StatusBadge, OrderingModeBadge } from '../common/StatusBadge';
import { SHOW_DEMO_ACCOUNTS } from '../../config/environment';
import { 
  Store, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Users, 
  UtensilsCrossed,
  Utensils, 
  Settings, 
  CheckCircle2, 
  Flame, 
  PackageCheck,
  Bike,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ShieldCheck,
  Upload,
  Gauge,
  Sliders,
  Check,
  Tag,
  FileSpreadsheet,
  BookOpen,
  QrCode,
  AlertOctagon,
  Lock,
  HelpCircle,
  Building2
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { restaurants, updateRestaurantOrderingMode, updateRestaurantDetails } = useRestaurants();
  const { orders, updateOrderStatus } = useOrders();

  // Find owner's restaurant (by owner ID, restaurant ID, contact email, or assigned owner claim email)
  const currentRestaurant = restaurants.find(r => 
    r.ownerId === currentUser.id || 
    r.id === currentUser.restaurantId ||
    (Boolean(r.email && currentUser.email) && r.email.toLowerCase() === currentUser.email.toLowerCase()) ||
    (Boolean(r.assignedOwnerEmail && currentUser.email) && r.assignedOwnerEmail.toLowerCase() === currentUser.email.toLowerCase())
  ) || (SHOW_DEMO_ACCOUNTS ? restaurants[0] : null);

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'active-orders' | 'cashier' | 'table-qr' | 'quick-86' | 'menu' | 'menubook' | 'b2b-wholesale' | 'promotions' | 'financials' | 'staff' | 'settings' | 'kyc-subscription'>('analytics');

  if (!currentRestaurant) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#D9E2D9] max-w-lg mx-auto space-y-4 my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
          <Store className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            Pending Operations Review
          </span>
          <h2 className="text-xl font-extrabold text-[#132218]">Merchant Portal Not Yet Linked</h2>
        </div>
        <p className="text-xs text-[#4F6155] leading-relaxed">
          Your merchant account (<strong>{currentUser.email}</strong>) has been registered. For platform trust and food safety, the Operations Hub (Special User) must verify your business credentials before this dashboard is active.
        </p>
        <div className="p-3 bg-[#F5F7F4] rounded-2xl text-[11px] text-[#4F6155] space-y-1 border border-[#D9E2D9]">
          <p className="font-semibold text-[#132218]">Need immediate onboarding assistance?</p>
          <p>Contact Brunei Operations via WhatsApp: <a href="https://wa.me/6738881234" target="_blank" rel="noreferrer" className="text-[#DE5124] font-bold underline">+673 888 1234</a></p>
        </div>
      </div>
    );
  }

  // Restaurant specific orders
  const restaurantOrders = orders.filter(o => o.restaurantId === currentRestaurant.id);
  const activeOrders = restaurantOrders.filter(o => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status));
  const completedOrders = restaurantOrders.filter(o => o.status === 'DELIVERED');

  const todayGMV = restaurantOrders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + o.totalAmount : sum, 0);
  const avgTicket = restaurantOrders.length > 0 ? todayGMV / restaurantOrders.length : 0;

  const handleOrderingModeToggle = (mode: OrderingMode) => {
    updateRestaurantOrderingMode(currentRestaurant.id, mode);
  };

  const handleToggleService = (service: ServiceType) => {
    const currentServices = currentRestaurant.supportedServices || ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
    let updated: ServiceType[];
    if (currentServices.includes(service)) {
      if (currentServices.length <= 1) {
        alert('Your restaurant must support at least one fulfillment channel (e.g. Dine-In, Takeaway, or Delivery).');
        return;
      }
      updated = currentServices.filter(s => s !== service);
    } else {
      updated = [...currentServices, service];
    }
    updateRestaurantDetails(currentRestaurant.id, { supportedServices: updated });
  };

  const currentServices = currentRestaurant.supportedServices || ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner & Ordering Access Controls */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentRestaurant.logoUrl}
              alt={currentRestaurant.name}
              className="w-14 h-14 rounded-2xl object-cover border border-[#D9E2D9] shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-[#132218] font-display">{currentRestaurant.name}</h1>
                <OrderingModeBadge mode={currentRestaurant.orderingMode} />
              </div>
              <p className="text-xs text-[#4F6155] mt-0.5">{currentRestaurant.tagline}</p>
            </div>
          </div>

          {/* Ordering Capability Section Header / Settings Toggles */}
          <div className="p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#132218] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#DE5124]" />
                Ordering Capability / Special User Authorization
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : currentRestaurant.subscriptionTier === 'BASIC_POS'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                <Lock className="w-3 h-3 text-stone-600" />
                {currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                  ? 'Yellow Page Tier'
                  : currentRestaurant.subscriptionTier === 'BASIC_POS'
                  ? 'Table QR / POS Tier'
                  : 'Full Ordering Tier'}
              </span>
            </div>

            {/* Toggle Buttons: Enable Ordering / Directory Only / View Only (Enforced by Admin Tier) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                disabled={currentRestaurant.orderingMode === 'DIRECTORY_ONLY'}
                onClick={() => handleOrderingModeToggle('ENABLED')}
                title={
                  currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                    ? 'Your restaurant is provisioned by the Special User as Yellow Page Directory Only. Contact Admin to upgrade to Full Ordering.'
                    : 'Activate Live Digital Ordering'
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : currentRestaurant.orderingMode === 'ENABLED'
                    ? 'bg-[#247545] text-white shadow-xs cursor-pointer'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] cursor-pointer'
                }`}
              >
                Ordering Active
              </button>

              <button
                onClick={() => handleOrderingModeToggle('DIRECTORY_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                    ? 'bg-[#C48214] text-white shadow-xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
                }`}
              >
                Directory Only (Yellow Page)
              </button>

              <button
                onClick={() => handleOrderingModeToggle('VIEW_ONLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentRestaurant.orderingMode === 'VIEW_ONLY'
                    ? 'bg-[#132218] text-white shadow-xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
                }`}
              >
                Pause Orders (View Only)
              </button>
            </div>
            {currentRestaurant.orderingMode === 'DIRECTORY_ONLY' && (
              <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1 mt-1 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Operating in <strong>Yellow Page Mode</strong>. Customers browse your booklet/photos and order via WhatsApp. Live checkout is disabled.</span>
              </p>
            )}
          </div>
        </div>

        {/* Metric Cards & Verification Alert */}
        {!currentRestaurant.isVerified && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-extrabold block">Storefront Pending Business KYC Audit</span>
                <span className="text-[11px] text-amber-800">
                  You can set up menus and tables. Public ordering and delivery runner assignment activate once ROCBN and Halal compliance are verified.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('kyc-subscription')}
              className="px-3.5 py-1.5 bg-[#16241B] hover:bg-[#2F7A4F] text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              Verify Credentials
            </button>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#EDF1EC]">
          <div className="bg-[#F5F7F4] rounded-2xl p-4 border border-[#D9E2D9]">
            <div className="flex items-center justify-between text-[#7A8E80] text-xs">
              <span className="font-bold uppercase tracking-wider">Today&apos;s Gross Sales</span>
              <DollarSign className="w-4 h-4 text-[#247545]" />
            </div>
            <p className="text-2xl font-extrabold text-[#132218] font-mono mt-1">
              ${todayGMV.toFixed(2)}
            </p>
            <span className="text-[10px] text-[#247545] font-semibold mt-0.5 block">
              +14.8% vs yesterday
            </span>
          </div>

          <div className="bg-[#F5F7F4] rounded-2xl p-4 border border-[#D9E2D9]">
            <div className="flex items-center justify-between text-[#7A8E80] text-xs">
              <span className="font-bold uppercase tracking-wider">Active Kitchen Queue</span>
              <Flame className="w-4 h-4 text-[#DE5124]" />
            </div>
            <p className="text-2xl font-extrabold text-[#132218] font-mono mt-1">
              {activeOrders.length}
            </p>
            <span className="text-[10px] text-[#DE5124] font-semibold mt-0.5 block">
              Avg ticket wait: 14 mins
            </span>
          </div>

          <div className="bg-[#F5F7F4] rounded-2xl p-4 border border-[#D9E2D9]">
            <div className="flex items-center justify-between text-[#7A8E80] text-xs">
              <span className="font-bold uppercase tracking-wider">Average Ticket</span>
              <TrendingUp className="w-4 h-4 text-[#236885]" />
            </div>
            <p className="text-2xl font-extrabold text-[#132218] font-mono mt-1">
              ${avgTicket.toFixed(2)}
            </p>
            <span className="text-[10px] text-[#7A8E80] font-semibold mt-0.5 block">
              Based on {restaurantOrders.length} tickets
            </span>
          </div>

          <div className="bg-[#F5F7F4] rounded-2xl p-4 border border-[#D9E2D9]">
            <div className="flex items-center justify-between text-[#7A8E80] text-xs">
              <span className="font-bold uppercase tracking-wider">Estimated Payout</span>
              <Store className="w-4 h-4 text-[#C48214]" />
            </div>
            <p className="text-2xl font-extrabold text-[#132218] font-mono mt-1">
              ${(todayGMV * (1 - currentRestaurant.commissionRate / 100)).toFixed(2)}
            </p>
            <span className="text-[10px] text-[#7A8E80] font-semibold mt-0.5 block">
              Net of {currentRestaurant.commissionRate}% platform fee
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D9E2D9] pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'analytics', label: 'Sales & Performance', icon: <TrendingUp className="w-4 h-4" /> },
          { 
            key: 'active-orders', 
            label: `Live Order Stream (${activeOrders.length})`, 
            icon: <ShoppingBag className="w-4 h-4" />,
            hideForYellowPage: true
          },
          { 
            key: 'cashier', 
            label: 'Cashier Register & POS', 
            icon: <DollarSign className="w-4 h-4 text-[#247545]" />,
            hideForYellowPage: true
          },
          { 
            key: 'table-qr', 
            label: 'Table QR Stands & Dine-In', 
            icon: <QrCode className="w-4 h-4 text-[#DE5124]" />,
            hideForYellowPage: true
          },
          { 
            key: 'quick-86', 
            label: 'Rush-Hour 86 / Sold Out', 
            icon: <AlertOctagon className="w-4 h-4 text-red-500" />,
            hideForYellowPage: true
          },
          { key: 'menu', label: 'Dish Catalog', icon: <UtensilsCrossed className="w-4 h-4" /> },
          { key: 'menubook', label: `Menu Booklet & Scans (${currentRestaurant.menuBookPages?.length || 0})`, icon: <BookOpen className="w-4 h-4" /> },
          { 
            key: 'b2b-wholesale', 
            label: 'B2B Wholesale & Supplies (6B)', 
            icon: <Building2 className="w-4 h-4 text-purple-600" /> 
          },
          { 
            key: 'promotions', 
            label: 'Promotions & Vouchers', 
            icon: <Tag className="w-4 h-4" />,
            hideForYellowPage: true
          },
          { key: 'financials', label: 'Financial Statements & Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { key: 'staff', label: 'Kitchen & Staff Access', icon: <Users className="w-4 h-4" /> },
          { key: 'settings', label: 'Store Operations', icon: <Settings className="w-4 h-4" /> },
          { key: 'kyc-subscription', label: 'KYC & Subscription', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> },
        ]
          .filter(tab => {
            if (currentRestaurant.orderingMode === 'DIRECTORY_ONLY' && tab.hideForYellowPage) {
              return false;
            }
            return true;
          })
          .map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === tab.key
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
      </div>

      {/* Tab 1: Analytics */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#132218] font-display">Popular Dishes Today</h3>
            <div className="space-y-3">
              {[
                { name: 'Tagliatelle al Ragù Bolognese', orders: 24, gmv: '$540.00', pct: 85 },
                { name: 'Pizza Margherita D.O.P.', orders: 19, gmv: '$361.00', pct: 65 },
                { name: 'Pugliese Burrata & Heirloom Tomatoes', orders: 14, gmv: '$231.00', pct: 45 },
                { name: 'Classico Espresso Tiramisù', orders: 12, gmv: '$120.00', pct: 35 },
              ].map(dish => (
                <div key={dish.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#132218]">{dish.name}</span>
                    <span className="font-mono text-[#4F6155]">{dish.orders} sold • {dish.gmv}</span>
                  </div>
                  <div className="w-full h-2 bg-[#EDF1EC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#DE5124] rounded-full" style={{ width: `${dish.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#132218] font-display">Customer Satisfaction & Reviews</h3>
            <div className="flex items-center gap-6">
              <div className="text-center p-4 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9]">
                <p className="text-3xl font-extrabold text-[#132218] font-mono">{currentRestaurant.rating.toFixed(1)}</p>
                <p className="text-[10px] text-[#7A8E80] font-bold uppercase mt-1">Overall Rating</p>
              </div>
              <div className="text-xs space-y-1 text-[#4F6155]">
                <p>• <strong>98%</strong> on-time preparation rate</p>
                <p>• <strong>0.2%</strong> order defect/remake rate</p>
                <p>• <strong>4.9★</strong> packaging & food temperature rating</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Orders */}
      {activeSubTab === 'active-orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#132218] font-display">Live Order Processing Queue</h3>
            <span className="text-xs text-[#7A8E80]">{activeOrders.length} active orders pending or in prep</span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#D9E2D9] space-y-2">
              <CheckCircle2 className="w-12 h-12 text-[#247545] mx-auto opacity-70" />
              <h4 className="font-bold text-sm text-[#132218]">All caught up!</h4>
              <p className="text-xs text-[#7A8E80]">No active orders in queue right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-5 border border-[#D9E2D9] shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#132218]">#{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                        {order.serviceType === 'DINE_IN' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-[#132218] text-white text-[10px] font-mono font-bold">
                            🍽️ Table {order.tableNumber || 'Walk-in'}
                          </span>
                        ) : order.serviceType === 'TAKEAWAY' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-[#2C6E8E] text-white text-[10px] font-mono font-bold">
                            🛍️ Takeaway {order.pickupTime ? `• ${order.pickupTime}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-[#DE5124] text-white text-[10px] font-mono font-bold">
                            🛵 Delivery
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#4F6155] mt-1">Customer: <strong>{order.customerName}</strong> ({order.customerPhone})</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#DE5124]">${order.totalAmount.toFixed(2)}</span>
                  </div>

                  {/* Items List */}
                  <div className="p-3 bg-[#F5F7F4] rounded-xl text-xs space-y-1.5 divide-y divide-[#EDF1EC]">
                    {order.items.map(item => (
                      <div key={item.id} className="pt-1.5 first:pt-0">
                        <div className="flex justify-between font-semibold text-[#132218]">
                          <span>{item.quantity}x {item.itemName}</span>
                          <span className="font-mono">${item.totalPrice.toFixed(2)}</span>
                        </div>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-[#7A8E80]">
                            {item.selectedAddons.map(a => a.optionName).join(', ')}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[11px] italic text-[#DE5124]">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Action Buttons for Owner / Kitchen */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#EDF1EC]">
                    {order.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING', 'Antonio Rossi', 'RESTAURANT_OWNER')}
                          className="flex-1 py-2 rounded-xl bg-[#DE5124] text-white text-xs font-bold hover:bg-[#BF3F16] transition-colors"
                        >
                          Accept & Start Prep
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'REJECTED', 'Antonio Rossi', 'RESTAURANT_OWNER', 'Kitchen capacity reached')}
                          className="px-3 py-2 rounded-xl bg-[#FDE8E8] text-[#BA2D2D] text-xs font-bold hover:bg-[#F8C1C1] transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP', 'Antonio Rossi', 'RESTAURANT_OWNER')}
                        className="w-full py-2 rounded-xl bg-[#236885] text-white text-xs font-bold hover:bg-[#1C536B] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Mark Ready for Pickup</span>
                      </button>
                    )}

                    {order.status === 'READY_FOR_PICKUP' && (
                      <div className="w-full p-2 bg-[#E1F0F6] rounded-xl text-center text-xs text-[#236885] font-semibold">
                        Awaiting Runner Pickup
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveSubTab('cashier')}
                    className="w-full mt-2 py-1.5 rounded-xl border border-[#D9E2D9] bg-[#FAFBF9] hover:bg-[#F0F5F1] text-xs font-bold text-[#247545] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Settle at Cashier Register (Cash & Change)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Cashier Counter & Register POS */}
      {activeSubTab === 'cashier' && (
        <CashierCheckoutTerminal restaurant={currentRestaurant} />
      )}

      {/* Tab: Table QR Stands & Dine-In */}
      {activeSubTab === 'table-qr' && (
        <TableQrManager restaurant={currentRestaurant} />
      )}

      {/* Tab: Rush-Hour 86 / Sold Out Switcher */}
      {activeSubTab === 'quick-86' && (
        <Quick86Manager restaurant={currentRestaurant} userRole="RESTAURANT_OWNER" />
      )}

      {/* Tab 3: Menu Catalog */}
      {activeSubTab === 'menu' && (
        <MenuManager restaurant={currentRestaurant} />
      )}

      {/* Tab 3.2: Printed Menu Booklet & Scans */}
      {activeSubTab === 'menubook' && (
        <MenuBookManager restaurant={currentRestaurant} />
      )}

      {/* Tab 3.5: Promotions & Vouchers */}
      {activeSubTab === 'promotions' && (
        <PromotionManager restaurant={currentRestaurant} />
      )}

      {/* Tab 3.6: Financial Statements & Reports */}
      {activeSubTab === 'financials' && (
        <FinancialReports restaurant={currentRestaurant} />
      )}

      {/* Tab 4: Staff Management */}
      {activeSubTab === 'staff' && (
        <StaffManager restaurant={currentRestaurant} />
      )}

      {/* Tab 5: Settings */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 max-w-3xl">
          {/* Kitchen Capacity & Anti-Overwhelm Throttle */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#132218] font-display flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-[#DE5124]" />
                  <span>Kitchen Capacity & Throttle Controls</span>
                </h3>
                <p className="text-xs text-[#4F6155] mt-0.5">
                  Protect your kitchen from sudden peak rush surges by automatically pacing or capping incoming tickets.
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                activeOrders.length >= 8 ? 'bg-[#FDE8E8] text-[#BA2D2D]' : 'bg-[#E1F0E6] text-[#247545]'
              }`}>
                {activeOrders.length} / 10 Max Active Tickets
              </span>
            </div>

            {activeOrders.length >= 8 && (
              <div className="p-3 bg-[#FFF8E6] border border-[#C48214]/40 rounded-xl text-xs text-[#132218] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#C48214] shrink-0" />
                <span>
                  <strong>High Kitchen Load:</strong> You currently have {activeOrders.length} active tickets. Consider switching ordering to <em>Directory Only</em> or pausing delivery if wait times exceed 35 minutes.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                <span className="font-bold text-[#132218] block">Estimated Prep Time</span>
                <p className="text-[11px] text-[#4F6155]">Current rush pacing</p>
                <select
                  value={currentRestaurant.estimatedDeliveryMin}
                  onChange={(e) => updateRestaurantDetails(currentRestaurant.id, { 
                    estimatedDeliveryMin: parseInt(e.target.value),
                    estimatedDeliveryMax: parseInt(e.target.value) + 15
                  })}
                  className="w-full bg-white border border-[#D9E2D9] rounded-xl px-2.5 py-1.5 font-mono text-xs text-[#132218] mt-1"
                >
                  <option value={15}>15–30 mins (Normal)</option>
                  <option value={25}>25–40 mins (Busy)</option>
                  <option value={45}>45–60 mins (Peak Rush)</option>
                </select>
              </div>

              <div className="p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                <span className="font-bold text-[#132218] block">1-Click Rush Pause</span>
                <p className="text-[11px] text-[#4F6155]">Temporarily halt new tickets</p>
                <button
                  type="button"
                  onClick={() => handleOrderingModeToggle(currentRestaurant.orderingMode === 'DIRECTORY_ONLY' ? 'ENABLED' : 'DIRECTORY_ONLY')}
                  className={`w-full py-1.5 rounded-xl font-bold text-xs mt-1 transition-all cursor-pointer ${
                    currentRestaurant.orderingMode === 'DIRECTORY_ONLY'
                      ? 'bg-[#247545] text-white'
                      : 'bg-[#C48214] text-white hover:bg-[#A86F11]'
                  }`}
                >
                  {currentRestaurant.orderingMode === 'DIRECTORY_ONLY' ? 'Resume Ordering' : 'Pause Orders (Rush)'}
                </button>
              </div>

              <div className="p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                <span className="font-bold text-[#132218] block">Minimum Order ($)</span>
                <p className="text-[11px] text-[#4F6155]">Small basket deterrent</p>
                <input
                  type="number"
                  value={currentRestaurant.minimumOrder}
                  onChange={(e) => updateRestaurantDetails(currentRestaurant.id, { minimumOrder: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-[#D9E2D9] rounded-xl px-2.5 py-1.5 font-mono text-xs text-[#132218] mt-1"
                />
              </div>
            </div>
          </div>

          {/* Active Fulfillment Channels: Dine-In, Takeaway, Delivery */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-[#132218] font-display flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#DE5124]" />
                  <span>Fulfillment Channels & Service Modes</span>
                </h3>
                <p className="text-xs text-[#4F6155] mt-0.5">
                  Select which ordering channels your restaurant accepts. You can operate exclusively as <strong>Dine-In Only</strong>, <strong>Takeaway Only</strong>, or enable all three.
                </p>
              </div>

              {currentServices.length === 1 && currentServices.includes('DINE_IN') && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
                  <span>🍽️</span> Active Mode: Dine-In Only
                </span>
              )}
            </div>

            {/* Preset Buttons for Instant Selection */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9]">
              <span className="text-[11px] font-bold text-[#4F6155] mr-1">Quick Channel Presets:</span>
              <button
                type="button"
                onClick={() => updateRestaurantDetails(currentRestaurant.id, { supportedServices: ['DINE_IN'] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentServices.length === 1 && currentServices.includes('DINE_IN')
                    ? 'bg-[#247545] text-white shadow-2xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
                }`}
              >
                <span>🍽️ Dine-In Only (No Delivery / Pickup)</span>
                {currentServices.length === 1 && currentServices.includes('DINE_IN') && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => updateRestaurantDetails(currentRestaurant.id, { supportedServices: ['DINE_IN', 'TAKEAWAY'] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentServices.length === 2 && currentServices.includes('DINE_IN') && currentServices.includes('TAKEAWAY')
                    ? 'bg-[#2C6E8E] text-white shadow-2xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
                }`}
              >
                <span>🍽️ + 🥡 Dine-In & Counter Takeaway</span>
              </button>

              <button
                type="button"
                onClick={() => updateRestaurantDetails(currentRestaurant.id, { supportedServices: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentServices.includes('DELIVERY') && currentServices.includes('DINE_IN') && currentServices.includes('TAKEAWAY')
                    ? 'bg-[#132218] text-white shadow-2xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
                }`}
              >
                <span>✨ All Channels (Delivery, Pickup, Dine-In)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              {/* Channel 1: Dine-In Table Service */}
              <div
                onClick={() => handleToggleService('DINE_IN')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  currentServices.includes('DINE_IN')
                    ? 'border-[#247545] bg-[#E1F0E6]/30 shadow-xs'
                    : 'border-[#D9E2D9] opacity-60 hover:opacity-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#132218] flex items-center gap-1.5">
                    <span>🍽️</span> Dine-In Table Service
                  </span>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    currentServices.includes('DINE_IN') ? 'bg-[#247545] text-white' : 'border border-stone-300 bg-white'
                  }`}>
                    {currentServices.includes('DINE_IN') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[11px] text-[#4F6155] leading-relaxed">
                  Customers scan printed QR table stands and order straight to your kitchen POS/KDS without registering an account.
                </p>
                <div className="text-[10px] font-bold text-[#247545]">
                  {currentServices.includes('DINE_IN') ? '✓ QR Table Ordering Enabled' : '✕ Dine-In Disabled'}
                </div>
              </div>

              {/* Channel 2: Takeaway / Self-Pickup */}
              <div
                onClick={() => handleToggleService('TAKEAWAY')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  currentServices.includes('TAKEAWAY')
                    ? 'border-[#2C6E8E] bg-[#EAF2F6]/50 shadow-xs'
                    : 'border-[#D9E2D9] opacity-60 hover:opacity-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#132218] flex items-center gap-1.5">
                    <span>🥡</span> Takeaway / Pickup
                  </span>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    currentServices.includes('TAKEAWAY') ? 'bg-[#2C6E8E] text-white' : 'border border-stone-300 bg-white'
                  }`}>
                    {currentServices.includes('TAKEAWAY') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[11px] text-[#4F6155] leading-relaxed">
                  Customers place orders online and pick them up hot at your store counter. ($0 delivery fee).
                </p>
                <div className="text-[10px] font-bold text-[#2C6E8E]">
                  {currentServices.includes('TAKEAWAY') ? '✓ Counter Pickup Enabled' : '✕ Takeaway Disabled'}
                </div>
              </div>

              {/* Channel 3: Doorstep Delivery */}
              <div
                onClick={() => handleToggleService('DELIVERY')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                  currentServices.includes('DELIVERY')
                    ? 'border-[#DE5124] bg-[#FDE8E0]/30 shadow-xs'
                    : 'border-[#D9E2D9] opacity-60 hover:opacity-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#132218] flex items-center gap-1.5">
                    <span>🛵</span> Doorstep Delivery
                  </span>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                    currentServices.includes('DELIVERY') ? 'bg-[#DE5124] text-white' : 'border border-stone-300 bg-white'
                  }`}>
                    {currentServices.includes('DELIVERY') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[11px] text-[#4F6155] leading-relaxed">
                  Dispatches orders for home or office delivery across Brunei districts using in-house drivers or freelance runners.
                </p>
                <div className="text-[10px] font-bold text-[#DE5124]">
                  {currentServices.includes('DELIVERY') ? '✓ Delivery Active' : '✕ Delivery Disabled'}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Fulfillment Routing & In-House vs Platform Runner */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-base text-[#132218] font-display flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#247545]" />
                <span>Delivery Fulfillment & Courier Routing</span>
              </h3>
              <p className="text-xs text-[#4F6155] mt-0.5">
                Choose whether orders dispatch to the public freelance courier fleet or stay assigned strictly to your in-house drivers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div 
                onClick={() => updateRestaurantDetails(currentRestaurant.id, { fulfillmentType: 'IN_HOUSE_RUNNER' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                  currentRestaurant.fulfillmentType === 'IN_HOUSE_RUNNER'
                    ? 'border-[#247545] bg-[#E1F0E6]/30'
                    : 'border-[#D9E2D9] hover:border-[#B8C7B8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#132218]">🏠 In-House Courier Only</span>
                  {currentRestaurant.fulfillmentType === 'IN_HOUSE_RUNNER' && <Check className="w-4 h-4 text-[#247545]" />}
                </div>
                <p className="text-[11px] text-[#4F6155] leading-relaxed">
                  Delivery orders stay internal and will <strong>NOT</strong> broadcast to public runners. Your hired driver (e.g. Faisal) receives all tickets.
                </p>
              </div>

              <div 
                onClick={() => updateRestaurantDetails(currentRestaurant.id, { fulfillmentType: 'PLATFORM_RUNNER' })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                  currentRestaurant.fulfillmentType === 'PLATFORM_RUNNER'
                    ? 'border-[#DE5124] bg-[#FDE8E0]/30'
                    : 'border-[#D9E2D9] hover:border-[#B8C7B8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#132218]">🛵 Platform Public Runners</span>
                  {currentRestaurant.fulfillmentType === 'PLATFORM_RUNNER' && <Check className="w-4 h-4 text-[#DE5124]" />}
                </div>
                <p className="text-[11px] text-[#4F6155] leading-relaxed">
                  Broadcasts ready tickets to all freelance runners operating in your Brunei district (Muara, Tutong, Belait, Temburong).
                </p>
              </div>
            </div>

            {/* Custom Restaurant Delivery Surcharge */}
            <div className="pt-3 border-t border-[#EDF1EC] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-[#4F6155] block mb-1">Store Base Delivery Charge ($)</label>
                <input
                  type="number"
                  step="0.50"
                  value={currentRestaurant.deliveryFee}
                  onChange={(e) => updateRestaurantDetails(currentRestaurant.id, { deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] font-mono"
                />
                <span className="text-[10px] text-[#7A8E80] mt-1 block">Set $0 if charging by Brunei district distance matrix.</span>
              </div>

              <div>
                <label className="font-semibold text-[#4F6155] block mb-1">Direct WhatsApp for Orders & Inquiries</label>
                <input
                  type="text"
                  value={currentRestaurant.whatsappPhone || currentRestaurant.phone}
                  onChange={(e) => updateRestaurantDetails(currentRestaurant.id, { whatsappPhone: e.target.value })}
                  placeholder="+673 876 5432"
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: B2B Wholesale Supplies (Phase 6B) */}
      {activeSubTab === 'b2b-wholesale' && (
        <B2BWholesaleHub restaurant={currentRestaurant} />
      )}

      {/* Tab: KYC & Platform Subscription */}
      {activeSubTab === 'kyc-subscription' && (
        <KycSubscriptionManager restaurant={currentRestaurant} />
      )}
    </div>
  );
};
