import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  ShoppingBag,
  Wrench,
  Clock,
  Check,
  Tag
} from 'lucide-react';
import { WashService } from '../types.js';

interface ServicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: WashService[];
  selectedItems: WashService[];
  onConfirm: (items: WashService[]) => void;
  title?: string;
}

export const ServicePickerModal: React.FC<ServicePickerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  selectedItems,
  onConfirm,
  title = "Select Wash Services, Add-ons & Products"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'service' | 'addon' | 'product'>('all');
  const [tempSelected, setTempSelected] = useState<WashService[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedItems || []);
      setSearchQuery('');
      setActiveTab('all');
    }
  }, [isOpen, selectedItems]);

  if (!isOpen) return null;

  const toggleItem = (item: WashService) => {
    const exists = tempSelected.some((i) => i.id === item.id);
    if (exists) {
      setTempSelected(tempSelected.filter((i) => i.id !== item.id));
    } else {
      setTempSelected([...tempSelected, item]);
    }
  };

  const filteredItems = catalog.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'service') return !item.type || item.type === 'service';
    if (activeTab === 'addon') return item.type === 'addon';
    if (activeTab === 'product') return item.type === 'product';

    return true;
  });

  const totalAmount = tempSelected.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const totalDuration = tempSelected.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);

  const mainServicesCount = catalog.filter((i) => !i.type || i.type === 'service').length;
  const addonsCount = catalog.filter((i) => i.type === 'addon').length;
  const productsCount = catalog.filter((i) => i.type === 'product').length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left">
        
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Tick one or multiple items to combine into this booking
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search services, add-ons or products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-sky-500 shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tab Filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>All Items</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {catalog.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'service'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Main Wash</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'service' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {mainServicesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('addon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'addon'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add-ons</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'addon' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {addonsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('product')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'product'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Products</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'product' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {productsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Catalog Items Grid / List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 touch-pan-y">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No matching items found. Try adjusting your search query.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = tempSelected.some((i) => i.id === item.id);
              const isProduct = item.type === 'product';
              const isAddon = item.type === 'addon';

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-sky-50/80 border-sky-500 shadow-xs ring-1 ring-sky-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Tick Box Icon */}
                  <div className="mt-0.5 shrink-0">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-lg border-2 border-slate-300 bg-white" />
                    )}
                  </div>

                  {/* Content details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          isProduct
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isAddon
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {isProduct ? 'Product' : isAddon ? 'Add-on' : 'Main Wash'}
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {item.name}
                        </h4>
                      </div>

                      <span className="text-xs sm:text-sm font-black text-slate-900 font-mono shrink-0">
                        BND ${(Number(item.price) || 0).toFixed(2)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {item.duration > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Est. Duration: ~{item.duration} mins</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Confirm Button */}
        <div className="shrink-0 p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Selected Items Breakdown ({tempSelected.length})
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                BND ${totalAmount.toFixed(2)}
              </span>
              {totalDuration > 0 && (
                <span className="text-xs font-extrabold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  ~{totalDuration} mins total
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(tempSelected);
                onClose();
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Confirm ({tempSelected.length} Selected)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
