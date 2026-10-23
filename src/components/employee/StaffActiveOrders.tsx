import React, { useState } from 'react';
import { Order, Restaurant } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { StaffOrderModifierModal } from './StaffOrderModifierModal';
import { CashierCheckoutTerminal } from '../common/CashierCheckoutTerminal';
import { 
  Edit3, 
  Trash2, 
  Receipt, 
  Utensils, 
  Clock, 
  CheckCircle2, 
  Plus, 
  AlertCircle,
  Coffee,
  DollarSign
} from 'lucide-react';

interface StaffActiveOrdersProps {
  restaurant: Restaurant;
  onOpenNewOrder?: () => void;
}

export const StaffActiveOrders: React.FC<StaffActiveOrdersProps> = ({
  restaurant,
  onOpenNewOrder,
}) => {
  const { orders, updateOrderStatus, cancelOrder } = useOrders();
  const { currentUser } = useAuth();

  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderForCashier, setSelectedOrderForCashier] = useState<Order | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Filter orders for this restaurant that are not yet delivered/cancelled
  const activeOrders = orders.filter(o => {
    if (o.restaurantId !== restaurant.id) return false;
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)) return false;
    if (filterType === 'DINE_IN') return o.serviceType === 'DINE_IN';
    if (filterType === 'TAKEAWAY') return o.serviceType === 'TAKEAWAY';
    if (filterType === 'DELIVERY') return o.serviceType === 'DELIVERY';
    return true;
  });

  const handleCancelOrder = (orderId: string, orderNumber: string) => {
    const reason = window.prompt(`Please enter the cancellation reason for Order #${orderNumber}:`, 'Customer requested table cancellation');
    if (reason) {
      cancelOrder(orderId, reason, false);
    }
  };

  const calculateElapsedMinutes = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / (1000 * 60)));
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Counter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#D9E2D9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DE5124] animate-pulse"></span>
            <h2 className="text-lg font-extrabold text-[#132218] font-display">
              Active Table & Ticket Manager
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5F7F4] border border-[#D9E2D9] text-xs font-mono font-bold text-[#132218]">
              {activeOrders.length} Open
            </span>
          </div>
          <p className="text-xs text-[#4F6155] mt-0.5">
            Modify orders, add extra dishes for diners, remove cancelled items, or settle bills
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Service Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#F5F7F4] p-1 rounded-xl border border-[#D9E2D9]">
            {[
              { id: 'ALL', label: 'All Open' },
              { id: 'DINE_IN', label: 'Dine-In' },
              { id: 'TAKEAWAY', label: 'Takeaway' },
              { id: 'DELIVERY', label: 'Delivery' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === f.id
                    ? 'bg-[#132218] text-white shadow-2xs'
                    : 'text-[#4F6155] hover:text-[#132218]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {onOpenNewOrder && (
            <button
              onClick={onOpenNewOrder}
              className="px-4 py-2 rounded-xl bg-[#DE5124] hover:bg-[#BF3F16] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Take New Table Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders List / Cards */}
      {activeOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-[#D9E2D9] space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F7F4] text-[#7B8E81] flex items-center justify-center mx-auto">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#132218] font-display">No Active Tables or Orders</h3>
          <p className="text-xs text-[#4F6155] max-w-sm mx-auto">
            All tables are currently settled and closed. Use &quot;Take New Table Order&quot; to punch in an order for arriving guests.
          </p>
          {onOpenNewOrder && (
            <button
              onClick={onOpenNewOrder}
              className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold shadow-xs hover:bg-[#BF3F16] transition-colors cursor-pointer"
            >
              Start Table Order
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map(order => {
            const elapsedMins = calculateElapsedMinutes(order.placedAt);
            const totalItemsCount = order.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-[#D9E2D9] shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 bg-[#F5F7F4] border-b border-[#D9E2D9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {order.serviceType === 'DINE_IN' ? (
                      <span className="px-2.5 py-1 rounded-xl bg-[#132218] text-white font-mono font-extrabold text-xs flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-[#247545]" />
                        <span>Table {order.tableNumber || 'Walk-in'}</span>
                      </span>
                    ) : order.serviceType === 'TAKEAWAY' ? (
                      <span className="px-2.5 py-1 rounded-xl bg-[#2C6E8E] text-white font-mono font-extrabold text-xs">
                        🛍️ Takeaway {order.pickupTime ? `• ${order.pickupTime}` : ''}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-[#DE5124] text-white font-mono font-extrabold text-xs">
                        🛵 Delivery
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-[#4F6155]">
                      #{order.orderNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} size="sm" />
                    <span className="text-[11px] font-mono text-[#7B8E81] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {elapsedMins}m
                    </span>
                  </div>
                </div>

                {/* Items preview list */}
                <div className="p-4 flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#7B8E81] pb-1 border-b border-[#EDF1EC]">
                    <span>{totalItemsCount} dish{totalItemsCount !== 1 ? 'es' : ''} on ticket</span>
                    <span className="font-bold text-[#132218]">
                      Guest: {order.customerName}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-start justify-between text-xs gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-[#F5F7F4] text-[#132218] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#D9E2D9]">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-[#132218] leading-tight">
                            {item.itemName}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[#4F6155] shrink-0">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.specialNotes && (
                    <div className="p-2 rounded-xl bg-[#FFF9E6] border border-[#F5E296] text-[11px] text-[#8C6207]">
                      Note: {order.specialNotes}
                    </div>
                  )}
                </div>

                {/* Financial Total & Edit Actions Bar */}
                <div className="p-4 bg-[#FAFBF9] border-t border-[#D9E2D9] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7B8E81] block">
                        Ticket Total
                      </span>
                      <span className="font-mono text-lg font-black text-[#132218]">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveReceiptOrder(order)}
                        className="px-2.5 py-1.5 rounded-xl border border-[#D9E2D9] bg-white hover:bg-[#EAEFEA] text-xs font-bold text-[#4F6155] flex items-center gap-1 cursor-pointer"
                        title="View bill receipt breakdown"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </button>

                      <button
                        onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                        className="p-1.5 rounded-xl border border-[#F9D0C4] bg-[#FDEEE9] hover:bg-[#F9C3B3] text-[#DE5124] cursor-pointer"
                        title="Cancel ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Courier Milestone Status for Delivery orders */}
                  {order.serviceType === 'DELIVERY' && (
                    <div className="p-2.5 rounded-xl bg-[#F5F7F4] border border-[#D9E2D9] text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-[#132218]">
                        <span className="w-2 h-2 rounded-full bg-[#DE5124] animate-pulse" />
                        <span>Courier: {order.runnerName || 'Searching...'}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#247545] bg-white px-2 py-0.5 rounded border border-[#D9E2D9]">
                        {order.deliveryMilestone === 'ARRIVED_AT_RESTAURANT' ? 'At Store Counter' :
                         order.deliveryMilestone === 'PICKED_UP_EN_ROUTE' ? 'Food In Transit' :
                         order.deliveryMilestone === 'NEARBY_APPROACHING' ? 'Near Customer' :
                         order.deliveryMilestone === 'ARRIVED_AT_DOORSTEP' ? 'At Doorstep' :
                         order.runnerName ? 'En Route to Store' : 'Unassigned'}
                      </span>
                    </div>
                  )}

                  {/* Primary Edit Order Button */}
                  <button
                    onClick={() => setSelectedOrderForEdit(order)}
                    className="w-full py-2.5 rounded-xl bg-[#132218] hover:bg-[#DE5124] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modify Order (Add / Cancel Items)</span>
                  </button>

                  {/* Cashier Register Settle Button */}
                  <button
                    onClick={() => setSelectedOrderForCashier(order)}
                    className="w-full py-2.5 rounded-xl bg-[#247545] hover:bg-[#1B5733] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cashier Settle (Cash & Change Return)</span>
                  </button>

                  {/* Advance status: Mark served / Settle */}
                  {order.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'DELIVERED', currentUser.firstName, 'EMPLOYEE', 'Served to table & closed')}
                      className="w-full py-2 rounded-xl bg-[#132218] hover:bg-[#2B3F31] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Table Served</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Order Modifier Modal */}
      {selectedOrderForEdit && (
        <StaffOrderModifierModal
          order={selectedOrderForEdit}
          isOpen={!!selectedOrderForEdit}
          onClose={() => setSelectedOrderForEdit(null)}
        />
      )}

      {/* Bill Receipt Preview Modal */}
      {activeReceiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#D9E2D9]">
            <div className="text-center pb-3 border-b border-dashed border-[#D9E2D9]">
              <h3 className="font-extrabold text-base text-[#132218] font-display">
                {activeReceiptOrder.restaurantName}
              </h3>
              <p className="text-[11px] text-[#7B8E81] mt-0.5">
                {activeReceiptOrder.serviceType === 'DINE_IN' ? `Table ${activeReceiptOrder.tableNumber}` : 'Takeaway'} • #{activeReceiptOrder.orderNumber}
              </p>
              <p className="text-[10px] text-[#7B8E81]">
                {new Date(activeReceiptOrder.placedAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto text-xs divide-y divide-[#F5F7F4]">
              {activeReceiptOrder.items.map(item => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#132218]">
                      {item.quantity}x {item.itemName}
                    </span>
                    {item.selectedAddons?.map(a => (
                      <div key={a.optionId} className="text-[10px] text-[#7B8E81] pl-3">
                        + {a.optionName}
                      </div>
                    ))}
                  </div>
                  <span className="font-mono font-bold text-[#132218]">
                    ${item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-dashed border-[#D9E2D9] space-y-1 text-xs">
              <div className="flex justify-between text-[#7B8E81]">
                <span>Subtotal</span>
                <span className="font-mono">${activeReceiptOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#7B8E81]">
                <span>Tax (8.5%)</span>
                <span className="font-mono">${activeReceiptOrder.tax.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#132218] flex justify-between font-extrabold text-sm text-[#132218]">
                <span>Total Due</span>
                <span className="font-mono font-black">${activeReceiptOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-[#132218] text-white text-xs font-bold hover:bg-[#DE5124] transition-colors cursor-pointer"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setActiveReceiptOrder(null)}
                className="px-4 py-2 rounded-xl border border-[#D9E2D9] text-xs font-bold text-[#4F6155] hover:bg-[#F5F7F4] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Register Settle Modal */}
      {selectedOrderForCashier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#F5F7F4] rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-[#D9E2D9] my-6 max-h-[92vh] overflow-y-auto">
            <CashierCheckoutTerminal
              restaurant={restaurant}
              preSelectedOrder={selectedOrderForCashier}
              onClose={() => setSelectedOrderForCashier(null)}
              isModal
            />
          </div>
        </div>
      )}
    </div>
  );
};
