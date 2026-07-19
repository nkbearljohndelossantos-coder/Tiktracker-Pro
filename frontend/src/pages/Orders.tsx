import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, X, Clock, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';

interface OrderItem {
  id: number;
  sku: string;
  product_name: string;
  variation: string;
  quantity: number;
  price: number;
  purchase_cost: string;
  packaging_cost: string;
  bubble_wrap_cost: string;
  tape_cost: string;
  sticker_cost: string;
  labor_cost: string;
  other_expenses: string;
}

interface Order {
  order_id: string;
  tracking_number: string;
  customer_name: string;
  phone_number: string;
  shipping_address: string;
  courier: string;
  order_status: string;
  total_amount: string;
  created_at: string;
  net_profit?: string;
  statement_amount?: string;
  settlement_id?: string;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courier, setCourier] = useState('');
  const [status, setStatus] = useState('');
  const [hasSettlement, setHasSettlement] = useState('');

  // Detail Drawer State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fallbackOrders: Order[] = [];

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: { search, courier, status, hasSettlement }
      });
      setOrders(res.data);
    } catch (err) {
      setOrders(fallbackOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, courier, status, hasSettlement]);

  // Drawer detail loader
  const handleOpenDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingDetails(true);
    setDetails(null);
    try {
      const res = await axios.get(`/api/orders/${orderId}`);
      setDetails(res.data);
    } catch (err) {
      // Find order in mock
      const ord = fallbackOrders.find(o => o.order_id === orderId);
      if (ord) {
        setDetails({
          order: ord,
          items: [{ sku: 'SKU-MUG-001', product_name: 'TikTracker Dynamic Mug', variation: 'Matte Black', quantity: 1, price: 299.00, purchase_cost: '120', packaging_cost: '15', bubble_wrap_cost: '5', tape_cost: '2', sticker_cost: '1.5', labor_cost: '10', other_expenses: '1.5' }],
          financeBreakdown: { gross_revenue: 299.00, cogs: 155.00 },
          waybill: { tracking_number: ord.tracking_number, courier: ord.courier, customer_name: ord.customer_name, shipping_address: ord.shipping_address, is_matched: true },
          returns: [],
          timeline: [
            { event: 'ORDERED', label: 'Order Created on TikTok Shop', timestamp: ord.created_at },
            { event: 'SETTLED', label: 'Payout Settled', timestamp: ord.created_at }
          ]
        });
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  };

  return (
    <div className="space-y-6 relative min-h-[80vh]">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Order ID, Tracking, Customer, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none transition-all"
          />
        </div>

        {/* Courier Select */}
        <select
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          className="bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Couriers</option>
          <option value="J&T Express">J&T Express</option>
          <option value="Shopee Xpress">Shopee Xpress</option>
          <option value="Flash Express">Flash Express</option>
        </select>

        {/* Status Select */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="PENDING">Pending</option>
        </select>

        {/* Financial Settlement State */}
        <select
          value={hasSettlement}
          onChange={(e) => setHasSettlement(e.target.value)}
          className="bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">Settlement Payout State</option>
          <option value="true">Settled</option>
          <option value="false">Unsettled / Pending Payout</option>
        </select>
      </div>

      {/* Orders Grid Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs tracking-wider uppercase">
                  <th className="p-4">Order ID / Date</th>
                  <th className="p-4">Customer / Courier</th>
                  <th className="p-4">Tracking Number</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Order Revenue</th>
                  <th className="p-4 text-right">Settlement Payout</th>
                  <th className="p-4 text-right">Net Profit</th>
                  <th className="p-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                {orders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{order.order_id}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-semibold">{order.customer_name}</span>
                        <p className="text-[10px] text-slate-400 font-medium">{order.courier}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">{order.tracking_number || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.order_status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                        order.order_status === 'REFUNDED' ? 'bg-amber-500/10 text-amber-500' :
                        order.order_status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-200/50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(order.total_amount)}</td>
                    <td className="p-4 text-right text-teal-400">
                      {order.statement_amount ? formatCurrency(order.statement_amount) : 'Pending'}
                    </td>
                    <td className={`p-4 text-right font-bold ${
                      parseFloat(order.net_profit || '0') < 0 ? 'text-red-400' : 'text-emerald-500'
                    }`}>
                      {order.net_profit ? formatCurrency(order.net_profit) : 'Pending'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenDetails(order.order_id)}
                        className="py-1 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Breakdown
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ORDER DETAILS SLIDE OUT DRAWER --- */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          {/* Backdrop closer */}
          <div className="flex-1" onClick={() => setSelectedOrderId(null)}></div>

          {/* Drawer Body */}
          <div className="w-full max-w-2xl bg-white dark:bg-[#111827] border-l border-slate-250 dark:border-slate-800 h-full overflow-y-auto p-6 shadow-2xl animate-slide-left flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div>
                <h3 className="text-lg font-bold">Order Financial Breakdown</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedOrderId}</span>
              </div>
              <button onClick={() => setSelectedOrderId(null)}>
                <X className="w-6 h-6 text-slate-400 hover:text-slate-200" />
              </button>
            </div>

            {loadingDetails || !details ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="flex-1 space-y-6 text-sm">
                {/* 1. Core items lists */}
                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <span>Purchased Items</span>
                  </h4>
                  <div className="space-y-3">
                    {details.items.map((item: OrderItem) => (
                      <div key={item.id} className="flex justify-between items-start pb-2 border-b border-slate-200/30 dark:border-slate-800/30 last:border-b-0 last:pb-0">
                        <div>
                          <p className="font-bold text-xs">{item.product_name}</p>
                          <span className="text-[10px] text-emerald-500">{item.sku}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Variation: {item.variation || 'Default'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xs">{formatCurrency(item.price)} x{item.quantity}</p>
                          <p className="text-[10px] text-slate-400">Landed cost: {formatCurrency(
                            parseFloat(item.purchase_cost || '0') +
                            parseFloat(item.packaging_cost || '0') +
                            parseFloat(item.bubble_wrap_cost || '0') +
                            parseFloat(item.tape_cost || '0') +
                            parseFloat(item.sticker_cost || '0') +
                            parseFloat(item.labor_cost || '0') +
                            parseFloat(item.other_expenses || '0')
                          )}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Profit Engine Summary */}
                {details.financeBreakdown.settlements.length > 0 ? (
                  details.financeBreakdown.settlements.map((sett: any) => (
                    <div key={sett.settlement_id} className="space-y-4">
                      {/* KPI calculations card */}
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Settled Net Profit Margin</p>
                          <p className={`text-2xl font-black mt-1 ${sett.net_profit < 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                            {formatCurrency(sett.net_profit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Payout Deposited</p>
                          <p className="text-sm font-bold text-teal-400 mt-1">{formatCurrency(sett.net_payout)}</p>
                        </div>
                      </div>

                      {/* Detailed fee components */}
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Finance Fee Breakdown</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold">
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Gross Sales:</span>
                            <span>{formatCurrency(sett.gross_sales)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">TikTok Shop Fees:</span>
                            <span className="text-red-400">-{formatCurrency(sett.tiktok_fees)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Affiliate Comm:</span>
                            <span className="text-red-400">-{formatCurrency(sett.affiliate_commission)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Shipping actual:</span>
                            <span className="text-red-400">-{formatCurrency(sett.shipping_fee_actual)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Shipping Subsidy:</span>
                            <span className="text-emerald-500">+{formatCurrency(sett.shipping_fee_subsidy)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">TikTok Voucher:</span>
                            <span className="text-red-400">-{formatCurrency(sett.platform_discount)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Tax deductions:</span>
                            <span className="text-red-400">-{formatCurrency(sett.tax)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1">
                            <span className="text-slate-400">Adjustments:</span>
                            <span>{formatCurrency(sett.adjustments)}</span>
                          </div>
                          {sett.refund > 0 && (
                            <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1 col-span-2 text-red-500">
                              <span>Refund Losses:</span>
                              <span>-{formatCurrency(sett.refund)}</span>
                            </div>
                          )}
                          {sett.return_loss > 0 && (
                            <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1 col-span-2 text-red-500">
                              <span>Return shipping costs:</span>
                              <span>-{formatCurrency(sett.return_loss)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-1 col-span-2 pt-2 border-t border-slate-300 dark:border-slate-700">
                            <span className="text-slate-400">Landed Product COGS:</span>
                            <span className="text-red-400">-{formatCurrency(details.financeBreakdown.cogs)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>This order has not been settled yet by TikTok. Financial profit margin will display once settlement reports are uploaded.</span>
                  </div>
                )}

                {/* 3. Waybill status */}
                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Waybill Extraction Status</span>
                  </h4>
                  {details.waybill ? (
                    <div className="space-y-1 text-xs">
                      <p><span className="text-slate-400">Courier Partner:</span> {details.waybill.courier}</p>
                      <p><span className="text-slate-400">Tracking Number:</span> <span className="font-mono">{details.waybill.tracking_number}</span></p>
                      <p><span className="text-slate-400">Receiver Name:</span> {details.waybill.customer_name}</p>
                      <p><span className="text-slate-400">Delivery Address:</span> {details.waybill.shipping_address}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold uppercase">
                        Successfully Matched via {details.waybill.matched_method || 'ORDER_ID'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No courier waybills parsed for this order yet.</p>
                  )}
                </div>

                {/* 4. Timeline logs */}
                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>Order Lifecycle Timeline</span>
                  </h4>
                  <div className="space-y-4 pl-3 relative border-l border-slate-200 dark:border-slate-800 ml-2">
                    {details.timeline.map((event: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="font-bold text-xs">{event.label}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Orders;
