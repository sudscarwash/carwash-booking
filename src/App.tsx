import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider, useRestaurants } from './context/RestaurantContext';
import { OrderProvider, useOrders } from './context/OrderContext';
import { PlatformProvider } from './context/PlatformContext';

import { Header } from './components/common/Header';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { AuthModal } from './components/common/AuthModal';
import { RestaurantDiscovery } from './components/customer/RestaurantDiscovery';
import { YellowPagesDirectory } from './components/customer/YellowPagesDirectory';
import { RestaurantDetail } from './components/customer/RestaurantDetail';
import { CartDrawer } from './components/customer/CartDrawer';
import { CheckoutModal } from './components/customer/CheckoutModal';
import { OrderTracker } from './components/customer/OrderTracker';
import { CustomerOrderHistory } from './components/customer/CustomerOrderHistory';
import { GlobalNotificationPopup } from './components/common/GlobalNotificationPopup';

import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { StaffDashboard } from './components/employee/StaffDashboard';
import { RunnerDashboard } from './components/runner/RunnerDashboard';
import { SpecialUserDashboard } from './components/special/SpecialUserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

import { Restaurant, Order } from './types';
import { ArrowLeft, Lock } from 'lucide-react';
import { ENABLE_DEV_TOOLS } from './config/environment';

const AccessRestrictedCard: React.FC<{ roleName: string; onSignIn: () => void }> = ({ roleName, onSignIn }) => (
  <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#D9E2D9] max-w-lg mx-auto space-y-4 my-12 shadow-sm animate-fadeIn">
    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
      <Lock className="w-7 h-7" />
    </div>
    <div className="space-y-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
        Access Restricted
      </span>
      <h2 className="text-xl font-extrabold text-[#132218] font-display">Authentication Required</h2>
    </div>
    <p className="text-xs text-[#4F6155] leading-relaxed">
      This workspace requires an active <strong>{roleName}</strong> account. Please sign in with authorized credentials to continue.
    </p>
    <button
      onClick={onSignIn}
      className="px-6 py-2.5 bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
    >
      Sign In as {roleName}
    </button>
  </div>
);

