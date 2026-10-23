import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { usePlatform } from '../../context/PlatformContext';
import { 
  ShoppingBag, 
  Bell, 
  Search, 
  Store, 
  ChefHat, 
  Bike, 
  ShieldAlert, 
  Sparkles,
  BookOpen,
  LogIn,
  LogOut,
  ChevronDown,
  UserPlus,
  HelpCircle,
  Menu,
  X,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Compass,
  Camera,
  Trash2,
} from 'lucide-react';
import { BruneiDistrictMatrixGrid } from './BruneiDistrictMatrixGrid';
import { DeleteAccountModal } from './DeleteAccountModal';

interface HeaderProps {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onOpenCart?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onNavigateHome?: () => void;
  onNavigateOrders?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab = 'discover',
  setCurrentTab = (_tab: string) => {},
  onOpenCart = () => {},
  searchQuery = '',
  setSearchQuery = (_q: string) => {},
  onNavigateHome,
  onNavigateOrders,
}) => {
  const { currentUser, isAuthenticated, openAuthModal, logout } = useAuth();
  const { 
    cart, 
    notifications, 
    markNotificationAsRead, 
    clearAllNotifications, 
    activeOrder,
    soundEnabled,
    setSoundEnabled,
    testNotificationSound,
    desktopPermission,
    requestDesktopPermission
  } = useOrders();
  const { config } = usePlatform();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const handleTabClick = (tab: string) => {
    if (setCurrentTab) {
      setCurrentTab(tab);
    }
    if (tab === 'discover' && onNavigateHome) {
      onNavigateHome();
    }
    if (tab === 'orders' && onNavigateOrders) {
      onNavigateOrders();
    }
    setIsMobileMenuOpen(false);
    setShowAccountMenu(false);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadNotifs = notifications.filter(n => !n.isRead);

  // Determine user workspace tab
  const getWorkspaceTab = () => {
    switch (currentUser.role) {
      case 'RESTAURANT_OWNER': return { tab: 'owner-portal', label: 'Merchant Portal', icon: Store, color: 'text-[#E0562B]' };
      case 'EMPLOYEE': return { tab: 'kitchen-kds', label: 'Kitchen & Floor POS', icon: ChefHat, color: 'text-teal-600' };
      case 'RUNNER': return { tab: 'runner-dispatch', label: 'Runner Fleet', icon: Bike, color: 'text-sky-600' };
      case 'SPECIAL_USER': return { tab: 'special-onboarding', label: 'Operations Hub', icon: Sparkles, color: 'text-amber-600' };
      case 'SUPER_ADMIN': return { tab: 'admin-panel', label: 'System Admin', icon: ShieldAlert, color: 'text-red-600' };
      case 'COMMUNITY_SCOUT': return { tab: 'directory', label: 'Scout Yellow Pages', icon: Camera, color: 'text-indigo-600' };
      default: return null;
    }
  };

  const workspace = getWorkspaceTab();

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-[#DCE3DD] sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
            
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 min-w-0">
              <button
                onClick={() => handleTabClick('discover')}
                className="flex items-center gap-2 group text-left cursor-pointer select-none min-w-0"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#E0562B] flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 font-black text-base sm:text-lg shrink-0">
                  F
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#16241B] flex items-center truncate">
                    FOODFINDR
                    <span className="text-[#E0562B] text-xl leading-none">.</span>
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[#526056] -mt-1">
                    <span>🇧🇳 Brunei Food Directory</span>
                  </span>
                </div>
              </button>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 ml-1">
                <button
                  onClick={() => handleTabClick('discover')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentTab === 'discover'
                      ? 'bg-[#FBE4DA] text-[#E0562B]'
                      : 'text-[#526056] hover:text-[#16241B] hover:bg-[#F6F7F5]'
                  }`}
                >
                  Order Online
                </button>

                <button
                  onClick={() => handleTabClick('directory')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'directory'
                      ? 'bg-[#FBE4DA] text-[#E0562B]'
                      : 'text-[#526056] hover:text-[#16241B] hover:bg-[#F6F7F5]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Yellow Pages</span>
                </button>

                {/* Quick Brunei 4-District Rates Grid button */}
                <button
                  onClick={() => setShowRatesModal(true)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#526056] hover:text-[#16241B] hover:bg-[#F6F7F5] transition-all flex items-center gap-1.5 cursor-pointer border border-[#DCE3DD]"
                  title="View Brunei 4-District Rates Grid (Belait to Belait, Belait to Muara, etc.)"
                >
                  <Compass className="w-3.5 h-3.5 text-[#247545]" />
                  <span className="hidden xl:inline">Delivery Rates Grid</span>
                  <span className="xl:hidden">Rates Grid</span>
                </button>

                {/* Workspace tab for non-customer roles */}
                {workspace && (
                  <button
                    onClick={() => handleTabClick(workspace.tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      currentTab === workspace.tab
                        ? 'bg-[#16241B] text-white border-[#16241B]'
                        : 'bg-[#F6F7F5] text-[#16241B] border-[#DCE3DD] hover:border-[#E0562B]'
                    }`}
                  >
                    <workspace.icon className={`w-3.5 h-3.5 ${currentTab === workspace.tab ? 'text-[#E0562B]' : workspace.color}`} />
                    <span>{workspace.label}</span>
                  </button>
                )}

                {/* My Orders for Customer & Scout */}
                {(currentUser.role === 'CUSTOMER' || currentUser.role === 'COMMUNITY_SCOUT') && (
                  <button
                    onClick={() => handleTabClick('orders')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentTab === 'orders'
                        ? 'bg-[#FBE4DA] text-[#E0562B]'
                        : 'text-[#526056] hover:text-[#16241B] hover:bg-[#F6F7F5]'
                    }`}
                  >
                    <span>My Orders</span>
                    {activeOrder && (
                      <span className="w-2 h-2 rounded-full bg-[#2F7A4F] animate-pulse"></span>
                    )}
                  </button>
                )}
              </nav>
            </div>

            {/* Quick Search Bar (Desktop only, when on Discover) */}
            {currentTab === 'discover' && (
              <div className="hidden lg:flex flex-1 max-w-xs mx-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#526056]" />
                  <input
                    type="text"
                    placeholder="Search food, cafes, stalls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#16241B] placeholder:text-[#526056]/60 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
                  />
                </div>
              </div>
            )}

            {/* Right Actions: Notifications, Cart, Profile Menu, Mobile Hamburger */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Notifications */}
              <div className="relative">
                <button
                  id="header-notif-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-[#526056] hover:text-[#16241B] hover:bg-[#F6F7F5] transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#E0562B] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Popover */}
                {showNotifications && (
                  <div className="fixed inset-x-2.5 top-16 sm:inset-x-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white rounded-3xl shadow-2xl border border-[#DCE3DD] p-3.5 sm:p-4 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[82vh] flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-[#DCE3DD] shrink-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-[#16241B]">Notifications</h4>
                        <span className="text-[10px] bg-[#FBE4DA] text-[#E0562B] font-bold px-2 py-0.5 rounded-full">
                          {unreadNotifs.length} new
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadNotifs.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-[11px] text-[#E0562B] hover:underline font-semibold cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 sm:hidden"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Background & Off-Screen Alert Settings Bar */}
                    <div className="py-2 px-2.5 my-2 bg-[#F6F7F5] rounded-xl border border-[#DCE3DD] space-y-1.5 text-[11px] shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-[#16241B]">
                          <span>Sound Chimes:</span>
                          <span className={soundEnabled ? 'text-emerald-700' : 'text-stone-400'}>
                            {soundEnabled ? 'ON' : 'MUTED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => testNotificationSound()}
                            className="px-2 py-0.5 rounded bg-white border border-[#DCE3DD] text-[10px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                          >
                            🔊 Test Chime
                          </button>
                          <button
                            type="button"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              soundEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                            }`}
                          >
                            {soundEnabled ? 'Mute' : 'Enable'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#DCE3DD]/60">
                        <span className="text-stone-600">Off-Screen Desktop Popups:</span>
                        {desktopPermission === 'granted' ? (
                          <span className="text-emerald-700 font-bold text-[10px]">✓ Active</span>
                        ) : (
                          <button
                            type="button"
                            onClick={requestDesktopPermission}
                            className="px-2 py-0.5 bg-[#E0562B] text-white rounded text-[10px] font-bold cursor-pointer hover:bg-[#C9471E]"
                          >
                            Enable Alerts
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-y-auto divide-y divide-[#DCE3DD]/50 my-1 pr-1 flex-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#526056] py-6 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationAsRead(n.id)}
                            className={`py-2.5 px-2 rounded-xl cursor-pointer transition-colors ${
                              n.isRead ? 'opacity-70 hover:bg-[#F6F7F5]' : 'bg-[#FBE4DA]/30 hover:bg-[#FBE4DA]/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-[#16241B]">{n.title}</p>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#E0562B] shrink-0 mt-1"></span>}
                            </div>
                            <p className="text-[11px] text-[#526056] mt-0.5 leading-relaxed break-words whitespace-pre-line">{n.message}</p>
                            <span className="text-[10px] text-[#526056]/70 block mt-1 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Button */}
              <button
                id="header-cart-btn"
                onClick={onOpenCart}
                className="flex items-center gap-1.5 sm:gap-2 bg-[#16241B] hover:bg-[#2F7A4F] text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-[#FBE4DA]" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#E0562B] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <span className="text-[11px] text-[#FBE4DA] font-mono">({cartItemCount})</span>
                )}
              </button>

              {/* Single Unified User / Account Menu Trigger */}
              <div className="relative">
                {isAuthenticated && currentUser.id !== 'usr_guest' ? (
                  <button
                    id="header-user-menu-btn"
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#DCE3DD] hover:border-[#E0562B] bg-[#F6F7F5] hover:bg-white text-[#16241B] transition-all cursor-pointer"
                  >
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={currentUser.firstName}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-[#E0562B]"
                    />
                    <span className="hidden sm:inline truncate max-w-[85px]">{currentUser.firstName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#526056] transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <button
                    id="header-login-btn"
                    onClick={() => openAuthModal('SIGN_IN')}
                    className="flex items-center gap-1.5 bg-[#E0562B] hover:bg-[#B5431E] text-white px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Account Menu Dropdown */}
                {showAccountMenu && isAuthenticated && (
                  <div 
                    className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-64 max-w-sm bg-white rounded-2xl shadow-2xl border border-[#DCE3DD] p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setShowAccountMenu(false)}
                  >
                    <div className="p-2.5 border-b border-[#DCE3DD]/50">
                      <p className="text-xs font-extrabold text-[#16241B] truncate">{currentUser.firstName} {currentUser.lastName}</p>
                      <p className="text-[10px] text-[#526056] truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-[#FBE4DA] text-[#E0562B]">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="py-1 space-y-0.5 text-xs">
                      {workspace && (
                        <button
                          onClick={() => handleTabClick(workspace.tab)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#F6F7F5] font-bold text-[#16241B] cursor-pointer"
                        >
                          <workspace.icon className="w-4 h-4 text-[#E0562B]" />
                          <span>{workspace.label}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleTabClick('discover')}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#F6F7F5] text-[#526056] hover:text-[#16241B] cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order Food</span>
                      </button>

                      <button
                        onClick={() => handleTabClick('directory')}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#F6F7F5] text-[#526056] hover:text-[#16241B] cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Yellow Pages Directory</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          openAuthModal('REGISTER', 'RESTAURANT_OWNER');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#EBF5EF] text-[#2F7A4F] font-semibold cursor-pointer"
                      >
                        <Store className="w-4 h-4" />
                        <span>Partner: Add Restaurant</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          openAuthModal('REGISTER', 'RUNNER');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-[#DFEDF4] text-[#2C6E8E] font-semibold cursor-pointer"
                      >
                        <Bike className="w-4 h-4" />
                        <span>Courier: Register Runner</span>
                      </button>
                    </div>

                    <div className="pt-1.5 border-t border-[#DCE3DD]/50 space-y-0.5">
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          setShowDeleteAccountModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-[#526056] hover:text-rose-600 hover:bg-rose-50 cursor-pointer font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs text-red-600 hover:bg-red-50 cursor-pointer font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Menu Toggle */}
              <button
                id="header-mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[#16241B] hover:bg-[#F6F7F5] transition-colors cursor-pointer"
                title="Open navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Slide-Out Drawer (Clean & Uncluttered) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE3DD]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E0562B] text-white flex items-center justify-center font-black">
                    F
                  </div>
                  <span className="font-extrabold text-base text-[#16241B]">FOODFINDR Brunei</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Account / Sign In Status */}
              <div className="p-3 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD]">
                {isAuthenticated && currentUser.id !== 'usr_guest' ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={currentUser.firstName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E0562B]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-[#16241B] truncate">{currentUser.firstName} {currentUser.lastName}</p>
                      <p className="text-[11px] text-[#526056] truncate">{currentUser.email}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#FBE4DA] text-[#E0562B]">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#526056]">Sign in to track live orders and save favorite restaurants.</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          openAuthModal('SIGN_IN');
                        }}
                        className="py-2 px-3 rounded-xl bg-[#16241B] text-white text-xs font-bold text-center"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          openAuthModal('REGISTER');
                        }}
                        className="py-2 px-3 rounded-xl bg-[#E0562B] text-white text-xs font-bold text-center"
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Navigation List */}
              <div className="space-y-1 pt-1 text-sm font-bold text-[#16241B]">
                <button
                  onClick={() => handleTabClick('discover')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    currentTab === 'discover' ? 'bg-[#FBE4DA] text-[#E0562B]' : 'hover:bg-[#F6F7F5]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#E0562B]" />
                  <span>Order Online</span>
                </button>

                <button
                  onClick={() => handleTabClick('directory')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    currentTab === 'directory' ? 'bg-[#FBE4DA] text-[#E0562B]' : 'hover:bg-[#F6F7F5]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#E0562B]" />
                  <span>Yellow Pages Directory</span>
                </button>

                <button
                  onClick={() => handleTabClick('orders')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                    currentTab === 'orders' ? 'bg-[#FBE4DA] text-[#E0562B]' : 'hover:bg-[#F6F7F5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#2F7A4F]" />
                    <span>My Orders</span>
                  </div>
                  {activeOrder && (
                    <span className="w-2 h-2 rounded-full bg-[#2F7A4F] animate-pulse"></span>
                  )}
                </button>

                {/* Mobile Delivery Rates Grid link */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowRatesModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F6F7F5] transition-colors text-left"
                >
                  <Compass className="w-4 h-4 text-[#247545]" />
                  <span>Delivery Rates Grid (4 Districts)</span>
                </button>

                {/* Role Workspace Link */}
                {workspace && (
                  <button
                    onClick={() => handleTabClick(workspace.tab)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border mt-2 ${
                      currentTab === workspace.tab 
                        ? 'bg-[#16241B] text-white border-[#16241B]' 
                        : 'bg-[#F6F7F5] text-[#16241B] border-[#DCE3DD]'
                    }`}
                  >
                    <workspace.icon className="w-4 h-4 text-[#E0562B]" />
                    <span>{workspace.label}</span>
                  </button>
                )}
              </div>

              {/* Partner Onboarding Quick Cards in Mobile Menu */}
              <div className="pt-3 border-t border-[#DCE3DD] space-y-2">
                <p className="text-[11px] font-bold text-[#526056] uppercase tracking-wider px-1">Partner Programs</p>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('REGISTER', 'RESTAURANT_OWNER');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#EBF5EF] hover:bg-[#D8EDE0] text-left transition-colors cursor-pointer border border-[#2F7A4F]/20"
                >
                  <Store className="w-4 h-4 text-[#2F7A4F] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#16241B]">Register Restaurant / Kitchen</p>
                    <p className="text-[10px] text-[#526056]">Dine-in QR, Yellow Pages & POS</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('REGISTER', 'RUNNER');
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[#DFEDF4] hover:bg-[#C9E0EB] text-left transition-colors cursor-pointer border border-[#2C6E8E]/20"
                >
                  <Bike className="w-4 h-4 text-[#2C6E8E] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#16241B]">Register Delivery Runner</p>
                    <p className="text-[10px] text-[#526056]">Public dispatch or dedicated fleet</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[#DCE3DD] flex items-center justify-between text-xs text-[#526056]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E0562B]" />
                <span>Brunei Darussalam</span>
              </span>
              {isAuthenticated && currentUser.id !== 'usr_guest' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowDeleteAccountModal(true);
                    }}
                    className="text-[#526056] hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Delete Account
                  </button>
                  <span className="text-[#DCE3DD]">•</span>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion & Privacy Protection Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={() => {
          if (onNavigateHome) onNavigateHome();
        }}
      />

      {/* Brunei 4-District Rates Grid Modal */}
      {showRatesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-[#D9E2D9]">
            <button
              onClick={() => setShowRatesModal(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition-colors"
              title="Close rates modal"
            >
              <X className="w-5 h-5" />
            </button>
            <BruneiDistrictMatrixGrid />
          </div>
        </div>
      )}
    </>
  );
};

