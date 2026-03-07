/**
 * DX Floating Action Button — bottom-left, purple, links to /admin/diagnostics
 */
import { useNavigate, useLocation } from 'react-router-dom';

export function DxFab() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on the diagnostics page itself and on auth pages
  if (location.pathname === '/admin/diagnostics' || location.pathname.startsWith('/auth')) return null;

  return (
    <button
      onClick={() => navigate('/admin/diagnostics')}
      aria-label="Open Platform Diagnostics"
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#7C3AED',
        color: '#FFFFFF',
        border: 'none',
        cursor: 'pointer',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
        boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
      }}
    >
      DX
    </button>
  );
}
