import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function SubpageHeader({ title }) {
  return (
    <div className="subpage-header">
      <Link to="/" className="back-link">
        <ArrowLeft size={14} />
        <span>Back to Hub</span>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>Control Hub</span>
        <span>/</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{title}</span>
      </div>
    </div>
  );
}
