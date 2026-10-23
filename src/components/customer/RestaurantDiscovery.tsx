import React, { useState, useMemo } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../context/AuthContext';
import { Restaurant, OrderingMode } from '../../types';
import { OrderingModeBadge } from '../common/StatusBadge';
import { 
  Star, 
  Clock, 
  Bike, 
  Sparkles, 
  MapPin, 
  SlidersHorizontal, 
  ChevronRight,
  Flame,
  Utensils,
  BookOpen,
  Store,
  UserPlus,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface RestaurantDiscoveryProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const RestaurantDiscovery: React.FC<RestaurantDiscoveryProps> = ({
  onSelectRestaurant,
  searchQuery,
  setSearchQuery,
}) => {
  const { restaurants } = useRestaurants();
  const { config } = usePlatform();
  const { openAuthModal } = useAuth();
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [selectedPrice, setSelectedPrice] = useState<string>('All');
  const [orderingFilter, setOrderingFilter] = useState<'ALL' | OrderingMode>('ALL');

  // Extract all unique cuisines (excluding B2B wholesale)
  const allCuisines = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach(r => {
      if (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY' || r.establishmentType === 'Commercial Supplier' || r.establishmentType === 'Wholesale Depot') {
        return;
      }
      r.cuisineTypes.forEach(c => set.add(c));
    });
    return ['All', ...Array.from(set)];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // Strict Quarantine: Never display wholesale bulk suppliers or B2B-only depots to consumer diners
      if (r.isB2BOnly || r.businessAudience === 'B2B_WHOLESALE_ONLY' || r.establishmentType === 'Commercial Supplier' || r.establishmentType === 'Wholesale Depot') {
        return false;
      }

      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.cuisineTypes.some(c => c.toLowerCase().includes(query)) ||
        r.address.city.toLowerCase().includes(query);

      // Cuisine match
      const matchesCuisine = selectedCuisine === 'All' || r.cuisineTypes.includes(selectedCuisine);

      // Price match
      const matchesPrice = selectedPrice === 'All' || r.priceLevel === selectedPrice;

      // Ordering mode match
      const matchesMode = orderingFilter === 'ALL' || r.orderingMode === orderingFilter;

      return matchesSearch && matchesCuisine && matchesPrice && matchesMode && r.isActive;
    });
  }, [restaurants, searchQuery, selectedCuisine, selectedPrice, orderingFilter]);

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#132218] via-[#1C3224] to-[#2B4B36] text-white p-6 sm:p-10 shadow-lg border border-[#2D3E33]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DE5124]/20 border border-[#DE5124]/40 text-[#FDEEE9] text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#DE5124]" />
            Direct from Verified Kitchens
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Artisanal Dining, <br />
            <span className="text-[#DE5124]">Delivered Fresh.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#C5D5C8] font-normal leading-relaxed max-w-xl">
            Explore curated independent neighborhood restaurants, authentic handmade pastas, 24-hour simmered broths, and wood-fired ovens.
          </p>

          {/* Quick Stats Banner */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-[#E0F2E6]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#247545]"></div>
              <span><strong className="font-bold text-white">{restaurants.length}</strong> Partner Restaurants</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#DE5124]"></div>
              <span>Avg Delivery: <strong className="font-bold text-white">25-35 mins</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C48214]"></div>
              <span><strong className="font-bold text-white">100%</strong> Artisanal Verified</span>
            </div>
          </div>
        </div>

        {/* Decorative graphic background element */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_center,#DE5124,transparent_70%)] hidden md:block"></div>
      </section>

      {/* Cuisine Categories Pills */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#132218] flex items-center gap-2 font-display">
            <Utensils className="w-4 h-4 text-[#DE5124]" />
            Explore by Culinary Tradition
          </h2>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#DE5124] hover:underline font-semibold"
            >
              Clear search &quot;{searchQuery}&quot;
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {allCuisines.map(cuisine => {
            const isSelected = selectedCuisine === cuisine;
            return (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#132218] text-white shadow-xs'
                    : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:border-[#7A8E80] hover:text-[#132218]'
                }`}
              >
                {cuisine}
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter Row: Price Level & Ordering Capability */}
      <section className="bg-white rounded-2xl p-4 border border-[#D9E2D9] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-[#4F6155] flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Price Selector */}
          <div className="flex items-center bg-[#F5F7F4] rounded-lg p-1 border border-[#D9E2D9]">
            {['All', '$', '$$', '$$$', '$$$$'].map(price => (
              <button
                key={price}
                onClick={() => setSelectedPrice(price)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  selectedPrice === price
                    ? 'bg-white text-[#132218] shadow-xs'
                    : 'text-[#7A8E80] hover:text-[#132218]'
                }`}
              >
                {price}
              </button>
            ))}
          </div>

          {/* Ordering Capability Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#7A8E80] ml-2">Access:</span>
            <select
              value={orderingFilter}
              onChange={(e) => setOrderingFilter(e.target.value as any)}
              className="bg-[#F5F7F4] border border-[#D9E2D9] text-xs font-semibold text-[#132218] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#DE5124]"
            >
              <option value="ALL">All Listing Types</option>
              <option value="ENABLED">Ordering Active</option>
              <option value="DIRECTORY_ONLY">Directory Only</option>
              <option value="VIEW_ONLY">View Only</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-medium text-[#7A8E80]">
          Showing <span className="font-bold text-[#132218]">{filteredRestaurants.length}</span> restaurants
        </div>
      </section>

      {/* Restaurant Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map(restaurant => {
          const isGlobalDisabled = !config.globalOrderingEnabled;
          const isStoreDisabled = restaurant.orderingMode !== 'ENABLED';
          const canOrder = !isGlobalDisabled && !isStoreDisabled;

          return (
            <div
              key={restaurant.id}
              onClick={() => onSelectRestaurant(restaurant)}
              className="group bg-white rounded-2xl border border-[#D9E2D9] overflow-hidden hover:shadow-md hover:border-[#B8C7B8] transition-all cursor-pointer flex flex-col"
            >
              {/* Cover Image & Badges */}
              <div className="relative h-48 w-full overflow-hidden bg-[#EDF1EC]">
                <img
                  src={restaurant.coverImageUrl}
                  alt={restaurant.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  <OrderingModeBadge mode={restaurant.orderingMode} />
                  {restaurant.menuBookPages && restaurant.menuBookPages.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/85 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 shadow-xs">
                      <BookOpen className="w-2.5 h-2.5" />
                      <span>Menu Scan ({restaurant.menuBookPages.length}P)</span>
                    </span>
                  )}
                </div>

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                  <Star className="w-3.5 h-3.5 fill-[#C48214] text-[#C48214]" />
                  <span className="text-xs font-bold text-[#132218]">{restaurant.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-[#7A8E80]">({restaurant.reviewCount})</span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#DE5124]" />
                    <span className="truncate">{restaurant.address.city}, {restaurant.address.state}</span>
                  </div>
                  <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {restaurant.priceLevel}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-lg text-[#132218] group-hover:text-[#DE5124] transition-colors leading-snug font-display">
                    {restaurant.name}
                  </h3>
                  <p className="text-xs text-[#4F6155] line-clamp-1 mt-0.5">
                    {restaurant.tagline}
                  </p>

                  {/* Cuisine Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {restaurant.cuisineTypes.slice(0, 3).map(cuisine => (
                      <span
                        key={cuisine}
                        className="px-2 py-0.5 rounded-md bg-[#F5F7F4] text-[#4F6155] text-[11px] font-medium border border-[#D9E2D9]"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Delivery Time & Action */}
                <div className="pt-3 border-t border-[#EDF1EC] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-[#4F6155]">
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#DE5124]" />
                      <span>{restaurant.estimatedDeliveryMin}-{restaurant.estimatedDeliveryMax} min</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <Bike className="w-3.5 h-3.5 text-[#247545]" />
                      <span>${restaurant.deliveryFee.toFixed(2)} delivery</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-[#DE5124] group-hover:translate-x-0.5 transition-transform">
                    {canOrder ? 'Order' : 'View'}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Brunei Ecosystem Onboarding Banner */}
      <div className="mt-12 bg-white rounded-3xl border border-[#D9E2D9] p-6 sm:p-8 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#DE5124] bg-[#FDEEE9] px-3 py-1 rounded-full inline-block mb-2">
            Grow With FOODFINDR Brunei
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-[#132218] font-display">
            Empowering Brunei Food Businesses & Couriers
          </h3>
          <p className="text-xs sm:text-sm text-[#4F6155] mt-1.5">
            Whether you run a local kitchen in Gadong, drive delivery routes across districts, or crave authentic dining, we built this for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Restaurant Merchant Card */}
          <div className="bg-[#F5F7F4] rounded-2xl p-5 border border-[#D9E2D9] flex flex-col justify-between hover:border-[#247545] transition-all group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3EB] text-[#247545] flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#132218] group-hover:text-[#247545] transition-colors">
                Restaurant & Cafe Owners
              </h4>
              <p className="text-xs text-[#4F6155] leading-relaxed">
                Publish your menu on Brunei Yellow Pages, activate table QR codes for dine-in, and manage kitchen KDS with your own staff.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('REGISTER', 'RESTAURANT_OWNER')}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Register Restaurant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Delivery Courier Card */}
          <div className="bg-[#F5F7F4] rounded-2xl p-5 border border-[#D9E2D9] flex flex-col justify-between hover:border-[#2B6E8D] transition-all group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6F0F5] text-[#2B6E8D] flex items-center justify-center font-bold">
                <Bike className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#132218] group-hover:text-[#2B6E8D] transition-colors">
                Delivery Runners
              </h4>
              <p className="text-xs text-[#4F6155] leading-relaxed">
                Deliver food on your motorcycle or car. Choose between platform open pool orders or joining a restaurant&apos;s dedicated in-house fleet.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('REGISTER', 'RUNNER')}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-[#2B6E8D] hover:bg-[#20536B] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Sign Up as Runner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Customer Card */}
          <div className="bg-[#F5F7F4] rounded-2xl p-5 border border-[#D9E2D9] flex flex-col justify-between hover:border-[#DE5124] transition-all group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FDEEE9] text-[#DE5124] flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#132218] group-hover:text-[#DE5124] transition-colors">
                Foodies & Diners
              </h4>
              <p className="text-xs text-[#4F6155] leading-relaxed">
                Save delivery addresses across Brunei, save favorite dishes, track order status in real time, and pay via BIBD / Baiduri or Cash on Delivery.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('REGISTER', 'CUSTOMER')}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Customer Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State if no matches */}
      {filteredRestaurants.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#D9E2D9] p-8">
          <Utensils className="w-12 h-12 text-[#7A8E80] mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-[#132218]">No restaurants matched your filters</h3>
          <p className="text-xs text-[#4F6155] mt-1 max-w-sm mx-auto">
            Try adjusting your search terms, cuisine preferences, or access mode filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCuisine('All');
              setSelectedPrice('All');
              setOrderingFilter('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#DE5124] text-white text-xs font-semibold hover:bg-[#BF3F16] transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};
