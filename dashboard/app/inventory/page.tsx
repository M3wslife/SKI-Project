'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  Package, AlertTriangle, Home, Truck, Search,
  Filter, ChevronLeft, ChevronRight, Hash, Tag,
  Layers, Inbox, ArrowRight
} from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString();
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface InventoryData {
  summary: {
    total_products: number;
    total_available: number;
    total_remaining: number;
    total_reserved: number;
    total_incoming: number;
  };
  warehouses: { warehouse_code: string; products: number; total_remaining: number; total_available: number; total_reserved: number }[];
  categories: { category: string; cnt: number; total_available: number }[];
  lowStock: { sku: string; name: string; category: string; available: number; remaining: number; incoming: number }[];
  products: {
    sku: string; name: string; category: string; brand: string;
    price: number; available: number; remaining: number; incoming: number;
    warehouse_code: string; warehouse_name: string;
  }[];
  total: number;
  page: number;
  limit: number;
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        category,
        warehouse,
        page: page.toString()
      });
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const d = await res.json();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [category, warehouse, page]);

  // Handle search with debounce or button
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  if (loading && !data) {
    return (
      <div className="animate-fade-up">
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex-center">
                <Package size={14} className="text-blue-500" />
              </div>
              <div className="text-11 font-bold text-blue-500 uppercase tracking-wider">Logistics</div>
            </div>
            <h1>Inventory Control</h1>
          </div>
        </div>
        <div className="page-body">
          <div className="kpi-grid">
            {[1,2,3,4].map(i => <div key={i} className="kpi-card skeleton-card"><div className="skeleton h-skeleton-value" /></div>)}
          </div>
        </div>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex-center">
              <Package size={14} className="text-blue-500" />
            </div>
            <div className="text-11 font-bold text-blue-500 uppercase tracking-wider">Logistics</div>
          </div>
          <h1>Inventory Control</h1>
          <div className="page-title-sub">Real-time stock levels & warehouse distribution</div>
        </div>

        <div className="flex-center gap-12">
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search SKUs or names..." 
              className="pl-36 pr-12 py-10 rounded-lg border border-slate-200 bg-white/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all w-240 text-13"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Grid */}
        <div className="kpi-grid mb-24">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-icon-wrap bg-blue-icon">
              <Layers size={18} color="#3b82f6" />
            </div>
            <div className="kpi-value">{fmt(s?.total_available || 0)}</div>
            <div className="kpi-label">Available Stock</div>
            <div className="kpi-sub">Ready for fulfillment</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Inbox size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">{fmt(s?.total_reserved || 0)}</div>
            <div className="kpi-label">Reserved Units</div>
            <div className="kpi-sub">Allocated to pending orders</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <Truck size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{fmt(s?.total_incoming || 0)}</div>
            <div className="kpi-label">Incoming Supply</div>
            <div className="kpi-sub">Pending warehouse receipt</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-icon-wrap bg-violet-icon">
              <Hash size={18} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{fmt(s?.total_products || 0)}</div>
            <div className="kpi-label">Unique SKUs</div>
            <div className="kpi-sub">Catalog breadth</div>
          </div>
        </div>

        <div className="grid-3 mb-24">
          {/* Warehouse Distribution */}
          <div className="chart-panel span-2">
            <div className="chart-title mb-16">Stock Distribution by Warehouse</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-13">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-12 font-bold text-slate-400 uppercase tracking-wider text-10">Warehouse</th>
                    <th className="pb-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">SKUs</th>
                    <th className="pb-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Available</th>
                    <th className="pb-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Total</th>
                    <th className="pb-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.warehouses.map((w, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-12 font-semibold text-slate-700">{w.warehouse_code}</td>
                      <td className="py-12 text-right">{fmt(w.products)}</td>
                      <td className="py-12 text-right font-bold text-emerald-600">{fmt(w.total_available)}</td>
                      <td className="py-12 text-right text-slate-500">{fmt(w.total_remaining)}</td>
                      <td className="py-12 text-right">
                        <div className="flex items-center justify-end gap-8">
                          <div className="w-64 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${Math.min(100, (w.total_available / (s?.total_available || 1)) * 100)}%` }} 
                            />
                          </div>
                          <span className="text-11 font-bold text-slate-400 w-32">
                            {Math.round((w.total_available / (s?.total_available || 1)) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="chart-panel">
            <div className="flex items-center justify-between mb-16">
              <div className="chart-title">Critical Stock Alerts</div>
              <div className="badge badge-red flex items-center gap-4">
                <AlertTriangle size={10} />
                Action Required
              </div>
            </div>
            <div className="flex flex-col gap-12">
              {data?.lowStock.slice(0, 6).map((item, i) => (
                <div key={i} className="p-12 rounded-lg bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all cursor-default group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-12 font-bold text-slate-700 truncate pr-8">{item.name}</div>
                    <div className="text-11 font-bold text-amber-600 bg-amber-100 px-6 py-2 rounded uppercase">{item.available} Left</div>
                  </div>
                  <div className="flex justify-between items-center text-11 text-slate-400">
                    <span>{item.sku}</span>
                    {item.incoming > 0 && (
                      <span className="text-emerald-500 font-medium flex items-center gap-2">
                        +{item.incoming} coming
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <button className="mt-8 text-11 font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-4 hover:gap-8 transition-all">
                View All Alerts <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="chart-panel shadow-sm no-padding overflow-hidden">
          <div className="p-20 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-16">
              <div className="chart-title no-margin">Product Inventory</div>
              <div className="flex items-center gap-8 border-l border-slate-200 pl-16">
                <Filter size={14} className="text-slate-400" />
                <select 
                  className="bg-transparent text-12 font-semibold text-slate-600 outline-none"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                >
                  <option value="">All Categories</option>
                  {data?.categories.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
                </select>
              </div>
            </div>
            <div className="text-12 text-slate-400 font-medium">
              Showing <b>{data?.products.length}</b> of <b>{data?.total}</b> products
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-13">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Product Details</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Category</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Available</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Reserved</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Incoming</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.products.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-20 py-16">
                      <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{p.name}</div>
                      <div className="text-11 text-slate-400 font-medium mt-2">{p.sku} • {p.brand}</div>
                    </td>
                    <td className="px-20 py-16">
                      <span className="text-11 font-bold text-slate-500 bg-slate-100 px-8 py-4 rounded-full uppercase tracking-tight">
                        {p.category}
                      </span>
                    </td>
                    <td className={`px-20 py-16 text-right font-bold ${p.available <= 5 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {fmt(p.available)}
                    </td>
                    <td className="px-20 py-16 text-right text-slate-500">
                      {fmt(p.remaining - p.available)}
                    </td>
                    <td className="px-20 py-16 text-right font-semibold text-blue-500">
                      {p.incoming > 0 ? `+${fmt(p.incoming)}` : '-'}
                    </td>
                    <td className="px-20 py-16">
                      {p.available <= 0 ? (
                        <div className="badge badge-red">Out of Stock</div>
                      ) : p.available <= 10 ? (
                        <div className="badge badge-amber">Low Stock</div>
                      ) : (
                        <div className="badge badge-emerald">In Stock</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-16 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-4 text-12 font-bold text-slate-500 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all px-12 py-8 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="text-12 font-bold text-slate-400">
              Page <span className="text-slate-700">{page}</span> of {Math.ceil((data?.total || 1) / (data?.limit || 50))}
            </div>
            <button 
              disabled={page >= Math.ceil((data?.total || 1) / (data?.limit || 50))}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-4 text-12 font-bold text-slate-500 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all px-12 py-8 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
