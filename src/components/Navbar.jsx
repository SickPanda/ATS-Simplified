import React from 'react';
import { Briefcase, Users2, Cpu } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'candidates', label: 'Candidates', icon: Users2 },
  ];

  return (
    <nav style={styles.nav}>
      {/* Brand Header */}
      <div style={styles.brandContainer}>
        <div style={styles.logoHex}>
          <Cpu size={18} style={{ color: 'hsl(var(--primary-hsl))' }} />
        </div>
        <div style={styles.brandText}>
          <span style={styles.brandTitle}>Aura ATS</span>
          <span style={styles.brandSubtitle}>TALENT ENGINE</span>
        </div>
      </div>

      {/* Nav Link List */}
      <div style={styles.linksContainer}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              }}
            >
              <Icon size={16} style={isActive ? { color: 'hsl(var(--primary-hsl))' } : {}} />
              <span>{item.label}</span>
              {isActive && <div style={styles.activeIndicator} />}
            </button>
          );
        })}
      </div>

      {/* Footer Profile Info */}
      <div style={styles.profileContainer}>
        <div style={styles.avatar}>
          <span>JD</span>
        </div>
        <div style={styles.profileMeta}>
          <div style={styles.profileName}>Jane Doe</div>
          <div style={styles.profileRole}>Principal Recruiter</div>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: '#ffffff',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.75rem 1.15rem 1.25rem',
    zIndex: 100,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    marginBottom: '2rem',
    paddingLeft: '0.2rem',
  },
  logoHex: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    background: 'var(--surface-2)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: '0.6rem',
    fontWeight: 600,
    color: 'hsl(var(--text-muted-hsl))',
    letterSpacing: '0.1em',
    marginTop: '-1px',
  },
  linksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flexGrow: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    color: 'hsl(var(--text-secondary-hsl))',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  navLinkActive: {
    color: 'white',
    background: 'rgba(255, 255, 255, 0.04)',
    fontWeight: 600,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    width: '3px',
    height: '50%',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'hsl(var(--primary-hsl))',
  },
  profileContainer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '0.8rem',
    color: 'white',
  },
  profileMeta: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  profileName: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'white',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  profileRole: {
    fontSize: '0.65rem',
    color: 'hsl(var(--text-muted-hsl))',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
};
