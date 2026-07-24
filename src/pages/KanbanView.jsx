import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, X, Search, Calendar, Send, CalendarPlus,
  CheckCircle2, AlertCircle, ChevronRight, Sparkles, Phone, Mail
} from 'lucide-react';
import RateFields from '../components/RateFields';
import { STAGES, getStage, ACTIVE_STEPS } from '../lib/stages';
import StageProgress from '../components/StageProgress';

/**
 * Staffing pipeline — list + stage model (not Kanban).
 * Stage colors = ordered blue ladder (shared app-wide via stages.js).
 */

const AVATARS = [
  { bg: '#eff6ff', fg: '#1d4ed8' },
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#f1f5f9', fg: '#475569' },
  { bg: '#e0e7ff', fg: '#3730a3' },
  { bg: '#ecfdf5', fg: '#047857' },
  { bg: '#f8fafc', fg: '#334155' },
];

function initials(name) {
  return name?.split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}
function avatarStyle(name) {
  let h = 0;
  for (let i = 0; i < (name?.length || 0); i++) h = (h * 31 + name.charCodeAt(i)) % AVATARS.length;
  return AVATARS[Math.abs(h)];
}
function stageMeta(id) {
  const s = getStage(id);
  return { ...s, color: s.colorHex, soft: s.softHex };
}
function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return '1 day';
  if (d < 14) return `${d} days`;
  return new Date(dateStr).toLocaleDateString();
}

