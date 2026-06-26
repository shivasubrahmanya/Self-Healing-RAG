import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Database, BarChart3, Sliders, ArrowRight, Activity, Cpu } from 'lucide-react';
import { getHealth, getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';

export default function Hub() {
  const { health, metrics, setHealth, setMetrics, queryHistory } = useAppStore();

  useEffect(() => {
    const load = async () => {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch (e) { /* silent */ }
      try {
        const m = await getMetrics();
        setMetrics(m);
      } catch (e) { /* silent */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [setHealth, setMetrics]);

  const pineconeHealthy = health?.services?.find(s => s.name === 'pinecone')?.healthy;
  const ollamaHealthy = health?.services?.find(s => s.name === 'ollama')?.healthy;

  // Filter actual query list to extract dynamic healing logs
  const recentEvents = queryHistory
    .filter(q => q.healing?.attempted || (q.healing?.rewritten_queries && q.healing.rewritten_queries.length > 0))
    .slice(0, 5)
    .map(q => ({
      time: q.time,
      agent: q.healing?.rewritten_queries?.length > 1 ? 'Healing Agent' : 'Query Analyzer',
      detail: q.healing?.rewritten_queries?.length > 0
        ? `Context score below threshold. Rewrote query to: "${q.healing.rewritten_queries[0]}"`
        : `Healing loop recovered search criteria for query: "${q.summary}"`,
      status: q.status === 'self-healed' || q.status === 'grounded' ? 'resolved' : 'processing'
    }));

  return (
    <div className="page-container p-6 md:p-8 lg:p-12">

      {/* 1. Split Hero Banner */}
      <div className="aether-hero-container flex flex-col lg:flex-row justify-between items-center p-6 md:p-11 text-center lg:text-left">
        <div className="flex-1 max-w-xl mb-8 lg:mb-0 flex flex-col items-center lg:items-start">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-light)', padding: '4px 10px', borderRadius: 20, color: 'var(--accent)', fontSize: '11px', fontWeight: 600, marginBottom: 16 }}>
            <Activity size={10} className="healing-pulse" />
            <span>ÆSCULAPIUS OPERATIONS CORE</span>
          </div>
          <h1 className="aether-hero-title">
            Self-Healing RAG Operations
          </h1>
          <p className="aether-hero-subtitle">
            Autonomous document intelligence with real-time error recovery and vector optimization for high-precision knowledge retrieval.
          </p>
          <div className="flex gap-3 justify-center lg:justify-start">
            <Link to="/chat" className="btn-primary" style={{ textDecoration: 'none' }}>Launch Hub</Link>
            <Link to="/dashboard" className="btn-ghost" style={{ textDecoration: 'none' }}>View Docs</Link>
          </div>
        </div>

        <div className="w-full max-w-[280px] lg:max-w-[320px] flex justify-center items-center">
          <svg viewBox="0 0 320 220" className="mesh-container" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            {/* SVG Network Lines */}
            <line x1="50" y1="60" x2="160" y2="40" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3" />
            <line x1="160" y1="40" x2="270" y2="80" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3" />
            <line x1="50" y1="60" x2="110" y2="150" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3" />
            <line x1="110" y1="150" x2="220" y2="170" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" />
            <line x1="220" y1="170" x2="270" y2="80" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3" />
            <line x1="160" y1="40" x2="220" y2="170" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="2" />
            <line x1="160" y1="40" x2="110" y2="150" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" />

            {/* Animated Nodes */}
            <circle cx="50" cy="60" r="5" fill="#38bdf8" />
            <circle cx="160" cy="40" r="7" fill="url(#glowGrad)" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
            <circle cx="270" cy="80" r="5" fill="#38bdf8" />
            <circle cx="110" cy="150" r="6" fill="#6366f1" />
            <circle cx="220" cy="170" r="8" fill="url(#glowGrad)" style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
          </svg>
        </div>
      </div>

      {/* 2. Column Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Query Engine */}
        <div className="telemetry-card p-5">
          <div className="hub-icon-wrapper" style={{ width: 36, height: 36, marginBottom: 12 }}>
            <MessageSquare size={16} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Query Engine</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            Query your knowledge assets with dynamic context healing logs and grounding verification audit.
          </p>
          <Link to="/chat" className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', width: 'fit-content' }}>
            <span>Launch Chat</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        {/* Card 2: Knowledge Base */}
        <div className="telemetry-card p-5">
          <div className="hub-icon-wrapper" style={{ width: 36, height: 36, marginBottom: 12 }}>
            <Database size={16} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Knowledge Base</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            Ingest and index source materials (PDF, DOCX, TXT, MD) into Pinecone semantic index spaces.
          </p>
          <Link to="/dashboard" className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', width: 'fit-content' }}>
            <span>Upload Docs</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        {/* Card 3: System Metrics */}
        <div className="telemetry-card p-5">
          <div className="hub-icon-wrapper" style={{ width: 36, height: 36, marginBottom: 12 }}>
            <BarChart3 size={16} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>System Metrics</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            Analyze accuracy latency, hallucination triggers, and healing loop retry distributions.
          </p>
          <Link to="/analytics" className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', width: 'fit-content' }}>
            <span>View Analytics</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        {/* Card 4: Agent Config */}
        <div className="telemetry-card p-5">
          <div className="hub-icon-wrapper" style={{ width: 36, height: 36, marginBottom: 12 }}>
            <Sliders size={16} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Agent Config</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            Configure model parameters, context scores, routing edges, and audit container properties.
          </p>
          <Link to="/admin" className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', width: 'fit-content' }}>
            <span>Settings</span>
            <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* 3. Recent Healing Events Section */}
      <section className="telemetry-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="eyebrow" style={{ color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} />
            Recent Healing Events
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-updating</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {recentEvents.length > 0 ? (
            recentEvents.map((evt, i) => (
              <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 gap-3 w-full">
                <div className="flex items-center gap-3 overflow-hidden min-w-0 w-full sm:w-auto">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{evt.time}</span>
                  <span className="badge badge-violet" style={{ fontSize: '10px', padding: '2px 8px', flexShrink: 0 }}>{evt.agent}</span>
                  <span className="truncate text-xs text-zinc-300 font-medium flex-1" title={evt.detail}>{evt.detail}</span>
                </div>
                <span className={`badge ${evt.status === 'resolved' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px', flexShrink: 0 }}>
                  {evt.status}
                </span>
              </div>
            ))
          ) : (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontStyle: 'italic',
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px'
            }}>
              No healing events registered in this session. Submit queries in the Query Engine to audit recovery states.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
