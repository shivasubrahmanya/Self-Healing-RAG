import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, BarChart3, Sliders, Database } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/chat', label: 'Chat Engine', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin', label: 'System Admin', icon: Sliders },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {/* SaaS Premium Branding */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Database size={18} />
        </div>
        <div>
          <div style={{ 
            fontFamily: 'Inter, sans-serif',
            fontSize: 15, 
            fontWeight: 700, 
            color: 'var(--text-light)', 
            letterSpacing: '-0.02em',
            lineHeight: 1.1 
          }}>
            HealRAG
          </div>
          <div style={{ 
            fontSize: 11, 
            color: 'var(--text-secondary)', 
            fontFamily: 'Inter, sans-serif', 
            fontWeight: 450,
            marginTop: 2,
            textTransform: 'none',
            letterSpacing: 'normal'
          }}>
            Self-Healing Engine
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
            className={({ isActive }) => `nav-item-new ${isActive ? 'active' : ''}`}
          >
            <Icon className="nav-icon" size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* System Status bottom panel */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="healing-pulse" style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--color-emerald)',
          }} />
          <span style={{ 
            fontSize: 12, 
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            textTransform: 'none',
          }}>
            System Active
          </span>
        </div>
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'monospace'
        }}>
          v1.0.0
        </span>
      </div>
    </nav>
  );
}
