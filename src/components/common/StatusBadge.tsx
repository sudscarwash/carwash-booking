import React from 'react';
import { OrderStatus, OrderingMode } from '../../types';
import { Clock, CheckCircle2, Flame, PackageCheck, Bike, Check, XCircle } from 'lucide-react';

export const StatusBadge: React.FC<{ status: OrderStatus; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  switch (status) {
    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FDF3E1] text-[#C48214] border border-[#EED7A6] ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Pending Kitchen
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#E0F2E6] text-[#247545] border border-[#C2E4CD] ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed
        </span>
      );
    case 'PREPARING':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FDEEE9] text-[#DE5124] border border-[#F9D0C4] ${sizeClasses}`}>
          <Flame className="w-3.5 h-3.5 animate-bounce" />
          Cooking in Kitchen
        </span>
      );
    case 'READY_FOR_PICKUP':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#E1F0F6] text-[#236885] border border-[#C2DFEC] ${sizeClasses}`}>
          <PackageCheck className="w-3.5 h-3.5" />
          Ready for Pickup
        </span>
      );
    case 'OUT_FOR_DELIVERY':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#E1F0F6] text-[#236885] border border-[#C2DFEC] ${sizeClasses}`}>
          <Bike className="w-3.5 h-3.5" />
          Out for Delivery
        </span>
      );
    case 'DELIVERED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#E0F2E6] text-[#247545] border border-[#C2E4CD] ${sizeClasses}`}>
          <Check className="w-3.5 h-3.5" />
          Delivered
        </span>
      );
    case 'CANCELLED':
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FDE8E8] text-[#BA2D2D] border border-[#F8C1C1] ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5" />
          {status === 'CANCELLED' ? 'Cancelled' : 'Declined'}
        </span>
      );
    default:
      return null;
  }
};

export const OrderingModeBadge: React.FC<{ mode: OrderingMode }> = ({ mode }) => {
  if (mode === 'ENABLED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E0F2E6] text-[#247545] border border-[#C2E4CD]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#247545]"></span>
        Ordering Active
      </span>
    );
  }
  if (mode === 'DIRECTORY_ONLY') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#FDF3E1] text-[#C48214] border border-[#EED7A6]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C48214]"></span>
        Directory Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#EDF1EC] text-[#4F6155] border border-[#D9E2D9]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7A8E80]"></span>
      View Only
    </span>
  );
};
