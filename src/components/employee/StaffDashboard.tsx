import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { StaffOrderTerminal } from './StaffOrderTerminal';
import { StaffActiveOrders } from './StaffActiveOrders';
import { KitchenDisplaySystem } from './KitchenDisplaySystem';
import { StaffMenuReference } from './StaffMenuReference';
import { StaffTableMap } from './StaffTableMap';
import { TableQrManager } from '../owner/TableQrManager';
import { Quick86Manager } from '../common/Quick86Manager';
import { CashierCheckoutTerminal } from '../common/CashierCheckoutTerminal';
import { SHOW_DEMO_ACCOUNTS } from '../../config/environment';
import { 
  Utensils, 
  ClipboardList, 
  Flame, 
  BookOpen, 
  Store, 
  ChevronDown, 
  UserCheck, 
  Sparkles, 
  Layers, 
  LayoutGrid, 
  AlertOctagon, 
  Bell, 
  Check, 
  ShoppingBag, 
  Bike, 
  Lock, 
  ShieldCheck, 
  QrCode,
  DollarSign
} from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { currentUser, setCurrentUserRole } = useAuth();
  const { restaurants } = useRestaurants();
  const { orders, notifications, markNotificationAsRead } = useOrders();

  // Pick assigned restaurant or first available restaurant
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(() => {
    if (currentUser.restaurantId) {
      const match = restaurants.find(r => r.id === currentUser.restaurantId);
      if (match) return match.id;
    }
    return SHOW_DEMO_ACCOUNTS ? (restaurants[0]?.id || 'rest_1') : '';
  });

  const [activeTab, setActiveTab] = useState<'POS' | 'CASHIER' | 'TABLE_MAP' | 'TABLE_QR' | 'ACTIVE_ORDERS' | 'KDS' | 'QUICK_86' | 'MENU_REFERENCE'>('POS');
  const [targetTableForPos, setTargetTableForPos] = useState<string>('1');

  // If user has a hardcoded restaurantId (e.g. employee or dedicated in-house staff), lock to it
  const effectiveRestaurantId = currentUser.restaurantId || selectedRestaurantId;
  const currentRestaurant = restaurants.find(r => r.id === effectiveRestaurantId) || (SHOW_DEMO_ACCOUNTS ? restaurants[0] : null);

  // Active orders count strictly for this restaurant
  const restaurantOrders = orders.filter(o => 
    o.restaurantId === currentRestaurant?.id && 
    !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)
  );

  const activeOrdersCount = restaurantOrders.length;
  const dineInCount = restaurantOrders.filter(o => o.serviceType === 'DINE_IN').length;
  const takeawayCount = restaurantOrders.filter(o => o.serviceType === 'TAKEAWAY').length;
  const deliveryCount = restaurantOrders.filter(o => o.serviceType === 'DELIVERY').length;

  const kdsQueueCount = orders.filter(o => 
    o.restaurantId === currentRestaurant?.id && 
    ['PENDING', 'PREPARING'].includes(o.status)
  ).length;

  // Live floor requests & assistance calls strictly for THIS restaurant
  const staffAlerts = notifications.filter(n => {
    if (n.isRead) return false;
    if (n.userId === currentUser.id) return true;
    if (n.userId === 'staff_all') {
      if (n.restaurantId) return n.restaurantId === currentRestaurant?.id;
      if (n.orderId) {
        const ord = orders.find(o => o.id === n.orderId);
        return ord?.restaurantId === currentRestaurant?.id;
      }
      return false;
    }
    return false;
  });

  if (!currentRestaurant) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#D9E2D9] max-w-lg mx-auto space-y-4 my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-200">
          <Store className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
            Station Unassigned
          </span>
          <h2 className="text-xl font-extrabold text-[#132218]">No Store Branch Assigned</h2>
        </div>
        <p className="text-xs text-[#4F6155] leading-relaxed">
          You are signed in as employee <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.email}), but have not been assigned to a restaurant branch yet.
        </p>
        <p className="text-[11px] text-[#7A8E80]">
          Please contact your restaurant owner or manager to send you a staff roster invitation code from their Merchant Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Staff Identity & Station Banner */}
      <div className="bg-[#132218] text-white rounded-3xl p-6 border border-[#2D3E33] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#247545] animate-ping"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#A2B6A6]">
              Floor & Kitchen Staff Terminal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-1 flex items-center gap-2">
            <span>{currentRestaurant.name}</span>
          </h1>
          <p className="text-xs text-[#C5D5C8] mt-1">
            Logged in as <strong className="text-white">{currentUser.firstName} {currentUser.lastName}</strong> • Service Station #1
          </p>
        </div>

        {/* Restaurant Switcher & Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Assignment Lock or Multi-branch selector */}
          {currentUser.restaurantId ? (
            <div className="flex items-center gap-2.5 bg-[#1C3224] px-3.5 py-2 rounded-2xl border border-[#2D3E33]">
              <Lock className="w-3.5 h-3.5 text-[#247545]" />
              <div className="text-left">
                <span className="text-[10px] text-[#A2B6A6] block font-mono uppercase tracking-wider leading-none">
                  Assigned Branch
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                  {currentRestaurant.name}
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#247545]/40 text-[#86EFAC] rounded font-mono font-medium">
                    Strict Isolation
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#1C3224] px-3 py-2 rounded-2xl border border-[#2D3E33]">
              <Store className="w-3.5 h-3.5 text-[#DE5124]" />
              <select
                value={selectedRestaurantId}
                onChange={e => setSelectedRestaurantId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id} className="bg-[#132218] text-white">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#233529] border border-[#3E5345] text-xs font-mono font-bold text-[#E0F2E6] flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-[#247545]" />
              {dineInCount} Dine-In
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#233529] border border-[#3E5345] text-xs font-mono font-bold text-[#E0F2E6] flex items-center gap-1.5">
              <ShoppingBag className="w-3 h-3 text-[#2C6E8E]" />
              {takeawayCount} Takeaway
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#233529] border border-[#3E5345] text-xs font-mono font-bold text-[#E0F2E6] flex items-center gap-1.5">
              <Bike className="w-3 h-3 text-[#DE5124]" />
              {deliveryCount} Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Live Floor Assistance & Customer Requests Alert Banner */}
      {staffAlerts.length > 0 && (
        <div className="bg-[#FFF4ED] border-2 border-[#DE5124] rounded-3xl p-4 sm:p-5 shadow-sm animate-pulse-subtle">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DE5124] text-white flex items-center justify-center animate-bounce">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#132218] font-display flex items-center gap-2">
                  <span>Customer Service & Floor Assistance Alerts</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#DE5124] text-white text-[11px] font-mono font-bold">
                    {staffAlerts.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-[#7A8E80]">
                  Guests at dining tables have dispatched requests directly from their phones
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE_ORDERS')}
              className="text-xs font-bold text-[#DE5124] hover:underline cursor-pointer hidden sm:block"
            >
              Open Active Orders
            </button>
          </div>

          <div className="space-y-2">
            {staffAlerts.map(alert => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-3 border border-[#F9D0C4] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-black text-[#132218]">{alert.title}</h4>
                  <p className="text-xs text-[#4F6155] mt-0.5">{alert.message}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACTIVE_ORDERS')}
                    className="px-3 py-1.5 rounded-xl bg-[#F5F7F4] hover:bg-[#EDF1EC] text-xs font-bold text-[#132218] border border-[#D9E2D9] cursor-pointer"
                  >
                    View Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => markNotificationAsRead(alert.id)}
                    className="px-3 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1B5733] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('POS')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'POS'
              ? 'bg-[#DE5124] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Dine-In POS / New Order</span>
        </button>

        <button
          onClick={() => setActiveTab('CASHIER')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'CASHIER'
              ? 'bg-[#247545] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <DollarSign className="w-4 h-4 text-inherit" />
          <span>Cashier Counter / Cash Checkout</span>
        </button>

        <button
          onClick={() => setActiveTab('TABLE_MAP')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'TABLE_MAP'
              ? 'bg-[#247545] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-inherit" />
          <span>Floor Plan & Tables</span>
        </button>

        <button
          onClick={() => setActiveTab('TABLE_QR')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'TABLE_QR'
              ? 'bg-[#247545] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <QrCode className="w-4 h-4 text-inherit" />
          <span>Table QR Stands & Present to Guest</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE_ORDERS')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'ACTIVE_ORDERS'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Active Orders</span>
          {activeOrdersCount > 0 && (
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'ACTIVE_ORDERS' ? 'bg-[#DE5124] text-white' : 'bg-[#132218] text-white'
            }`}>
              {activeOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('KDS')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'KDS'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <Flame className="w-4 h-4 text-[#DE5124]" />
          <span>Kitchen Queue (KDS)</span>
          {kdsQueueCount > 0 && (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#DE5124] text-white">
              {kdsQueueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('QUICK_86')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'QUICK_86'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>86 / Out-of-Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('MENU_REFERENCE')}
          className={`px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'MENU_REFERENCE'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218] hover:border-[#132218]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#247545]" />
          <span>Full Menu Reference</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'POS' && (
          <StaffOrderTerminal 
            restaurant={currentRestaurant}
            initialTableNumber={targetTableForPos}
            onOrderCreated={() => setActiveTab('ACTIVE_ORDERS')}
          />
        )}

        {activeTab === 'CASHIER' && (
          <CashierCheckoutTerminal 
            restaurant={currentRestaurant}
          />
        )}

        {activeTab === 'TABLE_MAP' && (
          <StaffTableMap
            restaurant={currentRestaurant}
            onOpenPosForTable={(tableNum) => {
              setTargetTableForPos(tableNum.replace(/[^0-9]/g, '') || '1');
              setActiveTab('POS');
            }}
            onModifyOrder={(order) => {
              setActiveTab('ACTIVE_ORDERS');
            }}
          />
        )}

        {activeTab === 'TABLE_QR' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-300 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#247545] text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-950">Staff Table QR Presenter & Test Hub</h4>
                  <p className="text-[11px] text-emerald-800">
                    Show any table QR code or 4-digit PIN directly to seated diners from your tablet/phone, or test the diner ordering experience yourself with 1 click.
                  </p>
                </div>
              </div>
            </div>

            <TableQrManager
              restaurant={currentRestaurant}
              onOpenTableOrder={(tableNum) => {
                setTargetTableForPos(tableNum.replace(/[^0-9]/g, '') || '1');
                setActiveTab('POS');
              }}
            />
          </div>
        )}

        {activeTab === 'ACTIVE_ORDERS' && (
          <StaffActiveOrders 
            restaurant={currentRestaurant}
            onOpenNewOrder={() => setActiveTab('POS')}
          />
        )}

        {activeTab === 'KDS' && (
          <KitchenDisplaySystem restaurantId={currentRestaurant.id} />
        )}

        {activeTab === 'QUICK_86' && (
          <Quick86Manager
            restaurant={currentRestaurant}
            userRole="EMPLOYEE"
          />
        )}

        {activeTab === 'MENU_REFERENCE' && (
          <StaffMenuReference 
            restaurant={currentRestaurant}
          />
        )}
      </div>
    </div>
  );
};
