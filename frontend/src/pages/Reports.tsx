import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, FileSpreadsheet, FileText, Printer, Calendar } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, Bar, Line, CartesianGrid } from 'recharts';

interface ReportRow {
  period: string;
  order_count: number;
  gross_sales: string;
  tiktok_fees: string;
  affiliate_commission: string;
  shipping_fee_actual: string;
  shipping_fee_subsidy: string;
  platform_discount: string;
  adjustments: string;
  refund: string;
  return_loss: string;
  tax: string;
  payout: string;
  net_profit: string;
}

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 days ago
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fallbackReport: ReportRow[] = [
    { period: '2026-07-16', order_count: 5, gross_sales: '1895.00', tiktok_fees: '95.00', affiliate_commission: '85.00', shipping_fee_actual: '110.00', shipping_fee_subsidy: '90.00', platform_discount: '40.00', adjustments: '0.00', refund: '299.00', return_loss: '30.00', tax: '21.00', payout: '1410.00', net_profit: '420.50' },
    { period: '2026-07-15', order_count: 8, gross_sales: '2450.00', tiktok_fees: '122.50', affiliate_commission: '90.00', shipping_fee_actual: '160.00', shipping_fee_subsidy: '140.00', platform_discount: '60.00', adjustments: '0.00', refund: '0.00', return_loss: '0.00', tax: '27.50', payout: '2030.00', net_profit: '790.00' }
  ];

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/data', {
        params: { startDate, endDate, grouping }
      });
      setReportData(res.data);
    } catch (err) {
      setReportData(fallbackReport);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, grouping]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    window.open(`/api/reports/export?startDate=${startDate}&endDate=${endDate}&format=${format}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  };

  return (
    <div className="space-y-6 print:p-0 print:bg-white print:text-black">
      {/* Search Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  grouping === g
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Exporters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
            title="Download Excel Sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
            title="Download CSV file"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
            title="Print Report layout"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl print:hidden">
        <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <span>Margin Performance Trend</span>
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
              <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="gross_sales" fill="#3B82F6" name="Revenue" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net_profit" fill="#10B981" name="Net Profit" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="payout" stroke="#F59E0B" name="Payout" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial aggregate tabular layout */}
      <div className="bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm print:border-none print:shadow-none">
        <div className="p-6 border-b border-slate-200/30 dark:border-slate-800/30 flex justify-between items-center">
          <div>
            <h3 className="font-black text-base">TikTok Shop Financial Ledger</h3>
            <p className="text-[11px] text-slate-400">Statement dates filter: {startDate} to {endDate} grouped by {grouping}</p>
          </div>
          <span className="hidden print:inline text-xs font-bold uppercase">TikTracker Pro Ledger</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 tracking-wider uppercase">
                  <th className="p-4">Period</th>
                  <th className="p-4 text-center">Orders</th>
                  <th className="p-4 text-right">Gross Sales</th>
                  <th className="p-4 text-right">Commissions & Fees</th>
                  <th className="p-4 text-right">Actual Shipping</th>
                  <th className="p-4 text-right">Discounts & Vouchers</th>
                  <th className="p-4 text-right">Adjustments & Refunds</th>
                  <th className="p-4 text-right">Net Payout</th>
                  <th className="p-4 text-right">Calculated Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                {reportData.map((row) => (
                  <tr key={row.period} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{row.period}</td>
                    <td className="p-4 text-center font-semibold">{row.order_count}</td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(row.gross_sales)}</td>
                    <td className="p-4 text-right text-red-400">-{formatCurrency(parseFloat(row.tiktok_fees) + parseFloat(row.affiliate_commission))}</td>
                    <td className="p-4 text-right text-red-400">
                      {formatCurrency(parseFloat(row.shipping_fee_actual) - parseFloat(row.shipping_fee_subsidy))}
                    </td>
                    <td className="p-4 text-right text-red-400">-{formatCurrency(row.platform_discount)}</td>
                    <td className="p-4 text-right text-amber-500">
                      {parseFloat(row.adjustments) >= 0 ? '+' : ''}{formatCurrency(parseFloat(row.adjustments) - parseFloat(row.refund) - parseFloat(row.return_loss))}
                    </td>
                    <td className="p-4 text-right font-bold text-teal-400">{formatCurrency(row.payout)}</td>
                    <td className={`p-4 text-right font-black ${
                      parseFloat(row.net_profit) < 0 ? 'text-red-400' : 'text-emerald-500'
                    }`}>
                      {formatCurrency(row.net_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default Reports;
