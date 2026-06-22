/**
 * ConfidenceBadge — minimalist SVG ring showing confidence percentage.
 * Color transitions: emerald (accent) → amber (accent) → rose (warning)
 */
export default function ConfidenceBadge({ confidence, size = 56 }) {
  const pct = Math.round(confidence * 100);
  const r = (size / 2) - 3;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? 'var(--accent)' : 'var(--color-rose)';

  const label =
    pct >= 85 ? 'high' :
    pct >= 70 ? 'moderate' :
    'low';

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
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1.5}
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
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
            fontFamily: 'Inter, sans-serif', 
            fontSize: 11, 
            fontWeight: 500, 
            color: 'var(--text-dark)', 
            lineHeight: 1 
          }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ 
          fontSize: 9, 
          fontFamily: 'Inter, sans-serif', 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em' 
        }}>
          confidence
        </div>
        <div style={{ 
          fontSize: 11, 
          fontWeight: 450, 
          color: 'var(--text-dark)', 
          textTransform: 'lowercase', 
          letterSpacing: '0.02em',
          marginTop: 1
        }}>
          {label} score
        </div>
      </div>
    </div>
  );
}
