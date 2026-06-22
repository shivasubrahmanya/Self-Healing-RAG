import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, MessageSquare, BarChart3, Sliders, ArrowRight, Activity } from 'lucide-react';
import { getHealth, getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';

export default function Hub() {
  const { health, uploadedDocs, metrics, setHealth, setMetrics } = useAppStore();

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
  }, []);

  const pineconeHealthy = health?.services?.find(s => s.name === 'pinecone')?.healthy;
  const ollamaHealthy = health?.services?.find(s => s.name === 'ollama')?.healthy;

  return (
    <div className="hub-container">
      {/* Immersive Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-light)', padding: '6px 14px', borderRadius: 20, color: 'var(--accent)', marginBottom: 24 }}>
          <Activity size={12} className="healing-pulse" />
          <span>Self-Healing RAG Operations Hub</span>
        </div>
        
        <h1 style={{ 
          fontSize: '44px', 
          fontWeight: 800, 
          color: 'var(--text-light)', 
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: 16
        }}>
          Control Center
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
          Monitor retrieval diagnostics, query index vector spaces, check pipeline telemetry, and configure autonomous search expansion rules.
        </p>
      </div>

      {/* Grid Portals */}
      <div className="hub-grid">
        
        {/* Portal 1: Data Ingestion & Health */}
        <Link to="/dashboard" className="hub-card">
          <div>
            <div className="hub-icon-wrapper">
              <Database size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8 }}>
              Knowledge Base
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Ingest PDF, DOCX, TXT, and Markdown files to seed the index. Check active vector database telemetry.
            </p>
          </div>
          
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Live indicators */}
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: pineconeHealthy ? 'var(--color-emerald)' : 'var(--text-muted)' }}>
                Pinecone: {pineconeHealthy ? 'Online' : 'Offline'}
              </span>
              <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: ollamaHealthy ? 'var(--color-emerald)' : 'var(--text-muted)' }}>
                LLM: {ollamaHealthy ? 'Online' : 'Offline'}
              </span>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
          </div>
        </Link>

        {/* Portal 2: Chat Engine */}
        <Link to="/chat" className="hub-card">
          <div>
            <div className="hub-icon-wrapper">
              <MessageSquare size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8 }}>
              Query Engine
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Query the vector index and inspect the self-healing search logs. Audit cited chunks and relevance scores.
            </p>
          </div>
          
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Library: {uploadedDocs.length} Document{uploadedDocs.length !== 1 ? 's' : ''}
            </span>
            <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
          </div>
        </Link>

        {/* Portal 3: Analytics Metrics */}
        <Link to="/analytics" className="hub-card">
          <div>
            <div className="hub-icon-wrapper">
              <BarChart3 size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8 }}>
              Performance Metrics
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Analyze RAG search accuracy, confidence history, and healing retry loop distributions.
            </p>
          </div>
          
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Queries: {metrics?.total_queries || 0} &middot; Avg Conf: {metrics?.average_confidence ? `${Math.round(metrics.average_confidence * 100)}%` : '0%'}
            </span>
            <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
          </div>
        </Link>

        {/* Portal 4: Control Panel Configuration */}
        <Link to="/admin" className="hub-card">
          <div>
            <div className="hub-icon-wrapper">
              <Sliders size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8 }}>
              Control Panel
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Review index model parameters, adjust reranker top-K sizes, and audit system log streams.
            </p>
          </div>
          
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Embedding: BGE-M3
            </span>
            <ArrowRight size={14} style={{ color: 'var(--accent)' }} />
          </div>
        </Link>

      </div>
    </div>
  );
}