export default function KanbanView({ isEmbedded = false }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stageFilter, setStageFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [submittingApp, setSubmittingApp] = useState(null);
  const [submittalSummary, setSubmittalSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [interviewingApp, setInterviewingApp] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [placingApp, setPlacingApp] = useState(null);
  const [payRate, setPayRate] = useState('');
  const [billRate, setBillRate] = useState('');
  const [rateUnit, setRateUnit] = useState('Hourly');
  const [toast, setToast] = useState(null);
  const [movingId, setMovingId] = useState(null);

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApps = () =>
    fetch(`/api/ats/jobs/${id}/applications`)
      .then(r => r.json())
      .then(data => {
        setApplications(data);
        setSelectedId(prev => {
          if (prev && data.some(a => a.id === prev)) return prev;
          return data[0]?.id ?? null;
        });
      });

  useEffect(() => {
    fetch('/api/ats/jobs').then(r => r.json()).then(jobs => {
      setJob(jobs.find(j => j.id === parseInt(id)));
    });
    fetchApps();
    fetch('/api/ats/candidates').then(r => r.json()).then(setCandidates);
  }, [id]);

  const setStage = async (app, stage) => {
    if (app.stage === stage) return;
    setMovingId(app.id);
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, stage } : a));
    await fetch(`/api/ats/applications/${app.id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage),
    });
    setMovingId(null);
  };

  const assignCandidate = async (candidateId) => {
    setAssigning(candidateId);
    const r = await fetch('/api/ats/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, jobId: parseInt(id), matchScore: 0 }),
    });
    if (r.ok) {
      setShowAssign(false);
      setAssignSearch('');
      await fetchApps();
      showToast('Candidate added to this requirement', 'success');
    } else showToast(await r.text());
    setAssigning(null);
  };

  const submitToClient = async (e) => {
    e.preventDefault();
    if (!job?.clientId) {
      showToast('This job has no client assigned. Edit the requirement and set a client first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/ats/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: submittingApp.candidateId,
          clientId: job.clientId,
          jobId: job.id,
          summary: submittalSummary,
          status: 'Submitted to Client',
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const appId = submittingApp.id;
        // Optimistic: move to Submitted stage
        setApplications(prev => prev.map(a =>
          a.id === appId ? { ...a, stage: data.stage || 'Submitted' } : a
        ));
        if (selectedId === appId) {
          setSelectedId(appId); // keep selection; stage comes from apps refresh
        }
        setSubmittingApp(null);
        setSubmittalSummary('');
        showToast(data.message || 'Submitted to client · stage → Submitted to Client', 'success');
        await fetchApps();
      } else {
        const msg = data.message || (typeof data === 'string' ? data : 'Submit failed');
        showToast(msg, 'error');
      }
    } catch {
      showToast('Could not reach server to submit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scheduleInterview = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/ats/applications/${interviewingApp.id}/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date(interviewDate).toISOString() }),
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
        showToast('Calendar invite downloaded', 'success');
      }
      await setStage(interviewingApp, 'Interview');
    }
    setInterviewingApp(null);
    setInterviewDate('');
    fetchApps();
  };

  const openPlacement = (app) => {
    setPlacingApp(app);
    setBillRate(job?.billRate != null ? String(job.billRate) : '');
    setPayRate(job?.payRate != null ? String(job.payRate) : '');
    setRateUnit(job?.rateUnit || 'Hourly');
  };

  const markPlaced = async (e) => {
    e.preventDefault();
    await fetch(`/api/ats/applications/${placingApp.id}/placements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payRate: parseFloat(payRate),
        billRate: parseFloat(billRate),
        rateUnit: rateUnit || 'Hourly',
        startDate: new Date().toISOString(),
      }),
    });
    setPlacingApp(null);
    setPayRate('');
    setBillRate('');
    setRateUnit('Hourly');
    fetchApps();
    showToast('Placement recorded', 'success');
  };

  const counts = useMemo(() => {
    const m = { All: applications.length };
    STAGES.forEach(s => { m[s.id] = 0; });
    applications.forEach(a => { if (m[a.stage] != null) m[a.stage]++; });
    return m;
  }, [applications]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter(a => stageFilter === 'All' || a.stage === stageFilter)
      .filter(a => {
        if (!q) return true;
        const n = a.candidate?.name?.toLowerCase() || '';
        const r = a.candidate?.role?.toLowerCase() || '';
        const e = a.candidate?.email?.toLowerCase() || '';
        return n.includes(q) || r.includes(q) || e.includes(q);
      })
      .sort((a, b) => {
        // Active stages first, then by match score, then recency
        const order = STAGES.map(s => s.id);
        const di = order.indexOf(a.stage) - order.indexOf(b.stage);
        if (di !== 0) return di;
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [applications, stageFilter, search]);

  const selected = rows.find(a => a.id === selectedId) || applications.find(a => a.id === selectedId) || null;
  const assignedIds = new Set(applications.map(a => a.candidateId ?? a.candidate?.id));
  const pool = candidates.filter(c => !assignedIds.has(c.id));
  const poolFiltered = pool.filter(c => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  if (!job) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 10 }}>
        <div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        Loading requirement…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#fff', border: `1px solid ${toast.type === 'error' ? 'rgba(185,28,28,0.25)' : 'rgba(4,120,87,0.3)'}`,
          padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} color="var(--danger)" /> : <CheckCircle2 size={16} color="var(--success)" />}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.msg}</span>
          <button type="button" className="btn-icon" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div style={{
        flexShrink: 0, background: '#fff', borderBottom: '1px solid var(--border)',
        padding: isEmbedded ? '12px 20px' : '14px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!isEmbedded && (
                <Link to="/jobs" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
                  <ArrowLeft size={14} /> Jobs
                </Link>
              )}
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
                fontSize: isEmbedded ? 16 : 18, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0,
              }}>
                {isEmbedded ? 'Candidates on this req' : job.title}
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)',
              }}>
                {applications.length} total
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '4px 0 0' }}>
              Status per person · progress bars show how far along they are (1→{ACTIVE_STEPS})
            </p>
          </div>
          <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAssign(true)}>
            <UserPlus size={14} /> Add candidate
          </button>
        </div>

        {/* Color legend — one ladder, not random hues */}
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', letterSpacing: '0.06em' }}>
            PROGRESS
          </span>
          {STAGES.filter(s => s.id !== 'Rejected').map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {i > 0 && <ChevronRight size={12} color="var(--text-4)" />}
              <span style={{
                width: 10, height: 10, borderRadius: 2, background: s.colorHex,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
                {s.step}. {s.label}
              </span>
            </div>
          ))}
          <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: getStage('Rejected').colorHex }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>Out = Rejected</span>
          </div>
        </div>

        {/* Stage filters */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setStageFilter('All')}
            style={filterChip(stageFilter === 'All', '#0f172a', '#e2e8f0')}
          >
            All <strong style={{ marginLeft: 4 }}>{counts.All}</strong>
          </button>
          {STAGES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStageFilter(s.id)}
              style={filterChip(stageFilter === s.id, s.colorHex, s.softHex)}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: s.colorHex, display: 'inline-block' }} />
              {s.label} <strong style={{ marginLeft: 4 }}>{counts[s.id] || 0}</strong>
            </button>
          ))}
          <div className="input-search" style={{ marginLeft: 'auto', width: 220, height: 34, padding: '4px 10px' }}>
            <Search size={13} color="var(--text-4)" />
            <input
              placeholder="Search name, role, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 12.5 }}
            />
          </div>
        </div>
      </div>

      {/* Split: list + detail */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: 0 }}>
        {/* List */}
        <div style={{ overflow: 'auto', borderRight: selected ? '1px solid var(--border)' : 'none' }}>
          {rows.length === 0 ? (
            <div className="empty-state" style={{ padding: 56 }}>
              <UserPlus size={32} />
              <p style={{ fontWeight: 700, color: 'var(--text-2)', fontSize: 15 }}>
                {applications.length === 0 ? 'No candidates on this requirement yet' : 'No matches for this filter'}
              </p>
              <p style={{ fontSize: 13, maxWidth: 320 }}>
                {applications.length === 0
                  ? 'Add people from your talent bench and move them through stages with the status control.'
                  : 'Try another stage tab or clear search.'}
              </p>
              {applications.length === 0 && (
                <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowAssign(true)}>
                  <UserPlus size={14} /> Add first candidate
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={th}>Candidate</th>
                  <th style={th}>Stage</th>
                  <th style={th}>Level</th>
                  <th style={th}>Match</th>
                  <th style={th}>In pipeline</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(app => {
                  const name = app.candidate?.name || 'Unknown';
                  const av = avatarStyle(name);
                  const st = stageMeta(app.stage);
                  const active = selectedId === app.id;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedId(app.id)}
                      style={{
                        background: active ? 'var(--primary-glow)' : '#fff',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        boxShadow: active ? 'inset 3px 0 0 var(--primary)' : 'none',
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, background: av.bg, color: av.fg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0,
                          }}>
                            {initials(name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                              {app.candidate?.role || '—'}
                              {app.candidate?.workAuthorization ? ` · ${app.candidate.workAuthorization}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={td} onClick={e => e.stopPropagation()}>
                        <select
                          value={app.stage}
                          disabled={movingId === app.id}
                          onChange={e => setStage(app, e.target.value)}
                          style={{
                            appearance: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 28px 6px 10px',
                            borderRadius: 8,
                            border: `1px solid ${st.color}40`,
                            background: `${st.soft} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center`,
                            color: st.color,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            minWidth: 120,
                          }}
                        >
                          {STAGES.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.step > 0 ? `${s.step}. ` : ''}{s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={td}>
                        <StageProgress stageId={app.stage} />
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3, fontWeight: 600 }}>
                          {st.step > 0 ? `${st.step}/${ACTIVE_STEPS}` : 'Out'}
                        </div>
                      </td>
                      <td style={td}>
                        {app.matchScore > 0 ? (
                          <span className={`score ${app.matchScore >= 70 ? 'score-hi' : app.matchScore >= 40 ? 'score-mid' : 'score-lo'}`}>
                            {app.matchScore}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td, color: 'var(--text-3)', fontSize: 12.5 }}>
                        {timeAgo(app.appliedAt)}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {job.clientId && ['Applied', 'Screened'].includes(app.stage) && (
                            <button type="button" style={actionBtn('#0ea5e9')} onClick={() => setSubmittingApp(app)}>
                              <Send size={12} /> Submit to client
                            </button>
                          )}
                          {app.stage === 'Submitted' && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#3b82f6', alignSelf: 'center' }}>On client desk</span>
                          )}
                          {['Submitted', 'Interview', 'Screened'].includes(app.stage) && (
                            <button type="button" style={actionBtn('#b45309')} onClick={() => setInterviewingApp(app)}>
                              <CalendarPlus size={12} /> Client interview
                            </button>
                          )}
                          {['Interview', 'Offer', 'Hired'].includes(app.stage) && (
                            <button type="button" style={actionBtn('#047857')} onClick={() => openPlacement(app)}>
                              <CheckCircle2 size={12} /> Place
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <aside style={{
            background: '#fff', overflowY: 'auto', padding: '20px 18px 28px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {(() => {
              const name = selected.candidate?.name || 'Unknown';
              const av = avatarStyle(name);
              const st = stageMeta(selected.stage);
              const c = selected.candidate || {};
              return (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: av.bg, color: av.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15,
                    }}>
                      {initials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{c.role || '—'}</div>
                      <span style={{
                        display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 6, background: st.soft, color: st.color,
                      }}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {selected.matchScore > 0 && (
                    <div style={{
                      padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Sparkles size={15} color="var(--primary)" />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)' }}>MATCH TO THIS REQ</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{selected.matchScore}%</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
                        <Mail size={13} color="var(--text-4)" /> {c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-2)' }}>
                        <Phone size={13} color="var(--text-4)" /> {c.phone}
                      </div>
                    )}
                    {(c.city || c.state) && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        {[c.city, c.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {c.workAuthorization && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        Auth: <strong>{c.workAuthorization}</strong>
                      </div>
                    )}
                    {c.experience && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        Exp: <strong>{c.experience}</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', marginBottom: 8 }}>
                      STAGE · LEVEL {stageMeta(selected.stage).step || '—'}/{ACTIVE_STEPS}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <StageProgress stageId={selected.stage} size={10} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {STAGES.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStage(selected, s.id)}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                            border: selected.stage === s.id ? `1.5px solid ${s.colorHex}` : '1px solid var(--border)',
                            background: selected.stage === s.id ? s.softHex : '#fff',
                            color: selected.stage === s.id ? s.colorHex : 'var(--text-2)',
                            fontFamily: 'inherit',
                          }}
                        >
                          {s.step > 0 ? `${s.step}. ` : ''}{s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                    {job.clientId && ['Applied', 'Screened'].includes(selected.stage) && (
                      <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSubmittingApp(selected)}>
                        <Send size={14} /> Submit to client
                      </button>
                    )}
                    {selected.stage === 'Submitted' && (
                      <div style={{
                        padding: '10px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                        background: 'var(--stage-3-soft)', color: 'var(--stage-3)', border: '1px solid rgba(59,130,246,0.25)',
                      }}>
                        On client desk — next: client interview or offer
                      </div>
                    )}
                    {['Submitted', 'Interview', 'Screened', 'Offer'].includes(selected.stage) && (
                      <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setInterviewingApp(selected)}>
                        <CalendarPlus size={14} /> Schedule client interview
                      </button>
                    )}
                    {['Interview', 'Offer', 'Hired'].includes(selected.stage) && (
                      <button type="button" className="btn btn-ghost" style={{ width: '100%', borderColor: 'rgba(4,120,87,0.35)', color: 'var(--success)' }} onClick={() => openPlacement(selected)}>
                        <CheckCircle2 size={14} /> Place with rates
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Added {timeAgo(selected.appliedAt)}
                    <ChevronRight size={11} style={{ marginLeft: 'auto' }} />
                  </div>
                </>
              );
            })()}
          </aside>
        )}
      </div>

      {/* Assign drawer */}
      {showAssign && (
        <>
          <div className="overlay" onClick={() => setShowAssign(false)} />
          <div className="drawer" style={{ width: 420 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, margin: 0 }}>
                Add to requirement
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{job.title}</p>
              <div className="input-search" style={{ marginTop: 12 }}>
                <Search size={14} color="var(--text-4)" />
                <input placeholder="Search talent bench…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {poolFiltered.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p style={{ fontWeight: 600 }}>No available candidates</p>
                  <p style={{ fontSize: 12 }}>Parse resumes first or everyone is already on this req.</p>
                </div>
              ) : poolFiltered.map(c => {
                const av = avatarStyle(c.name);
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 12, marginBottom: 6, border: '1px solid var(--border)', background: '#fff',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: av.bg, color: av.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12,
                    }}>
                      {initials(c.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.role}</div>
                    </div>
                    <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} disabled={assigning === c.id} onClick={() => assignCandidate(c.id)}>
                      {assigning === c.id ? '…' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {submittingApp && (
        <>
          <div className="overlay" onClick={() => setSubmittingApp(null)} />
          <div className="drawer" style={{ width: 420 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, margin: 0 }}>Submit to client</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{submittingApp.candidate?.name}</p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setSubmittingApp(null)}><X size={16} /></button>
            </div>
            <form onSubmit={submitToClient} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div style={{
                padding: 12, borderRadius: 10, background: 'var(--primary-glow)', border: '1px solid rgba(37,99,235,0.2)',
                fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45,
              }}>
                This packages the candidate for the client and moves their pipeline stage to
                <strong style={{ color: 'var(--primary)' }}> Submitted to Client</strong>
                {' '}(before interview / offer).
              </div>
              <div>
                <label className="label">NOTES FOR CLIENT</label>
                <textarea className="input" rows={5} style={{ resize: 'vertical' }} placeholder="Why they fit, rate notes, availability…" value={submittalSummary} onChange={e => setSubmittalSummary(e.target.value)} />
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSubmittingApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit to client'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {interviewingApp && (
        <>
          <div className="overlay" onClick={() => setInterviewingApp(null)} />
          <div className="drawer" style={{ width: 400 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, margin: 0 }}>Schedule interview</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{interviewingApp.candidate?.name}</p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setInterviewingApp(null)}><X size={16} /></button>
            </div>
            <form onSubmit={scheduleInterview} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div>
                <label className="label">DATE & TIME</label>
                <input type="datetime-local" className="input" required value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setInterviewingApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Create invite</button>
              </div>
            </form>
          </div>
        </>
      )}

      {placingApp && (
        <>
          <div className="overlay" onClick={() => setPlacingApp(null)} />
          <div className="drawer" style={{ width: 440 }}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--emerald)', margin: 0 }}>Place candidate</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{placingApp.candidate?.name}</p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setPlacingApp(null)}><X size={16} /></button>
            </div>
            <form onSubmit={markPlaced} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <RateFields
                billRate={billRate}
                payRate={payRate}
                rateUnit={rateUnit}
                required
                onChange={({ billRate: b, payRate: p, rateUnit: u }) => {
                  setBillRate(b);
                  setPayRate(p);
                  setRateUnit(u);
                }}
              />
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPlacingApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Confirm hire</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  background: '#fff',
};

const td = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};

function filterChip(active, color, soft) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 99,
    border: active ? `1.5px solid ${color}` : '1px solid var(--border)',
    background: active ? soft : '#fff',
    color: active ? color : 'var(--text-2)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

function actionBtn(_color) {
  // One action style — brand blue only (no rainbow chips)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid var(--border)',
    background: '#fff',
    color: 'var(--primary-dark)',
    fontSize: 11,
    fontWeight: 700,
    padding: '5px 9px',
    borderRadius: 7,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
