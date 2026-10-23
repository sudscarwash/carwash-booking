import React, { useState } from 'react';
import { CommercialSupplier, B2BCategory } from '../../types';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Percent, 
  Layers, 
  Compass, 
  AlertCircle,
  ExternalLink,
  Lock,
  Search
} from 'lucide-react';

export const INITIAL_COMMERCIAL_SUPPLIERS: CommercialSupplier[] = [
  {
    id: 'supp_pds',
    businessName: 'PDS Abattoir Sdn Bhd',
    rocbnNumber: 'RC/00004921',
    halalCertNumber: 'MUIB/HALAL/B2B-0492',
    category: 'POULTRY_MEAT',
    contactPerson: 'Hj. Rosli bin Damit',
    phone: '+673 244 8912',
    email: 'wholesale@pds.com.bn',
    depotAddress: {
      addressLine: 'Tapak Perindustrian Beribi II, Phase 2, Lot 14',
      simpang: 'Simpang 88',
      kampong: 'Kg. Beribi',
      mukim: 'Mukim Gadong B',
      district: 'Brunei-Muara',
      landmark: 'Opposite TelBru Sub-station, blue cold storage warehouse',
      coordinates: { lat: 4.8872, lng: 114.9084 },
    },
    deliveryCoverageDistricts: ['Brunei-Muara', 'Tutong', 'Belait'],
    deliveryScheduleNote: 'Daily morning delivery (6:00 AM - 10:00 AM) for Brunei-Muara & Tutong. Tue & Fri for Belait.',
    offersSelfPickup: true,
    offersSupplierTruck: true,
    minOrderAmountBND: 100.00,
    deliveryFeeBND: 0.00,
    platformFeePercent: 2.0,
    feePayer: 'SUPPLIER_DEDUCTION',
    bankAccount: {
      bankName: 'BIBD',
      accountName: 'PDS Abattoir Sdn Bhd',
      accountNumber: '00-001-01-9082341',
    },
    isQuarantinedFromPublicYellowPages: true,
    targetAudience: 'B2B_RESTAURANTS_ONLY',
    isVerified: true,
    createdAt: '2026-08-15',
  },
  {
    id: 'supp_melati',
    businessName: 'Seri Melati Grains & Rice Trading',
    rocbnNumber: 'RC/00008819',
    halalCertNumber: 'MUIB/HALAL/B2B-0118',
    category: 'DRY_GOODS_RICE',
    contactPerson: 'Cynthia Tan',
    phone: '+673 277 3410',
    email: 'orders@serimelati.bn',
    depotAddress: {
      addressLine: 'Salambigar Industrial Park, Block C, Warehouse 4',
      simpang: 'Jalan Salambigar',
      kampong: 'Kg. Salambigar',
      mukim: 'Mukim Berakas B',
      district: 'Brunei-Muara',
      landmark: 'Next to Brunei Food Industry Hub',
      coordinates: { lat: 4.9542, lng: 114.9812 },
    },
    deliveryCoverageDistricts: ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'],
    deliveryScheduleNote: 'Nationwide truck delivery across all 4 districts on scheduled weekdays.',
    offersSelfPickup: true,
    offersSupplierTruck: true,
    minOrderAmountBND: 150.00,
    deliveryFeeBND: 0.00,
    platformFeePercent: 1.5,
    feePayer: 'SUPPLIER_DEDUCTION',
    bankAccount: {
      bankName: 'BAIDURI',
      accountName: 'Seri Melati Grains Trading',
      accountNumber: '02-00-110-8842109',
    },
    isQuarantinedFromPublicYellowPages: true,
    targetAudience: 'B2B_RESTAURANTS_ONLY',
    isVerified: true,
    createdAt: '2026-08-20',
  },
  {
    id: 'supp_ecopack',
    businessName: 'Brunei EcoPack Packaging Distributor',
    rocbnNumber: 'RC/00010452',
    halalCertNumber: 'SIRIM-ECO/BN-2024',
    category: 'PACKAGING',
    contactPerson: 'Ahmad Faiz',
    phone: '+673 333 4890',
    email: 'sales@ecopack.bn',
    depotAddress: {
      addressLine: 'Kuala Belait Light Industrial Area, Lot 89',
      simpang: 'Simpang 22',
      kampong: 'Pekan Kuala Belait',
      mukim: 'Mukim Kuala Belait',
      district: 'Belait',
      landmark: 'Near Belait Municipal Yard',
      coordinates: { lat: 4.5821, lng: 114.2312 },
    },
    deliveryCoverageDistricts: ['Belait', 'Tutong', 'Brunei-Muara'],
    deliveryScheduleNote: 'Belait daily; Tutong & Bandar on Mondays and Wednesdays.',
    offersSelfPickup: true,
    offersSupplierTruck: true,
    minOrderAmountBND: 80.00,
    deliveryFeeBND: 5.00,
    platformFeePercent: 2.0,
    feePayer: 'SUPPLIER_DEDUCTION',
    bankAccount: {
      bankName: 'BIBD',
      accountName: 'Brunei EcoPack Enterprise',
      accountNumber: '00-015-01-3341908',
    },
    isQuarantinedFromPublicYellowPages: true,
    targetAudience: 'B2B_RESTAURANTS_ONLY',
    isVerified: true,
    createdAt: '2026-09-01',
  },
];

