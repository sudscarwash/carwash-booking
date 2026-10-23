import React from 'react';
import { useOrders } from '../../context/OrderContext';
import { 
  Bell, 
  X, 
  Volume2, 
  VolumeX, 
  Bike, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface GlobalNotificationPopupProps {
  onSelectOrder?: (orderId: string) => void;
}

export const GlobalNotificationPopup: React.FC<GlobalNotificationPopupProps> = ({ onSelectOrder }) => {
  const { 
    activePopupNotif, 
    dismissPopupNotif, 
    soundEnabled, 
    setSoundEnabled, 
    desktopPermission, 
    requestDesktopPermission,
    orders,
    setActiveOrder 
  } = useOrders();

  if (!activePopupNotif) return null;

  const notif = activePopupNotif;
  const isUrgent = notif.type === 'ORDER_CANCELLED' || notif.type === 'CANCELLATION_REQUESTED' || notif.title.toLowerCase().includes('emergency');
  const isProximity = notif.title.toLowerCase().includes('nearby') || notif.title.toLowerCase().includes('doorstep');
  const isPayment = notif.type === 'REFUND_PROCESSED' || notif.type === 'RUNNER_COMPENSATION' || notif.title.toLowerCase().includes('refund');
  const isDelivered = notif.type === 'ORDER_DELIVERED';
  const isReady = notif.type === 'ORDER_READY';

  const getIcon = () => {
    if (isUrgent) return <XCircle className="w-5 h-5 text-rose-600 animate-pulse" />;
    if (isProximity) return <Bike className="w-5 h-5 text-sky-600 animate-bounce" />;
    if (isPayment) return <DollarSign className="w-5 h-5 text-emerald-600" />;
    if (isDelivered) return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    if (isReady) return <Flame className="w-5 h-5 text-amber-600" />;
    return <Bell className="w-5 h-5 text-[#DE5124]" />;
  };

  const getBorderColor = () => {
    if (isUrgent) return 'border-rose-400/80 bg-rose-50/95';
    if (isProximity) return 'border-sky-400/80 bg-sky-50/95';
    if (isPayment) return 'border-emerald-400/80 bg-emerald-50/95';
    return 'border-[#D9E2D9] bg-white/95';
  };

  const handleActionClick = () => {
    if (notif.orderId) {
      const match = orders.find(o => o.id === notif.orderId);
      if (match) {
        setActiveOrder(match);
      }
      if (onSelectOrder) {
        onSelectOrder(notif.orderId);
      }
    }
    dismissPopupNotif();
  };

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 max-w-sm sm:max-w-md pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className={`p-4 rounded-3xl shadow-2xl backdrop-blur-md border ${getBorderColor()} text-[#132218] space-y-3 relative overflow-hidden transition-all`}>
        {/* Subtle animated indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#DE5124] to-transparent animate-pulse" />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white shadow-2xs border border-stone-200/80 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  {notif.type.replace(/_/g, ' ')}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DE5124] animate-ping" />
              </div>
              <h4 className="font-extrabold text-sm text-[#132218] leading-tight break-words font-display">
                {notif.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
              className="p-1.5 rounded-xl hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#247545]" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            </button>
            <button
              type="button"
              onClick={dismissPopupNotif}
              title="Dismiss notification"
              className="p-1.5 rounded-xl hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message body - full message with zero clipping */}
        <p className="text-xs text-stone-700 leading-relaxed font-medium break-words whitespace-pre-line max-h-48 overflow-y-auto pr-1">
          {notif.message}
        </p>

        {/* Interactive Action Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/50">
          <span className="text-[10px] text-stone-400 font-mono">
            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          <div className="flex items-center gap-2">
            {notif.orderId && (
              <button
                type="button"
                onClick={handleActionClick}
                className="px-3 py-1.5 rounded-xl bg-[#132218] hover:bg-[#253A2C] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
              >
                <span>View Order Details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={dismissPopupNotif}
              className="px-2.5 py-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-300/80 text-stone-700 text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Prompt to allow native desktop notifications if not yet granted */}
        {desktopPermission !== 'granted' && (
          <div className="pt-2 border-t border-dashed border-stone-300 flex items-center justify-between text-[11px] text-stone-600 bg-white/60 p-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DE5124]" />
              <span>Get notified even when tab is backgrounded:</span>
            </div>
            <button
              type="button"
              onClick={requestDesktopPermission}
              className="px-2 py-1 bg-[#DE5124] text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#C9471E] transition-colors"
            >
              Allow Popups
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
