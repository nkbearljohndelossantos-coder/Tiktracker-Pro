import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ScanBarcode, Check, AlertCircle, ShoppingBag, HelpCircle } from 'lucide-react';

interface ReturnLog {
  id: number;
  return_id: string;
  order_id: string;
  sku: string;
  tracking_number: string;
  scan_date: string;
  reason: string;
  condition_status: string;
  return_shipping_cost: string;
  refunded_amount: string;
  returned_to_inventory: boolean;
  customer_name?: string;
  product_name?: string;
}

export const Returns: React.FC = () => {
  const [returnLogs, setReturnLogs] = useState<ReturnLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Scan State
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);

  // Return submission form
  const [selectedSku, setSelectedSku] = useState('');
  const [reason, setReason] = useState('Incorrect product received');
  const [condition, setCondition] = useState<'GOOD' | 'DAMAGED_SELLABLE' | 'DAMAGED_UNSELLABLE'>('GOOD');
  const [returnShippingCost, setReturnShippingCost] = useState('30.00');
  const [refundedAmount, setRefundedAmount] = useState('299.00');
  const [returnToStock, setReturnToStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fallbackLogs: ReturnLog[] = [
    { id: 1, return_id: 'RET-574919559123456793-1', order_id: '574919559123456793', sku: 'SKU-MUG-001', tracking_number: 'JX123456796PH', scan_date: '2026-07-16T10:05:00.000Z', reason: 'Customer changed mind', condition_status: 'GOOD', return_shipping_cost: '30.00', refunded_amount: '299.00', returned_to_inventory: true, customer_name: 'Emilio Aguinaldo', product_name: 'TikTracker Dynamic Ceramic Mug - Matte Black' }
  ];

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/returns');
      setReturnLogs(res.data);
    } catch (err) {
      setReturnLogs(fallbackLogs);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    setScanning(true);
    setScanErr(null);
    setScanResult(null);
    setSubmitSuccess(null);

    try {
      const res = await axios.post('/api/returns/scan', { barcode });
      setScanResult(res.data);
      if (res.data.items && res.data.items.length > 0) {
        setSelectedSku(res.data.items[0].sku || '');
        setRefundedAmount(res.data.items[0].price || '0');
      }
    } catch (err: any) {
      setScanErr(err.response?.data?.error || 'Tracking barcode not found in records.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult || !selectedSku) return;

    setSubmitting(true);
    setSubmitSuccess(null);

    try {
      const payload = {
        orderId: scanResult.orderId,
        sku: selectedSku,
        reason,
        conditionStatus: condition,
        returnShippingCost: parseFloat(returnShippingCost) || 0,
        refundedAmount: parseFloat(refundedAmount) || 0,
        returnToStock
      };

      await axios.post('/api/returns/save', payload);
      setSubmitSuccess('Return successfully logged. Stocks replenished and margins recalculated.');
      setScanResult(null);
      setBarcode('');
      fetchLogs();
    } catch (err: any) {
      setScanErr(err.response?.data?.error || 'Failed to log returned items.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barcode scanner simulator and console */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-emerald-500" />
              <span>Barcode Return Scanning Console</span>
            </h3>
            <p className="text-xs text-slate-400">
              Simulate barcode scanning by entering a Waybill Tracking Number or TikTok Order ID below.
            </p>

            <form onSubmit={handleScanSubmit} className="flex gap-3">
              <input
                type="text"
                required
                placeholder="Scan barcode or type SPX... / JX..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                disabled={scanning}
                className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs hover-scale focus:outline-none transition-all"
              >
                {scanning ? 'Searching...' : 'Scan Parcel'}
              </button>
            </form>

            {scanErr && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{scanErr}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4.5 h-4.5" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Scanned order details */}
            {scanResult && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-250/20 dark:border-slate-800 rounded-xl space-y-4 animate-scale-up">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  <span>Matched Original Order Details</span>
                </h4>
                <div className="text-xs space-y-1">
                  <p><span className="text-slate-400">Order ID:</span> <span className="font-mono">{scanResult.orderId}</span></p>
                  <p><span className="text-slate-400">Waybill Tracking:</span> <span className="font-mono">{scanResult.trackingNumber}</span></p>
                </div>

                {/* Return submission form parameters */}
                <form onSubmit={handleSaveReturn} className="space-y-4 pt-3 border-t border-slate-250/20 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Select Item to Return</label>
                      <select
                        value={selectedSku}
                        onChange={(e) => {
                          setSelectedSku(e.target.value);
                          const item = scanResult.items.find((i: any) => i.sku === e.target.value);
                          if (item) setRefundedAmount(item.price);
                        }}
                        className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      >
                        {scanResult.items.map((item: any) => (
                          <option key={item.sku} value={item.sku}>
                            {item.product_name} ({item.sku}) x{item.quantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Return Condition</label>
                      <select
                        value={condition}
                        onChange={(e: any) => setCondition(e.target.value)}
                        className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      >
                        <option value="GOOD">Good Condition (Restockable)</option>
                        <option value="DAMAGED_SELLABLE">Damaged (Still Sellable)</option>
                        <option value="DAMAGED_UNSELLABLE">Damaged (Unsellable / Scrap)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Return Shipping Fee (Charged to Seller)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={returnShippingCost}
                        onChange={(e) => setReturnShippingCost(e.target.value)}
                        className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Refund Payout to Buyer</label>
                      <input
                        type="number"
                        step="0.01"
                        value={refundedAmount}
                        onChange={(e) => setRefundedAmount(e.target.value)}
                        className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Reason for return</label>
                      <input
                        type="text"
                        placeholder="e.g. Incorrect color variation shipped."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="restock"
                      checked={returnToStock}
                      onChange={(e) => setReturnToStock(e.target.checked)}
                      className="rounded border-slate-800 bg-[#162031] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="restock" className="text-xs font-semibold text-slate-400">
                      Replenish stock quantity (adds 1 to product inventory count)
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="py-2 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs hover-scale transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Updating margins & stocks...' : 'Save Return Record'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-base mb-2">Simulated Barcodes</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                To test the return integration out of the box, use one of these simulated barcodes which are already pre-loaded into the sandbox orders table.
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-250/20 dark:border-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Completed Order ID</p>
                  <p className="text-emerald-500">574919559123456789</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-250/20 dark:border-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Tracking J&T</p>
                  <p className="text-emerald-500">JX123456789PH</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-250/20 dark:border-slate-800 text-[10px] text-slate-500 italic flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Scanning automatic restocks the products.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Returns log listing */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-base">Returns History Log</h3>
        {loadingLogs ? (
          <div className="flex items-center justify-center min-h-[20vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs tracking-wider uppercase">
                    <th className="p-4">Return ID</th>
                    <th className="p-4">Order ID / Customer</th>
                    <th className="p-4">Product Details</th>
                    <th className="p-4 text-center">Condition</th>
                    <th className="p-4 text-right">Refund Amount</th>
                    <th className="p-4 text-right">Return Cost</th>
                    <th className="p-4 text-center">Restocked</th>
                    <th className="p-4">Scan Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {returnLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors text-xs">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{log.return_id}</td>
                      <td className="p-4">
                        <div>
                          <span className="font-semibold">{log.customer_name || 'N/A'}</span>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.order_id}</p>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{log.product_name || log.sku}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.condition_status === 'GOOD' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.condition_status === 'DAMAGED_SELLABLE' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {log.condition_status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-red-400">-{formatCurrency(log.refunded_amount)}</td>
                      <td className="p-4 text-right text-red-400">-{formatCurrency(log.return_shipping_cost)}</td>
                      <td className="p-4 text-center font-bold text-emerald-500">
                        {log.returned_to_inventory ? 'YES' : 'NO'}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(log.scan_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Returns;
