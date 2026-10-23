import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { ShoppingBag, BookOpen, Clock, Store, ChefHat, Bike, Sparkles, ShieldAlert, User, Camera } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onNavigateHome: () => void;
  onNavigateOrders: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  onNavigateHome,
  onNavigateOrders,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  const { activeOrder, cart } = useOrders();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Role-specific workspace button
  const getWorkspaceItem = () => {
    switch (currentUser.role) {
      case 'RESTAURANT_OWNER':
        return {
          tab: 'owner-portal',
          label: 'Merchant',
          icon: Store,
          badgeColor: 'bg-[#E0562B]',
        };
      case 'EMPLOYEE':
        return {
          tab: 'kitchen-kds',
          label: 'Staff POS',
          icon: ChefHat,
          badgeColor: 'bg-teal-600',
        };
      case 'RUNNER':
        return {
          tab: 'runner-dispatch',
          label: 'Runner',
          icon: Bike,
          badgeColor: 'bg-sky-600',
        };
      case 'SPECIAL_USER':
        return {
          tab: 'special-onboarding',
          label: 'Ops Hub',
          icon: Sparkles,
          badgeColor: 'bg-amber-600',
        };
      case 'SUPER_ADMIN':
        return {
          tab: 'admin-panel',
          label: 'Admin',
          icon: ShieldAlert,
          badgeColor: 'bg-red-600',
        };
      case 'COMMUNITY_SCOUT':
        return {
          tab: 'directory',
          label: 'Scout Hub',
          icon: Camera,
          badgeColor: 'bg-indigo-600',
        };
      default:
        return null;
    }
  };

  const workspace = getWorkspaceItem();

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DCE3DD] px-2 py-1.5 shadow-lg"
    >
      <div className="grid grid-cols-4 items-center justify-around">
        {/* Tab 1: Order / Discover */}
        <button
          onClick={() => {
            setCurrentTab('discover');
            onNavigateHome();
          }}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors ${
            currentTab === 'discover'
              ? 'text-[#E0562B]'
              : 'text-[#526056] hover:text-[#16241B]'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && currentTab !== 'discover' && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#E0562B] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Order</span>
        </button>

        {/* Tab 2: Yellow Pages Directory */}
        <button
          onClick={() => setCurrentTab('directory')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors ${
            currentTab === 'directory'
              ? 'text-[#E0562B]'
              : 'text-[#526056] hover:text-[#16241B]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Directory</span>
        </button>

        {/* Tab 3: My Orders */}
        <button
          onClick={() => {
            setCurrentTab('orders');
            onNavigateOrders();
          }}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors ${
            currentTab === 'orders'
              ? 'text-[#E0562B]'
              : 'text-[#526056] hover:text-[#16241B]'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {activeOrder && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#2F7A4F] rounded-full border-2 border-white animate-pulse"></span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Orders</span>
        </button>

        {/* Tab 4: Workspace or Profile */}
        {workspace ? (
          <button
            onClick={() => setCurrentTab(workspace.tab)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors ${
              currentTab === workspace.tab
                ? 'text-[#E0562B]'
                : 'text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <workspace.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{workspace.label}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (isAuthenticated && currentUser.id !== 'usr_guest') {
                setCurrentTab('discover');
              } else {
                openAuthModal('SIGN_IN');
              }
            }}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[#526056] hover:text-[#16241B] transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 tracking-tight">
              {isAuthenticated && currentUser.id !== 'usr_guest' ? currentUser.firstName : 'Account'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
