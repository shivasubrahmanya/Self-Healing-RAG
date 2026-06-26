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
    <header className="aether-navbar flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 py-3.5 md:py-4 px-6 md:px-8">
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <NavLink to="/" className="aether-logo flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="ÆSCULAPIUS Logo" className="w-8 h-8 rounded-md object-cover border border-[#38bdf8]/30" />
          <div className="flex flex-col">
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-light)', lineHeight: 1.1 }}>ÆSCULAPIUS</span>
            <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>SELF-HEALING RAG PLATFORM</span>
          </div>
        </NavLink>
        
        <div className="system-pulse">
          <span className="system-pulse-dot"></span>
          <span>System Pulse: Active</span>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none justify-start md:justify-center whitespace-nowrap">
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

      <div className="flex items-center justify-center w-full md:w-auto">
        {getActionButton()}
      </div>
    </header>
  );
}
