import { FileText } from 'lucide-react';

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
        gap: 16,
        color: 'var(--color-text-muted)',
        padding: 24,
      }}>
        <FileText size={24} style={{ opacity: 0.2 }} />
        <p style={{ 
          fontSize: 12, 
          textAlign: 'center', 
          fontFamily: 'Space Grotesk, sans-serif',
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          telemetry data offline
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      {/* Healing info */}
      {healing?.attempted && (
        <div style={{
          marginBottom: 24,
          padding: '16px',
          background: 'rgba(245, 158, 11, 0.02)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="healing-dot" />
            <span style={{ 
              fontSize: 11, 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 700, 
              color: 'var(--color-amber)', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              self_healing_active
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Triggered {healing.retries} search expansion retry iteration{healing.retries !== 1 ? 's' : ''} to reach sufficiency threshold.
          </p>
          {healing.rewritten_queries?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ 
                fontSize: 10, 
                fontFamily: 'JetBrains Mono, monospace', 
                color: 'var(--color-text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: 6 
              }}>
                Query rewrites executed:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {healing.rewritten_queries.map((q, i) => (
                  <div key={i} style={{
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    paddingLeft: 10,
                    borderLeft: '1px solid var(--color-amber)',
                    fontStyle: 'italic',
                  }}>
                    "{q}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sources header */}
      {sources.length > 0 && (
        <>
          <div style={{
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 14,
          }}>
            {sources.length} document chunk{sources.length !== 1 ? 's' : ''} mapped
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

  const stepStr = index < 10 ? `0${index}` : `${index}`;

  return (
    <div className="source-card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: 'var(--color-text-muted)'
          }}>
            .{stepStr}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'Space Grotesk, sans-serif' }}>
            {source.document_name}
          </div>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, 
          fontWeight: 700, 
          color: scoreColor,
          border: `1px solid ${scoreColor}22`,
          background: `${scoreColor}05`,
          padding: '2px 6px', 
          borderRadius: 2,
        }}>
          relevance {score}%
        </div>
      </div>

      <div style={{ 
        fontFamily: 'JetBrains Mono, monospace', 
        fontSize: 10, 
        color: 'var(--color-text-muted)', 
        marginBottom: 10 
      }}>
        PAGE_{source.page}
      </div>

      <p style={{
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: 12
      }}>
        {source.text_snippet}
      </p>

      {/* Relevance bar */}
      <div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${score}%`,
              background: scoreColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
