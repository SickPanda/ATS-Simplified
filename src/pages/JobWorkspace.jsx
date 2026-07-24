import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, MapPin, DollarSign, Briefcase, Power, CheckCircle, X, Users, AlignLeft, Sparkles, UserPlus, Loader2 } from 'lucide-react';
import KanbanView from './KanbanView';
import RateFields, { RateBadge } from '../components/RateFields';

function MatchBar({ label, value, max = 55, color = 'var(--primary-light)' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.35s ease' }} />
      </div>
    </div>
  );
}

export default function JobWorkspace() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [clients, setClients] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview'); // Overview | Pipeline | Matches
  
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Talent matching
  const [matches, setMatches] = useState([]);
  const [matchMeta, setMatchMeta] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchToast, setMatchToast] = useState(null);

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

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/ats/jobs/${id}/talent-matches?limit=30&excludeApplied=true`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setMatchMeta({ jobTitle: data.jobTitle, totalScanned: data.totalScanned });
      }
    } catch (e) { console.error(e); }
    setLoadingMatches(false);
  };

  useEffect(() => {
    if (activeTab === 'Matches') loadMatches();
  }, [activeTab, id]);

  const assignMatch = async (candidateId) => {
    setAssigningId(candidateId);
    try {
      const r = await fetch('/api/ats/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, jobId: parseInt(id), matchScore: 0 }),
      });
      if (r.ok) {
        setMatches(prev => prev.filter(m => m.candidateId !== candidateId));
        setMatchToast({ msg: 'Candidate added to pipeline', type: 'success' });
        fetchApps();
      } else {
        setMatchToast({ msg: await r.text(), type: 'error' });
      }
    } catch (e) {
      setMatchToast({ msg: 'Assign failed', type: 'error' });
    }
    setAssigningId(null);
    setTimeout(() => setMatchToast(null), 3000);
  };

  const scoreClass = (score) => score >= 70 ? 'score-hi' : score >= 40 ? 'score-mid' : 'score-lo';

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...editForm };
    if (payload.clientId) payload.clientId = parseInt(payload.clientId);
    payload.billRate = parseFloat(payload.billRate || 0);
    payload.payRate = parseFloat(payload.payRate || 0);
    payload.rateUnit = payload.rateUnit || 'Hourly';
    if (payload.requiredSkillsJson && typeof payload.requiredSkillsJson === 'string' && !payload.requiredSkillsJson.trim().startsWith('[')) {
      const skillsArr = payload.requiredSkillsJson.split(',').map(s => s.trim()).filter(Boolean);
      payload.requiredSkillsJson = JSON.stringify(skillsArr);
    } else if (!payload.requiredSkillsJson) {
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
            <Link to="/jobs" className="btn-icon" style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 10 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--text-3)', fontWeight: 500, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} color="var(--primary-light)" /> {job.department}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color="var(--cyan)" /> {job.location}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} color="var(--emerald)" /></span>
                <RateBadge billRate={job.billRate} payRate={job.payRate} rateUnit={job.rateUnit} />
                {job.salaryRange && <span style={{ color: 'var(--text-4)' }}>· {job.salaryRange}</span>}
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
            <Users size={16} /> Candidates
          </button>
          <button 
            onClick={() => setActiveTab('Matches')}
            style={{
              padding: '0 0 12px 0', border: 'none', background: 'transparent',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'Matches' ? 'var(--primary-light)' : 'var(--text-3)',
              borderBottom: `2px solid ${activeTab === 'Matches' ? 'var(--primary-light)' : 'transparent'}`,
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Sparkles size={16} /> Talent Match
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'Overview' && (
          <div className="anim-fade-up" style={{ padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div className="kpi-card kpi-primary">
                <div className="kpi-icon"><Users size={18} color="var(--primary)" /></div>
                <div className="kpi-val">{applications.length}</div>
                <div className="kpi-label">Total Applicants</div>
              </div>
              <div className="kpi-card kpi-warning">
                <div className="kpi-icon" style={{ background: 'var(--warning-soft)' }}><CheckCircle size={18} color="var(--warning)" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Interview').length}</div>
                <div className="kpi-label">In Interview</div>
              </div>
              <div className="kpi-card kpi-muted">
                <div className="kpi-icon" style={{ background: 'var(--surface-3)' }}><DollarSign size={18} color="var(--primary-dark)" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Offer').length}</div>
                <div className="kpi-label">Offers Extended</div>
              </div>
              <div className="kpi-card kpi-success">
                <div className="kpi-icon" style={{ background: 'var(--success-soft)' }}><Briefcase size={18} color="var(--success)" /></div>
                <div className="kpi-val">{applications.filter(a => a.stage === 'Hired').length}</div>
                <div className="kpi-label">Hired Candidates</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
              
              {/* Left Column: Description */}
              <div className="card" style={{ padding: '32px 40px', background: '#ffffff' }}>
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
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
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
                        background: 'var(--primary-glow)', color: 'var(--primary)', 
                        border: '1px solid rgba(37,99,235,0.2)' 
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
          <div className="anim-fade-up" style={{ flex: 1, padding: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <KanbanView isEmbedded={true} />
          </div>
        )}

        {activeTab === 'Matches' && (
          <div className="anim-fade-up" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 40px' }}>
            {matchToast && (
              <div style={{
                position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
                background: 'var(--surface)', border: `1px solid ${matchToast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
                padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}>{matchToast.msg}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text-1)', marginBottom: 4 }}>
                  AI Talent Ranking
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 560 }}>
                  Explainable skill matching against your internal database — no black box.
                  {matchMeta ? ` Scanned ${matchMeta.totalScanned} active candidates.` : ''}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={loadMatches} disabled={loadingMatches} style={{ fontSize: 13 }}>
                {loadingMatches ? <Loader2 size={14} className="anim-spin" /> : <Sparkles size={14} />}
                {loadingMatches ? 'Ranking…' : 'Refresh ranking'}
              </button>
            </div>

            {loadingMatches && matches.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Scoring talent pool…
              </div>
            ) : matches.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <Sparkles size={28} color="var(--primary-light)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>No unmatched talent found</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
                  Everyone in the database is already on this pipeline, or the pool is empty. Parse resumes or source more candidates.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matches.map((m, idx) => (
                  <div key={m.candidateId} className="card-lift" style={{
                    padding: '16px 20px',
                    border: expandedMatch === m.candidateId ? '1px solid rgba(37,99,235,0.35)' : '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: idx < 3
                          ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                          : 'var(--surface-2)',
                        color: idx < 3 ? '#fff' : 'var(--text-3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13,
                      }}>
                        #{idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-1)' }}>{m.name}</span>
                          <span className={`score ${scoreClass(m.score)}`}>{m.score}% match</span>
                          {m.workAuthorization && (
                            <span className="badge" style={{ fontSize: 10 }}>{m.workAuthorization}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                          {m.role} · {m.experience || 'Exp n/a'}
                          {(m.city || m.state) ? ` · ${[m.city, m.state].filter(Boolean).join(', ')}` : ''}
                          {m.source ? ` · ${m.source}` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.4 }}>
                          {m.summary}
                        </div>
                        {m.matchedSkills?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {m.matchedSkills.slice(0, 6).map(s => (
                              <span key={s} style={{
                                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(4,120,87,0.2)'
                              }}>{s}</span>
                            ))}
                            {m.missingSkills?.slice(0, 3).map(s => (
                              <span key={`m-${s}`} style={{
                                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(185,28,28,0.15)'
                              }}>− {s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                          disabled={assigningId === m.candidateId}
                          onClick={() => assignMatch(m.candidateId)}
                        >
                          <UserPlus size={13} />
                          {assigningId === m.candidateId ? 'Adding…' : 'Add to pipeline'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          onClick={() => setExpandedMatch(expandedMatch === m.candidateId ? null : m.candidateId)}
                        >
                          {expandedMatch === m.candidateId ? 'Hide breakdown' : 'Why this score?'}
                        </button>
                      </div>
                    </div>

                    {expandedMatch === m.candidateId && (
                      <div style={{
                        marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', marginBottom: 10 }}>
                            SCORE BREAKDOWN (EXPLAINABLE)
                          </div>
                          <MatchBar label="Skills overlap" value={m.skillScore} max={55} color="#047857" />
                          <MatchBar label="Role title fit" value={m.roleScore} max={25} color="#2563eb" />
                          <MatchBar label="Experience level" value={m.experienceScore} max={15} color="#1d4ed8" />
                          <MatchBar label="Location signal" value={m.locationScore} max={5} color="#64748b" />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', marginBottom: 10 }}>
                            CONTACT
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                            <div>{m.email || 'No email'}</div>
                            <div>{m.phone || 'No phone'}</div>
                            <div style={{ color: 'var(--text-3)' }}>Owner: {m.ownership || 'Unassigned'}</div>
                          </div>
                          {m.extraSkills?.length > 0 && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', margin: '14px 0 8px' }}>
                                ADDITIONAL SKILLS
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {m.extraSkills.map(s => (
                                  <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-3)' }}>{s}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

              <RateFields
                billRate={editForm.billRate ?? ''}
                payRate={editForm.payRate ?? ''}
                rateUnit={editForm.rateUnit || 'Hourly'}
                onChange={({ billRate, payRate, rateUnit }) => setEditForm({ ...editForm, billRate, payRate, rateUnit })}
              />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>DISPLAY RANGE (OPTIONAL)</label>
                  <input className="input" value={editForm.salaryRange || ''} onChange={e=>setEditForm({...editForm, salaryRange:e.target.value})} placeholder="Marketing-facing band" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>CLIENT</label>
                  <select className="input" value={editForm.clientId || ''} onChange={e=>setEditForm({...editForm, clientId:e.target.value})}>
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
