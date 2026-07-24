import { useEffect, useState } from 'react';
import { Users, Plus, Shield, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TeamView() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') || user?.role === 'Admin';
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'Recruiter' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    setErr('');
    fetch('/api/auth/team')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load team');
        return r.json();
      })
      .then(d => setTeam(Array.isArray(d) ? d : []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createMember = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    try {
      const res = await fetch('/api/auth/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Create failed');
      flash(`Created ${d.name || d.email}`);
      setShowCreate(false);
      setForm({ email: '', password: '', role: 'Recruiter' });
      load();
    } catch (ex) {
      flash(ex.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (id, role) => {
    if (!isAdmin) return;
    const res = await fetch(`/api/auth/team/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      flash('Role updated');
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.message || 'Role update failed', 'error');
    }
  };

  const removeMember = async (id, email) => {
    if (!isAdmin) return;
    if (!confirm(`Remove ${email} from the team?`)) return;
    const res = await fetch(`/api/auth/team/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      flash('User removed');
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.message || 'Delete failed', 'error');
    }
  };

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: 'var(--surface)', border: `1px solid ${toast.type === 'error' ? 'rgba(185,28,28,0.3)' : 'rgba(4,120,87,0.3)'}`,
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(15,23,42,0.12)',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Team & ownership
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            Desk users for ownership assignment. You sign in as <strong style={{ color: 'var(--text-2)' }}>{user?.name || user?.email}</strong>
            {isAdmin ? ' · Admin' : ' · Recruiter'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <UserPlus size={14} /> Add user
            </button>
          )}
        </div>
      </div>

      <div className="card anim-fade-up" style={{ padding: 16, background: 'var(--primary-glow)', border: '1px solid rgba(37,99,235,0.15)' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <strong>How ownership works:</strong> new candidates, jobs, and clients default to you.
          Use <em>My desk</em> filters on Candidates / Jobs / Clients. Recruiters can claim unassigned
          or reassign their own records; Admins can reassign anything.
        </p>
      </div>

      {err && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13 }}>{err}</div>
      )}

      <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading team…</div>
        ) : team.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <Users size={32} />
            <p>No users found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead className="table-head">
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>User</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Desk label</th>
                {isAdmin && <th style={{ padding: '10px 16px' }} />}
              </tr>
            </thead>
            <tbody>
              {team.map(m => (
                <tr key={m.id} className="trow">
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)',
                        color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(m.name || '??').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{m.name}</span>
                      {m.email === user?.email && (
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>You</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{m.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {isAdmin ? (
                      <select
                        className="input"
                        style={{ width: 130, height: 32, padding: '0 8px', fontSize: 12.5, background: 'var(--surface-2)' }}
                        value={m.role || m.roles?.[0] || 'Recruiter'}
                        onChange={e => setRole(m.id, e.target.value)}
                      >
                        <option value="Recruiter">Recruiter</option>
                        <option value="Admin">Admin</option>
                      </select>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-2)' }}>
                        <Shield size={12} /> {m.role || m.roles?.[0]}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: 12 }}>
                    Matches ownership fields as <code style={{ fontSize: 11 }}>{m.name}</code>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 16px' }}>
                      {m.email !== user?.email && (
                        <button type="button" className="btn-icon" title="Remove" onClick={() => removeMember(m.id, m.email)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && isAdmin && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowCreate(false)} />
          <div className="drawer" style={{
            zIndex: 101, width: 420, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            height: 'auto', borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Add team member
            </h3>
            <form onSubmit={createMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">EMAIL</label>
                <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="recruiter@company.com" />
              </div>
              <div>
                <label className="label">TEMP PASSWORD</label>
                <input className="input" type="text" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" />
              </div>
              <div>
                <label className="label">ROLE</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ background: 'var(--surface-2)' }}>
                  <option value="Recruiter">Recruiter</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                Desk label is derived from the email local-part (e.g. jane.doe@… → “Jane Doe”).
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
