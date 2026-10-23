import React, { useState } from 'react';
import { Restaurant, MenuItem, MenuCategory, AddonGroup, AddonOption } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { compressImageFile } from '../../utils/imageCompressor';
import { MenuBookManager } from './MenuBookManager';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Flame, 
  Leaf, 
  WheatOff, 
  Sparkles, 
  DollarSign, 
  Tag, 
  Upload, 
  Image as ImageIcon,
  BookOpen,
  UtensilsCrossed,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface MenuManagerProps {
  restaurant: Restaurant;
}

export const MenuManager: React.FC<MenuManagerProps> = ({ restaurant }) => {
  const { 
    getMenuItemsByRestaurant, 
    getCategoriesByRestaurant, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem,
    addCategory 
  } = useRestaurants();

  const [activeCatalogView, setActiveCatalogView] = useState<'dishes' | 'booklet'>('dishes');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Form State for new/edited item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('18.50');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedKb, setCompressedKb] = useState<number | null>(null);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      // Compress to high-quality thumbnail (max 640px, ~30-50KB)
      const res = await compressImageFile(file, { maxWidth: 640, maxHeight: 640, quality: 0.78 });
      setImageUrl(res.base64);
      setCompressedKb(res.sizeInKb);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Unable to compress image. Please try a different photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const categories = getCategoriesByRestaurant(restaurant?.id || '');
  const items = getMenuItemsByRestaurant(restaurant?.id || '');
  const menuPagesCount = restaurant?.menuBookPages?.length || 0;

  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter(i => i.categoryId === activeCategory);

  const handleOpenAdd = () => {
    setEditingItemId(null);
    setName('');
    setDescription('');
    setBasePrice('18.00');
    setCategoryId(categories[0]?.id || '');
    setImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80');
    setIsVegetarian(false);
    setIsGlutenFree(false);
    setIsSpicy(false);
    setIsPopular(false);
    setAddonGroups([]);
    setIsAddingItem(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setName(item.name);
    setDescription(item.description);
    setBasePrice(item.basePrice.toString());
    setCategoryId(item.categoryId);
    setImageUrl(item.imageUrl);
    setIsVegetarian(!!item.isVegetarian);
    setIsGlutenFree(!!item.isGlutenFree);
    setIsSpicy(!!item.isSpicy);
    setIsPopular(!!item.isPopular);
    setAddonGroups(item.addonGroups ? JSON.parse(JSON.stringify(item.addonGroups)) : []);
    setIsAddingItem(true);
  };

  // Add-on Group Management Helpers
  const handleAddAddonGroup = () => {
    const newGroup: AddonGroup = {
      id: `grp_${Math.random().toString(36).substring(2, 9)}`,
      name: 'Choice of Rice / Base',
      isRequired: true,
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Fragrant White Rice', priceDelta: 0, isAvailable: true },
        { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Upgrade to Fried Rice', priceDelta: 1.50, isAvailable: true },
      ]
    };
    setAddonGroups(prev => [...prev, newGroup]);
  };

  const handleAddPresetGroup = (presetType: 'RICE' | 'SIDES' | 'PREFERENCES' | 'DRINK') => {
    let preset: AddonGroup;
    if (presetType === 'RICE') {
      preset = {
        id: `grp_${Math.random().toString(36).substring(2, 9)}`,
        name: 'Rice / Base Selection',
        isRequired: true,
        minSelection: 1,
        maxSelection: 1,
        options: [
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Normal White Rice', priceDelta: 0, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Egg Fried Rice', priceDelta: 1.50, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Nasi Lemak Pandan', priceDelta: 1.20, isAvailable: true },
        ]
      };
    } else if (presetType === 'SIDES') {
      preset = {
        id: `grp_${Math.random().toString(36).substring(2, 9)}`,
        name: 'Add Extra Sides & Toppings',
        isRequired: false,
        minSelection: 0,
        maxSelection: 4,
        options: [
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Add Crispy French Fries', priceDelta: 2.00, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Add Sunny Side Egg (Telur Mata)', priceDelta: 1.00, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Extra Sambal Portion', priceDelta: 0.80, isAvailable: true },
        ]
      };
    } else if (presetType === 'PREFERENCES') {
      preset = {
        id: `grp_${Math.random().toString(36).substring(2, 9)}`,
        name: 'Kitchen Preparation & Preferences',
        isRequired: false,
        minSelection: 0,
        maxSelection: 3,
        options: [
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'No Mayonnaise', priceDelta: 0, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'No Spring Onion / Coriander', priceDelta: 0, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Chili / Sauce On The Side', priceDelta: 0, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Kurang Manis (Less Sweet)', priceDelta: 0, isAvailable: true },
        ]
      };
    } else {
      preset = {
        id: `grp_${Math.random().toString(36).substring(2, 9)}`,
        name: 'Add Refreshing Beverage',
        isRequired: false,
        minSelection: 0,
        maxSelection: 1,
        options: [
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Iced Lemon Tea', priceDelta: 1.80, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Teh Tarik Kaw', priceDelta: 1.50, isAvailable: true },
          { id: `opt_${Math.random().toString(36).substring(2, 9)}`, name: 'Fresh Coconut Water', priceDelta: 3.00, isAvailable: true },
        ]
      };
    }
    setAddonGroups(prev => [...prev, preset]);
  };

  const handleUpdateGroup = (groupId: string, data: Partial<AddonGroup>) => {
    setAddonGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...data } : g));
  };

  const handleDeleteGroup = (groupId: string) => {
    setAddonGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleAddOptionToGroup = (groupId: string) => {
    const newOpt: AddonOption = {
      id: `opt_${Math.random().toString(36).substring(2, 9)}`,
      name: 'New Option',
      priceDelta: 0,
      isAvailable: true
    };
    setAddonGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, options: [...g.options, newOpt] };
    }));
  };

  const handleUpdateOption = (groupId: string, optionId: string, data: Partial<AddonOption>) => {
    setAddonGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        options: g.options.map(o => o.id === optionId ? { ...o, ...data } : o)
      };
    }));
  };

  const handleDeleteOption = (groupId: string, optionId: string) => {
    setAddonGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        options: g.options.filter(o => o.id !== optionId)
      };
    }));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId) return;

    if (editingItemId) {
      updateMenuItem(editingItemId, {
        name,
        description,
        basePrice: parseFloat(basePrice),
        categoryId,
        imageUrl,
        isVegetarian,
        isGlutenFree,
        isSpicy,
        isPopular,
        addonGroups: addonGroups.length > 0 ? addonGroups : undefined,
      });
    } else {
      addMenuItem({
        restaurantId: restaurant.id,
        categoryId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        imageUrl,
        isAvailable: true,
        isVegetarian,
        isGlutenFree,
        isSpicy,
        isPopular,
        addonGroups: addonGroups.length > 0 ? addonGroups : undefined,
        preparationTimeMinutes: 15,
        sortOrder: items.length + 1,
      });
    }

    setIsAddingItem(false);
    setEditingItemId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      addCategory(restaurant.id, newCatName.trim());
      setNewCatName('');
      setIsAddingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Level Mode Selector: Itemized Online Dishes vs Physical Menu Booklet */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE3DD] pb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#16241B] font-display">
            Restaurant Menu Management
          </h2>
          <p className="text-xs text-[#526056]">
            Configure both individual digital orderable items and full-page physical printed menu scans
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD]">
          <button
            onClick={() => setActiveCatalogView('dishes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCatalogView === 'dishes'
                ? 'bg-[#16241B] text-white shadow-xs'
                : 'text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Digital Dishes ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveCatalogView('booklet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCatalogView === 'booklet'
                ? 'bg-[#2F7A4F] text-white shadow-xs'
                : 'text-[#526056] hover:text-[#16241B]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Printed Menu Booklet ({menuPagesCount} Pages)</span>
            {menuPagesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* If Booklet view is selected */}
      {activeCatalogView === 'booklet' ? (
        <MenuBookManager restaurant={restaurant} />
      ) : (
        /* Dishes Catalog View */
        <div className="space-y-6">
          {/* Header and Add Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#16241B] font-display">Individual Dish Catalog & Pricing</h3>
              <p className="text-xs text-[#526056]">Manage item descriptions, real-time availability, add-ons, and pricing</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddingCategory(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#DCE3DD] text-[#16241B] text-xs font-bold hover:bg-[#F6F7F5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Tag className="w-3.5 h-3.5 text-[#2F7A4F]" />
                <span>New Category</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-[#E0562B] text-white text-xs font-bold hover:bg-[#B5431E] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Menu Dish</span>
              </button>
            </div>
          </div>

          {/* Category Modal / Popover */}
          {isAddingCategory && (
            <form onSubmit={handleCreateCategory} className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] flex items-center gap-3">
              <input
                type="text"
                required
                placeholder="Category Name (e.g., Wood-Fired Mains, Seasonal Desserts)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2F7A4F] text-white text-xs font-bold hover:bg-[#235D3B] transition-colors"
              >
                Save Category
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-3 py-2 rounded-xl text-[#526056] hover:text-[#16241B] text-xs"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Categories Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-[#16241B] text-white'
                  : 'bg-white border border-[#DCE3DD] text-[#526056] hover:text-[#16241B]'
              }`}
            >
              All Items ({items.length})
            </button>

            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#16241B] text-white'
                    : 'bg-white border border-[#DCE3DD] text-[#526056] hover:text-[#16241B]'
                }`}
              >
                {cat.name} ({items.filter(i => i.categoryId === cat.id).length})
              </button>
            ))}
          </div>

          {/* Items Table / Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-[#DCE3DD] shadow-2xs hover:border-[#2F7A4F]/40 flex items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-[#F6F7F5] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-[#16241B] truncate">{item.name}</h4>
                      {item.isPopular && <Sparkles className="w-3 h-3 text-[#E0562B] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#526056] truncate mt-0.5">{item.description}</p>
                    <p className="font-mono text-xs font-bold text-[#E0562B] mt-1">
                      ${item.basePrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 rounded-xl bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#526056] hover:text-[#16241B] transition-colors cursor-pointer"
                    title="Edit item details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${item.name}" from the active menu?`)) {
                        deleteMenuItem(item.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Dish Modal */}
          {isAddingItem && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#DCE3DD] animate-in zoom-in-95 duration-150">
                <div className="p-4 sm:p-6 border-b border-[#DCE3DD] flex items-center justify-between bg-[#F6F7F5]">
                  <h3 className="font-bold text-sm text-[#16241B] font-display">
                    {editingItemId ? 'Edit Menu Dish' : 'Create New Menu Dish'}
                  </h3>
                  <button
                    onClick={() => setIsAddingItem(false)}
                    className="w-8 h-8 rounded-full bg-white text-[#526056] hover:text-[#16241B] flex items-center justify-center border border-[#DCE3DD] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveItem} className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="text-[11px] font-semibold text-[#526056] block mb-1">Dish Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Handmade Tagliolini with Morel Mushrooms"
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#526056] block mb-1">Category</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#526056] block mb-1">Base Price ($ USD)</label>
                      <input
                        type="number"
                        step="0.50"
                        required
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] font-mono focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#526056] block mb-1">Description & Ingredients</label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe culinary preparation, origins, flavor profile..."
                      className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#526056] block mb-1">Dish Photo (Auto-Compressed for Mobile Data)</label>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-14 h-14 rounded-xl object-cover border border-[#DCE3DD] bg-[#F6F7F5] shrink-0"
                        />
                        
                        <div className="flex-1 space-y-1">
                          <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#DCE3DD] hover:bg-[#F6F7F5] rounded-xl text-xs font-bold text-[#16241B] cursor-pointer transition-all shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-[#E0562B]" />
                            <span>{isCompressing ? 'Compressing...' : 'Upload & Compress Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={isCompressing}
                            />
                          </label>
                          
                          {compressedKb && (
                            <p className="text-[10px] text-[#2F7A4F] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Optimized size: ~{compressedKb} KB (Ultra-fast mobile load)
                            </p>
                          )}
                        </div>
                      </div>

                      <input
                        type="url"
                        placeholder="Or paste external image URL..."
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setCompressedKb(null);
                        }}
                        className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-1.5 text-[11px] text-[#16241B] focus:outline-none focus:ring-2 focus:ring-[#E0562B]"
                      />
                    </div>
                  </div>

                  {/* Add-ons & Modifiers Builder Section */}
                  <div className="pt-4 border-t border-[#DCE3DD] space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-4 h-4 text-[#E0562B]" />
                          <h4 className="text-xs font-bold text-[#16241B] uppercase tracking-wider">
                            Dish Add-ons, Upgrades & Modifiers
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#526056] mt-0.5">
                          Add choices like White Rice to Fried Rice, extra sides (Fries, Eggs), drinks, or 'No Mayo' preferences.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAddonGroup}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#DCE3DD] hover:bg-[#F6F7F5] text-xs font-bold text-[#16241B] flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#E0562B]" />
                        <span>Custom Group</span>
                      </button>
                    </div>

                    {/* Quick Presets for fast setup */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F6F7F5] rounded-xl border border-[#DCE3DD]">
                      <span className="text-[10px] font-bold text-[#526056] uppercase mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleAddPresetGroup('RICE')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE3DD] hover:border-[#2F7A4F] text-[11px] font-medium text-[#16241B] cursor-pointer"
                      >
                        🍚 Rice Upgrade
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetGroup('SIDES')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE3DD] hover:border-[#2F7A4F] text-[11px] font-medium text-[#16241B] cursor-pointer"
                      >
                        🍟 Extra Sides (Fries / Egg)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetGroup('PREFERENCES')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE3DD] hover:border-[#2F7A4F] text-[11px] font-medium text-[#16241B] cursor-pointer"
                      >
                        🚫 Prep Notes (No Mayo / Sauce On Side)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetGroup('DRINK')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE3DD] hover:border-[#2F7A4F] text-[11px] font-medium text-[#16241B] cursor-pointer"
                      >
                        🥤 Add Beverage
                      </button>
                    </div>

                    {/* Active Add-on Groups List */}
                    {addonGroups.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-[#DCE3DD] text-center bg-[#FBFBFA]">
                        <p className="text-xs text-[#7A8E80]">No add-ons or substitutions created yet for this item.</p>
                        <p className="text-[11px] text-[#526056] mt-0.5">Click a quick preset above to instantly configure upgrades.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {addonGroups.map((group, gIndex) => (
                          <div key={group.id} className="p-3.5 bg-[#F6F7F5] rounded-2xl border border-[#DCE3DD] space-y-3">
                            {/* Group Header Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#DCE3DD]">
                              <div className="flex-1 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#16241B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {gIndex + 1}
                                </span>
                                <input
                                  type="text"
                                  value={group.name}
                                  onChange={(e) => handleUpdateGroup(group.id, { name: e.target.value })}
                                  placeholder="Group Title (e.g. Rice Choice, Add Drink, Preferences)"
                                  className="w-full bg-white border border-[#DCE3DD] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#16241B]"
                                />
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16241B] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={group.isRequired}
                                    onChange={(e) => handleUpdateGroup(group.id, { 
                                      isRequired: e.target.checked,
                                      minSelection: e.target.checked ? 1 : 0
                                    })}
                                    className="rounded text-[#E0562B]"
                                  />
                                  <span>Required</span>
                                </label>

                                <div className="flex items-center gap-1 text-[11px] text-[#526056]">
                                  <span>Max:</span>
                                  <select
                                    value={group.maxSelection}
                                    onChange={(e) => handleUpdateGroup(group.id, { maxSelection: parseInt(e.target.value) })}
                                    className="bg-white border border-[#DCE3DD] rounded-lg px-2 py-1 text-xs font-bold text-[#16241B]"
                                  >
                                    <option value={1}>1 (Single choice / Radio)</option>
                                    <option value={2}>Up to 2</option>
                                    <option value={3}>Up to 3</option>
                                    <option value={4}>Up to 4</option>
                                    <option value={5}>Up to 5</option>
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                                  title="Delete Option Group"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Options List */}
                            <div className="space-y-2">
                              {group.options.map((option) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option.name}
                                    onChange={(e) => handleUpdateOption(group.id, option.id, { name: e.target.value })}
                                    placeholder="Option name (e.g. Fried Rice, Fries, No Mayo)"
                                    className="flex-1 bg-white border border-[#DCE3DD] rounded-xl px-2.5 py-1 text-xs text-[#16241B]"
                                  />

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[11px] font-mono text-[#526056]">+$</span>
                                    <input
                                      type="number"
                                      step="0.10"
                                      min="0"
                                      value={option.priceDelta}
                                      onChange={(e) => handleUpdateOption(group.id, option.id, { priceDelta: parseFloat(e.target.value) || 0 })}
                                      className="w-16 bg-white border border-[#DCE3DD] rounded-xl px-2 py-1 text-xs font-mono text-[#16241B]"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(group.id, option.id)}
                                    className="p-1 text-[#7A8E80] hover:text-red-500 cursor-pointer"
                                    title="Delete Option"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddOptionToGroup(group.id)}
                                className="text-[11px] font-bold text-[#2F7A4F] hover:text-[#235D3B] flex items-center gap-1 pt-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Add Choice to this group</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Badges / Dietary Flags */}
                  <div className="pt-2 border-t border-[#DCE3DD] grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F7F5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVegetarian}
                        onChange={(e) => setIsVegetarian(e.target.checked)}
                        className="rounded text-[#2F7A4F]"
                      />
                      <span className="font-semibold text-[#16241B]">Vegetarian</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F7F5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isGlutenFree}
                        onChange={(e) => setIsGlutenFree(e.target.checked)}
                        className="rounded text-[#C48214]"
                      />
                      <span className="font-semibold text-[#16241B]">Gluten-Free</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F7F5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSpicy}
                        onChange={(e) => setIsSpicy(e.target.checked)}
                        className="rounded text-[#E0562B]"
                      />
                      <span className="font-semibold text-[#16241B]">Spicy Flavor</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[#F6F7F5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPopular}
                        onChange={(e) => setIsPopular(e.target.checked)}
                        className="rounded text-[#236885]"
                      />
                      <span className="font-semibold text-[#16241B]">Chef Special / Popular</span>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-[#DCE3DD] flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingItem(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#526056] hover:bg-[#F6F7F5] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#E0562B] text-white text-xs font-bold hover:bg-[#B5431E] shadow-xs cursor-pointer"
                    >
                      {editingItemId ? 'Update Dish' : 'Publish Dish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
