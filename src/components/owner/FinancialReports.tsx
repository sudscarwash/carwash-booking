import React, { useState, useMemo } from 'react';
import { Restaurant, Order } from '../../types';
import { useOrders } from '../../context/OrderContext';
import { StatementPdfModal } from './StatementPdfModal';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Filter, 
  Percent, 
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';

interface FinancialReportsProps {
  restaurant: Restaurant;
}

type TimeframePreset = 'TODAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const FinancialReports: React.FC<FinancialReportsProps> = ({ restaurant }) => {
  const { orders, getOrdersByRestaurant } = useOrders();
  const allOrders = useMemo(() => {
    if (getOrdersByRestaurant) {
      return getOrdersByRestaurant(restaurant.id);
    }
    return (orders || []).filter(o => o.restaurantId === restaurant.id);
  }, [orders, getOrdersByRestaurant, restaurant.id]);

  const [timeframe, setTimeframe] = useState<TimeframePreset>('THIS_MONTH');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Filter orders by date range and status
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (timeframe === 'TODAY') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    } else if (timeframe === 'LAST_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day - 6; // Last Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeframe === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
    } else if (timeframe === 'LAST_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (timeframe === 'CUSTOM') {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    return allOrders.filter(order => {
      // Exclude cancelled/rejected for revenue accounting
      if (order.status === 'CANCELLED' || order.status === 'REJECTED') return false;
      
      const orderDate = new Date(order.placedAt);
      const inDateRange = orderDate >= startDate && orderDate <= endDate;
      const inService = serviceFilter === 'ALL' || order.serviceType === serviceFilter;

      return inDateRange && inService;
    });
  }, [allOrders, timeframe, customStart, customEnd, serviceFilter]);

  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case 'TODAY': return "Today's Ledger";
      case 'THIS_WEEK': return 'This Week';
      case 'LAST_WEEK': return 'Last Week';
      case 'THIS_MONTH': return 'This Month';
      case 'LAST_MONTH': return 'Last Month';
      case 'CUSTOM': return 'Custom Period';
      default: return 'All Time';
    }
  }, [timeframe]);

  const startDateFormatted = useMemo(() => {
    if (filteredOrders.length === 0) return customStart;
    const sorted = [...filteredOrders].sort((a, b) => a.placedAt.localeCompare(b.placedAt));
    return sorted[0].placedAt.split('T')[0];
  }, [filteredOrders, customStart]);

  const endDateFormatted = useMemo(() => {
    if (filteredOrders.length === 0) return customEnd;
    const sorted = [...filteredOrders].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    return sorted[0].placedAt.split('T')[0];
  }, [filteredOrders, customEnd]);

  // Aggregated Financial Metrics
  const grossSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.subtotal - (o.discountAmount || 0)), 0);
  }, [filteredOrders]);

  const totalDiscounts = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  }, [filteredOrders]);

  const totalTaxCollected = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.tax, 0);
  }, [filteredOrders]);

  const totalDeliveryFees = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  }, [filteredOrders]);

  const platformCommissionAmount = useMemo(() => {
    return grossSales * (restaurant.commissionRate / 100);
  }, [grossSales, restaurant.commissionRate]);

  const netRestaurantPayout = useMemo(() => {
    // If in-house runner, restaurant keeps delivery fee; if platform runner, runner gets delivery fee
    const deliveryIncome = restaurant.fulfillmentType === 'IN_HOUSE_RUNNER' ? totalDeliveryFees : 0;
    return grossSales - platformCommissionAmount + totalTaxCollected + deliveryIncome;
  }, [grossSales, platformCommissionAmount, totalTaxCollected, totalDeliveryFees, restaurant.fulfillmentType]);

  const avgTicketSize = useMemo(() => {
    if (filteredOrders.length === 0) return 0;
    return grossSales / filteredOrders.length;
  }, [grossSales, filteredOrders.length]);

  // Daily breakdown within timeframe
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; sales: number; commission: number; net: number }>();
    
    filteredOrders.forEach(o => {
      const d = o.placedAt.split('T')[0];
      const existing = map.get(d) || { date: d, orders: 0, sales: 0, commission: 0, net: 0 };
      const sale = o.subtotal - (o.discountAmount || 0);
      const comm = sale * (restaurant.commissionRate / 100);
      existing.orders += 1;
      existing.sales += sale;
      existing.commission += comm;
      existing.net += (sale - comm);
      map.set(d, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders, restaurant.commissionRate]);

  // CSV Export Generator
  const exportToCSV = () => {
    setIsExporting(true);
    
    const headers = [
      'Order ID',
      'Order Number',
      'Placed At',
      'Customer',
      'Service Mode',
      'Subtotal ($)',
      'Promo Discount ($)',
      'Gross ($)',
      'Platform Fee Rate (%)',
      'Platform Fee ($)',
      'Tax ($)',
      'Delivery Fee ($)',
      'Total Paid ($)',
      'Payment Method',
      'Payment Status',
      'Status'
    ];

    const rows = filteredOrders.map(o => {
      const disc = o.discountAmount || 0;
      const gross = o.subtotal - disc;
      const comm = gross * (restaurant.commissionRate / 100);
      return [
        o.id,
        o.orderNumber,
        `"${new Date(o.placedAt).toLocaleString()}"`,
        `"${o.customerName}"`,
        o.serviceType,
        o.subtotal.toFixed(2),
        disc.toFixed(2),
        gross.toFixed(2),
        restaurant.commissionRate,
        comm.toFixed(2),
        o.tax.toFixed(2),
        o.deliveryFee.toFixed(2),
        o.totalAmount.toFixed(2),
        o.paymentMethod,
        o.paymentStatus,
        o.status
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${restaurant.slug}_financial_statement_${timeframe.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
      setExportMessage('Financial statement CSV exported successfully!');
      setTimeout(() => setExportMessage(null), 3500);
    }, 400);
  };

  // Print P&L Statement
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-[#DCE3DD] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#2F7A4F]" />
            <h3 className="font-bold text-base text-[#16241B] font-display">
              Financial Extraction & Merchant Statements
            </h3>
          </div>
          <p className="text-xs text-[#526056] mt-0.5">
            Download weekly/monthly sales ledgers, commission deductions, and net payout statements for accounting and tax filing.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16241B] hover:bg-[#2F7A4F] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-[#8BAE97]" />
            <span>Save as PDF / Official Statement</span>
          </button>

          <button
            onClick={exportToCSV}
            disabled={isExporting || filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F7A4F] hover:bg-[#235D3B] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'Generating CSV...' : 'Export Excel / CSV'}</span>
          </button>

          <button
            onClick={handlePrintStatement}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F6F7F5] border border-[#DCE3DD] text-[#16241B] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#526056]" />
            <span>Quick Print</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="p-3 bg-[#EBF3EE] border border-[#2F7A4F]/30 rounded-2xl text-xs text-[#2F7A4F] font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Date & Service Filters */}
      <div className="bg-white p-4 rounded-3xl border border-[#DCE3DD] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Timeframe Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'LAST_WEEK', label: 'Last Week' },
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'LAST_MONTH', label: 'Last Month' },
              { key: 'CUSTOM', label: 'Custom Range' },
            ] as { key: TimeframePreset; label: string }[]
          ).map(p => (
            <button
              key={p.key}
              onClick={() => setTimeframe(p.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                timeframe === p.key
                  ? 'bg-[#16241B] text-white shadow-xs'
                  : 'bg-[#F6F7F5] text-[#526056] border border-[#DCE3DD] hover:text-[#16241B]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range pickers */}
        {timeframe === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-1.5 text-xs text-[#16241B]"
            />
            <span className="text-[#526056]">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-2.5 py-1.5 text-xs text-[#16241B]"
            />
          </div>
        )}

        {/* Service filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#526056]" />
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value as any)}
            className="bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-1.5 text-xs text-[#16241B] font-semibold"
          >
            <option value="ALL">All Services (Dine-In, Takeaway, Delivery)</option>
            <option value="DINE_IN">Dine-In Orders</option>
            <option value="TAKEAWAY">Takeaway (Pickup)</option>
            <option value="DELIVERY">Delivery Only</option>
          </select>
        </div>
      </div>

      {/* 4 Financial P&L Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#DCE3DD] shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526056] block">Gross Food Sales</span>
          <p className="text-2xl font-mono font-extrabold text-[#16241B]">${grossSales.toFixed(2)}</p>
          <div className="flex items-center justify-between text-[11px] text-[#526056] pt-2 border-t border-[#DCE3DD]">
            <span>Total Tickets</span>
            <span className="font-bold text-[#16241B]">{filteredOrders.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#DCE3DD] shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526056] block">Platform Fee ({restaurant.commissionRate}%)</span>
          <p className="text-2xl font-mono font-extrabold text-[#E0562B]">-${platformCommissionAmount.toFixed(2)}</p>
          <div className="flex items-center justify-between text-[11px] text-[#526056] pt-2 border-t border-[#DCE3DD]">
            <span>Net Commission</span>
            <span className="font-semibold text-[#E0562B]">Retained by platform</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#DCE3DD] shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#526056] block">Discounts & Promo Absorbed</span>
          <p className="text-2xl font-mono font-extrabold text-[#C48214]">${totalDiscounts.toFixed(2)}</p>
          <div className="flex items-center justify-between text-[11px] text-[#526056] pt-2 border-t border-[#DCE3DD]">
            <span>Avg Ticket Size</span>
            <span className="font-mono font-bold text-[#16241B]">${avgTicketSize.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-[#EBF3EE] p-5 rounded-3xl border border-[#2F7A4F]/30 shadow-xs space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F7A4F] block">Net Merchant Payout</span>
          <p className="text-2xl font-mono font-extrabold text-[#2F7A4F]">${netRestaurantPayout.toFixed(2)}</p>
          <div className="flex items-center justify-between text-[11px] text-[#2F7A4F] pt-2 border-t border-[#2F7A4F]/20">
            <span>Payment Status</span>
            <span className="font-bold">Automated BIBD / Wire</span>
          </div>
        </div>
      </div>

      {/* Daily Accounting Ledger Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-[#16241B] font-display">Daily Revenue & Fee Ledger</h4>
          <span className="text-xs text-[#526056]">{dailyBreakdown.length} active trading days</span>
        </div>

        {dailyBreakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#526056] bg-[#F6F7F5] rounded-2xl">
            No completed financial transactions recorded in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DCE3DD] text-[#526056] font-semibold">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Completed Tickets</th>
                  <th className="pb-3">Gross Sales</th>
                  <th className="pb-3">Platform Commission</th>
                  <th className="pb-3 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3DD]/50">
                {dailyBreakdown.map(day => (
                  <tr key={day.date} className="hover:bg-[#F6F7F5]/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-[#16241B]">{day.date}</td>
                    <td className="py-3 text-[#526056]">{day.orders} orders</td>
                    <td className="py-3 font-mono font-semibold text-[#16241B]">${day.sales.toFixed(2)}</td>
                    <td className="py-3 font-mono text-[#E0562B]">-${day.commission.toFixed(2)}</td>
                    <td className="py-3 font-mono font-extrabold text-[#2F7A4F] text-right">${day.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Order Statement Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#DCE3DD] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-[#16241B] font-display">Individual Order Line Items ({filteredOrders.length})</h4>
          <span className="text-xs text-[#526056]">Export above to view full columns</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#526056] bg-[#F6F7F5] rounded-2xl">
            No orders found for this timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DCE3DD] text-[#526056] font-semibold">
                  <th className="pb-3">Order #</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Service Mode</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Subtotal</th>
                  <th className="pb-3">Promo Disc.</th>
                  <th className="pb-3">Platform Fee ({restaurant.commissionRate}%)</th>
                  <th className="pb-3 text-right">Net Store Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3DD]/50">
                {filteredOrders.map(order => {
                  const disc = order.discountAmount || 0;
                  const gross = order.subtotal - disc;
                  const comm = gross * (restaurant.commissionRate / 100);
                  const net = gross - comm;

                  return (
                    <tr key={order.id} className="hover:bg-[#F6F7F5]/50 transition-colors">
                      <td className="py-3 font-mono font-bold text-[#16241B]">{order.orderNumber}</td>
                      <td className="py-3 text-[#526056]">{new Date(order.placedAt).toLocaleDateString()} {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F6F7F5] text-[#16241B] border border-[#DCE3DD]">
                          {order.serviceType}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-[#16241B]">{order.customerName}</td>
                      <td className="py-3 font-mono text-[#526056]">${order.subtotal.toFixed(2)}</td>
                      <td className="py-3 font-mono text-[#C48214]">{disc > 0 ? `-$${disc.toFixed(2)}` : '$0.00'}</td>
                      <td className="py-3 font-mono text-[#E0562B]">-${comm.toFixed(2)}</td>
                      <td className="py-3 font-mono font-extrabold text-[#2F7A4F] text-right">${net.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPdfModal && (
        <StatementPdfModal
          restaurant={restaurant}
          orders={filteredOrders}
          timeframeLabel={timeframeLabel}
          startDateStr={startDateFormatted}
          endDateStr={endDateFormatted}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
