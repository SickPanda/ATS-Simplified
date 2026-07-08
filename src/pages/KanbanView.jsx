import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, UserPlus, X, GripVertical, Calendar, Send, CalendarPlus, CheckCircle, DollarSign, AlertCircle, CheckCircle as CheckCircleIcon } from 'lucide-react';

const COLUMNS = [
  { id: 'Applied',   label: 'Applied',   color: '#22d3ee' },
  { id: 'Screened',  label: 'Screened',  color: '#a78bfa' },
  { id: 'Interview', label: 'Interview', color: '#f59e0b' },
  { id: 'Offer',     label: 'Offer',     color: '#6d5cff' },
  { id: 'Hired',     label: 'Hired',     color: '#10b981' },
  { id: 'Rejected',  label: 'Rejected',  color: '#f43f5e' },
];

const AVATAR_COLORS = [
  ['#6d5cff','#1a1650'],['#22d3ee','#0a3040'],['#10b981','#0a2820'],
  ['#f59e0b','#3d2800'],['#f43f5e','#3d0f18'],['#a78bfa','#1e1040'],
];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??'; }
function getAvatarColors(name) {
  let h=0; for(let i=0;i<(name?.length||0);i++) h=(h*31+name.charCodeAt(i))%AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

function ScorePill({ score }) {
  if (score === 0) return null;
  const cls = score >= 70 ? 'score-hi' : score >= 40 ? 'score-mid' : 'score-lo';
  return <span className={`score ${cls}`}>{score}% match</span>;
}

export default function KanbanView() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [submittingApp, setSubmittingApp] = useState(null);
  const [submittalSummary, setSubmittalSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Interview state
  const [interviewingApp, setInterviewingApp] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  
  // Placement state
  const [placingApp, setPlacingApp] = useState(null);
  const [payRate, setPayRate] = useState('');
  const [billRate, setBillRate] = useState('');
  
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('/api/ats/jobs').then(r=>r.json()).then(jobs=>{
      setJob(jobs.find(j=>j.id===parseInt(id)));
    });
    fetchApps();
    fetch('/api/ats/candidates').then(r=>r.json()).then(setCandidates);
  }, [id]);

  const fetchApps = () =>
    fetch(`/api/ats/jobs/${id}/applications`).then(r=>r.json()).then(setApplications);

  const handleDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    const appId = parseInt(draggableId);
    const newStage = destination.droppableId;
    setApplications(prev => prev.map(a => a.id===appId ? {...a, stage:newStage} : a));
    await fetch(`/api/ats/applications/${appId}/stage`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newStage),
    });
  };

  const assignCandidate = async (candidateId) => {
    setAssigning(candidateId);
    const r = await fetch('/api/ats/applications', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ candidateId, jobId: parseInt(id), matchScore: 0 }),
    });
    if (r.ok) { 
      setShowAssign(false); 
      fetchApps();
      showToast('Candidate assigned successfully.', 'success');
    }
    else showToast(await r.text());
    setAssigning(null);
  };

  const submitToClient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const r = await fetch('/api/ats/submittals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: submittingApp.candidateId,
        clientId: job.clientId,
        jobId: job.id,
        summary: submittalSummary
      })
    });
    setSubmitting(false);
    if (r.ok) {
      setSubmittingApp(null);
      setSubmittalSummary('');
      showToast('Submitted successfully.', 'success');
    } else {
      showToast(await r.text());
    }
  };

  const scheduleInterview = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/ats/applications/${interviewingApp.id}/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date(interviewDate).toISOString() })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.ics) {
        const blob = new Blob([data.ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview_${interviewingApp.candidate?.name?.replace(/\s+/g, '_') || 'invite'}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Calendar invite (.ics) generated!', 'success');
      }
    }
    
    setInterviewingApp(null);
    setInterviewDate('');
    fetchApps();
  };

  const markPlaced = async (e) => {
    e.preventDefault();
    await fetch(`/api/ats/applications/${placingApp.id}/placements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        payRate: parseFloat(payRate), 
        billRate: parseFloat(billRate),
        startDate: new Date().toISOString()
      })
    });
    setPlacingApp(null);
    setPayRate('');
    setBillRate('');
    fetchApps();
  };

  if (!job) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--text-3)' }}>
      <div className="anim-spin" style={{width:18,height:18,border:'2px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%'}} />
      Loading pipeline...
    </div>
  );

  const assignedIds = new Set(applications.map(a => a.candidateId ?? a.candidate?.id));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position: 'relative' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideRight 0.3s cubic-bezier(0.16,1,0.3,1)'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} color="var(--rose)" /> : <CheckCircleIcon size={16} color="var(--emerald)" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{toast.msg}</span>
          <button className="btn-icon" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* Sub-header */}
      <div style={{
        padding:'16px 24px',
        borderBottom:'1px solid rgba(255, 255, 255, 0.08)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'transparent',
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <Link to="/jobs" style={{ display:'flex',alignItems:'center',gap:5,fontSize:12.5,color:'var(--text-3)',textDecoration:'none',fontWeight:500 }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--text-1)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text-3)'}
          >
            <ArrowLeft size={14} /> Jobs
          </Link>
          <span style={{ color:'var(--border-hover)', fontSize:14 }}>/</span>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, color:'var(--text-1)' }}>
            {job.title}
          </h2>
          <span className="badge badge-primary">Pipeline</span>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:13 }} onClick={()=>setShowAssign(true)}>
          <UserPlus size={14} /> Assign Candidate
        </button>
      </div>

      {/* Kanban board */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 20px 32px' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div style={{ display:'flex', gap:14, height:'100%', minWidth:'max-content' }}>
            {COLUMNS.map(col => {
              const colApps = applications.filter(a=>a.stage===col.id);
              return (
                <div key={col.id} style={{
                  width:280, flexShrink:0, display:'flex', flexDirection:'column',
                  background:'rgba(22, 25, 43, 0.35)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius:12,
                  border:'1px solid rgba(255, 255, 255, 0.06)',
                  borderTop:`2px solid ${col.color}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  overflow:'hidden',
                }}>
                  {/* Column header */}
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:7,height:7,borderRadius:'50%',background:col.color,boxShadow:`0 0 8px ${col.color}` }} />
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{col.label}</span>
                    </div>
                    <span style={{
                      fontSize:11, fontWeight:700,
                      background:'rgba(255,255,255,0.06)',
                      color:'var(--text-3)',
                      padding:'2px 8px', borderRadius:99,
                    }}>{colApps.length}</span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex:1, padding:'10px 10px',
                          display:'flex', flexDirection:'column', gap:8,
                          minHeight:60,
                          background: snapshot.isDraggingOver ? `linear-gradient(to bottom, rgba(${col.color==='#22d3ee'?'34,211,238':col.color==='#a78bfa'?'167,139,250':col.color==='#f59e0b'?'245,158,11':col.color==='#6d5cff'?'109,92,255':col.color==='#10b981'?'16,185,129':'244,63,94'},0.1), transparent)` : 'transparent',
                          transition:'background 0.3s ease',
                          overflowY:'auto',
                        }}
                      >
                        {colApps.map((app, index) => {
                          const name = app.candidate?.name ?? '?';
                          const [fg, bg] = getAvatarColors(name);
                          return (
                            <Draggable key={app.id} draggableId={app.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    background: snapshot.isDragging ? 'rgba(30, 34, 56, 0.95)' : 'rgba(30, 34, 56, 0.7)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    border:`1px solid ${snapshot.isDragging ? col.color : 'rgba(255, 255, 255, 0.08)'}`,
                                    borderRadius:10,
                                    padding:'12px 12px',
                                    boxShadow: snapshot.isDragging ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${col.color}` : '0 4px 12px rgba(0,0,0,0.1)',
                                    transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                                    cursor:'grab',
                                  }}
                                >
                                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                                    <div className="avatar" style={{ background:bg, color:fg, flexShrink:0, width:30, height:30, fontSize:11 }}>
                                      {getInitials(name)}
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', lineHeight:1.3 }}>{name}</div>
                                      <div style={{ fontSize:11.5, color:'var(--text-3)', marginTop:1 }}>{app.candidate?.role}</div>
                                    </div>
                                  </div>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-4)' }}>
                                      <Calendar size={11} />
                                      {new Date(app.appliedAt).toLocaleDateString()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {job.clientId && col.id !== 'Rejected' && (
                                        <button 
                                          className="btn-icon" 
                                          title="Submit to Client" 
                                          style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.05)' }}
                                          onClick={() => setSubmittingApp(app)}
                                        >
                                          <Send size={11} color="var(--cyan)" />
                                        </button>
                                      )}
                                      {col.id === 'Interview' && (
                                        <button 
                                          className="btn-icon" 
                                          title="Schedule Interview" 
                                          style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.05)' }}
                                          onClick={() => setInterviewingApp(app)}
                                        >
                                          <CalendarPlus size={11} color="var(--amber)" />
                                        </button>
                                      )}
                                      {(col.id === 'Offer' || col.id === 'Hired') && (
                                        <button 
                                          className="btn-icon" 
                                          title="Mark Placed & Set Margin" 
                                          style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.05)' }}
                                          onClick={() => setPlacingApp(app)}
                                        >
                                          <CheckCircle size={11} color="var(--emerald)" />
                                        </button>
                                      )}
                                      <ScorePill score={app.matchScore} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {colApps.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ textAlign:'center', padding:'20px 0', fontSize:12, color:'var(--text-4)' }}>
                            Drop here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <>
          <div className="overlay" onClick={()=>setShowAssign(false)} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            width:480, background:'var(--surface)',
            border:'1px solid var(--border-hover)',
            borderRadius:16,
            zIndex:52,
            animation:'scaleIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
            maxHeight:'75vh', display:'flex', flexDirection:'column',
          }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:'var(--text-1)' }}>
                  Assign to Pipeline
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                  {job.title}
                </p>
              </div>
              <button className="btn-icon" onClick={()=>setShowAssign(false)}><X size={16} /></button>
            </div>
            <div style={{ overflowY:'auto', padding:'12px 16px', flex:1 }}>
              {candidates.filter(c=>!assignedIds.has(c.id)).length === 0 ? (
                <div className="empty-state"><p>All candidates already assigned.</p></div>
              ) : (
                candidates.filter(c=>!assignedIds.has(c.id)).map((c) => {
                  const [fg, bg] = getAvatarColors(c.name);
                  return (
                    <div key={c.id} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 10px', borderRadius:10, marginBottom:4,
                      border:'1px solid transparent',
                      transition:'all 0.12s ease',
                      cursor:'pointer',
                    }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='var(--border)'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}
                    >
                      <div className="avatar" style={{ background:bg, color:fg }}>{getInitials(c.name)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{c.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{c.role}</div>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding:'5px 14px', fontSize:12 }}
                        disabled={assigning===c.id}
                        onClick={()=>assignCandidate(c.id)}
                      >
                        {assigning===c.id?'...':'Assign'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Submittal Modal */}
      {submittingApp && (
        <>
          <div className="overlay" onClick={()=>setSubmittingApp(null)} />
          <div className="drawer" style={{ zIndex: 60 }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--text-1)' }}>
                  Submit to Client
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Generate a blinded submittal for the client</p>
              </div>
              <button className="btn-icon" onClick={()=>setSubmittingApp(null)}><X size={17} /></button>
            </div>

            <form onSubmit={submitToClient} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
              
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.05em', marginBottom: 12 }}>BLINDED CANDIDATE PREVIEW</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Name:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{submittingApp.candidate?.name?.split(' ')[0]} [REDACTED]</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Contact:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>[REDACTED]</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Role:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{submittingApp.candidate?.role}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Experience:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{submittingApp.candidate?.experience}</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  SUBMITTAL SUMMARY / NOTES FOR CLIENT
                </label>
                <textarea
                  className="input"
                  placeholder="Why is this candidate a great fit?"
                  required
                  rows={5}
                  value={submittalSummary}
                  onChange={e=>setSubmittalSummary(e.target.value)}
                />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setSubmittingApp(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={submitting}>
                  <Send size={15} style={{ marginRight: 6 }} />
                  {submitting ? 'Submitting...' : 'Send Submittal'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Interview Modal */}
      {interviewingApp && (
        <>
          <div className="overlay" onClick={()=>setInterviewingApp(null)} />
          <div className="drawer" style={{ zIndex: 60, width: 420 }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--text-1)' }}>
                  Schedule Interview
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>For {interviewingApp.candidate?.name}</p>
              </div>
              <button className="btn-icon" onClick={()=>setInterviewingApp(null)}><X size={17} /></button>
            </div>

            <form onSubmit={scheduleInterview} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                  DATE & TIME
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  required
                  value={interviewDate}
                  onChange={e=>setInterviewDate(e.target.value)}
                />
              </div>

              <div style={{ display:'flex', gap:10, marginTop:'auto' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setInterviewingApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }}>Schedule</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Placement & Margin Modal */}
      {placingApp && (
        <>
          <div className="overlay" onClick={()=>setPlacingApp(null)} />
          <div className="drawer" style={{ zIndex: 60, width: 420 }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17, color:'var(--emerald)' }}>
                  Placement & Margin
                </h2>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Hire {placingApp.candidate?.name}</p>
              </div>
              <button className="btn-icon" onClick={()=>setPlacingApp(null)}><X size={17} /></button>
            </div>

            <form onSubmit={markPlaced} style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:20 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    PAY RATE (/hr)
                  </label>
                  <div className="input-search">
                    <DollarSign size={14} color="var(--text-3)" />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="50.00"
                      required
                      value={payRate}
                      onChange={e=>setPayRate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.03em' }}>
                    BILL RATE (/hr)
                  </label>
                  <div className="input-search">
                    <DollarSign size={14} color="var(--text-3)" />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      required
                      value={billRate}
                      onChange={e=>setBillRate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {payRate && billRate && (
                <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)', marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '0.05em' }}>CALCULATED GROSS MARGIN</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
                    ${(parseFloat(billRate) - parseFloat(payRate)).toFixed(2)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>/ hr</span>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:'auto' }}>
                <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setPlacingApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex:2 }}>Confirm Placement</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
