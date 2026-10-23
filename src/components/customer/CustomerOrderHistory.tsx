import React from 'react';
import { useOrders } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ShoppingBag, ChevronRight, Store, Calendar, ArrowRight } from 'lucide-react';

interface CustomerOrderHistoryProps {
  onSelectOrder: (order: Order) => void;
  onExplore: () => void;
}

export const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({
  onSelectOrder,
  onExplore,
}) => {
  const { orders } = useOrders();
  const { currentUser } = useAuth();

  // Filter orders for current customer
  const userOrders = orders.filter(o => o.customerId === currentUser.id || currentUser.role === 'SUPER_ADMIN');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#132218] font-display">Your Order History</h1>
          <p className="text-xs text-[#4F6155] mt-0.5">Track active deliveries or review past artisanal meals</p>
        </div>

        <button
          onClick={onExplore}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DE5124] text-white text-xs font-bold hover:bg-[#BF3F16] transition-colors cursor-pointer shadow-xs"
        >
          <span>Find More Food</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {userOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#D9E2D9] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F7F4] text-[#7A8E80] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-[#132218]">No orders found yet</h3>
          <p className="text-xs text-[#4F6155] max-w-sm mx-auto">
            Explore authentic local kitchens and treat yourself to fresh handcrafted food.
          </p>
          <button
            onClick={onExplore}
            className="px-5 py-2.5 rounded-xl bg-[#DE5124] text-white text-xs font-bold hover:bg-[#BF3F16] transition-colors shadow-xs"
          >
            Explore Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map(order => (
            <div
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="bg-white rounded-2xl p-5 border border-[#D9E2D9] hover:border-[#B8C7B8] shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#132218] bg-[#F5F7F4] px-2.5 py-1 rounded-md border border-[#D9E2D9]">
                    #{order.orderNumber}
                  </span>
                  <StatusBadge status={order.status} />
                  <span className="text-[11px] text-[#7A8E80] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.placedAt).toLocaleDateString()} at {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-[#132218] flex items-center gap-1.5 font-display">
                    <Store className="w-3.5 h-3.5 text-[#DE5124]" />
                    {order.restaurantName}
                  </h3>
                  <p className="text-xs text-[#4F6155] line-clamp-1 mt-0.5">
                    {order.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EDF1EC]">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-[#7A8E80] uppercase font-bold">Total Paid</p>
                  <p className="font-mono text-base font-extrabold text-[#DE5124]">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-[#F5F7F4] flex items-center justify-center text-[#4F6155] group-hover:bg-[#DE5124] group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
