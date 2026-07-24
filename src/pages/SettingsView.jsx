import { useState, useEffect } from 'react';
import { Key, CheckCircle2, XCircle, Zap, Shield, Building2, User, Globe, CreditCard, Mail, Phone, MapPin, Camera, Save, RefreshCw, Bell, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'company',      label: 'Company Profile', icon: Building2 },
  { id: 'account',      label: 'My Account',      icon: User },
  { id: 'email',        label: 'Email (SMTP)',    icon: Mail },
  { id: 'integrations', label: 'Integrations',    icon: Zap },
  { id: 'security',     label: 'Security',         icon: Lock },
];

export default function SettingsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');

  // --- Groq (free Llama) optional boost ---
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState(true);
  const [connStatus, setConnStatus] = useState('idle');
  const [saved, setSaved] = useState(false);

  // --- Email SMTP ---
  const [emailCfg, setEmailCfg] = useState({
    enabled: true, host: '', port: 587, user: '', password: '',
    fromEmail: '', fromName: 'Candeo', enableSsl: true, hasPassword: false, mode: 'log_only',
  });
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailTestMsg, setEmailTestMsg] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [templates, setTemplates] = useState([]);

  // --- Company Profile state ---
  const [company, setCompany] = useState({
    name: 'Candeo Demo',
    website: 'https://candeo.app',
    industry: 'Staffing & Recruiting',
    size: '11-50 employees',
    phone: '+1 (555) 000-1234',
    email: 'hr@candeo.app',
    street: '1600 Amphitheatre Pkwy',
    city: 'Mountain View',
    state: 'CA',
    zip: '94043',
    country: 'United States',
    taxId: 'XX-XXXXXXX',
    description: 'Boutique IT staffing firm specialized in placing highly-qualified engineers for enterprise accounts.',
  });
  const [companySaved, setCompanySaved] = useState(false);

  // --- User Profile state ---
  const [profile, setProfile] = useState({
    fullName: user?.name || 'Admin User',
    title: 'Senior Recruiter',
    email: user?.email || 'admin@candeo.com',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    notifyNewCandidate: true,
    notifyPlacement: true,
    notifyInterview: true,
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('groq_api_key') || localStorage.getItem('gemini_api_key');
    if (stored) setApiKey(stored);
    
    // Load saved company/profile from localStorage if exists
    const storedCompany = localStorage.getItem('ats_company_profile');
    if (storedCompany) setCompany(JSON.parse(storedCompany));
    const storedProfile = localStorage.getItem('ats_user_profile');
    if (storedProfile) setProfile(JSON.parse(storedProfile));
  }, []);

  useEffect(() => {
    if (activeTab !== 'email') return;
    fetch('/api/ats/email/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setEmailCfg({
          enabled: d.enabled !== false,
          host: d.host || '',
          port: d.port || 587,
          user: d.user || '',
          password: '',
          fromEmail: d.fromEmail || '',
          fromName: d.fromName || 'Candeo',
          enableSsl: d.enableSsl !== false,
          hasPassword: !!d.hasPassword,
          mode: d.mode || 'log_only',
        });
      })
      .catch(() => {});
    fetch('/api/ats/email/templates')
      .then(r => r.ok ? r.json() : [])
      .then(t => setTemplates(Array.isArray(t) ? t : []))
      .catch(() => {});
  }, [activeTab]);

  const saveEmailSettings = async () => {
    setEmailBusy(true);
    setEmailTestMsg('');
    try {
      const res = await fetch('/api/ats/email/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: emailCfg.enabled,
          host: emailCfg.host,
          port: Number(emailCfg.port) || 587,
          user: emailCfg.user,
          password: emailCfg.password || null,
          fromEmail: emailCfg.fromEmail,
          fromName: emailCfg.fromName,
          enableSsl: emailCfg.enableSsl,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const d = await res.json();
      setEmailCfg(prev => ({
        ...prev,
        password: '',
        hasPassword: !!d.hasPassword,
        mode: d.mode || (d.configured ? 'smtp' : 'log_only'),
      }));
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    } catch (e) {
      setEmailTestMsg(e.message || 'Save failed');
    } finally {
      setEmailBusy(false);
    }
  };

  const testEmail = async () => {
    setEmailBusy(true);
    setEmailTestMsg('');
    try {
      const res = await fetch('/api/ats/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user?.email || emailCfg.fromEmail }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) setEmailTestMsg(`Sent test to ${d.to}`);
      else if (d.status === 'LoggedOnly') setEmailTestMsg('SMTP not ready — message logged only. Save host/from first.');
      else setEmailTestMsg(d.error || d.message || 'Test failed');
    } catch {
      setEmailTestMsg('Test failed');
    } finally {
      setEmailBusy(false);
    }
  };

  const testGroqConnection = async () => {
    if (!apiKey.trim()) return;
    setConnStatus('testing');
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
      setConnStatus(r.ok ? 'ok' : 'fail');
    } catch { setConnStatus('fail'); }
  };

  const saveApiKey = () => {
    localStorage.setItem('groq_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveCompanyProfile = () => {
    localStorage.setItem('ats_company_profile', JSON.stringify(company));
    setCompanySaved(true);
    setTimeout(() => setCompanySaved(false), 2500);
  };

  const saveUserProfile = () => {
    localStorage.setItem('ats_user_profile', JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const displayKey = masked && apiKey
    ? apiKey.slice(0, 8) + '•'.repeat(Math.max(0, apiKey.length - 12)) + apiKey.slice(-4)
    : apiKey;

  const ConnIcon = () => {
    if (connStatus === 'testing') return <div className="anim-spin" style={{width:15,height:15,border:'2px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%'}} />;
    if (connStatus === 'ok')      return <CheckCircle2 size={15} color="var(--emerald)" />;
    if (connStatus === 'fail')    return <XCircle size={15} color="var(--rose)" />;
    return null;
  };

  return (
    <div style={{ padding: '28px', display: 'flex', gap: 24, height: '100%' }}>
      
      {/* Sidebar Tab List */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', marginBottom: 8, paddingLeft: 4 }}>SETTINGS</p>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px', borderRadius: 10, border: 'none',
                background: isActive ? 'var(--primary-glow)' : 'transparent',
                color: isActive ? 'var(--primary-light)' : 'var(--text-2)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                textAlign: 'left', width: '100%', fontFamily: 'inherit',
                transition: 'all 0.12s',
                borderLeft: isActive ? `2px solid var(--primary)` : '2px solid transparent',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── COMPANY PROFILE ── */}
        {activeTab === 'company' && (
          <>
            <div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>Company Profile</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Your company account details visible across the workspace</p>
            </div>

            {/* Logo + Basic */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
                  boxShadow: '0 4px 20px var(--primary-glow-strong)',
                }}>
                  {company.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{company.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{company.industry} · {company.size}</div>
                  <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12, padding: '5px 12px' }}>
                    <Camera size={13} /> Upload Logo
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">COMPANY NAME</label>
                  <input className="input" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} />
                </div>
                <div>
                  <label className="label">WEBSITE</label>
                  <input className="input" value={company.website} onChange={e => setCompany({...company, website: e.target.value})} />
                </div>
                <div>
                  <label className="label">INDUSTRY</label>
                  <select className="input" value={company.industry} onChange={e => setCompany({...company, industry: e.target.value})} style={{ background: 'var(--surface-2)' }}>
                    <option>Staffing & Recruiting</option>
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Engineering</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">COMPANY SIZE</label>
                  <select className="input" value={company.size} onChange={e => setCompany({...company, size: e.target.value})} style={{ background: 'var(--surface-2)' }}>
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-1000 employees</option>
                    <option>1000+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="label">BUSINESS PHONE</label>
                  <input className="input" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">BUSINESS EMAIL</label>
                  <input className="input" type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">FEDERAL TAX ID (EIN)</label>
                  <input className="input" value={company.taxId} onChange={e => setCompany({...company, taxId: e.target.value})} />
                </div>
                <div />
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">STREET ADDRESS</label>
                  <input className="input" value={company.street} onChange={e => setCompany({...company, street: e.target.value})} />
                </div>
                <div>
                  <label className="label">CITY</label>
                  <input className="input" value={company.city} onChange={e => setCompany({...company, city: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">STATE</label>
                    <input className="input" value={company.state} onChange={e => setCompany({...company, state: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">ZIP</label>
                    <input className="input" value={company.zip} onChange={e => setCompany({...company, zip: e.target.value})} />
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">COMPANY DESCRIPTION</label>
                  <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={company.description} onChange={e => setCompany({...company, description: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
                {companySaved && <span style={{ fontSize: 13, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> Saved!</span>}
                <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={saveCompanyProfile}>
                  <Save size={14} /> Save Company Profile
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── MY ACCOUNT ── */}
        {activeTab === 'account' && (
          <>
            <div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>My Account</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Personal profile details and notification preferences</p>
            </div>

            <div className="card" style={{ padding: 24 }}>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: '#fff',
                }}>
                  {profile.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{profile.fullName}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{profile.title} · {user?.role}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">FULL NAME</label>
                  <input className="input" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="label">JOB TITLE</label>
                  <input className="input" value={profile.title} onChange={e => setProfile({...profile, title: e.target.value})} />
                </div>
                <div>
                  <label className="label">EMAIL ADDRESS</label>
                  <input className="input" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">MOBILE PHONE</label>
                  <input className="input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">TIMEZONE</label>
                  <select className="input" value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} style={{ background: 'var(--surface-2)' }}>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Asia/Karachi">Pakistan Standard Time (PKT)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={16} color="var(--primary-light)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Notification Preferences</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Choose which activities trigger alerts</p>
                </div>
              </div>
              {[
                { key: 'notifyNewCandidate', label: 'New candidate uploaded or parsed', sub: 'Get notified when a new resume is added to the talent bench' },
                { key: 'notifyPlacement',    label: 'Placement confirmed',             sub: 'When a candidate is moved to Hired and placement is finalized' },
                { key: 'notifyInterview',    label: 'Interview scheduled',             sub: 'When a calendar invite is sent for a candidate interview' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                    <input 
                      type="checkbox" 
                      checked={profile[item.key]}
                      onChange={e => setProfile({...profile, [item.key]: e.target.checked})}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                      background: profile[item.key] ? 'var(--primary)' : 'var(--surface-3)',
                      transition: 'background 0.2s',
                      position: 'relative',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        position: 'absolute', top: 2, left: profile[item.key] ? 20 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }} />
                    </div>
                  </label>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
                {profileSaved && <span style={{ fontSize: 13, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> Saved!</span>}
                <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={saveUserProfile}>
                  <Save size={14} /> Save My Account
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── INTEGRATIONS ── */}
        {activeTab === 'integrations' && (
          <>
            <div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>Integrations</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Connect AI, email providers, and third-party tools</p>
            </div>

            {/* Candeo Intelligence — in-app only */}
            <div className="card" style={{ padding: 24, border: '1px solid rgba(4,120,87,0.28)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={17} color="var(--success)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Candeo Intelligence</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                    In-app resume engine · no external AI · data stays on your server
                  </p>
                </div>
                <span className="badge badge-active">Installed</span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, marginTop: 10 }}>
                Parses PDF/DOCX for name, contact, role, experience, education, location, work authorization,
                80+ staffing skills, summary, LinkedIn, and work-history signals — with a confidence score.
                No Gemini, Groq, or OpenAI required. Runs on Azure Free tier.
              </p>
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--text-2)' }}>Formats:</strong> text PDF, DOCX, TXT.
                Image-only/scanned PDFs are not supported yet (use DOCX or paste via Quick Parse).
                <br />
                <strong style={{ color: 'var(--text-2)' }}>Roadmap:</strong> Private self-hosted model for paid “Private AI” SKU.
              </div>
            </div>

            <div className="card" style={{ padding: 20, opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>External AI APIs</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    Not used for resume parse. Core Intelligence is 100% in-app.
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                  Disabled
                </span>
              </div>
            </div>

            {/* Coming Soon integrations */}
            {[
              { name: 'Microsoft Outlook / Exchange', desc: 'Sync calendar and send outreach emails from your business account', icon: '📧', status: 'Coming Soon' },
              { name: 'LinkedIn Recruiter', desc: 'Import candidate profiles directly from LinkedIn search results', icon: '💼', status: 'Coming Soon' },
              { name: 'DocuSign', desc: 'Send offer letters and contractor agreements for digital signature', icon: '✍️', status: 'Coming Soon' },
              { name: 'QuickBooks', desc: 'Sync placement billing and invoicing to your accounting platform', icon: '💰', status: 'Coming Soon' },
            ].map(intg => (
              <div key={intg.name} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {intg.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{intg.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{intg.desc}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid var(--border)', flexShrink: 0 }}>
                    {intg.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── EMAIL SMTP ── */}
        {activeTab === 'email' && (
          <>
            <div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>Email (SMTP)</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                Send real outreach from Candidates. Without SMTP, messages are logged to the timeline only.
              </p>
            </div>

            <div className="card" style={{ padding: 18, border: emailCfg.mode === 'smtp' ? '1px solid rgba(4,120,87,0.25)' : '1px solid var(--border)', background: emailCfg.mode === 'smtp' ? 'var(--success-soft)' : 'var(--surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                Mode: {emailCfg.mode === 'smtp' ? 'SMTP ready — live send' : 'Log only — configure host + from address'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                Env fallbacks also work: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
              </p>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="emailEnabled" checked={emailCfg.enabled} onChange={e => setEmailCfg({ ...emailCfg, enabled: e.target.checked })} />
                  <label htmlFor="emailEnabled" style={{ fontSize: 13, color: 'var(--text-1)' }}>Enable SMTP sending</label>
                </div>
                <div>
                  <label className="label">SMTP HOST</label>
                  <input className="input" placeholder="smtp.office365.com" value={emailCfg.host} onChange={e => setEmailCfg({ ...emailCfg, host: e.target.value })} />
                </div>
                <div>
                  <label className="label">PORT</label>
                  <input className="input" type="number" value={emailCfg.port} onChange={e => setEmailCfg({ ...emailCfg, port: e.target.value })} />
                </div>
                <div>
                  <label className="label">USERNAME</label>
                  <input className="input" placeholder="you@company.com" value={emailCfg.user} onChange={e => setEmailCfg({ ...emailCfg, user: e.target.value })} />
                </div>
                <div>
                  <label className="label">PASSWORD {emailCfg.hasPassword ? '(saved — leave blank to keep)' : ''}</label>
                  <input className="input" type="password" placeholder="••••••••" value={emailCfg.password} onChange={e => setEmailCfg({ ...emailCfg, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">FROM EMAIL</label>
                  <input className="input" placeholder="recruiting@company.com" value={emailCfg.fromEmail} onChange={e => setEmailCfg({ ...emailCfg, fromEmail: e.target.value })} />
                </div>
                <div>
                  <label className="label">FROM NAME</label>
                  <input className="input" value={emailCfg.fromName} onChange={e => setEmailCfg({ ...emailCfg, fromName: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="emailSsl" checked={emailCfg.enableSsl} onChange={e => setEmailCfg({ ...emailCfg, enableSsl: e.target.checked })} />
                  <label htmlFor="emailSsl" style={{ fontSize: 13, color: 'var(--text-1)' }}>Enable SSL/TLS</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" disabled={emailBusy} onClick={saveEmailSettings}>
                  <Save size={14} /> {emailSaved ? 'Saved' : 'Save settings'}
                </button>
                <button type="button" className="btn btn-ghost" disabled={emailBusy} onClick={testEmail}>
                  <Mail size={14} /> Send test to me
                </button>
              </div>
              {emailTestMsg && (
                <p style={{ marginTop: 12, fontSize: 12.5, color: emailTestMsg.startsWith('Sent') ? 'var(--success)' : 'var(--warning)' }}>
                  {emailTestMsg}
                </p>
              )}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Templates</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
                Used in Candidates mass email. Tokens: {'{{FirstName}}'}, {'{{Name}}'}, {'{{Role}}'}, {'{{JobTitle}}'}, {'{{JobCode}}'}, {'{{Location}}'}
              </p>
              {templates.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No templates yet — open Candidates → mass email once to seed defaults, or refresh.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{t.name}</span>
                        {t.isSystem && <span className="badge badge-primary" style={{ fontSize: 10 }}>System</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{t.subject}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                        {(t.body || '').slice(0, 180)}{(t.body || '').length > 180 ? '…' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SECURITY ── */}
        {activeTab === 'security' && (
          <>
            <div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>Security</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Manage passwords, access control, and authentication settings</p>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={17} color="var(--primary-light)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Change Password</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Password must be at least 8 characters</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                <div>
                  <label className="label">CURRENT PASSWORD</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">NEW PASSWORD</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">CONFIRM NEW PASSWORD</label>
                  <input className="input" type="password" placeholder="••••••••" />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '8px 20px' }}>
                  <Lock size={14} /> Update Password
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} color="var(--primary-light)" /> Role-Based Access Control (RBAC)
              </h3>
              {[
                { role: 'Admin', desc: 'Full access to all modules, settings, and client accounts', color: 'var(--primary-light)' },
                { role: 'Recruiter', desc: 'Access to Candidates, Jobs, and Pipeline. No Clients or Settings.', color: 'var(--cyan)' },
              ].map(r => (
                <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: r.color }}>{r.role}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{r.desc}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: user?.role === r.role ? 'var(--emerald)' : 'var(--text-3)' }}>
                    {user?.role === r.role ? '✓ Your Role' : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
