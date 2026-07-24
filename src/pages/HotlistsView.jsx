import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, Plus, Trash2, X, Users, RefreshCw, ChevronRight, Mail, MapPin, Briefcase,
} from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HotlistsView() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [toast, setToast] = useState(null);

  const flash = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadLists = () => {
    setLoading(true);
    fetch('/api/ats/hotlists')
      .then(r => r.ok ? r.json() : [])
      .then(d => setLists(Array.isArray(d) ? d : []))
      .catch(() => setErr('Failed to load hotlists'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLists(); }, []);

  const openList = (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    fetch(`/api/ats/hotlists/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  const createList = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/ats/hotlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    if (res.ok) {
      const h = await res.json();
      setShowCreate(false);
      setName('');
      setDescription('');
      loadLists();
      openList(h.id);
      flash(`Created “${h.name}”`);
    } else {
      const j = await res.json().catch(() => ({}));
      flash(j.message || 'Create failed', 'error');
    }
  };

  const deleteList = async (id, listName) => {
    if (!confirm(`Delete hotlist “${listName}”?`)) return;
    const res = await fetch(`/api/ats/hotlists/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      loadLists();
      flash('Hotlist deleted');
    }
  };

  const removeMember = async (candidateId) => {
    if (!selectedId) return;
    const res = await fetch(`/api/ats/hotlists/${selectedId}/members/${candidateId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      openList(selectedId);
      loadLists();
      flash('Removed from hotlist');
    }
  };

  return (
    <div style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'rgba(185,28,28,0.3)' : 'rgba(4,120,87,0.3)'}`,
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 28px rgba(15,23,42,0.12)',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Hotlists
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            Named shortlists for quick submittals and outreach — add people from Candidates
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={loadLists}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New hotlist
          </button>
        </div>
      </div>

      {err && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>{err}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 16, minHeight: 420 }}>
        {/* List pane */}
        <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
          {loading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
          ) : lists.length === 0 ? (
            <div className="empty-state" style={{ padding: 36 }}>
              <Flame size={32} />
              <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>No hotlists yet</p>
              <p style={{ fontSize: 13 }}>Create one, then multi-select candidates and “Add to hotlist”.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {lists.map(h => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => openList(h.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: selectedId === h.id ? 'var(--primary-glow)' : 'transparent',
                    textAlign: 'left', fontFamily: 'inherit', width: '100%',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: selectedId === h.id ? 'var(--primary)' : 'var(--surface-2)',
                    color: selectedId === h.id ? '#fff' : 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Flame size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)' }}>{h.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                      {h.memberCount ?? 0} people · {timeAgo(h.updatedAt)}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-4)" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden', minHeight: 400 }}>
          {!selectedId ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <Users size={36} />
              <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>Select a hotlist</p>
              <p style={{ fontSize: 13 }}>Or create a new one to start building a shortlist.</p>
            </div>
          ) : detailLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading members…</div>
          ) : !detail ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Could not load hotlist</div>
          ) : (
            <>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{detail.name}</h3>
                  {detail.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{detail.description}</p>
                  )}
                  <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 6 }}>
                    {detail.memberCount} members · by {detail.ownerName || '—'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to="/candidates" className="btn btn-ghost" style={{ fontSize: 12.5, textDecoration: 'none' }}>
                    <Plus size={13} /> Add from Candidates
                  </Link>
                  <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteList(detail.id, detail.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {(detail.members || []).length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>Empty hotlist</p>
                  <p style={{ fontSize: 13 }}>Go to Candidates, select people, then “Add to hotlist”.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead className="table-head">
                      <tr>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Candidate</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Role</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Location</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Auth</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left' }}>Added</th>
                        <th style={{ padding: '10px 16px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.members.map(m => {
                        const c = m.candidate || {};
                        return (
                          <tr key={m.id} className="trow">
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Mail size={11} /> {c.email || '—'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Briefcase size={12} color="var(--text-4)" /> {c.role || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: 12.5 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} /> {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>{c.workAuthorization || '—'}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>{timeAgo(m.addedAt)}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <button type="button" className="btn-icon" title="Remove" onClick={() => removeMember(c.id)}>
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowCreate(false)} />
          <div className="drawer" style={{
            zIndex: 101, width: 420, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            height: 'auto', borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New hotlist</h3>
            <form onSubmit={createList} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">NAME</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. React seniors — Acme" autoFocus />
              </div>
              <div>
                <label className="label">DESCRIPTION (optional)</label>
                <textarea className="input" rows={3} style={{ height: 'auto' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Why this list exists…" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Create</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
