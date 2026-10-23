import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Restaurant, MenuItem, MenuCategory, OrderingMode, Promotion, FloorZone, RestaurantTable } from '../types';
import { INITIAL_RESTAURANTS, INITIAL_CATEGORIES, INITIAL_MENU_ITEMS, INITIAL_PROMOTIONS } from '../mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  RESTAURANTS: 'foodfindr_restaurants_v1',
  CATEGORIES: 'foodfindr_categories_v1',
  MENU_ITEMS: 'foodfindr_menu_items_v1',
  PROMOTIONS: 'foodfindr_promotions_v1',
};

function mapSupabaseRowToRestaurant(row: any): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || (row.name ? row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'store'),
    tagline: row.tagline || '',
    description: row.description || '',
    establishmentType: 'Restaurant',
    cuisineTypes: ['Local Brunei', 'Asian'],
    logoUrl: row.logo_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
    coverImageUrl: row.banner_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    phone: row.phone || '+673 222 0000',
    whatsappPhone: row.whatsapp_number || row.phone || '+673 222 0000',
    email: `contact@${row.slug || 'store'}.bn`,
    ownerId: row.owner_id || 'usr_merchant_1',
    halalStatus: row.halal_status || 'NOT_SPECIFIED',
    orderingMode: row.ordering_mode || 'DIRECTORY_ONLY',
    address: {
      street: row.address_line1 || 'Main Commercial Road',
      city: row.district || 'Bandar Seri Begawan',
      district: row.district || 'Brunei-Muara',
      state: 'Brunei',
      zipCode: 'BB3577',
      latitude: Number(row.latitude) || 4.8903,
      longitude: Number(row.longitude) || 114.9402,
    },
    rating: 4.8,
    reviewCount: 16,
    priceLevel: '$$',
    estimatedDeliveryMin: 20,
    estimatedDeliveryMax: 35,
    deliveryFee: 3.0,
    minimumOrder: 10.0,
    supportedServices: ['TAKEAWAY', 'DELIVERY'],
    fulfillmentType: 'PLATFORM_RUNNER',
    isVerified: row.is_verified ?? true,
    isActive: true,
    commissionRate: 0.1,
    operatingHours: [
      { day: 'Monday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Tuesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Wednesday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Thursday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Friday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Saturday', openTime: '08:00', closeTime: '22:00', isOpen: true },
      { day: 'Sunday', openTime: '08:00', closeTime: '22:00', isOpen: true },
    ],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  promotions: Promotion[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  getRestaurantById: (id: string) => Restaurant | undefined;
  getMenuItemsByRestaurant: (restaurantId: string) => MenuItem[];
  getCategoriesByRestaurant: (restaurantId: string) => MenuCategory[];
  getPromotionsByRestaurant: (restaurantId: string) => Promotion[];
  updateRestaurantOrderingMode: (restaurantId: string, mode: OrderingMode) => void;
  updateRestaurantDetails: (restaurantId: string, data: Partial<Restaurant>) => void;
  toggleRestaurantStatus: (restaurantId: string) => void;
  addRestaurant: (newRestaurant: Omit<Restaurant, 'id' | 'createdAt'>) => Restaurant;
  deleteRestaurant: (restaurantId: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => MenuItem;
  updateMenuItem: (itemId: string, data: Partial<MenuItem>) => void;
  deleteMenuItem: (itemId: string) => void;
  addCategory: (restaurantId: string, name: string) => MenuCategory;
  addPromotion: (promo: Omit<Promotion, 'id' | 'timesUsed'>) => Promotion;
  updatePromotion: (promoId: string, data: Partial<Promotion>) => void;
  deletePromotion: (promoId: string) => void;
  togglePromotionStatus: (promoId: string) => void;
  // Floor & Table management
  addTable: (restaurantId: string, table: Omit<RestaurantTable, 'id'>) => RestaurantTable;
  updateTable: (restaurantId: string, tableId: string, data: Partial<RestaurantTable>) => void;
  deleteTable: (restaurantId: string, tableId: string) => void;
  addFloorZone: (restaurantId: string, zone: Omit<FloorZone, 'id'>) => FloorZone;
  updateFloorZone: (restaurantId: string, zoneId: string, data: Partial<FloorZone>) => void;
  deleteFloorZone: (restaurantId: string, zoneId: string) => void;
  mergeTables: (restaurantId: string, tableIds: string[], mergedName: string) => void;
  unmergeTable: (restaurantId: string, tableId: string) => void;
  resetTableSession: (restaurantId: string, tableId: string) => void;
  // Database status & sync
  isSupabaseConfigured: boolean;
  isSupabaseConnected: boolean;
  supabaseSyncError: string | null;
  lastSyncedAt: string | null;
  syncWithSupabase: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached restaurants from localStorage:', e);
    }
    return INITIAL_RESTAURANTS;
  });

  const [categories, setCategories] = useState<MenuCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CATEGORIES;
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MENU_ITEMS;
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PROMOTIONS;
  });

  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [supabaseSyncError, setSupabaseSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESTAURANTS, JSON.stringify(restaurants));
    } catch {}
  }, [restaurants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch {}
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promotions));
    } catch {}
  }, [promotions]);

  // Synchronize with remote Supabase database
  const syncWithSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsSupabaseConnected(false);
      return;
    }

    try {
      setSupabaseSyncError(null);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setSupabaseSyncError(error.message);
        setIsSupabaseConnected(false);
        console.warn('[Supabase Sync] Query error:', error.message);
        return;
      }

      setIsSupabaseConnected(true);
      setLastSyncedAt(new Date().toLocaleTimeString());

      if (data && data.length > 0) {
        const remoteRestaurants = data.map(mapSupabaseRowToRestaurant);
        setRestaurants(prev => {
          // Merge remote with local items that haven't synced yet
          const remoteIds = new Set(remoteRestaurants.map(r => r.id));
          const localOnly = prev.filter(r => !remoteIds.has(r.id));
          return [...remoteRestaurants, ...localOnly];
        });
      }
    } catch (err: any) {
      setSupabaseSyncError(err?.message || 'Connection failed');
      setIsSupabaseConnected(false);
    }
  }, []);

  // Run initial sync on mount
  useEffect(() => {
    if (isSupabaseConfigured) {
      syncWithSupabase();
    }
  }, [syncWithSupabase]);

  const getRestaurantById = (id: string) => {
    return restaurants.find(r => r.id === id);
  };

  const getMenuItemsByRestaurant = (restaurantId: string) => {
    return menuItems.filter(item => item.restaurantId === restaurantId && item.isAvailable);
  };

  const getCategoriesByRestaurant = (restaurantId: string) => {
    return categories.filter(cat => cat.restaurantId === restaurantId && cat.isActive);
  };

  const getPromotionsByRestaurant = (restaurantId: string) => {
    return promotions.filter(p => p.restaurantId === restaurantId);
  };

  const addPromotion = (promoData: Omit<Promotion, 'id' | 'timesUsed'>): Promotion => {
    const newPromo: Promotion = {
      ...promoData,
      id: `promo_${Math.random().toString(36).substring(2, 8)}`,
      timesUsed: 0,
      code: promoData.code.trim().toUpperCase(),
    };
    setPromotions(prev => [newPromo, ...prev]);
    return newPromo;
  };

  const updatePromotion = (promoId: string, data: Partial<Promotion>) => {
    setPromotions(prev =>
      prev.map(p => (p.id === promoId ? { ...p, ...data, ...(data.code ? { code: data.code.trim().toUpperCase() } : {}) } : p))
    );
  };

  const deletePromotion = (promoId: string) => {
    setPromotions(prev => prev.filter(p => p.id !== promoId));
  };

  const togglePromotionStatus = (promoId: string) => {
    setPromotions(prev =>
      prev.map(p => (p.id === promoId ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const updateRestaurantOrderingMode = (restaurantId: string, mode: OrderingMode) => {
    setRestaurants(prev =>
      prev.map(r => (r.id === restaurantId ? { ...r, orderingMode: mode } : r))
    );
    if (selectedRestaurant && selectedRestaurant.id === restaurantId) {
      setSelectedRestaurant(prev => prev ? { ...prev, orderingMode: mode } : null);
    }

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('restaurants')
        .update({ ordering_mode: mode })
        .eq('id', restaurantId)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Sync] Update ordering mode error:', error.message);
        });
    }
  };

  const updateRestaurantDetails = (restaurantId: string, data: Partial<Restaurant>) => {
    setRestaurants(prev =>
      prev.map(r => (r.id === restaurantId ? { ...r, ...data } : r))
    );
    if (selectedRestaurant && selectedRestaurant.id === restaurantId) {
      setSelectedRestaurant(prev => prev ? { ...prev, ...data } : null);
    }

    if (isSupabaseConfigured && supabase) {
      const updatePayload: Record<string, any> = {};
      if (data.name) updatePayload.name = data.name;
      if (data.tagline !== undefined) updatePayload.tagline = data.tagline;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.whatsappPhone !== undefined) updatePayload.whatsapp_number = data.whatsappPhone;
      if (data.halalStatus !== undefined) updatePayload.halal_status = data.halalStatus;
      if (data.orderingMode !== undefined) updatePayload.ordering_mode = data.orderingMode;
      if (data.isVerified !== undefined) updatePayload.is_verified = data.isVerified;
      if (data.address?.district) updatePayload.district = data.address.district;
      if (data.address?.street) updatePayload.address_line1 = data.address.street;

      if (Object.keys(updatePayload).length > 0) {
        supabase
          .from('restaurants')
          .update(updatePayload)
          .eq('id', restaurantId)
          .then(({ error }) => {
            if (error) console.warn('[Supabase Sync] Update restaurant details error:', error.message);
          });
      }
    }
  };

  const toggleRestaurantStatus = (restaurantId: string) => {
    setRestaurants(prev =>
      prev.map(r => (r.id === restaurantId ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const addRestaurant = (newRestData: Omit<Restaurant, 'id' | 'createdAt'>): Restaurant => {
    // Check if id is provided or generate UUID-compatible id
    const id = `rest_${Math.random().toString(36).substring(2, 9)}`;
    const newRestaurant: Restaurant = {
      ...newRestData,
      id,
      createdAt: new Date().toISOString(),
    };

    setRestaurants(prev => [newRestaurant, ...prev]);

    // Create a default category
    const defaultCat: MenuCategory = {
      id: `cat_${Math.random().toString(36).substring(2, 8)}`,
      restaurantId: id,
      name: 'Chef Specials',
      sortOrder: 1,
      isActive: true,
    };
    setCategories(prev => [...prev, defaultCat]);

    // Asynchronously sync to Supabase database if connected
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('restaurants')
        .insert({
          name: newRestaurant.name,
          slug: newRestaurant.slug || newRestaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          tagline: newRestaurant.tagline || '',
          description: newRestaurant.description || '',
          district: newRestaurant.address?.district || 'Brunei-Muara',
          address_line1: newRestaurant.address?.street || 'Commercial Area',
          latitude: Number(newRestaurant.address?.latitude) || 4.8903,
          longitude: Number(newRestaurant.address?.longitude) || 114.9402,
          phone: newRestaurant.phone || '',
          whatsapp_number: newRestaurant.whatsappPhone || newRestaurant.phone || '',
          halal_status: newRestaurant.halalStatus || 'NOT_SPECIFIED',
          ordering_mode: newRestaurant.orderingMode || 'DIRECTORY_ONLY',
          logo_url: newRestaurant.logoUrl || '',
          banner_url: newRestaurant.coverImageUrl || '',
          is_verified: newRestaurant.isVerified ?? false,
        })
        .then(({ error }) => {
          if (error) {
            console.error('[Supabase Sync] Failed to persist restaurant to Supabase:', error.message);
            setSupabaseSyncError(`Save error: ${error.message}`);
          } else {
            console.log('[Supabase Sync] Restaurant saved to Supabase successfully!');
            setLastSyncedAt(new Date().toLocaleTimeString());
          }
        });
    }

    return newRestaurant;
  };

  const deleteRestaurant = (restaurantId: string) => {
    setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
    setMenuItems(prev => prev.filter(m => m.restaurantId !== restaurantId));
    setCategories(prev => prev.filter(c => c.restaurantId !== restaurantId));
    setPromotions(prev => prev.filter(p => p.restaurantId !== restaurantId));
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(null);
    }

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId)
        .then(({ error }) => {
          if (error) console.warn('[Supabase Sync] Delete restaurant error:', error.message);
        });
    }
  };

  const addMenuItem = (itemData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): MenuItem => {
    const newItem: MenuItem = {
      ...itemData,
      id: `item_${Math.random().toString(36).substring(2, 8)}`,
    };
    setMenuItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateMenuItem = (itemId: string, data: Partial<MenuItem>) => {
    setMenuItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...data } : item))
    );
  };

  const deleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addCategory = (restaurantId: string, name: string): MenuCategory => {
    const newCat: MenuCategory = {
      id: `cat_${Math.random().toString(36).substring(2, 8)}`,
      restaurantId,
      name,
      sortOrder: categories.filter(c => c.restaurantId === restaurantId).length + 1,
      isActive: true,
    };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const addTable = (restaurantId: string, tableData: Omit<RestaurantTable, 'id'>): RestaurantTable => {
    const newTable: RestaurantTable = {
      ...tableData,
      id: `tbl_${Math.random().toString(36).substring(2, 9)}`,
      restaurantId,
    };
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentTables = r.tables || [];
        return { ...r, tables: [...currentTables, newTable] };
      })
    );
    return newTable;
  };

  const updateTable = (restaurantId: string, tableId: string, data: Partial<RestaurantTable>) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentTables = r.tables || [];
        return {
          ...r,
          tables: currentTables.map(t => (t.id === tableId ? { ...t, ...data } : t)),
        };
      })
    );
  };

  const deleteTable = (restaurantId: string, tableId: string) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        return {
          ...r,
          tables: (r.tables || []).filter(t => t.id !== tableId),
        };
      })
    );
  };

  const addFloorZone = (restaurantId: string, zoneData: Omit<FloorZone, 'id'>): FloorZone => {
    const newZone: FloorZone = {
      ...zoneData,
      id: `zone_${Math.random().toString(36).substring(2, 8)}`,
    };
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentZones = r.floorZones || [];
        return { ...r, floorZones: [...currentZones, newZone] };
      })
    );
    return newZone;
  };

  const updateFloorZone = (restaurantId: string, zoneId: string, data: Partial<FloorZone>) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentZones = r.floorZones || [];
        return {
          ...r,
          floorZones: currentZones.map(z => (z.id === zoneId ? { ...z, ...data } : z)),
        };
      })
    );
  };

  const deleteFloorZone = (restaurantId: string, zoneId: string) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        return {
          ...r,
          floorZones: (r.floorZones || []).filter(z => z.id !== zoneId),
        };
      })
    );
  };

  const mergeTables = (restaurantId: string, tableIds: string[], mergedName: string) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentTables = r.tables || [];
        return {
          ...r,
          tables: currentTables.map(t => {
            if (tableIds.includes(t.id)) {
              return {
                ...t,
                mergedWith: tableIds.filter(id => id !== t.id),
                notes: t.notes ? `${t.notes} • Merged Party (${mergedName})` : `Merged Party (${mergedName})`,
              };
            }
            return t;
          }),
        };
      })
    );
  };

  const unmergeTable = (restaurantId: string, tableId: string) => {
    setRestaurants(prev =>
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        const currentTables = r.tables || [];
        const targetTable = currentTables.find(t => t.id === tableId);
        const relatedIds = targetTable?.mergedWith ? [tableId, ...targetTable.mergedWith] : [tableId];
        return {
          ...r,
          tables: currentTables.map(t => {
            if (relatedIds.includes(t.id)) {
              return {
                ...t,
                mergedWith: undefined,
                notes: t.notes?.replace(/•?\s*Merged Party \([^)]+\)/g, '').trim(),
              };
            }
            return t;
          }),
        };
      })
    );
  };

  const resetTableSession = (restaurantId: string, tableId: string) => {
    setRestaurants(prev => 
      prev.map(r => {
        if (r.id !== restaurantId) return r;
        return {
          ...r,
          tables: (r.tables || []).map(t => {
            const matches = t.id === tableId || t.name.toLowerCase() === tableId.toLowerCase() || t.tableNumber === tableId;
            if (matches) {
              const newEpoch = (t.sessionEpoch || 1) + 1;
              const newSessionId = `sess_${(t.tableNumber || t.name).replace(/\s+/g, '_')}_${Date.now()}`;
              return {
                ...t,
                sessionEpoch: newEpoch,
                currentSessionId: newSessionId,
                lastClearedAt: new Date().toISOString(),
              };
            }
            return t;
          })
        };
      })
    );
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        categories,
        menuItems,
        promotions,
        selectedRestaurant,
        setSelectedRestaurant,
        getRestaurantById,
        getMenuItemsByRestaurant,
        getCategoriesByRestaurant,
        getPromotionsByRestaurant,
        updateRestaurantOrderingMode,
        updateRestaurantDetails,
        toggleRestaurantStatus,
        addRestaurant,
        deleteRestaurant,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addCategory,
        addPromotion,
        updatePromotion,
        deletePromotion,
        togglePromotionStatus,
        addTable,
        updateTable,
        deleteTable,
        addFloorZone,
        updateFloorZone,
        deleteFloorZone,
        mergeTables,
        unmergeTable,
        resetTableSession,
        isSupabaseConfigured,
        isSupabaseConnected,
        supabaseSyncError,
        lastSyncedAt,
        syncWithSupabase,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurants = (): RestaurantContextType => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  return context;
};
