'use client';

import React from 'react';
import { AlertCircle, ArrowRight, Package, TriangleAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface SupplyAlert {
  sku: string;
  name: string;
  stock: number;
}

interface AlertTrayProps {
  alerts: SupplyAlert[];
  loading?: boolean;
}

export default function AlertTray({ alerts, loading }: AlertTrayProps) {
  if (loading) {
    return (
      <div className="card card-pad bg-card animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-slate-50 rounded" />
          <div className="h-12 bg-slate-50 rounded" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="card overflow-hidden border-amber-500/20 bg-amber-50/10">
      <div className="card-pad-sm border-b border-amber-500/10 bg-amber-100/10 flex-between">
        <div className="flex-center gap-2 text-amber-600 font-bold text-12">
          <TriangleAlert size={14} />
          CRITICAL STOCK ALERTS
        </div>
        <span className="badge badge-amber">{alerts.length} Items</span>
      </div>
      
      <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map((alert, idx) => (
          <motion.div 
            key={alert.sku}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <Package size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-13 font-bold text-slate-800 truncate max-w-[180px]">{alert.name}</span>
                <span className="text-11 text-slate-400 font-mono">{alert.sku}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-13 font-bold ${alert.stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                {alert.stock} units
              </div>
              <div className="text-10 text-slate-400">Remaining Stock</div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="p-3 bg-amber-50/50 border-t border-amber-100 flex items-center justify-center">
        <button className="text-11 font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
          View All Inventory <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}
