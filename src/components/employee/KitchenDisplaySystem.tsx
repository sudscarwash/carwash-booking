import React, { useState, useEffect } from 'react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Flame, 
  PackageCheck, 
  Clock, 
  AlertCircle, 
  Volume2, 
  Check, 
  CheckCircle2,
  X,
  Timer,
  Utensils,
  ChevronRight,
  Sparkles,
  Store,
  ShieldCheck,
  Bike,
  Radio,
  Navigation
} from 'lucide-react';

interface KitchenDisplaySystemProps {
  restaurantId?: string;
}

export const KitchenDisplaySystem: React.FC<KitchenDisplaySystemProps> = ({ restaurantId }) => {
  const { orders, updateOrderStatus, updateRunnerMilestone, resolveCancellationRequest } = useOrders();
  const { currentUser } = useAuth();
  const [filterMode, setFilterMode] = useState<'ALL_ACTIVE' | 'PENDING' | 'PREPARING' | 'READY_FOR_PICKUP'>('ALL_ACTIVE');
  const [currentTime, setCurrentTime] = useState(new Date());

  const effectiveRestaurantId = restaurantId || currentUser.restaurantId;

  // Real-time clock for elapsed calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders relevant for kitchen (active ones) strictly for THIS restaurant
  const kitchenOrders = orders.filter(o => {
    // Strict multi-tenant isolation: Never show tickets from another restaurant
    if (effectiveRestaurantId && o.restaurantId !== effectiveRestaurantId) return false;
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)) return false;
    if (filterMode === 'ALL_ACTIVE') return true;
    return o.status === filterMode;
  });

  const calculateElapsedMinutes = (dateStr: string) => {
    const elapsedMs = currentTime.getTime() - new Date(dateStr).getTime();
    return Math.floor(elapsedMs / (1000 * 60));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top KDS Action Header */}
      <div className="bg-[#132218] text-white rounded-3xl p-6 border border-[#2D3E33] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#247545] animate-ping"></span>
            <h1 className="text-xl sm:text-2xl font-extrabold font-display">Kitchen Display System (KDS)</h1>
          </div>
          <p className="text-xs text-[#C5D5C8] mt-1">
            Real-time ticket queue for line cooks • Showing active tickets for {currentUser.firstName}&apos;s station
          </p>
        </div>

        {/* Filter / Mode Pills */}
        <div className="flex items-center gap-1.5 bg-[#1C3224] p-1 rounded-2xl border border-[#2D3E33]">
          {[
            { id: 'ALL_ACTIVE', label: `All Active (${kitchenOrders.length})` },
            { id: 'PENDING', label: 'New Tickets' },
            { id: 'PREPARING', label: 'In Cook' },
            { id: 'READY_FOR_PICKUP', label: 'Ready' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === f.id
                  ? 'bg-[#DE5124] text-white shadow-xs'
                  : 'text-[#C5D5C8] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-[#D9E2D9] space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#E0F2E6] text-[#247545] flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-lg font-bold text-[#132218] font-display">Kitchen Queue is Clear</h3>
          <p className="text-xs text-[#4F6155] max-w-sm mx-auto">
            All tickets have been cooked, packaged, and handed over to delivery couriers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kitchenOrders.map(order => {
            const elapsedMins = calculateElapsedMinutes(order.placedAt);
            const isLate = elapsedMins > 20;
            const isWarning = elapsedMins > 12 && !isLate;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border shadow-md overflow-hidden flex flex-col justify-between transition-all ${
                  isLate
                    ? 'border-[#BA2D2D] ring-2 ring-[#BA2D2D]/20'
                    : isWarning
                    ? 'border-[#C48214]'
                    : 'border-[#D9E2D9]'
                }`}
              >
                {/* Ticket Header */}
                <div className={`p-4 border-b flex items-center justify-between ${
                  isLate
                    ? 'bg-[#FDE8E8] border-[#F8C1C1] text-[#BA2D2D]'
                    : isWarning
                    ? 'bg-[#FDF3E1] border-[#EED7A6] text-[#94610B]'
                    : 'bg-[#F5F7F4] border-[#D9E2D9] text-[#132218]'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold">#{order.orderNumber}</span>
                      <StatusBadge status={order.status} size="sm" />
                      {order.serviceType === 'DINE_IN' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#132218] text-white text-[10px] font-mono font-bold">
                          🍽️ Table {order.tableNumber || 'Walk-in'} (Plated)
                        </span>
                      ) : order.serviceType === 'TAKEAWAY' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[#2C6E8E] text-white text-[10px] font-mono font-bold">
                          🛍️ Takeaway {order.pickupTime ? `(${order.pickupTime})` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-[#DE5124] text-white text-[10px] font-mono font-bold">
                          🛵 Delivery (Bagged)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold mt-0.5 opacity-80">
                      Customer: {order.customerName}
                    </p>
                  </div>

                  {/* Elapsed Timer Counter */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-mono font-extrabold text-sm">
                      <Timer className="w-4 h-4" />
                      <span>{elapsedMins} min</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {isLate ? 'DELAYED' : isWarning ? 'EXPEDITE' : 'ON TIME'}
                    </span>
                  </div>
                </div>

                {/* Urgent Customer Cancellation Request Review Banner */}
                {order.cancellationRequested && order.cancellationRequestStatus === 'PENDING_REVIEW' && (
                  <div className="p-3.5 bg-rose-50 border-b border-rose-300 text-rose-950 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 animate-bounce" />
                      <span>URGENT: CUSTOMER REQUESTED CANCELLATION</span>
                    </div>
                    <p className="text-[11px] font-medium text-rose-900 bg-white/70 p-2 rounded-xl border border-rose-200">
                      Reason: "{order.cancellationRequestReason || 'Customer requested to stop order'}"
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => resolveCancellationRequest(order.id, 'APPROVE', 'Kitchen accepted customer cancellation', currentUser.firstName || 'Chef')}
                        className="flex-1 py-2 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Approve & Void Ticket (100% Refund)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveCancellationRequest(order.id, 'REJECT', 'Food already in pan / cooked', currentUser.firstName || 'Chef')}
                        className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold text-[11px] cursor-pointer transition-colors"
                      >
                        Decline (Cooking)
                      </button>
                    </div>
                  </div>
                )}

                {/* Ticket Dishes & Add-ons List */}
                <div className="p-4 flex-1 space-y-3 divide-y divide-[#EDF1EC] max-h-72 overflow-y-auto">
                  {order.items.map(item => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-[#132218] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <span className="font-bold text-xs text-[#132218] leading-tight">
                            {item.itemName}
                          </span>
                        </div>
                      </div>

                      {/* Addon / Customization instructions */}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="pl-8 text-[11px] text-[#4F6155] space-y-0.5">
                          {item.selectedAddons.map(a => (
                            <div key={a.optionId} className="flex items-center gap-1 text-[#DE5124] font-semibold">
                              <span>+ {a.optionName}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Special Chef Notes */}
                      {item.specialInstructions && (
                        <div className="ml-8 mt-1 p-1.5 rounded-lg bg-[#FDEEE9] border border-[#F9D0C4] text-[11px] font-bold text-[#DE5124]">
                          ⚠️ Note: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Courier Pickup & Dispatch Tracking (Restaurant Just-In-Time View) */}
                {order.serviceType === 'DELIVERY' && (
                  <div className="mx-4 mb-2 p-3 rounded-2xl bg-[#F0F5F2] border border-[#CDE0D3] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#132218]">
                        <Bike className="w-3.5 h-3.5 text-[#247545]" />
                        <span>Courier Pickup Status:</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#4F6155] bg-white px-2 py-0.5 rounded border border-[#D9E2D9]">
                        {order.runnerName ? `Assigned: ${order.runnerName}` : 'Finding Courier...'}
                      </span>
                    </div>

                    {order.runnerName ? (
                      <div>
                        {order.deliveryMilestone === 'ARRIVED_AT_RESTAURANT' ? (
                          <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold flex items-center justify-between gap-2 animate-pulse">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                              <span>Courier ARRIVED AT COUNTER for Pickup!</span>
                            </div>
                            {order.status === 'READY_FOR_PICKUP' && (
                              <button
                                type="button"
                                onClick={() => updateRunnerMilestone(order.id, 'PICKED_UP_EN_ROUTE', undefined, currentUser.firstName, 'Handed bags to courier at counter')}
                                className="px-2.5 py-1 rounded-lg bg-[#247545] hover:bg-[#1C5C36] text-white text-[11px] font-bold cursor-pointer shrink-0 shadow-2xs"
                              >
                                Hand Over Bags
                              </button>
                            )}
                          </div>
                        ) : order.deliveryMilestone === 'PICKED_UP_EN_ROUTE' ? (
                          <div className="text-[11px] text-[#247545] font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Bags collected. En route to customer.</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#4F6155] flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-[#236885]" />
                              <span>En route to store for pickup (~5 min)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRunnerMilestone(order.id, 'ARRIVED_AT_RESTAURANT', undefined, currentUser.firstName, 'Kitchen marked courier arrived')}
                              className="text-[10px] font-bold text-[#DE5124] hover:underline cursor-pointer"
                              title="Mark courier as physically present at counter"
                            >
                              Mark Arrived
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#7A8E80] italic">
                        Auto-dispatch searching for nearest available runner in {order.restaurantDistrict || 'Brunei-Muara'}...
                      </p>
                    )}

                    <div className="text-[9px] text-[#7A8E80] border-t border-[#D9E2D9] pt-1">
                      Kitchen privacy: Customer address & doorstep GPS hidden. Only counter pickup state shown.
                    </div>
                  </div>
                )}

                {/* 1-Touch Advance Status Action Bar */}
                <div className="p-4 bg-[#F5F7F4] border-t border-[#D9E2D9] space-y-2">
                  {order.status === 'PENDING' && (
                    order.serviceType === 'DINE_IN' ? (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Guest Dine-In Order: Verify diners are seated at <strong>{order.tableNumber || 'Table'}</strong>.</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, 'PREPARING', currentUser.firstName, 'EMPLOYEE')}
                            className="py-2.5 px-3 rounded-xl bg-[#247545] hover:bg-[#1C5D37] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            title="Verify diners seated at this table and start cooking"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify & Cook</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Reject phantom order #${order.orderNumber}? (Voids ticket and clears table if no diners are seated)`)) {
                                updateOrderStatus(order.id, 'CANCELLED', currentUser.firstName, 'EMPLOYEE', 'Floor staff verified no diners seated at table');
                              }
                            }}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Reject fake/remote order if table is empty"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject Phantom</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PREPARING', currentUser.firstName, 'EMPLOYEE')}
                        className="w-full py-3 rounded-2xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Start Cooking Ticket</span>
                      </button>
                    )
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP', currentUser.firstName, 'EMPLOYEE')}
                      className="w-full py-3 rounded-2xl bg-[#236885] hover:bg-[#1C536B] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  )}

                  {order.status === 'READY_FOR_PICKUP' && (
                    <div className="p-2.5 bg-[#E0F2E6] rounded-2xl text-center text-xs font-bold text-[#247545] border border-[#C2E4CD] flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Packaged & Ready at Expedite Station</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
