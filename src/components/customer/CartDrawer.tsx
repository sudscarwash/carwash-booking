import React from 'react';
import { useOrders } from '../../context/OrderContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Store, Check, Utensils, Bike } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const { 
    cart, 
    cartRestaurantId, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart, 
    getCartSubtotal,
    cartServiceType,
    setCartServiceType,
    cartTableNumber,
    setCartTableNumber,
    hasScannedTableQr
  } = useOrders();
  const { getRestaurantById } = useRestaurants();

  const currentRestaurant = cartRestaurantId ? getRestaurantById(cartRestaurantId) : null;
  const subtotal = getCartSubtotal();
  const tax = Number((subtotal * 0.085).toFixed(2));
  const baseDeliveryFee = currentRestaurant ? currentRestaurant.deliveryFee : 2.99;
  const effectiveDeliveryFee = cartServiceType === 'DELIVERY' ? baseDeliveryFee : 0;
  const total = Number((subtotal + tax + effectiveDeliveryFee).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D9E2D9] bg-[#F5F7F4] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#DE5124] text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#132218] font-display">Your Order Cart</h2>
                {currentRestaurant && (
                  <p className="text-xs text-[#4F6155] flex items-center gap-1">
                    <Store className="w-3 h-3 text-[#247545]" />
                    <span className="font-semibold truncate max-w-[200px]">{currentRestaurant.name}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white text-[#4F6155] hover:text-[#132218] flex items-center justify-center border border-[#D9E2D9] cursor-pointer shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fulfillment Mode Selector inside Drawer */}
          {cart.length > 0 && (() => {
            const rawServices = currentRestaurant?.supportedServices || ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
            // If user has not scanned table QR, Dine-In is not an available public channel
            const availableServices = hasScannedTableQr 
              ? rawServices 
              : rawServices.filter(s => s !== 'DINE_IN');
            const isDineInOnly = rawServices.length === 1 && rawServices.includes('DINE_IN');

            return (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4F6155]">
                  <span>Ordering Option:</span>
                  <span className="font-semibold text-[#DE5124]">
                    {cartServiceType === 'DINE_IN' ? `🍽️ Dining at ${cartTableNumber}` : cartServiceType === 'TAKEAWAY' ? '🥡 Counter Pickup' : '🛵 Doorstep Delivery'}
                  </span>
                </div>

                {isDineInOnly && !hasScannedTableQr ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-900">
                      <span>🔒</span> In-Store Table QR Required
                    </span>
                    <span className="text-[11px] text-amber-800 block">
                      This store only accepts orders placed by seated diners scanning physical table QR stands.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-[#D9E2D9]">
                    {hasScannedTableQr && rawServices.includes('DINE_IN') && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('DINE_IN')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          cartServiceType === 'DINE_IN'
                            ? 'bg-[#247545] text-white shadow-2xs'
                            : 'text-[#4F6155] hover:bg-[#F5F7F4]'
                        }`}
                      >
                        <span>🍽️ Dine-In</span>
                      </button>
                    )}
                    {availableServices.includes('TAKEAWAY') && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('TAKEAWAY')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          cartServiceType === 'TAKEAWAY'
                            ? 'bg-[#2C6E8E] text-white shadow-2xs'
                            : 'text-[#4F6155] hover:bg-[#F5F7F4]'
                        }`}
                      >
                        <span>🥡 Pickup</span>
                      </button>
                    )}
                    {availableServices.includes('DELIVERY') && (
                      <button
                        type="button"
                        onClick={() => setCartServiceType('DELIVERY')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          cartServiceType === 'DELIVERY'
                            ? 'bg-[#DE5124] text-white shadow-2xs'
                            : 'text-[#4F6155] hover:bg-[#F5F7F4]'
                        }`}
                      >
                        <span>🛵 Delivery</span>
                      </button>
                    )}
                  </div>
                )}

                {hasScannedTableQr && cartServiceType === 'DINE_IN' && (
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#D9E2D9] text-xs">
                    <span className="text-[11px] font-semibold text-[#4F6155]">Seated Table:</span>
                    <span className="font-bold text-[#247545] bg-[#E1F0E6] px-2.5 py-0.5 rounded-lg border border-[#247545]/20">
                      {cartTableNumber} (Verified)
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Cart Item List */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#F5F7F4] text-[#7A8E80] flex items-center justify-center mx-auto border border-[#D9E2D9]">
                <ShoppingBag className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-sm font-bold text-[#132218]">Your cart is empty</h3>
              <p className="text-xs text-[#7A8E80] max-w-xs mx-auto">
                Explore dishes from artisanal neighborhood kitchens and add them to your cart.
              </p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-[#EDF1EC]">
              {cart.map(item => (
                <div key={item.cartItemId} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#132218]">{item.menuItem.name}</h4>
                      <span className="text-xs font-mono font-bold text-[#DE5124]">
                        ${item.itemTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-[#BA2D2D] hover:text-[#942020] p-1 rounded-md hover:bg-[#FDE8E8] transition-colors cursor-pointer"
                      title="Remove dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Addons List */}
                  {item.selectedAddons.length > 0 && (
                    <div className="text-[11px] text-[#4F6155] space-y-0.5 pl-2 border-l-2 border-[#DE5124]/30">
                      {item.selectedAddons.map(a => (
                        <div key={a.optionId} className="flex items-center justify-between">
                          <span>• {a.optionName}</span>
                          {a.priceDelta > 0 && <span className="font-mono text-[10px]">+${a.priceDelta.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Instructions */}
                  {item.specialInstructions && (
                    <p className="text-[11px] italic text-[#7A8E80] bg-[#F5F7F4] p-1.5 rounded-md">
                      Note: &quot;{item.specialInstructions}&quot;
                    </p>
                  )}

                  {/* Quantity Adjustment */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg p-0.5">
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#4F6155] hover:bg-white transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold font-mono text-[#132218]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#4F6155] hover:bg-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-[11px] text-[#7A8E80]">
                      ${(item.itemTotal / item.quantity).toFixed(2)} each
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Calculations and Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-6 bg-[#F5F7F4] border-t border-[#D9E2D9] space-y-4">
            <div className="space-y-1.5 text-xs text-[#4F6155]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-[#132218]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8.5%)</span>
                <span className="font-mono font-medium text-[#132218]">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {cartServiceType === 'DINE_IN' 
                    ? 'Table Service Fee' 
                    : cartServiceType === 'TAKEAWAY' 
                    ? 'Pickup Fee' 
                    : 'Delivery Fee'}
                </span>
                <span className="font-mono font-medium text-[#132218]">
                  {effectiveDeliveryFee === 0 ? (
                    <span className="text-[#247545] font-bold">FREE ($0.00)</span>
                  ) : (
                    `$${effectiveDeliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D9E2D9] flex justify-between text-sm font-bold text-[#132218]">
                <span>Estimated Total</span>
                <span className="font-mono text-base text-[#DE5124]">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="px-3 py-3 rounded-xl border border-[#D9E2D9] text-[#7A8E80] hover:text-[#BA2D2D] hover:border-[#BA2D2D] text-xs font-semibold transition-colors cursor-pointer"
                title="Clear entire cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="flex-1 bg-[#DE5124] hover:bg-[#BF3F16] text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <span>
                  {cartServiceType === 'DINE_IN'
                    ? `Order to ${cartTableNumber}`
                    : cartServiceType === 'TAKEAWAY'
                    ? 'Order for Self-Pickup'
                    : 'Proceed to Checkout'}
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <span>${total.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
