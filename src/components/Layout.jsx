import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Settings, Bell, Search, ChevronRight, Zap, Building2, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoginView from '../pages/LoginView.jsx';
import DashboardView from '../pages/DashboardView.jsx';
import JobsView from '../pages/JobsView.jsx';
import CandidatesView from '../pages/CandidatesView.jsx';
import KanbanView from '../pages/KanbanView.jsx';
import SettingsView from '../pages/SettingsView.jsx';
import ClientsView from '../pages/ClientsView.jsx';
import JobWorkspace from '../pages/JobWorkspace.jsx';
import PlacementsView from '../pages/PlacementsView.jsx';
import { ArrowRightLeft } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/jobs': 'Jobs',
  '/candidates': 'Candidates',
  '/placements': 'Pipeline & Placements',
  '/clients': 'Clients',
  '/settings': 'Settings',
};

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', exact: true },
  { label: 'Jobs',      icon: Briefcase,       path: '/jobs' },
  { label: 'Candidates',icon: Users,           path: '/candidates' },
  { label: 'Placements',icon: ArrowRightLeft,  path: '/placements' },
  { label: 'Clients',   icon: Building2,       path: '/clients' },
];

const BOTTOM_NAV = [
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function Sidebar({ user, logout }) {
  const isRecruiter = user?.role === 'Recruiter';

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'rgba(22, 25, 43, 0.4)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px var(--primary-glow-strong)',
            flexShrink: 0,
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-1)', lineHeight: 1.2 }}>
              ATS Pro
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.05em' }}>
              RECRUITING SUITE
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.08em', padding: '0 6px', marginBottom: 6 }}>
          MAIN
        </div>
        {NAV.map(({ label, icon: Icon, path, exact }) => {
          if (isRecruiter && label === 'Clients') return null;
          return (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={15} className="nav-icon" />
              {label}
            </NavLink>
          );
        })}

        {/* Settings always visible for all roles */}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 4px 10px' }} />
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.08em', padding: '0 6px', marginBottom: 6 }}>
          WORKSPACE
        </div>
        {BOTTOM_NAV.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={15} className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'background var(--t-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {user?.name?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.role}
            </div>
          </div>
          <button className="btn-icon" onClick={logout} title="Sign Out">
            <LogOut size={14} color="var(--text-3)" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ user }) {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const title = PAGE_TITLES[pathname] || (parts[2] === 'pipeline' ? 'Pipeline' : 'ATS Pro');
  
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/ats/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.filter(n => n.roleToNotify?.toLowerCase() === user.role?.toLowerCase() || n.roleToNotify === 'Admin'));
      })
      .catch(console.error);
  }, [user]);

  const markRead = async (id) => {
    await fetch(`/api/ats/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(15, 17, 26, 0.6)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        {parts.length > 1 && (
          <>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}
            </span>
            <ChevronRight size={13} color="var(--text-4)" />
          </>
        )}
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--text-1)',
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-icon" title="Search">
          <Search size={15} />
        </button>
        <div style={{ position: 'relative' }}>
          <button className="btn-icon" title="Notifications" onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={15} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: 7, right: 7,
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--rose)',
                border: '1.5px solid var(--surface)',
              }} />
            )}
          </button>
          
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 10,
              width: 320, background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 50,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                Notifications
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No new notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{n.message}</div>
                      <button className="btn-icon" style={{ padding: 4 }} onClick={() => markRead(n.id)}><CheckCircle size={14} color="var(--emerald)" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 8px var(--primary-glow)',
        }}>
          {user?.name?.substring(0, 2).toUpperCase() || 'US'}
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect } from 'react';

export default function Layout() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return <LoginView />;

  const isRecruiter = user.role === 'Recruiter';

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh', background: 'transparent' }}>
        <Sidebar user={user} logout={logout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar user={user} />
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Routes>
              <Route path="/"                      element={<DashboardView />} />
              <Route path="/jobs"                   element={<JobsView />} />
              <Route path="/jobs/:id/*"             element={<JobWorkspace />} />
              <Route path="/candidates"             element={<CandidatesView />} />
              <Route path="/placements"             element={<PlacementsView />} />
              <Route path="/settings"               element={<SettingsView />} />
              {!isRecruiter && <Route path="/clients" element={<ClientsView />} />}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
