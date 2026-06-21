import { FileText, ChevronRight } from 'lucide-react';

/**
 * SourcesPanel — displays cited document chunks on the right side of chat.
 */
export default function SourcesPanel({ sources = [], healing = null }) {
  if (!sources.length && !healing?.attempted) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--color-text-muted)',
        padding: 24,
      }}>
        <FileText size={32} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: 13, textAlign: 'center' }}>
          Sources will appear here after your first query
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Healing info */}
      {healing?.attempted && (
        <div style={{
          marginBottom: 16,
          padding: '10px 12px',
          background: 'var(--color-amber-glow)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="healing-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-amber)' }}>
              Self-Healing Triggered
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {healing.retries} retry attempt{healing.retries !== 1 ? 's' : ''} made to improve context quality
          </p>
          {healing.rewritten_queries?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Queries tried:
              </p>
              {healing.rewritten_queries.map((q, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  padding: '2px 0',
                  paddingLeft: 8,
                  borderLeft: '2px solid var(--color-amber)',
                  marginBottom: 2,
                }}>
                  {q}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources header */}
      {sources.length > 0 && (
        <>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 10,
          }}>
            {sources.length} Source{sources.length !== 1 ? 's' : ''} Retrieved
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sources.map((source, i) => (
              <SourceCard key={source.chunk_id} source={source} index={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SourceCard({ source, index }) {
  const score = Math.round(source.relevance_score * 100);
  const scoreColor =
    score >= 85 ? 'var(--color-emerald)' :
    score >= 70 ? 'var(--color-amber)' :
    'var(--color-rose)';

  return (
    <div className="source-card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: 'rgba(124,58,237,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--color-violet-light)',
          }}>
            {index}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {source.document_name}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: scoreColor,
          background: `${scoreColor}15`,
          padding: '2px 6px', borderRadius: 4,
        }}>
          {score}%
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Page {source.page}
      </div>

      <p style={{
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {source.text_snippet}
      </p>

      {/* Relevance bar */}
      <div style={{ marginTop: 8 }}>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}aa)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
