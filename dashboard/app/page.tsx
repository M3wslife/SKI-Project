'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useId, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector, ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Treemap } from 'recharts';
import { RefreshCw, Users, Search, ShoppingBag, BarChart3 } from 'lucide-react';
import { useSidebar } from '@/components/layout/SidebarContext';

function fmt(n: number) {
  return `฿${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PLSummary {
  total_orders: number;
  total_revenue: number;
  total_vat: number;
  total_net: number;
  avg_order_value: number;
}

interface PLRow {
  date: string;
  orders: number;
  revenue: number;
  vat_amount: number;
  net_amount: number;
}

const Dot = ({ color }: { color: string }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--dot-color', color);
    }
  }, [color]);

  return (
    <span 
      ref={ref}
      className="w-8 h-8 rounded-full dynamic-bg" 
    />
  );
};

const CustomTooltip = ({ active, payload, isCurrency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip p-10 shadow-lg border border-slate-700 rounded-lg bg-slate-900/90 text-white text-xs">
        <p className="font-semibold mb-2">{payload[0].name}</p>
        <p className="font-bold text-blue-400">
          {isCurrency ? fmt(payload[0].value) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const MultiTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip p-10 shadow-lg border border-slate-700 rounded-lg bg-slate-900/90 text-white text-xs">
        <p className="font-semibold mb-4 text-slate-400">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex-between gap-10">
              <span className="flex-center gap-2">
                <Dot color={entry.color} />
                <span className="text-slate-300 capitalize">{entry.name}:</span>
              </span>
              <span className="font-bold text-right">
                {entry.name === 'Revenue' ? fmt(entry.value) : (entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ProfitLossPage() {
  const { isCollapsed } = useSidebar();
  const [summary, setSummary] = useState<PLSummary | null>(null);
  const [rows, setRows] = useState<PLRow[]>([]);
  const [assignees, setAssignees] = useState<{ name: string; value: number }[]>([]);
  const [channels, setChannels] = useState<{ name: string; value: number }[]>([]);
  const [itemChannels, setItemChannels] = useState<{ name: string; value: number }[]>([]);
  const [shops, setShops] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [gradeData, setGradeData] = useState<{ name: string; value: number }[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterShop, setFilterShop] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  const resetFilters = () => {
    setFilterAssignee('');
    setFilterShop('');
    setFilterChannel('');
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ year });
    if (month) params.set('month', month);
    if (filterAssignee) params.set('assignee', filterAssignee);
    if (filterShop) params.set('shop', filterShop);
    if (filterChannel) params.set('channel', filterChannel);

    fetch(`/api/pl?${params}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Database connection error — please check your Turso configuration.');
        }
        return r.json();
      })
      .then(d => {
        setSummary(d.summary);
        setRows(d.rows ?? []);
        
        // Deduplicate assignees by name
        const rawAssignees = (d.assignees ?? []) as { name: string; value: number }[];
        const uniqueAssignees = Object.values(
          rawAssignees.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
            if (!item || !item.name) return acc;
            if (!acc[item.name]) acc[item.name] = { name: item.name, value: 0 };
            acc[item.name].value += item.value;
            return acc;
          }, {})
        ).sort((a, b) => b.value - a.value);
        setAssignees(uniqueAssignees);

        setChannels(d.channels ?? []);
        setItemChannels(d.itemChannels ?? []);
        setShops(d.shops ?? []);
        setMonthlyData(d.monthlyData ?? []);

        // Deduplicate gradeData
        const rawGradeData = (d.gradeData ?? []) as { name: string; value: number }[];
        const uniqueGradeData = Object.values(
          rawGradeData.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
            if (!item || !item.name) return acc;
            if (!acc[item.name]) acc[item.name] = { name: item.name, value: 0 };
            acc[item.name].value += item.value;
            return acc;
          }, {})
        ).sort((a, b) => b.value - a.value);
        setGradeData(uniqueGradeData);
        
        setYears(d.years ?? []);
        setLoading(false);
      })
      .catch((e: Error) => {
        console.error('Fetch error:', e);
        setError(e.message);
        setLoading(false);
      });
  }, [year, month, filterAssignee, filterShop, filterChannel]);

  useEffect(() => { load(); }, [load]);


  const groupTop10 = (data: { name: string; value: number }[]) => {
    if (data.length <= 10) return data;
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 10);
    const others = sorted.slice(10);
    if (others.length === 0) return top;
    
    return [
      ...top,
      { name: 'Others', value: others.reduce((s, a) => s + a.value, 0) }
    ];
  };

  const displayedAssignees = groupTop10(assignees);
  const displayedShops = groupTop10(shops);
  const displayedChannels = groupTop10(itemChannels);


  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <div>
          <h1>Profit & Loss</h1>
          <div className="page-title-sub">Revenue, VAT, and net amounts by date</div>
        </div>
        <div className="flex-center gap-2">
          {/* Year Filter */}
          <select title="Select Year" className="filter-select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="all">All Time</option>
            {years.length > 0 ? years.map(y => <option key={y} value={y}>{y}</option>)
              : <option value="2026">2026</option>}
          </select>
          {/* Month Filter */}
          <select 
            title="Select Month" 
            className="filter-select" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            disabled={year === 'all'}
          >
            <option value="">All Months</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
              <option key={m} value={m}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <button title="Refresh Data" className="btn btn-ghost btn-icon-only" onClick={load}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {loading && (
            <div className="ml-8 px-8 py-4 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold animate-pulse">
              SYNCING...
            </div>
          )}
          {(filterAssignee || filterShop || filterChannel) && (
            <button 
              onClick={resetFilters}
              className="px-12 py-6 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Status Bar */}
      {(filterAssignee || filterShop || filterChannel) && (
        <div className="flex flex-wrap gap-8 mb-16 px-4">
          {filterAssignee && (
            <div className="flex items-center gap-6 px-10 py-4 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
              <span className="opacity-50 uppercase tracking-wider font-bold">Sales Rep:</span>
              <span className="text-blue-400 font-semibold">{filterAssignee}</span>
              <button title="Clear Assignee" onClick={() => setFilterAssignee('')} className="hover:text-white ml-2">×</button>
            </div>
          )}
          {filterShop && (
            <div className="flex items-center gap-6 px-10 py-4 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
              <span className="opacity-50 uppercase tracking-wider font-bold">Shop:</span>
              <span className="text-emerald-400 font-semibold">{filterShop}</span>
              <button title="Clear Shop" onClick={() => setFilterShop('')} className="hover:text-white ml-2">×</button>
            </div>
          )}
          {filterChannel && (
            <div className="flex items-center gap-6 px-10 py-4 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
              <span className="opacity-50 uppercase tracking-wider font-bold">Channel:</span>
              <span className="text-cyan-400 font-semibold">{filterChannel}</span>
              <button title="Clear Channel" onClick={() => setFilterChannel('')} className="hover:text-white ml-2">×</button>
            </div>
          )}
        </div>
      )}

      <div className="page-body">
        {error && (
          <div className="mb-24 p-16 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex-center text-white font-bold">!</div>
            <div>
              <p className="font-bold">Database Error</p>
              <p className="opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid-4 mb-24">
          <div className="kpi-card">
            <div className="kpi-value text-18">{loading ? '—' : (summary?.total_orders ?? 0).toLocaleString()}</div>
            <div className="kpi-label">Total Orders</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value text-18">{loading ? '—' : fmt(summary?.total_revenue ?? 0)}</div>
            <div className="kpi-label">Revenue (ex-VAT)</div>
            <div className="text-[10px] text-slate-500 mt-1">Sourced from Line Items</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value text-18">{loading ? '—' : fmt(summary?.total_vat ?? 0)}</div>
            <div className="kpi-label">Total VAT</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value text-18">{loading ? '—' : fmt(summary?.total_net ?? 0)}</div>
            <div className="kpi-label">Total Net Amount</div>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-16 mb-24">
          {/* Assignee Pie Chart */}
          <div className="card shadow-sm border-slate-700/50 p-16 h-280 bg-card flex flex-col items-center justify-center text-center">
            <div className="mb-8">
              <h3 className="text-base font-semibold flex items-center justify-center gap-2 text-slate-100">
                <Users size={18} className="text-blue-400" />
                Group by Sale name
              </h3>
              <p className="text-xs text-slate-400 mt-1">Revenue by sales rep</p>
            </div>
            <div className={`w-full ${isCollapsed ? 'h-260' : 'h-210'} relative overflow-hidden`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const entry = data.activePayload[0].payload;
                    if (entry.name === 'Others') return;
                    console.log('Pie clicked (Pie):', entry.name);
                    setFilterAssignee(prev => prev === entry.name ? '' : entry.name);
                  }
                }}>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={displayedAssignees}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCollapsed ? 95 : 75}
                    outerRadius={isCollapsed ? 125 : 100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onClick={(entry: any) => {
                      const name = String(entry?.name ?? '');
                      if (name === 'Others') return;
                      console.log('Pie clicked (Cell):', name);
                      setFilterAssignee(prev => prev === name ? '' : name);
                    }}
                    className="cursor-pointer"
                  >
                    {displayedAssignees.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          '#60a5fa', '#818cf8', '#34d399', '#fbbf24', '#f87171', 
                          '#22d3ee', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c'
                        ][index % 10]} 
                        stroke={filterAssignee === entry.name ? '#fff' : 'none'}
                        strokeWidth={filterAssignee === entry.name ? 3 : 0}
                        opacity={filterAssignee && filterAssignee !== entry.name ? 0.4 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {loading && <div className="absolute inset-0 flex-center justify-center bg-slate-900/10 pointer-events-none animate-pulse" />}
            </div>
          </div>

          {/* Shop Pie Chart */}
          <div className="card shadow-sm border-slate-700/50 p-16 h-280 bg-card flex flex-col items-center justify-center text-center">
            <div className="mb-8">
              <h3 className="text-base font-semibold flex items-center justify-center gap-2 text-slate-100">
                <Search size={18} className="text-emerald-400" />
                Sale by Shop
              </h3>
              <p className="text-xs text-slate-400 mt-1">Breakdown by branch</p>
            </div>
            <div className={`w-full ${isCollapsed ? 'h-260' : 'h-210'} relative overflow-hidden`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const entry = data.activePayload[0].payload;
                    if (entry.name === 'Others') return;
                    setFilterShop(prev => prev === entry.name ? '' : entry.name);
                  }
                }}>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={displayedShops}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCollapsed ? 95 : 75}
                    outerRadius={isCollapsed ? 125 : 100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onClick={(entry: any) => {
                      const name = String(entry?.name ?? '');
                      if (name === 'Others') return;
                      setFilterShop(prev => prev === name ? '' : name);
                    }}
                    className="cursor-pointer"
                  >
                    {displayedShops.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          '#10b981', '#34d399', '#059669', '#6ee7b7', '#10b981',
                          '#047857', '#a7f3d0', '#065f46', '#34d399', '#10b981', '#64748b'
                        ][index % 11]} 
                        stroke={filterShop === entry.name ? '#fff' : 'none'}
                        strokeWidth={filterShop === entry.name ? 3 : 0}
                        opacity={filterShop && filterShop !== entry.name ? 0.4 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {loading && <div className="absolute inset-0 flex-center justify-center bg-slate-900/10 pointer-events-none animate-pulse" />}
            </div>
          </div>

          {/* Sales Channel Pie Chart */}
          <div className="card shadow-sm border-slate-700/50 p-16 h-280 bg-card flex flex-col items-center justify-center text-center">
            <div className="mb-8">
              <h3 className="text-base font-semibold flex items-center justify-center gap-2 text-slate-100">
                <ShoppingBag size={18} className="text-cyan-400" />
                Channels
              </h3>
              <p className="text-xs text-slate-400 mt-1">Item-level breakdown</p>
            </div>
            <div className={`w-full ${isCollapsed ? 'h-260' : 'h-210'} relative overflow-hidden`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const entry = data.activePayload[0].payload;
                    if (entry.name === 'Others') return;
                    setFilterChannel(prev => prev === entry.name ? '' : entry.name);
                  }
                }}>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={displayedChannels}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCollapsed ? 95 : 75}
                    outerRadius={isCollapsed ? 125 : 100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onClick={(entry: any) => {
                      const name = String(entry?.name ?? '');
                      if (name === 'Others') return;
                      setFilterChannel(prev => prev === name ? '' : name);
                    }}
                    className="cursor-pointer"
                  >
                    {displayedChannels.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          '#06b6d4', '#22d3ee', '#0891b2', '#67e8f9', '#06b6d4',
                          '#0e7490', '#a5f3fc', '#155e75', '#22d3ee', '#06b6d4', '#64748b'
                        ][index % 11]} 
                        stroke={filterChannel === entry.name ? '#fff' : 'none'}
                        strokeWidth={filterChannel === entry.name ? 3 : 0}
                        opacity={filterChannel && filterChannel !== entry.name ? 0.4 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {loading && <div className="absolute inset-0 flex-center justify-center bg-slate-900/10 pointer-events-none animate-pulse" />}
            </div>
          </div>
        </div>
        {/* Monthly Trend Chart */}
        <div className="card shadow-sm border-slate-700/50 mb-24 p-24 h-450 bg-card">
          <div className="mb-20">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
              <BarChart3 size={20} className="text-indigo-400" />
              Monthly Sale and Orders
            </h3>
            <p className="text-xs text-slate-400 mt-1">Revenue trend (bars) vs Number of orders (line)</p>
          </div>
          <div className="w-full h-350">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(v: number) => `฿${(v / 1000000).toFixed(1)}M`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip content={<MultiTooltip />} />
                <Legend verticalAlign="top" align="right" />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 4 }} name="Orders" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>



      </div>
    </div>
  );
}
