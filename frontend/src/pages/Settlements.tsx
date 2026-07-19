import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, Search } from 'lucide-react';

interface Settlement {
  id: number;
  settlement_id: string;
  order_id: string;
  statement_date: string;
  gross_sales: string;
  tiktok_fees: string;
  affiliate_commission: string;
  shipping_fee_subsidy: string;
  shipping_fee_actual: string;
  platform_discount: string;
  adjustments: string;
  refund: string;
  return_loss: string;
  tax: string;
  statement_amount: string;
  net_profit: string;
  courier?: string;
  order_status?: string;
  customer_name?: string;
}

export const Settlements: React.FC = () => {
  const { hasRole } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDiscrepancy, setIsDiscrepancy] = useState('');
  
  // Recalculate State
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);

  // Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'SETTLEMENT' | 'ORDER' | 'RETURN'>('SETTLEMENT');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<any>(null);

  const fallbackSettlements: Settlement[] = [];

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/settlements', {
        params: { search, isDiscrepancy }
      });
      setSettlements(res.data);
    } catch (err) {
      setSettlements(fallbackSettlements);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [search, isDiscrepancy]);

  const handleRecalculate = async () => {
    if (!window.confirm('Do you want to recalculate profits for all settlements? This will update profit margins retroactively to reflect current product packaging and COGS costs.')) return;
    setRecalculating(true);
    setRecalcMsg(null);
    try {
      const res = await axios.post('/api/settlements/recalculate');
      setRecalcMsg(res.data.message);
      fetchSettlements();
    } catch (err: any) {
      setRecalcMsg(err.response?.data?.error || 'Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  // Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('type', uploadType);

    try {
      const res = await axios.post('/api/settlements/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus({
        success: true,
        message: `Import Completed. ${res.data.imported} records loaded. Duplicates ignored: ${res.data.duplicates}.`,
        errors: res.data.errors
      });
      setUploadFile(null);
      fetchSettlements();
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;
      const errorMsg = err.response?.data?.error || 'File upload failed. Columns do not match standard format.';
      
      let displayErrors: string[] = [];
      if (Array.isArray(serverErrors)) {
        displayErrors = [...serverErrors];
      } else {
        const errorStack = err.response?.data?.stack || err.message;
        const errorDetails = err.response?.data?.details || '';
        displayErrors = [errorStack, errorDetails].filter(Boolean);
      }

      setUploadStatus({
        success: false,
        message: errorMsg,
        errors: displayErrors
      });
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* 1. Upload Section (Collapsible/Top Panel) */}
      {hasRole(['SUPER_ADMIN', 'MANAGER', 'STAFF']) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Drag Box */}
          <div className="lg:col-span-2 p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl">
            <h3 className="font-extrabold text-base mb-4">TikTok Shop Excel Importer</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="flex gap-4">
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="SETTLEMENT">Settlement Report</option>
                  <option value="ORDER">TikTok Order Report</option>
                  <option value="RETURN">TikTok Return Report</option>
                </select>
              </div>

              {/* Drag active block */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/30'
                }`}
              >
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-10 h-10 text-slate-500 mb-3" />
                <p className="font-bold text-xs">Drag and drop file here, or click to browse</p>
                <p className="text-[10px] text-slate-400 mt-1">Supports TikTok Order, Settlement, and Return Excel files</p>
                {uploadFile && (
                  <span className="mt-4 inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold rounded-lg text-xs">
                    File selected: {uploadFile.name}
                  </span>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="py-2 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs hover-scale focus:outline-none transition-all disabled:opacity-50"
                >
                  {uploading ? 'Processing File...' : 'Start Automatic Import'}
                </button>
              </div>
            </form>

            {/* Upload results */}
            {uploadStatus && (
              <div className={`mt-4 p-4 rounded-xl text-xs flex flex-col gap-2 ${
                uploadStatus.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {uploadStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="font-bold">{uploadStatus.message}</span>
                </div>
                {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                  <div className="mt-2 space-y-1 pl-6 max-h-20 overflow-y-auto font-mono text-[10px]">
                    <p className="font-bold">Execution logs:</p>
                    {uploadStatus.errors.map((errStr: string, idx: number) => (
                      <p key={idx} className="text-slate-400">{errStr}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats & Sync Tools */}
          <div className="p-6 bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-base mb-2">Recalculate Profit</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you modify product base purchase costs, carton packaging materials, labor fees, or tape/bubble wrap values, run this bulk sync utility. The profit engine will re-evaluate Net Profits retroactively.
              </p>
            </div>
            <div className="space-y-3 pt-4">
              {recalcMsg && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-800 rounded-lg text-[10px] font-mono">
                  {recalcMsg}
                </div>
              )}
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors hover:text-emerald-500"
              >
                <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                <span>{recalculating ? 'Recalculating Margin...' : 'Retroactive Cost Re-run'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Settlements Listing */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Settlement or Order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none transition-all"
            />
          </div>

          <select
            value={isDiscrepancy}
            onChange={(e) => setIsDiscrepancy(e.target.value)}
            className="w-full sm:w-auto bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Settlement Payouts</option>
            <option value="true">Reconciliation Losses (Negative Profit / Refunds)</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#162031] border border-slate-200/40 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/30 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs tracking-wider uppercase">
                    <th className="p-4">Settlement ID</th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Payout Date</th>
                    <th className="p-4 text-right">Revenue</th>
                    <th className="p-4 text-right">TikTok Fees</th>
                    <th className="p-4 text-right">Refund / Return Loss</th>
                    <th className="p-4 text-right">Payout Net</th>
                    <th className="p-4 text-right">Calculated Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {settlements.map((sett) => (
                    <tr key={sett.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{sett.settlement_id}</td>
                      <td className="p-4 font-mono text-xs">{sett.order_id}</td>
                      <td className="p-4 text-xs font-semibold text-slate-400">
                        {new Date(sett.statement_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(sett.gross_sales)}</td>
                      <td className="p-4 text-right text-red-400">-{formatCurrency(parseFloat(sett.tiktok_fees) + parseFloat(sett.affiliate_commission))}</td>
                      <td className="p-4 text-right text-amber-500">
                        {parseFloat(sett.refund) > 0 || parseFloat(sett.return_loss) > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>-{formatCurrency(parseFloat(sett.refund) + parseFloat(sett.return_loss))}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-right font-bold text-teal-400">{formatCurrency(sett.statement_amount)}</td>
                      <td className={`p-4 text-right font-black ${
                        parseFloat(sett.net_profit) < 0 ? 'text-red-400' : 'text-emerald-500'
                      }`}>
                        {formatCurrency(sett.net_profit)}
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
export default Settlements;
