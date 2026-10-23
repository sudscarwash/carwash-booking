import React, { useState } from 'react';
import { Restaurant, B2BCategory, B2BWholesaleProduct, B2BPurchaseOrder } from '../../types';
import { 
  Building2, 
  ShoppingBag, 
  Truck, 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Search, 
  Info, 
  DollarSign, 
  Compass, 
  Navigation, 
  Percent, 
  Store, 
  Check, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';

interface B2BWholesaleHubProps {
  restaurant: Restaurant;
}

export const INITIAL_B2B_PRODUCTS: B2BWholesaleProduct[] = [
  {
    id: 'b2b_1',
    supplierId: 'supp_pds',
    supplierName: 'PDS Abattoir & Halal Poultry',
    supplierDistrict: 'Brunei-Muara',
    supplierHalalCert: 'MUIB/HALAL/B2B-0492',
    category: 'POULTRY_MEAT',
    title: 'Grade A Fresh Halal Whole Chicken Wings (20kg Box)',
    description: 'Chilled daily morning delivery, pre-cleaned and packed in food-grade thermal containers. Ideal for frying and grilling.',
    unit: '20kg box',
    minOrderQuantity: 2,
    wholesaleUnitPriceBND: 64.00, // $3.20/kg
    leadTimeHours: 12,
    isAvailable: true,
    deliveryOption: 'SUPPLIER_TRUCK',
    depotLocation: {
      district: 'Brunei-Muara',
      kampong: 'Kg. Beribi',
      addressLine: 'Tapak Perindustrian Beribi II, Phase 2, Lot 14, Spg 88',
      coordinates: { lat: 4.8872, lng: 114.9084 },
    },
    coverageDistricts: ['Brunei-Muara', 'Tutong', 'Belait'],
    platformFeePercent: 2.0,
  },
  {
    id: 'b2b_2',
    supplierId: 'supp_melati',
    supplierName: 'Seri Melati Grains & Staples',
    supplierDistrict: 'Brunei-Muara',
    supplierHalalCert: 'MUIB/HALAL/B2B-0118',
    category: 'DRY_GOODS_RICE',
    title: 'Beras Wangi AAA Fragrant Thai Jasmine Rice (50kg Bag)',
    description: 'First-crop long-grain fragrant rice with optimal moisture retention for chicken rice, fried rice, and nasi lemak.',
    unit: '50kg bag',
    minOrderQuantity: 1,
    wholesaleUnitPriceBND: 38.50,
    leadTimeHours: 24,
    isAvailable: true,
    deliveryOption: 'SUPPLIER_TRUCK',
    depotLocation: {
      district: 'Brunei-Muara',
      kampong: 'Kg. Salambigar',
      addressLine: 'Salambigar Industrial Park, Block C, Warehouse 4',
      coordinates: { lat: 4.9542, lng: 114.9812 },
    },
    coverageDistricts: ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'],
    platformFeePercent: 1.5,
  },
  {
    id: 'b2b_3',
    supplierRestaurantId: 'rest_selera_ck',
    supplierName: 'Warung Selera Central Kitchen (Owner to Owner)',
    supplierDistrict: 'Tutong',
    supplierHalalCert: 'MUIB/HALAL/B2B-0881',
    category: 'SAUCES_CONDIMENTS',
    title: 'Signature Sambal Pedas Manis Paste (5-Litre Bulk Tub)',
    description: 'Slow-cooked traditional sambal paste using local bird-eye chilies, shallots, and palm sugar. Ready to serve or use as cooking base.',
    unit: '5L tub',
    minOrderQuantity: 1,
    wholesaleUnitPriceBND: 28.00,
    leadTimeHours: 18,
    isAvailable: true,
    deliveryOption: 'SUPPLIER_TRUCK',
    depotLocation: {
      district: 'Tutong',
      kampong: 'Kg. Petani',
      addressLine: 'Spg 44, Jalan Tutong Commercial Strip, Central Kitchen Unit 3',
      coordinates: { lat: 4.8021, lng: 114.6510 },
    },
    coverageDistricts: ['Tutong', 'Brunei-Muara'],
    platformFeePercent: 2.0,
  },
  {
    id: 'b2b_4',
    supplierId: 'supp_ecopack',
    supplierName: 'Brunei EcoPack Packaging Distributor',
    supplierDistrict: 'Belait',
    supplierHalalCert: 'SIRIM-ECO/BN-2024',
    category: 'PACKAGING',
    title: 'Biodegradable Kraft Paper Bento Meal Box (500 pcs/Carton)',
    description: 'Food-grade leakproof oil-resistant takeaway boxes. Recyclable and microwave safe up to 100°C.',
    unit: 'carton (500 pcs)',
    minOrderQuantity: 1,
    wholesaleUnitPriceBND: 46.00,
    leadTimeHours: 24,
    isAvailable: true,
    deliveryOption: 'SUPPLIER_TRUCK',
    depotLocation: {
      district: 'Belait',
      kampong: 'Pekan Kuala Belait',
      addressLine: 'Kuala Belait Light Industrial Area, Lot 89, Spg 22',
      coordinates: { lat: 4.5821, lng: 114.2312 },
    },
    coverageDistricts: ['Belait', 'Tutong', 'Brunei-Muara'],
    platformFeePercent: 2.0,
  },
  {
    id: 'b2b_5',
    supplierRestaurantId: 'rest_kaffeine_roastery',
    supplierName: 'Kaffeine Roasters Kiulap (Owner to Owner)',
    supplierDistrict: 'Brunei-Muara',
    supplierHalalCert: 'MUIB/HALAL/B2B-0943',
    category: 'BEVERAGE_BEANS',
    title: 'Espresso House Blend Whole Roasted Coffee Beans (5kg Bag)',
    description: 'Medium-dark roast with dark chocolate and caramel notes. Roasted weekly in Kiulap. Perfect for cafe espresso bars.',
    unit: '5kg bag',
    minOrderQuantity: 1,
    wholesaleUnitPriceBND: 115.00, // $23/kg
    leadTimeHours: 24,
    isAvailable: true,
    deliveryOption: 'SELF_PICKUP',
    depotLocation: {
      district: 'Brunei-Muara',
      kampong: 'Kg. Kiulap',
      addressLine: 'Block B, Unit 8, Ground Floor, Bangunan Kiulap Plaza',
      coordinates: { lat: 4.8942, lng: 114.9315 },
    },
    coverageDistricts: ['Brunei-Muara'],
    platformFeePercent: 0.0, // Promotional zero commission
  },
];

const INITIAL_PURCHASE_ORDERS: B2BPurchaseOrder[] = [
  {
    id: 'po_1',
    poNumber: 'PO-B2B-9841',
    buyerRestaurantId: 'rest_bella',
    buyerRestaurantName: 'Trattoria Bella & Grill',
    supplierName: 'PDS Abattoir & Halal Poultry',
    supplierId: 'supp_pds',
    items: [
      {
        productId: 'b2b_1',
        productTitle: 'Grade A Fresh Halal Whole Chicken Wings (20kg Box)',
        quantity: 3,
        unitPrice: 64.00,
        totalPrice: 192.00,
      }
    ],
    totalAmountBND: 192.00,
    platformFacilitationFeeBND: 3.84, // 2%
    feePayer: 'SUPPLIER_DEDUCTION',
    status: 'OUT_FOR_DELIVERY',
    paymentMethod: 'BIBD_CORPORATE_TRANSFER',
    fulfillmentOption: 'SUPPLIER_TRUCK_DELIVERY',
    deliveryDistrict: 'Brunei-Muara',
    createdAt: '2026-09-17 15:30',
  },
];

export const B2BWholesaleHub: React.FC<B2BWholesaleHubProps> = ({ restaurant }) => {
  const [activeMode, setActiveMode] = useState<'BUYER' | 'VENDOR' | 'ORDERS'>('BUYER');
  const [products, setProducts] = useState<B2BWholesaleProduct[]>(INITIAL_B2B_PRODUCTS);
  const [purchaseOrders, setPurchaseOrders] = useState<B2BPurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Location / Depot Map Modal
  const [inspectedSupplier, setInspectedSupplier] = useState<B2BWholesaleProduct | null>(null);

  // Ordering PO modal state
  const [selectedProductForPO, setSelectedProductForPO] = useState<B2BWholesaleProduct | null>(null);
  const [poQuantity, setPoQuantity] = useState<number>(1);
  const [poFulfillment, setPoFulfillment] = useState<'SUPPLIER_TRUCK_DELIVERY' | 'DEPOT_SELF_PICKUP'>('SUPPLIER_TRUCK_DELIVERY');
  const [poPaymentMethod, setPoPaymentMethod] = useState<'BIBD_CORPORATE_TRANSFER' | 'BAIDURI_TRANSFER' | 'NET_14_CREDIT'>('BIBD_CORPORATE_TRANSFER');
  const [poSuccessMessage, setPoSuccessMessage] = useState<string | null>(null);

  // New Vendor Listing State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<B2BCategory>('SAUCES_CONDIMENTS');
  const [newUnit, setNewUnit] = useState('5L tub');
  const [newPrice, setNewPrice] = useState<number>(30);
  const [newMoq, setNewMoq] = useState<number>(1);
  const [newDesc, setNewDesc] = useState('');
  const [newDeliveryOpt, setNewDeliveryOpt] = useState<'SUPPLIER_TRUCK' | 'SELF_PICKUP'>('SUPPLIER_TRUCK');
  const [vendorSuccessMsg, setVendorSuccessMsg] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesDistrict = districtFilter === 'ALL' || p.supplierDistrict === districtFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.depotLocation?.addressLine || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDistrict && matchesSearch;
  });

  const handleOpenPO = (product: B2BWholesaleProduct) => {
    setSelectedProductForPO(product);
    setPoQuantity(product.minOrderQuantity);
    setPoFulfillment(product.deliveryOption === 'SELF_PICKUP' ? 'DEPOT_SELF_PICKUP' : 'SUPPLIER_TRUCK_DELIVERY');
  };

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForPO) return;

    const subtotal = selectedProductForPO.wholesaleUnitPriceBND * poQuantity;
    const feeRate = (selectedProductForPO.platformFeePercent ?? 2.0) / 100;
    const facilitationFee = +(subtotal * feeRate).toFixed(2);

    const newPO: B2BPurchaseOrder = {
      id: `po_${Date.now()}`,
      poNumber: `PO-B2B-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerRestaurantId: restaurant.id,
      buyerRestaurantName: restaurant.name,
      supplierName: selectedProductForPO.supplierName,
      supplierId: selectedProductForPO.supplierId,
      items: [
        {
          productId: selectedProductForPO.id,
          productTitle: selectedProductForPO.title,
          quantity: poQuantity,
          unitPrice: selectedProductForPO.wholesaleUnitPriceBND,
          totalPrice: subtotal,
        }
      ],
      totalAmountBND: subtotal,
      platformFacilitationFeeBND: facilitationFee,
      feePayer: 'SUPPLIER_DEDUCTION',
      status: 'SUBMITTED',
      paymentMethod: poPaymentMethod,
      fulfillmentOption: poFulfillment,
      deliveryDistrict: restaurant.address.district,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setPurchaseOrders([newPO, ...purchaseOrders]);
    setSelectedProductForPO(null);
    setPoSuccessMessage(`Purchase Order ${newPO.poNumber} has been dispatched to ${selectedProductForPO.supplierName}! Direct corporate settlement initiated.`);
    setTimeout(() => setPoSuccessMessage(null), 6000);
  };

  const handleCreateVendorListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newPrice <= 0) return;

    const newListing: B2BWholesaleProduct = {
      id: `b2b_owner_${Date.now()}`,
      supplierRestaurantId: restaurant.id,
      supplierName: `${restaurant.name} (Central Kitchen)`,
      supplierDistrict: restaurant.address.district,
      supplierHalalCert: restaurant.isHalalCertified ? 'MUIB/HALAL/REST-VERIFIED' : 'MUIB/HALAL/PENDING',
      category: newCategory,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Wholesale kitchen batch produced under Brunei commercial kitchen hygiene standards.',
      unit: newUnit,
      minOrderQuantity: newMoq,
      wholesaleUnitPriceBND: newPrice,
      leadTimeHours: 24,
      isAvailable: true,
      deliveryOption: newDeliveryOpt,
      depotLocation: {
        district: restaurant.address.district,
        kampong: restaurant.address.city || 'Brunei Central',
        addressLine: restaurant.address.street,
        coordinates: { 
          lat: restaurant.address.latitude || 4.8857, 
          lng: restaurant.address.longitude || 114.9317 
        },
      },
      coverageDistricts: [restaurant.address.district],
      platformFeePercent: 2.0,
    };

    setProducts([newListing, ...products]);
    setVendorSuccessMsg(`Your wholesale product "${newListing.title}" is now published to other verified restaurant owners across Brunei!`);
    setTimeout(() => setVendorSuccessMsg(null), 5000);

    // Reset Form
    setNewTitle('');
    setNewPrice(30);
    setNewMoq(1);
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Privacy Banner */}
      <div className="bg-[#16241B] text-white p-6 sm:p-8 rounded-3xl border border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-[#E0562B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                B2B Marketplace (Phase 6B)
              </span>
              <span className="text-xs text-stone-300 font-mono">Role: Restaurant Buyer & Vendor</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display">B2B Wholesale Procurement Hub</h2>
            <p className="text-xs text-stone-300 max-w-xl">
              Procure wholesale raw ingredients directly from commercial suppliers or purchase bulk batches (sambal, pre-marinated meats, roasted beans) from fellow restaurant owners.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-2xl border border-white/15">
            <button
              onClick={() => setActiveMode('BUYER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'BUYER' ? 'bg-[#E0562B] text-white shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              Buyer Mode (Procurement)
            </button>
            <button
              onClick={() => setActiveMode('VENDOR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'VENDOR' ? 'bg-[#E0562B] text-white shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              Vendor Mode (Sell Wholesale)
            </button>
            <button
              onClick={() => setActiveMode('ORDERS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'ORDERS' ? 'bg-[#E0562B] text-white shadow-xs' : 'text-stone-300 hover:text-white'
              }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
          </div>
        </div>

        {/* B2B Privacy Guarantee & Commission Structure Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-2.5 text-[11px] text-stone-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Confidential B2B Pricing:</strong>
              Wholesale pricing, MOQs, and supplier volume discounts are strictly isolated from the public consumer app. Only verified business owners can view this catalog.
            </div>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-2.5 text-[11px] text-stone-300">
            <Percent className="w-4 h-4 text-[#E0562B] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Clear Commission Separation:</strong>
              Customer restaurant orders (QR Table/Tapao) incur <strong>0% Commission</strong>. B2B wholesale clearing orders incur a low <strong>1.5% - 2% facilitation fee</strong> (or 0% launch promo).
            </div>
          </div>
        </div>
      </div>

      {poSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{poSuccessMessage}</span>
        </div>
      )}

      {vendorSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{vendorSuccessMsg}</span>
        </div>
      )}

      {/* MODE 1: BUYER (PROCUREMENT) */}
      {activeMode === 'BUYER' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
              {[
                { id: 'ALL', label: 'All Supplies' },
                { id: 'POULTRY_MEAT', label: 'Poultry & Meats' },
                { id: 'DRY_GOODS_RICE', label: 'Rice & Grains' },
                { id: 'SAUCES_CONDIMENTS', label: 'Sauces & Pastes' },
                { id: 'PACKAGING', label: 'Takeaway Packaging' },
                { id: 'BEVERAGE_BEANS', label: 'Coffee & Drinks' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#16241B] text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:text-[#16241B]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={districtFilter}
                onChange={e => setDistrictFilter(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-semibold"
              >
                <option value="ALL">All Districts</option>
                <option value="Brunei-Muara">Brunei-Muara</option>
                <option value="Tutong">Tutong</option>
                <option value="Belait">Belait</option>
                <option value="Temburong">Temburong</option>
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products or depots..."
                  className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const isOwnerToOwner = Boolean(product.supplierRestaurantId);
              const isSameDistrict = product.supplierDistrict === restaurant.address.district;

              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs hover:border-[#E0562B]/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        isOwnerToOwner 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {isOwnerToOwner ? '★ Owner-to-Owner Trade' : 'Commercial Supplier'}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Halal: {product.supplierHalalCert}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-[#16241B] leading-snug">{product.title}</h3>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>

                    {/* Depot Location & Mapping Box */}
                    <div className="p-2.5 bg-stone-50 rounded-2xl space-y-2 text-xs border border-stone-100">
                      <div className="flex items-center justify-between text-stone-600">
                        <span>Supplier:</span>
                        <strong className="text-[#16241B] truncate max-w-[140px]">{product.supplierName}</strong>
                      </div>

                      {/* Location & Map Preview Button */}
                      <div className="p-2 bg-white rounded-xl border border-stone-200 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1 text-[11px] text-stone-700">
                            <MapPin className="w-3.5 h-3.5 text-[#E0562B] shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[#16241B] block">{product.supplierDistrict} Depot</span>
                              <span className="text-[10px] text-stone-500 line-clamp-1">
                                {product.depotLocation?.addressLine || product.supplierDistrict}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                            isSameDistrict ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {isSameDistrict ? 'Local District' : 'Cross-District'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectedSupplier(product)}
                          className="w-full mt-1 py-1 text-[10px] font-bold text-[#2C6E8E] hover:text-[#1A4E67] bg-blue-50/50 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Compass className="w-3 h-3 text-[#2C6E8E]" />
                          <span>View Depot Map & Coverage</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-stone-600 text-[11px]">
                        <span>Min. Order (MOQ):</span>
                        <span className="font-mono font-bold text-stone-900">{product.minOrderQuantity} {product.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-600 text-[11px]">
                        <span>Delivery Lead Time:</span>
                        <span className="text-stone-700">{product.leadTimeHours} hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Wholesale Rate</span>
                      <span className="text-lg font-mono font-black text-[#16241B]">
                        ${product.wholesaleUnitPriceBND.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-normal"> / {product.unit}</span>
                    </div>

                    <button
                      onClick={() => handleOpenPO(product)}
                      className="px-3.5 py-2 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Create PO</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: VENDOR (SELL MY PRODUCTS WHOLESALE) */}
      {activeMode === 'VENDOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#E0562B]" />
              <h3 className="font-extrabold text-sm text-[#16241B]">List New Wholesale Product</h3>
            </div>
            <p className="text-xs text-stone-500">
              Does your kitchen produce signature sambal, baked buns, curry pastes, or pre-marinated meats? Sell bulk batches to other eateries across Brunei!
            </p>

            <form onSubmit={handleCreateVendorListing} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Homemade Sambal Hitam (5L Tub)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as B2BCategory)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
                  >
                    <option value="SAUCES_CONDIMENTS">Sauces & Pastes</option>
                    <option value="POULTRY_MEAT">Poultry & Meats</option>
                    <option value="DRY_GOODS_RICE">Rice & Grains</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="BEVERAGE_BEANS">Beverages & Beans</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Unit Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5L tub, 10kg box"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Wholesale Price (BND)</label>
                  <input
                    type="number"
                    step="0.10"
                    min="1"
                    required
                    value={newPrice}
                    onChange={e => setNewPrice(+e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Minimum Order (MOQ)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMoq}
                    onChange={e => setNewMoq(+e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Fulfillment Option</label>
                <select
                  value={newDeliveryOpt}
                  onChange={e => setNewDeliveryOpt(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                >
                  <option value="SUPPLIER_TRUCK">We Deliver via In-House Vehicle</option>
                  <option value="SELF_PICKUP">Buyer Self-Pickup at Kitchen Gate</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Description & Ingredients</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe recipe, refrigeration requirements, and storage instructions..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-600 border border-stone-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Dispatch Location:</span>
                  <span className="text-[#16241B]">{restaurant.address.street}, {restaurant.address.district}</span>
                </div>
                <div className="flex items-center justify-between text-stone-500">
                  <span>Platform Clearing Fee:</span>
                  <span className="font-mono font-bold text-[#E0562B]">2.0% on completed PO</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Publish Wholesale Listing
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[#16241B]">My Wholesale Listings ({products.filter(p => p.supplierRestaurantId === restaurant.id).length})</h3>
              <span className="text-xs text-stone-500 font-mono">Kitchen: {restaurant.name}</span>
            </div>

            <div className="space-y-3">
              {products.filter(p => p.supplierRestaurantId === restaurant.id).map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                    <h4 className="font-bold text-sm text-[#16241B] mt-1">{p.title}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">{p.description}</p>
                    <div className="flex items-center gap-3 text-xs text-stone-600 mt-2 font-mono">
                      <span>MOQ: {p.minOrderQuantity} {p.unit}</span>
                      <span>•</span>
                      <span>Rate: ${p.wholesaleUnitPriceBND.toFixed(2)} / {p.unit}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    Active & Listed
                  </span>
                </div>
              ))}

              {products.filter(p => p.supplierRestaurantId === restaurant.id).length === 0 && (
                <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-stone-300 text-stone-500 text-xs">
                  You haven't listed any wholesale products yet. Use the form on the left to offer bulk batches to other restaurants in Brunei!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: PURCHASE ORDERS */}
      {activeMode === 'ORDERS' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-[#16241B]">Track Wholesale Purchase Orders</h3>
              <p className="text-xs text-stone-500">Official commercial transactions between verified businesses in Brunei.</p>
            </div>
            <span className="text-xs font-mono text-stone-500">{purchaseOrders.length} records</span>
          </div>

          <div className="space-y-3">
            {purchaseOrders.map(po => (
              <div key={po.id} className="p-4 rounded-2xl border border-stone-200 hover:border-stone-300 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-[#16241B] bg-stone-100 px-2 py-1 rounded-lg">
                      {po.poNumber}
                    </span>
                    <span className="text-xs font-bold text-stone-700">Supplier: {po.supplierName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                      {po.fulfillmentOption === 'SUPPLIER_TRUCK_DELIVERY' ? '🚚 Truck Delivery' : '🏢 Self-Pickup'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      po.status === 'OUT_FOR_DELIVERY' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {po.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1.5">
                  {po.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-stone-700">
                      <span>{item.quantity}x {item.productTitle}</span>
                      <span className="font-mono font-bold text-stone-900">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-bold text-stone-900">
                    <span>Wholesale Total:</span>
                    <span className="font-mono">${po.totalAmountBND.toFixed(2)} BND</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Platform Facilitation Fee:</span>
                    <span className="font-mono">${po.platformFacilitationFeeBND.toFixed(2)} BND ({po.feePayer === 'SUPPLIER_DEDUCTION' ? 'Supplier side' : 'Buyer side'})</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span>Settlement: <strong>{po.paymentMethod.replace(/_/g, ' ')}</strong></span>
                  <span>Destination: <strong>{po.deliveryDistrict || restaurant.address.district}</strong></span>
                  <span>Created: {po.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: DEPOT LOCATION & INTERACTIVE BRUNEI MAP VISUALIZER */}
      {inspectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-2 border-b border-stone-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#E0562B]">Depot Mapping & Delivery Logistics</span>
                <h3 className="font-extrabold text-base text-[#16241B]">{inspectedSupplier.supplierName}</h3>
                <p className="text-xs text-stone-500">Product: {inspectedSupplier.title}</p>
              </div>
              <button
                onClick={() => setInspectedSupplier(null)}
                className="text-stone-400 hover:text-stone-700 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Interactive Brunei Map Schematic */}
            <div className="p-4 bg-[#16241B] rounded-2xl text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-stone-200">
                  <Compass className="w-3.5 h-3.5 text-[#E0562B]" />
                  Brunei Regional Transit Map
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  GPS: {inspectedSupplier.depotLocation?.coordinates.lat.toFixed(4)}° N, {inspectedSupplier.depotLocation?.coordinates.lng.toFixed(4)}° E
                </span>
              </div>

              {/* Stylized Brunei Map Visualization */}
              <div className="relative h-44 bg-emerald-950/40 rounded-xl border border-white/10 p-3 flex flex-col justify-between overflow-hidden">
                {/* District Zones */}
                <div className="grid grid-cols-4 gap-2 h-full items-center text-center">
                  {/* Belait */}
                  <div className={`h-28 rounded-lg p-2 flex flex-col justify-between border transition-all ${
                    inspectedSupplier.supplierDistrict === 'Belait'
                      ? 'bg-[#E0562B]/30 border-[#E0562B] text-white'
                      : inspectedSupplier.coverageDistricts?.includes('Belait')
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-stone-400'
                  }`}>
                    <span className="text-[10px] font-bold">Belait</span>
                    {inspectedSupplier.supplierDistrict === 'Belait' && (
                      <span className="bg-[#E0562B] text-white text-[8px] font-black px-1 py-0.5 rounded shadow">
                        📍 DEPOT
                      </span>
                    )}
                    <span className="text-[8px] opacity-70">SW Zone</span>
                  </div>

                  {/* Tutong */}
                  <div className={`h-28 rounded-lg p-2 flex flex-col justify-between border transition-all ${
                    inspectedSupplier.supplierDistrict === 'Tutong'
                      ? 'bg-[#E0562B]/30 border-[#E0562B] text-white'
                      : inspectedSupplier.coverageDistricts?.includes('Tutong')
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-stone-400'
                  }`}>
                    <span className="text-[10px] font-bold">Tutong</span>
                    {inspectedSupplier.supplierDistrict === 'Tutong' && (
                      <span className="bg-[#E0562B] text-white text-[8px] font-black px-1 py-0.5 rounded shadow">
                        📍 DEPOT
                      </span>
                    )}
                    <span className="text-[8px] opacity-70">Central</span>
                  </div>

                  {/* Brunei-Muara */}
                  <div className={`h-28 rounded-lg p-2 flex flex-col justify-between border transition-all ${
                    inspectedSupplier.supplierDistrict === 'Brunei-Muara'
                      ? 'bg-[#E0562B]/30 border-[#E0562B] text-white'
                      : inspectedSupplier.coverageDistricts?.includes('Brunei-Muara')
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-stone-400'
                  }`}>
                    <span className="text-[10px] font-bold">Brunei-Muara</span>
                    {inspectedSupplier.supplierDistrict === 'Brunei-Muara' && (
                      <span className="bg-[#E0562B] text-white text-[8px] font-black px-1 py-0.5 rounded shadow">
                        📍 DEPOT
                      </span>
                    )}
                    <span className="text-[8px] opacity-70">Capital Hub</span>
                  </div>

                  {/* Temburong */}
                  <div className={`h-28 rounded-lg p-2 flex flex-col justify-between border transition-all ${
                    inspectedSupplier.supplierDistrict === 'Temburong'
                      ? 'bg-[#E0562B]/30 border-[#E0562B] text-white'
                      : inspectedSupplier.coverageDistricts?.includes('Temburong')
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-stone-400'
                  }`}>
                    <span className="text-[10px] font-bold">Temburong</span>
                    {inspectedSupplier.supplierDistrict === 'Temburong' && (
                      <span className="bg-[#E0562B] text-white text-[8px] font-black px-1 py-0.5 rounded shadow">
                        📍 DEPOT
                      </span>
                    )}
                    <span className="text-[8px] opacity-70">Bridge Cross</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-stone-400 pt-1 border-t border-white/10">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#E0562B]"></span> Depot Origin
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Truck Route Covered
                  </span>
                  <span className="text-emerald-400 font-bold">Your Kitchen: {restaurant.address.district}</span>
                </div>
              </div>
            </div>

            {/* Warehouse Address & Instructions */}
            <div className="p-3 bg-stone-50 rounded-2xl space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#E0562B] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#16241B] block">Warehouse / Gate Pickup Address:</strong>
                  <p className="text-stone-700 mt-0.5">
                    {inspectedSupplier.depotLocation?.addressLine || 'Industrial Complex'}
                  </p>
                  <p className="text-stone-500 text-[11px]">
                    {inspectedSupplier.depotLocation?.kampong}, {inspectedSupplier.depotLocation?.district}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500 block">Truck Delivery Coverage:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {inspectedSupplier.coverageDistricts?.map(d => (
                      <span key={d} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-stone-500 block">Pickup Hours:</span>
                  <span className="font-semibold text-stone-800">06:00 AM - 12:00 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectedSupplier(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Map
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = inspectedSupplier;
                  setInspectedSupplier(null);
                  handleOpenPO(s);
                }}
                className="px-5 py-2 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Order From This Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PURCHASE ORDER WITH FULFILLMENT & FEE BREAKDOWN */}
      {selectedProductForPO && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#E0562B]">Digital Purchase Order (PO)</span>
                <h3 className="font-extrabold text-base text-[#16241B]">{selectedProductForPO.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">Supplier: {selectedProductForPO.supplierName}</p>
              </div>
              <button
                onClick={() => setSelectedProductForPO(null)}
                className="text-stone-400 hover:text-stone-700 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPO} className="space-y-4">
              <div className="p-3.5 bg-stone-50 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Wholesale Unit Price:</span>
                  <span className="font-mono font-bold text-stone-900">${selectedProductForPO.wholesaleUnitPriceBND.toFixed(2)} / {selectedProductForPO.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Minimum Order Quantity:</span>
                  <span className="font-mono font-bold text-amber-800">{selectedProductForPO.minOrderQuantity} {selectedProductForPO.unit}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Quantity ({selectedProductForPO.unit})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPoQuantity(q => Math.max(selectedProductForPO.minOrderQuantity, q - 1))}
                    className="w-9 h-9 rounded-xl border border-stone-200 font-extrabold text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-base font-mono font-extrabold text-stone-900 w-12 text-center">
                    {poQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPoQuantity(q => q + 1)}
                    className="w-9 h-9 rounded-xl border border-stone-200 font-extrabold text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Fulfillment Option (Truck vs Depot Self-Pickup) */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Logistics & Fulfillment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPoFulfillment('SUPPLIER_TRUCK_DELIVERY')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      poFulfillment === 'SUPPLIER_TRUCK_DELIVERY'
                        ? 'bg-amber-50/60 border-[#E0562B] text-[#16241B]'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Truck className="w-3.5 h-3.5 text-[#E0562B]" />
                      <span>Supplier Truck</span>
                    </div>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Delivered to kitchen loading bay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoFulfillment('DEPOT_SELF_PICKUP')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      poFulfillment === 'DEPOT_SELF_PICKUP'
                        ? 'bg-amber-50/60 border-[#E0562B] text-[#16241B]'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Store className="w-3.5 h-3.5 text-[#E0562B]" />
                      <span>Depot Self-Pickup</span>
                    </div>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Collect at {selectedProductForPO.supplierDistrict} gate</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Corporate Payment Settlement</label>
                <select
                  value={poPaymentMethod}
                  onChange={e => setPoPaymentMethod(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
                >
                  <option value="BIBD_CORPORATE_TRANSFER">Direct BIBD Corporate Bank Transfer</option>
                  <option value="BAIDURI_TRANSFER">Baiduri Business Pay</option>
                  <option value="NET_14_CREDIT">Net 14 Days Credit Account</option>
                </select>
              </div>

              {/* Total & Transparent Commission Breakdown */}
              <div className="p-3.5 bg-stone-100 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-stone-900 text-sm">
                  <span>PO Wholesale Total:</span>
                  <span className="font-mono">${(selectedProductForPO.wholesaleUnitPriceBND * poQuantity).toFixed(2)} BND</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Platform Clearing Fee ({selectedProductForPO.platformFeePercent ?? 2.0}%):</span>
                  <span className="font-mono">${(((selectedProductForPO.wholesaleUnitPriceBND * poQuantity) * (selectedProductForPO.platformFeePercent ?? 2.0)) / 100).toFixed(2)} BND</span>
                </div>
                <div className="pt-1.5 border-t border-stone-200 flex items-center justify-between text-[10px] text-emerald-800">
                  <span className="font-medium">Restaurant Food Orders:</span>
                  <span className="font-bold">0.0% Commission</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForPO(null)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Confirm & Dispatch PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
