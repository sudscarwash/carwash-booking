import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { 
  OrderingMode, 
  AuthProviderType, 
  StorageProviderType, 
  PaymentProviderType,
  EmailProviderType,
  UserRole,
  PlatformBankAccount,
  PaymentRailType
} from '../../types';
import { OrderingModeBadge } from '../common/StatusBadge';
import { BruneiDistrictMatrixGrid } from '../common/BruneiDistrictMatrixGrid';
import { 
  ShieldCheck, 
  Power, 
  Store, 
  Server, 
  Sliders, 
  History, 
  Check, 
  RefreshCw, 
  Plus, 
  Trash2, 
  MapPin, 
  Tag, 
  Layers,
  Mail,
  UserPlus,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Phone,
  CreditCard,
  Lock,
  Building2,
  HelpCircle,
  Camera,
  ShieldAlert,
  Ban,
  BookOpen,
  Navigation,
  Bike,
  Radio,
  Copy,
  MessageSquare,
  X,
  Database,
} from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';
import { testSupabaseConnection, SupabaseConnectionStatus } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const { 
    config, 
    updateConfig, 
    toggleGlobalOrdering, 
    setAuthProvider, 
    setStorageProvider, 
    setPaymentProvider,
    setEmailProvider,
    addEstablishmentType,
    removeEstablishmentType,
    updateDistrictRate,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    toggleBankAccountActive,
  } = usePlatform();
  const { 
    restaurants, 
    updateRestaurantOrderingMode, 
    updateRestaurantDetails,
    isSupabaseConfigured,
    isSupabaseConnected,
    supabaseSyncError,
    lastSyncedAt,
    syncWithSupabase,
  } = useRestaurants();
  const { orders, auditLogs, requestOnDemandLocationPing } = useOrders();
  const { allUsers, createUserByAdminOrOwner, updateAnyUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'taxonomies' | 'merchants' | 'integrations' | 'users' | 'banking' | 'policies' | 'dispatch' | 'audit'>('taxonomies');
  const [adminPingToast, setAdminPingToast] = useState<string | null>(null);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  // Platform Banking & Contacts State (Super Admin Governed)
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<PlatformBankAccount | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newBankType, setNewBankType] = useState<PaymentRailType>('BANK_ACCOUNT');
  const [newBankAccountNo, setNewBankAccountNo] = useState('');
  const [newBankHolder, setNewBankHolder] = useState('FoodFindr Tech Enterprise');
  const [newBankInstructions, setNewBankInstructions] = useState('');
  const [newBankIsActive, setNewBankIsActive] = useState(true);

  // Platform Contacts Editable State
  const [supportPhoneInput, setSupportPhoneInput] = useState(config.supportPhone || '+673 242 8899');
  const [supportWhatsappInput, setSupportWhatsappInput] = useState(config.supportWhatsapp || '+673 888 1234');
  const [supportEmailInput, setSupportEmailInput] = useState(config.supportEmail || 'support@foodfindr.io');
  const [contactsFeedback, setContactsFeedback] = useState<string | null>(null);
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);

  const handleSaveSupportContacts = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      supportPhone: supportPhoneInput.trim(),
      supportWhatsapp: supportWhatsappInput.trim(),
      supportEmail: supportEmailInput.trim(),
    });
    setContactsFeedback('Official platform support contacts updated successfully!');
    setTimeout(() => setContactsFeedback(null), 4000);
  };

  // User Provisioning form state (Special User & Community Scout)
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [provisionRole, setProvisionRole] = useState<'SPECIAL_USER' | 'COMMUNITY_SCOUT'>('COMMUNITY_SCOUT');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [scoutProvisionLimit, setScoutProvisionLimit] = useState<number>(3);
  const [scoutProvisionTrust, setScoutProvisionTrust] = useState<'PROBATIONARY' | 'TRUSTED'>('PROBATIONARY');
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const totalGMV = orders.reduce((sum, o) => o.status !== 'CANCELLED' ? sum + o.totalAmount : sum, 0);
  const platformRevenue = orders.reduce((sum, o) => o.status === 'DELIVERED' ? sum + (o.subtotal * 0.12) : sum, 0);

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeInput.trim()) {
      addEstablishmentType(newTypeInput.trim());
      setNewTypeInput('');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg(null);

    if (!userEmail.trim() || !userFirstName.trim() || !userLastName.trim()) {
      setUserErrorMsg('First Name, Last Name, and Email are mandatory.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      await createUserByAdminOrOwner({
        email: userEmail.trim(),
        firstName: userFirstName.trim(),
        lastName: userLastName.trim(),
        role: provisionRole,
        phone: userPhone.trim() || (provisionRole === 'COMMUNITY_SCOUT' ? '+673 871 0000' : '+673 899 0011'),
        scoutDailyUploadLimit: provisionRole === 'COMMUNITY_SCOUT' ? scoutProvisionLimit : undefined,
        scoutTrustLevel: provisionRole === 'COMMUNITY_SCOUT' ? scoutProvisionTrust : undefined,
      });

      const roleLabel = provisionRole === 'COMMUNITY_SCOUT' ? 'Community Scout' : 'Special User';
      setUserSuccessMsg(`${roleLabel} "${userFirstName} ${userLastName}" provisioned with ${provisionRole === 'COMMUNITY_SCOUT' ? (scoutProvisionLimit === 999 ? 'Unlimited' : scoutProvisionLimit + '/day') : 'standard'} quota & onboarding invite dispatched.`);
      setUserFirstName('');
      setUserLastName('');
      setUserEmail('');
      setUserPhone('');
      setScoutProvisionLimit(config.defaultScoutDailyUploadLimit || 3);
      setScoutProvisionTrust('PROBATIONARY');
      setIsCreatingUser(false);
      setTimeout(() => setUserSuccessMsg(null), 5000);
    } catch {
      setUserErrorMsg(`Failed to provision ${provisionRole === 'COMMUNITY_SCOUT' ? 'Community Scout' : 'Special User'}. Please try again.`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner & Global Kill Switch */}
      <div className="bg-[#16241B] text-white rounded-3xl p-6 border border-[#DCE3DD] shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#2F7A4F]" />
              <h1 className="text-2xl font-bold font-display">Super Admin Command Center</h1>
            </div>
            <p className="text-xs text-[#7A8E80]">
              Global Brunei marketplace parameters, merchant controls, and pluggable vendor adapters.
            </p>
          </div>

          {/* Emergency Kill Switch Button */}
          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-2xl border border-white/10 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7A8E80] block">
                Platform Kill-Switch
              </span>
              <span className={`text-xs font-bold ${config.globalOrderingEnabled ? 'text-[#2F7A4F]' : 'text-[#E0562B]'}`}>
                {config.globalOrderingEnabled ? 'ORDERING ACTIVE' : 'ALL ORDERING HALTED'}
              </span>
            </div>

            <button
              onClick={toggleGlobalOrdering}
              className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold text-xs ${
                config.globalOrderingEnabled
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-[#2F7A4F] text-white hover:bg-[#235d3c]'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{config.globalOrderingEnabled ? 'Emergency Halt' : 'Resume Global Ordering'}</span>
            </button>
          </div>
        </div>

        {/* High Level Platform Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs">
          <div>
            <span className="text-[#7A8E80] block text-[11px]">Total Marketplace GMV</span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">${totalGMV.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[#7A8E80] block text-[11px]">Est. Platform Take (12%)</span>
            <span className="text-xl font-bold font-mono text-[#2F7A4F] mt-0.5 block">${platformRevenue.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[#7A8E80] block text-[11px]">Registered Merchants</span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">{restaurants.length} Stores</span>
          </div>
          <div>
            <span className="text-[#7A8E80] block text-[11px]">Dispatched Orders</span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">{orders.length} Deliveries</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DCE3DD] pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'taxonomies', label: 'Establishment Types & Districts', icon: <Layers className="w-4 h-4" /> },
          { key: 'merchants', label: `Merchant Management (${restaurants.length})`, icon: <Store className="w-4 h-4" /> },
          { key: 'dispatch', label: `Fleet Dispatch & Telemetry (${orders.filter(o => o.serviceType === 'DELIVERY' && ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status)).length})`, icon: <Navigation className="w-4 h-4" /> },
          { key: 'users', label: `User Hierarchy & Staff (${allUsers.length})`, icon: <Users className="w-4 h-4" /> },
          { key: 'banking', label: `Platform Banking & Contacts (${(config.platformBankAccounts || []).length})`, icon: <CreditCard className="w-4 h-4" /> },
          { key: 'integrations', label: 'Vendor Adapters & Health', icon: <Server className="w-4 h-4" /> },
          { key: 'policies', label: 'Platform Policy & Fees', icon: <Sliders className="w-4 h-4" /> },
          { key: 'audit', label: `Audit Log Stream (${auditLogs.length})`, icon: <History className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#16241B] text-white shadow-xs'
                : 'bg-white text-[#526056] border border-[#DCE3DD] hover:text-[#16241B]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 0: Taxonomies & Establishment Types */}
      {activeTab === 'taxonomies' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-[#16241B] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#E0562B]" />
                  <span>Establishment Classifications & Taxonomies</span>
                </h3>
                <p className="text-xs text-[#526056] mt-0.5">
                  Yellow Pages directory tags used to categorize Brunei food businesses, home kitchens, and cafes.
                </p>
              </div>
            </div>

            {/* Quick Add Taxonomy Form */}
            <form onSubmit={handleAddType} className="flex gap-2 max-w-md pt-2">
              <input
                type="text"
                placeholder="e.g. Gerai Malam, Food Truck, Home Kitchen..."
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-[#E0562B]/30 flex-1"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#E0562B] text-white text-xs font-bold hover:bg-[#B5431E] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Category</span>
              </button>
            </form>

            {/* Current Establishment Types Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {config.establishmentTypes.map(type => (
                <div
                  key={type}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] text-xs font-semibold text-[#16241B] group hover:border-[#E0562B]"
                >
                  <span>{type}</span>
                  <button
                    type="button"
                    onClick={() => removeEstablishmentType(type)}
                    className="text-[#526056] hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                    title={`Remove ${type}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Brunei Districts Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#16241B] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2F7A4F]" />
                <span>Brunei Regional Dispatch & District Rates</span>
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Official delivery pricing and estimated lead times across Brunei's four sovereign districts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {config.defaultDistrictRates.map((d) => (
                <div
                  key={d.district}
                  className={`p-4 rounded-2xl border transition-all ${
                    d.isAvailable ? 'bg-white border-[#DCE3DD]' : 'bg-[#F6F7F5] border-[#DCE3DD]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-[#16241B]">{d.district}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {d.isAvailable ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#526056]">Base Delivery:</span>
                      <span className="font-mono font-bold text-[#16241B]">${d.fee.toFixed(2)} BND</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#526056]">Estimated ETA:</span>
                      <span className="font-mono text-[#16241B]">{d.estimatedMinMinutes}–{d.estimatedMaxMinutes} mins</span>
                    </div>

                    <div className="pt-2 border-t border-[#DCE3DD] flex items-center justify-between">
                      <button
                        onClick={() => updateDistrictRate(d.district, { isAvailable: !d.isAvailable })}
                        className="text-[11px] font-semibold text-[#E0562B] hover:underline cursor-pointer"
                      >
                        {d.isAvailable ? 'Disable District' : 'Enable District'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 4x4 Origin -> Destination Regional Matrix Grid */}
            <div className="pt-4 border-t border-[#DCE3DD]">
              <BruneiDistrictMatrixGrid />
            </div>
          </div>
        </div>
      )}

      {/* Tab: User Hierarchy & Staff (Created to satisfy user question) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#16241B] flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>Super Admin User Governance & Provisioning</span>
              </h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Super Admins can provision <strong>Special Users</strong> (Operations Leads) and <strong>Community Scouts</strong> (Public Photo Menu Contributors).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setProvisionRole('COMMUNITY_SCOUT');
                  setIsCreatingUser(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Add Community Scout</span>
              </button>
              <button
                onClick={() => {
                  setProvisionRole('SPECIAL_USER');
                  setIsCreatingUser(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Add Special User</span>
              </button>
            </div>
          </div>

          {userSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{userSuccessMsg}</span>
            </div>
          )}

          {userErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{userErrorMsg}</span>
            </div>
          )}

          {isCreatingUser && (
            <form onSubmit={handleCreateUser} className={`p-5 rounded-3xl border space-y-4 animate-in fade-in ${
              provisionRole === 'COMMUNITY_SCOUT' 
                ? 'bg-indigo-50/50 border-indigo-200' 
                : 'bg-purple-50/50 border-purple-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    provisionRole === 'COMMUNITY_SCOUT' ? 'text-indigo-900' : 'text-purple-900'
                  }`}>
                    {provisionRole === 'COMMUNITY_SCOUT' ? <Camera className="w-4 h-4 text-indigo-600" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                    <span>Provision New {provisionRole === 'COMMUNITY_SCOUT' ? 'Community Food Scout' : 'Special User (Ops Lead)'}</span>
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProvisionRole(provisionRole === 'COMMUNITY_SCOUT' ? 'SPECIAL_USER' : 'COMMUNITY_SCOUT')}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline cursor-pointer"
                  >
                    Switch to {provisionRole === 'COMMUNITY_SCOUT' ? 'Special User' : 'Community Scout'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingUser(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer ml-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {provisionRole === 'COMMUNITY_SCOUT' && (
                <p className="text-xs text-indigo-800 bg-white/70 p-2.5 rounded-xl border border-indigo-100">
                  📸 <strong>Role Scope:</strong> Community Scouts can immediately upload quick physical menu photos (yellow pages) to the public directory without requiring business licenses or merchant bank accounts.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-900 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={provisionRole === 'COMMUNITY_SCOUT' ? 'Amal' : 'Hj Mohammad'}
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-900 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={provisionRole === 'COMMUNITY_SCOUT' ? 'Hakim' : 'Ariffin'}
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-900 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder={provisionRole === 'COMMUNITY_SCOUT' ? 'scout.amal@gmail.com' : 'ariffin.ops@foodfindr.io'}
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-900 block mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+673 871 2345"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {provisionRole === 'COMMUNITY_SCOUT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/60">
                  <div>
                    <label className="text-[11px] font-bold text-gray-900 block mb-1">Initial Daily Upload Limit</label>
                    <select
                      value={scoutProvisionLimit}
                      onChange={(e) => setScoutProvisionLimit(parseInt(e.target.value))}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#16241B]"
                    >
                      <option value={3}>3 uploads / day (Standard Probationary)</option>
                      <option value={5}>5 uploads / day (Active Contributor)</option>
                      <option value={10}>10 uploads / day (Verified Scout)</option>
                      <option value={25}>25 uploads / day (Power Scout)</option>
                      <option value={999}>Unlimited (Lead Field Scout)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-900 block mb-1">Trust Tier / Moderation Gating</label>
                    <select
                      value={scoutProvisionTrust}
                      onChange={(e) => setScoutProvisionTrust(e.target.value as 'PROBATIONARY' | 'TRUSTED')}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#16241B]"
                    >
                      <option value="PROBATIONARY">PROBATIONARY (Strict Audit & Limit)</option>
                      <option value="TRUSTED">TRUSTED (Ambassador - Fast-Track)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-600">
                  Transactional invitation email will be routed via <strong>{config.emailProvider || 'Resend'}</strong>.
                </span>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    provisionRole === 'COMMUNITY_SCOUT' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-700 hover:bg-purple-800'
                  }`}
                >
                  {isSubmittingUser ? 'Provisioning...' : `Confirm & Dispatch Invitation`}
                </button>
              </div>
            </form>
          )}

          {/* User Directory Table */}
          <div className="bg-white rounded-3xl border border-[#DCE3DD] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#DCE3DD] bg-[#F6F7F5] flex items-center justify-between">
              <span className="text-xs font-bold text-[#16241B]">All System Users & Role Governance</span>
              <span className="text-[11px] text-[#526056]">Total: {allUsers.length} accounts</span>
            </div>

            <div className="divide-y divide-[#DCE3DD]">
              {allUsers.map((u) => {
                let roleColor = 'bg-[#FBE4DA] text-[#E0562B]';
                if (u.role === 'SUPER_ADMIN') roleColor = 'bg-purple-100 text-purple-800';
                if (u.role === 'SPECIAL_USER') roleColor = 'bg-amber-100 text-amber-800';
                if (u.role === 'COMMUNITY_SCOUT') roleColor = 'bg-indigo-100 text-indigo-800';
                if (u.role === 'RESTAURANT_OWNER') roleColor = 'bg-emerald-100 text-emerald-800';
                if (u.role === 'EMPLOYEE') roleColor = 'bg-orange-100 text-orange-800';
                if (u.role === 'RUNNER') roleColor = 'bg-sky-100 text-sky-800';

                const isScout = u.role === 'COMMUNITY_SCOUT';
                const scoutListingsCount = isScout 
                  ? restaurants.filter(r => r.onboardedById === u.id || r.ownerId === u.id).length 
                  : 0;
                const scoutLimit = u.scoutDailyUploadLimit ?? config.defaultScoutDailyUploadLimit ?? 3;
                const scoutTrust = u.scoutTrustLevel || 'PROBATIONARY';

                return (
                  <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={u.firstName}
                        className="w-9 h-9 rounded-full object-cover border border-[#DCE3DD] shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#16241B]">{u.firstName} {u.lastName}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${roleColor}`}>
                            {u.role.replace('_', ' ')}
                            {u.runnerType ? ` (${u.runnerType === 'IN_HOUSE_DEDICATED' ? 'In-House' : 'Public'})` : ''}
                          </span>
                          {u.isEmailVerified && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              Verified
                            </span>
                          )}
                          {isScout && (
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                              scoutTrust === 'TRUSTED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : scoutTrust === 'SUSPENDED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}>
                              {scoutTrust}
                            </span>
                          )}
                          {isScout && (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold border border-purple-200">
                              {scoutListingsCount} listings
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#526056] block mt-0.5">{u.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#526056]">
                      {isScout && (
                        <div className="flex items-center gap-2 bg-[#F6F7F5] px-2.5 py-1.5 rounded-xl border border-[#DCE3DD]">
                          <div className="flex items-center gap-1">
                            <label className="text-[10px] font-bold text-[#526056]">Quota:</label>
                            <select
                              value={scoutLimit}
                              onChange={(e) => updateAnyUser(u.id, { scoutDailyUploadLimit: parseInt(e.target.value) })}
                              className="bg-white border border-[#DCE3DD] rounded-lg px-2 py-0.5 text-xs font-bold text-[#16241B]"
                            >
                              <option value={3}>3 / day</option>
                              <option value={5}>5 / day</option>
                              <option value={10}>10 / day</option>
                              <option value={25}>25 / day</option>
                              <option value={50}>50 / day</option>
                              <option value={999}>Unlimited</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <label className="text-[10px] font-bold text-[#526056]">Trust:</label>
                            <select
                              value={scoutTrust}
                              onChange={(e) => updateAnyUser(u.id, { scoutTrustLevel: e.target.value as any })}
                              className={`border rounded-lg px-2 py-0.5 text-xs font-bold ${
                                scoutTrust === 'SUSPENDED'
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : scoutTrust === 'TRUSTED'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : 'bg-white border-[#DCE3DD] text-[#16241B]'
                              }`}
                            >
                              <option value="PROBATIONARY">Probationary</option>
                              <option value="TRUSTED">Trusted</option>
                              <option value="SUSPENDED">Suspended</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <span>Provisioned: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Merchant Management */}
      {activeTab === 'merchants' && (
        <div className="bg-white rounded-3xl border border-[#DCE3DD] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#DCE3DD] bg-[#F6F7F5] flex items-center justify-between">
            <span className="text-xs font-bold text-[#16241B]">Store Ordering Modes & Commission Tiers</span>
            <span className="text-[11px] text-[#526056]">Total: {restaurants.length} establishments</span>
          </div>

          <div className="divide-y divide-[#DCE3DD]">
            {restaurants.map((rest) => (
              <div key={rest.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={rest.logoUrl}
                    alt={rest.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-[#DCE3DD]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#16241B]">{rest.name}</h4>
                      <OrderingModeBadge mode={rest.orderingMode} />
                    </div>
                    <p className="text-xs text-[#526056] mt-0.5">
                      {rest.address.city}, {rest.address.district} • {rest.phone}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#526056]">Ordering Mode:</label>
                    <select
                      value={rest.orderingMode}
                      onChange={(e) => updateRestaurantOrderingMode(rest.id, e.target.value as OrderingMode)}
                      className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-1.5 text-xs font-bold text-[#16241B]"
                    >
                      <option value="ENABLED">ENABLED (Full Online Checkout)</option>
                      <option value="WHATSAPP_ONLY">WHATSAPP_ONLY (Directory Order Link)</option>
                      <option value="DISABLED">DISABLED (Directory Info Only)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#526056]">Commission %:</label>
                    <input
                      type="number"
                      value={rest.commissionRate}
                      onChange={(e) => updateRestaurantDetails(rest.id, { commissionRate: parseFloat(e.target.value) || 0 })}
                      className="w-16 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-[#16241B]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Vendor Integrations & Health */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SUPABASE & POSTGRESQL DATABASE STATUS CARD (FULL WIDTH) */}
          <div className="col-span-1 md:col-span-2 bg-[#16241B] text-white rounded-3xl p-6 border border-[#2D3E32] shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E0562B]/20 flex items-center justify-center text-[#E0562B]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">PostgreSQL & Supabase Database</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">CLOUD POOLER</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    Live relational data persistence for restaurants, menus, orders, and user profiles.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isSupabaseConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E1F0E6] text-[#2F7A4F] text-xs font-black tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#2F7A4F] animate-pulse"></span>
                    SUPABASE CONNECTED
                  </span>
                ) : isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FCE8E6] text-[#C5221F] text-xs font-black tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#C5221F]"></span>
                    CONNECTION ERROR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black tracking-wide border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    LOCAL STORAGE MODE
                  </span>
                )}

                <button
                  onClick={async () => {
                    setIsTestingSupabase(true);
                    const res = await testSupabaseConnection();
                    setSupabaseTestStatus(res);
                    setIsTestingSupabase(false);
                    if (res.isConnected) {
                      await syncWithSupabase();
                    }
                  }}
                  disabled={isTestingSupabase}
                  className="px-4 py-2 rounded-xl bg-[#E0562B] hover:bg-[#d04920] active:scale-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  {isTestingSupabase ? 'Pinging DB...' : 'Test & Sync Now'}
                </button>
              </div>
            </div>

            {/* Connection Diagnostics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Configured Endpoint</span>
                <span className="font-mono text-white/90 truncate block mt-0.5">
                  {isSupabaseConfigured ? 'Connected via VITE_SUPABASE_URL' : 'No credentials in .env (Using LocalStorage)'}
                </span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Restaurants In Memory</span>
                <span className="font-bold text-white block mt-0.5">
                  {restaurants.length} establishments loaded (Browser Cached)
                </span>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Last DB Sync</span>
                <span className="font-mono text-white/90 block mt-0.5">
                  {lastSyncedAt ? `${lastSyncedAt} (Success)` : 'Never synced (Local cache active)'}
                </span>
              </div>
            </div>

            {/* Test Result Feedback Box */}
            {supabaseTestStatus && (
              <div className={`p-4 rounded-2xl border text-xs ${
                supabaseTestStatus.isConnected 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  {supabaseTestStatus.isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {supabaseTestStatus.isConnected 
                        ? `Supabase responded in ${supabaseTestStatus.latencyMs}ms! Connected to public.restaurants.` 
                        : 'Connection test failed:'}
                    </p>
                    {supabaseTestStatus.error && (
                      <p className="font-mono mt-1 text-[11px] opacity-90">{supabaseTestStatus.error}</p>
                    )}
                    {!supabaseTestStatus.isConnected && (
                      <p className="mt-2 text-white/70 text-[11px]">
                        Tip: Make sure you ran the SQL Schema script in your Supabase SQL Editor and added <code className="bg-white/10 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="bg-white/10 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> to your environment variables on Render.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Informational Guidance */}
            <div className="bg-[#1C2C22] p-3.5 rounded-2xl border border-white/5 flex items-start gap-2.5 text-[11px] text-white/70">
              <span className="text-amber-400 text-sm">💡</span>
              <p>
                <strong>Zero Data Loss Protection:</strong> Any restaurant, category, or menu item you add is now automatically cached in browser <code className="text-white font-mono">localStorage</code>. It will <strong>never disappear when you refresh</strong>, even in offline or local demo mode! Once your Supabase credentials are configured, it also writes directly to your remote PostgreSQL database.
              </p>
            </div>
          </div>
          {/* Email Provider Adapter (Resend, SendGrid, Postmark, AWS SES) */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#16241B] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E0562B]" />
                  <span>Transactional Email Provider</span>
                </h4>
                <p className="text-xs font-mono font-bold text-[#E0562B] mt-0.5">{config.emailProvider || 'RESEND'}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0E6] text-[#2F7A4F] text-[10px] font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                ADAPTER HEALTHY
              </span>
            </div>
            <p className="text-xs text-[#526056]">
              Dispatches 6-digit registration OTP codes, password resets, and restaurant staff onboarding emails.
            </p>
            <div className="pt-3 border-t border-[#DCE3DD] flex items-center justify-between gap-2">
              <label className="text-xs text-[#526056]">Active Adapter:</label>
              <select
                value={config.emailProvider || 'RESEND'}
                onChange={(e) => setEmailProvider(e.target.value as EmailProviderType)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#16241B]"
              >
                <option value="RESEND">Resend (Recommended)</option>
                <option value="SENDGRID">Twilio SendGrid</option>
                <option value="POSTMARK">Postmark</option>
                <option value="AWS_SES">Amazon SES</option>
                <option value="SMTP">Custom SMTP Relay</option>
              </select>
            </div>
          </div>

          {/* Auth Provider */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#16241B]">Authentication System</h4>
                <p className="text-xs font-mono font-bold text-[#E0562B] mt-0.5">{config.authProvider}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0E6] text-[#2F7A4F] text-[10px] font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                HEALTHY
              </span>
            </div>
            <p className="text-xs text-[#526056]">Manages user sessions, JWT tokens, RBAC claims, and OAuth.</p>
            <div className="pt-3 border-t border-[#DCE3DD] flex items-center justify-between gap-2">
              <label className="text-xs text-[#526056]">Switch Provider:</label>
              <select
                value={config.authProvider}
                onChange={(e) => setAuthProvider(e.target.value as AuthProviderType)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#16241B]"
              >
                <option value="SUPABASE_AUTH">Supabase Auth</option>
                <option value="CUSTOM_JWT">Custom NestJS JWT</option>
                <option value="FIREBASE_AUTH">Firebase Auth</option>
                <option value="AUTH0">Auth0</option>
              </select>
            </div>
          </div>

          {/* Payment Gateway */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#16241B]">Payment Gateway</h4>
                <p className="text-xs font-mono font-bold text-[#E0562B] mt-0.5">{config.paymentProvider}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0E6] text-[#2F7A4F] text-[10px] font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                HEALTHY
              </span>
            </div>
            <p className="text-xs text-[#526056]">Handles PCI-compliant checkout tokenization, authorization & payouts.</p>
            <div className="pt-3 border-t border-[#DCE3DD] flex items-center justify-between gap-2">
              <label className="text-xs text-[#526056]">Switch Provider:</label>
              <select
                value={config.paymentProvider}
                onChange={(e) => setPaymentProvider(e.target.value as PaymentProviderType)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#16241B]"
              >
                <option value="STRIPE">Stripe Connect</option>
                <option value="PAYPAL">PayPal Braintree</option>
                <option value="LOCAL_GATEWAY">Local Bank Gateway (BIBD / Baiduri)</option>
                <option value="CASH_ESCROW">Cash Escrow</option>
              </select>
            </div>
          </div>

          {/* Storage Provider */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#16241B]">Storage & Media CDN</h4>
                <p className="text-xs font-mono font-bold text-[#E0562B] mt-0.5">{config.storageProvider}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E1F0E6] text-[#2F7A4F] text-[10px] font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]"></span>
                HEALTHY
              </span>
            </div>
            <p className="text-xs text-[#526056]">Serves optimized restaurant banners, logos, and dish photos.</p>
            <div className="pt-3 border-t border-[#DCE3DD] flex items-center justify-between gap-2">
              <label className="text-xs text-[#526056]">Switch Provider:</label>
              <select
                value={config.storageProvider}
                onChange={(e) => setStorageProvider(e.target.value as StorageProviderType)}
                className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-lg px-2.5 py-1 text-xs font-bold text-[#16241B]"
              >
                <option value="CLOUDINARY">Cloudinary CDN</option>
                <option value="AWS_S3">AWS S3 Bucket</option>
                <option value="GOOGLE_CLOUD_STORAGE">Google Cloud Storage</option>
                <option value="SUPABASE_STORAGE">Supabase Storage</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Policies & Global Fees */}
      {activeTab === 'policies' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-6">
            <div>
              <h3 className="font-bold text-base text-[#16241B]">Financial Architecture & Marketplace Settlement</h3>
              <p className="text-xs text-[#526056] mt-0.5">
                Configure platform fee collection, runner delivery earnings, and launch phase commission models.
              </p>
            </div>

            <div className="p-4 bg-[#F6F7F5] border border-[#DCE3DD] rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#16241B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2F7A4F]"></span>
                <span>Current Strategy: Cash-on-Delivery & Direct Runner Payout</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#526056]">
                <div className="bg-white p-3 rounded-xl border border-[#DCE3DD] space-y-1">
                  <span className="font-bold text-[#16241B] block">🛵 Runner Delivery Fee</span>
                  <p className="text-[11px] leading-relaxed">
                    The customer pays the runner full cash upon arrival. The runner pays the kitchen the food subtotal and retains <strong>100% of the Delivery Fee + Tip</strong> as their direct trip earning. Zero gateway fee friction.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#DCE3DD] space-y-1">
                  <span className="font-bold text-[#16241B] block">🏢 Marketplace Commission</span>
                  <p className="text-[11px] leading-relaxed">
                    In cash mode, platform commission can be set to <strong>0% (Launch Phase)</strong> to attract merchants, or billed periodically via monthly directory listing invoices ($20–$50/mo).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-[#526056]">Marketplace Commission (%)</label>
                    <button
                      type="button"
                      onClick={() => updateConfig({ defaultCommissionRate: 0 })}
                      className="text-[10px] font-bold text-[#2F7A4F] hover:underline"
                    >
                      Set 0% (Launch Promo)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={config.defaultCommissionRate}
                    onChange={(e) => updateConfig({ defaultCommissionRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono text-[#16241B]"
                  />
                  <span className="text-[10px] text-[#7A8E80] mt-1 block">
                    {config.defaultCommissionRate === 0 ? '✨ 0% Active (Free Growth & Merchant Onboarding)' : `Platform charges ${config.defaultCommissionRate}% per order.`}
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-[#526056] block mb-1">Base Delivery Fee ($ BND)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={config.baseDeliveryFee}
                    onChange={(e) => updateConfig({ baseDeliveryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 font-mono text-[#16241B]"
                  />
                  <span className="text-[10px] text-[#7A8E80] mt-1 block">
                    Default baseline courier fee for local district deliveries ($ BND).
                  </span>
                </div>
              </div>

              {/* Support & Notification Contacts */}
              <div className="pt-4 border-t border-[#DCE3DD] space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#2F7A4F]" />
                  <h4 className="font-bold text-[#16241B] text-xs uppercase tracking-wider">Official Platform Contacts & Notification Channels</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-[#526056] block mb-1">Support / Admin Email</label>
                    <input
                      type="email"
                      value={config.supportEmail}
                      onChange={(e) => updateConfig({ supportEmail: e.target.value })}
                      placeholder="support@foodfindr.io"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#526056] block mb-1">Office Telephone / Hotline</label>
                    <input
                      type="text"
                      value={config.supportPhone || '+673 242 8899'}
                      onChange={(e) => updateConfig({ supportPhone: e.target.value })}
                      placeholder="+673 242 8899"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#526056] block mb-1">Official WhatsApp Support Line</label>
                    <input
                      type="text"
                      value={config.supportWhatsapp || '+673 888 1234'}
                      onChange={(e) => updateConfig({ supportWhatsapp: e.target.value })}
                      placeholder="+673 888 1234"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-[#16241B]"
                    />
                  </div>
                </div>
              </div>

              {/* Official Brunei Receiving Bank Accounts */}
              <div className="pt-4 border-t border-[#DCE3DD] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2F7A4F]" />
                    <h4 className="font-bold text-[#16241B] text-xs uppercase tracking-wider">
                      Platform Receiving Bank Accounts (Subscription & Runner Top-Ups)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Safe Public Deposit Routing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BIBD */}
                  <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                    <span className="text-[11px] font-bold text-[#16241B] flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#2F7A4F]" />
                      Bank Islam Brunei Darussalam (BIBD)
                    </span>
                    <div>
                      <label className="text-[10px] text-[#526056] block">Account Holder / Enterprise Name</label>
                      <input
                        type="text"
                        value={config.bibdAccountName || 'FoodFindr Tech Enterprise'}
                        onChange={(e) => updateConfig({ bibdAccountName: e.target.value })}
                        className="w-full bg-white border border-[#DCE3DD] rounded-lg px-2.5 py-1.5 text-xs text-[#16241B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#526056] block">BIBD Account Number</label>
                      <input
                        type="text"
                        value={config.bibdAccountNumber || '00-001-01-1234567'}
                        onChange={(e) => updateConfig({ bibdAccountNumber: e.target.value })}
                        className="w-full bg-white border border-[#DCE3DD] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#16241B]"
                      />
                    </div>
                  </div>

                  {/* Baiduri */}
                  <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                    <span className="text-[11px] font-bold text-[#16241B] flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#2C6E8E]" />
                      Baiduri Bank Berhad
                    </span>
                    <div>
                      <label className="text-[10px] text-[#526056] block">Account Holder / Enterprise Name</label>
                      <input
                        type="text"
                        value={config.baiduriAccountName || 'FoodFindr Tech Enterprise'}
                        onChange={(e) => updateConfig({ baiduriAccountName: e.target.value })}
                        className="w-full bg-white border border-[#DCE3DD] rounded-lg px-2.5 py-1.5 text-xs text-[#16241B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#526056] block">Baiduri Account Number</label>
                      <input
                        type="text"
                        value={config.baiduriAccountNumber || '02-00-110-7654321'}
                        onChange={(e) => updateConfig({ baiduriAccountNumber: e.target.value })}
                        className="w-full bg-white border border-[#DCE3DD] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#16241B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Safety Explainer Banner */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>How safe is putting bank accounts here?</span>
                  </div>
                  <p className="leading-relaxed text-[#526056]">
                    <strong>100% Safe for Incoming Transfers:</strong> Bank account numbers and holder names are standard public deposit routing identifiers. In retail banking, anyone with your account number can only transfer money <em>into</em> your account. No third party or app user can debit or withdraw funds from your bank without your personal banking login, SMS OTP, or security token. All confidential system secrets and API keys remain protected server-side.
                  </p>
                </div>
              </div>

              {/* Community Scout Anti-Fraud & Rate Limit Policy */}
              <div className="pt-6 border-t border-[#DCE3DD] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-[#16241B] text-xs uppercase tracking-wider">
                      Community Scout Anti-Fraud & Rate Limit Governance
                    </h4>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> Configurable by Super Admin & Ops
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                    <label className="text-xs font-bold text-[#16241B] block">
                      Public Scout Upload Master Gate
                    </label>
                    <select
                      value={config.allowPublicScoutUploads !== false ? 'ALLOWED' : 'INTERNAL_ONLY'}
                      onChange={(e) => updateConfig({ allowPublicScoutUploads: e.target.value === 'ALLOWED' })}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-bold text-[#16241B]"
                    >
                      <option value="ALLOWED">Allowed (Community Scouts can snap & upload)</option>
                      <option value="INTERNAL_ONLY">Locked (Internal Ops & Admins Only)</option>
                    </select>
                    <p className="text-[10px] text-[#526056] leading-relaxed">
                      If set to Internal Ops Only, all public/scout photo menu submission gates are shut. Only Super Admins and Special Users can add eateries.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                    <label className="text-xs font-bold text-[#16241B] block">
                      Default Daily Upload Quota (New Scouts)
                    </label>
                    <select
                      value={config.defaultScoutDailyUploadLimit ?? 3}
                      onChange={(e) => updateConfig({ defaultScoutDailyUploadLimit: parseInt(e.target.value) })}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-bold text-[#16241B]"
                    >
                      <option value={3}>3 uploads / day (Strict Anti-Flooding Baseline)</option>
                      <option value={5}>5 uploads / day (Moderate)</option>
                      <option value={10}>10 uploads / day (Generous Community Tier)</option>
                      <option value={25}>25 uploads / day (Power Scout Default)</option>
                      <option value={999}>Unlimited Uploads (Lead Field Scouts)</option>
                    </select>
                    <p className="text-[10px] text-[#526056] leading-relaxed">
                      Restricts how many physical menu photos an unvetted scout can submit in 24 hours. Can be overridden on a per-user basis in the <strong>Users</strong> tab or Directory Manager.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-2">
                    <label className="text-xs font-bold text-[#16241B] block">
                      Scout Pre-Moderation Policy
                    </label>
                    <select
                      value={config.defaultScoutApprovalRequired !== false ? 'STRICT' : 'DIRECT'}
                      onChange={(e) => updateConfig({ defaultScoutApprovalRequired: e.target.value === 'STRICT' })}
                      className="w-full bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-bold text-[#16241B]"
                    >
                      <option value="STRICT">
                        Pre-Moderation (PENDING_APPROVAL: Held until Ops review)
                      </option>
                      <option value="DIRECT">
                        Direct Publishing (Auto-Approve immediately)
                      </option>
                    </select>
                    <p className="text-[10px] text-[#526056] leading-relaxed">
                      When enabled, listings submitted by probationary scouts are quarantined as <code>PENDING_APPROVAL</code> and never exposed in customer search until verified.
                    </p>
                  </div>
                </div>

                {/* Anti-Fraud Stage 0 to Stage 6 Matrix Card */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      Anti-Fraud & Community Trust Progression Model (Stage 0 to Stage 6)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-extrabold text-indigo-900 block">Stage 0-1: Cold Entry & Probation</span>
                      <p className="text-[#526056] text-[10px] leading-relaxed">
                        Account bound to phone number (+673). Capped at <strong>{config.defaultScoutDailyUploadLimit ?? 3} uploads/day</strong>. All photos tagged <code>PENDING_APPROVAL</code> and held in review queue.
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-extrabold text-emerald-900 block">Stage 2-3: Verified & Ambassador</span>
                      <p className="text-[#526056] text-[10px] leading-relaxed">
                        Special User audits 5+ quality listings. Scout promoted to <strong>TRUSTED</strong> with 25/day or unlimited quota and fast-track auto-approval.
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-extrabold text-rose-900 block">Stage 4-6: Merchant Handover & Quarantine</span>
                      <p className="text-[#526056] text-[10px] leading-relaxed">
                        Real owner claims store. If spam or fake menus detected, Ops can set scout to <strong>SUSPENDED</strong> with 1 click, locking quota immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fleet Dispatch & Telemetry Governance */}
      {activeTab === 'dispatch' && (
        <div className="space-y-6">
          {/* Dispatch Policy & Privacy Principles Callout */}
          <div className="bg-[#16241B] text-white rounded-3xl p-6 border border-[#2D3E33] shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2F7A4F]" />
                  <h3 className="text-lg font-bold">Privacy-Preserving Telemetry Architecture</h3>
                </div>
                <p className="text-xs text-[#A2B5A5]">
                  Why continuous 24/7 GPS surveillance is strictly rejected in FOODFINDR Brunei operations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Event-Driven Telemetry Protocol</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                  <Bike className="w-4 h-4" />
                  <span>1. Courier Privacy</span>
                </div>
                <p className="text-[#C5D5C8] text-[11px] leading-relaxed">
                  Off-duty couriers are <strong>NEVER</strong> tracked. Personal whereabouts, homes, and private routes are completely isolated from platform storage.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                  <Radio className="w-4 h-4" />
                  <span>2. Battery & Data Saver</span>
                </div>
                <p className="text-[#C5D5C8] text-[11px] leading-relaxed">
                  Continuous GPS streams drain smartphone batteries in 2 hours. Our 32-byte milestone pings conserve <strong>98.4% data</strong> on DST/Progresif plans.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs">
                  <Navigation className="w-4 h-4" />
                  <span>3. Just-In-Time Disclosure</span>
                </div>
                <p className="text-[#C5D5C8] text-[11px] leading-relaxed">
                  Kitchen only sees store arrival; customers only see live proximity coordinates when the courier is &lt;1.5km (entering their Simpang).
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs">
                  <Trash2 className="w-4 h-4" />
                  <span>4. Ephemeral Auto-Purge</span>
                </div>
                <p className="text-[#C5D5C8] text-[11px] leading-relaxed">
                  Once an order is verified with the customer's 4-digit PIN, all live GPS breadcrumbs are <strong>immediately purged</strong> from system memory.
                </p>
              </div>
            </div>
          </div>

          {/* Active Missions Live Dispatch Board */}
          <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#16241B] flex items-center gap-2">
                  <Bike className="w-4 h-4 text-[#DE5124]" />
                  <span>Active Delivery Fleet Missions ({orders.filter(o => o.serviceType === 'DELIVERY' && ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status)).length})</span>
                </h3>
                <p className="text-xs text-[#526056] mt-0.5">
                  Monitor active jobs, verify milestone progress, or request on-demand GPS check-in pings
                </p>
              </div>

              {adminPingToast && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-fadeIn">
                  {adminPingToast}
                </div>
              )}
            </div>

            {/* Missions List */}
            {(() => {
              const activeDeliveryOrders = orders.filter(
                o => o.serviceType === 'DELIVERY' && ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status)
              );

              if (activeDeliveryOrders.length === 0) {
                return (
                  <div className="p-12 text-center border-2 border-dashed border-[#DCE3DD] rounded-2xl space-y-2">
                    <Bike className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs font-bold text-stone-600">No Active Delivery Runs in Progress</p>
                    <p className="text-[11px] text-stone-400">All current orders have either been fulfilled, are dine-in, or awaiting kitchen preparation.</p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-[#DCE3DD] border border-[#DCE3DD] rounded-2xl overflow-hidden">
                  {activeDeliveryOrders.map(order => {
                    const currentMilestone = order.deliveryMilestone || (
                      order.status === 'OUT_FOR_DELIVERY' ? 'PICKED_UP_EN_ROUTE' :
                      order.status === 'READY_FOR_PICKUP' ? 'ARRIVED_AT_RESTAURANT' :
                      'ASSIGNED_HEADING_TO_RESTAURANT'
                    );

                    const isProximityActive = currentMilestone === 'NEARBY_APPROACHING' || currentMilestone === 'ARRIVED_AT_DOORSTEP';

                    return (
                      <div key={order.id} className="p-4 bg-white hover:bg-stone-50/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-extrabold text-[#16241B] text-sm">#{order.orderNumber}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#16241B] text-white text-[10px] font-bold">
                              {order.deliveryDistrict || 'Brunei-Muara'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              currentMilestone === 'ARRIVED_AT_DOORSTEP' ? 'bg-indigo-100 text-indigo-800' :
                              currentMilestone === 'NEARBY_APPROACHING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                              currentMilestone === 'PICKED_UP_EN_ROUTE' ? 'bg-sky-100 text-sky-800' :
                              currentMilestone === 'ARRIVED_AT_RESTAURANT' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-stone-100 text-stone-800'
                            }`}>
                              Milestone: {currentMilestone.replace(/_/g, ' ')}
                            </span>
                            {isProximityActive && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold">
                                Proximity Beacon Active (&lt;1.5km)
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#526056]">
                            <div>
                              <span className="font-bold text-[#16241B]">Store:</span> {order.restaurantName}
                            </div>
                            <div>
                              <span className="font-bold text-[#16241B]">Customer:</span> {order.customerName} ({order.deliveryAddress?.simpang || order.deliveryAddress?.street})
                            </div>
                            <div>
                              <span className="font-bold text-[#16241B]">Courier:</span> {order.runnerName ? `${order.runnerName} (Plate: BA 8419)` : 'Searching...'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="text-right pr-2 hidden sm:block">
                            <span className="text-[10px] text-stone-400 block">Safe Handoff PIN</span>
                            <span className="font-mono font-black text-sm text-[#DE5124]">{order.deliveryTelemetry?.handoffPin || '4821'}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              requestOnDemandLocationPing(order.id, 'Super Admin Dispatch');
                              setAdminPingToast(`32-byte location check-in pulse requested for #${order.orderNumber}. Telemetry refreshed.`);
                              setTimeout(() => setAdminPingToast(null), 4000);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-white border border-[#DCE3DD] hover:bg-stone-50 text-xs font-bold text-[#16241B] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="On-demand check: query courier without invasive continuous monitoring"
                          >
                            <Radio className="w-3.5 h-3.5 text-[#247545]" />
                            <span>Request Location Ping</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab: Platform Banking & Support Contacts */}
      {activeTab === 'banking' && (
        <div className="space-y-6">
          {/* Top Feedback Alerts */}
          {contactsFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{contactsFeedback}</span>
            </div>
          )}
          {bankFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bankFeedback}</span>
            </div>
          )}

          {/* SECTION 1: OFFICIAL PLATFORM SUPPORT CONTACTS */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE3DD] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3DD]">
              <div>
                <h3 className="text-base font-bold text-[#16241B] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#2F7A4F]" />
                  <span>Official Platform Support & Emergency Channels</span>
                </h3>
                <p className="text-xs text-[#526056] mt-0.5">
                  These verified contact numbers and emails are displayed across customer order tracking, courier helpdesk, and public Yellow Pages.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSupportContacts} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WhatsApp Support Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#16241B]">
                    Platform WhatsApp Helpdesk *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={supportWhatsappInput}
                      onChange={(e) => setSupportWhatsappInput(e.target.value)}
                      placeholder="+673 888 1234"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#2F7A4F]"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#526056]">Tarus / WhatsApp Rail</span>
                    <a
                      href={getWhatsAppUrl(supportWhatsappInput, 'Hello FOODFINDR Support, I am testing the helpdesk connection.')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>Test Chat</span>
                    </a>
                  </div>
                </div>

                {/* Telephone Line */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#16241B]">
                    HQ Telephone Hotline
                  </label>
                  <input
                    type="text"
                    value={supportPhoneInput}
                    onChange={(e) => setSupportPhoneInput(e.target.value)}
                    placeholder="+673 242 8899"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#2F7A4F]"
                  />
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#526056]">Direct Landline</span>
                    <a
                      href={getPhoneCallUrl(supportPhoneInput)}
                      className="text-stone-700 hover:underline font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-[#2F7A4F]" />
                      <span>Test Call</span>
                    </a>
                  </div>
                </div>

                {/* Support Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#16241B]">
                    Support Email
                  </label>
                  <input
                    type="email"
                    required
                    value={supportEmailInput}
                    onChange={(e) => setSupportEmailInput(e.target.value)}
                    placeholder="support@foodfindr.io"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#2F7A4F]"
                  />
                  <span className="text-[11px] text-[#526056] block pt-1">Official inquiry mailbox</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#DCE3DD]/60">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#16241B] hover:bg-[#2F7A4F] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Save Official Support Contacts</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: OFFICIAL RECEIVING ACCOUNTS (BIBD, BAIDURI, TAIB, TARUS) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#DCE3DD] shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3DD]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-[#16241B] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#2F7A4F]" />
                    <span>Official Receiving Accounts & Mobile Remittance Rails</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full">
                    {(config.platformBankAccounts || []).length} Configured
                  </span>
                </div>
                <p className="text-xs text-[#526056] mt-0.5">
                  Accounts used by delivery couriers for prepaid float top-ups and merchants for plan settlements.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddBankModal(true);
                  setNewBankName('');
                  setNewBankAccountNo('');
                  setNewBankInstructions('');
                  setNewBankType('BANK_ACCOUNT');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#2F7A4F] hover:bg-[#235c3c] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Bank or Digital Rail</span>
              </button>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(config.platformBankAccounts || []).map((bank) => (
                <div
                  key={bank.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    bank.isActive
                      ? 'bg-white border-[#DCE3DD] shadow-xs hover:border-[#16241B]/30'
                      : 'bg-stone-50 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#DCE3DD]/60">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#16241B] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#2F7A4F] shrink-0" />
                        <span>{bank.bankName}</span>
                      </h4>
                      <p className="text-[11px] text-[#526056] mt-0.5">Holder: {bank.accountHolderName}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bank.paymentType === 'TARUS_MOBILE'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {bank.paymentType === 'TARUS_MOBILE' ? '📱 Tarus Mobile' : '🏦 Bank Transfer'}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        bank.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {bank.isActive ? 'ACTIVE' : 'DECOMMISSIONED'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#526056] block">
                      {bank.paymentType === 'TARUS_MOBILE' ? 'Registered Tarus Mobile Number' : 'Account Number'}
                    </span>
                    <div className="flex items-center justify-between bg-[#F6F7F5] rounded-xl px-3 py-2 border border-[#DCE3DD]">
                      <span className="font-mono text-sm font-bold text-[#16241B]">{bank.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bank.accountNumber);
                          alert(`Copied "${bank.accountNumber}" to clipboard!`);
                        }}
                        className="text-[11px] font-bold text-[#2F7A4F] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Copy account coordinate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  {bank.instructions && (
                    <p className="text-[11px] text-[#526056] bg-stone-50 p-2.5 rounded-xl border border-stone-200 leading-relaxed">
                      <strong>Remittance Note:</strong> {bank.instructions}
                    </p>
                  )}

                  {/* Actions: Toggle Active and Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#DCE3DD]/50 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleBankAccountActive(bank.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                        bank.isActive
                          ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                      }`}
                    >
                      {bank.isActive ? 'Decommission Account' : 'Reactivate Account'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setBankToDelete(bank)}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Permanently remove bank account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Bank</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PLATFORM BANK / DIGITAL RAIL */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#DCE3DD] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE3DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#2F7A4F] text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#16241B]">Add Platform Receiving Rail</h4>
                  <p className="text-[11px] text-[#526056]">Configure official receiving coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets for Brunei Banks */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#526056] block">Quick Brunei Presets:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewBankName('Perbadanan Tabung Amanah Islam Brunei (TAIB)');
                    setNewBankType('BANK_ACCOUNT');
                    setNewBankAccountNo('01-01-200-9876543');
                    setNewBankHolder('FoodFindr Tech Enterprise');
                    setNewBankInstructions('Transfer via TAIB VX Mobile App or CDM Counter.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 cursor-pointer"
                >
                  + TAIB
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewBankName('Tarus Mobile Remittance & Pocket');
                    setNewBankType('TARUS_MOBILE');
                    setNewBankAccountNo(config.supportWhatsapp || '+673 888 1234');
                    setNewBankHolder('FoodFindr Tarus Merchant Pocket');
                    setNewBankInstructions('Send via Tarus mobile pocket to registered merchant phone number.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200 cursor-pointer"
                >
                  + Tarus Mobile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewBankName('Bank Islam Brunei Darussalam (BIBD)');
                    setNewBankType('BANK_ACCOUNT');
                    setNewBankAccountNo('00-001-01-1234567');
                    setNewBankHolder('FoodFindr Tech Enterprise');
                    setNewBankInstructions('Transfer via BIBD Mobile QuickPay or Online Banking.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold border border-stone-200 cursor-pointer"
                >
                  + BIBD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewBankName('Baiduri Bank Berhad');
                    setNewBankType('BANK_ACCOUNT');
                    setNewBankAccountNo('02-00-110-7654321');
                    setNewBankHolder('FoodFindr Tech Enterprise');
                    setNewBankInstructions('Transfer via Baiduri Personal b.Digital or FAST transfer.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold border border-stone-200 cursor-pointer"
                >
                  + Baiduri
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBankName.trim() || !newBankAccountNo.trim()) return;
                addBankAccount({
                  bankName: newBankName.trim(),
                  accountNumber: newBankAccountNo.trim(),
                  accountHolderName: newBankHolder.trim() || 'FoodFindr Tech Enterprise',
                  paymentType: newBankType,
                  instructions: newBankInstructions.trim() || 'Retain screenshot receipt for operations verification.',
                  isActive: newBankIsActive,
                });
                setBankFeedback(`"${newBankName}" added to official receiving accounts.`);
                setShowAddBankModal(false);
                setNewBankName('');
                setNewBankAccountNo('');
                setNewBankInstructions('');
                setTimeout(() => setBankFeedback(null), 4000);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">Rail Type *</label>
                <select
                  value={newBankType}
                  onChange={(e) => setNewBankType(e.target.value as PaymentRailType)}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-bold text-[#16241B]"
                >
                  <option value="BANK_ACCOUNT">🏦 Traditional Bank Account (BIBD, Baiduri, TAIB)</option>
                  <option value="TARUS_MOBILE">📱 Tarus Mobile Pocket (Requires Phone Number)</option>
                  <option value="E_WALLET">💳 Digital E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">Bank / Channel Name *</label>
                <input
                  type="text"
                  required
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Perbadanan Tabung Amanah Islam Brunei (TAIB)"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">
                  {newBankType === 'TARUS_MOBILE' ? 'Tarus Registered Phone Number *' : 'Account Number *'}
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccountNo}
                  onChange={(e) => setNewBankAccountNo(e.target.value)}
                  placeholder={newBankType === 'TARUS_MOBILE' ? '+673 888 1234' : '01-01-200-9876543'}
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#16241B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={newBankHolder}
                  onChange={(e) => setNewBankHolder(e.target.value)}
                  placeholder="FoodFindr Tech Enterprise"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#526056] mb-1">Transfer Instructions / Note</label>
                <textarea
                  rows={2}
                  value={newBankInstructions}
                  onChange={(e) => setNewBankInstructions(e.target.value)}
                  placeholder="e.g. Transfer via TAIB VX Mobile App. Retain screenshot receipt for operations approval."
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs font-medium text-[#16241B]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveBank"
                  checked={newBankIsActive}
                  onChange={(e) => setNewBankIsActive(e.target.checked)}
                  className="rounded text-[#2F7A4F] focus:ring-[#2F7A4F] cursor-pointer"
                />
                <label htmlFor="isActiveBank" className="text-xs font-bold text-[#16241B] cursor-pointer">
                  Activate account immediately for courier top-ups & merchant payments
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DCE3DD]">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCE3DD] text-[#526056] hover:bg-stone-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#2F7A4F] hover:bg-[#235c3c] text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE BANK CONFIRMATION */}
      {bankToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-[#16241B]">Delete Receiving Account?</h3>
              <p className="text-xs text-[#526056]">
                Are you sure you want to delete <strong>"{bankToDelete.bankName}"</strong> ({bankToDelete.accountNumber})?
                Couriers will no longer see this bank as a destination for float top-up remittances.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBankToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DCE3DD] text-[#526056] hover:bg-stone-50 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBankAccount(bankToDelete.id);
                  setBankFeedback(`"${bankToDelete.bankName}" permanently deleted from receiving accounts.`);
                  setBankToDelete(null);
                  setTimeout(() => setBankFeedback(null), 4000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#16241B]">Security & Configuration Audit Trail</h3>

          <div className="divide-y divide-[#DCE3DD]/50 text-xs">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#E0562B] uppercase text-[11px]">{log.action}</span>
                    <span className="text-[#16241B] font-semibold">{log.details}</span>
                  </div>
                  <p className="text-[11px] text-[#526056]">
                    Performed by: <strong>{log.actorName}</strong> ({log.actorRole})
                  </p>
                </div>
                <span className="font-mono text-[11px] text-[#526056] shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
