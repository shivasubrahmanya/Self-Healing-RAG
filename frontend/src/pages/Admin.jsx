import { useAppStore } from '../store/appStore';
import { FileText, Trash2, Settings, ScrollText } from 'lucide-react';

export default function Admin() {
  const { uploadedDocs } = useAppStore();

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #f1f5f9, var(--color-violet-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Manage documents, logs, and system configuration
        </p>
      </div>

      {/* Documents table */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FileText size={14} color="var(--color-violet-light)" />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Documents ({uploadedDocs.length})
          </h2>
        </div>

        {uploadedDocs.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No documents indexed yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Go to Dashboard to upload documents</p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {['Document', 'ID', 'Chunks', 'Status', ''].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedDocs.map((doc, i) => (
                  <tr key={doc.document_id} style={{
                    borderBottom: i < uploadedDocs.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(124,58,237,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FileText size={14} color="var(--color-violet-light)" />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{doc.document_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {doc.document_id}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14 }}>
                      {doc.chunks_indexed}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-emerald">Indexed</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-rose)', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Delete (UI only — implement API delete)"
                      >
                        <Trash2 size={12} /> Remove
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
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Settings size={14} color="var(--color-violet-light)" />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            System Configuration
          </h2>
        </div>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Embedding Model', value: 'BAAI/bge-m3' },
              { label: 'Reranker', value: 'BAAI/bge-reranker-large' },
              { label: 'LLM', value: 'llama3.1:latest' },
              { label: 'Vector DB', value: 'Pinecone (1024d)' },
              { label: 'Chunk Size', value: '800 tokens' },
              { label: 'Chunk Overlap', value: '150 tokens' },
              { label: 'Top-K Retrieval', value: '20 chunks' },
              { label: 'Top-K Rerank', value: '5 chunks' },
              { label: 'Context Threshold', value: '0.70' },
              { label: 'Max Retries', value: '3' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2, fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-violet-light)', fontFamily: 'monospace' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logs placeholder */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ScrollText size={14} color="var(--color-violet-light)" />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Logs
          </h2>
        </div>
        <div className="glass-card" style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          <p style={{ color: 'var(--color-emerald)' }}>[INFO] Self-Healing RAG platform started</p>
          <p style={{ color: 'var(--color-text-muted)' }}>[INFO] Pinecone index connected</p>
          <p style={{ color: 'var(--color-text-muted)' }}>[INFO] Embedding model BAAI/bge-m3 loaded</p>
          <p style={{ color: 'var(--color-text-muted)' }}>[INFO] Reranker BAAI/bge-reranker-large loaded</p>
          <p style={{ color: 'var(--color-violet-light)' }}>[INFO] LangGraph RAG pipeline compiled</p>
          <p style={{ color: 'var(--color-text-muted)' }}>[INFO] Server ready on 0.0.0.0:8000</p>
        </div>
      </section>
    </div>
  );
}
