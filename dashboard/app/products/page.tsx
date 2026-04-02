'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category: string;
  brand: string;
  unit: string;
  price: number;
  purchase_price: number;
  available: number;
  remaining: number;
  incoming: number;
  status: string;
  total_sold: number;
  total_revenue: number;
}

interface ProductsData {
  products: Product[];
  total: number;
  page: number;
  categories: string[];
}

function fmt(n: number) {
  return `฿${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function marginPct(price: number, cost: number) {
  if (!price || !cost || cost <= 1) return null;
  return Math.round(((price - cost) / price) * 100);
}

export default function ProductsPage() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    fetch(`/api/products?${params}`)
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
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <div className="page-title-sub">
            {data ? `${data.total.toLocaleString()} SKUs in catalog` : 'Full product catalog'}
          </div>
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

        {/* Filters */}
        <div className="flex-center gap-2 mb-20">
          <form onSubmit={handleSearch} className="search-bar max-w-400 flex-1">
            <Search size={14} color="var(--text-muted)" />
            <input
              id="product-search"
              placeholder="Search by SKU or product name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </form>
          <select
            title="Select Category"
            className="filter-select"
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {(data?.categories ?? []).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="button" onClick={handleSearch}>
            <Search size={14} /> Search
          </button>
        </div>

        {/* Product Table */}
        <div className="card">
          <div className="data-table-wrap border-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Unit</th>
                  <th className="text-right">Sale Price</th>
                  <th className="text-right">Margin</th>
                  <th className="text-right">Available</th>
                  <th className="text-right text-green">Sold Qty</th>
                  <th className="text-right text-blue">Revenue (ex-VAT)</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-right">Incoming</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-48 text-muted">
                      <ShoppingBag size={32} className="mb-4 opacity-30" />
                      <br />Loading products…
                    </td>
                  </tr>
                ) : (data?.products ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-48 text-muted">
                      No products found
                    </td>
                  </tr>
                ) : (data?.products ?? []).map(p => {
                  const margin = marginPct(p.price, p.purchase_price);
                  return (
                    <tr key={p.sku}>
                      <td className="td-mono text-11 truncate">{p.sku}</td>
                      <td className="text-11 truncate max-w-300">
                        {p.name}
                      </td>
                      <td>
                        {p.category && p.category !== '-'
                          ? <span className="badge badge-blue text-10">{p.category}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className="text-12 text-secondary truncate">
                        {p.brand || '—'}
                      </td>
                      <td className="text-11 text-muted">{p.unit || '—'}</td>
                      <td className="text-right font-semibold text-12 truncate">
                        {p.price ? fmt(p.price) : '—'}
                      </td>
                      <td className="text-right">
                        {margin !== null
                          ? <span className={`badge ${margin >= 30 ? 'badge-green' : margin >= 15 ? 'badge-amber' : 'badge-red'}`}>
                              {margin}%
                            </span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className={`text-right font-semibold text-12 ${(p.available ?? 0) <= 5 ? 'text-red' : (p.available ?? 0) > 50 ? 'text-green' : ''}`}>
                        {(p.available ?? 0).toLocaleString()}
                      </td>
                      <td className="text-right font-bold text-green">
                        {(p.total_sold ?? 0).toLocaleString()}
                      </td>
                      <td className="text-right font-bold text-blue">
                        {fmt(p.total_revenue ?? 0)}
                      </td>
                      <td className="text-right text-muted">
                        {(p.remaining ?? 0).toLocaleString()}
                      </td>
                      <td className="text-right text-cyan-500">
                        {(p.incoming ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">
              {data ? `${(page - 1) * limit + 1}–${Math.min(page * limit, data.total)} of ${data.total.toLocaleString()} products` : ''}
            </span>
            <button title="Previous Page" className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            {totalPages > 7 && <span className="text-muted">…{totalPages}</span>}
            <button title="Next Page" className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
