import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';
import SubpageHeader from '../components/Layout/SubpageHeader';

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
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
    { label: 'Total Queries', value: metrics.total_queries, color: 'var(--text-light)' },
    { label: 'Avg Confidence', value: `${Math.round(metrics.average_confidence * 100)}%`, color: 'var(--accent)' },
    { label: 'Retry Rate', value: `${Math.round(metrics.retry_rate * 100)}%`, color: 'var(--color-amber)' },
    { label: 'Hallucination', value: `${Math.round(metrics.hallucination_rate * 100)}%`, color: 'var(--color-rose)' },
    { label: 'Documents Ingested', value: metrics.total_uploads, color: 'var(--text-light)' },
    { label: 'Chunks Indexed', value: metrics.total_chunks_indexed, color: 'var(--accent)' },
    { label: 'Avg Response Latency', value: `${metrics.average_response_time_ms?.toFixed(0)}ms`, color: 'var(--text-light)' },
    { label: 'Healing Loops Run', value: metrics.healing_triggered_count, color: 'var(--color-rose)' },
  ] : [];

  const histogramData = metrics?.confidence_histogram
    ? Object.entries(metrics.confidence_histogram).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <div className="page-container">
      <SubpageHeader title="Performance Metrics" />
      {/* Header */}
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Metrics</div>
          <h1 className="serif-display" style={{ 
            fontSize: '36px', 
            fontWeight: 700,
            color: 'var(--text-light)'
          }}>
            Analytics
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time performance analytics of self-healing RAG loop operations.
          </p>
        </div>
        <button onClick={loadMetrics} className="btn-ghost" style={{ padding: '10px 18px' }}>
          <RefreshCw size={13} style={{ animation: metricsLoading ? 'loading 1.5s infinite' : 'none' }} />
          Sync Metrics
        </button>
      </div>

      {/* Telemetry Stats Grid */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginTop: 16
        }}>
          {metricsLoading && !metrics
            ? Array(8).fill(0).map((_, i) => (
                <div key={i} className="telemetry-card">
                  <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 32, width: 60 }} />
                </div>
              ))
            : statCards.map(({ label, value, color }) => (
                <div key={label} className="telemetry-card animate-fade-in" style={{ padding: '20px 24px' }}>
                  <div className="stat-ticker-label" style={{ marginBottom: 4 }}>{label}</div>
                  <div className="serif-display stat-ticker-number" style={{ color, fontSize: '28px', fontWeight: 700 }}>{value}</div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Confidence trend */}
        <div className="telemetry-card" style={{ padding: 24 }}>
          <h3 className="eyebrow" style={{ 
            marginBottom: 20, 
            color: 'var(--text-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
            confidence history
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} unit="%" stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-light)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Area type="monotone" dataKey="confidence" stroke="var(--accent)" fill="url(#confGrad)" strokeWidth={2} dot={false} name="Confidence" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Retry & Hallucination */}
        <div className="telemetry-card" style={{ padding: 24 }}>
          <h3 className="eyebrow" style={{ 
            marginBottom: 20, 
            color: 'var(--text-light)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
            healing vs hallucination
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} unit="%" stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-light)' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line type="monotone" dataKey="retry_rate" stroke="var(--color-amber)" strokeWidth={2} dot={false} name="Retry" />
              <Line type="monotone" dataKey="hallucination_rate" stroke="var(--color-rose)" strokeWidth={2} dot={false} name="Hallucination" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confidence distribution */}
      {histogramData.length > 0 && (
        <div className="telemetry-card" style={{ padding: 24 }}>
          <h3 className="eyebrow" style={{ marginBottom: 20, color: 'var(--text-light)' }}>
            confidence distribution intervals
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={histogramData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} stroke="rgba(255,255,255,0.05)" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter' }} stroke="rgba(255,255,255,0.05)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-light)' }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Queries" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
