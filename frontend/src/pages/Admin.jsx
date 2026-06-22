import { useAppStore } from '../store/appStore';
import { Trash2, Terminal, Cpu } from 'lucide-react';
import SubpageHeader from '../components/Layout/SubpageHeader';

export default function Admin() {
  const { uploadedDocs } = useAppStore();

  return (
    <div className="page-container">
      <SubpageHeader title="Control Panel" />
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>System Admin</div>
        <h1 className="serif-display" style={{ 
          fontSize: '36px', 
          fontWeight: 700,
          color: 'var(--text-light)'
        }}>
          Control Panel
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Manage vector database indexes, inspect engine configuration properties, and audit diagnostics activity.
        </p>
      </div>

      {/* Documents table */}
      <section style={{ marginBottom: 40 }}>
        <div className="chapter-header">
          <h2 className="eyebrow">Ingested Assets ({uploadedDocs.length})</h2>
          <div className="chapter-header-line"></div>
        </div>

        {uploadedDocs.length === 0 ? (
          <div className="telemetry-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p className="serif-display" style={{ fontSize: 16, color: 'var(--text-light)', fontWeight: 600 }}>Library is empty</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Go to the Dashboard page to ingest source materials.</p>
          </div>
        ) : (
          <div className="telemetry-card" style={{ overflow: 'hidden', padding: 0, borderRadius: '12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                    {['Document', 'ID / Hash', 'Chunks', 'Status', ''].map((h) => (
                      <th key={h} style={{
                        padding: '16px 20px',
                        fontSize: 11, fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadedDocs.map((doc, i) => (
                    <tr key={doc.document_id} style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-light)' }}>{doc.document_name}</span>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {doc.document_id}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-light)' }}>
                        {doc.chunks_indexed}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="badge badge-emerald">indexed</span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => {}}
                          className="btn-ghost"
                          style={{ padding: '6px 12px', fontSize: 11, color: 'var(--color-rose)', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', borderRadius: '6px' }}
                        >
                          <Trash2 size={11} style={{ display: 'inline', marginRight: 4, transform: 'translateY(-1px)' }} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Grid wrapper for configs and logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32, alignItems: 'start' }}>
        {/* Logs Console */}
        <section>
          <div className="chapter-header">
            <h2 className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={14} /> Audit Log Monitor
            </h2>
            <div className="chapter-header-line"></div>
          </div>
          <div className="telemetry-card" style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--color-border)',
            fontFamily: 'monospace', 
            fontSize: 12, 
            color: 'var(--text-secondary)', 
            lineHeight: 1.8,
            height: 380,
            overflowY: 'auto',
            padding: '24px',
            borderRadius: '12px'
          }}>
            <p style={{ color: 'var(--color-emerald)' }}>[OKAY] system_startup: self_healing_rag ready on namespace "default"</p>
            <p>[INFO] service_initialization: connected to pinecone index "self-healing-rag"</p>
            <p>[INFO] service_initialization: loaded embedding model bge-m3 locally</p>
            <p>[INFO] service_initialization: loaded cross-encoder reranker bge-reranker-large</p>
            <p style={{ color: 'rgba(255,255,255,0.3)' }}>[INFO] state_graph_compile: loaded and verified all 8 pipeline nodes</p>
            <p>[INFO] server_handshake: listening on host 127.0.0.1:8000</p>
          </div>
        </section>

        {/* Config panel */}
        <section>
          <div className="chapter-header">
            <h2 className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={14} /> System Properties
            </h2>
            <div className="chapter-header-line"></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {[
              { label: 'Embedding Model', value: 'BAAI/bge-m3' },
              { label: 'Reranker System', value: 'BAAI/bge-reranker-large' },
              { label: 'Primary LLM', value: 'llama3.1:latest' },
              { label: 'Vector Database', value: 'Pinecone (Serverless)' },
              { label: 'Chunk Token Limit', value: '800 tokens' },
              { label: 'Chunk Overlap Offset', value: '150 tokens' },
              { label: 'Max Candidates (Top-K)', value: '20 units' },
              { label: 'Post-Rerank Window (Top-K)', value: '5 units' },
              { label: 'Sufficiency Threshold', value: '0.70' },
              { label: 'Healing Retries Limit', value: '3 attempts' },
            ].map(({ label, value }) => (
              <div key={label} className="telemetry-card" style={{ padding: '16px 20px', borderRadius: '10px' }}>
                <div className="eyebrow" style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 650, 
                  color: 'var(--text-light)',
                  lineHeight: 1.2
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
