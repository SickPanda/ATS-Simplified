import { useEffect, useState } from 'react';
import {
  Plug, Briefcase, MessageSquare, Building2, ShieldCheck, Calculator,
  CheckCircle2, ExternalLink, Search, Link2, Unlink
} from 'lucide-react';

/**
 * Ceipal-style integrations hub.
 * Real job-board/VMS APIs need partner contracts; this hub is production-ready UX:
 * - Catalog by category (what buyers expect)
 * - Connect / disconnect with local config (webhook URL or API key placeholder)
 * - Ready to wire real OAuth later per provider
 */
const CATALOG = [
  // Job boards (Ceipal's core differentiator for staffing)
  { id: 'linkedin', name: 'LinkedIn', category: 'Job Boards', desc: 'Post jobs & pull RSC candidates when licensed', color: '#0A66C2', status: 'available' },
  { id: 'indeed', name: 'Indeed', category: 'Job Boards', desc: 'Sponsored & organic job distribution', color: '#2164F3', status: 'available' },
  { id: 'dice', name: 'Dice', category: 'Job Boards', desc: 'Tech talent job board posting', color: '#E31837', status: 'available' },
  { id: 'monster', name: 'Monster', category: 'Job Boards', desc: 'Job distribution & resume database', color: '#6E46AE', status: 'available' },
  { id: 'careerbuilder', name: 'CareerBuilder', category: 'Job Boards', desc: 'Job posts & candidate sourcing', color: '#00ADEF', status: 'available' },
  { id: 'ziprecruiter', name: 'ZipRecruiter', category: 'Job Boards', desc: 'One-click multi-board distribution', color: '#1A73E8', status: 'coming' },
  // Productivity
  { id: 'outlook', name: 'Microsoft Outlook', category: 'Productivity', desc: 'Email sync & calendar interviews', color: '#0078D4', status: 'available' },
  { id: 'gmail', name: 'Gmail', category: 'Productivity', desc: 'Candidate outreach from Gmail', color: '#EA4335', status: 'available' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Productivity', desc: 'Interview alerts & team channels', color: '#6264A7', status: 'available' },
  { id: 'slack', name: 'Slack', category: 'Productivity', desc: 'Placement & pipeline notifications', color: '#4A154B', status: 'available' },
  // VMS (staffing-specific — Ceipal strength)
  { id: 'fieldglass', name: 'SAP Fieldglass', category: 'VMS', desc: 'Submit contractors to client VMS', color: '#008FD3', status: 'coming' },
  { id: 'beeline', name: 'Beeline', category: 'VMS', desc: 'MSP / VMS submittals', color: '#E35205', status: 'coming' },
  { id: 'ripplehire', name: 'RippleHire', category: 'VMS', desc: 'Direct candidate submit to VMS', color: '#00A9A5', status: 'available' },
  // Screening & ops
  { id: 'checkr', name: 'Checkr', category: 'Screening', desc: 'Background checks from candidate profile', color: '#0D9488', status: 'available' },
  { id: 'docusign', name: 'DocuSign', category: 'Screening', desc: 'Offer letters & contractor agreements', color: '#FFD700', status: 'coming' },
  { id: 'quickbooks', name: 'QuickBooks', category: 'Accounting', desc: 'Placement billing & invoices', color: '#2CA01C', status: 'available' },
];

const CATEGORIES = [
  { id: 'All', icon: Plug },
  { id: 'Job Boards', icon: Briefcase },
  { id: 'Productivity', icon: MessageSquare },
  { id: 'VMS', icon: Building2 },
  { id: 'Screening', icon: ShieldCheck },
  { id: 'Accounting', icon: Calculator },
];

const STORAGE_KEY = 'ats_integrations_config';

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

export default function IntegrationsView() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [config, setConfig] = useState(loadConfig);
  const [active, setActive] = useState(null); // integration being edited
  const [form, setForm] = useState({ apiKey: '', webhookUrl: '', notes: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const filtered = CATALOG.filter(i => {
    const catOk = category === 'All' || i.category === category;
    const q = search.toLowerCase();
    const qOk = !q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q);
    return catOk && qOk;
  });

  const connectedCount = Object.values(config).filter(c => c?.connected).length;

  const openConnect = (item) => {
    if (item.status === 'coming') return;
    const existing = config[item.id] || {};
    setActive(item);
    setForm({
      apiKey: existing.apiKey || '',
      webhookUrl: existing.webhookUrl || '',
      notes: existing.notes || '',
    });
    setSaved(false);
  };

  const saveConnect = () => {
    if (!active) return;
    setConfig(prev => ({
      ...prev,
      [active.id]: {
        connected: true,
        connectedAt: new Date().toISOString(),
        apiKey: form.apiKey.trim(),
        webhookUrl: form.webhookUrl.trim(),
        notes: form.notes.trim(),
      }
    }));
    setSaved(true);
    setTimeout(() => { setActive(null); setSaved(false); }, 900);
  };

  const disconnect = (id) => {
    setConfig(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (active?.id === id) setActive(null);
  };

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Integrations
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 520 }}>
            Connect job boards, email, VMS, and screening tools the way staffing platforms like Ceipal do —
            keep recruiters in one workspace. {connectedCount > 0 && <strong style={{ color: 'var(--emerald)' }}>{connectedCount} connected</strong>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="input-search" style={{ width: 240 }}>
            <Search size={14} color="var(--text-4)" />
            <input placeholder="Search integrations…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="anim-fade-up">
        {CATEGORIES.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className="btn"
            style={{
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              background: category === id ? 'var(--primary-glow)' : '#fff',
              color: category === id ? 'var(--primary)' : 'var(--text-2)',
              border: `1px solid ${category === id ? 'rgba(37,99,235,0.25)' : 'var(--border)'}`,
            }}
          >
            <Icon size={14} /> {id}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="card anim-fade-up" style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))', border: '1px solid rgba(37,99,235,0.12)' }}>
        <Plug size={18} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text-1)' }}>How this maps to Ceipal:</strong> they win on connectors to Indeed, Dice, LinkedIn RSC, Outlook/Teams, Fieldglass, Checkr, QuickBooks, etc.
          ATS Pro stores connection credentials here (API key / webhook) so your team can wire live partners without leaving the product.
          Full OAuth for each board is partner-specific and enabled as you get API access.
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map((item, i) => {
          const isOn = !!config[item.id]?.connected;
          return (
            <div
              key={item.id}
              className="card-lift anim-fade-up"
              style={{ padding: 18, animationDelay: `${i * 0.03}s`, cursor: item.status === 'coming' ? 'default' : 'pointer' }}
              onClick={() => openConnect(item)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `${item.color}14`,
                  border: `1px solid ${item.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, color: item.color,
                }}>
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
                {item.status === 'coming' ? (
                  <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>Soon</span>
                ) : isOn ? (
                  <span className="badge badge-active"><CheckCircle2 size={11} /> Connected</span>
                ) : (
                  <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>Available</span>
                )}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.04em', marginBottom: 8 }}>{item.category.toUpperCase()}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45, minHeight: 36 }}>{item.desc}</div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                {item.status !== 'coming' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
                    onClick={(e) => { e.stopPropagation(); openConnect(item); }}
                  >
                    <Link2 size={13} /> {isOn ? 'Configure' : 'Connect'}
                  </button>
                )}
                {isOn && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '7px 10px' }}
                    onClick={(e) => { e.stopPropagation(); disconnect(item.id); }}
                  >
                    <Unlink size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <Search size={36} />
          <p>No integrations match “{search}”</p>
        </div>
      )}

      {/* Connect drawer */}
      {active && (
        <>
          <div className="overlay" onClick={() => setActive(null)} />
          <div className="drawer" style={{ width: 420 }}>
            <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em' }}>{active.category.toUpperCase()}</div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text-1)', marginTop: 4 }}>
                Connect {active.name}
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>{active.desc}</p>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <label className="label">API KEY / TOKEN</label>
                <input className="input" placeholder="Paste partner API key" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
              </div>
              <div>
                <label className="label">WEBHOOK URL (OPTIONAL)</label>
                <input className="input" placeholder="https://…" value={form.webhookUrl} onChange={e => setForm({ ...form, webhookUrl: e.target.value })} />
              </div>
              <div>
                <label className="label">NOTES</label>
                <textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="Account ID, contact, env…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Credentials stay in this browser for now (demo). For production multi-user, we store encrypted secrets in Azure Key Vault / app config.
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setActive(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={saveConnect}>
                  {saved ? <><CheckCircle2 size={14} /> Connected</> : <><Link2 size={14} /> Save connection</>}
                </button>
              </div>
              <a href="https://www.ceipal.com/integrations" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', justifyContent: 'center' }}>
                See how enterprise ATS integration catalogs look <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
