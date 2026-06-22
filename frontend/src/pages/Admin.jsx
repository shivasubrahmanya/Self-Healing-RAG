import { useAppStore } from '../store/appStore';
import { FileText, Trash2, Settings, ScrollText } from 'lucide-react';

export default function Admin() {
  const { uploadedDocs } = useAppStore();

  return (
    <div style={{ padding: '48px 32px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div className="step-num">.04 / SYSTEM ADMIN</div>
        <h1 style={{ 
          fontFamily: 'Space Grotesk, sans-serif', 
          fontSize: 36, 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: '0.03em', 
          color: '#ffffff'
        }}>
          Control Panel
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Index database configuration, telemetry logs, and library management.
        </p>
      </div>

      {/* Documents table */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, marginBottom: 20 }}>
          <FileText size={13} color="var(--color-text-secondary)" />
          <h2 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            color: 'var(--color-text-primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em' 
          }}>
            Ingested Library ({uploadedDocs.length})
          </h2>
        </div>

        {uploadedDocs.length === 0 ? (
          <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={24} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p style={{ fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Library is empty</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Upload documents on the main Dashboard to index content.</p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Document', 'ID / Hash', 'Chunks', 'Status', ''].map((h) => (
                    <th key={h} style={{
                      padding: '16px 20px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedDocs.map((doc, i) => (
                  <tr key={doc.document_id} style={{
                    borderBottom: i < uploadedDocs.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 2,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--color-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FileText size={12} color="var(--color-text-secondary)" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{doc.document_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {doc.document_id}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-secondary)' }}>
                      {doc.chunks_indexed}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-emerald">✓ Indexed</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 10, color: 'var(--color-rose)', border: '1px solid rgba(244,63,94,0.15)', background: 'rgba(244,63,94,0.02)' }}
                      >
                        <Trash2 size={10} style={{ display: 'inline', marginRight: 4, transform: 'translateY(-1px)' }} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Config panel */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, marginBottom: 20 }}>
          <Settings size={13} color="var(--color-text-secondary)" />
          <h2 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            color: 'var(--color-text-primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em' 
          }}>
            Parameters & Config
          </h2>
        </div>
        <div className="glass-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { label: 'Embedding Model', value: 'BAAI/bge-m3' },
              { label: 'Reranker System', value: 'BAAI/bge-reranker-large' },
              { label: 'Primary LLM', value: 'llama3.1:latest' },
              { label: 'Vector Database', value: 'Pinecone (Serverless)' },
              { label: 'Chunk Token Limit', value: '800 tokens' },
              { label: 'Chunk Overlap Offset', value: '150 tokens' },
              { label: 'Max Candidates (Top-K)', value: '20 units' },
              { label: 'Post-Rerank Window (Top-K)', value: '5 units' },
              { label: 'Context Sufficiency Threshold', value: '0.70' },
              { label: 'Maximum Self-Healing Retries', value: '3 attempts' },
            ].map(({ label, value }) => (
              <div key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: 10 }}>
                <div style={{ 
                  fontSize: 9, 
                  fontFamily: 'JetBrains Mono, monospace', 
                  color: 'var(--color-text-muted)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  marginBottom: 6 
                }}>
                  {label}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#ffffff', 
                  fontFamily: 'Space Grotesk, sans-serif'
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logs block */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 10, marginBottom: 20 }}>
          <ScrollText size={13} color="var(--color-text-secondary)" />
          <h2 style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: 12, 
            fontWeight: 700, 
            color: 'var(--color-text-primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em' 
          }}>
            System Logs
          </h2>
        </div>
        <div className="glass-card" style={{ 
          background: '#09090a', 
          fontFamily: 'JetBrains Mono, monospace', 
          fontSize: 11, 
          color: 'var(--color-text-secondary)', 
          lineHeight: 1.8,
          maxHeight: 250,
          overflowY: 'auto'
        }}>
          <p style={{ color: 'var(--color-emerald)' }}>[OKAY] system_startup: self_healing_rag ready on namespace "default"</p>
          <p>[INFO] service_initialization: connected to pinecone index "self-healing-rag"</p>
          <p>[INFO] service_initialization: loaded embedding model bge-m3 locally</p>
          <p>[INFO] service_initialization: loaded cross-encoder reranker bge-reranker-large</p>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>[INFO] state_graph_compile: loaded and verified all 8 pipeline nodes</p>
          <p>[INFO] server_handshake: listening on host 127.0.0.1:8000</p>
        </div>
      </section>
    </div>
  );
}
