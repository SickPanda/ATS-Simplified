import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Phone, Mail, GraduationCap, Briefcase, Search, Trash2, Filter, ChevronDown, CloudUpload, AlertCircle, CheckCircle, Zap, Send, LayoutList, TerminalSquare } from 'lucide-react';

const AVATAR_COLORS = [
  ['#6d5cff','#1a1650'],['#22d3ee','#0a3040'],['#10b981','#0a2820'],
  ['#f59e0b','#3d2800'],['#f43f5e','#3d0f18'],['#a78bfa','#1e1040'],
  ['#34d399','#0a2e1e'],['#fb923c','#3d1800'],
];
function getInitials(name) { return name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??'; }
function getAvatarColors(name) {
  let h=0; for(let i=0;i<(name?.length||0);i++) h=(h*31+name.charCodeAt(i))%AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}
function scoreClass(score) { return score>=70?'score-hi':score>=40?'score-mid':'score-lo'; }

const EXP_FILTERS = ['All', 'Entry', 'Mid', 'Senior'];

export default function CandidatesView() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [expFilter, setExpFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'error' | 'success', msg: string }
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  
  // Copilot State
  const [jobs, setJobs] = useState([]);
  const [copilotSummary, setCopilotSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [draftJobId, setDraftJobId] = useState('');
  const [copilotDraft, setCopilotDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Phase 8 States
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
      if (r.ok) fetchCandidates();
      else showToast('Upload failed: ' + await r.text());
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
      }
    } catch(e) { console.error(e); }
  };

  // Phase 8 Logic
  const toggleSelectAll = (e) => {
    if (e.target.checked) setActiveIds(new Set(filtered.map(c => c.id)));
    else setActiveIds(new Set());
  };
  
  const toggleSelect = (id) => {
    const next = new Set(activeIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActiveIds(next);
  };

  const handleBulkEmail = async () => {
    await fetch('/api/ats/candidates/bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: Array.from(activeIds), subject: bulkEmailSubject, body: bulkEmailBody })
    });
    showToast('Mass email logged to activities!', 'success');
    setShowBulkEmail(false);
    setActiveIds(new Set());
  };

  const handleBulkAssign = async () => {
    if (!bulkJobId) return;
    await fetch('/api/ats/candidates/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: Array.from(activeIds), jobId: parseInt(bulkJobId) })
    });
    showToast('Candidates mass assigned!', 'success');
    setShowBulkAssign(false);
    setActiveIds(new Set());
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
      showToast('Candidate successfully sourced!', 'success');
      setShowQuickParse(false);
      setQuickParseText('');
      fetchCandidates();
    } else {
      showToast('Parse failed.', 'error');
    }
    setIsParsing(false);
  };

  // Collect all unique skills for filter
  const allSkills = [...new Set(candidates.flatMap(c => {
    try { return JSON.parse(c.skillsJson || '[]'); } catch { return []; }
  }))].slice(0, 12);

  // Advanced Boolean Sourcing Parser
  const parseAdvancedSearch = (candidate, query) => {
    if (!query.trim()) return true;
    
    // Normalize and extract tokens, e.g., 'skill:react AND NOT role:manager'
    const text = query.toLowerCase();
    
    // Simplistic evaluation for demo purposes:
    // We treat space as AND by default.
    // If we see OR, we evaluate sides. If we see NOT, we negate.
    const tokens = text.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    
    let isMatch = true;
    let nextOp = 'AND';
    let negateNext = false;
    
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      if (t === 'and') { nextOp = 'AND'; continue; }
      if (t === 'or') { nextOp = 'OR'; continue; }
      if (t === 'not') { negateNext = true; continue; }
      
      // Remove quotes
      t = t.replace(/^["']|["']$/g, '');
      
      let fieldMatch = false;
      let target = t;
      let field = 'all';
      
      if (t.includes(':')) {
        const parts = t.split(':');
        field = parts[0];
        target = parts.slice(1).join(':');
      }
      
      const cName = (candidate.name || '').toLowerCase();
      const cRole = (candidate.role || '').toLowerCase();
      const cExp = (candidate.experience || '').toLowerCase();
      const cSkills = (candidate.skillsJson || '').toLowerCase();
      
      if (field === 'skill' || field === 'skills') {
        fieldMatch = cSkills.includes(target);
      } else if (field === 'role' || field === 'title') {
        fieldMatch = cRole.includes(target);
      } else if (field === 'exp' || field === 'experience') {
        fieldMatch = cExp.includes(target);
      } else {
        fieldMatch = cName.includes(target) || cRole.includes(target) || cSkills.includes(target);
      }
      
      if (negateNext) { fieldMatch = !fieldMatch; negateNext = false; }
      
      if (nextOp === 'AND') isMatch = isMatch && fieldMatch;
      else if (nextOp === 'OR') isMatch = isMatch || fieldMatch;
      
      nextOp = 'AND'; // Default implicit operator
    }
    
    return isMatch;
  };

  const filtered = candidates.filter(c => {
    const matchesSearch = parseAdvancedSearch(c, search);
    const matchesExp = expFilter === 'All' || c.experience?.toLowerCase().includes(expFilter.toLowerCase());
    const matchesSkill = !skillFilter || (() => {
      try { return JSON.parse(c.skillsJson||'[]').includes(skillFilter); } catch { return false; }
    })();
    return matchesSearch && matchesExp && matchesSkill;
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
                Are you sure you want to permanently delete <strong>{candidates.find(c => c.id === candidateToDelete)?.name}</strong>? This will also remove all their applications.
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
            Candidates
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            {candidates.length} profiles in your database
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

      {/* Drag & Drop Upload */}
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
            Drop a resume here
          </p>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>PDF or Word (.docx) · Parsed by Gemini AI</p>
        </div>
      )}

      {/* Filters */}
      {candidates.length > 0 && (
        <div className="anim-fade-up" style={{ display:'flex', gap:12, flexWrap:'wrap', animationDelay:'0.08s' }}>
          <div className="input-search" style={{ flex:1, minWidth:200 }}>
            <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
            <input
              placeholder="Advanced Search: skill:react AND (NOT role:manager)..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
            {search && (
              <button className="btn-icon" style={{width:20,height:20}} onClick={()=>setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Experience filter */}
          <div className="tab-bar">
            {EXP_FILTERS.map(f => (
              <button key={f} className={`tab${expFilter===f?' active':''}`} onClick={()=>setExpFilter(f)}>{f}</button>
            ))}
          </div>

          {/* Skill filter */}
          {allSkills.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {allSkills.slice(0,6).map(skill => (
                <button
                  key={skill}
                  onClick={()=>setSkillFilter(skillFilter===skill?'':skill)}
                  style={{
                    padding:'4px 10px', borderRadius:99,
                    fontSize:11.5, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${skillFilter===skill?'rgba(109,92,255,0.4)':'var(--border)'}`,
                    background: skillFilter===skill?'var(--primary-glow)':'transparent',
                    color: skillFilter===skill?'var(--primary-light)':'var(--text-3)',
                    transition:'all var(--t-fast)',
                  }}
                >{skill}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card anim-fade-up" style={{ animationDelay:'0.12s', overflow:'hidden' }}>
          {/* Table head */}
          <div style={{
            display:'grid', gridTemplateColumns:'40px 2fr 1.5fr 1fr 1fr auto',
            padding:'12px 20px', borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:600, color:'var(--text-4)', letterSpacing:'0.06em', alignItems: 'center'
          }}>
            <input type="checkbox" onChange={toggleSelectAll} checked={filtered.length > 0 && activeIds.size === filtered.length} />
            <span>CANDIDATE</span><span>ROLE</span><span>EXPERIENCE</span><span>SKILLS</span><span>ACTIONS</span>
          </div>

          {filtered.map((c, i) => {
            const [fg, bg] = getAvatarColors(c.name);
            let skills = [];
            try { skills = JSON.parse(c.skillsJson||'[]'); } catch {}
            return (
              <div key={c.id} className="trow" style={{
                display:'grid', gridTemplateColumns:'40px 2fr 1.5fr 1fr 1fr auto',
                padding:'14px 20px', alignItems:'center', gap:12,
                animation:`fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${0.04*i}s both`,
              }}>
                <input type="checkbox" checked={activeIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div className="avatar" style={{ background:bg, color:fg }}>{getInitials(c.name)}</div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{c.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)' }}>{c.email}</div>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--text-2)' }}>{c.role || '—'}</div>
                <div style={{ fontSize:13, color:'var(--text-2)' }}>{c.experience || '—'}</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {skills.slice(0,3).map((s,j) => (
                    <span key={j} style={{
                      padding:'2px 7px', borderRadius:99,
                      fontSize:10.5, fontWeight:600,
                      background:'rgba(109,92,255,0.1)', color:'var(--primary-light)',
                      border:'1px solid rgba(109,92,255,0.2)',
                    }}>{s}</span>
                  ))}
                  {skills.length > 3 && (
                    <span style={{ fontSize:10.5, color:'var(--text-3)', padding:'2px 4px' }}>+{skills.length-3}</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <button className="btn btn-ghost" style={{ padding:'5px 12px', fontSize:12 }} onClick={()=>handleSelectCandidate(c)}>
                    <FileText size={13} /> View
                  </button>
                  <button className="btn-icon btn-danger-ghost" onClick={()=>setCandidateToDelete(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && candidates.length > 0 && (
        <div className="card empty-state anim-fade-up">
          <Search size={32} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--text-2)' }}>No results</p>
          <p style={{ fontSize:13 }}>Try adjusting your search or filters</p>
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
            {activeIds.size} selected
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowBulkAssign(true)}>
            <LayoutList size={14} /> Mass Assign
          </button>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowBulkEmail(true)}>
            <Send size={14} /> Mass Email
          </button>
        </div>
      )}

      {/* Quick Parse Modal */}
      {showQuickParse && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowQuickParse(false)} />
          <div className="drawer" style={{ zIndex: 101, width: 500, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'auto', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Fast Add / Quick Parse</h3>
              <button className="btn-icon" onClick={() => setShowQuickParse(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Paste raw text copied from LinkedIn or any profile. Gemini will extract the details and create a candidate automatically.
            </p>
            <textarea 
              className="input" 
              style={{ width: '100%', minHeight: 200, fontSize: 12, fontFamily: 'monospace' }} 
              placeholder="Paste raw text here..."
              value={quickParseText}
              onChange={e => setQuickParseText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowQuickParse(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isParsing || !quickParseText.trim()} onClick={handleQuickParse}>
                {isParsing ? 'Parsing...' : 'Parse & Save'}
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Mass Email ({activeIds.size} candidates)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input" placeholder="Subject" value={bulkEmailSubject} onChange={e=>setBulkEmailSubject(e.target.value)} />
              <textarea className="input" placeholder="Email body..." style={{ minHeight: 150 }} value={bulkEmailBody} onChange={e=>setBulkEmailBody(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkEmail(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkEmailSubject || !bulkEmailBody} onClick={handleBulkEmail}>
                Send Email
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Mass Assign ({activeIds.size} candidates)</h3>
            <select className="input" style={{ width: '100%', padding: '10px' }} value={bulkJobId} onChange={e=>setBulkJobId(e.target.value)}>
              <option value="">Select a Job...</option>
              {jobs.filter(j=>j.status==='Active').map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkAssign(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!bulkJobId} onClick={handleBulkAssign}>
                Assign
              </button>
            </div>
          </div>
        </>
      )}

      {/* Profile Modal */}
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
              {/* Header */}
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {(() => { const [fg,bg]=getAvatarColors(selectedCandidate.name); return (
                    <div style={{ width:44,height:44,borderRadius:'50%',background:bg,color:fg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700 }}>
                      {getInitials(selectedCandidate.name)}
                    </div>
                  ); })()}
                  <div>
                    <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:18, color:'var(--text-1)' }}>
                      {selectedCandidate.name}
                    </h2>
                    <p style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>{selectedCandidate.role}</p>
                  </div>
                </div>
                <button className="btn-icon" onClick={()=>handleSelectCandidate(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
                {/* Left: details */}
                <div style={{ width: 340, borderRight:'1px solid var(--border)', padding:'20px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:20 }}>
                  <section>
                    <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>CONTACT</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                        <Mail size={14} color="var(--text-3)" /> {selectedCandidate.email || '—'}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                        <Phone size={14} color="var(--text-3)" /> {selectedCandidate.phone || '—'}
                      </div>
                    </div>
                  </section>

                  <div style={{ height:1, background:'var(--border)' }} />

                  {/* COPILOT SECTION */}
                  <section style={{ padding: '16px', background: 'rgba(109, 92, 255, 0.05)', borderRadius: 12, border: '1px solid rgba(109, 92, 255, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Zap size={14} color="var(--primary-light)" />
                      <p style={{ fontSize:11, fontWeight:800, color:'var(--primary-light)', letterSpacing:'0.08em' }}>ATS COPILOT</p>
                    </div>

                    {/* AI Summary */}
                    <div style={{ marginBottom: 16 }}>
                      {!copilotSummary ? (
                        <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={generateSummary} disabled={isSummarizing}>
                          {isSummarizing ? 'Summarizing...' : 'Generate 3-Bullet Summary'}
                        </button>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                          {copilotSummary.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                        </div>
                      )}
                    </div>

                    {/* AI Outreach Draft */}
                    <div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select className="input" style={{ flex: 1, padding: '6px', fontSize: 12 }} value={draftJobId} onChange={e=>setDraftJobId(e.target.value)}>
                          <option value="">Select a Job to pitch...</option>
                          {jobs.filter(j=>j.status==='Active').map(j => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                          ))}
                        </select>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={!draftJobId || isDrafting} onClick={draftEmail}>
                          {isDrafting ? 'Drafting...' : 'Draft'}
                        </button>
                      </div>
                      {copilotDraft && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <textarea className="input" style={{ width: '100%', minHeight: 120, fontSize: 12, resize: 'vertical' }} value={copilotDraft} onChange={e=>setCopilotDraft(e.target.value)} />
                          <button className="btn btn-primary" style={{ width: '100%', fontSize: 12, padding: '6px' }} onClick={() => {
                            showToast('Email processed through mock SMTP relay!', 'success');
                            setCopilotDraft('');
                          }}>
                            <Send size={14} /> Send via ATS Email Hub
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  <div style={{ height:1, background:'var(--border)' }} />

                  <section>
                    <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>EXPERIENCE</p>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <Briefcase size={14} color="var(--text-3)" style={{ marginTop:2, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text-1)' }}>{selectedCandidate.role}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{selectedCandidate.experience}</div>
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

                  <section>
                    <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>SKILLS</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {(() => { try { return JSON.parse(selectedCandidate.skillsJson||'[]'); } catch { return []; } })()
                        .map((skill,i) => (
                          <span key={i} style={{
                            padding:'4px 10px', borderRadius:99,
                            fontSize:12, fontWeight:600,
                            background:'var(--primary-glow)', color:'var(--primary-light)',
                            border:'1px solid rgba(109,92,255,0.25)',
                          }}>{skill}</span>
                        ))}
                    </div>
                  </section>

                  <div style={{ height:1, background:'var(--border)' }} />

                  <section style={{ flex:1, display:'flex', flexDirection:'column' }}>
                    <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-4)', letterSpacing:'0.08em', marginBottom:12 }}>ACTIVITY & NOTES</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                      <textarea 
                        className="input"
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={e=>setNewNote(e.target.value)}
                        style={{ minHeight:60, resize:'vertical', fontSize:13 }}
                      />
                      <button className="btn btn-primary" style={{ alignSelf:'flex-end', padding:'6px 12px', fontSize:12 }} onClick={handleAddNote}>
                        Save Note
                      </button>
                    </div>
                    
                    <div style={{ display:'flex', flexDirection:'column', gap:12, flex:1, overflowY:'auto' }}>
                      {activities.map(act => (
                        <div key={act.id} style={{ padding:12, background:'var(--surface-2)', borderRadius:8, border:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-2)' }}>{act.type}</span>
                            <span style={{ fontSize:11, color:'var(--text-4)' }}>{new Date(act.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize:13, color:'var(--text-1)', whiteSpace:'pre-wrap' }}>{act.content}</div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div style={{ fontSize:13, color:'var(--text-4)', textAlign:'center', marginTop:10 }}>No activity recorded.</div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right: PDF viewer */}
                <div style={{ flex:1, background:'var(--bg)', padding:16, overflow:'hidden' }}>
                  {selectedCandidate.resumeFilePath ? (
                    <iframe
                      src={selectedCandidate.resumeFilePath}
                      style={{ width:'100%', height:'100%', border:'none', borderRadius:10 }}
                      title="Resume"
                    />
                  ) : (
                    <div className="empty-state" style={{ height:'100%' }}>
                      <FileText size={40} />
                      <p style={{ fontSize:14 }}>No resume file attached</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
