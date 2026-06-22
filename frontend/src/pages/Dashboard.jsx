import { useEffect } from 'react';
import DropZone from '../components/Upload/DropZone';
import { getHealth } from '../services/api';
import { useAppStore } from '../store/appStore';
import SubpageHeader from '../components/Layout/SubpageHeader';

export default function Dashboard() {
  const { health, uploadedDocs, setHealth } = useAppStore();

  useEffect(() => {
    const load = async () => {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch (e) { /* silent */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="page-container">
      <SubpageHeader title="Knowledge Base" />
      {/* Hero Section */}
      <div style={{ marginBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Overview</div>
        <h1 className="serif-display" style={{
          fontSize: '36px',
          fontWeight: 700,
          color: 'var(--text-light)',
          marginBottom: 12
        }}>
          Knowledge Base
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.6 }}>
          Upload source files to seed the Pinecone vector index. The system uses recursive semantic text parsing to chunk documents and evaluate retrieval quality dynamically.
        </p>
      </div>

      {/* System Status - Telemetry Cards Grid */}
      <div style={{ marginBottom: 40 }}>
        <div className="chapter-header">
          <h2 className="eyebrow">System Telemetry</h2>
          <div className="chapter-header-line"></div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginTop: 16
        }}>
          {/* Pinecone */}
          <div className="telemetry-card">
            <div className="stat-ticker-label">Pinecone Index</div>
            <div className="serif-display stat-ticker-number" style={{
              color: health?.services?.find(s => s.name === 'pinecone')?.healthy ? 'var(--color-emerald)' : 'var(--color-rose)',
              fontSize: '32px'
            }}>
              {health?.services?.find(s => s.name === 'pinecone') ? (health?.services?.find(s => s.name === 'pinecone')?.healthy ? 'Active' : 'Offline') : 'Pending'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {health?.services?.find(s => s.name === 'pinecone')?.latency_ms
                ? `Latency: ${health.services.find(s => s.name === 'pinecone').latency_ms.toFixed(0)}ms`
                : 'Awaiting index response'}
            </div>
          </div>

          {/* Ollama */}
          <div className="telemetry-card">
            <div className="stat-ticker-label">Ollama LLM</div>
            <div className="serif-display stat-ticker-number" style={{
              color: health?.services?.find(s => s.name === 'ollama')?.healthy ? 'var(--color-emerald)' : 'var(--color-rose)',
              fontSize: '32px'
            }}>
              {health?.services?.find(s => s.name === 'ollama') ? (health?.services?.find(s => s.name === 'ollama')?.healthy ? 'Ready' : 'Offline') : 'Pending'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {health?.services?.find(s => s.name === 'ollama')?.latency_ms
                ? `Latency: ${health.services.find(s => s.name === 'ollama').latency_ms.toFixed(0)}ms`
                : 'Awaiting LLM response'}
            </div>
          </div>

          {/* Assets count */}
          <div className="telemetry-card">
            <div className="stat-ticker-label">Indexed Library</div>
            <div className="serif-display stat-ticker-number" style={{ fontSize: '32px' }}>
              {uploadedDocs.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Verified documents online
            </div>
          </div>
        </div>
      </div>

      {/* Ingest Document Dropzone Panel */}
      <div style={{ marginBottom: 40 }}>
        <div className="chapter-header">
          <h2 className="eyebrow">Ingest Document</h2>
          <div className="chapter-header-line"></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <DropZone />
        </div>
      </div>

      {/* Indexed Library list */}
      {uploadedDocs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="chapter-header">
            <h2 className="eyebrow">Library Details</h2>
            <div className="chapter-header-line"></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {uploadedDocs.map((doc) => (
              <div key={doc.document_id} className="telemetry-card" style={{
                padding: '16px 20px',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-light)' }}>{doc.document_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    ID: <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4 }}>{doc.document_id}</code> &middot; {doc.chunks_indexed} semantic chunks parsed
                  </p>
                </div>
                <span className="badge badge-emerald">indexed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
