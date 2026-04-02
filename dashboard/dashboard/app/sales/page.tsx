'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';

function fmt(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${n.toLocaleString()}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface SalesData {
  timeSeries: { period: string; orders: number; revenue: number; net_amount: number }[];
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
  topCustomers: { customer_name: string; orders: number; revenue: number }[];
  statusBreakdown: { status: string; cnt: number; revenue: number }[];
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge badge-blue',
  BILLING_NOTE: 'badge badge-violet',
  PAID: 'badge badge-green',
  VOIDED: 'badge badge-red',
};

export default function SalesPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sales?groupBy=${groupBy}`)
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
  }, [groupBy]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = data?.timeSeries?.reduce((s, r) => s + r.revenue, 0) ?? 0;
  const totalOrders = data?.timeSeries?.reduce((s, r) => s + r.orders, 0) ?? 0;

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <h1>Sales Analytics</h1>
          <div className="page-title-sub">Revenue & order trends · Jan – Feb 2026</div>
        </div>
        <div className="flex-center gap-2">
          <div className="tabs">
            {(['day', 'month'] as const).map(g => (
              <button key={g} className={`tab-btn${groupBy === g ? ' active' : ''}`} onClick={() => setGroupBy(g)}>
                {g === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon-only" onClick={load} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
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

        {/* Summary KPIs */}
        <div className="grid-3 mb-24">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-label mb-6">Revenue (ex-VAT)</div>
            <div className="kpi-value">{loading ? '—' : fmt(totalRevenue)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-label mb-6">Total Orders</div>
            <div className="kpi-value">{loading ? '—' : totalOrders.toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-label mb-6">Avg Revenue / Order</div>
            <div className="kpi-value">{loading || !totalOrders ? '—' : fmt(totalRevenue / totalOrders)}</div>
          </div>
        </div>

        {/* Revenue + Orders Chart */}
        <div className="chart-panel mb-24">
          <div className="chart-title">Revenue & Orders Over Time</div>
          <div className="chart-subtitle">Bars = Revenue (฿) · Line = Order Count</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data?.timeSeries ?? []} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={d => groupBy === 'day' ? d.slice(5) : d} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={fmtShort} width={56} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: any) => [name === 'revenue' ? fmt(v as number) : v.toLocaleString(), name === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={groupBy === 'day' ? 8 : 30} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="orders" stroke="#8b5cf6"
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top SKUs + Top Customers */}
        <div className="grid-2">
          {/* Top SKUs */}
          <div className="card">
            <div className="card-pad-sm flex-between mb-16 border-b-thin">
              <span className="chart-title">Top 10 Products</span>
              <span className="text-muted">by revenue</span>
            </div>
            <div className="data-table-wrap border-none rounded-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SKU</th>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topSkus ?? []).map((row, i) => (
                    <tr key={row.sku}>
                      <td className="w-30">
                        <span className={`badge ${i < 3 ? 'badge-blue' : 'badge-gray'}`}>{i + 1}</span>
                      </td>
                      <td className="td-mono truncate text-max-100">{row.sku}</td>
                      <td className="truncate text-max-180 text-12">{row.name}</td>
                      <td className="text-right text-muted">{row.qty?.toLocaleString()}</td>
                      <td className="text-right font-semibold text-blue">{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Customers */}
          <div className="card">
            <div className="card-pad-sm flex-between mb-16 border-b-thin">
              <span className="chart-title">Top 10 Customers</span>
              <span className="text-muted">by revenue</span>
            </div>
            <div className="data-table-wrap border-none rounded-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th className="text-right">Orders</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topCustomers ?? []).map((row, i) => (
                    <tr key={i}>
                      <td className="w-30">
                        <span className={`badge ${i < 3 ? 'badge-violet' : 'badge-gray'}`}>{i + 1}</span>
                      </td>
                      <td className="truncate text-max-200 text-12">{row.customer_name}</td>
                      <td className="text-right text-muted">{row.orders}</td>
                      <td className="text-right font-semibold text-blue">{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
