import React from 'react';
import { Restaurant, Order } from '../../types';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  CheckCircle2, 
  Building2, 
  UtensilsCrossed, 
  Calendar, 
  DollarSign, 
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface StatementPdfModalProps {
  restaurant: Restaurant;
  orders: Order[];
  timeframeLabel: string;
  startDateStr: string;
  endDateStr: string;
  onClose: () => void;
}

export const StatementPdfModal: React.FC<StatementPdfModalProps> = ({
  restaurant,
  orders,
  timeframeLabel,
  startDateStr,
  endDateStr,
  onClose
}) => {
  // Aggregate Financials
  const grossSales = orders.reduce((sum, o) => sum + (o.subtotal - (o.discountAmount || 0)), 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const rawMenuSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const platformFee = grossSales * (restaurant.commissionRate / 100);
  const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
  const totalDeliveryFee = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const netPayout = grossSales - platformFee + totalTax;

  // Breakdown by Service Mode
  const dineInOrders = orders.filter(o => o.serviceType === 'DINE_IN');
  const takeawayOrders = orders.filter(o => o.serviceType === 'TAKEAWAY');
  const deliveryOrders = orders.filter(o => o.serviceType === 'DELIVERY');

  const dineInSales = dineInOrders.reduce((sum, o) => sum + (o.subtotal - (o.discountAmount || 0)), 0);
  const takeawaySales = takeawayOrders.reduce((sum, o) => sum + (o.subtotal - (o.discountAmount || 0)), 0);
  const deliverySales = deliveryOrders.reduce((sum, o) => sum + (o.subtotal - (o.discountAmount || 0)), 0);

  // Top Items Sold
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  orders.forEach(o => {
    o.items.forEach(it => {
      const existing = itemMap.get(it.menuItemId) || { name: it.name, quantity: 0, revenue: 0 };
      existing.quantity += it.quantity;
      existing.revenue += it.price * it.quantity;
      itemMap.set(it.menuItemId, existing);
    });
  });
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Daily Ledger
  const dailyMap = new Map<string, { date: string; orders: number; sales: number; commission: number; net: number }>();
  orders.forEach(o => {
    const d = o.placedAt.split('T')[0];
    const existing = dailyMap.get(d) || { date: d, orders: 0, sales: 0, commission: 0, net: 0 };
    const sale = o.subtotal - (o.discountAmount || 0);
    const comm = sale * (restaurant.commissionRate / 100);
    existing.orders += 1;
    existing.sales += sale;
    existing.commission += comm;
    existing.net += (sale - comm);
    dailyMap.set(d, existing);
  });
  const dailyLedger = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const statementRef = `STMT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${restaurant.id.toUpperCase()}`;
  const generatedAt = new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Top Floating Actions (Hidden during print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2F7A4F] hover:bg-[#235D3B] text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Save as PDF / Print</span>
        </button>
        <button
          onClick={onClose}
          className="p-2.5 bg-white/90 hover:bg-white text-[#16241B] rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Statement Document (A4 Styled Paper) */}
      <div 
        id="printable-statement"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 p-6 sm:p-10 border border-[#DCE3DD] text-[#16241B] space-y-6 print:m-0 print:p-6 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-[#16241B] gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#16241B] text-white flex items-center justify-center font-black text-sm">
                F
              </div>
              <span className="font-extrabold text-sm tracking-wider uppercase text-[#526056]">FoodFindr Merchant Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[#16241B]">
              Merchant Settlement Statement
            </h1>
            <p className="text-xs text-[#526056]">
              Certified Sales Performance & Financial Audit Record
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs">
            <div className="font-mono font-bold text-sm text-[#16241B] bg-[#F6F7F5] px-3 py-1 rounded-lg border border-[#DCE3DD] inline-block">
              {statementRef}
            </div>
            <div className="text-[#526056]">Period: <span className="font-bold text-[#16241B]">{timeframeLabel}</span></div>
            <div className="text-[#526056]">Dates: <span className="font-mono text-[#16241B]">{startDateStr} – {endDateStr}</span></div>
            <div className="text-[#526056]">Generated: <span className="text-[#16241B]">{generatedAt}</span></div>
          </div>
        </div>

        {/* Merchant & Settlement Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] text-xs">
          <div className="space-y-1">
            <span className="font-bold uppercase text-[10px] tracking-wider text-[#526056]">Merchant Profile</span>
            <h2 className="font-bold text-sm text-[#16241B]">{restaurant.name}</h2>
            <p className="text-[#526056]">{restaurant.address}</p>
            <p className="text-[#526056]">District: <span className="font-semibold text-[#16241B]">{restaurant.district}</span> | Phone: {restaurant.phone}</p>
            <p className="text-[#526056]">Halal Certification: <span className="font-semibold text-[#2F7A4F]">{restaurant.halalStatus.replace('_', ' ')}</span></p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-[#DCE3DD] sm:pl-4">
            <span className="font-bold uppercase text-[10px] tracking-wider text-[#526056]">Settlement Account</span>
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#16241B]">
              <Building2 className="w-3.5 h-3.5 text-[#2F7A4F]" />
              <span>Bank Islam Brunei Darussalam (BIBD)</span>
            </div>
            <p className="text-[#526056]">Account: <span className="font-mono font-semibold">00-001-02-398471-9</span></p>
            <p className="text-[#526056]">Contracted Commission: <span className="font-bold text-[#16241B]">{restaurant.commissionRate}%</span></p>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F7A4F]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Direct Bank Settlement Enabled</span>
            </div>
          </div>
        </div>

        {/* Key P&L Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl border border-[#DCE3DD] bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#526056] block">Gross Food Sales</span>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-[#16241B]">${grossSales.toFixed(2)}</div>
            <span className="text-[10px] text-[#526056] block">{orders.length} total orders</span>
          </div>

          <div className="p-3.5 rounded-xl border border-[#DCE3DD] bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#526056] block">Promo Subsidies</span>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-[#C48214]">-${totalDiscounts.toFixed(2)}</div>
            <span className="text-[10px] text-[#526056] block">Vouchers Claimed</span>
          </div>

          <div className="p-3.5 rounded-xl border border-[#DCE3DD] bg-white space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#526056] block">Platform Fee ({restaurant.commissionRate}%)</span>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-[#E0562B]">-${platformFee.toFixed(2)}</div>
            <span className="text-[10px] text-[#526056] block">Platform Services</span>
          </div>

          <div className="p-3.5 rounded-xl border border-[#2F7A4F]/30 bg-[#EBF3EE] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#2F7A4F] block">Net Payable Payout</span>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-[#2F7A4F]">${netPayout.toFixed(2)}</div>
            <span className="text-[10px] text-[#2F7A4F] font-semibold block">Payable to Merchant</span>
          </div>
        </div>

        {/* Service Channel Performance (Dine-In vs Takeaway vs Delivery) */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#526056] flex items-center gap-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#16241B]" />
            <span>Channel Revenue Distribution</span>
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#16241B]">
                <span>🍽️ Dine-In QR</span>
                <span className="font-mono text-[#2F7A4F]">${dineInSales.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#526056]">{dineInOrders.length} orders ({grossSales > 0 ? ((dineInSales / grossSales) * 100).toFixed(0) : 0}% of sales)</p>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#16241B]">
                <span>🥡 Takeaway / Pickup</span>
                <span className="font-mono text-[#2F7A4F]">${takeawaySales.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#526056]">{takeawayOrders.length} orders ({grossSales > 0 ? ((takeawaySales / grossSales) * 100).toFixed(0) : 0}% of sales)</p>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#DCE3DD] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#16241B]">
                <span>🛵 Delivery Orders</span>
                <span className="font-mono text-[#2F7A4F]">${deliverySales.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-[#526056]">{deliveryOrders.length} orders ({grossSales > 0 ? ((deliverySales / grossSales) * 100).toFixed(0) : 0}% of sales)</p>
            </div>
          </div>
        </div>

        {/* Top 5 Revenue Drivers */}
        {topItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#526056] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#16241B]" />
              <span>Top 5 Revenue Menu Items in Period</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#DCE3DD] rounded-xl overflow-hidden">
                <thead className="bg-[#F6F7F5] border-b border-[#DCE3DD] text-[#526056] font-semibold">
                  <tr>
                    <th className="p-2.5">Menu Item Name</th>
                    <th className="p-2.5 text-center">Units Sold</th>
                    <th className="p-2.5 text-right">Gross Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3DD]/60">
                  {topItems.map(item => (
                    <tr key={item.name} className="hover:bg-[#F6F7F5]/50">
                      <td className="p-2.5 font-medium text-[#16241B]">{item.name}</td>
                      <td className="p-2.5 text-center font-mono">{item.quantity} portions</td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#16241B]">${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Accounting Ledger */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#526056] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#16241B]" />
            <span>Daily Trading Ledger Breakdown</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#DCE3DD] rounded-xl overflow-hidden">
              <thead className="bg-[#F6F7F5] border-b border-[#DCE3DD] text-[#526056] font-semibold">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Orders</th>
                  <th className="p-2.5">Gross Sales</th>
                  <th className="p-2.5">Platform Fee ({restaurant.commissionRate}%)</th>
                  <th className="p-2.5 text-right">Net Merchant Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3DD]/60">
                {dailyLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[#526056]">No transactions in this period.</td>
                  </tr>
                ) : (
                  dailyLedger.map(row => (
                    <tr key={row.date} className="hover:bg-[#F6F7F5]/40">
                      <td className="p-2.5 font-mono font-bold text-[#16241B]">{row.date}</td>
                      <td className="p-2.5 text-[#526056]">{row.orders} orders</td>
                      <td className="p-2.5 font-mono text-[#16241B]">${row.sales.toFixed(2)}</td>
                      <td className="p-2.5 font-mono text-[#E0562B]">-${row.commission.toFixed(2)}</td>
                      <td className="p-2.5 font-mono font-extrabold text-[#2F7A4F] text-right">${row.net.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#F6F7F5] border-t-2 border-[#16241B] font-bold text-[#16241B]">
                <tr>
                  <td className="p-2.5">Total Summary</td>
                  <td className="p-2.5">{orders.length} orders</td>
                  <td className="p-2.5 font-mono">${grossSales.toFixed(2)}</td>
                  <td className="p-2.5 font-mono text-[#E0562B]">-${platformFee.toFixed(2)}</td>
                  <td className="p-2.5 font-mono text-[#2F7A4F] text-right text-sm">${netPayout.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sign-off & Audit Seal */}
        <div className="pt-6 border-t border-[#DCE3DD] flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-[#526056]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[#2F7A4F] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Electronic Statement</span>
            </div>
            <p className="text-[11px]">
              This financial ledger is electronically verified and compiled directly from completed restaurant tickets.
            </p>
          </div>

          <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
            <div className="w-48 border-b border-[#16241B] pb-8 mb-1 text-center font-serif italic text-sm text-[#16241B]">
              FoodFindr Settlement Dept.
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#526056] block">
              Authorized Financial Audit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
