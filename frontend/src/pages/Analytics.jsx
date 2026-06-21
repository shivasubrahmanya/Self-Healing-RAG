import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';

export default function Analytics() {
  const { metrics, metricsLoading, setMetrics, setMetricsLoading } = useAppStore();
  const [history, setHistory] = useState([]);

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const data = await getMetrics();
      setMetrics(data);
      // Append to history for trend chart
      setHistory((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString(),
          confidence: Math.round((data.average_confidence || 0) * 100),
          retry_rate: Math.round((data.retry_rate || 0) * 100),
          hallucination_rate: Math.round((data.hallucination_rate || 0) * 100),
        },
      ]);
    } catch (e) { /* silent */ }
    finally { setMetricsLoading(false); }
  };

  useEffect(() => {
    loadMetrics();
    const iv = setInterval(loadMetrics, 15000);
    return () => clearInterval(iv);
  }, []);

  const statCards = metrics ? [
    { label: 'Total Queries', value: metrics.total_queries, color: 'var(--color-violet-light)' },
    { label: 'Avg Confidence', value: `${Math.round(metrics.average_confidence * 100)}%`, color: 'var(--color-emerald)' },
    { label: 'Retry Rate', value: `${Math.round(metrics.retry_rate * 100)}%`, color: 'var(--color-amber)' },
    { label: 'Hallucination Rate', value: `${Math.round(metrics.hallucination_rate * 100)}%`, color: 'var(--color-rose)' },
    { label: 'Docs Indexed', value: metrics.total_uploads, color: 'var(--color-violet-light)' },
    { label: 'Chunks Indexed', value: metrics.total_chunks_indexed, color: 'var(--color-emerald)' },
    { label: 'Avg Response', value: `${metrics.average_response_time_ms?.toFixed(0)}ms`, color: 'var(--color-amber)' },
    { label: 'Healings', value: metrics.healing_triggered_count, color: 'var(--color-rose)' },
  ] : [];

  const histogramData = metrics?.confidence_histogram
    ? Object.entries(metrics.confidence_histogram).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, var(--color-violet-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Analytics
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            Real-time RAG pipeline performance metrics
          </p>
        </div>
        <button onClick={loadMetrics} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <RefreshCw size={13} style={{ animation: metricsLoading ? 'spin-slow 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {metricsLoading && !metrics
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 28, width: 60 }} />
              </div>
            ))
          : statCards.map(({ label, value, color }) => (
              <div key={label} className="stat-card animate-fade-in">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              </div>
            ))
        }
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Confidence trend */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            <BarChart3 size={14} style={{ display: 'inline', marginRight: 6 }} />
            Confidence Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="confidence" stroke="#7c3aed" fill="url(#confGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Retry & Hallucination */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 6 }} />
            Healing & Hallucination Rates
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="retry_rate" stroke="#f59e0b" strokeWidth={2} dot={false} name="Retry" />
              <Line type="monotone" dataKey="hallucination_rate" stroke="#f43f5e" strokeWidth={2} dot={false} name="Hallucination" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confidence histogram */}
      {histogramData.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            Confidence Distribution
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="var(--color-violet)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
