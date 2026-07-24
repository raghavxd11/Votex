'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type HistoryRecord = {
  id: string;
  text: string;
  probability: number;
  status: string;
  timestamp: string;
};

function getRiskTier(prob: number): { label: string; color: string; bg: string; border: string } {
  if (prob <= 33) return { label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (prob <= 66) return { label: 'Medium Risk', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  return { label: 'High Risk', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const visibleHistory = history.filter((record) => (record.text ?? '').trim().length > 0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/v1/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (authLoading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col items-center px-5 py-10 w-full max-w-3xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full glass-card p-8 mb-8"
      >
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                {user.role}
              </span>
              <span className="text-[10px] text-gray-500">
                {visibleHistory.length} diagnostic session{visibleHistory.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {visibleHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              {
                label: 'Sessions',
                value: visibleHistory.length,
                color: 'text-indigo-400',
              },
              {
                label: 'Avg. Score',
                value: `${(visibleHistory.reduce((s, r) => s + r.probability, 0) / visibleHistory.length).toFixed(1)}%`,
                color: 'text-blue-400',
              },
              {
                label: 'Latest',
                value: `${visibleHistory[0]?.probability?.toFixed(1)}%`,
                color: visibleHistory[0]?.probability > 66 ? 'text-red-400' : visibleHistory[0]?.probability > 33 ? 'text-yellow-400' : 'text-emerald-400',
              },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <span className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Session History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-base">📋</span>
          Session History
        </h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleHistory.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500 text-sm">No diagnostic sessions found. Run your first analysis from the Dashboard.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleHistory.map((record, idx) => {
              const risk = getRiskTier(record.probability);
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="glass-card p-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: text & timestamp */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">
                        {record.text}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">{record.timestamp}</p>
                    </div>

                    {/* Right: score + risk badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-bold tabular-nums ${risk.color}`}>
                        {record.probability.toFixed(1)}%
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${risk.bg} ${risk.color} ${risk.border}`}>
                        {risk.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
