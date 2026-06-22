import { useEffect } from 'react';
import { Database, Server, Cpu, FileText, RefreshCw } from 'lucide-react';
import DropZone from '../components/Upload/DropZone';
import { getHealth } from '../services/api';
import { useAppStore } from '../store/appStore';

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
    <div style={{ padding: '48px 32px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div className="step-num">.01 / OVERVIEW</div>
        <h1 style={{ 
          fontFamily: 'Space Grotesk, sans-serif', 
          fontSize: 36, 
          fontWeight: 700, 
          letterSpacing: '0.03em', 
          color: '#ffffff', 
          textTransform: 'uppercase', 
          marginBottom: 12 
        }}>
          Knowledge Base
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', letterSpacing: '0.01em' }}>
          Upload source documents, monitor Pinecone indexing, and inspect system latency.
        </p>
      </div>

      {/* Grid Layout for Status and Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, marginBottom: 32 }}>
        
        {/* System Status Section */}
        <div>
          <SectionTitle icon={<Server size={14} />} title="System Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
            <ServiceCard
              name="Pinecone Index"
              icon={<Database size={16} />}
              service={health?.services?.find(s => s.name === 'pinecone')}
            />
            <ServiceCard
              name="Ollama LLM"
              icon={<Cpu size={16} />}
              service={health?.services?.find(s => s.name === 'ollama')}
            />
            <div className="stat-card">
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Indexed Assets</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: '#ffffff', lineHeight: 1 }}>
                {uploadedDocs.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>
                documents online
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div>
          <SectionTitle icon={<FileText size={14} />} title="Document Ingestion" />
          <div style={{ marginTop: 16 }}>
            <DropZone />
          </div>
        </div>

      </div>

      {/* Recent Documents */}
      {uploadedDocs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionTitle icon={<RefreshCw size={14} />} title="Ingested Library" />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {uploadedDocs.map((doc) => (
              <div key={doc.document_id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 2,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={16} color="var(--color-text-secondary)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{doc.document_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      {doc.chunks_indexed} units indexed
                    </p>
                  </div>
                </div>
                <span className="badge badge-emerald">✓ Ready</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{icon}</span>
      <h2 style={{ 
        fontFamily: 'Space Grotesk, sans-serif', 
        fontSize: 12, 
        fontWeight: 600, 
        color: 'var(--color-text-primary)', 
        textTransform: 'uppercase', 
        letterSpacing: '0.15em' 
      }}>
        {title}
      </h2>
    </div>
  );
}

function ServiceCard({ name, icon, service }) {
  const healthy = service?.healthy;
  const loading = !service;

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
        {loading ? (
          <div className="skeleton" style={{ width: 32, height: 8 }} />
        ) : (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: healthy ? 'var(--color-emerald)' : 'var(--color-rose)',
          }} />
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{name}</div>
      <div style={{ 
        fontSize: 11, 
        fontFamily: 'JetBrains Mono, monospace',
        color: loading ? 'var(--color-text-muted)' : healthy ? 'var(--color-emerald)' : 'var(--color-rose)', 
        marginTop: 6 
      }}>
        {loading ? 'indexing...' : healthy ? `online · ${service.latency_ms?.toFixed(0)}ms` : 'offline'}
      </div>
    </div>
  );
}
