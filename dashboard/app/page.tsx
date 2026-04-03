'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, ShoppingCart, TrendingUp, Package,
  ArrowUpRight, Users, Star, LayoutDashboard, Calendar
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
  topCustomers: { name: string; revenue: number; pct: number }[];
  statusBreakdown: { id: string; value: number }[];
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
      <div className="animate-fade-up">
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex-center">
                <LayoutDashboard size={14} className="text-blue-500" />
              </div>
              <div className="text-11 font-bold text-blue-500 uppercase tracking-wider">Analytics</div>
            </div>
            <h1>Overview</h1>
            <div className="page-title-sub">Jan – Feb 2026 · SKi Company</div>
          </div>
        </div>
        <div className="page-body">
          <div className="kpi-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="kpi-card skeleton-card">
                <div className="skeleton h-skeleton-label mb-8" />
                <div className="skeleton h-skeleton-value mb-4" />
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex-center">
              <LayoutDashboard size={14} className="text-blue-500" />
            </div>
            <div className="text-11 font-bold text-blue-500 uppercase tracking-wider">Analytics</div>
          </div>
          <h1>Overview</h1>
          <div className="page-title-sub">Business performance at a glance · Jan – Feb 2026</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge badge-gray px-12 py-6 flex items-center gap-2">
            <Calendar size={12} />
            Last 60 Days
          </div>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="mb-24 p-16 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex-center text-white font-bold">!</div>
            <div>
              <p className="font-bold">Summary Data Unavailable</p>
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
            <div className="kpi-sub">
              <span className="text-blue-500 font-medium">฿{kpis.total_net?.toLocaleString()}</span> Gross Total
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-icon-wrap bg-violet-icon">
              <ShoppingCart size={18} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{kpis.total_orders.toLocaleString()}</div>
            <div className="kpi-label">Total Invoices</div>
            <div className="kpi-sub">Active & Valid orders</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{fmt(kpis.avg_order_value)}</div>
            <div className="kpi-label">Avg Order Value</div>
            <div className="kpi-sub">per customer invoice</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Package size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">{kpis.active_skus?.toLocaleString()}</div>
            <div className="kpi-label">Active SKUs</div>
            <div className="kpi-sub">{fmtShort(kpis.total_available || 0)} units in stock</div>
          </div>
        </div>

        {/* Revenue Trend + Top Customers */}
        <div className="grid-2-1 mb-24">
          {/* Revenue Trend Chart */}
          <div className="chart-panel">
            <div className="chart-title mb-16">Revenue Trend (Last 30 Days)</div>
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
                  tickFormatter={d => d.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => fmtShort(v)} width={52} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: any) => [fmt(v as number), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#revGrad)" dot={{ r: 3, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers */}
          <div className="chart-panel">
            <div className="chart-title flex items-center gap-2 mb-16">
              <Users size={16} className="text-secondary" /> 
              <span>Top Customers</span>
            </div>
            <div className="flex flex-col gap-16">
              {(data?.topCustomers ?? []).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-6">
                    <div className="text-12 font-semibold truncate flex items-center gap-2">
                      {i === 0 && <Star size={12} className="text-amber-500 fill-amber-500" />}
                      {c.name}
                    </div>
                    <div className="text-11 font-bold text-secondary uppercase">{fmt(c.revenue)}</div>
                  </div>
                  <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${c.pct}%`,
                        backgroundColor: CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]
                      }} 
                    />
                  </div>
                  <div className="flex justify-between mt-4">
                    <div className="text-10 text-muted uppercase tracking-wider font-bold">{c.pct}% Share</div>
                    <div className="text-10 text-muted italic">Contributor v1</div>
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
            <div className="chart-title mb-16 flex items-center justify-between">
              <span>Top Products by Revenue</span>
              <div className="badge badge-blue">Top 5</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={(data?.topSkus ?? []).map(s => ({ ...s, shortName: s.name.length > 25 ? s.name.slice(0, 25) + '…' : s.name }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => fmtShort(v)} />
                <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false} width={150} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 10px 15px -10px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: any) => [fmt(v as number), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Invoice Status Donut */}
          <div className="chart-panel">
            <div className="chart-title mb-16">Invoice Workflow Status</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data?.statusBreakdown ?? []}
                  cx="40%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  dataKey="value"
                  nameKey="id"
                  paddingAngle={4}
                >
                  {(data?.statusBreakdown ?? []).map((entry, index) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.id as string] || '#94a3b8'} stroke="none" />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string, entry: any) => (
                    <span className="text-12 ml-4">
                      <span className="font-bold text-primary">{value}</span>
                      <span className="text-secondary ml-8">{entry.payload.value.toLocaleString()}</span>
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: any) => [v.toLocaleString(), 'Invoices']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
