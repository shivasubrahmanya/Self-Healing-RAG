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
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #f1f5f9, var(--color-violet-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Knowledge Base
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Upload documents, monitor indexing, and check system status
        </p>
      </div>

      {/* System Status */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle icon={<Server size={14} />} title="System Status" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
          <ServiceCard
            name="Pinecone"
            icon={<Database size={16} />}
            service={health?.services?.find(s => s.name === 'pinecone')}
          />
          <ServiceCard
            name="Ollama LLM"
            icon={<Cpu size={16} />}
            service={health?.services?.find(s => s.name === 'ollama')}
          />
          <div className="stat-card">
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Documents</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-violet-light)' }}>
              {uploadedDocs.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>indexed</div>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle icon={<FileText size={14} />} title="Upload Document" />
        <div style={{ marginTop: 12 }}>
          <DropZone />
        </div>
      </div>

      {/* Recent Documents */}
      {uploadedDocs.length > 0 && (
        <div>
          <SectionTitle icon={<RefreshCw size={14} />} title="Indexed Documents" />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploadedDocs.map((doc) => (
              <div key={doc.document_id} className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(124,58,237,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={16} color="var(--color-violet-light)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{doc.document_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {doc.chunks_indexed} chunks indexed
                    </p>
                  </div>
                </div>
                <span className="badge badge-emerald">✓ Indexed</span>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--color-violet-light)' }}>{icon}</span>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ color: 'var(--color-text-muted)' }}>{icon}</div>
        {loading ? (
          <div className="skeleton" style={{ width: 40, height: 16 }} />
        ) : (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: healthy ? 'var(--color-emerald)' : 'var(--color-rose)',
            boxShadow: healthy ? '0 0 8px var(--color-emerald-glow)' : '0 0 8px var(--color-rose-glow)',
          }} />
        )}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: 11, color: loading ? 'var(--color-text-muted)' : healthy ? 'var(--color-emerald)' : 'var(--color-rose)', marginTop: 2 }}>
        {loading ? 'Checking...' : healthy ? `Online · ${service.latency_ms?.toFixed(0)}ms` : 'Offline'}
      </div>
    </div>
  );
}
