import { FileText } from 'lucide-react';

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
        color: 'var(--text-secondary)',
        padding: 24,
      }}>
        <FileText size={24} style={{ opacity: 0.15, marginBottom: 8 }} />
        <p style={{ 
          fontSize: 12, 
          textAlign: 'center', 
          fontFamily: 'Inter',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          awaiting search trace...
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%', color: 'var(--text-light)' }}>
      {/* Healing info */}
      {healing?.attempted && (
        <div style={{
          marginBottom: 24,
          padding: '16px',
          background: 'var(--accent-light)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="healing-dot" />
            <span style={{ 
              fontSize: 11, 
              fontFamily: 'Inter, sans-serif', 
              fontWeight: 600, 
              color: 'var(--accent)', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              self-healing loop active
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Triggered {healing.retries} search expansion retry iteration{healing.retries !== 1 ? 's' : ''} to reach sufficiency threshold.
          </p>
          {healing.rewritten_queries?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ 
                fontSize: 10, 
                fontFamily: 'Inter, sans-serif', 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: 6 
              }}>
                Query rewrites executed:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {healing.rewritten_queries.map((q, i) => (
                  <div key={i} style={{
                    fontSize: 12,
                    color: 'var(--text-light)',
                    paddingLeft: 10,
                    borderLeft: '2px solid var(--accent)',
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

      {/* Sources list */}
      {sources.length > 0 && (
        <>
          <div style={{
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}>
            {sources.length} document chunk{sources.length !== 1 ? 's' : ''} retrieved
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
    score >= 70 ? 'var(--color-emerald)' : 'var(--color-amber)';

  const stepStr = index < 10 ? `0${index}` : `${index}`;

  return (
    <div className="telemetry-card" style={{ padding: '16px 20px', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 600
          }}>
            .{stepStr}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-light)', fontFamily: 'Inter, sans-serif' }}>
            {source.document_name}
          </div>
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11, 
          fontWeight: 600, 
          color: scoreColor,
          letterSpacing: '0.02em',
        }}>
          {score}% relevance
        </div>
      </div>

      <div style={{ 
        fontFamily: 'Inter, sans-serif', 
        fontSize: 11, 
        color: 'var(--text-muted)', 
        textTransform: 'lowercase'
      }}>
        page {source.page}
      </div>

      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {source.text_snippet}
      </p>

      {/* Relevance progress bar */}
      <div>
        <div className="progress-bar-track" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${score}%`,
              background: scoreColor,
              borderRadius: 2
            }}
          />
        </div>
      </div>
    </div>
  );
}