const MainLayout: React.FC = () => {
  const { currentUser, openAuthModal } = useAuth();
  const { restaurants } = useRestaurants();
  const { orders, verifyTableQrSession } = useOrders();
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [currentCustomerView, setCurrentCustomerView] = useState<'DISCOVER' | 'DIRECTORY' | 'RESTAURANT_DETAIL' | 'ORDERS' | 'TRACKER'>('DISCOVER');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [tableBannerNotice, setTableBannerNotice] = useState<string | null>(null);

  // Check URL params and hash for direct linking / QR code table scanning (?r=rest_1&t=4 or #restaurant=rest_1&table=Table%204)
  useEffect(() => {
    const handleUrlNavigation = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const restoParam = searchParams.get('restaurant') || searchParams.get('r');
      const tableParam = searchParams.get('table') || searchParams.get('t');
      
      let hashRestoId: string | null = null;
      let hashTableParam: string | null = null;

      if (window.location.hash) {
        const hashStr = window.location.hash.replace(/^#/, '');
        if (hashStr.includes('&') || hashStr.includes('=')) {
          const hashParams = new URLSearchParams(hashStr);
          hashRestoId = hashParams.get('restaurant') || hashParams.get('r');
          hashTableParam = hashParams.get('table') || hashParams.get('t');
        }
        if (!hashRestoId) {
          if (hashStr.startsWith('restaurant=')) hashRestoId = hashStr.replace('restaurant=', '');
          else if (hashStr.startsWith('r=')) hashRestoId = hashStr.replace('r=', '');
        }
      }

      const targetId = restoParam || hashRestoId;
      const targetTable = tableParam || hashTableParam;

      if (targetId && restaurants.length > 0) {
        const found = restaurants.find(r => r.id === targetId || r.slug === targetId);
        if (found) {
          setSelectedRestaurant(found);
          setCurrentCustomerView('RESTAURANT_DETAIL');
          setCurrentTab('discover');

          if (targetTable) {
            const cleanTable = decodeURIComponent(targetTable).trim();
            const formattedTable = cleanTable.toLowerCase().startsWith('table') ? cleanTable : `Table ${cleanTable}`;
            verifyTableQrSession(formattedTable);
            setTableBannerNotice(`🍽️ Seated at ${formattedTable}! In-store table ordering authenticated via QR stand.`);
            setTimeout(() => setTableBannerNotice(null), 6000);
          }
        }
      }
    };

    handleUrlNavigation();
    window.addEventListener('hashchange', handleUrlNavigation);
    return () => window.removeEventListener('hashchange', handleUrlNavigation);
  }, [restaurants, verifyTableQrSession]);

  // Sync tab when user changes persona/role
  useEffect(() => {
    if (currentUser.role === 'RESTAURANT_OWNER') {
      setCurrentTab('owner-portal');
    } else if (currentUser.role === 'EMPLOYEE') {
      setCurrentTab('kitchen-kds');
    } else if (currentUser.role === 'RUNNER') {
      setCurrentTab('runner-dispatch');
    } else if (currentUser.role === 'SPECIAL_USER') {
      setCurrentTab('special-onboarding');
    } else if (currentUser.role === 'SUPER_ADMIN') {
      setCurrentTab('admin-panel');
    } else if (currentUser.role === 'COMMUNITY_SCOUT') {
      setCurrentTab('directory');
    } else {
      // CUSTOMER or GUEST
      if (currentTab !== 'directory' && currentTab !== 'orders') {
        setCurrentTab('discover');
      }
    }
  }, [currentUser.role]);

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentCustomerView('RESTAURANT_DETAIL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setCurrentCustomerView('TRACKER');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCompleted = () => {
    // Select the latest order
    if (orders.length > 0) {
      setSelectedOrder(orders[0]);
      setCurrentCustomerView('TRACKER');
      setCurrentTab('orders');
    } else {
      setCurrentCustomerView('ORDERS');
      setCurrentTab('orders');
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'discover') {
      setSelectedRestaurant(null);
      setCurrentCustomerView('DISCOVER');
    } else if (tab === 'directory') {
      setSelectedRestaurant(null);
      setCurrentCustomerView('DIRECTORY');
    } else if (tab === 'orders') {
      setCurrentCustomerView('ORDERS');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F7F4] text-[#132218] flex flex-col selection:bg-[#DE5124] selection:text-white">
      {/* Top Floating Interactive Role Switcher for seamless testing */}
      <RoleSwitcher />

      {/* Top Universal Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateHome={() => {
          setSelectedRestaurant(null);
          setCurrentCustomerView('DISCOVER');
          setCurrentTab('discover');
        }}
        onNavigateOrders={() => {
          setCurrentCustomerView('ORDERS');
          setCurrentTab('orders');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-12">
        {/* Global tab routing: if user clicked directory or discover from any role */}
        {currentTab === 'directory' && (
          <div>
            {currentCustomerView === 'RESTAURANT_DETAIL' && selectedRestaurant ? (
              <RestaurantDetail
                restaurant={selectedRestaurant}
                onBack={() => {
                  setSelectedRestaurant(null);
                  setCurrentCustomerView('DIRECTORY');
                }}
                onOpenCart={() => setIsCartOpen(true)}
                onProceedToCheckout={() => setIsCheckoutOpen(true)}
              />
            ) : (
              <YellowPagesDirectory
                onSelectRestaurant={handleSelectRestaurant}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}
          </div>
        )}

        {currentTab === 'discover' && (
          <div>
            {currentCustomerView === 'DISCOVER' && (
              <RestaurantDiscovery
                onSelectRestaurant={handleSelectRestaurant}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentCustomerView === 'RESTAURANT_DETAIL' && selectedRestaurant && (
              <RestaurantDetail
                restaurant={selectedRestaurant}
                onBack={() => {
                  setSelectedRestaurant(null);
                  setCurrentCustomerView('DISCOVER');
                }}
                onOpenCart={() => setIsCartOpen(true)}
                onProceedToCheckout={() => setIsCheckoutOpen(true)}
              />
            )}
          </div>
        )}

        {currentTab === 'orders' && (
          <div>
            {currentCustomerView === 'TRACKER' && selectedOrder ? (
              <div className="space-y-4">
                <button
                  onClick={() => setCurrentCustomerView('ORDERS')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F6155] hover:text-[#132218] bg-white border border-[#D9E2D9] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Orders</span>
                </button>
                <OrderTracker order={selectedOrder} onBackToExplore={() => handleTabChange('discover')} />
              </div>
            ) : (
              <CustomerOrderHistory
                onSelectOrder={handleSelectOrder}
                onExplore={() => handleTabChange('discover')}
              />
            )}
          </div>
        )}

        {/* RESTAURANT OWNER PORTAL */}
        {currentTab === 'owner-portal' && (
          (ENABLE_DEV_TOOLS || ['RESTAURANT_OWNER', 'SUPER_ADMIN', 'SPECIAL_USER'].includes(currentUser.role)) ? (
            <OwnerDashboard />
          ) : (
            <AccessRestrictedCard
              roleName="Restaurant Owner"
              onSignIn={() => openAuthModal('SIGN_IN', 'RESTAURANT_OWNER')}
            />
          )
        )}

        {/* RESTAURANT EMPLOYEE (FLOOR POS, ACTIVE TABLES, KDS) */}
        {currentTab === 'kitchen-kds' && (
          (ENABLE_DEV_TOOLS || ['EMPLOYEE', 'RESTAURANT_OWNER', 'SUPER_ADMIN'].includes(currentUser.role)) ? (
            <StaffDashboard />
          ) : (
            <AccessRestrictedCard
              roleName="Restaurant Staff"
              onSignIn={() => openAuthModal('SIGN_IN', 'EMPLOYEE')}
            />
          )
        )}

        {/* COURIER / RUNNER */}
        {currentTab === 'runner-dispatch' && (
          (ENABLE_DEV_TOOLS || ['RUNNER', 'SUPER_ADMIN', 'SPECIAL_USER'].includes(currentUser.role)) ? (
            <RunnerDashboard />
          ) : (
            <AccessRestrictedCard
              roleName="Delivery Runner"
              onSignIn={() => openAuthModal('SIGN_IN', 'RUNNER')}
            />
          )
        )}

        {/* SPECIAL USER (OPERATIONS HUB / SALES / ONBOARDING SPECIALIST) */}
        {currentTab === 'special-onboarding' && (
          (ENABLE_DEV_TOOLS || ['SPECIAL_USER', 'SUPER_ADMIN'].includes(currentUser.role)) ? (
            <SpecialUserDashboard />
          ) : (
            <AccessRestrictedCard
              roleName="Operations Special User"
              onSignIn={() => openAuthModal('SIGN_IN', 'SPECIAL_USER')}
            />
          )
        )}

        {/* SUPER ADMIN PLATFORM GOVERNANCE */}
        {currentTab === 'admin-panel' && (
          (ENABLE_DEV_TOOLS || currentUser.role === 'SUPER_ADMIN') ? (
            <AdminDashboard />
          ) : (
            <AccessRestrictedCard
              roleName="Super Admin"
              onSignIn={() => openAuthModal('SIGN_IN', 'SUPER_ADMIN')}
            />
          )
        )}
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Authentication & Persona Switching Modal */}
      <AuthModal />

      {/* Global Real-Time Popup Notification Banner for Off-Screen & In-App Alerts */}
      <GlobalNotificationPopup
        onSelectOrder={(orderId) => {
          const match = orders.find(o => o.id === orderId);
          if (match) {
            handleSelectOrder(match);
          }
        }}
      />

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onNavigateHome={() => {
          setSelectedRestaurant(null);
          setCurrentCustomerView('DISCOVER');
          setCurrentTab('discover');
        }}
        onNavigateOrders={() => {
          setCurrentCustomerView('ORDERS');
          setCurrentTab('orders');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PlatformProvider>
        <RestaurantProvider>
          <OrderProvider>
            <MainLayout />
          </OrderProvider>
        </RestaurantProvider>
      </PlatformProvider>
    </AuthProvider>
  );
}
