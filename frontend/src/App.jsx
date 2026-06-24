import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Layout/Navbar';
import Hub from './pages/Hub';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        <Navbar />
        <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-light)',
            border: '1px solid var(--color-border)',
            fontSize: '13px',
            borderRadius: '8px'
          },
        }}
      />
    </BrowserRouter>
  );
}
