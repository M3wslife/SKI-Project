'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Factory, Gauge, Warehouse } from 'lucide-react';

interface WarehouseStat {
  name: string;
  units: number;
  skus: number;
}

interface InboundPulseProps {
  stats: WarehouseStat[];
  loading?: boolean;
}

const PULSE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function InboundPulse({ stats, loading }: InboundPulseProps) {
  if (loading) {
    return (
      <div className="card h-[180px] flex items-center justify-center bg-slate-50/10">
        <div className="flex animate-pulse space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-2 bg-slate-200 rounded col-span-2"></div>
              <div className="h-2 bg-slate-200 rounded col-span-1"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxUnits = Math.max(...stats.map(s => s.units), 1);

  return (
    <div className="card bg-slate-900 border-slate-800 text-white overflow-hidden p-0">
      <div className="p-4 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse size={16} className="text-blue-400" />
          <span className="text-13 font-bold uppercase tracking-wider text-slate-100">Warehouse Network</span>
        </div>
        <div className="flex items-center gap-4 text-11 font-mono text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> PULSING</span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.slice(0, 4).map((wh, idx) => {
            const utilization = (wh.units / maxUnits) * 100;
            const color = PULSE_COLORS[idx % PULSE_COLORS.length];

            return (
              <motion.div 
                key={wh.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col items-center group hover:bg-slate-800/60 transition-all duration-300"
                style={{ '--pulse-color': color } as React.CSSProperties}
              >
                <div 
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full opacity-60 group-hover:opacity-100 transition-opacity bg-[var(--pulse-color)] shadow-[0_0_10px_var(--pulse-color)]"
                />
                
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-3 text-slate-400 group-hover:text-white transition-colors">
                  <Box size={18} />
                </div>
                
                <span className="text-12 font-bold text-slate-100 text-center truncate w-full mb-1">{wh.name}</span>
                <span className="text-20 font-black tracking-tight text-[var(--pulse-color)]">{wh.units.toLocaleString()}</span>
                <span className="text-10 text-slate-500 uppercase font-mono tracking-tighter">UNITS AVAILABLE</span>
                
                <div className="w-full mt-4 h-1 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${utilization}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-[var(--pulse-color)]" 
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center text-11 text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-bold">FLOW: ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 group cursor-default">
            <Gauge size={12} className="group-hover:text-blue-400 transition-colors" /> Optimal Efficiency
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Factory size={12} /> INDUSTRIAL HARDWARE
        </div>
      </div>
    </div>
  );
}
