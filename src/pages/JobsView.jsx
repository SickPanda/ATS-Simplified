import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, MapPin, DollarSign, LayoutList, LayoutGrid, 
  Power, X, ChevronRight, Briefcase, Users, MoreVertical, 
  Copy, Edit, Trash, Share2, CheckCircle, BarChart3, Clock,
  ChevronDown, ChevronUp, Landmark, ShieldCheck, UserCheck, ArrowRight
} from 'lucide-react';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RateFields, { RateBadge } from '../components/RateFields';
import { downloadCsvExport } from '../lib/export';
import { isMine } from '../lib/ownership';
import { STAGES as PIPELINE_STAGES } from '../lib/stages';

function ownerLabel(user) {
  if (!user) return '';
  const raw = user.name || user.email?.split('@')[0] || '';
  const parts = raw.split(/[._\s-]+/).filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || raw;
}

const STATUS_TABS = ['All', 'Active', 'Draft', 'Closed'];

const FUNNEL_STAGES = PIPELINE_STAGES
  .filter(s => s.id !== 'Rejected')
  .map(s => ({ id: s.id, color: s.colorHex }));

export default function JobsView() {
  const { user } = useAuth();
  const me = ownerLabel(user);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [submittals, setSubmittals] = useState([]);
  
  const [tab, setTab] = useState('All');
  const [deskMode, setDeskMode] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [showDrawer, setShowDrawer] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null); // Collapsible row ID
  
  // New Job form — owners default to logged-in user
  const emptyJob = () => ({ 
    title:'', department:'', location:'', salaryRange:'', description:'', clientId: '', 
    requiredSkillsJson: '', jobCode: '', clientJobId: '', billRate: '', payRate: '', rateUnit: 'Hourly',
    recruitmentManager: me, primaryRecruiter: me
  });
  const [newJob, setNewJob] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [jRes, cRes, aRes, sRes] = await Promise.all([
        fetch('/api/ats/jobs'),
        fetch('/api/ats/clients'),
        fetch('/api/ats/applications'),
        fetch('/api/ats/submittals') // Assuming this endpoint is available or falls back
      ]);
      setJobs(await jRes.json());
      setClients(await cRes.json());
      setAllApps(await aRes.json());
      
      // Fallback submittals seeding if fetch fails
      try {
        setSubmittals(await sRes.json());
      } catch {
        setSubmittals([]);
      }
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
    const payload = { 
      ...newJob,
      billRate: parseFloat(newJob.billRate || '0'),
      payRate: parseFloat(newJob.payRate || '0'),
      rateUnit: newJob.rateUnit || 'Hourly',
    };
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
    setNewJob(emptyJob());
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

  const filteredJobs = jobs.filter(j => {
    const statusOk = tab === 'All' || j.status === tab;
    const deskOk = deskMode !== 'mine' || isMine(j.primaryRecruiter, user);
    return statusOk && deskOk;
  });
  
  // KPI Calculations
  const activeJobsCount = jobs.filter(j => j.status === 'Active').length;
  const activePipelineCount = allApps.filter(a => a.stage !== 'Rejected' && a.stage !== 'Hired').length;
  const totalHired = allApps.filter(a => a.stage === 'Hired').length;
  
  // Funnel component
  const PipelineFunnel = ({ jobId }) => {
    const jobApps = allApps.filter(a => a.jobId === jobId && a.stage !== 'Rejected');
    const total = jobApps.length || 1;
    
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', gap: 1 }}>
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
      </div>
    );
  };

  const statusBadge = (s) => {
    if (s === 'Active') return <span className="badge badge-active"><span className="dot dot-active" />Active</span>;
    if (s === 'Draft')  return <span className="badge badge-draft"><span className="dot dot-draft" />Draft</span>;
    return <span className="badge badge-closed"><span className="dot dot-closed" />Closed</span>;
  };

  return (
    <div style={{ padding:'28px 28px 60px', maxWidth: 1600, margin: '0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      
      {/* Header */}
      <div className="anim-fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Requirements Command Center
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Manage client job orders, evaluate submissions, and track billing margins
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" title="Export CSV" onClick={() => downloadCsvExport('jobs').catch(e => alert(e.message))}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={()=>setShowDrawer(true)}>
            <Plus size={15} /> Post Requirement
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animationDelay: '0.05s' }}>
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon" style={{ background: 'var(--primary-glow)' }}><Briefcase size={18} color="var(--primary-light)" /></div>
          <div className="kpi-val">{activeJobsCount}</div>
          <div className="kpi-label">Active Requirements</div>
        </div>
        <div className="kpi-card kpi-muted">
          <div className="kpi-icon" style={{ background: 'var(--surface-3)' }}><Users size={18} color="var(--text-2)" /></div>
          <div className="kpi-val">{activePipelineCount}</div>
          <div className="kpi-label">Candidates in Pipeline</div>
        </div>
        <div className="kpi-card kpi-warning">
          <div className="kpi-icon" style={{ background: 'var(--warning-soft)' }}><Clock size={18} color="var(--warning)" /></div>
          <div className="kpi-val">14 <span style={{ fontSize: 13, color: 'var(--text-3)' }}>days</span></div>
          <div className="kpi-label">Average Time-to-Fill</div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-icon" style={{ background: 'var(--success-soft)' }}><CheckCircle size={18} color="var(--success)" /></div>
          <div className="kpi-val">{totalHired}</div>
          <div className="kpi-label">Client Placements</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="anim-fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', animationDelay:'0.1s' }}>
        <div className="tab-bar">
          <div className="tab-bar" style={{ marginRight: 8 }}>
            <button type="button" className={`tab${deskMode==='all'?' active':''}`} onClick={() => setDeskMode('all')}>All desk</button>
            <button type="button" className={`tab${deskMode==='mine'?' active':''}`} onClick={() => setDeskMode('mine')}>My desk</button>
          </div>
          {STATUS_TABS.map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
              {t}
              <span style={{
                marginLeft:6, fontSize:10, fontWeight:700,
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

      {/* Content grid/list */}
      {filteredJobs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px,1fr))', gap:20 }}>
            {filteredJobs.map(job => {
              let skills = [];
              try { skills = JSON.parse(job.requiredSkillsJson||'[]'); } catch {}
              const client = clients.find(c => c.id === job.clientId);
              return (
                <div key={job.id} className="card-lift" style={{ display:'flex', flexDirection:'column' }}>
                  <div style={{ padding: '22px 22px 16px', flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ width:42, height:42, borderRadius:10, background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Briefcase size={18} color="var(--primary-light)" />
                        </div>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.03em' }}>
                            {job.jobCode || `REQ-${job.id}`} {job.clientJobId && `· ${job.clientJobId}`}
                          </div>
                          <h3 style={{ fontSize:15.5, fontWeight:800, color:'var(--text-1)', lineHeight:1.3, marginTop:3 }}>
                            <Link to={`/jobs/${job.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-underline">{job.title}</Link>
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize:12, color:'var(--text-2)', fontWeight:600 }}>{client?.name || 'Internal'}</span>
                            <span style={{ fontSize:12, color:'var(--text-4)' }}>•</span>
                            <span style={{ fontSize:12, color:'var(--text-3)' }}>{job.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Menu */}
                      <div style={{ position: 'relative' }}>
                        <button className="btn-icon" onClick={() => setActionMenuOpen(actionMenuOpen === job.id ? null : job.id)}>
                          <MoreVertical size={15} />
                        </button>
                        {actionMenuOpen === job.id && (
                          <div className="dropdown-menu" style={{ position: 'absolute', top: 30, right: 0, zIndex: 10, width: 160, background: 'var(--surface-light)', border: '1px solid var(--border)', borderRadius: 10, overflow:'hidden' }}>
                            <div className="dropdown-item" style={{ padding:'10px 14px', fontSize:12.5, color:'var(--text-2)', cursor:'pointer' }} onClick={() => { navigate(`/jobs/${job.id}`); setActionMenuOpen(null); }}>
                              View Pipeline
                            </div>
                            <div className="dropdown-item" style={{ padding:'10px 14px', fontSize:12.5, color:'var(--text-2)', cursor:'pointer' }} onClick={() => toggleStatus(job)}>
                              {job.status === 'Active' ? 'Close Requirement' : 'Reopen Requirement'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop:14, fontSize:12, color:'var(--text-2)' }}>
                      <RateBadge billRate={job.billRate} payRate={job.payRate} rateUnit={job.rateUnit} />
                    </div>

                    <PipelineFunnel jobId={job.id} />
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 20px', borderTop: '1px solid var(--border)', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {skills.slice(0, 3).map((s,i) => (
                        <span key={i} style={{ padding:'2px 7px', borderRadius:4, fontSize:10.5, fontWeight:600, background:'rgba(255,255,255,0.05)', color:'var(--text-2)' }}>{s}</span>
                      ))}
                    </div>
                    {statusBadge(job.status)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List Mode (Ceipal Table style with collapsible submittals) */
          <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize:13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', width:40 }}></th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>JOB CODE / TITLE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CLIENT ACCOUNT</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>LOCATION</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>BILL/PAY (MARGIN)</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>RECRUITERS</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>PIPELINE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600, width: 80 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.flatMap(job => {
                    const client = clients.find(c => c.id === job.clientId);
                    const isExpanded = expandedJobId === job.id;
                    const jobApps = allApps.filter(a => a.jobId === job.id);
                    
                    return [
                      <tr key={`row-${job.id}`} className="trow" style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <button 
                            className="btn-icon" 
                            style={{ width:24, height:24 }}
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)' }}>
                            {job.jobCode || `REQ-${job.id}`} {job.clientJobId && `· ${job.clientJobId}`}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>
                            <Link to={`/jobs/${job.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-underline">{job.title}</Link>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-2)' }}>
                          {client?.name || 'Internal / Direct'}
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>{job.location}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <RateBadge billRate={job.billRate} payRate={job.payRate} rateUnit={job.rateUnit} />
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize:12, color:'var(--text-2)' }}>Lead: {job.recruitmentManager}</div>
                          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Assigned: {job.primaryRecruiter}</div>
                        </td>
                        <td style={{ padding: '12px 20px', width: 140 }}>
                          <PipelineFunnel jobId={job.id} />
                          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4, fontWeight:600 }}>{jobApps.length} Candidates</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>{statusBadge(job.status)}</td>
                      </tr>,
                      /* Collapsible submittals row */
                      isExpanded && (
                        <tr key={`details-${job.id}`} style={{ background: 'rgba(0,0,0,0.1)' }}>
                          <td colSpan={8} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <h4 style={{ fontSize:12.5, fontWeight:700, color:'var(--text-2)', display:'flex', alignItems:'center', gap:6 }}>
                                  <Users size={14} color="var(--primary)" /> APPLICANT SUBMITTALS PIPELINE
                                </h4>
                                <Link to={`/jobs/${job.id}`} style={{ fontSize:12, color:'var(--primary-light)', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                                  Go to requirement workspace <ArrowRight size={13} />
                                </Link>
                              </div>
                              
                              {jobApps.length === 0 ? (
                                <div style={{ padding:14, borderRadius:8, background:'rgba(255,255,255,0.01)', border:'1px dashed var(--border)', fontSize:12.5, color:'var(--text-3)', textAlign:'center' }}>
                                  No candidates assigned to this requirement yet. Navigate to Candidate Command Center to search and match applicants.
                                </div>
                              ) : (
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
                                  {jobApps.map(app => (
                                    <div key={app.id} style={{ padding:12, borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                      <div>
                                        <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{app.candidateName || `Candidate #${app.candidateId}`}</div>
                                        <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:2 }}>Score Match: <strong style={{ color:'var(--primary-light)' }}>{app.matchScore}%</strong></div>
                                      </div>
                                      <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'var(--primary-glow)', color:'var(--primary)' }}>
                                        {app.stage}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="card empty-state anim-fade-up" style={{ padding:'80px 40px' }}>
          <Briefcase size={48} color="var(--primary-light)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>No requirements found</p>
          <p style={{ fontSize:14, color: 'var(--text-3)', marginTop: 4 }}>
            {tab !== 'All' ? `No ${tab.toLowerCase()} requirements found.` : 'Create your first client requirement to get started.'}
          </p>
          {tab === 'All' && (
            <button className="btn btn-primary" onClick={()=>setShowDrawer(true)} style={{ marginTop:24, padding: '10px 24px' }}>
              <Plus size={16} /> Post Requirement
            </button>
          )}
        </div>
      )}

      {/* Create Job Drawer */}
      {showDrawer && (
        <>
          <div className="overlay" onClick={()=>setShowDrawer(false)} />
          <div className="drawer" style={{ width:500 }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--text-1)' }}>
                  New Requirement
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Fill details to initialize job order</p>
              </div>
              <button className="btn-icon" onClick={()=>setShowDrawer(false)}><X size={17} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:18, overflowY: 'auto' }}>
              <div>
                <label className="label">JOB TITLE *</label>
                <input className="input" placeholder="e.g. Senior Frontend Engineer" required value={newJob.title} onChange={e=>setNewJob({...newJob, title:e.target.value})} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label className="label">JOB CODE *</label>
                  <input className="input" placeholder="REQ-101" required value={newJob.jobCode} onChange={e=>setNewJob({...newJob, jobCode:e.target.value})} />
                </div>
                <div>
                  <label className="label">CLIENT JOB ID</label>
                  <input className="input" placeholder="CJ-0012" value={newJob.clientJobId} onChange={e=>setNewJob({...newJob, clientJobId:e.target.value})} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label className="label">DEPARTMENT *</label>
                  <input className="input" placeholder="Engineering" required value={newJob.department} onChange={e=>setNewJob({...newJob, department:e.target.value})} />
                </div>
                <div>
                  <label className="label">LOCATION *</label>
                  <input className="input" placeholder="Remote / City, State" required value={newJob.location} onChange={e=>setNewJob({...newJob, location:e.target.value})} />
                </div>
              </div>

              <RateFields
                billRate={newJob.billRate}
                payRate={newJob.payRate}
                rateUnit={newJob.rateUnit || 'Hourly'}
                required
                onChange={({ billRate, payRate, rateUnit }) => setNewJob({ ...newJob, billRate, payRate, rateUnit })}
              />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label className="label">DISPLAY RANGE (OPTIONAL)</label>
                  <input className="input" placeholder="e.g. $120–$150/hr or $180k–$200k" value={newJob.salaryRange} onChange={e=>setNewJob({...newJob, salaryRange:e.target.value})} />
                </div>
                <div>
                  <label className="label">CLIENT ACCOUNT *</label>
                  <select className="input" required value={newJob.clientId} onChange={e=>setNewJob({...newJob, clientId:e.target.value})} style={{ background: 'var(--surface-2)' }}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label className="label">RECRUITMENT MANAGER</label>
                  <input className="input" value={newJob.recruitmentManager} onChange={e=>setNewJob({...newJob, recruitmentManager:e.target.value})} />
                </div>
                <div>
                  <label className="label">PRIMARY RECRUITER</label>
                  <input className="input" value={newJob.primaryRecruiter} onChange={e=>setNewJob({...newJob, primaryRecruiter:e.target.value})} />
                </div>
              </div>

              <div>
                <label className="label">REQUIRED SKILLS (COMMA SEPARATED)</label>
                <input className="input" placeholder="React, C#, SQL, Kubernetes" value={newJob.requiredSkillsJson} onChange={e=>setNewJob({...newJob, requiredSkillsJson:e.target.value})} />
              </div>

              <div>
                <label className="label">DESCRIPTION *</label>
                <textarea className="input" placeholder="Job description guidelines..." required rows={4} style={{ resize:'vertical', lineHeight:1.6 }} value={newJob.description} onChange={e=>setNewJob({...newJob, description:e.target.value})} />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto', paddingTop:8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowDrawer(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={saving}>
                  {saving ? 'Creating...' : 'Initialize Requirement'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
