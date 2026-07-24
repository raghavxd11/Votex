"use client";

import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';

export interface HistoryRecord {
    id?: string;
    timestamp: string;
    probability: number;
}

export const HistoricalTrendChart = () => {
  const { token } = useAuth();
  const [data, setData] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/v1/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (loading) {
      return (
          <div className="w-full h-64 bg-slate-900/50 rounded-xl border border-white/[0.06] shadow-inner p-4 flex flex-col items-center justify-center animate-pulse">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">System Analytics & Trend</h4>
              <p className="text-xs text-gray-400">Loading historical data...</p>
          </div>
      );
  }

  // Sort data chronologically for the chart if it's descending
  const sortedData = [...data].reverse().map(item => ({
    ...item,
    date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }));

  if (!sortedData || sortedData.length === 0) {
      return (
          <div className="w-full h-64 bg-slate-900/50 rounded-xl border border-white/[0.06] shadow-inner p-4 flex flex-col items-center justify-center">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">System Analytics & Trend</h4>
              <p className="text-xs text-gray-500 italic">Not enough historical data.</p>
          </div>
      );
  }

  return (
    <div className="w-full h-64 bg-slate-900/50 rounded-xl border border-white/[0.06] shadow-inner p-4 relative overflow-hidden mt-4">
        <h4 className="absolute top-4 left-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest z-10">Historical Distress Trend</h4>
        <ResponsiveContainer width="100%" height="100%" className="pt-8">
            <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="50%" stopColor="#eab308" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    itemStyle={{ color: '#f87171', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Distress Prob.']}
                />
                <Area type="monotone" dataKey="probability" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorProb)" />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
};
