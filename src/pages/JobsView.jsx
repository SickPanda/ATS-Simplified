import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, DollarSign, LayoutList, Power, X, ChevronRight, Briefcase, Users } from 'lucide-react';

const STATUS_TABS = ['All', 'Active', 'Draft', 'Closed'];

export default function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [tab, setTab] = useState('All');
  const [showDrawer, setShowDrawer] = useState(false);
  const [newJob, setNewJob] = useState({ title:'', department:'', location:'', salaryRange:'', description:'', clientId: '', requiredSkillsJson: '' });
  const [saving, setSaving] = useState(false);

  const fetchJobs = () =>
    fetch('/api/ats/jobs').then(r=>r.json()).then(setJobs).catch(console.error);

  const fetchClients = () =>
    fetch('/api/ats/clients').then(r=>r.json()).then(setClients).catch(console.error);

  useEffect(() => { 
    fetchJobs(); 
    fetchClients();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = { ...newJob };
    if (payload.clientId) payload.clientId = parseInt(payload.clientId);
    // Convert comma-separated string to JSON array
    if (payload.requiredSkillsJson) {
      const skillsArr = payload.requiredSkillsJson.split(',').map(s => s.trim()).filter(Boolean);
      payload.requiredSkillsJson = JSON.stringify(skillsArr);
    } else {
      payload.requiredSkillsJson = "[]";
    }

    await fetch('/api/ats/jobs', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setShowDrawer(false);
    setNewJob({ title:'', department:'', location:'', salaryRange:'', description:'', clientId: '', requiredSkillsJson: '' });
    fetchJobs();
  };

  const toggleStatus = async (job) => {
    const next = job.status === 'Active' ? 'Closed' : 'Active';
    await fetch(`/api/ats/jobs/${job.id}/status`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next),
    });
    fetchJobs();
  };

  const filtered = jobs.filter(j => tab === 'All' || j.status === tab);

  const statusBadge = (s) => {
    if (s === 'Active') return <span className="badge badge-active"><span className="dot dot-active" />Active</span>;
    if (s === 'Draft')  return <span className="badge badge-draft"><span className="dot dot-draft" />Draft</span>;
    return <span className="badge badge-closed"><span className="dot dot-closed" />Closed</span>;
  };

  return (
    <div style={{ padding:'28px 28px 40px' }}>
      {/* Header */}
      <div className="anim-fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Jobs
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            {jobs.filter(j=>j.status==='Active').length} active positions open
          </p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowDrawer(true)}>
          <Plus size={15} /> Create Job
        </button>
      </div>

      {/* Tab bar */}
      <div className="anim-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, animationDelay:'0.05s' }}>
        <div className="tab-bar">
          {STATUS_TABS.map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
              {t}
              <span style={{
                marginLeft:6, fontSize:10.5, fontWeight:700,
                background: tab===t?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)',
                padding:'1px 6px', borderRadius:99,
                color: tab===t?'var(--text-1)':'var(--text-4)',
              }}>
                {t==='All'?jobs.length:jobs.filter(j=>j.status===t).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Job Grid */}
      {filtered.length > 0 ? (
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px,1fr))', gap:16 }}>
          {filtered.map(job => {
            let skills = [];
            try { skills = JSON.parse(job.requiredSkillsJson||'[]'); } catch {}
            return (
              <div key={job.id} className="card-lift" style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
                {/* Top */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{
                      width:40, height:40, borderRadius:10,
                      background:'var(--primary-glow)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>
                      <Briefcase size={17} color="var(--primary-light)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize:17, fontWeight:800, color:'var(--text-1)', lineHeight:1.3, letterSpacing:'-0.02em' }}>{job.title}</h3>
                      <p style={{ fontSize:13, fontWeight:500, color:'var(--text-3)', marginTop:2 }}>{job.department}</p>
                    </div>
                  </div>
                  {statusBadge(job.status)}
                </div>

                {/* Description */}
                <p style={{ fontSize:12.5, color:'var(--text-3)', lineHeight:1.6,
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'
                }}>{job.description}</p>

                {/* Skills */}
                {skills.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {skills.map((s,i) => (
                      <span key={i} style={{
                        padding:'3px 8px', borderRadius:99,
                        fontSize:11, fontWeight:600,
                        background:'rgba(255,255,255,0.06)',
                        color:'var(--text-1)',
                        border:'1px solid rgba(255,255,255,0.05)',
                      }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div style={{ display:'flex', gap:18, fontSize:13, fontWeight:500, color:'var(--text-3)', marginTop:'auto' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <MapPin size={14} color="var(--primary-light)" />{job.location}
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <DollarSign size={14} color="var(--emerald)" />{job.salaryRange}
                  </span>
                </div>

                {/* Footer */}
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <button
                    onClick={()=>toggleStatus(job)}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      fontSize:12, fontWeight:500, cursor:'pointer',
                      border:'none', background:'transparent',
                      color: job.status==='Active'?'var(--text-3)':'var(--text-4)',
                      fontFamily:'inherit', padding:0, transition:'color var(--t-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = job.status==='Active'?'var(--rose)':'var(--emerald)'}
                    onMouseLeave={e => e.currentTarget.style.color = job.status==='Active'?'var(--text-3)':'var(--text-4)'}
                  >
                    <Power size={13} />
                    {job.status === 'Active' ? 'Close Job' : 'Reopen'}
                  </button>
                  <Link
                    to={`/jobs/${job.id}/pipeline`}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      fontSize:13, fontWeight:600, color:'var(--primary-light)',
                      textDecoration:'none', transition:'color var(--t-fast)',
                    }}
                  >
                    <Users size={13} /> Pipeline <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state anim-fade-up" style={{ padding:'80px 40px' }}>
          <Briefcase size={40} />
          <p style={{ fontSize:16, fontWeight:600, color:'var(--text-2)' }}>No jobs here</p>
          <p style={{ fontSize:13 }}>
            {tab !== 'All' ? `No ${tab.toLowerCase()} jobs found.` : 'Create your first job posting to get started.'}
          </p>
          {tab === 'All' && (
            <button className="btn btn-primary" onClick={()=>setShowDrawer(true)} style={{ marginTop:8 }}>
              <Plus size={14} /> Create Job
            </button>
          )}
        </div>
      )}

      {/* Create Job Drawer */}
      {showDrawer && (
        <>
          <div className="overlay" onClick={()=>setShowDrawer(false)} />
          <div className="drawer">
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--text-1)' }}>
                  Create New Job
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Fill in the details to post a new position</p>
              </div>
              <button className="btn-icon" onClick={()=>setShowDrawer(false)}><X size={17} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  JOB TITLE *
                </label>
                <input
                  className="input"
                  placeholder="e.g. Senior Frontend Engineer"
                  required
                  value={newJob.title}
                  onChange={e=>setNewJob({...newJob, title:e.target.value})}
                />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    DEPARTMENT *
                  </label>
                  <input
                    className="input"
                    placeholder="Engineering"
                    required
                    value={newJob.department}
                    onChange={e=>setNewJob({...newJob, department:e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    LOCATION *
                  </label>
                  <input
                    className="input"
                    placeholder="Remote / City, State"
                    required
                    value={newJob.location}
                    onChange={e=>setNewJob({...newJob, location:e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    SALARY RANGE
                  </label>
                  <input
                    className="input"
                    placeholder="$100k – $130k"
                    value={newJob.salaryRange}
                    onChange={e=>setNewJob({...newJob, salaryRange:e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    CLIENT
                  </label>
                  <select
                    className="input"
                    value={newJob.clientId}
                    onChange={e=>setNewJob({...newJob, clientId:e.target.value})}
                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-1)' }}
                  >
                    <option value="">-- Internal / None --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  REQUIRED SKILLS (COMMA SEPARATED)
                </label>
                <input
                  className="input"
                  placeholder="React, C#, SQL, Kubernetes"
                  value={newJob.requiredSkillsJson}
                  onChange={e=>setNewJob({...newJob, requiredSkillsJson:e.target.value})}
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  DESCRIPTION *
                </label>
                <textarea
                  className="input"
                  placeholder="What does this role entail? What are you looking for?"
                  required
                  rows={5}
                  style={{ resize:'vertical', lineHeight:1.6 }}
                  value={newJob.description}
                  onChange={e=>setNewJob({...newJob, description:e.target.value})}
                />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto', paddingTop:8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowDrawer(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
