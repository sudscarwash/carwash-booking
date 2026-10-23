import React, { useState } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { OrderingMode, Restaurant, FulfillmentType, DistrictDeliveryRate, SubscriptionTier } from '../../types';
import { BRUNEI_DISTRICTS } from '../../utils/districtRates';
import { compressImageFile } from '../../utils/imageCompressor';
import { DirectoryManagerTab } from './DirectoryManagerTab';
import { BruneiDistrictMatrixGrid } from '../common/BruneiDistrictMatrixGrid';
import { CommercialSupplierManager } from './CommercialSupplierManager';
import { 
  Building2, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Image, 
  Plus, 
  MapPin, 
  Phone, 
  Mail,
  Store,
  DollarSign,
  Clock,
  Upload,
  CheckCircle2,
  XCircle,
  Clock3,
  Sliders,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Users,
  Compass,
  AlertCircle,
  Truck,
  FileCheck,
  UserCheck,
  Banknote,
  Search,
  BookOpen,
  CreditCard,
  Lock,
  Info,
  ShieldAlert,
  Camera,
  Copy,
  MessageSquare,
} from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/phoneUtils';

export const SpecialUserDashboard: React.FC = () => {
  const { restaurants, updateRestaurantDetails, addRestaurant, addCategory, addMenuItem, deleteRestaurant } = useRestaurants();
  const { currentUser, allUsers, verifyUser, createUserByAdminOrOwner } = useAuth();
  const { 
    config, 
    updateConfig,
    updateDistrictRate, 
    addDistrict, 
    topUpRequests, 
    reviewTopUpRequest, 
    recordCounterCashTopUp,
    cashRemittances,
    acknowledgeCashRemittance 
  } = usePlatform();

  // Top-level tab state: 'OPERATIONS_HUB' vs 'DIRECTORY' vs 'ONBOARDING' vs 'B2B_SUPPLIERS'
  const [activeTab, setActiveTab] = useState<'OPERATIONS_HUB' | 'DIRECTORY' | 'ONBOARDING' | 'B2B_SUPPLIERS'>('OPERATIONS_HUB');

  // Restaurant subscription tier assignments during KYC review
  const [restaurantTiers, setRestaurantTiers] = useState<Record<string, SubscriptionTier>>({});

  // Operations Hub sub-tab: 'VERIFICATION' | 'TOP_UPS' | 'RATES' | 'CASH_SETTLEMENT' | 'CONTACTS_BANKING'
  const [opsSubTab, setOpsSubTab] = useState<'VERIFICATION' | 'TOP_UPS' | 'RATES' | 'CASH_SETTLEMENT' | 'CONTACTS_BANKING'>('VERIFICATION');

  // Platform Bank & Contacts State (Editable by Ops Specialists)
  const [bankBibdName, setBankBibdName] = useState<string>(config.bibdAccountName || 'FoodFindr Tech Enterprise');
  const [bankBibdNumber, setBankBibdNumber] = useState<string>(config.bibdAccountNumber || '00-001-01-1234567');
  const [bankBaiduriName, setBankBaiduriName] = useState<string>(config.baiduriAccountName || 'FoodFindr Tech Enterprise');
  const [bankBaiduriNumber, setBankBaiduriNumber] = useState<string>(config.baiduriAccountNumber || '02-00-110-7654321');
  const [platformSupportEmail, setPlatformSupportEmail] = useState<string>(config.supportEmail || 'support@foodfindr.io');
  const [platformSupportPhone, setPlatformSupportPhone] = useState<string>(config.supportPhone || '+673 242 8899');
  const [platformWhatsapp, setPlatformWhatsapp] = useState<string>(config.supportWhatsapp || '+673 888 1234');
  const [bankFeedbackMsg, setBankFeedbackMsg] = useState<string | null>(null);

  // Highway Route Caps State (Anti-Price Gouging Guardrails)
  const [highwayCapMuaraTutong, setHighwayCapMuaraTutong] = useState<number>(12);
  const [highwayCapMuaraBelait, setHighwayCapMuaraBelait] = useState<number>(22);
  const [highwayCapMuaraTemburong, setHighwayCapMuaraTemburong] = useState<number>(16);
  const [highwayCapTutongBelait, setHighwayCapTutongBelait] = useState<number>(14);
  const [highwayRouteSavedMsg, setHighwayRouteSavedMsg] = useState<string | null>(null);

  // Verification filtering
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'RESTAURANTS' | 'RUNNERS' | 'SCOUT_SUBMISSIONS'>('ALL');
  const [verificationFeedbackMsg, setVerificationFeedbackMsg] = useState<string | null>(null);

  // Counter Cash Top-Up state
  const [counterRunnerId, setCounterRunnerId] = useState<string>('');
  const [counterAmount, setCounterAmount] = useState<number>(20);
  const [counterNotes, setCounterNotes] = useState<string>('');
  const [counterSuccessMsg, setCounterSuccessMsg] = useState<string | null>(null);

  // Rates editing state
  const [editingDistrict, setEditingDistrict] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<number>(0);
  const [editMinTime, setEditMinTime] = useState<number>(0);
  const [editMaxTime, setEditMaxTime] = useState<number>(0);
  const [rateSuccessMessage, setRateSuccessMessage] = useState<string | null>(null);

  // Top-Up Review state
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Incorrect bank reference code');
  const [topUpFeedbackMsg, setTopUpFeedbackMsg] = useState<string | null>(null);

  // Courier Cash Holding Ceiling Limit State (Configurable by Special User)
  const [runnerCashCeiling, setRunnerCashCeiling] = useState<number>(150);
  const [isEditingCeiling, setIsEditingCeiling] = useState<boolean>(false);
  const [ceilingInput, setCeilingInput] = useState<number>(150);
  const [ceilingFeedback, setCeilingFeedback] = useState<string | null>(null);

  // Onboarding Wizard state
  const [step, setStep] = useState(1);
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null);

  // Step 1: Merchant Profile
  const [name, setName] = useState('Chop Jing Chew & Bakery');
  const [tagline, setTagline] = useState('Fresh Roti Kuning & Traditional Charcoal Brews');
  const [description, setDescription] = useState('Iconic Brunei heritage bakery famous for fragrant Roti Kahwin, peanut butter toast, and authentic local tea blends.');
  const [cuisineInput, setCuisineInput] = useState('Bakery, Breakfast, Kopitiam, Halal Kitchen');
  const [priceLevel, setPriceLevel] = useState<'$$' | '$$$' | '$$$$'>('$$');
  const [orderingMode, setOrderingMode] = useState<OrderingMode>('ENABLED');

  // Step 2: Location & Contact
  const [street, setStreet] = useState('No. 10, Simpang 5, Jalan Gadong');
  const [city, setCity] = useState('Gadong');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Brunei-Muara');
  const [zipCode, setZipCode] = useState('BE3919');
  const [phone, setPhone] = useState('+673 242 4133');
  const [email, setEmail] = useState('operations@jingchew.bn');
  const [ownerFirstName, setOwnerFirstName] = useState('Haji Awang');
  const [ownerLastName, setOwnerLastName] = useState('Jing Chew');

  // Step 3: Fulfillment & Delivery Rules
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('IN_HOUSE_RUNNER');
  const [inHouseFreeDelivery, setInHouseFreeDelivery] = useState<boolean>(true);
  const [deliveryFee, setDeliveryFee] = useState('0.00');
  const [minimumOrder, setMinimumOrder] = useState('10.00');
  const [coverImageUrl, setCoverImageUrl] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80');
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);
  const [isCompressingDish, setIsCompressingDish] = useState(false);

  // Step 4: Initial Signature Dish
  const [categoryName, setCategoryName] = useState('Heritage Toast & Breads');
  const [dishName, setDishName] = useState('Signature Roti Kuning Kahwin');
  const [dishPrice, setDishPrice] = useState('2.80');
  const [dishDescription, setDishDescription] = useState('Warm pillowy steamed yellow bun stuffed with thick cold butter slab and house-made fragrant kaya pandan.');
  const [dishImage, setDishImage] = useState('https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80');

  // Handle fulfillment toggle change
  const handleFulfillmentToggle = (type: FulfillmentType) => {
    setFulfillmentType(type);
    if (type === 'IN_HOUSE_RUNNER') {
      if (inHouseFreeDelivery) {
        setDeliveryFee('0.00');
      }
    } else {
      setDeliveryFee('3.00');
    }
  };

  const handleInHouseFreeToggle = (isFree: boolean) => {
    setInHouseFreeDelivery(isFree);
    if (isFree) {
      setDeliveryFee('0.00');
    } else if (deliveryFee === '0.00') {
      setDeliveryFee('2.00');
    }
  };

  // Image Uploads
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingCover(true);
      const res = await compressImageFile(file, { maxWidth: 1000, maxHeight: 600, quality: 0.75 });
      setCoverImageUrl(res.base64);
    } catch (err) {
      alert('Failed to compress cover image');
    } finally {
      setIsCompressingCover(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingLogo(true);
      const res = await compressImageFile(file, { maxWidth: 300, maxHeight: 300, quality: 0.8 });
      setLogoUrl(res.base64);
    } catch (err) {
      alert('Failed to compress logo image');
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleDishUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingDish(true);
      const res = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.75 });
      setDishImage(res.base64);
    } catch (err) {
      alert('Failed to compress dish image');
    } finally {
      setIsCompressingDish(false);
    }
  };

  const handleCreateMerchant = async () => {
    const cuisines = cuisineInput.split(',').map(c => c.trim()).filter(Boolean);
    const parsedFee = parseFloat(deliveryFee) || 0.00;

    // 1. First provision the Restaurant Owner account (Hierarchy: Special User creates Restaurant Owner)
    let assignedOwnerId = currentUser.id;
    try {
      const ownerUser = await createUserByAdminOrOwner({
        email: email.trim(),
        firstName: ownerFirstName.trim() || 'Restaurant',
        lastName: ownerLastName.trim() || 'Owner',
        role: 'RESTAURANT_OWNER',
        phone: phone.trim() || '+673 242 4133',
      });
      if (ownerUser) {
        assignedOwnerId = ownerUser.id;
      }
    } catch (e) {
      console.warn('Owner account creation warning:', e);
    }

    const newRest = addRestaurant({
      ownerId: assignedOwnerId,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline,
      description,
      establishmentType: 'Restaurant',
      supportedServices: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
      fulfillmentType,
      logoUrl,
      coverImageUrl,
      cuisineTypes: cuisines,
      priceLevel,
      orderingMode,
      rating: 5.0,
      reviewCount: 1,
      estimatedDeliveryMin: 20,
      estimatedDeliveryMax: 35,
      deliveryFee: parsedFee,
      minimumOrder: parseFloat(minimumOrder) || 10,
      commissionRate: 12.0,
      districtDeliveryRates: [
        { district: selectedDistrict, fee: parsedFee, estimatedMinMinutes: 20, estimatedMaxMinutes: 35, isAvailable: true },
        { district: 'Brunei-Muara', fee: parsedFee + (selectedDistrict === 'Brunei-Muara' ? 0 : 3.00), estimatedMinMinutes: 30, estimatedMaxMinutes: 45, isAvailable: true },
        { district: 'Tutong', fee: parsedFee + 4.00, estimatedMinMinutes: 40, estimatedMaxMinutes: 55, isAvailable: true },
        { district: 'Belait', fee: parsedFee + 8.00, estimatedMinMinutes: 60, estimatedMaxMinutes: 75, isAvailable: true },
      ],
      address: {
        street,
        city,
        state: selectedDistrict,
        district: selectedDistrict,
        zipCode,
        latitude: 4.8857,
        longitude: 114.9317,
      },
      phone,
      email,
      operatingHours: [
        { day: 'Monday', openTime: '06:30', closeTime: '17:00', isOpen: true },
        { day: 'Tuesday', openTime: '06:30', closeTime: '17:00', isOpen: true },
        { day: 'Wednesday', openTime: '06:30', closeTime: '17:00', isOpen: true },
        { day: 'Thursday', openTime: '06:30', closeTime: '17:00', isOpen: true },
        { day: 'Friday', openTime: '06:30', closeTime: '12:00', isOpen: true },
        { day: 'Saturday', openTime: '06:30', closeTime: '17:00', isOpen: true },
        { day: 'Sunday', openTime: '06:30', closeTime: '17:00', isOpen: true },
      ],
      isActive: true,
      isVerified: true,
      onboardedById: currentUser.id,
    });

    // Create Category & Dish
    const cat = addCategory(newRest.id, categoryName);
    addMenuItem({
      restaurantId: newRest.id,
      categoryId: cat.id,
      name: dishName,
      description: dishDescription,
      basePrice: parseFloat(dishPrice) || 2.80,
      imageUrl: dishImage,
      isAvailable: true,
      isPopular: true,
      preparationTimeMinutes: 10,
      sortOrder: 1,
    });

    setCreatedRestaurant(newRest);
    setStep(5); // Success step
  };

  // Rates modification handler
  const handleStartEditRate = (rate: DistrictDeliveryRate) => {
    setEditingDistrict(rate.district);
    setEditFee(rate.fee);
    setEditMinTime(rate.estimatedMinMinutes);
    setEditMaxTime(rate.estimatedMaxMinutes);
  };

  const handleSaveRate = (district: string) => {
    updateDistrictRate(district, {
      fee: Number(editFee),
      estimatedMinMinutes: Number(editMinTime),
      estimatedMaxMinutes: Number(editMaxTime),
    });
    setEditingDistrict(null);
    setRateSuccessMessage(`Updated baseline rate for ${district} to $${Number(editFee).toFixed(2)} BND.`);
    setTimeout(() => setRateSuccessMessage(null), 3000);
  };

  const handleToggleDistrictAvailability = (district: string, currentStatus: boolean) => {
    updateDistrictRate(district, { isAvailable: !currentStatus });
    setRateSuccessMessage(`${district} delivery routes marked ${!currentStatus ? 'Active' : 'Temporarily Suspended'}.`);
    setTimeout(() => setRateSuccessMessage(null), 3000);
  };

  // Top-Up Review Handlers
  const handleApproveTopUp = (reqId: string, runnerName: string, amount: number) => {
    reviewTopUpRequest(reqId, 'APPROVED', `${currentUser.firstName} ${currentUser.lastName}`, currentUser.role);
    setTopUpFeedbackMsg(`Approved $${amount.toFixed(2)} top-up for ${runnerName}. Credit permanently settled.`);
    setTimeout(() => setTopUpFeedbackMsg(null), 4000);
  };

  const handleRejectTopUp = () => {
    if (!rejectModalId) return;
    reviewTopUpRequest(rejectModalId, 'REJECTED', `${currentUser.firstName} ${currentUser.lastName}`, currentUser.role, rejectReason);
    setTopUpFeedbackMsg(`Rejected top-up request (Ref: ${rejectReason}). Runner notified.`);
    setRejectModalId(null);
    setTimeout(() => setTopUpFeedbackMsg(null), 4000);
  };

  const pendingTopUps = topUpRequests.filter(r => r.status === 'PENDING');
  const reviewedTopUps = topUpRequests.filter(r => r.status !== 'PENDING');

  // Merchant, Courier & Scout Submissions Lists
  const pendingRestaurants = restaurants.filter(r => r.isVerified === false || (r.isVerified === undefined && r.id.includes('pending')));
  const verifiedRestaurants = restaurants.filter(r => r.isVerified === true);
  const pendingRunners = allUsers.filter(u => u.role === 'RUNNER' && (!u.isVerified || u.verificationStatus === 'PENDING'));
  const verifiedRunners = allUsers.filter(u => u.role === 'RUNNER' && u.isVerified === true);
  const allRunners = allUsers.filter(u => u.role === 'RUNNER');
  const pendingScoutSubmissions = restaurants.filter(r => r.listingStatus === 'PENDING_APPROVAL');

  const totalPendingVerifications = pendingRestaurants.length + pendingRunners.length + pendingScoutSubmissions.length;

  const handleVerifyRestaurant = (restId: string, restName: string) => {
    const tier: SubscriptionTier = restaurantTiers[restId] || 'BASIC_POS';
    const fee = tier === 'PRO_DELIVERY' ? 65 : tier === 'BASIC_POS' ? 35 : 0;
    const mode: OrderingMode = tier === 'FREE_DIRECTORY' ? 'DIRECTORY_ONLY' : 'ENABLED';

    updateRestaurantDetails(restId, { 
      isVerified: true, 
      isActive: true,
      kycStatus: 'VERIFIED',
      subscriptionTier: tier,
      subscriptionStatus: 'ACTIVE',
      monthlySubscriptionFee: fee,
      orderingMode: mode,
    });
    setVerificationFeedbackMsg(`"${restName}" verified under ${tier.replace('_', ' ')} plan ($${fee} BND/mo) with capability set to ${mode === 'DIRECTORY_ONLY' ? 'Yellow Page Only' : 'Full Ordering'}. Storefront is now active!`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleDeclineRestaurant = (restId: string, restName: string) => {
    updateRestaurantDetails(restId, { isVerified: false, isActive: false });
    setVerificationFeedbackMsg(`"${restName}" registration was declined. Storefront remains deactivated.`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleVerifyRunner = (runnerId: string, runnerName: string) => {
    verifyUser(runnerId, true, `Approved by Special User Operations Officer (${currentUser.firstName} ${currentUser.lastName})`);
    setVerificationFeedbackMsg(`Courier "${runnerName}" credentials and vehicle verified! Account is active for delivery dispatches.`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleDeclineRunner = (runnerId: string, runnerName: string) => {
    verifyUser(runnerId, false, `Declined by Special User Operations Officer (${currentUser.firstName} ${currentUser.lastName})`);
    setVerificationFeedbackMsg(`Courier "${runnerName}" application was declined.`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleVerifyScoutSubmission = (restId: string, restName: string) => {
    updateRestaurantDetails(restId, {
      isVerified: true,
      isActive: true,
      listingStatus: 'APPROVED',
      kycStatus: 'VERIFIED',
    });
    setVerificationFeedbackMsg(`Community Scout listing "${restName}" approved! Published live to the public Yellow Pages directory.`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleDeclineScoutSubmission = (restId: string, restName: string) => {
    updateRestaurantDetails(restId, {
      listingStatus: 'REJECTED',
      isActive: false,
    });
    setVerificationFeedbackMsg(`Community Scout listing "${restName}" was declined.`);
    setTimeout(() => setVerificationFeedbackMsg(null), 4000);
  };

  const handleRecordCounterCash = (e: React.FormEvent) => {
    e.preventDefault();
    const runner = allRunners.find(r => r.id === counterRunnerId);
    if (!runner) {
      alert('Please select a registered courier');
      return;
    }
    if (!counterAmount || counterAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    recordCounterCashTopUp({
      runnerId: runner.id,
      runnerName: `${runner.firstName} ${runner.lastName}`,
      runnerPhone: runner.phone || '+673 800 0000',
      amount: counterAmount,
      cashierName: `${currentUser.firstName} ${currentUser.lastName}`,
      cashierRole: currentUser.role,
      notes: counterNotes,
    });

    setCounterSuccessMsg(`Successfully credited $${counterAmount.toFixed(2)} BND cash top-up to ${runner.firstName} ${runner.lastName}! Official receipt logged.`);
    setCounterNotes('');
    setCounterAmount(20);
    setTimeout(() => setCounterSuccessMsg(null), 5000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Banner with Role Identification */}
      <div className="bg-[#132218] text-white rounded-3xl p-6 sm:p-7 border border-[#2D3E33] shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E0562B] text-white flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-display">Special User Operations Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#247545] text-white">
                  Special Role
                </span>
              </div>
              <p className="text-xs text-[#C5D5C8] mt-0.5">
                Officer: <strong className="text-white">{currentUser.firstName} {currentUser.lastName}</strong> • Elevated Operations Authority: District Pricing, Courier Wallet Approvals & Onboarding
              </p>
            </div>
          </div>

          {/* Primary View Toggle: Operations Hub vs Directory Manager vs Onboarding */}
          <div className="flex items-center bg-[#1C3224] p-1 rounded-2xl border border-[#2D3E33] shrink-0">
            <button
              onClick={() => setActiveTab('OPERATIONS_HUB')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'OPERATIONS_HUB'
                  ? 'bg-[#E0562B] text-white shadow-sm'
                  : 'text-[#9CB3A3] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Operations Hub</span>
              {pendingTopUps.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#E0562B] text-[10px] font-bold flex items-center justify-center">
                  {pendingTopUps.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('DIRECTORY')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DIRECTORY'
                  ? 'bg-[#E0562B] text-white shadow-sm'
                  : 'text-[#9CB3A3] hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Directory Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('ONBOARDING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ONBOARDING'
                  ? 'bg-[#E0562B] text-white shadow-sm'
                  : 'text-[#9CB3A3] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Onboarding Wizard</span>
              <span className="sm:hidden">Wizard</span>
            </button>
            <button
              onClick={() => setActiveTab('B2B_SUPPLIERS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'B2B_SUPPLIERS'
                  ? 'bg-[#E0562B] text-white shadow-sm'
                  : 'text-[#9CB3A3] hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">B2B Suppliers (6B)</span>
              <span className="sm:hidden">Suppliers</span>
            </button>
          </div>
        </div>

        {/* Informational Scope Badge */}
        <div className="mt-4 pt-3 border-t border-[#2D3E33] flex flex-wrap items-center justify-between text-[11px] text-[#A6BCAD] gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#247545]" />
            <span><strong>Privilege Matrix:</strong> Can modify 4-district delivery tables & authorize bank transfers without needing Super Admin credentials.</span>
          </div>
          <span className="text-stone-400">Brunei Operations Region • BND Currency</span>
        </div>
      </div>

      {/* VIEW A: OPERATIONS HUB */}
      {activeTab === 'OPERATIONS_HUB' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#D9E2D9] pb-3">
            <button
              onClick={() => setOpsSubTab('VERIFICATION')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                opsSubTab === 'VERIFICATION'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Merchant & Runner Verifications</span>
              {totalPendingVerifications > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#DE5124] text-white text-[10px] font-bold">
                  {totalPendingVerifications} pending
                </span>
              )}
            </button>

            <button
              onClick={() => setOpsSubTab('TOP_UPS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                opsSubTab === 'TOP_UPS'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Runner Wallet Top-Ups</span>
              {pendingTopUps.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#DE5124] text-white text-[10px] font-bold">
                  {pendingTopUps.length} pending
                </span>
              )}
            </button>

            <button
              onClick={() => setOpsSubTab('RATES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                opsSubTab === 'RATES'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Brunei District Delivery Rates</span>
            </button>

            <button
              onClick={() => setOpsSubTab('CASH_SETTLEMENT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                opsSubTab === 'CASH_SETTLEMENT'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>COD & Cash Remittance Audit</span>
            </button>

            <button
              onClick={() => setOpsSubTab('CONTACTS_BANKING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                opsSubTab === 'CONTACTS_BANKING'
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Platform Bank & Contacts</span>
            </button>
          </div>

          {/* Feedback messages */}
          {verificationFeedbackMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{verificationFeedbackMsg}</span>
            </div>
          )}

          {rateSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{rateSuccessMessage}</span>
            </div>
          )}

          {topUpFeedbackMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{topUpFeedbackMsg}</span>
            </div>
          )}

          {/* SUB-PANEL 0: ONBOARDING & VERIFICATION QUEUE */}
          {opsSubTab === 'VERIFICATION' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E2D9] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
                <div>
                  <h3 className="text-base font-bold text-[#132218] font-display flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#247545]" />
                    <span>Restaurant & Courier Verification Queue</span>
                  </h3>
                  <p className="text-xs text-[#4F6155] mt-0.5">
                    Verify legal legitimacy, halal certification, vehicle roadworthiness, and driving credentials before granting public platform access.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#DE5124] bg-[#FBE4DA] px-3 py-1 rounded-xl">
                    {totalPendingVerifications} Awaiting Special User Review
                  </span>
                </div>
              </div>

              {/* Verification Architecture Guidance Notice */}
              <div className="p-4 bg-[#F6F7F5] border border-[#DCE3DD] rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#247545]" />
                  <h4 className="text-xs font-bold text-[#16241B]">Operations Hub Multi-Role Verification & Vetting Standards</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-[#526056] pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-[#DCE3DD]/70">
                    <span className="font-extrabold text-[#16241B] block mb-0.5">1. Delivery Couriers (Runners)</span>
                    Mandatory Brunei IC (Yellow/Red) and Land Transport (JPD) driving license vetting. <em>Pending couriers cannot go Online or claim delivery orders.</em>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#DCE3DD]/70">
                    <span className="font-extrabold text-[#16241B] block mb-0.5">2. Food Merchants & Kitchens</span>
                    Requires Brunei ROCBN commercial business validation, Halal status audit, and SaaS subscription tier activation before public storefront opens.
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#DCE3DD]/70">
                    <span className="font-extrabold text-[#16241B] block mb-0.5">3. Community Food Scouts</span>
                    Onboarded with rate limit quotas (e.g. 3-10 uploads/day). Scouts snap stall photo menus. All uploads are held in <code>PENDING_APPROVAL</code> until reviewed.
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setVerificationFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    verificationFilter === 'ALL'
                      ? 'bg-[#132218] text-white'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:bg-[#E8ECE8]'
                  }`}
                >
                  All Applications ({totalPendingVerifications})
                </button>
                <button
                  onClick={() => setVerificationFilter('RESTAURANTS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    verificationFilter === 'RESTAURANTS'
                      ? 'bg-[#132218] text-white'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:bg-[#E8ECE8]'
                  }`}
                >
                  Restaurants & Kitchens ({pendingRestaurants.length})
                </button>
                <button
                  onClick={() => setVerificationFilter('RUNNERS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    verificationFilter === 'RUNNERS'
                      ? 'bg-[#132218] text-white'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:bg-[#E8ECE8]'
                  }`}
                >
                  Delivery Couriers ({pendingRunners.length})
                </button>
                <button
                  onClick={() => setVerificationFilter('SCOUT_SUBMISSIONS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    verificationFilter === 'SCOUT_SUBMISSIONS'
                      ? 'bg-[#132218] text-white'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:bg-[#E8ECE8]'
                  }`}
                >
                  Scout Photo Menus ({pendingScoutSubmissions.length})
                </button>
              </div>

              {/* SECTION: PENDING RESTAURANTS */}
              {(verificationFilter === 'ALL' || verificationFilter === 'RESTAURANTS') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#247545]" />
                      <span>Pending Restaurant Applications ({pendingRestaurants.length})</span>
                    </h4>
                  </div>

                  {pendingRestaurants.length === 0 ? (
                    <div className="p-5 text-center bg-[#F9FAF8] rounded-2xl border border-dashed border-[#D9E2D9] text-xs text-[#4F6155]">
                      No pending restaurant applications. All merchant storefronts are reviewed and verified.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRestaurants.map(rest => (
                        <div key={rest.id} className="p-5 bg-white border border-[#D9E2D9] rounded-2xl space-y-4 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <img
                                src={rest.logoUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'}
                                alt={rest.name}
                                className="w-12 h-12 rounded-xl object-cover border border-[#D9E2D9] shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-sm text-[#132218]">{rest.name}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Pending Review
                                  </span>
                                </div>
                                <p className="text-xs text-[#4F6155]">{rest.tagline || rest.description}</p>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#DE5124]" />
                                    {rest.address.street}, {rest.address.city} ({rest.address.district || 'Brunei-Muara'})
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-stone-400" />
                                    {rest.phone || rest.whatsappPhone || 'No phone'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-1">
                                <label className="text-[10px] font-bold text-[#526056]">Plan:</label>
                                <select
                                  value={restaurantTiers[rest.id] || rest.subscriptionTier || 'BASIC_POS'}
                                  onChange={(e) => setRestaurantTiers(prev => ({ ...prev, [rest.id]: e.target.value as SubscriptionTier }))}
                                  className="text-xs bg-transparent font-bold text-[#16241B] focus:outline-hidden cursor-pointer"
                                >
                                  <option value="FREE_DIRECTORY">Free Directory ($0/mo)</option>
                                  <option value="BASIC_POS">Basic POS ($35/mo)</option>
                                  <option value="PRO_DELIVERY">Pro Delivery ($65/mo)</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeclineRestaurant(rest.id, rest.name)}
                                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => handleVerifyRestaurant(rest.id, rest.name)}
                                  className="px-4 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify & Activate</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Verification Audit Checklist Badges */}
                          <div className="p-3 bg-[#F5F7F4] rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-2 text-[#4F6155]">
                              <span className="font-bold text-[#132218]">Compliance Checklist:</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                ✓ Halal: {rest.halalStatus.replace('_', ' ')}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                                ✓ Brunei ROCBN Verified
                              </span>
                              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold">
                                Cuisines: {rest.cuisineTypes.join(', ')}
                              </span>
                            </div>
                            <span className="text-stone-400 text-[10px]">
                              Submitted {new Date(rest.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: PENDING RUNNERS */}
              {(verificationFilter === 'ALL' || verificationFilter === 'RUNNERS') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#247545]" />
                      <span>Pending Courier Registrations ({pendingRunners.length})</span>
                    </h4>
                  </div>

                  {pendingRunners.length === 0 ? (
                    <div className="p-5 text-center bg-[#F9FAF8] rounded-2xl border border-dashed border-[#D9E2D9] text-xs text-[#4F6155]">
                      No pending delivery runner applications. All registered couriers are active.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRunners.map(runner => (
                        <div key={runner.id} className="p-5 bg-white border border-[#D9E2D9] rounded-2xl space-y-4 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#247545] font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                                {runner.firstName[0]}{runner.lastName[0]}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-sm text-[#132218]">{runner.firstName} {runner.lastName}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    {runner.verificationStatus || 'Pending Ops Review'}
                                  </span>
                                </div>
                                <p className="text-xs text-[#4F6155]">
                                  Email: {runner.email} • Phone: {runner.phone || 'N/A'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                                  <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-[#132218] font-bold">
                                    Vehicle: {runner.vehicleType || 'Motorcycle'} ({runner.plateNumber || 'Plate TBD'})
                                  </span>
                                  {runner.idCardNumber && (
                                    <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-[#132218] font-bold">
                                      IC: {runner.idCardNumber}
                                    </span>
                                  )}
                                  <span className="text-[#247545] font-semibold">
                                    Base: {runner.runnerBaseDistrict || 'Brunei-Muara'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                              <button
                                onClick={() => handleDeclineRunner(runner.id, `${runner.firstName} ${runner.lastName}`)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleVerifyRunner(runner.id, `${runner.firstName} ${runner.lastName}`)}
                                className="px-4 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify & Activate Courier</span>
                              </button>
                            </div>
                          </div>

                          {/* Verification Notes */}
                          {runner.verificationNotes && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Applicant Note / Docs: </span>
                                {runner.verificationNotes}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: PENDING COMMUNITY SCOUT SUBMISSIONS */}
              {(verificationFilter === 'ALL' || verificationFilter === 'SCOUT_SUBMISSIONS') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#247545]" />
                      <span>Pending Community Scout Photo Menus ({pendingScoutSubmissions.length})</span>
                    </h4>
                    <button
                      onClick={() => setActiveTab('DIRECTORY')}
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Scout Quotas & Trust</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {pendingScoutSubmissions.length === 0 ? (
                    <div className="p-5 text-center bg-[#F9FAF8] rounded-2xl border border-dashed border-[#D9E2D9] text-xs text-[#4F6155]">
                      No pending community scout submissions. All physical stall menus have been audited and published.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingScoutSubmissions.map(rest => (
                        <div key={rest.id} className="p-5 bg-white border border-[#D9E2D9] rounded-2xl space-y-4 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <img
                                src={rest.logoUrl || rest.coverImageUrl || 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=300&q=80'}
                                alt={rest.name}
                                className="w-14 h-14 rounded-xl object-cover border border-[#D9E2D9] shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-extrabold text-sm text-[#132218]">{rest.name}</h5>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                                    <Camera className="w-3 h-3" />
                                    <span>Scout Submission</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Pending Audit
                                  </span>
                                </div>
                                <p className="text-xs text-[#4F6155]">{rest.tagline || rest.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 pt-1">
                                  <span className="flex items-center gap-1 font-semibold text-[#16241B]">
                                    <MapPin className="w-3 h-3 text-[#DE5124]" />
                                    {rest.address.street}, {rest.address.district}
                                  </span>
                                  {rest.whatsappPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-stone-400" />
                                      {rest.whatsappPhone}
                                    </span>
                                  )}
                                  <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                                    Scout: {rest.contributorName || 'Field Contributor'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                              <button
                                onClick={() => handleDeclineScoutSubmission(rest.id, rest.name)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleVerifyScoutSubmission(rest.id, rest.name)}
                                className="px-4 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Publish to Yellow Pages</span>
                              </button>
                            </div>
                          </div>

                          {/* Menu Book Preview if available */}
                          {rest.menuBookPages && rest.menuBookPages.length > 0 && (
                            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#16241B] flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Submitted Menu Photo Book ({rest.menuBookPages.length} {rest.menuBookPages.length === 1 ? 'Page' : 'Pages'})</span>
                                </span>
                                <span className="text-[10px] text-stone-500">Physical stall menu scan</span>
                              </div>
                              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                                {rest.menuBookPages.map((pg, idx) => (
                                  <div key={pg.id || idx} className="shrink-0 flex items-center gap-2 bg-white p-1.5 rounded-lg border border-stone-200">
                                    <img
                                      src={pg.imageUrl}
                                      alt={pg.title || `Page ${idx + 1}`}
                                      className="w-16 h-16 rounded object-cover"
                                    />
                                    <div className="text-[10px] pr-2">
                                      <p className="font-bold text-[#16241B]">{pg.title || `Page ${idx + 1}`}</p>
                                      <p className="text-stone-500 text-[9px] line-clamp-1">{pg.description || 'Stall price listing'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SUB-PANEL 1: DISTRICT RATES MANAGER */}
          {opsSubTab === 'RATES' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E2D9] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
                <div>
                  <h3 className="text-base font-bold text-[#132218] font-display flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#DE5124]" />
                    <span>Brunei 4-District Pricing & Dispatch Grid</span>
                  </h3>
                  <p className="text-xs text-[#4F6155] mt-0.5">
                    As an Operations Specialist, you can calibrate default delivery fees and transit estimates without Super Admin elevation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#247545] bg-[#E0F2E6] px-3 py-1 rounded-xl">
                    Live Dispatch Matrix Active
                  </span>
                </div>
              </div>

              {/* The 4x4 Grid Matrix (Belait to Belait, Belait to Muara, Muara to Muara, etc.) */}
              <BruneiDistrictMatrixGrid />

              <div className="pt-2">
                <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider mb-3">
                  Base Intra-District Calibration Cards
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.defaultDistrictRates.map(rate => {
                  const isEditing = editingDistrict === rate.district;

                  return (
                    <div 
                      key={rate.district} 
                      className={`p-5 rounded-2xl border transition-all ${
                        rate.isAvailable 
                          ? 'bg-[#F9FAF8] border-[#D9E2D9]' 
                          : 'bg-stone-100/70 border-stone-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#247545]"></span>
                          <h4 className="font-extrabold text-sm text-[#132218]">{rate.district}</h4>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          rate.isAvailable ? 'bg-[#E0F2E6] text-[#247545]' : 'bg-stone-200 text-stone-600'
                        }`}>
                          {rate.isAvailable ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-[11px] font-bold text-[#4F6155] block mb-1">Base Delivery Fee ($ BND)</label>
                            <input
                              type="number"
                              step="0.50"
                              value={editFee}
                              onChange={(e) => setEditFee(parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#132218]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-bold text-[#4F6155] block mb-1">Min (mins)</label>
                              <input
                                type="number"
                                value={editMinTime}
                                onChange={(e) => setEditMinTime(parseInt(e.target.value) || 15)}
                                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-mono text-[#132218]"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-[#4F6155] block mb-1">Max (mins)</label>
                              <input
                                type="number"
                                value={editMaxTime}
                                onChange={(e) => setEditMaxTime(parseInt(e.target.value) || 45)}
                                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-mono text-[#132218]"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingDistrict(null)}
                              className="px-3 py-1.5 rounded-xl border border-[#D9E2D9] text-xs font-bold text-[#4F6155] hover:bg-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveRate(rate.district)}
                              className="px-4 py-1.5 rounded-xl bg-[#247545] text-white text-xs font-bold hover:bg-[#1E6038] shadow-xs flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Rate</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-[#4F6155]">Baseline Intra-District Fee:</span>
                            <span className="text-base font-extrabold font-mono text-[#247545]">${rate.fee.toFixed(2)} BND</span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-[#4F6155]">Transit Window:</span>
                            <span className="font-semibold text-[#132218]">{rate.estimatedMinMinutes} - {rate.estimatedMaxMinutes} mins</span>
                          </div>
                          <div className="pt-3 border-t border-[#E8ECE8] flex items-center justify-between">
                            <button
                              onClick={() => handleToggleDistrictAvailability(rate.district, rate.isAvailable)}
                              className={`text-[11px] font-bold cursor-pointer hover:underline ${
                                rate.isAvailable ? 'text-stone-500' : 'text-[#247545]'
                              }`}
                            >
                              {rate.isAvailable ? 'Disable District' : 'Enable District'}
                            </button>
                            <button
                              onClick={() => handleStartEditRate(rate)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#D9E2D9] text-xs font-bold text-[#132218] hover:bg-stone-50 cursor-pointer shadow-2xs"
                            >
                              Adjust Rate & Time
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Comprehensive Regional Dispatch & Payment Flow (1 Payment vs 2 Payments) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Flow Diagram Card: 1 Payment vs 2 Payments */}
                <div className="p-5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#247545]" />
                    <h4 className="font-extrabold text-xs text-[#132218] uppercase tracking-wider">
                      Payment Architecture: 1 Single Payment vs 2 Payments
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#4F6155] leading-relaxed">
                    <strong>The Customer Pays 1 Single Total:</strong> At checkout or cash doorstep delivery, the customer pays one combined amount (Food Bill + Courier Delivery Fee). The customer does <em>not</em> make 2 separate payments.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-[#D9E2D9] space-y-2 text-[11px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <span className="text-[#4F6155]">1. Customer Hands Total Cash:</span>
                      <span className="font-mono font-bold text-[#132218]">$31.00 BND ($25 Food + $6 Delivery)</span>
                    </div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <span className="text-[#4F6155]">2. Runner Hands Food Cost to Kitchen:</span>
                      <span className="font-mono font-bold text-[#247545]">$25.00 BND (100% to Merchant)</span>
                    </div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <span className="text-[#4F6155]">3. Runner Retains Delivery Fee:</span>
                      <span className="font-mono font-bold text-amber-700">+$6.00 BND (100% Courier Take-Home)</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[#4F6155]">4. Platform Revenue:</span>
                      <span className="font-mono font-bold text-stone-700">$0.50 dispatch fee auto-debited from Runner Wallet</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    💡 <strong>Platform Safe:</strong> The platform does not hold customer money, eliminating merchant escrow liabilities and escrow banking regulations in Brunei.
                  </div>
                </div>

                {/* Pricing Authority & Anti-Price Gouging Guardrail */}
                <div className="p-5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#DE5124]" />
                    <h4 className="font-extrabold text-xs text-[#132218] uppercase tracking-wider">
                      Who Sets The Price? Preventing "$100" Courier Abuse
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#4F6155] leading-relaxed">
                    <strong>The Platform Sets Transparent Base Rates & Hard Ceiling Caps:</strong> Couriers cannot arbitrarily name their price (e.g. demanding $100). The platform software calculates the exact route fare and enforces a strict <strong>Maximum Ceiling Cap</strong>.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-[#D9E2D9] space-y-2 text-[11px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <span className="font-bold text-[#132218]">Local Intra-District (e.g. Belait ➔ Belait):</span>
                      <span className="font-mono text-[#247545] font-bold">Fixed $5.00 BND (Cap $7.50)</span>
                    </div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <span className="font-bold text-[#132218]">Medium Transit (Muara ➔ Tutong 48km):</span>
                      <span className="font-mono text-[#247545] font-bold">Standard $8.00 BND (Cap $12.00)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#132218]">Long Highway (Muara ➔ Belait 108km):</span>
                      <span className="font-mono text-[#DE5124] font-bold">Base $16.00 BND (Hard Cap $22.00)</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    🛡️ <strong>Anti-Gouging Lock:</strong> If a runner demands $100, the system automatically rejects it and clamps the fee to the platform cap ($22). The customer always sees the guaranteed price before placing the order.
                  </div>
                </div>
              </div>

              {/* Highway / Inter-District Matrix Table with Live Cap Adjusters */}
              <div className="p-5 bg-white rounded-2xl border border-[#D9E2D9] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#132218] uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#247545]" />
                      <span>Brunei Inter-District Highway Matrix & Anti-Gouging Caps</span>
                    </h4>
                    <p className="text-[11px] text-[#4F6155] mt-0.5">
                      Configure base fares and maximum price ceilings for cross-district transit routes.
                    </p>
                  </div>
                  {highwayRouteSavedMsg && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl animate-fadeIn">
                      {highwayRouteSavedMsg}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-stone-100 border border-[#D9E2D9] rounded-xl overflow-hidden text-xs">
                  <div className="p-3 bg-[#F5F7F4] grid grid-cols-1 sm:grid-cols-4 font-bold text-[#4F6155] text-[11px]">
                    <span className="sm:col-span-2">Inter-District Route & Distance</span>
                    <span>Base Fare ($ BND)</span>
                    <span>Max Ceiling Cap ($ BND)</span>
                  </div>

                  {/* Route 1: Muara to Tutong */}
                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                    <div className="sm:col-span-2">
                      <strong className="text-[#132218] block">Brunei-Muara ⇄ Tutong</strong>
                      <span className="text-[11px] text-stone-500">Approx. 48 km • Muara-Tutong Highway (35-45 mins)</span>
                    </div>
                    <div className="font-mono font-bold text-[#247545]">$8.00 BND</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={highwayCapMuaraTutong}
                        onChange={(e) => setHighwayCapMuaraTutong(parseFloat(e.target.value) || 12)}
                        className="w-20 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#132218]"
                      />
                      <span className="text-[10px] text-stone-400">max</span>
                    </div>
                  </div>

                  {/* Route 2: Muara to Belait */}
                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                    <div className="sm:col-span-2">
                      <strong className="text-[#132218] block">Brunei-Muara ⇄ Belait (Kuala Belait / Seria)</strong>
                      <span className="text-[11px] text-stone-500">Approx. 108 km • Coastal Highway (75-95 mins)</span>
                    </div>
                    <div className="font-mono font-bold text-[#DE5124]">$16.00 BND</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={highwayCapMuaraBelait}
                        onChange={(e) => setHighwayCapMuaraBelait(parseFloat(e.target.value) || 22)}
                        className="w-20 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#DE5124]"
                      />
                      <span className="text-[10px] text-stone-400">max (prevents $100 abuse)</span>
                    </div>
                  </div>

                  {/* Route 3: Muara to Temburong */}
                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                    <div className="sm:col-span-2">
                      <strong className="text-[#132218] block">Brunei-Muara ⇄ Temburong (Bangar)</strong>
                      <span className="text-[11px] text-stone-500">Approx. 38 km • Sultan Haji Omar Ali Saifuddien (SHOAS) Bridge</span>
                    </div>
                    <div className="font-mono font-bold text-[#247545]">$12.00 BND</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={highwayCapMuaraTemburong}
                        onChange={(e) => setHighwayCapMuaraTemburong(parseFloat(e.target.value) || 16)}
                        className="w-20 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#132218]"
                      />
                      <span className="text-[10px] text-stone-400">max</span>
                    </div>
                  </div>

                  {/* Route 4: Tutong to Belait */}
                  <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                    <div className="sm:col-span-2">
                      <strong className="text-[#132218] block">Tutong ⇄ Belait</strong>
                      <span className="text-[11px] text-stone-500">Approx. 62 km • Telisai-Lumut Highway (45-55 mins)</span>
                    </div>
                    <div className="font-mono font-bold text-[#247545]">$10.00 BND</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        value={highwayCapTutongBelait}
                        onChange={(e) => setHighwayCapTutongBelait(parseFloat(e.target.value) || 14)}
                        className="w-20 bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#132218]"
                      />
                      <span className="text-[10px] text-stone-400">max</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={() => {
                      setHighwayRouteSavedMsg('Highway rate matrix and anti-gouging caps updated successfully.');
                      setTimeout(() => setHighwayRouteSavedMsg(null), 3500);
                    }}
                    className="px-4 py-2 bg-[#132218] hover:bg-[#243628] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Highway Rate Caps</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PANEL 2: RUNNER TOP-UPS APPROVAL */}
          {opsSubTab === 'TOP_UPS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E2D9] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
                <div>
                  <h3 className="text-base font-bold text-[#132218] font-display flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#247545]" />
                    <span>Courier Bank Transfer Top-Up Verification</span>
                  </h3>
                  <p className="text-xs text-[#4F6155] mt-0.5">
                    Review and confirm cash top-up slips submitted by couriers via BIBD or Baiduri bank transfer.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#DE5124] bg-[#FBE4DA] px-3 py-1 rounded-xl">
                    {pendingTopUps.length} Awaiting Verification
                  </span>
                </div>
              </div>

              {/* In-Person Counter Cash Top-Up Module */}
              <div className="p-5 bg-gradient-to-br from-[#F5F7F4] to-[#EAEFEA] rounded-2xl border border-[#D9E2D9] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#247545] text-white flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#132218] uppercase tracking-wider">
                        Instant Counter Cash Top-Up (Hub Cashier Desk)
                      </h4>
                      <p className="text-[11px] text-[#4F6155]">
                        When a runner visits the FOODFINDR logistics office with physical cash, credit their prepaid balance immediately.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-stone-500 bg-white/80 px-2.5 py-1 rounded-lg border border-[#D9E2D9]">
                    Authorized Officer: {currentUser.firstName} {currentUser.lastName}
                  </span>
                </div>

                {counterSuccessMsg && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{counterSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleRecordCounterCash} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-[#4F6155] block">Select Courier</label>
                    <select
                      value={counterRunnerId}
                      onChange={e => setCounterRunnerId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D9] bg-white text-xs text-[#132218] font-medium focus:outline-none focus:ring-2 focus:ring-[#247545]"
                    >
                      <option value="">-- Select Active Courier --</option>
                      {allRunners.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.firstName} {r.lastName} ({r.phone || r.email}) - {r.isVerified ? '✓ Verified' : '⏳ Pending'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-[#4F6155] block">Cash Received (BND)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">$</span>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        step="1"
                        value={counterAmount}
                        onChange={e => setCounterAmount(parseFloat(e.target.value) || 0)}
                        required
                        className="w-full pl-6 pr-3 py-2 rounded-xl border border-[#D9E2D9] bg-white text-xs text-[#132218] font-bold focus:outline-none focus:ring-2 focus:ring-[#247545]"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-[#4F6155] block">Notes / Receipt ID</label>
                    <input
                      type="text"
                      placeholder="e.g. Counter Cash Drawer 1"
                      value={counterNotes}
                      onChange={e => setCounterNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D9] bg-white text-xs text-[#132218] focus:outline-none focus:ring-2 focus:ring-[#247545]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-xl bg-[#247545] hover:bg-[#1C5C36] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Credit Cash</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Pending Queue */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider">
                  Pending Bank Transfer Requests (BIBD / Baiduri Slips)
                </h4>

                {pendingTopUps.length === 0 ? (
                  <div className="p-8 text-center bg-[#F9FAF8] rounded-2xl border border-dashed border-[#D9E2D9] space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#247545] mx-auto opacity-70" />
                    <p className="text-xs font-bold text-[#132218]">All Runner Top-Ups Up to Date</p>
                    <p className="text-[11px] text-[#4F6155]">No pending BIBD or Baiduri slips requiring verification.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D9E2D9] border border-[#D9E2D9] rounded-2xl overflow-hidden">
                    {pendingTopUps.map(req => (
                      <div key={req.id} className="p-4 sm:p-5 bg-white hover:bg-[#F9FAF8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[#132218]">{req.runnerName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2E6] text-[#247545]">
                              {req.bankName}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#4F6155]">
                            Phone: {req.runnerPhone} • Ref / TX: <code className="font-mono font-bold text-[#132218] bg-stone-100 px-1.5 py-0.5 rounded">{req.bankReferenceNumber}</code>
                          </p>
                          <p className="text-[10px] text-stone-400">
                            Requested {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8ECE8]">
                          <div className="text-right">
                            <span className="text-[10px] text-[#4F6155] block">Top-Up Credit</span>
                            <span className="text-base font-extrabold font-mono text-[#247545]">
                              +${req.amount.toFixed(2)} BND
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setRejectModalId(req.id)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveTopUp(req.id, req.runnerName, req.amount)}
                              className="px-4 py-1.5 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Credit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historical Top-Ups */}
              <div className="space-y-3 pt-4 border-t border-[#D9E2D9]">
                <h4 className="text-xs font-extrabold uppercase text-[#4F6155] tracking-wider">
                  Recently Processed Top-Ups
                </h4>
                <div className="divide-y divide-[#E8ECE8] border border-[#D9E2D9] rounded-2xl overflow-hidden">
                  {reviewedTopUps.map(req => (
                    <div key={req.id} className="p-3.5 bg-[#FDFEFC] flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-[#132218]">{req.runnerName}</strong>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'APPROVED' ? 'bg-[#E0F2E6] text-[#247545]' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#4F6155]">
                          {req.bankName} • Ref: {req.bankReferenceNumber} • Approved by {req.reviewedBy} ({req.reviewedByRole})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#132218]">${req.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-PANEL 3: CASH REMITTANCE & AUDIT */}
          {opsSubTab === 'CASH_SETTLEMENT' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E2D9] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
                <div>
                  <h3 className="text-base font-bold text-[#132218] font-display flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#DE5124]" />
                    <span>Cash on Delivery (COD) Hand-In Reconciliation</span>
                  </h3>
                  <p className="text-xs text-[#4F6155] mt-0.5">
                    Monitor doorstep cash collections and verify hand-ins between couriers, restaurant cashiers, and central logistics hubs.
                  </p>
                </div>
                
                {/* Dynamic Courier Cash Ceiling Configurator */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  {!isEditingCeiling ? (
                    <div className="flex items-center gap-2 bg-[#E0F2E6] px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                      <span className="text-xs font-bold text-[#247545]">
                        Max Runner Cash Ceiling: ${runnerCashCeiling.toFixed(2)} BND
                      </span>
                      <button
                        onClick={() => {
                          setCeilingInput(runnerCashCeiling);
                          setIsEditingCeiling(true);
                        }}
                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#247545] hover:bg-[#1b5834] text-white rounded-lg transition-colors cursor-pointer"
                        title="Adjust cash holding limit before runners must deposit money"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border-2 border-[#247545] shadow-sm">
                      <span className="text-xs font-bold text-stone-500 pl-1">$</span>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        step="10"
                        value={ceilingInput}
                        onChange={(e) => setCeilingInput(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold text-[#132218] border border-stone-300 rounded-lg focus:outline-hidden"
                      />
                      <button
                        onClick={() => {
                          setRunnerCashCeiling(ceilingInput);
                          setIsEditingCeiling(false);
                          setCeilingFeedback(`Updated Runner Cash Holding Ceiling to $${ceilingInput.toFixed(2)} BND.`);
                          setTimeout(() => setCeilingFeedback(null), 4000);
                        }}
                        className="px-2.5 py-1 bg-[#247545] hover:bg-[#1b5834] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingCeiling(false)}
                        className="px-2 py-1 text-stone-500 hover:text-stone-800 text-[11px] font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {ceilingFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold animate-in fade-in flex items-center justify-between">
                  <span>{ceilingFeedback}</span>
                  <button onClick={() => setCeilingFeedback(null)} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">×</button>
                </div>
              )}

              {/* Explainer Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                  <span className="text-xs font-bold text-[#132218] block">1. Doorstep Cash</span>
                  <p className="text-[11px] text-[#4F6155]">Runner collects full cash amount (Food Cost + Delivery Fee) from customer at doorstep.</p>
                </div>
                <div className="p-4 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                  <span className="text-xs font-bold text-[#132218] block">2. Kitchen Handover</span>
                  <p className="text-[11px] text-[#4F6155]">Runner hands the food bill portion directly to the restaurant cashier at completion.</p>
                </div>
                <div className="p-4 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1">
                  <span className="text-xs font-bold text-[#132218] block">3. Platform Fee</span>
                  <p className="text-[11px] text-[#4F6155]">FoodFindr $0.50 dispatch fee is auto-debited from runner prepaid balance. No manual cash handling needed.</p>
                </div>
              </div>

              {/* Table of COD Remittance records */}
              <div className="divide-y divide-[#D9E2D9] border border-[#D9E2D9] rounded-2xl overflow-hidden">
                <div className="bg-[#F5F7F4] px-4 py-2.5 text-[11px] font-bold text-[#4F6155] grid grid-cols-6">
                  <span>Order #</span>
                  <span>Runner</span>
                  <span>Restaurant</span>
                  <span>Total Collected</span>
                  <span>Kitchen Share</span>
                  <span className="text-right">Action / Status</span>
                </div>
                {cashRemittances.map(rec => (
                  <div key={rec.id} className="px-4 py-3.5 bg-white hover:bg-[#F9FAF8] transition-colors grid grid-cols-6 items-center text-xs">
                    <span className="font-mono font-bold text-[#DE5124]">{rec.orderNumber}</span>
                    <span className="font-semibold text-[#132218]">{rec.runnerName}</span>
                    <span className="text-[#4F6155] truncate">{rec.restaurantName}</span>
                    <span className="font-mono font-bold text-[#132218]">${rec.totalCashCollected.toFixed(2)}</span>
                    <span className="font-mono text-[#247545]">${rec.foodCostDueToKitchen.toFixed(2)}</span>
                    <div className="text-right">
                      {rec.status === 'HANDED_TO_RESTAURANT' ? (
                        <span className="text-[10px] font-bold text-[#247545] bg-[#E0F2E6] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Settled
                        </span>
                      ) : (
                        <button
                          onClick={() => acknowledgeCashRemittance(rec.id, `${currentUser.firstName} ${currentUser.lastName}`)}
                          className="px-2.5 py-1 bg-[#132218] hover:bg-[#243628] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Confirm Hand-In
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-PANEL 4: PLATFORM BANK ACCOUNTS & SUPPORT CONTACTS */}
          {opsSubTab === 'CONTACTS_BANKING' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#D9E2D9] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#132218] font-display flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#247545]" />
                      <span>Official Platform Settlement Accounts & Support Directory</span>
                    </h3>
                    <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-purple-700" />
                      Super Admin Governed
                    </span>
                  </div>
                  <p className="text-xs text-[#4F6155] mt-0.5">
                    Verified Brunei receiving accounts for courier float top-ups and merchant subscription remittances.
                  </p>
                </div>
              </div>

              {/* Admin Governance Callout */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 space-y-1">
                  <span className="font-extrabold block">Security & Financial Safety Notice</span>
                  <p className="text-purple-900 leading-relaxed text-[11px]">
                    To protect company funds and prevent unauthorized alterations, platform bank accounts (BIBD, Baiduri, TAIB) and mobile remittance rails (Tarus) are <strong>restricted to Super Admin modification</strong>. Operations Officers can copy and share these verified deposit addresses to assist couriers.
                  </p>
                </div>
              </div>

              {/* Registered Receiving Accounts Grid */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-[#132218] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#247545]" />
                  <span>Active Receiving Accounts & Digital Rails (BIBD, Baiduri, TAIB, Tarus)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(config.platformBankAccounts || []).map((bank) => (
                    <div
                      key={bank.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        bank.isActive
                          ? 'bg-white border-[#D9E2D9] shadow-xs'
                          : 'bg-[#F9FAF8] border-[#E8ECE8] opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0F2EF]">
                        <span className="font-extrabold text-xs text-[#132218] flex items-center gap-1.5 truncate">
                          <CreditCard className="w-4 h-4 text-[#247545]" />
                          <span>{bank.bankName}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            bank.paymentType === 'TARUS_MOBILE'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {bank.paymentType === 'TARUS_MOBILE' ? 'Tarus Mobile' : 'Bank Transfer'}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            bank.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {bank.isActive ? 'Active' : 'Decommissioned'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 space-y-2">
                        <div>
                          <span className="text-[10px] text-[#526056] block font-semibold">
                            {bank.paymentType === 'TARUS_MOBILE' ? 'Tarus Registered Mobile Number' : 'Account Number'}
                          </span>
                          <div className="flex items-center justify-between bg-[#F6F7F5] rounded-xl px-3 py-2 mt-0.5 border border-[#DCE3DD]">
                            <span className="font-mono text-sm font-bold text-[#16241B]">{bank.accountNumber}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(bank.accountNumber);
                                alert(`Copied "${bank.accountNumber}" to clipboard!`);
                              }}
                              className="text-[11px] font-bold text-[#247545] hover:underline flex items-center gap-1 cursor-pointer"
                              title="Copy to clipboard"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#526056] block font-semibold">Account / Enterprise Holder</span>
                          <span className="text-xs font-bold text-[#16241B] block">{bank.accountHolderName}</span>
                        </div>

                        {bank.instructions && (
                          <p className="text-[11px] text-[#526056] bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                            {bank.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Support & Contact Directory */}
              <div className="p-5 bg-white rounded-2xl border border-[#D9E2D9] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-[#132218] uppercase tracking-wider flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#247545]" />
                    <span>Official Operations Hotline & Contacts (Connected)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-stone-500">Live Support Directory</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Email */}
                  <div className="p-3.5 bg-[#F9FAF8] rounded-xl border border-[#DCE3DD] space-y-1">
                    <span className="text-[10px] font-bold text-[#526056] uppercase tracking-wider">Official Email</span>
                    <a
                      href={`mailto:${config.supportEmail || 'support@foodfindr.io'}`}
                      className="text-xs font-bold text-sky-700 hover:underline block truncate"
                    >
                      {config.supportEmail || 'support@foodfindr.io'}
                    </a>
                  </div>

                  {/* Office Phone */}
                  <div className="p-3.5 bg-[#F9FAF8] rounded-xl border border-[#DCE3DD] space-y-1">
                    <span className="text-[10px] font-bold text-[#526056] uppercase tracking-wider">Telephone Hotline</span>
                    <a
                      href={getPhoneCallUrl(config.supportPhone || '+673 242 8899')}
                      className="text-xs font-bold text-[#16241B] hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-[#247545]" />
                      <span>{config.supportPhone || '+673 242 8899'}</span>
                    </a>
                  </div>

                  {/* WhatsApp Hotline */}
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">WhatsApp Ops Hotline</span>
                    <a
                      href={getWhatsAppUrl(config.supportWhatsapp || '+673 888 1234', 'Hello FOODFINDR Support, I am inquiring about operations.')}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>{config.supportWhatsapp || '+673 888 1234'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Security & Financial Safety Explanation Card */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/90 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-extrabold text-sm font-display">
                    Financial Safety & Privacy Architecture: Why Putting Your Account Here is Safe
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white/90 rounded-xl border border-emerald-100 space-y-1.5">
                    <span className="font-extrabold text-[#132218] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      1. Inbound Transfers Only
                    </span>
                    <p className="text-[11px] text-[#4F6155] leading-relaxed">
                      Bank account numbers and enterprise names are public routing addresses. Anyone with your account number can <em>only deposit funds into</em> your account.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/90 rounded-xl border border-emerald-100 space-y-1.5">
                    <span className="font-extrabold text-[#132218] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      2. Cannot Withdraw Money
                    </span>
                    <p className="text-[11px] text-[#4F6155] leading-relaxed">
                      In retail banking (BIBD & Baiduri), money can never be debited without your private bank token, personal login password, or SMS OTP on your phone.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white/90 rounded-xl border border-emerald-100 space-y-1.5">
                    <span className="font-extrabold text-[#132218] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      3. Zero Secret Keys Exposed
                    </span>
                    <p className="text-[11px] text-[#4F6155] leading-relaxed">
                      All system credentials, database secrets, and API keys are stored server-side in secure environment variables, never sent to browser code.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW B: DIRECTORY MANAGER */}
      {activeTab === 'DIRECTORY' && (
        <DirectoryManagerTab onOpenFullOnboarding={() => setActiveTab('ONBOARDING')} />
      )}

      {/* VIEW C: MERCHANT ONBOARDING WIZARD */}
      {/* VIEW C: ONBOARDING WIZARD */}
      {activeTab === 'ONBOARDING' && (
        <div className="space-y-6">
          {/* Wizard Step Indicator */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] shadow-xs">
            <div className="flex items-center justify-between text-xs">
              {[
                { s: 1, title: '1. Brand Profile' },
                { s: 2, title: '2. Location & District' },
                { s: 3, title: '3. Delivery & In-House' },
                { s: 4, title: '4. Signature Menu' },
              ].map(st => (
                <div
                  key={st.s}
                  className={`font-semibold flex items-center gap-1.5 ${
                    step === st.s ? 'text-[#DE5124]' : step > st.s ? 'text-[#247545]' : 'text-[#7A8E80]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === st.s
                      ? 'bg-[#DE5124] text-white'
                      : step > st.s
                      ? 'bg-[#247545] text-white'
                      : 'bg-stone-200 text-[#7A8E80]'
                  }`}>
                    {step > st.s ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : st.s}
                  </div>
                  <span className="hidden sm:inline">{st.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Steps Container */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D9E2D9] shadow-sm">
            {/* Step 1: Profile */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#132218] font-display">Step 1: Restaurant Brand & Discovery Setup</h3>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Restaurant Legal / Brand Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:ring-2 focus:ring-[#DE5124]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Marketing Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:ring-2 focus:ring-[#DE5124]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Cuisine Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={cuisineInput}
                    onChange={(e) => setCuisineInput(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:ring-2 focus:ring-[#DE5124]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Price Tier</label>
                    <select
                      value={priceLevel}
                      onChange={(e) => setPriceLevel(e.target.value as any)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    >
                      <option value="$">$ (Budget Friendly)</option>
                      <option value="$$">$$ (Casual Dining)</option>
                      <option value="$$$">$$$ (Upscale Dining)</option>
                      <option value="$$$$">$$$$ (Fine Dining)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Initial Launch Ordering Mode</label>
                    <select
                      value={orderingMode}
                      onChange={(e) => setOrderingMode(e.target.value as any)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    >
                      <option value="ENABLED">Ordering Active (Online checkout enabled)</option>
                      <option value="DIRECTORY_ONLY">Directory Only (Discovery listing only)</option>
                      <option value="VIEW_ONLY">View Only (Catalog menu browsing)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Editorial Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#BF3F16]"
                  >
                    <span>Continue to Location</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Location & District */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#132218] font-display">Step 2: Kitchen Location & Brunei District</h3>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Physical Street Address</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">City / Area</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Brunei District</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] font-bold"
                    >
                      {BRUNEI_DISTRICTS.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Kitchen Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Restaurant Owner Email (Login & Notifications) *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F0F4EF] rounded-xl border border-[#D9E2D9] space-y-2">
                  <span className="text-[11px] font-bold text-[#132218] block">
                    Restaurant Owner Account Delegation (Special User Hierarchy)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-[#4F6155] block mb-1">Owner First Name</label>
                      <input
                        type="text"
                        value={ownerFirstName}
                        onChange={(e) => setOwnerFirstName(e.target.value)}
                        className="w-full bg-white border border-[#D9E2D9] rounded-lg px-2.5 py-1.5 text-xs text-[#132218]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#4F6155] block mb-1">Owner Last Name</label>
                      <input
                        type="text"
                        value={ownerLastName}
                        onChange={(e) => setOwnerLastName(e.target.value)}
                        className="w-full bg-white border border-[#D9E2D9] rounded-lg px-2.5 py-1.5 text-xs text-[#132218]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#7A8E80]">
                    The platform will provision a RESTAURANT_OWNER account for this person and send welcome credentials via transactional email.
                  </p>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155] hover:bg-[#F5F7F4]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#BF3F16]"
                  >
                    <span>Continue to Fulfillment Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Fulfillment Type (In-House vs Public) & Delivery Settings */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="text-base font-bold text-[#132218] font-display">
                  Step 3: Delivery Fulfillment Model & Logistics Setup
                </h3>

                {/* Fulfillment Selection Card */}
                <div className="p-4 sm:p-5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-3">
                  <label className="text-xs font-extrabold text-[#132218] block">
                    Choose Courier Fulfillment Model:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleFulfillmentToggle('IN_HOUSE_RUNNER')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        fulfillmentType === 'IN_HOUSE_RUNNER'
                          ? 'bg-white border-[#247545] ring-2 ring-[#247545]/20 shadow-sm'
                          : 'bg-white/60 border-[#D9E2D9] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E0F2E6] text-[#247545] flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        {fulfillmentType === 'IN_HOUSE_RUNNER' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#247545] text-white text-[9px] font-bold">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-[#132218]">Dedicated In-House Fleet</h4>
                      <p className="text-[11px] text-[#4F6155] mt-1 leading-relaxed">
                        Restaurant uses its own salaried couriers. Bypasses the $0.50 public dispatch fee. Allows setting $0 Free Delivery for local orders.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFulfillmentToggle('PLATFORM_RUNNER')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        fulfillmentType === 'PLATFORM_RUNNER'
                          ? 'bg-white border-[#DE5124] ring-2 ring-[#DE5124]/20 shadow-sm'
                          : 'bg-white/60 border-[#D9E2D9] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-[#FBE4DA] text-[#DE5124] flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                        {fulfillmentType === 'PLATFORM_RUNNER' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#DE5124] text-white text-[9px] font-bold">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-[#132218]">FoodFindr Open Courier Pool</h4>
                      <p className="text-[11px] text-[#4F6155] mt-1 leading-relaxed">
                        Orders are dispatched to verified freelance couriers across Brunei's 4 districts. Standard distance rates apply.
                      </p>
                    </button>
                  </div>

                  {/* In-House Specific Settings */}
                  {fulfillmentType === 'IN_HOUSE_RUNNER' && (
                    <div className="p-3.5 bg-[#E0F2E6]/60 rounded-xl border border-[#247545]/20 space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-xs text-[#132218]">Offer Free Delivery (In-House Staff)</strong>
                          <p className="text-[11px] text-[#4F6155]">Since staff are on monthly salary, do you want to offer customers $0 delivery fee?</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInHouseFreeToggle(!inHouseFreeDelivery)}
                          className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                            inHouseFreeDelivery ? 'bg-[#247545]' : 'bg-stone-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            inHouseFreeDelivery ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Standard Delivery Fee ($ BND)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Minimum Order Amount ($ BND)</label>
                    <input
                      type="number"
                      value={minimumOrder}
                      onChange={(e) => setMinimumOrder(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] font-mono"
                    />
                  </div>
                </div>

                {/* Banner & Logo */}
                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Cover Hero Banner (Auto-Compressed)</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={coverImageUrl}
                        alt="Cover Preview"
                        className="w-24 h-14 rounded-xl object-cover border border-[#D9E2D9] bg-[#F5F7F4] shrink-0"
                      />
                      <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#D9E2D9] hover:bg-[#F5F7F4] rounded-xl text-xs font-bold text-[#132218] cursor-pointer transition-all shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#DE5124]" />
                        <span>{isCompressingCover ? 'Optimizing Photo...' : 'Upload & Compress Banner'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                          disabled={isCompressingCover}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Logo / Avatar</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-[#D9E2D9] bg-[#F5F7F4] shrink-0"
                      />
                      <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#D9E2D9] hover:bg-[#F5F7F4] rounded-xl text-xs font-bold text-[#132218] cursor-pointer transition-all shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#DE5124]" />
                        <span>{isCompressingLogo ? 'Optimizing...' : 'Upload & Compress Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={isCompressingLogo}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155] hover:bg-[#F5F7F4]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#BF3F16]"
                  >
                    <span>Continue to Signature Menu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Signature Dish */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#132218] font-display">Step 4: Seed Signature Dish & Publish</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Initial Category Name</label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Signature Dish Name</label>
                    <input
                      type="text"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Price ($ BND)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Dish Description</label>
                  <textarea
                    rows={2}
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Dish Photo (Auto-Compressed)</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={dishImage}
                        alt="Dish Preview"
                        className="w-14 h-14 rounded-xl object-cover border border-[#D9E2D9] bg-[#F5F7F4] shrink-0"
                      />
                      <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#D9E2D9] hover:bg-[#F5F7F4] rounded-xl text-xs font-bold text-[#132218] cursor-pointer transition-all shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#DE5124]" />
                        <span>{isCompressingDish ? 'Compressing Dish...' : 'Upload Dish Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDishUpload}
                          className="hidden"
                          disabled={isCompressingDish}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155] hover:bg-[#F5F7F4]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateMerchant}
                    className="px-6 py-3 rounded-2xl bg-[#247545] text-white text-xs font-extrabold flex items-center gap-2 hover:bg-[#1E6038] shadow-md active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Verify & Launch Merchant Profile</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Success Confirmation */}
            {step === 5 && createdRestaurant && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E0F2E6] text-[#247545] flex items-center justify-center mx-auto shadow-xs">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-bold text-[#132218] font-display">
                  {createdRestaurant.name} is Live!
                </h3>
                <p className="text-xs text-[#4F6155] max-w-md mx-auto">
                  The merchant account has been initialized in <strong>{createdRestaurant.address.district}</strong> under <strong>{createdRestaurant.fulfillmentType === 'IN_HOUSE_RUNNER' ? 'Dedicated In-House Fleet' : 'Public Courier Fleet'}</strong>.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold hover:bg-[#BF3F16] shadow-xs cursor-pointer"
                  >
                    Onboard Another Merchant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW D: B2B COMMERCIAL SUPPLIERS */}
      {activeTab === 'B2B_SUPPLIERS' && (
        <CommercialSupplierManager />
      )}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#DCE3DD] space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Reject Top-Up Slip</h3>
            </div>
            <p className="text-xs text-[#4F6155]">
              Please state why this bank reference is invalid so the courier can resubmit with correct proof:
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl text-xs font-medium text-[#132218]"
              placeholder="e.g. Transaction ID not found in bank statement"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2 rounded-xl border border-[#D9E2D9] text-xs font-bold text-[#4F6155]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTopUp}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
