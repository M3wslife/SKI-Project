'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  Tag, Search, Filter, ChevronLeft, ChevronRight,
  TrendingUp, DollarSign, ShoppingCart, Box,
  ArrowRight, BarChart3, Info
} from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtCurr(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${n.toLocaleString()}`;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  available: number;
  remaining: number;
  incoming: number;
  total_sold: number;
  total_revenue: number;
  orders_count: number;
}

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  categories: string[];
}

export default function ProductsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        category,
        page: page.toString()
      });
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
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
  }, [category, page]);

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
              <div className="w-24 h-24 rounded-lg bg-violet-500/10 flex-center">
                <Tag size={14} className="text-violet-500" />
              </div>
              <div className="text-11 font-bold text-violet-500 uppercase tracking-wider">Catalog</div>
            </div>
            <h1>Product Insights</h1>
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

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-24 h-24 rounded-lg bg-violet-500/10 flex-center">
              <Tag size={14} className="text-violet-500" />
            </div>
            <div className="text-11 font-bold text-violet-500 uppercase tracking-wider">Catalog</div>
          </div>
          <h1>Product Insights</h1>
          <div className="page-title-sub">Historical performance & real-time availability</div>
        </div>

        <div className="flex-center gap-12">
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="pl-36 pr-12 py-10 rounded-lg border border-slate-200 bg-white/50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all w-240 text-13"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Summary */}
        <div className="kpi-grid mb-24">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-icon-wrap bg-violet-icon">
              <Box size={18} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{fmt(data?.total || 0)}</div>
            <div className="kpi-label">Listed Products</div>
            <div className="kpi-sub">Total unique SKUs in catalog</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{data?.categories.length || 0}</div>
            <div className="kpi-label">Categories</div>
            <div className="kpi-sub">Unique product groupings</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-icon-wrap bg-blue-icon">
              <BarChart3 size={18} color="#3b82f6" />
            </div>
            <div className="kpi-value">
              {fmt(data?.products.reduce((acc, p) => acc + p.total_sold, 0) || 0)}
            </div>
            <div className="kpi-label">Units Sold (Page)</div>
            <div className="kpi-sub">Sales volume for current view</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Info size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">
              {fmtCurr(data?.products.reduce((acc, p) => acc + p.total_revenue, 0) || 0)}
            </div>
            <div className="kpi-label">Revenue (Page)</div>
            <div className="kpi-sub">Gross income for view items</div>
          </div>
        </div>

        {/* Product Table */}
        <div className="chart-panel shadow-sm no-padding overflow-hidden">
          <div className="p-20 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-16">
              <div className="chart-title no-margin">Performance Catalog</div>
              <div className="flex items-center gap-8 border-l border-slate-200 pl-16">
                <Filter size={14} className="text-slate-400" />
                <select 
                  title="Filter by Category"
                  className="bg-transparent text-12 font-semibold text-slate-600 outline-none"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                >
                  <option value="">All Categories</option>
                  {data?.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="text-12 text-slate-400 font-medium">
              Page <b>{page}</b> · Showing <b>{data?.products.length}</b> items
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-13">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Product Identity</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Category</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Sold</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Revenue</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10 text-right">Stock</th>
                  <th className="px-20 py-12 font-bold text-slate-400 uppercase tracking-wider text-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.products.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-20 py-16">
                      <div className="font-bold text-slate-700 group-hover:text-violet-600 transition-colors">{p.name}</div>
                      <div className="text-11 text-slate-400 font-medium mt-2">{p.sku} • {p.brand}</div>
                    </td>
                    <td className="px-20 py-16">
                      <span className="text-10 font-bold text-slate-500 bg-slate-100 px-8 py-4 rounded-full uppercase tracking-tight">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-20 py-16 text-right font-semibold text-slate-600">
                      {fmt(p.total_sold)}
                    </td>
                    <td className="px-20 py-16 text-right font-bold text-emerald-600">
                      {fmtCurr(p.total_revenue)}
                    </td>
                    <td className={`px-20 py-16 text-right font-bold ${p.available <= 5 ? 'text-amber-500' : 'text-slate-500'}`}>
                      {fmt(p.available)}
                    </td>
                    <td className="px-20 py-16">
                      {p.total_revenue > 100000 ? (
                        <div className="badge badge-emerald">Top Performer</div>
                      ) : p.available <= 0 ? (
                        <div className="badge badge-red">Out of Stock</div>
                      ) : (
                        <div className="badge badge-blue">Active</div>
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
              className="flex items-center gap-4 text-12 font-bold text-slate-500 hover:text-violet-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all px-12 py-8 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="text-12 font-bold text-slate-400 uppercase tracking-widest">
              Catalog Page <span className="text-slate-700">{page}</span>
            </div>
            <button 
              disabled={data && data.products.length < data.limit}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-4 text-12 font-bold text-slate-500 hover:text-violet-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-all px-12 py-8 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
