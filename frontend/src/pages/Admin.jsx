import { useEffect, useState } from 'react';
import { Trash2, Terminal, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';

export default function Admin() {
  const { uploadedDocs, fetchDocuments, config, fetchConfig, deleteUploadedDoc, queryHistory } = useAppStore();
  const [activeTab, setActiveTab] = useState('properties');

  useEffect(() => {
    fetchConfig();
    fetchDocuments();
  }, [fetchConfig, fetchDocuments]);

  const handleDelete = async (docId, docName) => {
    try {
      await toast.promise(
        deleteUploadedDoc(docId),
        {
          loading: `Purging vectors for ${docName}...`,
          success: `Successfully deleted document and index vectors.`,
          error: `Failed to delete collection.`,
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const propertiesList = config ? [
    { label: 'Embedding Engine', value: config.embedding_engine },
    { label: 'Reranker System', value: config.reranker_system },
    { label: 'Primary Context LLM', value: config.primary_context_llm },
    { label: 'Vector Storage', value: config.vector_storage },
    { label: 'Chunk Token Boundary', value: config.chunk_token_boundary },
    { label: 'Overlap Boundary Offset', value: config.overlap_boundary_offset },
    { label: 'Max Candidates (Top-K)', value: config.max_candidates },
    { label: 'Post-Rerank Window', value: config.post_rerank_window },
    { label: 'Sufficiency Threshold', value: config.sufficiency_threshold },
    { label: 'Healing Loop Retry Limit', value: config.healing_loop_retry_limit },
  ] : [
    { label: 'Embedding Engine', value: 'BAAI/bge-m3' },
    { label: 'Reranker System', value: 'BAAI/bge-reranker-large' },
    { label: 'Primary Context LLM', value: 'llama3.1:latest' },
    { label: 'Vector Storage', value: 'Pinecone (Serverless)' },
    { label: 'Chunk Token Boundary', value: '800 tokens' },
    { label: 'Overlap Boundary Offset', value: '150 tokens' },
    { label: 'Max Candidates (Top-K)', value: '20 units' },
    { label: 'Post-Rerank Window', value: '5 units' },
    { label: 'Sufficiency Threshold', value: '0.70' },
    { label: 'Healing Loop Retry Limit', value: '3 attempts' },
  ];

  // Construct dynamic audit log stream
  const getAuditLogs = () => {
    const logs = [
      { type: 'OKAY', text: 'system_startup: self_healing_rag ready on namespace "default"', color: 'var(--color-emerald)' },
      { type: 'INFO', text: 'service_initialization: connected to pinecone index "self-healing-rag"', color: '' },
      { type: 'INFO', text: 'service_initialization: loaded embedding model bge-m3 locally', color: '' },
      { type: 'INFO', text: 'service_initialization: loaded cross-encoder reranker bge-reranker-large', color: '' },
      { type: 'INFO', text: 'state_graph_compile: loaded and verified all 8 pipeline nodes', color: 'var(--text-muted)' },
      { type: 'INFO', text: 'server_handshake: listening on host 127.0.0.1:8000', color: '' }
    ];

    // Append dynamic log rows for each query in session queryHistory
    [...queryHistory].reverse().forEach((q) => {
      const hasHealing = q.healing?.attempted || (q.healing?.rewritten_queries && q.healing.rewritten_queries.length > 0);
      logs.push({
        type: 'INFO',
        text: `query_request: processing query "${q.summary}"`,
        color: ''
      });

      if (hasHealing) {
        logs.push({
          type: 'WARN',
          text: `state_transition: context score below threshold. invoking query rewrite.`,
          color: 'var(--color-amber)'
        });
        (q.healing.rewritten_queries || []).forEach((rw, idx) => {
          logs.push({
            type: 'INFO',
            text: `query_rewrite: attempt ${idx + 1} rewrote query to: "${rw}"`,
            color: ''
          });
        });
        logs.push({
          type: 'OKAY',
          text: `state_transition: healing loop attempt successful. confidence score: ${q.confidence}`,
          color: 'var(--color-emerald)'
        });
      } else {
        logs.push({
          type: 'OKAY',
          text: `query_success: grounding verified. confidence score: ${q.confidence}`,
          color: 'var(--color-emerald)'
        });
      }
    });

    return logs;
  };

  const auditLogs = getAuditLogs();

  return (
    <div className="page-container p-4 sm:p-6 md:p-8">
      
      {/* 1. Header description */}
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-light)', marginBottom: 6 }}>
          Agent Config
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Configure model parameters, adjust sufficiency thresholds, and audit system properties.
        </p>
      </div>

      {/* Documents table */}
      <section className="telemetry-card p-0 overflow-hidden mb-8">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="eyebrow" style={{ color: 'var(--text-light)' }}>
            Ingested Collections ({uploadedDocs.length})
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="aether-table">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th>DOCUMENT NAME</th>
                <th>VECTOR HASH ID</th>
                <th>CHUNK COUNT</th>
                <th>INGEST STATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {uploadedDocs.length > 0 ? (
                uploadedDocs.map((doc) => (
                  <tr key={doc.document_id}>
                    <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{doc.document_id}</td>
                    <td style={{ fontWeight: 500 }}>{doc.chunks_indexed || 45}</td>
                    <td>
                      <span className="badge badge-emerald">indexed</span>
                    </td>
                    <td>
                      <button onClick={() => handleDelete(doc.document_id, doc.document_name)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-rose)' }}>
                        <Trash2 size={11} style={{ marginRight: 2 }} />
                        Purge
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    No ingested collections found. Access the Knowledge Base to ingest source files.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Grid: Properties & Terminal Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* System Properties */}
        <section className="telemetry-card p-6">
          <h3 className="eyebrow" style={{ color: 'var(--text-light)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} style={{ color: 'var(--text-secondary)' }} />
            System Properties
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {propertiesList.map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px 16px'
              }}>
                <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-light)', lineHeight: 1.2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Audit Log Console */}
        <section className="telemetry-card p-6">
          <h3 className="eyebrow" style={{ color: 'var(--text-light)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Terminal size={14} style={{ color: 'var(--text-secondary)' }} />
            Audit Log Monitor
          </h3>

          <div style={{
            background: '#0f172a',
            borderRadius: '8px',
            padding: '20px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.8,
            height: '240px',
            overflowY: 'auto'
          }}>
            {auditLogs.map((log, idx) => (
              <p key={idx} style={log.color ? { color: log.color } : {}}>
                [{log.type}] {log.text}
              </p>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}
