import React, { useState } from 'react';
import { Restaurant, Order, RestaurantTable, FloorZone } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { FloorPlanConfigurator } from '../common/FloorPlanConfigurator';
import { StaffTableQrModal } from './StaffTableQrModal';
import { 
  LayoutGrid, 
  Clock, 
  DollarSign, 
  Plus, 
  Utensils, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ArrowRight, 
  Flame, 
  Printer, 
  Sparkles, 
  Settings2, 
  Link2,
  QrCode,
  Smartphone
} from 'lucide-react';

interface StaffTableMapProps {
  restaurant: Restaurant;
  onOpenPosForTable: (tableNum: string) => void;
  onModifyOrder: (order: Order) => void;
  onTestCustomerOrder?: (tableNum: string) => void;
}

export const StaffTableMap: React.FC<StaffTableMapProps> = ({
  restaurant,
  onOpenPosForTable,
  onModifyOrder,
  onTestCustomerOrder,
}) => {
  const { orders, updateOrderStatus } = useOrders();
  const { resetTableSession } = useRestaurants();
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [activeTableDetail, setActiveTableDetail] = useState<RestaurantTable | null>(null);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [presentingQrTable, setPresentingQrTable] = useState<RestaurantTable | null>(null);

  // Dynamic tables from restaurant context or fallback
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

  const zones: FloorZone[] = (restaurant.floorZones && restaurant.floorZones.length > 0)
    ? restaurant.floorZones
    : [
        { id: 'zone_main', name: 'Main Dining Hall' },
        { id: 'zone_patio', name: 'Outdoor Patio & Alfresco' },
        { id: 'zone_vip', name: 'VIP Private Suite' },
      ];

  // Active dine-in orders for this restaurant
  const dineInOrders = orders.filter(o => 
    o.restaurantId === restaurant.id &&
    o.serviceType === 'DINE_IN' &&
    !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)
  );

  // Match table with all active orders (supports multiple guests at same table)
  const getTableOrders = (table: RestaurantTable): Order[] => {
    return dineInOrders.filter(o => {
      if (!o.tableNumber) return false;
      const normalizedOrderTable = o.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTableName = table.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTableId = table.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTableNum = table.tableNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        normalizedOrderTable === normalizedTableName ||
        normalizedOrderTable === normalizedTableId ||
        normalizedOrderTable === normalizedTableNum ||
        normalizedOrderTable.includes(normalizedTableNum)
      );
    });
  };

  const occupiedCount = tables.filter(t => getTableOrders(t).length > 0).length;

  const handleSettleBill = (orderId: string) => {
    if (!confirm('Mark table bill as PAID & settle ticket? This will also clear the table session for new incoming diners.')) return;
    updateOrderStatus(orderId, 'DELIVERED', 'Staff Cashier', 'EMPLOYEE');
    if (activeTableDetail) {
      resetTableSession(restaurant.id, activeTableDetail.id);
    }
    setActiveTableDetail(null);
  };

  const handleSettleAll = (tableOrders: Order[]) => {
    if (!confirm(`Mark all ${tableOrders.length} tickets for ${activeTableDetail?.name} as PAID & clear table?`)) return;
    tableOrders.forEach(o => updateOrderStatus(o.id, 'DELIVERED', 'Staff Cashier', 'EMPLOYEE'));
    if (activeTableDetail) {
      resetTableSession(restaurant.id, activeTableDetail.id);
    }
    setActiveTableDetail(null);
  };

  const handlePrintSlip = (order: Order) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Floor Overview Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#247545]" />
            <h3 className="font-bold text-base text-[#132218] font-display">
              Live Floor Plan & Table Status Map
            </h3>
          </div>
          <p className="text-xs text-[#4F6155] max-w-xl leading-relaxed">
            Monitor table occupancies, kitchen tickets, customer dining status, and bill settlement across your restaurant in real-time.
          </p>
        </div>

        {/* Action button & Legend */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowConfigurator(!showConfigurator)}
            className="px-4 py-2.5 rounded-xl bg-[#132218] hover:bg-[#233529] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Settings2 className="w-4 h-4 text-[#DE5124]" />
            <span>{showConfigurator ? 'Close Layout Editor' : 'Edit Tables & Areas'}</span>
          </button>

          <div className="bg-[#132218] text-white px-4 py-2 rounded-xl text-xs font-mono font-bold">
            {occupiedCount} / {tables.length} Tables Occupied
          </div>
        </div>
      </div>

      {/* Configurator Accordion/Drawer */}
      {showConfigurator && (
        <FloorPlanConfigurator
          restaurant={restaurant}
          onClose={() => setShowConfigurator(false)}
        />
      )}

      {/* Zone Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedZone('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedZone === 'ALL'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
          }`}
        >
          All Floor Areas ({tables.length})
        </button>

        {zones.map(z => {
          const zoneCount = tables.filter(t => t.zoneId === z.id).length;
          return (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedZone === z.id
                  ? 'bg-[#132218] text-white shadow-xs'
                  : 'bg-white text-[#4F6155] border border-[#D9E2D9] hover:text-[#132218]'
              }`}
            >
              {z.name} ({zoneCount})
            </button>
          );
        })}
      </div>

      {/* Interactive Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.filter(t => selectedZone === 'ALL' || t.zoneId === selectedZone).map(table => {
          const activeOrders = getTableOrders(table);
          const isOccupied = activeOrders.length > 0;
          const isMerged = table.mergedWith && table.mergedWith.length > 0;
          const totalTableAmount = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          const totalTableItems = activeOrders.reduce((sum, o) => sum + o.items.length, 0);

          // Status colors
          let statusColor = 'bg-emerald-500 text-white';
          let borderStyle = 'border-[#D9E2D9] hover:border-emerald-500/50';
          let statusText = 'Vacant';

          if (isOccupied) {
            const hasCooking = activeOrders.some(o => ['PREPARING', 'PENDING'].includes(o.status));
            const allServed = activeOrders.every(o => o.status === 'READY_FOR_PICKUP');
            if (hasCooking) {
              statusColor = 'bg-amber-500 text-white';
              borderStyle = 'border-amber-400 shadow-amber-100/50 shadow-md';
              statusText = activeOrders.length > 1 ? `Cooking (${activeOrders.length} orders)` : 'Kitchen Cooking';
            } else if (allServed) {
              statusColor = 'bg-blue-600 text-white';
              borderStyle = 'border-blue-400 shadow-blue-100/50 shadow-md';
              statusText = 'Food Served';
            } else {
              statusColor = 'bg-teal-600 text-white';
              borderStyle = 'border-teal-400 shadow-sm';
              statusText = `${activeOrders.length} Seated Orders`;
            }
          }

          return (
            <div
              key={table.id}
              onClick={() => {
                if (isOccupied) {
                  setActiveTableDetail(table);
                } else {
                  onOpenPosForTable(table.tableNumber || table.name);
                }
              }}
              className={`bg-white rounded-2xl p-4 border-2 ${borderStyle} transition-all cursor-pointer flex flex-col justify-between h-36 relative group hover:scale-[1.02] ${
                isMerged ? 'ring-1 ring-amber-400' : ''
              }`}
            >
              {/* Top Row: Table Name, Present QR button, & Capacity */}
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-[#132218] truncate">
                  {table.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresentingQrTable(table);
                    }}
                    className="p-1 rounded-lg bg-[#E1F0E6] hover:bg-[#C9E4D2] text-[#247545] border border-[#247545]/20 transition-all cursor-pointer shadow-2xs"
                    title={`Present QR Code & PIN for ${table.name}`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-[#4F6155] font-mono flex items-center gap-0.5">
                    <User className="w-3 h-3 text-[#4F6155]" />
                    {table.capacity}
                  </span>
                </div>
              </div>

              {/* Center Status indicator (with multi-order support) */}
              <div className="my-auto text-center">
                {isOccupied ? (
                  <div className="space-y-1">
                    <span className="font-mono text-sm font-black text-[#247545] block">
                      ${totalTableAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#4F6155] block truncate font-medium">
                      {totalTableItems} items • {activeOrders.length === 1 ? `#${activeOrders[0].orderNumber}` : `${activeOrders.length} guest tickets`}
                    </span>
                  </div>
                ) : (
                  <div className="text-[#4F6155]/60 flex flex-col items-center">
                    <Plus className="w-4 h-4 text-[#247545] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-bold group-hover:text-[#247545] transition-colors">
                      + Take Order
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Status Pill */}
              <div className="pt-2 border-t border-[#D9E2D9]/60 flex items-center justify-between text-[10px]">
                <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${statusColor}`}>
                  {statusText}
                </span>

                {isMerged ? (
                  <span className="text-[9px] text-amber-700 font-bold flex items-center gap-0.5">
                    <Link2 className="w-2.5 h-2.5" />
                    Merged
                  </span>
                ) : isOccupied ? (
                  <span className="text-[10px] text-[#4F6155] font-mono">
                    {new Date(activeOrders[0].placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-[9px] text-[#8B9E90] font-mono">
                    #{table.tableNumber}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Table Order Detail Drawer / Modal */}
      {activeTableDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          {(() => {
            const currentOrders = getTableOrders(activeTableDetail);
            if (currentOrders.length === 0) {
              setActiveTableDetail(null);
              return null;
            }

            const tableSubtotal = currentOrders.reduce((sum, o) => sum + o.subtotal, 0);
            const tableTax = currentOrders.reduce((sum, o) => sum + o.tax, 0);
            const tableTotal = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const isMultiGuest = currentOrders.length > 1;

            return (
              <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#D9E2D9] space-y-5 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#D9E2D9] pb-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-xl bg-[#132218] text-white text-xs font-black">
                        {activeTableDetail.name}
                      </span>
                      {isMultiGuest ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200">
                          👥 {currentOrders.length} Seated Diners Ordering
                        </span>
                      ) : (
                        <span className="text-xs text-[#4F6155] font-mono">
                          Ticket #{currentOrders[0].orderNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#4F6155] mt-1">
                      {isMultiGuest 
                        ? 'Multiple guests have placed orders simultaneously at this table.' 
                        : `Customer: ${currentOrders[0].customerName} • Placed at ${new Date(currentOrders[0].placedAt).toLocaleTimeString()}`}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTableDetail(null)}
                    className="p-2 hover:bg-[#F5F7F4] text-[#4F6155] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Tickets & Items List (Multi-order support) */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {currentOrders.map((order, orderIdx) => (
                    <div key={order.id} className="p-3 bg-[#FAFBF9] rounded-2xl border border-[#D9E2D9] space-y-2">
                      <div className="flex items-center justify-between border-b border-[#D9E2D9]/60 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-[#132218]">
                            {order.customerName || `Guest ${orderIdx + 1}`}
                          </span>
                          <span className="text-[10px] text-[#4F6155] font-mono">
                            (#{order.orderNumber})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#247545]">
                            ${order.totalAmount.toFixed(2)}
                          </span>
                          {isMultiGuest && (
                            <button
                              type="button"
                              onClick={() => handleSettleBill(order.id)}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Settle this guest's ticket individually"
                            >
                              Settle Split
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-[#132218] font-medium">
                              {item.quantity}x {item.itemName}
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <span className="text-[10px] text-[#4F6155] block">
                                  +{item.selectedAddons.map(a => a.optionName).join(', ')}
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[#132218]">
                              ${(item.totalPrice || (item.unitPrice * item.quantity)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Calculation */}
                <div className="p-3.5 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-1.5 text-xs shrink-0">
                  <div className="flex justify-between text-[#4F6155]">
                    <span>Table Subtotal ({currentOrders.length} ticket{currentOrders.length !== 1 ? 's' : ''}):</span>
                    <span className="font-mono">${tableSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#4F6155]">
                    <span>Service Tax:</span>
                    <span className="font-mono">${tableTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-[#132218] pt-1.5 border-t border-[#D9E2D9]">
                    <span>Combined Total Bill:</span>
                    <span className="font-mono text-[#247545]">${tableTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 shrink-0">
                  <button
                    onClick={() => {
                      onOpenPosForTable(activeTableDetail.tableNumber || activeTableDetail.name);
                      setActiveTableDetail(null);
                    }}
                    className="px-3 py-2.5 bg-[#132218] hover:bg-[#233529] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Dishes</span>
                  </button>

                  <button
                    onClick={() => setPresentingQrTable(activeTableDetail)}
                    className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#247545] border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Show guest QR code and PIN"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Show QR</span>
                  </button>

                  <button
                    onClick={() => handlePrintSlip(currentOrders[0])}
                    className="px-3 py-2.5 bg-white hover:bg-[#F5F7F4] text-[#132218] border border-[#D9E2D9] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#4F6155]" />
                    <span>Print Slip</span>
                  </button>

                  <button
                    onClick={() => handleSettleAll(currentOrders)}
                    className="px-3 py-2.5 bg-[#247545] hover:bg-[#1C5D37] text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    title="Mark all orders paid and clear table for next incoming guest"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Settle Table</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Staff Table QR Presenter & Customer Test Sandbox Modal */}
      {presentingQrTable && (
        <StaffTableQrModal
          isOpen={!!presentingQrTable}
          onClose={() => setPresentingQrTable(null)}
          table={presentingQrTable}
          restaurant={restaurant}
          onTestCustomerOrder={onTestCustomerOrder}
        />
      )}
    </div>
  );
};
