import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, Search, AlertCircle } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  supplier: string;
  purchase_cost: number;
  packaging_cost: number;
  bubble_wrap_cost: number;
  tape_cost: number;
  sticker_cost: number;
  labor_cost: number;
  other_expenses: number;
  inventory_qty: number;
}

export const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '', name: '', supplier: '', purchase_cost: 0, packaging_cost: 0,
    bubble_wrap_cost: 0, tape_cost: 0, sticker_cost: 0, labor_cost: 0,
    other_expenses: 0, inventory_qty: 0
  });

  const fallbackProducts: Product[] = [
    { sku: 'SKU-MUG-001', name: 'TikTracker Dynamic Ceramic Mug - Matte Black', supplier: 'Apex Supplier Ltd.', purchase_cost: 120.00, packaging_cost: 15.00, bubble_wrap_cost: 5.00, tape_cost: 2.00, sticker_cost: 1.50, labor_cost: 10.00, other_expenses: 1.50, inventory_qty: 150 },
    { sku: 'SKU-SHIRT-002', name: 'TikTracker Tech Premium Cotton Shirt - Navy Blue', supplier: 'Vibrant Loom Co.', purchase_cost: 180.00, packaging_cost: 10.00, bubble_wrap_cost: 2.00, tape_cost: 1.00, sticker_cost: 1.50, labor_cost: 10.00, other_expenses: 0.50, inventory_qty: 240 },
    { sku: 'SKU-HOODIE-003', name: 'TikTracker Oversized Fleece Hoodie - Sand', supplier: 'Vibrant Loom Co.', purchase_cost: 350.00, packaging_cost: 20.00, bubble_wrap_cost: 4.00, tape_cost: 2.00, sticker_cost: 1.50, labor_cost: 15.00, other_expenses: 2.50, inventory_qty: 95 },
    { sku: 'SKU-CAP-004', name: 'TikTracker Pro Retro Dad Cap - Pitch Black', supplier: 'TopCap Manufacturer', purchase_cost: 85.00, packaging_cost: 8.00, bubble_wrap_cost: 1.50, tape_cost: 1.00, sticker_cost: 1.50, labor_cost: 8.00, other_expenses: 0.00, inventory_qty: 45 },
    { sku: 'SKU-BOTTLE-005', name: 'TikTracker Insulated Steel Flask - 750ml Forest Green', supplier: 'HydroMakers Co.', purchase_cost: 280.00, packaging_cost: 25.00, bubble_wrap_cost: 8.00, tape_cost: 2.50, sticker_cost: 1.50, labor_cost: 12.00, other_expenses: 3.00, inventory_qty: 18 }
  ];

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      sku: '', name: '', supplier: '', purchase_cost: 0, packaging_cost: 0,
      bubble_wrap_cost: 0, tape_cost: 0, sticker_cost: 0, labor_cost: 0,
      other_expenses: 0, inventory_qty: 0
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setIsEditing(true);
    setFormData(prod);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (sku: string) => {
    if (!window.confirm(`Are you sure you want to delete SKU: ${sku}?`)) return;
    try {
      await axios.delete(`/api/products/${sku}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) {
      setError('SKU and Product Name are required.');
      return;
    }

    try {
      if (isEditing) {
        await axios.put(`/api/products/${formData.sku}`, formData);
      } else {
        await axios.post('/api/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product configurations.');
    }
  };

  const handleNumberChange = (field: keyof Product, val: string) => {
    const parsedVal = parseFloat(val) || 0;
    setFormData(prev => ({ ...prev, [field]: parsedVal }));
  };

  const filtered = products.filter(p => 
    p.sku.toLowerCase().includes(search.toLowerCase()) || 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier && p.supplier.toLowerCase().includes(search.toLowerCase()))
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  // Calculate landed cost helpers
  const getSumOps = (p: Partial<Product>) => {
    return (
      (p.packaging_cost || 0) +
      (p.bubble_wrap_cost || 0) +
      (p.tape_cost || 0) +
      (p.sticker_cost || 0) +
      (p.labor_cost || 0) +
      (p.other_expenses || 0)
    );
  };

  const getLandedCost = (p: Partial<Product>) => {
    return (p.purchase_cost || 0) + getSumOps(p);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search SKU, name, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none transition-all"
          />
        </div>

        {hasRole(['SUPER_ADMIN', 'MANAGER']) && (
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all hover-scale text-sm shadow-md shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product SKU</span>
          </button>
        )}
      </div>

      {/* Grid listing products */}
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
                  <th className="p-4">SKU / Product Name</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-right">Purchase Cost</th>
                  <th className="p-4 text-right">Ops & Packaging</th>
                  <th className="p-4 text-right">Landed Cost</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                {filtered.map((prod) => (
                  <tr key={prod.sku} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-extrabold text-emerald-500">{prod.sku}</span>
                        <p className="font-medium text-xs mt-0.5">{prod.name}</p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{prod.supplier || 'N/A'}</td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(prod.purchase_cost)}</td>
                    <td className="p-4 text-right font-medium text-slate-400" title="Sum of BubbleWrap, Tape, Sticker, Labor, Box, etc.">
                      {formatCurrency(getSumOps(prod))}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(getLandedCost(prod))}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        prod.inventory_qty <= 20
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {prod.inventory_qty} pcs
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-blue-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {hasRole(['SUPER_ADMIN']) && (
                          <button
                            onClick={() => handleDelete(prod.sku)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT DIALOG --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <h3 className="text-lg font-bold">{isEditing ? 'Modify SKU Landed Costs' : 'Add New Product SKU'}</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-200" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">SKU ID</label>
                  <input
                    type="text"
                    disabled={isEditing}
                    placeholder="e.g., SKU-MUG-001"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Product Name</label>
                  <input
                    type="text"
                    placeholder="TikTracker Ceramic Mug"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Supplier</label>
                  <input
                    type="text"
                    placeholder="Apex Supplier Ltd."
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Inventory Stock Qty</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={formData.inventory_qty}
                    onChange={(e) => handleNumberChange('inventory_qty', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Operations & Packaging Details */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4">Operations & Packaging Costs breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Purchase Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchase_cost}
                      onChange={(e) => handleNumberChange('purchase_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Carton Box / Packaging</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.packaging_cost}
                      onChange={(e) => handleNumberChange('packaging_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Bubble Wrap</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bubble_wrap_cost}
                      onChange={(e) => handleNumberChange('bubble_wrap_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Packaging Tape</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tape_cost}
                      onChange={(e) => handleNumberChange('tape_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Waybill Sticker</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sticker_cost}
                      onChange={(e) => handleNumberChange('sticker_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Fulfillment Labor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.labor_cost}
                      onChange={(e) => handleNumberChange('labor_cost', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Other Ops Costs</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.other_expenses}
                      onChange={(e) => handleNumberChange('other_expenses', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Financial calculations preview summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-250/20 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Computed Landed COGS</p>
                  <p className="text-xl font-black text-emerald-500 mt-1">{formatCurrency(getLandedCost(formData))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Packaging & Ops Share</p>
                  <p className="text-sm font-semibold">{formatCurrency(getSumOps(formData))}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs transition-all hover-scale"
                >
                  Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Products;
