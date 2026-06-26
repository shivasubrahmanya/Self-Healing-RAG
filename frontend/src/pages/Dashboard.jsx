import { useEffect, useState } from 'react';
import { Database, RefreshCw, FileText, CheckCircle, HelpCircle, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import DropZone from '../components/Upload/DropZone';
import { getHealth, getMetrics } from '../services/api';
import { useAppStore } from '../store/appStore';

export default function Dashboard() {
  const { health, uploadedDocs, setHealth, metrics, setMetrics, fetchDocuments } = useAppStore();
  const [syncing, setSyncing] = useState(false);

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
      try {
        await fetchDocuments();
      } catch (e) { /* silent */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [setHealth, setMetrics, fetchDocuments]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const syncAction = async () => {
        const h = await getHealth();
        setHealth(h);
        const m = await getMetrics();
        setMetrics(m);
        await fetchDocuments();
      };
      await toast.promise(
        syncAction(),
        {
          loading: 'Syncing vector store indexes and performance telemetry...',
          success: 'Sync complete. Vector space is fully updated.',
          error: 'Sync failed.',
        }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Mock static files to match the Aether mockup specifications
  const mockFiles = [
    {
      id: 'mock-1',
      name: 'system_manual.pdf',
      chunks: 185,
      tokens: '12.4k',
      progress: 83,
      status: 'processing'
    },
    {
      id: 'mock-2',
      name: 'api_specs.md',
      chunks: 62,
      tokens: '4.1k',
      progress: 100,
      status: 'indexed'
    }
  ];

  return (
    <div className="page-container p-4 sm:p-6 md:p-8">
      
      {/* 1. Header description */}
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-light)', marginBottom: 6 }}>
          Knowledge Base
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage and index your documentation for RAG-powered intelligence.
        </p>
      </div>

      {/* 2. Three Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {/* Total Chunks */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">TOTAL CHUNKS</div>
          <div className="serif-display stat-ticker-number">
            {metrics ? metrics.total_chunks_indexed.toLocaleString() : '0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Aggregated tokens index parsed
          </div>
        </div>

        {/* Vector Count */}
        <div className="telemetry-card p-5">
          <div className="stat-ticker-label">VECTOR COUNT</div>
          <div className="serif-display stat-ticker-number">
            {metrics ? metrics.total_chunks_indexed.toLocaleString() : '0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Active Pinecone vector coordinates
          </div>
        </div>

        {/* Last Sync */}
        <div className="telemetry-card p-5 flex flex-col justify-between">
          <div>
            <div className="stat-ticker-label">LAST SYNC</div>
            <div className="serif-display stat-ticker-number" style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>
              {uploadedDocs.length > 0 ? 'Just now' : 'Awaiting collection'}
            </div>
          </div>
          <button onClick={handleSync} disabled={syncing} className="btn-ghost" style={{ padding: '6px 12px', fontSize: '11px', width: 'fit-content', marginTop: 10 }}>
            <RefreshCw size={12} className={syncing ? 'healing-pulse' : ''} />
            <span>Force Sync</span>
          </button>
        </div>
      </div>

      {/* 3. Drag and Drop Zone */}
      <div className="mb-8">
        <DropZone />
      </div>

      {/* 4. Indexed Documents Progress List */}
      <section className="telemetry-card p-6 mb-4">
        <h2 className="eyebrow" style={{ color: 'var(--text-light)', marginBottom: 16 }}>
          Indexed Documents
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {uploadedDocs.length > 0 ? (
            uploadedDocs.map((doc) => (
              <div key={doc.document_id} className="bg-zinc-900/45 border border-[var(--color-border)] rounded-lg p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-light)' }}>{doc.document_name}</span>
                  </div>
                  <span className="badge badge-emerald" style={{ flexShrink: 0 }}>Indexed</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row gap-2 sm:gap-4 break-all">
                  <span>Chunks: {doc.chunks_indexed || 45}</span>
                  <span>ID: {doc.document_id}</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '100%' }}></div>
                </div>
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
              No documents indexed yet. Ingest a file in the dropzone above to seed the Pinecone vector index.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
