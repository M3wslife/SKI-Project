'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, ShoppingCart, TrendingUp, Package,
  ArrowUpRight, Users, Star
} from 'lucide-react';

function fmt(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${(n / 1_000).toFixed(1)}K`;
  return `฿${n.toLocaleString()}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#3b82f6',
  BILLING_NOTE: '#8b5cf6',
  PAID: '#10b981',
  VOIDED: '#ef4444',
};

const CUSTOMER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface OverviewData {
  kpis: {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
    total_net: number;
    active_skus: number;
    total_available: number;
  };
  revenueTrend: { date: string; orders: number; revenue: number }[];
  topCustomers: { customer_name: string; orders: number; revenue: number; pct: number }[];
  statusBreakdown: { status: string; cnt: number; revenue: number }[];
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch('/api/overview')
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
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Overview</h1>
            <div className="page-title-sub">Business performance at a glance</div>
          </div>
        </div>
        <div className="page-body">
          <div className="kpi-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="kpi-card">
                <div className="skeleton h-skeleton-label" />
                <div className="skeleton h-skeleton-value" />
                <div className="skeleton h-skeleton-sub" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || { 
    total_revenue: 0, total_orders: 0, avg_order_value: 0, 
    active_skus: 0, total_available: 0, total_net: 0 
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <div className="page-title-sub">Jan – Feb 2026 · SKi Company</div>
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

        {/* KPI Cards */}
        <div className="kpi-grid mb-24">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-icon-wrap bg-blue-icon">
              <DollarSign size={18} color="#3b82f6" />
            </div>
            <div className="kpi-value">{fmt(kpis.total_revenue)}</div>
            <div className="kpi-label">Revenue (ex-VAT)</div>
            <div className="kpi-sub">Total from all valid invoices</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-icon-wrap bg-violet-icon">
              <ShoppingCart size={18} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{kpis.total_orders.toLocaleString()}</div>
            <div className="kpi-label">Total Orders</div>
            <div className="kpi-sub">PENDING + BILLING_NOTE + PAID</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{fmt(kpis.avg_order_value)}</div>
            <div className="kpi-label">Avg Order Value</div>
            <div className="kpi-sub">per invoice</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Package size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">{kpis.active_skus?.toLocaleString()}</div>
            <div className="kpi-label">Active SKUs</div>
            <div className="kpi-sub">{fmtShort(kpis.total_available)} units available</div>
          </div>
        </div>

        {/* Revenue Trend + Top Customers */}
        <div className="grid-2-1 mb-24">
          {/* Revenue Trend Chart */}
          <div className="chart-panel">
            <div className="chart-title">Revenue Trend</div>
            <div className="chart-subtitle">Daily revenue (ex-VAT) · Jan – Feb 2026</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.revenueTrend ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => fmtShort(v)} width={52} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [fmt(v as number), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers */}
          <div className="chart-panel">
            <div className="chart-title flex-row-gap-6">
              <Users size={14} color="#64748b" /> Top Customers
            </div>
            <div className="chart-subtitle">by revenue · Jan – Feb 2026</div>
            <div className="flex-col-gap-10">
              {(data?.topCustomers ?? []).map((c, i) => (
                <div key={i}>
                  <div className="flex-between-mb4">
                    <span className="text-12 font-medium truncate text-max-160">
                      {i === 0 && <Star size={11} className="inline mr-4 text-amber-500" />}
                      {c.customer_name}
                    </span>
                    <span className="text-12 font-semibold ml-8">{fmt(c.revenue)}</span>
                  </div>
                  <div className="h-4 progress rounded-full overflow-hidden bg-slate-100">
                    <div 
                      className="h-full rounded-full transition-all duration-700 progress-fill" 
                      style={{
                        '--progress-pct': `${c.pct}%`,
                        '--progress-color': CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]
                      } as React.CSSProperties} 
                    />
                  </div>
                  <div className="text-10 text-muted mt-2">
                    {c.orders} orders · {c.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top SKUs + Status Breakdown */}
        <div className="grid-2">
          {/* Top SKUs */}
          <div className="chart-panel">
            <div className="chart-title">Top Products by Revenue</div>
            <div className="chart-subtitle">Top 5 SKUs · Jan – Feb 2026</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={(data?.topSkus ?? []).map(s => ({ ...s, shortName: s.name.slice(0, 28) + (s.name.length > 28 ? '…' : '') }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => fmtShort(v)} />
                <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false} width={170} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [fmt(v as number), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Invoice Status Donut */}
          <div className="chart-panel">
            <div className="chart-title">Invoice Status Breakdown</div>
            <div className="chart-subtitle">by order count</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.statusBreakdown ?? []}
                  cx="40%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="cnt"
                  nameKey="status"
                  paddingAngle={3}
                >
                  {(data?.statusBreakdown ?? []).map((entry, index) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string, entry: { payload?: { cnt?: number } }) => (
                    <span className="text-12 text-secondary">
                      {value} <strong className="text-primary">{entry?.payload?.cnt?.toLocaleString()}</strong>
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [v.toLocaleString() + ' orders', name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
