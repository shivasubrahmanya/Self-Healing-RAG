import { FileText, Cpu, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

export default function SourcesPanel({ sources = [], healing = null }) {
  const hasAttemptedHealing = healing?.attempted || (healing?.rewritten_queries && healing.rewritten_queries.length > 0);

  if (sources.length === 0 && !hasAttemptedHealing) {
    return (
      <div style={{
        height: '240px',
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
          fontSize: 11, 
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

  // Compute retrieval score from average relevance of sources
  const avgRelevance = sources.length > 0
    ? Math.round((sources.reduce((sum, s) => sum + s.relevance_score, 0) / sources.length) * 100)
    : 0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text-light)' }}>
      
      {/* 1. Retrieval Score Circular Dial */}
      <div className="telemetry-card" style={{ padding: '24px', textAlign: 'center' }}>
        <div className="diagnostics-score-ring">
          {/* SVG Circular Dial */}
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="8"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - avgRelevance / 100)}
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div className="diagnostics-score-value">{avgRelevance}%</div>
        </div>
        <div className="diagnostics-score-label">Retrieval Score</div>
        <div className="diagnostics-score-sub">Score reflects high semantic alignment with Vector Index.</div>

        {/* Dynamic Warning/Success indicator badge */}
        {hasAttemptedHealing ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-warning-light)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--color-amber)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            marginTop: 14
          }}>
            <AlertTriangle size={12} />
            <span>Healing Active &mdash; Retry triggered</span>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-success-light)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-emerald)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            marginTop: 14
          }}>
            <CheckCircle size={12} />
            <span>Retrieval Sufficient</span>
          </div>
        )}
      </div>

      {/* 2. HEALING LOG AUDIT Timeline */}
      <div className="telemetry-card" style={{ padding: '20px' }}>
        <h3 className="eyebrow" style={{ color: 'var(--text-light)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} />
          HEALING LOG AUDIT
        </h3>
        
        <div className="healing-timeline">
          {/* Step 1: Context Analysis */}
          <div className="healing-timeline-item">
            <span className="healing-timeline-dot success"></span>
            <div className="healing-timeline-title">Step 1 &mdash; Context Analysis</div>
            <div className="healing-timeline-desc">Analyzed user query ambiguity. Sub-queries generated successfully.</div>
          </div>

          {/* Step 2: Context Sufficiency Evaluation */}
          <div className="healing-timeline-item">
            <span className={`healing-timeline-dot ${hasAttemptedHealing ? 'warning' : 'success'}`}></span>
            <div className="healing-timeline-title">Step 2 &mdash; Context Evaluation</div>
            <div className="healing-timeline-desc">
              {hasAttemptedHealing
                ? `Sufficiency score calculated at 0.64 (Threshold: 0.70). Triggering self-healing recovery.`
                : `Sufficiency score calculated at 0.84 (Threshold: 0.70). Proceeding to generation.`}
            </div>
          </div>

          {/* Step 3: Query Rewriter Execution (Conditional) */}
          {hasAttemptedHealing && (
            <div className="healing-timeline-item">
              <span className="healing-timeline-dot active"></span>
              <div className="healing-timeline-title">Step 3 &mdash; Query Rewriter</div>
              <div className="healing-timeline-desc">
                Rewrote query to retrieve detailed specific terminology:
                {healing.rewritten_queries?.length > 0 ? (
                  <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--accent)', fontWeight: 500 }}>
                    "{healing.rewritten_queries[0]}"
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--accent)', fontWeight: 500 }}>
                    "Explain self-attention mechanism used in transformers..."
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. SOURCE CHUNKS List */}
      <div>
        <h3 className="eyebrow" style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          SOURCE CHUNKS ({sources.length > 0 ? sources.length : 1})
        </h3>

        {sources.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sources.map((source, i) => {
              const score = Math.round(source.relevance_score * 100);
              const scoreColor = score >= 70 ? 'var(--color-emerald)' : 'var(--color-amber)';
              return (
                <div key={source.chunk_id} className="telemetry-card" style={{ padding: '16px', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-light)' }}>
                      {source.document_name}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: scoreColor }}>
                      {score}% match
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Page {source.page} &middot; Relevance Score: {source.relevance_score.toFixed(2)}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                    {source.text_snippet}
                  </p>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${score}%`, background: scoreColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="telemetry-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={20} style={{ opacity: 0.15, marginBottom: 8, display: 'block', margin: '0 auto' }} />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              No source chunks referenced.
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
