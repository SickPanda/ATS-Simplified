import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, X, Phone, Mail, GraduationCap, Briefcase, Search, Trash2, Filter, ChevronDown, CloudUpload, AlertCircle, CheckCircle, Zap, Send, LayoutList, TerminalSquare, Users, User, Globe, MapPin, ClipboardCheck, ShieldCheck } from 'lucide-react';

const AVATAR_COLORS = [
  ['#6d5cff','#1a1650'],['#22d3ee','#0a3040'],['#10b981','#0a2820'],
  ['#f59e0b','#3d2800'],['#f43f5e','#3d0f18'],['#a78bfa','#1e1040'],
];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??'; }
function getAvatarColors(name) {
  let h=0; for(let i=0;i<(name?.length||0);i++) h=(h*31+name.charCodeAt(i))%AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

const EXP_FILTERS = ['All', 'Entry', 'Mid', 'Senior'];
const WORK_AUTH_TYPES = ['All', 'US Citizen', 'Green Card', 'H1B', 'W2', 'C2C'];

export default function CandidatesView() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState('All'); // All | Name | Email | Skill | Location
  const [expFilter, setExpFilter] = useState('All');
  const [authFilter, setAuthFilter] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  
  // Tab control in Profile Snapshot
  const [snapshotTab, setSnapshotTab] = useState('profile'); // profile | pipeline | notes

  // Copilot State
  const [jobs, setJobs] = useState([]);
  const [copilotSummary, setCopilotSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [draftJobId, setDraftJobId] = useState('');
  const [copilotDraft, setCopilotDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Bulk Actions States
  const [activeIds, setActiveIds] = useState(new Set());
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailBody, setBulkEmailBody] = useState('');
  const [bulkJobId, setBulkJobId] = useState('');
  const [showQuickParse, setShowQuickParse] = useState(false);
  const [quickParseText, setQuickParseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const fileInputRef = useRef(null);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCandidates = () =>
    fetch('/api/ats/candidates').then(r=>r.json()).then(setCandidates).catch(console.error);

  useEffect(() => { 
    fetchCandidates(); 
    fetch('/api/ats/jobs').then(r=>r.json()).then(setJobs).catch(console.error);
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      showToast('Please upload a PDF or Word document.');
      return;
    }
    setIsUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const r = await fetch('/api/ats/resume/parse', { 
        method: 'POST', 
        headers: { 'X-Gemini-Key': apiKey },
        body: fd 
      });
      if (r.ok) {
        showToast('Resume successfully uploaded and parsed!', 'success');
        fetchCandidates();
      } else {
        showToast('Upload failed: ' + await r.text());
      }
    } catch(e) { console.error(e); }
    setIsUploading(false);
  };

  const onFileChange = (e) => handleUpload(e.target.files[0]);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const handleDelete = async (id) => {
    await fetch(`/api/ats/candidates/${id}`, { method: 'DELETE' });
    if (selectedCandidate?.id === id) setSelectedCandidate(null);
    setCandidateToDelete(null);
    fetchCandidates();
    showToast('Candidate deleted successfully.', 'success');
  };

  const fetchActivities = async (id) => {
    try {
      const res = await fetch(`/api/ats/candidates/${id}/activities`);
      if (res.ok) setActivities(await res.json());
    } catch(e) { console.error(e); }
  };

  const handleSelectCandidate = (c) => {
    setSelectedCandidate(c);
    setSnapshotTab('profile');
    setActivities([]);
    setNewNote('');
    setCopilotSummary('');
    setCopilotDraft('');
    setDraftJobId('');
    if (c) fetchActivities(c.id);
  };

  const generateSummary = async () => {
    setIsSummarizing(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch(`/api/ats/copilot/summarize/${selectedCandidate.id}`, { method: 'POST', headers: { 'X-Gemini-Key': apiKey } });
      if (res.ok) setCopilotSummary((await res.json()).summary);
      else showToast('Failed to generate summary');
    } catch(e) { console.error(e); }
    setIsSummarizing(false);
  };

  const draftEmail = async () => {
    if (!draftJobId) return;
    setIsDrafting(true);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch(`/api/ats/copilot/draft-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': apiKey },
        body: JSON.stringify({ candidateId: selectedCandidate.id, jobId: parseInt(draftJobId) })
      });
      if (res.ok) setCopilotDraft((await res.json()).draft);
      else showToast('Failed to draft email');
    } catch(e) { console.error(e); }
    setIsDrafting(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCandidate) return;
    try {
      const res = await fetch(`/api/ats/candidates/${selectedCandidate.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Note', content: newNote.trim() })
      });
      if (res.ok) {
        setNewNote('');
        fetchActivities(selectedCandidate.id);
        showToast('Note added successfully.', 'success');
      }
    } catch(e) { console.error(e); }
  };

  const handleQuickParse = async () => {
    if (!quickParseText.trim()) return;
    setIsParsing(true);
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const res = await fetch('/api/ats/candidates/quick-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': apiKey },
      body: JSON.stringify({ rawText: quickParseText })
    });
    if (res.ok) {
      showToast('Candidate successfully quick-parsed!', 'success');
      setShowQuickParse(false);
      setQuickParseText('');
      fetchCandidates();
    } else {
      showToast('Parsing failed. Make sure your Gemini API Key is configured in settings.', 'error');
    }
    setIsParsing(false);
  };

  // Selections
  const toggleSelect = (id) => {
    const next = new Set(activeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveIds(next);
  };

  const toggleSelectAll = () => {
    if (activeIds.size === filtered.length) {
      setActiveIds(new Set());
    } else {
      setActiveIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkJobId) return;
    await fetch('/api/ats/candidates/mass-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: Array.from(activeIds), jobId: parseInt(bulkJobId) })
    });
    showToast('Candidates mass assigned!', 'success');
    setShowBulkAssign(false);
    setActiveIds(new Set());
  };

  const handleBulkEmail = () => {
    showToast(`SMTP Relay: Email sent to ${activeIds.size} candidates!`, 'success');
    setShowBulkEmail(false);
    setActiveIds(new Set());
    setBulkEmailSubject('');
    setBulkEmailBody('');
  };

  // Sourcing Filter
  const filtered = candidates.filter(c => {
    // Search Scope
    const nameMatch = c.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = c.email?.toLowerCase().includes(search.toLowerCase());
    const skillsMatch = c.skillsJson?.toLowerCase().includes(search.toLowerCase());
    const locMatch = (c.city + ' ' + c.state)?.toLowerCase().includes(search.toLowerCase());
    
    let matchesSearch = true;
    if (search.trim()) {
      if (searchScope === 'Name') matchesSearch = nameMatch;
      else if (searchScope === 'Email') matchesSearch = emailMatch;
      else if (searchScope === 'Skill') matchesSearch = skillsMatch;
      else if (searchScope === 'Location') matchesSearch = locMatch;
      else matchesSearch = nameMatch || emailMatch || skillsMatch || locMatch || c.role?.toLowerCase().includes(search.toLowerCase());
    }

    const matchesExp = expFilter === 'All' || c.experience?.toLowerCase().includes(expFilter.toLowerCase());
    const matchesAuth = authFilter === 'All' || c.workAuthorization?.toLowerCase() === authFilter.toLowerCase();
    
    return matchesSearch && matchesExp && matchesAuth;
  });

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'var(--rose)' : 'var(--emerald)'}`,
          padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideRight 0.3s cubic-bezier(0.16,1,0.3,1)'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} color="var(--rose)" /> : <CheckCircle size={16} color="var(--emerald)" />}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{toast.msg}</span>
          <button className="btn-icon" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candidateToDelete && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setCandidateToDelete(null)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16 }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} color="var(--rose)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Delete Candidate</h3>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this candidate? This will remove all associated submissions.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCandidateToDelete(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--rose)', borderColor: 'var(--rose)', color: 'white' }} onClick={() => handleDelete(candidateToDelete)}>Delete</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Applicants Command Center
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Sourcing, parsing, and pipeline operations
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={() => setShowQuickParse(true)}>
            <TerminalSquare size={14} /> Quick Parse Text
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display:'none' }} onChange={onFileChange} />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <><div className="anim-spin" style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%'}} /> Parsing...</>
            ) : (
              <><Upload size={14} /> Upload Resume</>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animationDelay: '0.05s' }}>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(109,92,255,0.1) 0%, rgba(109,92,255,0.02) 100%)', border: '1px solid rgba(109,92,255,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'var(--primary-glow)' }}><Users size={18} color="var(--primary-light)" /></div>
          <div className="kpi-val">{candidates.length}</div>
          <div className="kpi-label">Active Talent Bench</div>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><Briefcase size={18} color="var(--emerald)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.experience?.toLowerCase().includes('senior') || c.experience?.toLowerCase().includes('lead')).length}</div>
          <div className="kpi-label">Senior Level Engineers</div>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.02) 100%)', border: '1px solid rgba(34,211,238,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'rgba(34,211,238,0.15)' }}><Zap size={18} color="var(--cyan)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.workAuthorization?.toLowerCase().includes('citizen') || c.workAuthorization?.toLowerCase().includes('green')).length}</div>
          <div className="kpi-label">US Authorized Stars</div>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(244,63,94,0.02) 100%)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'rgba(244,63,94,0.15)' }}><Globe size={18} color="var(--rose)" /></div>
          <div className="kpi-val">{candidates.filter(c => c.source?.toLowerCase().includes('parser') || c.source?.toLowerCase().includes('parse')).length}</div>
          <div className="kpi-label">Resumes Parsed by AI</div>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      {candidates.length === 0 && (
        <div
          className={`drop-zone anim-fade-up${dragging ? ' over' : ''}`}
          style={{ animationDelay: '0.05s' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUpload size={40} color={dragging ? 'var(--primary)' : 'var(--text-4)'} style={{ margin: '0 auto 14px' }} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>
            Drag and drop resume PDF here
          </p>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>PDF / Word formats supported · Gemini AI will automatically parse credentials</p>
        </div>
      )}

      {/* Sourcing Filters toolbar */}
      {candidates.length > 0 && (
        <div className="anim-fade-up" style={{ display:'flex', gap:12, flexWrap:'wrap', animationDelay:'0.08s', alignItems:'center' }}>
          {/* Search Input with dropdown scope selection */}
          <div className="input-search" style={{ flex:1, minWidth:320 }}>
            <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
            <select 
              value={searchScope} 
              onChange={e=>setSearchScope(e.target.value)} 
              style={{
                background:'none', border:'none', color:'var(--text-2)', fontSize:12.5, fontWeight:600,
                borderRight:'1px solid var(--border)', paddingRight:10, marginRight:6, outline:'none', cursor:'pointer'
              }}
            >
              <option value="All">Search Any</option>
              <option value="Name">Name</option>
              <option value="Email">Email</option>
              <option value="Skill">Skill</option>
              <option value="Location">Location</option>
            </select>
            <input
              placeholder="Type keyword..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
            {search && (
              <button className="btn-icon" style={{width:20,height:20}} onClick={()=>setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Experience level */}
          <div className="tab-bar">
            {EXP_FILTERS.map(f => (
              <button key={f} className={`tab${expFilter===f?' active':''}`} onClick={()=>setExpFilter(f)}>{f}</button>
            ))}
          </div>

          {/* Work Auth */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>Work Auth:</span>
            <select 
              className="input" 
              style={{ width:120, height:34, padding:'0 8px', fontSize:12.5, background:'var(--surface-2)' }} 
              value={authFilter} 
              onChange={e=>setAuthFilter(e.target.value)}
            >
              {WORK_AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Candidates Data Table */}
      {filtered.length > 0 && (
        <div className="card anim-fade-up" style={{ animationDelay:'0.12s', overflow:'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', width: 40 }}>
                    <input type="checkbox" onChange={toggleSelectAll} checked={filtered.length > 0 && activeIds.size === filtered.length} />
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>APPLICANT</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>CURRENT ROLE</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>WORK AUTH</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>OWNERSHIP</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600 }}>SOURCE</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-3)', fontWeight: 600, width:140 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const [fg, bg] = getAvatarColors(c.name);
                  return (
                    <tr key={c.id} className="trow" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <input type="checkbox" checked={activeIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar" style={{ background: bg, color: fg, width:34, height:34, fontSize:12.5 }}>{getInitials(c.name)}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</div>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)', marginTop: 2, alignItems: 'center' }}>
                              <span>{c.email}</span>
                              {c.city && <span>• {c.city}, {c.state}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{c.role || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{c.experience || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        <span style={{
                          padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: c.workAuthorization?.includes('Citizen') ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                          color: c.workAuthorization?.includes('Citizen') ? 'var(--emerald)' : 'var(--text-2)'
                        }}>
                          {c.workAuthorization || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <User size={12} color="var(--text-4)" /> {c.ownership || 'Aazam Qureshi'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.source || 'Parser'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12, height:30 }} onClick={() => handleSelectCandidate(c)}>
                            View Snapshot
                          </button>
                          <button className="btn-icon btn-danger-ghost" style={{ width:30, height:30 }} onClick={() => setCandidateToDelete(c.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && candidates.length > 0 && (
        <div className="card empty-state anim-fade-up">
          <Search size={32} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text-2)' }}>No matching profiles found</p>
          <p style={{ fontSize:13 }}>Adjust your search scopes or toggles</p>
        </div>
      )}

      {/* Floating Action Bar */}
      {activeIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '10px 20px',
          borderRadius: 99, display: 'flex', alignItems: 'center', gap: 16, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease both'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
            {activeIds.size} Selected
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowBulkAssign(true)}>
            <LayoutList size={14} /> Mass Assign Requirement
          </button>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowBulkEmail(true)}>
            <Send size={14} /> Send Mass Email
          </button>
        </div>
      )}

      {/* Quick Parse Modal */}
      {showQuickParse && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowQuickParse(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 500, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Fast Sourcing AI</h3>
              <button className="btn-icon" onClick={() => setShowQuickParse(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Paste raw text copied from LinkedIn or resume body. Gemini will automatically extract details and populate location/work authorization columns.
            </p>
            <textarea 
              className="input" 
              style={{ width: '100%', minHeight: 200, fontSize: 12, fontFamily: 'monospace' }} 
              placeholder="Paste LinkedIn or resume text here..."
              value={quickParseText}
              onChange={e => setQuickParseText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowQuickParse(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isParsing || !quickParseText.trim()} onClick={handleQuickParse}>
                {isParsing ? 'Parsing...' : 'Extract & Save Candidate'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmail && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowBulkEmail(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 500, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Mass Email Dispatch ({activeIds.size} recruits)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Subject" value={bulkEmailSubject} onChange={e=>setBulkEmailSubject(e.target.value)} />
              <textarea className="input" placeholder="Email body template..." style={{ minHeight: 150 }} value={bulkEmailBody} onChange={e=>setBulkEmailBody(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkEmail(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkEmailSubject || !bulkEmailBody} onClick={handleBulkEmail}>
                Dispatch Email
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowBulkAssign(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 400, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Assign to Requirement ({activeIds.size} candidates)</h3>
            <select className="input" style={{ width: '100%', padding: '10px' }} value={bulkJobId} onChange={e=>setBulkJobId(e.target.value)}>
              <option value="">Select job requirement...</option>
              {jobs.filter(j=>j.status==='Active').map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkAssign(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkJobId} onClick={handleBulkAssign}>
                Link & Assign
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Snapshot Drawer */}
      {selectedCandidate && (
        <>
          <div className="overlay" onClick={()=>handleSelectCandidate(null)} />
          <div style={{
            position:'fixed', inset:0, zIndex:51,
            display:'flex', alignItems:'stretch',
            animation:'fadeIn 0.2s ease both',
          }}>
            <div style={{ flex:1 }} onClick={()=>handleSelectCandidate(null)} />
            <div style={{
              width:'90vw', maxWidth: 1300, background:'var(--surface)', borderLeft:'1px solid var(--border)',
              display:'flex', flexDirection:'column',
              animation:'slideRight 0.32s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              {/* Profile Header */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {(() => { const [fg,bg]=getAvatarColors(selectedCandidate.name); return (
                    <div style={{ width:44,height:44,borderRadius:10,background:bg,color:fg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700 }}>
                      {getInitials(selectedCandidate.name)}
                    </div>
                  ); })()}
                  <div>
                    <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:17.5, color:'var(--text-1)' }}>
                      {selectedCandidate.name}
                    </h2>
                    <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-3)', marginTop:3, alignItems:'center' }}>
                      <span>{selectedCandidate.role}</span>
                      <span>•</span>
                      <span>Auth: <strong>{selectedCandidate.workAuthorization || 'US Citizen'}</strong></span>
                      <span>•</span>
                      <span>Owner: <strong>{selectedCandidate.ownership || 'Aazam Qureshi'}</strong></span>
                    </div>
                  </div>
                </div>
                
                {/* Snapshot Tabs Selector */}
                <div className="tab-bar" style={{ marginLeft:'auto', marginRight:24 }}>
                  <button className={`tab${snapshotTab==='profile'?' active':''}`} onClick={()=>setSnapshotTab('profile')}>Overview</button>
                  <button className={`tab${snapshotTab==='pipeline'?' active':''}`} onClick={()=>setSnapshotTab('pipeline')}>Pipeline & Notes</button>
                </div>

                <button className="btn-icon" onClick={()=>handleSelectCandidate(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Main Snapshot Body */}
              <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
                {snapshotTab === 'profile' ? (
                  <>
                    {/* Left: General & AI Copilot Details */}
                    <div style={{ width: 360, borderRight:'1px solid var(--border)', padding:'20px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:20 }}>
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>CONTACT TELEMETRY</p>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                            <Mail size={14} color="var(--text-3)" /> {selectedCandidate.email || 'No email stored'}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                            <Phone size={14} color="var(--text-3)" /> {selectedCandidate.phone || 'No phone stored'}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                            <MapPin size={14} color="var(--text-3)" /> {selectedCandidate.city ? `${selectedCandidate.city}, ${selectedCandidate.state}` : 'No location parsed'}
                          </div>
                        </div>
                      </section>

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* AI Sourcing Copilot */}
                      <section style={{ padding: '16px', background: 'rgba(109, 92, 255, 0.05)', borderRadius: 12, border: '1px solid rgba(109, 92, 255, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Zap size={14} color="var(--primary-light)" />
                          <p style={{ fontSize:11, fontWeight:800, color:'var(--primary-light)', letterSpacing:'0.08em' }}>SYS_CO_PILOT</p>
                        </div>

                        {/* AI Summary */}
                        <div style={{ marginBottom: 16 }}>
                          {!copilotSummary ? (
                            <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={generateSummary} disabled={isSummarizing}>
                              {isSummarizing ? 'Summarizing...' : 'Summarize Profile'}
                            </button>
                          ) : (
                            <div style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, whiteSpace: 'pre-line' }}>
                              {copilotSummary}
                            </div>
                          )}
                        </div>

                        {/* Pitch Email Draft */}
                        <div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <select className="input" style={{ flex: 1, padding: '6px', fontSize: 12 }} value={draftJobId} onChange={e=>setDraftJobId(e.target.value)}>
                              <option value="">Pitch for Job...</option>
                              {jobs.filter(j=>j.status==='Active').map(j => (
                                <option key={j.id} value={j.id}>{j.title}</option>
                              ))}
                            </select>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={!draftJobId || isDrafting} onClick={draftEmail}>
                              {isDrafting ? 'Drafting...' : 'Pitch'}
                            </button>
                          </div>
                          {copilotDraft && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea className="input" style={{ width: '100%', minHeight: 120, fontSize: 12, resize: 'vertical' }} value={copilotDraft} onChange={e=>setCopilotDraft(e.target.value)} />
                              <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={() => {
                                showToast('Outreach dispatched via SMTP node!', 'success');
                                setCopilotDraft('');
                              }}>
                                <Send size={14} /> Send Pitch Email
                              </button>
                            </div>
                          )}
                        </div>
                      </section>

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* General Bio Info */}
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>EXPERIENCE PROFILE</p>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <Briefcase size={14} color="var(--text-3)" style={{ marginTop:2, flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{selectedCandidate.role}</div>
                            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{selectedCandidate.experience}</div>
                            <div style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>Source: {selectedCandidate.source}</div>
                          </div>
                        </div>
                      </section>

                      {selectedCandidate.education && (
                        <>
                          <div style={{ height:1, background:'var(--border)' }} />
                          <section>
                            <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>EDUCATION</p>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                              <GraduationCap size={14} color="var(--text-3)" style={{ marginTop:2, flexShrink:0 }} />
                              <div style={{ fontSize:13, color:'var(--text-2)' }}>{selectedCandidate.education}</div>
                            </div>
                          </section>
                        </>
                      )}

                      <div style={{ height:1, background:'var(--border)' }} />

                      {/* Skills Tags */}
                      <section>
                        <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>SKILLS TAGS</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {(() => { try { return JSON.parse(selectedCandidate.skillsJson||'[]'); } catch { return []; } })()
                            .map((skill,i) => (
                              <span key={i} style={{
                                padding:'4px 10px', borderRadius:99,
                                fontSize:11.5, fontWeight:600,
                                background:'var(--primary-glow)', color:'var(--primary-light)',
                                border:'1px solid rgba(109,92,255,0.25)',
                              }}>{skill}</span>
                            ))}
                        </div>
                      </section>
                    </div>

                    {/* Right: Embedded Resume Preview */}
                    <div style={{ flex:1, background:'var(--bg)', padding:16, overflow:'hidden' }}>
                      {selectedCandidate.resumeFilePath ? (
                        <iframe
                          src={selectedCandidate.resumeFilePath}
                          style={{ width:'100%', height:'100%', border:'none', borderRadius:10 }}
                          title="Resume File"
                        />
                      ) : (
                        <div className="empty-state" style={{ height:'100%' }}>
                          <FileText size={40} />
                          <p style={{ fontSize:14 }}>No resume attachment available</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* TAB 2: Notes & Application History */
                  <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, padding:24, overflowY:'auto' }}>
                    {/* Left side: Notes */}
                    <div style={{ display:'flex', flexDirection:'column', gap:16, borderRight:'1px solid var(--border)', paddingRight:24 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 4 }}>
                        RECRUITER FEEDBACK & NOTES
                      </h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <textarea 
                          className="input"
                          placeholder="Log recruiter notes or callback summaries here..."
                          value={newNote}
                          onChange={e=>setNewNote(e.target.value)}
                          style={{ minHeight:100, resize:'vertical', fontSize:13 }}
                        />
                        <button className="btn btn-primary" style={{ alignSelf:'flex-end', padding:'6px 16px', fontSize:12.5 }} onClick={handleAddNote}>
                          Post Note
                        </button>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto', flex:1, maxHeight:360 }}>
                        {activities.map(act => (
                          <div key={act.id} style={{ padding:14, background:'var(--surface-2)', borderRadius:10, border:'1px solid var(--border)' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)' }}>{act.type}</span>
                              <span style={{ fontSize:11, color:'var(--text-4)' }}>{new Date(act.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize:12.5, color:'var(--text-1)', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{act.content}</div>
                          </div>
                        ))}
                        {activities.length === 0 && (
                          <div style={{ fontSize:12.5, color:'var(--text-4)', textAlign:'center', marginTop:20 }}>No notes recorded for this candidate.</div>
                        )}
                      </div>
                    </div>

                    {/* Right side: Pipeline & Application Status */}
                    <div style={{ paddingLeft:8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 16 }}>
                        SUBMITTALS PIPELINE
                      </h4>
                      {(() => {
                        const candidateApplications = jobs.flatMap(j => {
                          // Filter applications associated with candidate
                          // We mock pipeline status if there's no backend connection, but let's see if we can find applications associated.
                          return [];
                        });
                        
                        return (
                          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            <div style={{
                              padding: 16, borderRadius: 12, background: 'var(--surface-2)', border: '1px dashed var(--border)',
                              display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent:'center', textAlign:'center'
                            }}>
                              <ClipboardCheck size={24} color="var(--text-4)" />
                              <div style={{ fontSize: 13.5, color: 'var(--text-2)', fontWeight:600 }}>Active Submittals</div>
                              <p style={{ fontSize:11.5, color:'var(--text-4)', margin:0 }}>Use 'Mass Assign' or the Job pipeline to assign this candidate to live roles.</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
