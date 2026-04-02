'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Package, AlertTriangle, Warehouse, ChevronLeft, ChevronRight, Search } from 'lucide-react';

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return (n ?? 0).toLocaleString();
}

interface WarehouseRow {
  warehouse_code: string;
  products: number;
  total_remaining: number;
  total_available: number;
  total_reserved: number;
}

interface InventoryData {
  summary: { total_products: number; total_available: number; total_remaining: number; total_reserved: number; total_incoming: number };
  warehouses: WarehouseRow[];
  categories: { category: string; cnt: number; total_available: number }[];
  lowStock: { sku: string; name: string; category: string; available: number; remaining: number; incoming: number }[];
  products: { sku: string; name: string; category: string; brand: string; price: number; purchase_price: number; available: number; remaining: number; incoming: number }[];
  total: number;
  page: number;
}

const WH_COLORS: Record<string, string> = {
  W0001: '#3b82f6',
  Z003: '#8b5cf6',
  SKC0003: '#10b981',
  W0002: '#f59e0b',
};

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    fetch(`/api/inventory?${params}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Database connection error.');
        }
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch((e: Error) => {
        console.error('Fetch error:', e);
        setError(e.message);
        setLoading(false);
      });
  }, [search, category, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <div className="page-title-sub">Stock levels by warehouse & category</div>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="mb-24 p-16 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex-center text-white font-bold">!</div>
            <div>
              <p className="font-bold">Database Connection Required</p>
              <p className="opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* KPI Summary */}
        <div className="inventory-grid">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-icon-wrap bg-blue-icon">
              <Package size={18} color="#3b82f6" />
            </div>
            <div className="kpi-value">{fmtNum(data?.summary?.total_products ?? 0)}</div>
            <div className="kpi-label">Total SKUs</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <Package size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{fmtNum(data?.summary?.total_available ?? 0)}</div>
            <div className="kpi-label">Available Units</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Package size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">{fmtNum(data?.summary?.total_reserved ?? 0)}</div>
            <div className="kpi-label">Reserved Units</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent bg-cyan-accent" />
            <div className="kpi-icon-wrap bg-cyan-icon">
              <Package size={18} color="#06b6d4" />
            </div>
            <div className="kpi-value">{fmtNum(data?.summary?.total_incoming ?? 0)}</div>
            <div className="kpi-label">Incoming</div>
          </div>
        </div>

        {/* Warehouse Cards */}
        <div className="mb-24">
          <div className="section-title-sm">
            <Warehouse size={15} /> Warehouse Breakdown
          </div>
          <div className="wh-grid">
            {(data?.warehouses ?? []).map(wh => {
              const color = WH_COLORS[wh.warehouse_code] || '#94a3b8';
              const utilPct = wh.total_remaining > 0 ? Math.round((wh.total_available / wh.total_remaining) * 100) : 0;
              return (
                <div key={wh.warehouse_code} className="card card-pad wh-border-accent" style={{ '--wh-color': color } as React.CSSProperties}>
                  <div className="wh-card-header">
                    <span className="wh-card-title">{wh.warehouse_code}</span>
                    <span className="badge badge-gray">{wh.products.toLocaleString()} SKUs</span>
                  </div>
                  <div className="mb-8">
                    <div className="wh-stat-row">
                      <span>Available</span><span className="wh-stat-value">{fmtNum(wh.total_available)}</span>
                    </div>
                    <div className="wh-progress-wrap">
                      <div className="wh-progress-fill" style={{ '--wh-color': color, '--progress-pct': `${utilPct}%` } as React.CSSProperties} />
                    </div>
                  </div>
                  <div className="wh-footer">
                    <span>Stock: {fmtNum(wh.total_remaining)}</span>
                    <span>Reserved: {fmtNum(wh.total_reserved)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Chart + Low Stock */}
        <div className="grid-2-1 mb-24">
          {/* Category Bar Chart */}
          <div className="chart-panel">
            <div className="chart-title">Stock by Category</div>
            <div className="chart-subtitle">Available units per product category</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(data?.categories ?? []).slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={fmtNum} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false} width={130} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [fmtNum(v as number) + ' units', 'Available']}
                />
                <Bar dataKey="total_available" radius={[0, 3, 3, 0]} barSize={14}>
                  {(data?.categories ?? []).map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Low Stock Alerts */}
          <div className="card">
            <div className="card-pad-sm card-header-border">
              <div className="flex-center gap-2">
                <AlertTriangle size={14} color="#f59e0b" />
                <span className="chart-title">Low Stock Alerts</span>
                <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>≤ 5 units</span>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {(data?.lowStock ?? []).length === 0 ? (
                <div className="py-32 text-center text-muted">No low-stock items</div>
              ) : (data?.lowStock ?? []).map(item => (
                <div key={item.sku} className="card-pad-sm card-header-border flex-center gap-10">
                  <div className="flex-1-min-0">
                    <div className="text-11 font-semibold text-primary text-ellipsis-nowrap">
                      {item.name}
                    </div>
                    <div className="text-10 text-muted">{item.sku}</div>
                  </div>
                  <span className={`badge ${item.available === 0 ? 'badge-red' : 'badge-amber'}`}>
                    {item.available} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="card">
          <div className="card-pad-sm flex-between card-header-border" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="chart-title">Product Inventory</span>
            <div className="flex-center gap-2">
              <form onSubmit={handleSearch} className="search-bar">
                <Search size={14} color="var(--text-muted)" />
                <input
                  placeholder="Search SKU or name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </form>
              <select className="filter-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} title="Filter by category">
                <option value="">All Categories</option>
                {(data?.categories ?? []).map(c => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="data-table-wrap border-none" style={{ borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th className="text-right">Available</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-right">Incoming</th>
                </tr>
              </thead>
              <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-48 text-center text-muted">Loading…</td></tr>
                  ) : (data?.products ?? []).map(p => (
                    <tr key={p.sku}>
                      <td className="td-mono text-11">{p.sku}</td>
                      <td className="truncate text-12" style={{ maxWidth: 280 }}>{p.name}</td>
                      <td>{p.category ? <span className="badge badge-blue">{p.category}</span> : '—'}</td>
                      <td className="text-12 text-secondary">{p.brand || '—'}</td>
                      <td className={`text-right font-semibold${(p.available ?? 0) <= 5 ? ' text-red' : ' text-green'}`}>
                        {(p.available ?? 0).toLocaleString()}
                      </td>
                      <td className="text-right text-muted">{(p.remaining ?? 0).toLocaleString()}</td>
                      <td className="text-right text-cyan-500">{(p.incoming ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="pagination-info">
              {data ? `${(page - 1) * limit + 1}–${Math.min(page * limit, data.total)} of ${data.total.toLocaleString()} products` : ''}
            </span>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous page">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            {totalPages > 5 && <span className="text-muted text-12">…{totalPages}</span>}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} title="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
