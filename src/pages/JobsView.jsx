import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, MapPin, DollarSign, LayoutList, LayoutGrid, 
  Power, X, ChevronRight, Briefcase, Users, MoreVertical, 
  Copy, Edit, Trash, Share2, CheckCircle, BarChart3, Clock
} from 'lucide-react';

const STATUS_TABS = ['All', 'Active', 'Draft', 'Closed'];

const FUNNEL_STAGES = [
  { id: 'Applied', color: '#22d3ee' },
  { id: 'Screened', color: '#a78bfa' },
  { id: 'Interview', color: '#f59e0b' },
  { id: 'Offer', color: '#6d5cff' },
  { id: 'Hired', color: '#10b981' }
];

export default function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [allApps, setAllApps] = useState([]);
  
  const [tab, setTab] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showDrawer, setShowDrawer] = useState(false);
  const [newJob, setNewJob] = useState({ title:'', department:'', location:'', salaryRange:'', description:'', clientId: '', requiredSkillsJson: '' });
  const [saving, setSaving] = useState(false);
  
  const [actionMenuOpen, setActionMenuOpen] = useState(null); // jobId
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [jRes, cRes, aRes] = await Promise.all([
        fetch('/api/ats/jobs'),
        fetch('/api/ats/clients'),
        fetch('/api/ats/applications')
      ]);
      setJobs(await jRes.json());
      setClients(await cRes.json());
      setAllApps(await aRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...newJob };
    if (payload.clientId) payload.clientId = parseInt(payload.clientId);
    if (payload.requiredSkillsJson) {
      const skillsArr = payload.requiredSkillsJson.split(',').map(s => s.trim()).filter(Boolean);
      payload.requiredSkillsJson = JSON.stringify(skillsArr);
    } else {
      payload.requiredSkillsJson = "[]";
    }
    await fetch('/api/ats/jobs', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload),
    });
    setSaving(false);
    setShowDrawer(false);
    setNewJob({ title:'', department:'', location:'', salaryRange:'', description:'', clientId: '', requiredSkillsJson: '' });
    fetchData();
  };

  const toggleStatus = async (job) => {
    const next = job.status === 'Active' ? 'Closed' : 'Active';
    await fetch(`/api/ats/jobs/${job.id}/status`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(next),
    });
    fetchData();
    setActionMenuOpen(null);
  };

  const filteredJobs = jobs.filter(j => tab === 'All' || j.status === tab);
  
  // KPI Calculations
  const activeJobsCount = jobs.filter(j => j.status === 'Active').length;
  const activePipelineCount = allApps.filter(a => a.stage !== 'Rejected' && a.stage !== 'Hired').length;
  const totalHired = allApps.filter(a => a.stage === 'Hired').length;
  
  // Renders the mini funnel for a specific job
  const PipelineFunnel = ({ jobId }) => {
    const jobApps = allApps.filter(a => a.jobId === jobId && a.stage !== 'Rejected');
    const total = jobApps.length || 1; // prevent div by zero
    
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>
          <span>PIPELINE</span>
          <span>{jobApps.length} Candidates</span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: 1 }}>
          {FUNNEL_STAGES.map(stage => {
            const count = jobApps.filter(a => a.stage === stage.id).length;
            const percent = (count / total) * 100;
            return (
              <div 
                key={stage.id} 
                title={`${stage.id}: ${count}`}
                style={{ 
                  width: `${percent}%`, 
                  background: count > 0 ? stage.color : 'transparent',
                  transition: 'width 0.3s ease'
                }} 
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {FUNNEL_STAGES.map(stage => {
            const count = jobApps.filter(a => a.stage === stage.id).length;
            if (count === 0) return null;
            return (
              <span key={stage.id} style={{ fontSize: 10, fontWeight: 700, color: stage.color }}>
                {count} {stage.id.substring(0,3).toUpperCase()}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const statusBadge = (s) => {
    if (s === 'Active') return <span className="badge badge-active" style={{ fontSize: 11 }}><span className="dot dot-active" />Active</span>;
    if (s === 'Draft')  return <span className="badge badge-draft" style={{ fontSize: 11 }}><span className="dot dot-draft" />Draft</span>;
    return <span className="badge badge-closed" style={{ fontSize: 11 }}><span className="dot dot-closed" />Closed</span>;
  };

  return (
    <div style={{ padding:'28px 28px 60px', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* Header */}
      <div className="anim-fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:26, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Job Command Center
          </h2>
          <p style={{ fontSize:13.5, color:'var(--text-3)', marginTop:4 }}>
            Manage requisitions, monitor pipelines, and track placements.
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={()=>setShowDrawer(true)}>
          <Plus size={15} /> Create Job
        </button>
      </div>

      {/* KPI Row */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32, animationDelay: '0.05s' }}>
        <div className="card-lift" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>ACTIVE JOBS</span>
            <Briefcase size={16} color="var(--primary-light)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)' }}>{activeJobsCount}</div>
        </div>
        
        <div className="card-lift" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>IN PIPELINE</span>
            <Users size={16} color="var(--cyan)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)' }}>{activePipelineCount}</div>
        </div>

        <div className="card-lift" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>AVG TIME TO HIRE</span>
            <Clock size={16} color="var(--amber)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)' }}>18 <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>days</span></div>
        </div>

        <div className="card-lift" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>TOTAL PLACEMENTS</span>
            <CheckCircle size={16} color="var(--emerald)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)' }}>{totalHired}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="anim-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, animationDelay:'0.1s' }}>
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

        <div style={{ display: 'flex', background: 'var(--surface-light)', borderRadius: 8, padding: 4 }}>
          <button 
            className={`btn-icon ${viewMode === 'grid' ? 'active-view' : ''}`} 
            onClick={() => setViewMode('grid')}
            style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-3)' }}
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            className={`btn-icon ${viewMode === 'list' ? 'active-view' : ''}`} 
            onClick={() => setViewMode('list')}
            style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--text-3)' }}
          >
            <LayoutList size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredJobs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px,1fr))', gap:20 }}>
            {filteredJobs.map(job => {
              let skills = [];
              try { skills = JSON.parse(job.requiredSkillsJson||'[]'); } catch {}
              return (
                <div key={job.id} className="card-lift" style={{ display:'flex', flexDirection:'column' }}>
                  <div style={{ padding: '22px 22px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg, rgba(109,92,255,0.15) 0%, rgba(34,211,238,0.1) 100%)', display:'flex', alignItems:'center', justifyContent:'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <Briefcase size={18} color="var(--primary-light)" />
                        </div>
                        <div>
                          <h3 style={{ fontSize:17, fontWeight:800, color:'var(--text-1)', lineHeight:1.3, letterSpacing:'-0.02em' }}>
                            <Link to={`/jobs/${job.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-underline">{job.title}</Link>
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text-3)' }}>{job.department}</span>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-4)' }} />
                            <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={12} /> {job.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button className="btn-icon" onClick={() => setActionMenuOpen(actionMenuOpen === job.id ? null : job.id)}>
                          <MoreVertical size={16} />
                        </button>
                        {actionMenuOpen === job.id && (
                          <div className="dropdown-menu" style={{ position: 'absolute', top: 30, right: 0, zIndex: 10, width: 160, background: 'var(--surface-light)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                            <div className="dropdown-item" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => { navigate(`/jobs/${job.id}`); setActionMenuOpen(null); }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <BarChart3 size={14} /> View Pipeline
                            </div>
                            <div className="dropdown-item" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => { 
                              navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
                              setActionMenuOpen(null);
                            }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <Share2 size={14} /> Copy Link
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div className="dropdown-item" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }} onClick={() => toggleStatus(job)} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <Power size={14} color={job.status==='Active' ? 'var(--rose)' : 'var(--emerald)'} /> 
                              <span style={{ color: job.status==='Active' ? 'var(--rose)' : 'var(--emerald)' }}>
                                {job.status === 'Active' ? 'Close Job' : 'Reopen Job'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <PipelineFunnel jobId={job.id} />
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px 22px', borderTop: '1px solid var(--border)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {skills.slice(0, 3).map((s,i) => (
                        <span key={i} style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.06)', color:'var(--text-2)' }}>{s}</span>
                      ))}
                      {skills.length > 3 && <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.03)', color:'var(--text-4)' }}>+{skills.length - 3}</span>}
                    </div>
                    {statusBadge(job.status)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>JOB TITLE</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>DEPARTMENT</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>STATUS</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em' }}>PIPELINE</th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const jobApps = allApps.filter(a => a.jobId === job.id && a.stage !== 'Rejected');
                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                          <Link to={`/jobs/${job.id}/pipeline`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-underline">{job.title}</Link>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> {job.location}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{job.department}</td>
                      <td style={{ padding: '16px 20px' }}>{statusBadge(job.status)}</td>
                      <td style={{ padding: '16px 20px', width: '30%' }}>
                        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: 1 }}>
                          {FUNNEL_STAGES.map(stage => {
                            const count = jobApps.filter(a => a.stage === stage.id).length;
                            const percent = (count / (jobApps.length || 1)) * 100;
                            return <div key={stage.id} style={{ width: `${percent}%`, background: count > 0 ? stage.color : 'transparent' }} />;
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{jobApps.length} Total</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                         <Link to={`/jobs/${job.id}`} className="btn-icon">
                           <ChevronRight size={16} />
                         </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="card empty-state anim-fade-up" style={{ padding:'80px 40px' }}>
          <Briefcase size={48} color="var(--primary-light)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>No jobs here</p>
          <p style={{ fontSize:14, color: 'var(--text-3)', marginTop: 4 }}>
            {tab !== 'All' ? `No ${tab.toLowerCase()} jobs found.` : 'Create your first job posting to get started.'}
          </p>
          {tab === 'All' && (
            <button className="btn btn-primary" onClick={()=>setShowDrawer(true)} style={{ marginTop:24, padding: '10px 24px' }}>
              <Plus size={16} /> Create Job
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

            <form onSubmit={handleCreate} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:18, overflowY: 'auto' }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  JOB TITLE *
                </label>
                <input className="input" placeholder="e.g. Senior Frontend Engineer" required value={newJob.title} onChange={e=>setNewJob({...newJob, title:e.target.value})} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>DEPARTMENT *</label>
                  <input className="input" placeholder="Engineering" required value={newJob.department} onChange={e=>setNewJob({...newJob, department:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>LOCATION *</label>
                  <input className="input" placeholder="Remote / City, State" required value={newJob.location} onChange={e=>setNewJob({...newJob, location:e.target.value})} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>SALARY RANGE</label>
                  <input className="input" placeholder="$100k – $130k" value={newJob.salaryRange} onChange={e=>setNewJob({...newJob, salaryRange:e.target.value})} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>CLIENT</label>
                  <select className="input" value={newJob.clientId} onChange={e=>setNewJob({...newJob, clientId:e.target.value})} style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <option value="">-- Internal / None --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>REQUIRED SKILLS (COMMA SEPARATED)</label>
                <input className="input" placeholder="React, C#, SQL, Kubernetes" value={newJob.requiredSkillsJson} onChange={e=>setNewJob({...newJob, requiredSkillsJson:e.target.value})} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>DESCRIPTION *</label>
                <textarea className="input" placeholder="What does this role entail?" required rows={5} style={{ resize:'vertical', lineHeight:1.6 }} value={newJob.description} onChange={e=>setNewJob({...newJob, description:e.target.value})} />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto', paddingTop:8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowDrawer(false)}>Cancel</button>
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
