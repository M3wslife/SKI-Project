'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Users, Calendar,
  LayoutDashboard, ArrowUpRight, ArrowDownRight, Filter
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

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

interface SalesData {
  timeSeries: { period: string; orders: number; revenue: number; net_amount: number }[];
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
  topCustomers: { name: string; revenue: number }[];
  statusBreakdown: { name: string; value: number }[];
}

export default function SalesPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sales?groupBy=${groupBy}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Server error');
        }
        return r.json();
      })
      .then(d => { 
        setData(d); 
        setLoading(false); 
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [groupBy]);

  if (loading && !data) {
    return (
      <div className="animate-fade-up">
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-24 h-24 rounded-lg bg-emerald-500/10 flex-center">
                <ShoppingBag size={14} className="text-emerald-500" />
              </div>
              <div className="text-11 font-bold text-emerald-500 uppercase tracking-wider">Commerce</div>
            </div>
            <h1>Sales Analysis</h1>
          </div>
        </div>
        <div className="page-body">
          <div className="kpi-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="kpi-card skeleton-card">
                <div className="skeleton h-skeleton-value mb-4" />
                <div className="skeleton h-skeleton-label" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totals = data?.timeSeries.reduce((acc, curr) => ({
    revenue: acc.revenue + curr.revenue,
    orders: acc.orders + curr.orders,
    net: acc.net + (curr.net_amount || 0)
  }), { revenue: 0, orders: 0, net: 0 }) || { revenue: 0, orders: 0, net: 0 };

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-24 h-24 rounded-lg bg-emerald-500/10 flex-center">
              <ShoppingBag size={14} className="text-emerald-500" />
            </div>
            <div className="text-11 font-bold text-emerald-500 uppercase tracking-wider">Commerce</div>
          </div>
          <h1>Sales Analysis</h1>
          <div className="page-title-sub">Transaction volume & conversion trends</div>
        </div>

        <div className="flex items-center gap-2 bg-white/50 p-4 rounded-lg border border-slate-200">
          {(['day', 'week', 'month'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-12 py-6 rounded-md text-11 font-bold uppercase tracking-wider transition-all ${
                groupBy === g 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="mb-24 p-16 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* KPI Grid */}
        <div className="kpi-grid mb-24">
          <div className="kpi-card">
            <div className="kpi-card-accent bg-emerald-accent" />
            <div className="kpi-icon-wrap bg-emerald-icon">
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div className="kpi-value">{fmt(totals.revenue)}</div>
            <div className="kpi-label">Period Revenue</div>
            <div className="kpi-sub">ex-VAT totals for current view</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-blue-accent" />
            <div className="kpi-icon-wrap bg-blue-icon">
              <ShoppingBag size={18} color="#3b82f6" />
            </div>
            <div className="kpi-value">{totals.orders.toLocaleString()}</div>
            <div className="kpi-label">Invoice Count</div>
            <div className="kpi-sub">Successful transactions</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-violet-accent" />
            <div className="kpi-icon-wrap bg-violet-icon">
              <Calendar size={18} color="#8b5cf6" />
            </div>
            <div className="kpi-value">{fmt(totals.revenue / (totals.orders || 1))}</div>
            <div className="kpi-label">Avg Sale Price</div>
            <div className="kpi-sub">Revenue per transaction</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent bg-amber-accent" />
            <div className="kpi-icon-wrap bg-amber-icon">
              <Users size={18} color="#f59e0b" />
            </div>
            <div className="kpi-value">{data?.topCustomers.length ?? 0}</div>
            <div className="kpi-label">Active Customers</div>
            <div className="kpi-sub">Unique accounts this period</div>
          </div>
        </div>

        {/* Main Sales Trend */}
        <div className="chart-panel mb-24 shadow-sm">
          <div className="flex items-center justify-between mb-16 px-4">
            <div className="chart-title">Revenue & Volume Over Time</div>
            <div className="badge badge-emerald">Real-time sync</div>
          </div>
          <div className="w-full">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data?.timeSeries ?? []} margin={{ left: -20, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 4" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => groupBy === 'day' ? v.slice(8) : v}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => fmtShort(v)}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(v: any) => [fmt(v as number), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fill="url(#salesGrad)" 
                  dot={{ r: 3, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid-2">
          {/* Top Products */}
          <div className="chart-panel shadow-sm">
            <div className="chart-title mb-16 px-4">Top Products by Quantity</div>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.topSkus ?? []} layout="vertical" margin={{ left: 5, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    width={140}
                    tickFormatter={v => v.length > 20 ? v.slice(0, 18) + '...' : v}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ border: 'none', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="qty" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Concentration */}
          <div className="chart-panel shadow-sm">
            <div className="chart-title mb-16 px-4">Key Customer Concentration</div>
            <div className="flex flex-col gap-16 p-4">
              {data?.topCustomers.slice(0, 5).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-6">
                    <div className="text-12 font-semibold truncate flex-1 pr-12">{c.name}</div>
                    <div className="text-11 font-bold text-slate-500 uppercase">{fmt(c.revenue)}</div>
                  </div>
                  <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${(c.revenue / (data.topCustomers[0]?.revenue || 1)) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length]
                      }} 
                    />
                  </div>
                  <div className="flex justify-between mt-4">
                    <div className="text-10 text-muted uppercase tracking-wider font-bold">
                      {Math.round((c.revenue / (totals.revenue || 1)) * 100)}% Conversion
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
