import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/chat', label: 'Chat Engine', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin', label: 'System Admin', icon: Settings },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {/* Monogram Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          SH
        </div>
        <div>
          <div style={{ 
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 12, 
            fontWeight: 700, 
            color: '#ffffff', 
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1.2 
          }}>
            Self-Heal RAG
          </div>
          <div style={{ 
            fontSize: 10, 
            color: 'var(--color-text-muted)', 
            fontFamily: 'JetBrains Mono, monospace', 
            fontWeight: 500,
            marginTop: 2
          }}>
            SYS v1.0.0
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={14} style={{ opacity: 0.8 }} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* System Status bottom panel */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Activity size={12} style={{ color: 'var(--color-emerald)' }} />
        <span style={{ 
          fontSize: 10, 
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          System Online
        </span>
      </div>
    </nav>
  );
}
