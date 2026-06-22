/**
 * ConfidenceBadge — minimalist SVG ring showing confidence percentage.
 * Color transitions: emerald (≥85%) → amber (≥70%) → rose (<70%)
 */
export default function ConfidenceBadge({ confidence, size = 60 }) {
  const pct = Math.round(confidence * 100);
  const r = (size / 2) - 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 85 ? 'var(--color-emerald)' :
    pct >= 70 ? 'var(--color-amber)' :
    'var(--color-rose)';

  const label =
    pct >= 85 ? 'High' :
    pct >= 70 ? 'Moderate' :
    'Low';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="confidence-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth={2}
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease',
            }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ 
            fontFamily: 'JetBrains Mono, monospace', 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#ffffff', 
            lineHeight: 1 
          }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ 
          fontSize: 9, 
          fontFamily: 'JetBrains Mono, monospace', 
          color: 'var(--color-text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em' 
        }}>
          Confidence
        </div>
        <div style={{ 
          fontSize: 11, 
          fontWeight: 600, 
          color: color, 
          textTransform: 'uppercase', 
          letterSpacing: '0.02em',
          marginTop: 1
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}
