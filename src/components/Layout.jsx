import { Routes, Route, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Settings, Bell, Search, ChevronRight, Zap, Building2, LogOut, CheckCircle, X, Plug, ScrollText, Flame, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardView from '../pages/DashboardView.jsx';
import JobsView from '../pages/JobsView.jsx';
import CandidatesView from '../pages/CandidatesView.jsx';
import SettingsView from '../pages/SettingsView.jsx';
import ClientsView from '../pages/ClientsView.jsx';
import JobWorkspace from '../pages/JobWorkspace.jsx';
import ClientWorkspace from '../pages/ClientWorkspace.jsx';
import PlacementsView from '../pages/PlacementsView.jsx';
import IntegrationsView from '../pages/IntegrationsView.jsx';
import AuditView from '../pages/AuditView.jsx';
import HotlistsView from '../pages/HotlistsView.jsx';
import TeamView from '../pages/TeamView.jsx';
import BillingView from '../pages/BillingView.jsx';
import { ArrowRightLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/jobs': 'Jobs',
  '/candidates': 'Candidates',
  '/hotlists': 'Hotlists',
  '/placements': 'Pipeline & Placements',
  '/billing': 'Time & Billing',
  '/clients': 'Clients',
  '/integrations': 'Integrations',
  '/audit': 'Audit & Export',
  '/team': 'Team',
  '/settings': 'Settings',
};

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', exact: true },
  { label: 'Jobs',      icon: Briefcase,       path: '/jobs' },
  { label: 'Candidates',icon: Users,           path: '/candidates' },
  { label: 'Hotlists',  icon: Flame,           path: '/hotlists' },
  { label: 'Placements',icon: ArrowRightLeft,  path: '/placements' },
  { label: 'Time & Billing', icon: Clock,      path: '/billing' },
  { label: 'Clients',   icon: Building2,       path: '/clients' },
  { label: 'Integrations', icon: Plug,         path: '/integrations' },
];

const BOTTOM_NAV = [
  { label: 'Team', icon: Users, path: '/team' },
  { label: 'Audit & Export', icon: ScrollText, path: '/audit' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function Sidebar({ user, logout }) {
  const isRecruiter = user?.roles?.includes('Recruiter');

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(24px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
      borderRight: '1px solid rgba(0, 0, 0, 0.07)',
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
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px var(--primary-glow-strong)',
            flexShrink: 0,
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Candeo
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.05em' }}>
              Staffing OS
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
        <a
          href="/careers"
          target="_blank"
          rel="noreferrer"
          className="nav-link"
          style={{ marginBottom: 8, fontSize: 12 }}
        >
          <ExternalLink size={14} className="nav-icon" />
          Public careers
        </a>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'background var(--t-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--primary)',
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
  const navigate = useNavigate();
  const parts = pathname.split('/').filter(Boolean);
  const title = PAGE_TITLES[pathname] || (parts[2] === 'pipeline' ? 'Pipeline' : 'Candeo');
  
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    fetch('/api/ats/notifications')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setNotifications(list.filter(n => {
          const target = (n.roleToNotify || n.RoleToNotify || '').toLowerCase();
          return user.roles?.some(r => r.toLowerCase() === target) || target === 'admin';
        }));
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQ.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/ats/search?q=${encodeURIComponent(searchQ.trim())}`);
        if (r.ok) setSearchResults(await r.json());
      } catch (e) { console.error(e); }
      setSearching(false);
    }, 220);
    return () => clearTimeout(searchTimer.current);
  }, [searchQ, searchOpen]);

  const markRead = async (id) => {
    await fetch(`/api/ats/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.filter(n => (n.id ?? n.Id) !== id));
  };

  const goToResult = (type, id) => {
    setSearchOpen(false);
    setSearchQ('');
    setSearchResults(null);
    if (type === 'candidate') navigate('/candidates');
    else if (type === 'job') navigate(`/jobs/${id}`);
    else if (type === 'client') navigate(`/clients/${id}`);
  };

  const resultCount = searchResults
    ? (searchResults.candidates?.length || 0) + (searchResults.jobs?.length || 0) + (searchResults.clients?.length || 0)
    : 0;

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(250, 248, 245, 0.88)',
      backdropFilter: 'blur(20px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
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

      {/* Global search */}
      <div style={{ position: 'relative', width: searchOpen ? 360 : 220, transition: 'width 0.2s ease' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
        <input
          ref={searchRef}
          className="input"
          placeholder="Search talent, jobs, clients…  ⌘K"
          value={searchQ}
          onFocus={() => setSearchOpen(true)}
          onChange={e => { setSearchOpen(true); setSearchQ(e.target.value); }}
          style={{
            paddingLeft: 34, paddingRight: 32, height: 34, fontSize: 12.5,
            background: 'var(--surface)', borderRadius: 10,
          }}
        />
        {searchOpen && searchQ && (
          <button className="btn-icon" style={{ position: 'absolute', right: 4, top: 3, padding: 6 }} onClick={() => { setSearchQ(''); setSearchResults(null); }}>
            <X size={12} />
          </button>
        )}
        {searchOpen && (searchQ.trim().length >= 2) && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
            background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 60, overflow: 'hidden', maxHeight: 420, overflowY: 'auto',
          }}>
            {searching && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)' }}>Searching…</div>
            )}
            {!searching && resultCount === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text-4)' }}>No matches for “{searchQ}”</div>
            )}
            {!searching && searchResults?.candidates?.length > 0 && (
              <div>
                <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em' }}>CANDIDATES</div>
                {searchResults.candidates.map(c => (
                  <button key={`c-${c.id}`} onClick={() => goToResult('candidate', c.id)} style={{
                    width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.role} · {c.email}</span>
                  </button>
                ))}
              </div>
            )}
            {!searching && searchResults?.jobs?.length > 0 && (
              <div>
                <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em' }}>JOBS</div>
                {searchResults.jobs.map(j => (
                  <button key={`j-${j.id}`} onClick={() => goToResult('job', j.id)} style={{
                    width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{j.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{j.jobCode} · {j.status} · {j.location}</span>
                  </button>
                ))}
              </div>
            )}
            {!searching && searchResults?.clients?.length > 0 && (
              <div>
                <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em' }}>CLIENTS</div>
                {searchResults.clients.map(c => (
                  <button key={`cl-${c.id}`} onClick={() => goToResult('client', c.id)} style={{
                    width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.industry} · {c.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              width: 320, background: '#fff', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 50,
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
                    <div key={n.id ?? n.Id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{n.message ?? n.Message}</div>
                      <button className="btn-icon" style={{ padding: 4 }} onClick={() => markRead(n.id ?? n.Id)}><CheckCircle size={14} color="var(--emerald)" /></button>
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
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 8px var(--primary-glow)',
        }}>
          {user?.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || 'US'}
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const isRecruiter = user?.roles?.includes('Recruiter') && !user?.roles?.includes('Admin');

  return (
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
            <Route path="/hotlists"               element={<HotlistsView />} />
            <Route path="/placements"             element={<PlacementsView />} />
            <Route path="/billing"                element={<BillingView />} />
            <Route path="/integrations"           element={<IntegrationsView />} />
            <Route path="/audit"                  element={<AuditView />} />
            <Route path="/team"                   element={<TeamView />} />
            <Route path="/settings"               element={<SettingsView />} />
            {!isRecruiter && (
              <>
                <Route path="/clients" element={<ClientsView />} />
                <Route path="/clients/:id/*" element={<ClientWorkspace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}
