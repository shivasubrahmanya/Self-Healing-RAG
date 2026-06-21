/**
 * ConfidenceBadge — animated SVG ring showing confidence percentage.
 * Color transitions: emerald (≥85%) → amber (≥70%) → rose (<70%)
 */
export default function ConfidenceBadge({ confidence, size = 80 }) {
  const pct = Math.round(confidence * 100);
  const r = (size / 2) - 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 85 ? 'var(--color-emerald)' :
    pct >= 70 ? 'var(--color-amber)' :
    'var(--color-rose)';

  const glowColor =
    pct >= 85 ? 'var(--color-emerald-glow)' :
    pct >= 70 ? 'var(--color-amber-glow)' :
    'var(--color-rose-glow)';

  const label =
    pct >= 85 ? 'High' :
    pct >= 70 ? 'Moderate' :
    'Low';

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="confidence-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease',
              filter: `drop-shadow(0 0 6px ${glowColor})`,
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
          <span style={{ fontSize: size * 0.2, fontWeight: 700, color, lineHeight: 1 }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 600 }}>
        {label} Confidence
      </div>
    </div>
  );
}
