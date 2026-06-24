import { NavLink, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, MessageSquare, Database, BarChart3, Sliders } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  // Action button contextual labels
  const getActionButton = () => {
    switch (location.pathname) {
      case '/chat':
        return <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>New Analysis</button>;
      case '/dashboard':
        return <button onClick={() => document.getElementById('file-upload-input')?.click()} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>+ New Collection</button>;
      default:
        return <NavLink to="/chat" className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', textDecoration: 'none' }}>Launch Chat</NavLink>;
    }
  };

  return (
    <header className="aether-navbar">
      <div className="aether-navbar-left">
        <NavLink to="/" className="aether-logo">
          <div className="aether-logo-icon">A</div>
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em' }}>Aether RAG</span>
        </NavLink>
        
        <div className="system-pulse">
          <span className="system-pulse-dot"></span>
          <span>System Pulse: Active</span>
        </div>
      </div>

      <nav className="aether-navbar-center">
        <NavLink to="/" className={({ isActive }) => `aether-nav-link ${isActive ? 'active' : ''}`} end style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LayoutDashboard size={14} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `aether-nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={14} />
          <span>Query Engine</span>
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `aether-nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Database size={14} />
          <span>Knowledge Base</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `aether-nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BarChart3 size={14} />
          <span>Analytics</span>
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => `aether-nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sliders size={14} />
          <span>Agent Config</span>
        </NavLink>
      </nav>

      <div className="aether-navbar-right">
        {getActionButton()}
      </div>
    </header>
  );
}
