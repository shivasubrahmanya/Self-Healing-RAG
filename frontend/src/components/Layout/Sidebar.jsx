import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  LayoutDashboard,
  BarChart3,
  Settings,
  Zap,
  Activity,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
            SelfHeal RAG
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            v1.0.0
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
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Activity size={14} style={{ color: 'var(--color-emerald)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>System Active</span>
      </div>
    </nav>
  );
}
