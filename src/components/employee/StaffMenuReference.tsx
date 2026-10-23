import React, { useState } from 'react';
import { Restaurant, MenuItem } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { MenuBookViewerModal } from '../customer/MenuBookViewerModal';
import { 
  BookOpen, 
  Search, 
  Utensils, 
  Sparkles, 
  Clock, 
  Flame, 
  Leaf, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface StaffMenuReferenceProps {
  restaurant: Restaurant;
}

export const StaffMenuReference: React.FC<StaffMenuReferenceProps> = ({ restaurant }) => {
  const { getMenuItemsByRestaurant, getCategoriesByRestaurant } = useRestaurants();
  const [activeTab, setActiveTab] = useState<'DIGITAL_CATALOG' | 'PHYSICAL_BOOKLET'>('DIGITAL_CATALOG');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isBookletModalOpen, setIsBookletModalOpen] = useState(false);

  const menuItems = getMenuItemsByRestaurant(restaurant.id);
  const categories = getCategoriesByRestaurant(restaurant.id);
  const pages = restaurant.menuBookPages || [];

  const filteredItems = menuItems.filter(item => {
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#DE5124]" />
            <h2 className="text-lg font-extrabold text-[#132218] font-display">
              {restaurant.name} • Full Menu Reference
            </h2>
          </div>
          <p className="text-xs text-[#4F6155] mt-0.5">
            Reference dishes, ingredients, dietary notes, and physical scanned menu booklet pages
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
          <button
            onClick={() => setActiveTab('DIGITAL_CATALOG')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'DIGITAL_CATALOG'
                ? 'bg-[#132218] text-white shadow-2xs'
                : 'text-[#4F6155] hover:text-[#132218]'
            }`}
          >
            Digital Catalog ({menuItems.length} Dishes)
          </button>
          <button
            onClick={() => setActiveTab('PHYSICAL_BOOKLET')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PHYSICAL_BOOKLET'
                ? 'bg-[#132218] text-white shadow-2xs'
                : 'text-[#4F6155] hover:text-[#132218]'
            }`}
          >
            Scanned Menu Booklet ({pages.length} Pages)
          </button>
        </div>
      </div>

      {activeTab === 'DIGITAL_CATALOG' ? (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B8E81]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search dish name, ingredients, or allergens..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl focus:bg-white focus:border-[#DE5124] focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#132218] text-white'
                      : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                  }`}
                >
                  All ({menuItems.length})
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-[#132218] text-white'
                        : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-[#D9E2D9] p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#E0E7E1] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#F5F7F4] flex items-center justify-center text-[#7B8E81] shrink-0">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#132218] leading-tight truncate">
                        {item.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.isAvailable ? 'bg-[#E0F2E6] text-[#247545]' : 'bg-[#FDEEE9] text-[#DE5124]'
                      }`}>
                        {item.isAvailable ? 'In Stock' : '86ed'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#4F6155] line-clamp-2 mt-1">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono font-black text-sm text-[#132218]">
                        ${item.basePrice.toFixed(2)}
                      </span>
                      {item.preparationTimeMinutes && (
                        <span className="text-[10px] text-[#7B8E81] flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {item.preparationTimeMinutes}m prep
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dietary Tags */}
                <div className="pt-2 border-t border-[#EDF1EC] flex flex-wrap items-center gap-1.5">
                  {item.isVegetarian && (
                    <span className="px-2 py-0.5 rounded-md bg-[#E0F2E6] text-[#247545] text-[10px] font-bold flex items-center gap-0.5">
                      <Leaf className="w-2.5 h-2.5" /> Vegetarian
                    </span>
                  )}
                  {item.isSpicy && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FDEEE9] text-[#DE5124] text-[10px] font-bold flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> Spicy
                    </span>
                  )}
                  {item.isPopular && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FFF9E6] text-[#8C6207] text-[10px] font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Popular
                    </span>
                  )}
                  {item.addonGroups && item.addonGroups.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F5F7F4] text-[#4F6155] text-[10px] font-bold">
                      {item.addonGroups.length} addon group(s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* PHYSICAL MENU BOOKLET SCANS TAB */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D9] shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#132218] font-display">
                Physical Printed Menu Booklet ({pages.length} Pages)
              </h3>
              <p className="text-xs text-[#4F6155] mt-0.5">
                Scanned high-resolution pages of the restaurant&apos;s physical menu. Tap any page to open full-screen zoom.
              </p>
            </div>

            {pages.length > 0 && (
              <button
                onClick={() => setIsBookletModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Fullscreen Reader</span>
              </button>
            )}
          </div>

          {pages.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-[#D9E2D9] space-y-3">
              <BookOpen className="w-12 h-12 text-[#C5D5C8] mx-auto" />
              <h4 className="text-base font-bold text-[#132218]">No Physical Menu Pages Uploaded</h4>
              <p className="text-xs text-[#4F6155] max-w-sm mx-auto">
                The restaurant owner has not yet uploaded physical printed menu scans for this restaurant.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  onClick={() => setIsBookletModalOpen(true)}
                  className="bg-white rounded-3xl border border-[#D9E2D9] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  <div className="aspect-3/4 bg-[#132218] relative overflow-hidden flex items-center justify-center">
                    <img
                      src={page.imageUrl}
                      alt={page.title || `Menu Page ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-xl bg-white text-[#132218] text-xs font-bold flex items-center gap-1 shadow-md">
                        <Maximize2 className="w-3.5 h-3.5 text-[#DE5124]" />
                        <span>Zoom Page</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white flex items-center justify-between border-t border-[#EDF1EC]">
                    <div>
                      <span className="text-xs font-bold text-[#132218] block leading-tight">
                        {page.title || `Page ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-[#7B8E81]">
                        Page {idx + 1} of {pages.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu Book Viewer Modal */}
      {isBookletModalOpen && (
        <MenuBookViewerModal
          isOpen={isBookletModalOpen}
          onClose={() => setIsBookletModalOpen(false)}
          restaurant={restaurant}
        />
      )}
    </div>
  );
};
