import React, { useState } from 'react';
import { Restaurant, RestaurantTable, ServiceType, Order } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { FloorPlanConfigurator } from '../common/FloorPlanConfigurator';
import { 
  QrCode, 
  Printer, 
  Plus, 
  Trash2, 
  Info, 
  Copy, 
  Check, 
  Smartphone,
  Eye,
  Settings2,
  Users,
  Utensils,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

interface TableQrManagerProps {
  restaurant: Restaurant;
  onOpenTableOrder?: (tableNum: string) => void;
}

export const TableQrManager: React.FC<TableQrManagerProps> = ({ 
  restaurant,
  onOpenTableOrder
}) => {
  const { addTable, deleteTable, updateRestaurantDetails } = useRestaurants();
  const { orders, updateOrderStatus, verifyTableQrSession } = useOrders();
  const { setCurrentUserRole } = useAuth();
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableNum, setNewTableNum] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [channelToast, setChannelToast] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'CARDS' | 'LIVE_STATUS'>('CARDS');

  // Tables from restaurant context or fallback
  const tables: RestaurantTable[] = (restaurant.tables && restaurant.tables.length > 0)
    ? restaurant.tables
    : [
        { id: 'T1', restaurantId: restaurant.id, name: 'Table 1', tableNumber: '1', capacity: 2, zoneId: 'zone_main', isActive: true },
        { id: 'T2', restaurantId: restaurant.id, name: 'Table 2', tableNumber: '2', capacity: 2, zoneId: 'zone_main', isActive: true },
        { id: 'T3', restaurantId: restaurant.id, name: 'Table 3', tableNumber: '3', capacity: 4, zoneId: 'zone_main', isActive: true },
        { id: 'T4', restaurantId: restaurant.id, name: 'Table 4', tableNumber: '4', capacity: 4, zoneId: 'zone_main', isActive: true },
        { id: 'T5', restaurantId: restaurant.id, name: 'Table 5', tableNumber: '5', capacity: 6, zoneId: 'zone_main', isActive: true },
        { id: 'T6', restaurantId: restaurant.id, name: 'Table 6', tableNumber: '6', capacity: 6, zoneId: 'zone_main', isActive: true },
        { id: 'P1', restaurantId: restaurant.id, name: 'Patio 1', tableNumber: 'P1', capacity: 4, zoneId: 'zone_patio', isActive: true },
        { id: 'P2', restaurantId: restaurant.id, name: 'Patio 2', tableNumber: 'P2', capacity: 4, zoneId: 'zone_patio', isActive: true },
        { id: 'VIP1', restaurantId: restaurant.id, name: 'VIP Suite', tableNumber: 'VIP', capacity: 10, zoneId: 'zone_vip', isActive: true },
      ];

  const currentServices: ServiceType[] = restaurant.supportedServices || ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
  const isDineInOnly = currentServices.length === 1 && currentServices.includes('DINE_IN');

  // Match table with active dine-in orders
  const activeDineInOrders = orders.filter(o => 
    o.restaurantId === restaurant.id &&
    o.serviceType === 'DINE_IN' &&
    !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)
  );

  const getTableOrder = (table: RestaurantTable): Order | undefined => {
    return activeDineInOrders.find(o => {
      if (!o.tableNumber) return false;
      const cleanOrderTable = o.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTableName = table.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTableId = table.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTableNum = table.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        cleanOrderTable === cleanTableName ||
        cleanOrderTable === cleanTableId ||
        cleanOrderTable === cleanTableNum ||
        cleanOrderTable.includes(cleanTableNum)
      );
    });
  };

  const occupiedCount = tables.filter(t => getTableOrder(t)).length;

  const handleApplyServicePreset = (services: ServiceType[], label: string) => {
    updateRestaurantDetails(restaurant.id, { supportedServices: services });
    setChannelToast(`Store channel mode updated: ${label}`);
    setTimeout(() => setChannelToast(null), 3500);
  };

  const handleClearTableOrder = (orderId: string, tableName: string) => {
    updateOrderStatus(orderId, 'DELIVERED', 'Restaurant Owner', 'RESTAURANT_OWNER');
    setChannelToast(`✓ ${tableName} meal marked complete! Table is now clean and vacant for the next incoming diners.`);
    setTimeout(() => setChannelToast(null), 4000);
  };

  const getTableUrl = (tableNumberOrName: string) => {
    const origin = window.location.origin;
    const cleanTable = encodeURIComponent(tableNumberOrName);
    return `${origin}/?restaurant=${restaurant.id}&table=${cleanTable}#table=${cleanTable}`;
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const num = newTableNum.trim() || newTableName.trim().replace(/[^a-zA-Z0-9]/g, '');

    addTable(restaurant.id, {
      restaurantId: restaurant.id,
      name: newTableName.trim(),
      tableNumber: num,
      zoneId: restaurant.floorZones?.[0]?.id || 'zone_main',
      capacity: 4,
      shape: 'RECTANGLE',
      isActive: true,
    });

    setNewTableName('');
    setNewTableNum('');
  };

  const handleCopyLink = (tableIdentifier: string, index: number) => {
    const url = getTableUrl(tableIdentifier);
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {channelToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{channelToast}</span>
          </div>
          <button onClick={() => setChannelToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
        </div>
      )}

      {/* Restaurant Service Channel Configuration Box */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E2D9] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#247545]" />
              <h3 className="font-bold text-base text-[#132218] font-display">
                Fulfillment Channels & Store Service Modes
              </h3>
            </div>
            <p className="text-xs text-[#4F6155] max-w-xl leading-relaxed">
              Configure whether your store offers <strong>Dine-In Only</strong>, or enables takeaway pickup and doorstep delivery runners.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApplyServicePreset(['DINE_IN'], 'Dine-In Table Service Only')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDineInOnly
                  ? 'bg-[#247545] text-white shadow-xs ring-2 ring-[#247545]/30'
                  : 'bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              <span>🍽️ Dine-In Only</span>
              {isDineInOnly && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => handleApplyServicePreset(['DINE_IN', 'TAKEAWAY'], 'Dine-In & Counter Takeaway')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentServices.length === 2 && currentServices.includes('DINE_IN') && currentServices.includes('TAKEAWAY')
                  ? 'bg-[#2C6E8E] text-white shadow-xs ring-2 ring-[#2C6E8E]/30'
                  : 'bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              <span>🍽️ + 🥡 Dine-In & Takeaway</span>
            </button>

            <button
              onClick={() => handleApplyServicePreset(['DINE_IN', 'TAKEAWAY', 'DELIVERY'], 'All Channels (Delivery, Takeaway, Dine-In)')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentServices.includes('DELIVERY') && currentServices.includes('DINE_IN') && currentServices.includes('TAKEAWAY')
                  ? 'bg-[#132218] text-white shadow-xs ring-2 ring-[#132218]/30'
                  : 'bg-[#F5F7F4] text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              <span>✨ All 3 Channels</span>
            </button>
          </div>
        </div>

        {/* Current status explanation */}
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
          isDineInOnly 
            ? 'bg-amber-50 border border-amber-200 text-amber-900' 
            : 'bg-[#F5F7F4] border border-[#D9E2D9] text-[#4F6155]'
        }`}>
          <Info className="w-4 h-4 shrink-0 text-[#247545]" />
          <span>
            {isDineInOnly ? (
              <>
                <strong>Dine-In Only Mode is Active:</strong> Delivery runners and takeaway pickup are disabled for this store. Customers can only browse and order from seated table QR stands without logging in.
              </>
            ) : (
              <>
                <strong>Multi-Channel Active:</strong> Supporting {currentServices.map(s => s === 'DINE_IN' ? 'Dine-In' : s === 'TAKEAWAY' ? 'Takeaway' : 'Delivery').join(', ')}. Customers can choose their preferred mode.
              </>
            )}
          </span>
        </div>

        {/* Table Ordering Security & Anti-Abuse Mode Selector */}
        <div className="pt-3 border-t border-[#EDF1EC] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#132218] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#247545]" />
              <span>Table Ordering Security & Anti-Abuse Mode</span>
            </span>
            <span className="text-[10px] text-[#4F6155]">Prevents remote outsider / phantom orders</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => {
                updateRestaurantDetails(restaurant.id, { dineInSecurityMode: 'STAFF_VERIFICATION' });
                setChannelToast('Security mode set: Floor Waiter Seated Verification');
                setTimeout(() => setChannelToast(null), 3000);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                (restaurant.dineInSecurityMode || 'STAFF_VERIFICATION') === 'STAFF_VERIFICATION'
                  ? 'border-[#247545] bg-[#E1F0E6]/40 ring-2 ring-[#247545]/20'
                  : 'border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[#132218]">
                <span>🛡️ Waiter Verification</span>
                {(restaurant.dineInSecurityMode || 'STAFF_VERIFICATION') === 'STAFF_VERIFICATION' && (
                  <Check className="w-3.5 h-3.5 text-[#247545]" />
                )}
              </div>
              <p className="text-[10px] text-[#4F6155] leading-relaxed">
                Tickets are held in KDS until floor staff physically verifies guests are seated at the table before firing to stoves.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                updateRestaurantDetails(restaurant.id, { dineInSecurityMode: 'TABLE_PIN' });
                setChannelToast('Security mode set: 4-Digit Table Stand PIN Required');
                setTimeout(() => setChannelToast(null), 3000);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                restaurant.dineInSecurityMode === 'TABLE_PIN'
                  ? 'border-[#2C6E8E] bg-[#EAF2F6]/50 ring-2 ring-[#2C6E8E]/20'
                  : 'border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[#132218]">
                <span>🔢 Table Stand PIN</span>
                {restaurant.dineInSecurityMode === 'TABLE_PIN' && (
                  <Check className="w-3.5 h-3.5 text-[#2C6E8E]" />
                )}
              </div>
              <p className="text-[10px] text-[#4F6155] leading-relaxed">
                Diners must enter the 4-digit PIN printed physically on the table stand. Remote outsiders cannot guess it.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                updateRestaurantDetails(restaurant.id, { dineInSecurityMode: 'OPEN' });
                setChannelToast('Security mode set: Open Fast-Ordering');
                setTimeout(() => setChannelToast(null), 3000);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                restaurant.dineInSecurityMode === 'OPEN'
                  ? 'border-[#DE5124] bg-[#FDE8E0]/40 ring-2 ring-[#DE5124]/20'
                  : 'border-[#D9E2D9] hover:bg-[#F5F7F4]'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[#132218]">
                <span>⚡ Open Fast-Order</span>
                {restaurant.dineInSecurityMode === 'OPEN' && (
                  <Check className="w-3.5 h-3.5 text-[#DE5124]" />
                )}
              </div>
              <p className="text-[10px] text-[#4F6155] leading-relaxed">
                Direct straight to stoves without verification. Best for prepaid or high-trust counter environments.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Overview & Print Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#DE5124]" />
            <h3 className="font-bold text-base text-[#132218] font-display">
              Dine-In Table QR Code Stands & Live Turnover
            </h3>
          </div>
          <p className="text-xs text-[#4F6155] max-w-2xl leading-relaxed">
            Generate printable QR code table stands for your tables. When diners sit down and scan the QR code with their phone camera, they land directly on your digital menu with their table pre-locked. No app install or login required!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* View Toggle */}
          <div className="p-1 bg-[#F5F7F4] rounded-xl border border-[#D9E2D9] flex items-center gap-1">
            <button
              onClick={() => setActiveView('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'CARDS' ? 'bg-[#132218] text-white shadow-xs' : 'text-[#4F6155]'
              }`}
            >
              Printable Stands ({tables.length})
            </button>
            <button
              onClick={() => setActiveView('LIVE_STATUS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'LIVE_STATUS' ? 'bg-[#247545] text-white shadow-xs' : 'text-[#4F6155]'
              }`}
            >
              <span>Live Turnover</span>
              {occupiedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-[#132218] rounded-full text-[10px] font-black">
                  {occupiedCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowConfigurator(!showConfigurator)}
            className="px-4 py-2.5 bg-[#F5F7F4] hover:bg-[#D9E2D9] text-[#132218] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4 text-[#247545]" />
            <span>{showConfigurator ? 'Hide Layout' : 'Floor Layout'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#132218] hover:bg-[#233529] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#DE5124]" />
            <span>Print Table Stands</span>
          </button>
        </div>
      </div>

      {/* Configurator Accordion */}
      {showConfigurator && (
        <FloorPlanConfigurator
          restaurant={restaurant}
          onClose={() => setShowConfigurator(false)}
        />
      )}

      {/* Quick Add Table Input */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E2D9] shadow-xs space-y-4">
        <form onSubmit={handleAddTable} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Table Display Name (e.g. Table 9, Patio 3, Booth A...)"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl text-xs font-medium text-[#132218] focus:outline-none focus:border-[#247545]"
            />
          </div>
          <div className="w-full sm:w-36">
            <input
              type="text"
              placeholder="QR Code # (e.g. 9)"
              value={newTableNum}
              onChange={(e) => setNewTableNum(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl text-xs font-mono font-bold text-[#132218] focus:outline-none focus:border-[#247545]"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#247545] hover:bg-[#1C5D37] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table Stand</span>
          </button>
        </form>

        <div className="p-3.5 bg-[#EAF3EC] rounded-2xl border border-[#247545]/20 text-xs text-[#247545] flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Each table QR code opens a <strong>limited public view</strong> where guests can submit orders directly to that specific table without needing an account. Orders appear live on your Staff POS terminal! Once the meal is finished, staff or owners mark it complete to clear the table for the next incoming diners.
          </span>
        </div>
      </div>

      {/* VIEW 1: LIVE TABLE OCCUPANCY & TURNOVER */}
      {activeView === 'LIVE_STATUS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-[#132218] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#247545]" />
              <span>Real-Time Table Occupancy & Guest Turnover</span>
            </h4>
            <span className="text-xs font-mono font-bold text-[#4F6155]">
              {occupiedCount} Occupied • {tables.length - occupiedCount} Vacant
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => {
              const activeOrder = getTableOrder(table);
              const isOccupied = !!activeOrder;
              const tableUrl = getTableUrl(table.tableNumber || table.name);

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-3xl p-5 border-2 transition-all flex flex-col justify-between ${
                    isOccupied 
                      ? 'border-amber-300 bg-amber-50/20 shadow-xs' 
                      : 'border-[#D9E2D9] hover:border-emerald-400 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#EDF1EC] pb-3">
                      <div>
                        <span className="font-black text-sm text-[#132218] block">{table.name}</span>
                        <span className="text-[10px] text-[#4F6155]">Capacity: {table.capacity} Pax • #{table.tableNumber}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isOccupied 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {isOccupied ? '🟡 Occupied & Dining' : '🟢 Vacant & Clean'}
                      </span>
                    </div>

                    {/* Order Details if Occupied */}
                    {isOccupied && activeOrder ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[#4F6155]">
                          <span>Ticket #{activeOrder.orderNumber}</span>
                          <span className="font-mono font-bold text-[#247545] text-sm">${activeOrder.totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-[#132218]">
                          Diner: <strong>{activeOrder.customerName}</strong>
                        </p>
                        <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] space-y-1">
                          <span className="text-[10px] font-bold text-[#4F6155] uppercase block">Ordered Dishes:</span>
                          {activeOrder.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-[#132218]">
                              <span>{it.quantity}x {it.itemName}</span>
                              <span className="font-mono text-[10px]">${(it.totalPrice || (it.unitPrice * it.quantity)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[#4F6155] space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-xs font-bold text-[#132218]">Table is Clean & Ready</p>
                        <p className="text-[10px]">Awaiting next diners to scan QR stand</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-[#EDF1EC] mt-3">
                    {isOccupied && activeOrder ? (
                      <button
                        onClick={() => handleClearTableOrder(activeOrder.id, table.name)}
                        className="w-full py-2.5 bg-[#247545] hover:bg-[#1C5D37] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Complete & Free Table for Next Guest</span>
                      </button>
                    ) : (
                      <a
                        href={tableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-[#F5F7F4] hover:bg-emerald-50 text-[#247545] border border-[#D9E2D9] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Simulate Guest QR Scan</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: GRID OF TABLE STAND CARDS */}
      {activeView === 'CARDS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table, idx) => {
            const tableIdentifier = table.tableNumber || table.name;
            const tableUrl = getTableUrl(tableIdentifier);
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tableUrl)}&color=19-34-24`;

            return (
              <div
                key={table.id}
                className="bg-white rounded-3xl border-2 border-[#D9E2D9] hover:border-[#247545]/50 shadow-xs overflow-hidden transition-all flex flex-col justify-between"
              >
                {/* Stand Header Preview */}
                <div className="p-5 border-b border-[#D9E2D9] bg-[#FAFBF9] text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#132218] text-white text-xs font-black tracking-wider">
                    <span>{table.name}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#132218] truncate">
                    {restaurant.name}
                  </h4>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-[#4F6155] font-semibold">
                    <span>Capacity: {table.capacity} Pax</span>
                    <span>•</span>
                    <span className="font-mono font-bold text-[#DE5124]">QR #{table.tableNumber}</span>
                  </div>
                </div>

                {/* Stand QR Code Box */}
                <div className="p-6 flex flex-col items-center justify-center bg-white space-y-3">
                  <div className="p-3 bg-white border border-[#D9E2D9] rounded-2xl shadow-2xs">
                    <img
                      src={qrImageUrl}
                      alt={`QR Code for ${table.name}`}
                      className="w-36 h-36 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="text-[10px] font-mono text-center text-[#4F6155] mt-1.5">
                      {restaurant.slug || restaurant.id} • #{table.tableNumber}
                    </div>
                  </div>

                  {/* Physical Stand Passcode Badge */}
                  {(() => {
                    const pin = table.tablePin || `4${(table.tableNumber || '1').replace(/\D/g, '').padStart(3, '0')}`;
                    return (
                      <div className="p-2 bg-stone-50 rounded-xl border border-stone-200 text-center w-full max-w-[200px]">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#4F6155] block">Table Stand PIN</span>
                        <span className="font-mono text-sm font-black text-[#132218] tracking-widest">{pin}</span>
                        <span className="text-[9px] text-[#7A8E80] block mt-0.5">Physical diner verification</span>
                      </div>
                    );
                  })()}

                  <div className="text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#132218]">
                      <Smartphone className="w-3.5 h-3.5 text-[#DE5124]" />
                      <span>Point Phone Camera</span>
                    </div>
                    <p className="text-[10px] text-[#4F6155]">
                      No app download or account login required
                    </p>
                  </div>
                </div>

                {/* Stand Actions */}
                <div className="p-3.5 bg-[#F5F7F4] border-t border-[#D9E2D9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(tableIdentifier, idx)}
                      className="p-2 hover:bg-white rounded-xl text-[#4F6155] hover:text-[#132218] transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Copy direct table order link"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-[#247545]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px]">
                        {copiedIndex === idx ? 'Copied' : 'Copy Link'}
                      </span>
                    </button>

                    <a
                      href={tableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-white rounded-xl text-[#247545] transition-colors text-xs font-bold flex items-center gap-1"
                      title="Open public table ordering view"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Preview</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        verifyTableQrSession(table.name);
                        setCurrentUserRole('CUSTOMER');
                        window.location.hash = `#restaurant=${restaurant.id}&table=${encodeURIComponent(tableIdentifier)}`;
                      }}
                      className="p-2 hover:bg-emerald-50 text-[#247545] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Test ordering flow as a diner seated at this table"
                    >
                      <Flame className="w-3.5 h-3.5 text-[#DE5124]" />
                      <span className="text-[11px] font-extrabold">Test Order</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${table.name}?`)) {
                        deleteTable(restaurant.id, table.id);
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete table stand"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
