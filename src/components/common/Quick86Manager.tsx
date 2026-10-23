import React, { useState } from 'react';
import { Restaurant, MenuItem } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { 
  AlertOctagon, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  UtensilsCrossed, 
  Sparkles,
  RefreshCw,
  Clock
} from 'lucide-react';

interface Quick86ManagerProps {
  restaurant: Restaurant;
  userRole?: 'RESTAURANT_OWNER' | 'EMPLOYEE';
}

export const Quick86Manager: React.FC<Quick86ManagerProps> = ({ 
  restaurant,
  userRole = 'EMPLOYEE'
}) => {
  const { menuItems, categories, updateMenuItem } = useRestaurants();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'SOLD_OUT' | 'AVAILABLE'>('ALL');

  const restaurantItems = menuItems.filter(item => item.restaurantId === restaurant.id);
  const soldOutItems = restaurantItems.filter(item => !item.isAvailable);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'General';
  };

  const filteredItems = restaurantItems.filter(item => {
    if (filter === 'SOLD_OUT' && item.isAvailable) return false;
    if (filter === 'AVAILABLE' && !item.isAvailable) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const catName = getCategoryName(item.categoryId).toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        catName.includes(q)
      );
    }
    return true;
  });

  const handleToggleAvailability = (item: MenuItem) => {
    updateMenuItem(item.id, { isAvailable: !item.isAvailable });
  };

  const handleResetAllToAvailable = () => {
    if (!confirm('Mark ALL dishes as In-Stock and available?')) return;
    soldOutItems.forEach(item => {
      updateMenuItem(item.id, { isAvailable: true });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-base text-[#132218] font-display">
              Rush-Hour "86" Sold Out & Stock Master Switch
            </h3>
          </div>
          <p className="text-xs text-[#4F6155] max-w-2xl leading-relaxed">
            Quickly toggle dishes when ingredients run out during dinner rush. Sold-out dishes immediately reflect across customer digital menus, Yellow Pages, and POS terminals to prevent unfulfillable orders.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {soldOutItems.length > 0 && (
            <button
              onClick={handleResetAllToAvailable}
              className="px-3.5 py-2 bg-[#F5F7F4] hover:bg-[#EAEFEA] text-[#132218] border border-[#D9E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#247545]" />
              <span>Restore All Dishes (Reset)</span>
            </button>
          )}

          <div className="bg-red-50 border border-red-200 px-4 py-2.5 rounded-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-bold text-red-700">
              {soldOutItems.length} Item{soldOutItems.length !== 1 ? 's' : ''} 86'd (Sold Out)
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#D9E2D9] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#4F6155] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dish by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl text-xs text-[#132218] focus:outline-none focus:border-[#247545]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'ALL'
                ? 'bg-[#132218] text-white'
                : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
            }`}
          >
            All Items ({restaurantItems.length})
          </button>
          <button
            onClick={() => setFilter('SOLD_OUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'SOLD_OUT'
                ? 'bg-red-600 text-white'
                : 'bg-[#F5F7F4] text-red-600 hover:bg-red-50'
            }`}
          >
            Sold Out ({soldOutItems.length})
          </button>
          <button
            onClick={() => setFilter('AVAILABLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === 'AVAILABLE'
                ? 'bg-[#247545] text-white'
                : 'bg-[#F5F7F4] text-[#247545] hover:bg-green-50'
            }`}
          >
            In Stock ({restaurantItems.length - soldOutItems.length})
          </button>
        </div>
      </div>

      {/* Grid of Dishes with Quick 1-Tap Switch */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isAvailable = item.isAvailable;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isAvailable
                  ? 'bg-white border-[#D9E2D9] hover:border-[#247545]/40 shadow-xs'
                  : 'bg-red-50/40 border-red-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className={`w-12 h-12 rounded-xl object-cover shrink-0 border border-[#D9E2D9] ${
                    !isAvailable ? 'grayscale opacity-60' : ''
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#4F6155] px-1.5 py-0.5 bg-[#F5F7F4] rounded-md">
                      {getCategoryName(item.categoryId)}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#132218]">
                      ${item.basePrice.toFixed(2)}
                    </span>
                  </div>
                  <h4 className={`font-bold text-xs truncate mt-0.5 ${!isAvailable ? 'line-through text-[#4F6155]' : 'text-[#132218]'}`}>
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-[#4F6155] truncate max-w-[180px]">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* 1-Tap Quick 86 Switch */}
              <button
                onClick={() => handleToggleAvailability(item)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs ${
                  isAvailable
                    ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                    : 'bg-[#247545] hover:bg-[#1C5D37] text-white shadow-xs'
                }`}
                title={isAvailable ? 'Mark as 86 / Sold Out' : 'Mark as Available / In Stock'}
              >
                {isAvailable ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>86 / Out</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>In Stock</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