export const CommercialSupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<CommercialSupplier[]>(INITIAL_COMMERCIAL_SUPPLIERS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [rocbnNumber, setRocbnNumber] = useState('');
  const [halalCertNumber, setHalalCertNumber] = useState('');
  const [category, setCategory] = useState<B2BCategory | 'GENERAL_DISTRIBUTOR'>('POULTRY_MEAT');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Location & Depot State
  const [district, setDistrict] = useState('Brunei-Muara');
  const [addressLine, setAddressLine] = useState('');
  const [simpang, setSimpang] = useState('');
  const [kampong, setKampong] = useState('');
  const [landmark, setLandmark] = useState('');
  const [lat, setLat] = useState(4.8872);
  const [lng, setLng] = useState(114.9084);

  // Delivery & Schedule State
  const [coverageDistricts, setCoverageDistricts] = useState<string[]>(['Brunei-Muara', 'Tutong']);
  const [deliveryScheduleNote, setDeliveryScheduleNote] = useState('Daily morning distribution (6:00 AM - 10:00 AM)');
  const [offersSelfPickup, setOffersSelfPickup] = useState(true);
  const [offersSupplierTruck, setOffersSupplierTruck] = useState(true);
  const [minOrderAmountBND, setMinOrderAmountBND] = useState(100);

  // Transaction Fee & Banking State
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(2.0);
  const [feePayer, setFeePayer] = useState<'SUPPLIER_DEDUCTION' | 'BUYER_SURCHARGE' | 'WAIVED'>('SUPPLIER_DEDUCTION');
  const [bankName, setBankName] = useState<'BIBD' | 'BAIDURI'>('BIBD');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Quick preset helper for Brunei Industrial hubs
  const handleLocationPreset = (preset: 'BERIBI' | 'SALAMBIGAR' | 'BELOIS' | 'KUALA_BELAIT') => {
    if (preset === 'BERIBI') {
      setDistrict('Brunei-Muara');
      setKampong('Kg. Beribi');
      setAddressLine('Tapak Perindustrian Beribi II');
      setLat(4.8872);
      setLng(114.9084);
    } else if (preset === 'SALAMBIGAR') {
      setDistrict('Brunei-Muara');
      setKampong('Kg. Salambigar');
      setAddressLine('Salambigar Industrial Park');
      setLat(4.9542);
      setLng(114.9812);
    } else if (preset === 'KUALA_BELAIT') {
      setDistrict('Belait');
      setKampong('Pekan Kuala Belait');
      setAddressLine('Kuala Belait Light Industrial Zone');
      setLat(4.5821);
      setLng(114.2312);
    } else if (preset === 'BELOIS') {
      setDistrict('Tutong');
      setKampong('Kg. Bukit Beruang');
      setAddressLine('Jalan Bukit Beruang Depot');
      setLat(4.7214);
      setLng(114.6120);
    }
  };

  const handleToggleCoverageDistrict = (d: string) => {
    if (coverageDistricts.includes(d)) {
      if (coverageDistricts.length > 1) {
        setCoverageDistricts(coverageDistricts.filter(item => item !== d));
      }
    } else {
      setCoverageDistricts([...coverageDistricts, d]);
    }
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !rocbnNumber.trim()) return;

    const newSupplier: CommercialSupplier = {
      id: `supp_${Date.now()}`,
      businessName: businessName.trim(),
      rocbnNumber: rocbnNumber.trim(),
      halalCertNumber: halalCertNumber.trim() || 'MUIB/HALAL/PENDING',
      category,
      contactPerson: contactPerson.trim() || 'Operations Manager',
      phone: phone.trim() || '+673 222 1234',
      email: email.trim() || 'wholesale@supplier.bn',
      depotAddress: {
        addressLine: addressLine.trim() || 'Industrial Complex',
        simpang: simpang.trim() || undefined,
        kampong: kampong.trim() || 'Kg. Beribi',
        district,
        landmark: landmark.trim() || undefined,
        coordinates: { lat, lng },
      },
      deliveryCoverageDistricts: coverageDistricts,
      deliveryScheduleNote: deliveryScheduleNote.trim(),
      offersSelfPickup,
      offersSupplierTruck,
      minOrderAmountBND,
      deliveryFeeBND: 0.00,
      platformFeePercent,
      feePayer,
      bankAccount: {
        bankName,
        accountName: accountName.trim() || businessName.trim(),
        accountNumber: accountNumber.trim() || '00-001-01-0000000',
      },
      isQuarantinedFromPublicYellowPages: true,
      targetAudience: 'B2B_RESTAURANTS_ONLY',
      isVerified: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setSuppliers([newSupplier, ...suppliers]);
    setShowAddForm(false);
    setSuccessMsg(`Commercial Supplier "${newSupplier.businessName}" onboarded & verified successfully!`);
    setTimeout(() => setSuccessMsg(null), 5000);

    // Reset Form
    setBusinessName('');
    setRocbnNumber('');
    setHalalCertNumber('');
    setAddressLine('');
    setAccountName('');
    setAccountNumber('');
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.depotAddress.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-[#16241B] text-white p-6 rounded-3xl border border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold font-display">Commercial Supplier Network (Phase 6B)</h2>
            <span className="bg-[#E0562B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Ops Control
            </span>
          </div>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl">
            Onboard, map warehouse depot coordinates, configure delivery district schedules, and govern transaction fee % for bulk food & beverage distributors in Brunei.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Close Onboarding Form' : 'Onboard New Supplier'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ONBOARDING MODAL / ACCORDION */}
      {showAddForm && (
        <form onSubmit={handleAddSupplier} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-extrabold text-[#16241B]">Onboard Commercial B2B Supplier</h3>
              <p className="text-xs text-stone-500">Register bulk food/drink distributors, abattoirs, flour mills, or packaging wholesalers.</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              MUIB Halal & ROCBN Mandatory
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Legal Entity & Compliance */}
            <div className="p-4 bg-stone-50 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2F7A4F]" />
                1. Legal Entity & Halal
              </h4>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Company Registered Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golden Chicks Poultry Sdn Bhd"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:ring-2 focus:ring-[#E0562B]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">ROCBN Section 16/17 No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RC/00009842"
                  value={rocbnNumber}
                  onChange={e => setRocbnNumber(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:ring-2 focus:ring-[#E0562B]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">MUIB Halal Supply Cert No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MUIB/HALAL/B2B-0984"
                  value={halalCertNumber}
                  onChange={e => setHalalCertNumber(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:ring-2 focus:ring-[#E0562B]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Supply Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900 focus:ring-2 focus:ring-[#E0562B]"
                >
                  <option value="POULTRY_MEAT">Poultry & Fresh Meats</option>
                  <option value="DRY_GOODS_RICE">Rice, Flour & Dry Staples</option>
                  <option value="SAUCES_CONDIMENTS">Sauces, Pastes & Spices</option>
                  <option value="PACKAGING">Takeaway Packaging & Boxes</option>
                  <option value="BEVERAGE_BEANS">Coffee Beans & Syrups</option>
                  <option value="GENERAL_DISTRIBUTOR">General Food Distributor</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Pg. Azlan"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+673 888 1234"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Warehouse Location & Mapping Coordinates */}
            <div className="p-4 bg-stone-50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#E0562B]" />
                  2. Warehouse Depot & Map
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleLocationPreset('BERIBI')}
                    className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 hover:bg-stone-100"
                  >
                    Beribi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationPreset('SALAMBIGAR')}
                    className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 hover:bg-stone-100"
                  >
                    Salambigar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationPreset('KUALA_BELAIT')}
                    className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded border border-stone-200 hover:bg-stone-100"
                  >
                    KB
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">District</label>
                  <select
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                  >
                    <option value="Brunei-Muara">Brunei-Muara</option>
                    <option value="Tutong">Tutong</option>
                    <option value="Belait">Belait</option>
                    <option value="Temburong">Temburong</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Kampong / Mukim</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kg. Beribi"
                    value={kampong}
                    onChange={e => setKampong(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Depot Address / Unit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tapak Perindustrian Beribi II, Lot 24"
                  value={addressLine}
                  onChange={e => setAddressLine(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Landmark / Simpang Cue</label>
                <input
                  type="text"
                  placeholder="e.g. Simpang 88, near cold storage gate"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              {/* GPS Coordinates Visualizer */}
              <div className="p-2.5 bg-white border border-stone-200 rounded-xl space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-semibold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-[#2C6E8E]" />
                    Map Coordinates:
                  </span>
                  <span className="font-mono text-stone-800">{lat.toFixed(4)}° N, {lng.toFixed(4)}° E</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={e => setLat(+e.target.value)}
                    className="bg-stone-50 px-2 py-1 rounded text-[10px] font-mono border border-stone-200"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={e => setLng(+e.target.value)}
                    className="bg-stone-50 px-2 py-1 rounded text-[10px] font-mono border border-stone-200"
                    placeholder="Longitude"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Delivery Coverage, Schedule & Fees */}
            <div className="p-4 bg-stone-50 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#16241B] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#2C6E8E]" />
                3. Logistics, Schedule & Fee %
              </h4>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Truck Delivery Coverage Districts</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'].map(d => (
                    <label key={d} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-stone-200 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={coverageDistricts.includes(d)}
                        onChange={() => handleToggleCoverageDistrict(d)}
                        className="rounded text-[#E0562B] focus:ring-[#E0562B]"
                      />
                      <span className="text-[11px] font-semibold">{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Truck Delivery Schedule Note</label>
                <input
                  type="text"
                  value={deliveryScheduleNote}
                  onChange={e => setDeliveryScheduleNote(e.target.value)}
                  placeholder="e.g. Daily morning runs; Tue/Thu for Belait"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                />
              </div>

              {/* Platform Fee % Setup */}
              <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#16241B] flex items-center gap-1">
                    <Percent className="w-3 h-3 text-[#E0562B]" />
                    Platform Facilitation Fee %
                  </label>
                  <span className="font-mono font-black text-xs text-[#E0562B]">{platformFeePercent.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: '0% Promo', val: 0.0 },
                    { label: '1.5% Bulk', val: 1.5 },
                    { label: '2.0% Standard', val: 2.0 },
                    { label: '2.5%', val: 2.5 },
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setPlatformFeePercent(preset.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        platformFeePercent === preset.val
                          ? 'bg-[#E0562B] text-white border-[#E0562B]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-stone-500">
                  {platformFeePercent === 0 ? 'Zero platform fee applied (Free cold-start onboarding promo).' : `Platform retains ${platformFeePercent}% on each digital PO.`}
                </p>
              </div>

              {/* Banking Details */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Settlement Bank</label>
                    <select
                      value={bankName}
                      onChange={e => setBankName(e.target.value as any)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-2 py-1.5 text-xs text-stone-900"
                    >
                      <option value="BIBD">BIBD</option>
                      <option value="BAIDURI">Baiduri Bank</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Account Number</label>
                    <input
                      type="text"
                      placeholder="00-001-01-XXXXXXX"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-2 py-1.5 text-xs font-mono text-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#E0562B] hover:bg-[#C9471E] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Verify & Activate Supplier
            </button>
          </div>
        </form>
      )}

      {/* SEARCH AND SUPPLIERS LIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#16241B]">Active Commercial Suppliers ({filteredSuppliers.length})</h3>
            <span className="text-xs text-stone-500">• Ready for restaurant purchase orders</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by company or district..."
              className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#E0562B]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
            <div
              key={supplier.id}
              className="bg-white rounded-3xl p-5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {supplier.category.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                </div>

                {/* Strict Quarantine Badge */}
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-1.5 text-[10px] text-amber-900 font-bold">
                  <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>🔒 Quarantined from Yellow Pages • Private B2B Hub Only</span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-[#16241B]">{supplier.businessName}</h4>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">ROCBN: {supplier.rocbnNumber}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Halal: {supplier.halalCertNumber}</p>
                </div>

                {/* Warehouse Location & Mapping Info */}
                <div className="p-3 bg-stone-50 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-[#E0562B] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#16241B] block">{supplier.depotAddress.addressLine}</strong>
                      <span className="text-[11px] text-stone-500">
                        {supplier.depotAddress.kampong}, {supplier.depotAddress.district}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3 text-[#2C6E8E]" />
                      Coordinates:
                    </span>
                    <span className="font-mono text-stone-800">
                      {supplier.depotAddress.coordinates.lat.toFixed(4)}, {supplier.depotAddress.coordinates.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Coverage and Fee Badges */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Truck Coverage:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[170px]">
                      {supplier.deliveryCoverageDistricts.map(d => (
                        <span key={d} className="text-[9px] font-bold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span>Schedule:</span>
                    <span className="text-[10px] text-stone-700 truncate max-w-[150px]">{supplier.deliveryScheduleNote}</span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600 pt-1">
                    <span>Platform Fee:</span>
                    <span className="font-mono font-bold text-[#E0562B]">{supplier.platformFeePercent}%</span>
                  </div>
                </div>
              </div>

              {/* Settlement Bank Footer */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-stone-800">{supplier.bankAccount.bankName}</span>
                  <span className="font-mono">{supplier.bankAccount.accountNumber}</span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
