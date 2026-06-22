import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
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
    { label: 'Total Queries', value: metrics.total_queries, color: '#ffffff' },
    { label: 'Avg Confidence', value: `${Math.round(metrics.average_confidence * 100)}%`, color: 'var(--color-emerald)' },
    { label: 'Retry Rate', value: `${Math.round(metrics.retry_rate * 100)}%`, color: 'var(--color-amber)' },
    { label: 'Hallucination Rate', value: `${Math.round(metrics.hallucination_rate * 100)}%`, color: 'var(--color-rose)' },
    { label: 'Documents', value: metrics.total_uploads, color: '#ffffff' },
    { label: 'Chunks Indexed', value: metrics.total_chunks_indexed, color: 'var(--color-emerald)' },
    { label: 'Avg Latency', value: `${metrics.average_response_time_ms?.toFixed(0)}ms`, color: 'var(--color-amber)' },
    { label: 'Healing Loops', value: metrics.healing_triggered_count, color: 'var(--color-rose)' },
  ] : [];

  const histogramData = metrics?.confidence_histogram
    ? Object.entries(metrics.confidence_histogram).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <div style={{ padding: '48px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="step-num">.03 / METRICS</div>
          <h1 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 36, 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.03em',
            color: '#ffffff' 
          }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Real-time pipeline performance analytics and reliability rates.
          </p>
        </div>
        <button onClick={loadMetrics} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '8px 16px' }}>
          <RefreshCw size={11} style={{ animation: metricsLoading ? 'spin-slow 2s linear infinite' : 'none' }} />
          sync_metrics
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {metricsLoading && !metrics
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 24, width: 50 }} />
              </div>
            ))
          : statCards.map(({ label, value, color }) => (
              <div key={label} className="stat-card animate-fade-in">
                <div style={{ 
                  fontSize: 10, 
                  color: 'var(--color-text-muted)', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em', 
                  marginBottom: 12 
                }}>
                  {label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color }}>{value}</div>
              </div>
            ))
        }
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Confidence trend */}
        <div className="glass-card">
          <h3 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: 24, 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <BarChart3 size={13} style={{ color: 'var(--color-text-muted)' }} />
            confidence_history
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} unit="%" stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: '#09090a', border: '1px solid var(--color-border)', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'var(--color-text-muted)' }}
              />
              <Area type="monotone" dataKey="confidence" stroke="#ffffff" fill="url(#confGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Retry & Hallucination */}
        <div className="glass-card">
          <h3 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: 24, 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <TrendingUp size={13} style={{ color: 'var(--color-text-muted)' }} />
            healing_vs_hallucination
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} unit="%" stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: '#09090a', border: '1px solid var(--color-border)', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'var(--color-text-muted)' }}
              />
              <Line type="monotone" dataKey="retry_rate" stroke="var(--color-amber)" strokeWidth={1.5} dot={false} name="Retry" />
              <Line type="monotone" dataKey="hallucination_rate" stroke="var(--color-rose)" strokeWidth={1.5} dot={false} name="Hallucination" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confidence distribution */}
      {histogramData.length > 0 && (
        <div className="glass-card">
          <h3 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: 24, 
            color: '#ffffff'
          }}>
            confidence_distribution_intervals
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="range" tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: '#09090a', border: '1px solid var(--color-border)', borderRadius: 2, fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Bar dataKey="count" fill="rgba(255,255,255,0.8)" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
