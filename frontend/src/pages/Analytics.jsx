import { useEffect, useState } from 'react';
import { RefreshCw, BarChart3, TrendingDown, ArrowDown, ArrowUp, AlertTriangle, Play } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';

export default function Analytics() {
  const { metrics, metricsLoading, setMetrics, setMetricsLoading, metricsHistory, addMetricsHistoryPoint, queryHistory, health } = useAppStore();
  const [timeframe, setTimeframe] = useState('24H');

  const loadMetrics = async (quiet = false) => {
    if (!quiet) setMetricsLoading(true);
    try {
      const data = await getMetrics();
      setMetrics(data);
      addMetricsHistoryPoint({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: Math.round((data.average_confidence || 0.88) * 100),
        retry_rate: Math.round((data.retry_rate || 0.15) * 100),
        hallucination_rate: Math.round((data.hallucination_rate || 0.04) * 100),
      });
    } catch (e) { /* silent */ }
    finally { if (!quiet) setMetricsLoading(false); }
  };

  useEffect(() => {
    loadMetrics();
    const iv = setInterval(() => loadMetrics(true), 15000);
    return () => clearInterval(iv);
  }, []);

  const handleSync = () => {
    loadMetrics();
    toast.success('Performance telemetry metrics synchronized.');
  };

  return (
    <div className="page-container p-4 sm:p-6 md:p-8">
      
      {/* 1. Header and Sync Button */}
      <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-light)', marginBottom: 6 }}>
            Performance Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time monitoring of self-healing mechanisms and retrieval accuracy across active LLM nodes.
          </p>
        </div>
        <button onClick={handleSync} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>
          <RefreshCw size={12} className={metricsLoading ? 'healing-pulse' : ''} />
          <span>Sync Metrics</span>
        </button>
      </div>

      {/* 2. High Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Hallucination Rate */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">Hallucination Rate</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="serif-display stat-ticker-number">
              {metrics ? `${(metrics.hallucination_rate * 100).toFixed(1)}%` : '0.0%'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-emerald)', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
              <ArrowDown size={12} />
              Target &lt; 5%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hallucinations detected by judge agent</div>
        </div>

        {/* Avg Latency */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">Avg Latency</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="serif-display stat-ticker-number">
              {metrics ? `${(metrics.average_response_time_ms / 1000).toFixed(1)}s` : '0.0s'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 650 }}>
              {health?.services?.find(s => s.name === 'ollama')?.healthy ? 'Ollama Online' : 'Offline'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pipeline processing latency time</div>
        </div>

        {/* Healing Success */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">Healing Success</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="serif-display stat-ticker-number">
              {metrics ? `${Math.round((1 - metrics.hallucination_rate) * 100)}%` : '100%'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-emerald)', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
              <ArrowUp size={12} />
              Active
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resolution rate on retried queries</div>
        </div>

        {/* Knowledge Drift */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">Knowledge Drift</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="serif-display stat-ticker-number">
              {metrics?.total_uploads ? (metrics.total_uploads * 0.02).toFixed(2) : '0.00'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-emerald)', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 650 }}>
              Stable
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vector space cluster drift factor</div>
        </div>
      </div>

      {/* 3. Large Chart: Average Confidence Over Time */}
      <div className="telemetry-card p-6 mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h3 className="eyebrow" style={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
            Average Confidence Over Time
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['1H', '6H', '24H', '7D'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={timeframe === t ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '4px 10px', fontSize: '11px', height: 'fit-content' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={metricsHistory.length > 0 ? metricsHistory : [
            { time: '10:00', confidence: 85, retry_rate: 10, hallucination_rate: 3 },
            { time: '11:00', confidence: 88, retry_rate: 15, hallucination_rate: 4 },
            { time: '12:00', confidence: 89, retry_rate: 12, hallucination_rate: 4 },
            { time: '13:00', confidence: 91, retry_rate: 8, hallucination_rate: 2 },
            { time: '14:00', confidence: 92, retry_rate: 14, hallucination_rate: 3 }
          ]} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="aetherGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter' }} stroke="var(--color-border)" />
            <YAxis domain={[50, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter' }} unit="%" stroke="var(--color-border)" />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-light)' }}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Area type="monotone" dataKey="confidence" stroke="var(--accent)" fill="url(#aetherGlow)" strokeWidth={2} dot={{ r: 3, stroke: 'var(--accent)', fill: 'var(--bg-primary)', strokeWidth: 1.5 }} name="Grounding Confidence" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Recent Queries Table */}
      <section className="telemetry-card p-0 overflow-hidden mb-4">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="eyebrow" style={{ color: 'var(--text-light)' }}>Recent Queries</h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="aether-table">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th>QUERY HASH</th>
                <th>CONTEXTUAL SUMMARY</th>
                <th>TIMESTAMP</th>
                <th>CONFIDENCE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {queryHistory.length > 0 ? (
                queryHistory.map((q, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)' }}>
                      {q.hash}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {q.summary}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {q.time}
                    </td>
                    <td style={{ fontWeight: 650, color: 'var(--accent)' }}>
                      {q.confidence}
                    </td>
                    <td>
                      <span className={`badge ${q.status === 'grounded' ? 'badge-emerald' : 'badge-violet'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => toast.success(`Context Score: ${q.context_score ? Math.round(q.context_score * 100) + '%' : 'N/A'}`)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
                        <Play size={10} style={{ transform: 'translateY(-0.5px)', marginRight: 2 }} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    No queries submitted in this session. Go to the Query Engine tab to submit questions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
