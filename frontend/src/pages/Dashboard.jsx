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
    <div className="page-container" style={{ padding: '32px' }}>
      
      {/* 1. Header description */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-light)', marginBottom: 6 }}>
          Knowledge Base
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage and index your documentation for RAG-powered intelligence.
        </p>
      </div>

      {/* 2. Three Metric Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        {/* Total Chunks */}
        <div className="telemetry-card" style={{ padding: '20px' }}>
          <div className="stat-ticker-label">TOTAL CHUNKS</div>
          <div className="serif-display stat-ticker-number">
            {metrics ? metrics.total_chunks_indexed.toLocaleString() : '0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Aggregated tokens index parsed
          </div>
        </div>

        {/* Vector Count */}
        <div className="telemetry-card" style={{ padding: '20px' }}>
          <div className="stat-ticker-label">VECTOR COUNT</div>
          <div className="serif-display stat-ticker-number">
            {metrics ? metrics.total_chunks_indexed.toLocaleString() : '0'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Active Pinecone vector coordinates
          </div>
        </div>

        {/* Last Sync */}
        <div className="telemetry-card" style={{ padding: '20px', flexDirection: 'column', justifyContent: 'space-between' }}>
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
      <div style={{ marginBottom: 32 }}>
        <DropZone />
      </div>

      {/* 4. Indexed Documents Progress List */}
      <section className="telemetry-card" style={{ padding: '24px', marginBottom: 16 }}>
        <h2 className="eyebrow" style={{ color: 'var(--text-light)', marginBottom: 16 }}>
          Indexed Documents
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {uploadedDocs.length > 0 ? (
            uploadedDocs.map((doc) => (
              <div key={doc.document_id} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-light)' }}>{doc.document_name}</span>
                  </div>
                  <span className="badge badge-emerald">Indexed</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
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
