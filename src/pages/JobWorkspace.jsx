import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, MapPin, DollarSign, Briefcase, Power, CheckCircle, X, Users, AlignLeft } from 'lucide-react';
import KanbanView from './KanbanView';

export default function JobWorkspace() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [clients, setClients] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Pipeline'
  
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/ats/jobs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        setEditForm({
          ...data,
          requiredSkillsJson: (() => {
            try { return JSON.parse(data.requiredSkillsJson || '[]').join(', '); } catch { return ''; }
          })()
        });
      }
    } catch(e) { console.error(e); }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/ats/clients');
      if (res.ok) setClients(await res.json());
    } catch(e) { console.error(e); }
  };

  const fetchApps = async () => {
    try {
      const res = await fetch(`/api/ats/jobs/${id}/applications`);
      if (res.ok) setApplications(await res.json());
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    fetchJob();
    fetchClients();
    fetchApps();
  }, [id]);

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...editForm };
    if (payload.clientId) payload.clientId = parseInt(payload.clientId);
    if (payload.requiredSkillsJson) {
      const skillsArr = payload.requiredSkillsJson.split(',').map(s => s.trim()).filter(Boolean);
      payload.requiredSkillsJson = JSON.stringify(skillsArr);
    } else {
      payload.requiredSkillsJson = "[]";
    }

    try {
      await fetch(`/api/ats/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await fetchJob();
      setShowEditDrawer(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const toggleStatus = async () => {
    const next = job.status === 'Active' ? 'Closed' : 'Active';
    await fetch(`/api/ats/jobs/${job.id}/status`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next),
    });
    fetchJob();
  };

  if (!job) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Loading job...</div>;

  const clientName = clients.find(c => c.id === job.clientId)?.name || 'Internal';
  
  let skills = [];
  try { skills = JSON.parse(job.requiredSkillsJson || '[]'); } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Workspace Header */}
      <div style={{ padding: '24px 32px 0', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/jobs" className="btn-icon" style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {job.title}
                </h1>
                {job.status === 'Active' ? (
                  <span className="badge badge-active" style={{ fontSize: 11 }}><span className="dot dot-active" />Active</span>
                ) : (
                  <span className="badge badge-closed" style={{ fontSize: 11 }}><span className="dot dot-closed" />Closed</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} color="var(--primary-light)" /> {job.department}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="var(--cyan)" /> {job.location}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} color="var(--emerald)" /> {job.salaryRange || 'Not specified'}</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={toggleStatus}>
              <Power size={14} color={job.status==='Active' ? 'var(--rose)' : 'var(--emerald)'} /> 
              <span style={{ color: job.status==='Active' ? 'var(--rose)' : 'var(--emerald)' }}>
                {job.status === 'Active' ? 'Close Job' : 'Reopen Job'}
              </span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowEditDrawer(true)}>
              <Edit size={14} /> Edit Job
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid transparent' }}>
          <button 
            onClick={() => setActiveTab('Overview')}
            style={{
              padding: '0 0 12px 0', border: 'none', background: 'transparent',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'Overview' ? 'var(--primary-light)' : 'var(--text-3)',
              borderBottom: `2px solid ${activeTab === 'Overview' ? 'var(--primary-light)' : 'transparent'}`,
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <AlignLeft size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('Pipeline')}
            style={{
              padding: '0 0 12px 0', border: 'none', background: 'transparent',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'Pipeline' ? 'var(--primary-light)' : 'var(--text-3)',
              borderBottom: `2px solid ${activeTab === 'Pipeline' ? 'var(--primary-light)' : 'transparent'}`,
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Users size={16} /> Pipeline
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'Overview' && (
          <div className="anim-fade-up" style={{ padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(109,92,255,0.1) 0%, rgba(109,92,255,0.02) 100%)', border: '1px solid rgba(109,92,255,0.2)' }}>
                <div className="kpi-icon" style={{ background: 'var(--primary-glow)' }}><Users size={18} color="var(--primary-light)" /></div>
                <div className="kpi-val">{applications.length}</div>
                <div className="kpi-label">Total Applicants</div>
              </div>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><CheckCircle size={18} color="#f59e0b" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Interview').length}</div>
                <div className="kpi-label">In Interview</div>
              </div>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.02) 100%)', border: '1px solid rgba(34,211,238,0.2)' }}>
                <div className="kpi-icon" style={{ background: 'rgba(34,211,238,0.15)' }}><DollarSign size={18} color="var(--cyan)" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Offer').length}</div>
                <div className="kpi-label">Offers Extended</div>
              </div>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><Briefcase size={18} color="var(--emerald)" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Hired').length}</div>
                <div className="kpi-label">Hired Candidates</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
              
              {/* Left Column: Description */}
              <div className="card" style={{ padding: '32px 40px', background: 'linear-gradient(to bottom, var(--surface), rgba(15, 17, 26, 0.4))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <AlignLeft size={18} color="var(--primary-light)" />
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '0.1em' }}>JOB DESCRIPTION</h3>
                </div>
                <div style={{ 
                  fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', 
                  fontFamily: "'Inter', sans-serif" 
                }}>
                  {job.description}
                </div>
              </div>

              {/* Right Column: Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="card-lift" style={{ padding: 24, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', letterSpacing: '0.08em', marginBottom: 16 }}>CLIENT / HIRING MANAGER</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 12, 
                      background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
                      boxShadow: '0 4px 12px var(--primary-glow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Briefcase size={22} color="#fff" />
                    </div>
                    <div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{clientName}</span>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Primary Contact</div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', letterSpacing: '0.08em', marginBottom: 16 }}>REQUIRED SKILLS</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {skills.length > 0 ? skills.map((s, i) => (
                      <span key={i} style={{ 
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, 
                        background: 'rgba(109,92,255,0.08)', color: 'var(--primary-light)', 
                        border: '1px solid rgba(109,92,255,0.2)' 
                      }}>
                        {s}
                      </span>
                    )) : <span style={{ fontSize: 13, color: 'var(--text-4)' }}>No skills specified</span>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'Pipeline' && (
          <div className="anim-fade-up" style={{ flex: 1, padding: 0 }}>
            <KanbanView isEmbedded={true} />
          </div>
        )}
      </div>

      {/* Edit Job Drawer */}
      {showEditDrawer && editForm && (
        <>
          <div className="overlay" onClick={()=>setShowEditDrawer(false)} />
          <div className="drawer" style={{ width: 500 }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--text-1)' }}>
                  Edit Job
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Update the details for {job.title}</p>
              </div>
              <button className="btn-icon" onClick={()=>setShowEditDrawer(false)}><X size={17} /></button>
            </div>

            <form onSubmit={handleUpdateJob} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:18, overflowY: 'auto' }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>JOB TITLE *</label>
                <input className="input" required value={editForm.title} onChange={e=>setEditForm({...editForm, title:e.target.value})} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>DEPARTMENT *</label>
                  <input className="input" required value={editForm.department} onChange={e=>setEditForm({...editForm, department:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>LOCATION *</label>
                  <input className="input" required value={editForm.location} onChange={e=>setEditForm({...editForm, location:e.target.value})} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>SALARY RANGE</label>
                  <input className="input" value={editForm.salaryRange} onChange={e=>setEditForm({...editForm, salaryRange:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>CLIENT</label>
                  <select className="input" value={editForm.clientId || ''} onChange={e=>setEditForm({...editForm, clientId:e.target.value})} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <option value="">-- Internal / None --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>REQUIRED SKILLS (COMMA SEPARATED)</label>
                <input className="input" value={editForm.requiredSkillsJson} onChange={e=>setEditForm({...editForm, requiredSkillsJson:e.target.value})} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>DESCRIPTION *</label>
                <textarea className="input" required rows={8} style={{ resize:'vertical', lineHeight:1.6 }} value={editForm.description} onChange={e=>setEditForm({...editForm, description:e.target.value})} />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto', paddingTop:16 }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowEditDrawer(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
