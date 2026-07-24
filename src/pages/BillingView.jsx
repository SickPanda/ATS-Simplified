import { useEffect, useState } from 'react';
import {
  Clock, FileText, Plus, CheckCircle, XCircle, Send, Download, RefreshCw, DollarSign,
} from 'lucide-react';
import { downloadCsvExport } from '../lib/export';

function mondayOf(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export default function BillingView() {
  const [tab, setTab] = useState('timesheets');
  const [timesheets, setTimesheets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ placementId: '', weekStart: mondayOf(), hours: '40', notes: '', submit: true });
  const [selectedTs, setSelectedTs] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [ts, inv, pl] = await Promise.all([
        fetch('/api/ats/timesheets').then(r => r.ok ? r.json() : []),
        fetch('/api/ats/invoices').then(r => r.ok ? r.json() : []),
        fetch('/api/ats/placements').then(r => r.ok ? r.json() : []),
      ]);
      setTimesheets(Array.isArray(ts) ? ts : []);
      setInvoices(Array.isArray(inv) ? inv : []);
      setPlacements(Array.isArray(pl) ? pl : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredTs = timesheets.filter(t => filter === 'All' || t.status === filter);

  const createTs = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/ats/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementId: parseInt(form.placementId, 10),
          weekStart: form.weekStart,
          hours: parseFloat(form.hours),
          notes: form.notes || null,
          submit: !!form.submit,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Create failed');
      flash('Timesheet saved');
      setShowCreate(false);
      setForm({ placementId: '', weekStart: mondayOf(), hours: '40', notes: '', submit: true });
      load();
    } catch (ex) {
      flash(ex.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const act = async (id, action) => {
    const res = await fetch(`/api/ats/timesheets/${id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.ok) {
      flash(`Timesheet ${action}d`);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.message || 'Action failed', 'error');
    }
  };

  const toggleTs = (id) => {
    const n = new Set(selectedTs);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedTs(n);
  };

  const createInvoice = async () => {
    if (selectedTs.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/ats/invoices/from-timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timesheetIds: Array.from(selectedTs) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Invoice failed');
      flash(`Created ${d.invoiceNumber} · $${d.amount}`);
      setSelectedTs(new Set());
      setTab('invoices');
      load();
    } catch (ex) {
      flash(ex.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setInvStatus = async (id, status) => {
    const res = await fetch(`/api/ats/invoices/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: status }),
    });
    if (res.ok) { flash(`Invoice → ${status}`); load(); }
  };

  const exportInv = async (id) => {
    try {
      const res = await fetch(`/api/ats/invoices/${id}/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const approvedSelected = Array.from(selectedTs).every(id => {
    const t = timesheets.find(x => x.id === id);
    return t?.status === 'Approved';
  });

  return (
    <div style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: 'var(--surface)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(185,28,28,0.3)' : 'rgba(4,120,87,0.3)'}`,
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(15,23,42,0.12)',
        }}>{toast.msg}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Time & billing
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            Contractor hours → approve → invoice export
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          {tab === 'timesheets' && (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Log hours
            </button>
          )}
        </div>
      </div>

      <div className="tab-bar" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={`tab${tab === 'timesheets' ? ' active' : ''}`} onClick={() => setTab('timesheets')}>
          <Clock size={13} /> Timesheets
        </button>
        <button type="button" className={`tab${tab === 'invoices' ? ' active' : ''}`} onClick={() => setTab('invoices')}>
          <FileText size={13} /> Invoices
        </button>
      </div>

      {tab === 'timesheets' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {['All', 'Draft', 'Submitted', 'Approved', 'Rejected', 'Invoiced'].map(s => (
              <button key={s} type="button" className={`tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)} style={{ fontSize: 12 }}>
                {s}
              </button>
            ))}
            {selectedTs.size > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginLeft: 'auto', fontSize: 12.5 }}
                disabled={!approvedSelected || busy}
                onClick={createInvoice}
              >
                <DollarSign size={14} /> Invoice {selectedTs.size} approved
              </button>
            )}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
            ) : filteredTs.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <Clock size={32} />
                <p style={{ fontWeight: 600 }}>No timesheets yet</p>
                <p style={{ fontSize: 13 }}>Log hours against a placement after a hire.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead className="table-head">
                  <tr>
                    <th style={{ padding: '10px 12px', width: 36 }} />
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Week</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Contractor / Job</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Client</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Hours</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Bill $</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px 12px' }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredTs.map(t => (
                    <tr key={t.id} className="trow">
                      <td style={{ padding: '10px 12px' }}>
                        {t.status === 'Approved' && (
                          <input type="checkbox" checked={selectedTs.has(t.id)} onChange={() => toggleTs(t.id)} />
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                        {new Date(t.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' – '}
                        {new Date(t.weekEnd || t.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{t.candidateName || '—'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{t.jobTitle}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{t.clientName || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{t.hours}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                        ${Number(t.billAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{t.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {t.status === 'Draft' && (
                          <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => act(t.id, 'submit')}>
                            <Send size={12} /> Submit
                          </button>
                        )}
                        {t.status === 'Submitted' && (
                          <>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--success)' }} onClick={() => act(t.id, 'approve')}>
                              <CheckCircle size={12} />
                            </button>
                            <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger)' }} onClick={() => act(t.id, 'reject')}>
                              <XCircle size={12} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <FileText size={32} />
              <p style={{ fontWeight: 600 }}>No invoices yet</p>
              <p style={{ fontSize: 13 }}>Approve timesheets, select them, then create an invoice.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead className="table-head">
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Invoice</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Client</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Period</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Hours</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px' }} />
                </tr>
              </thead>
              <tbody>
                {invoices.map(i => (
                  <tr key={i.id} className="trow">
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-1)' }}>{i.invoiceNumber}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{i.clientName || `Client #${i.clientId}`}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {new Date(i.periodStart).toLocaleDateString()} – {new Date(i.periodEnd).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>{i.billHours}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      ${Number(i.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        className="input"
                        style={{ width: 100, height: 30, padding: '0 6px', fontSize: 12, background: 'var(--surface-2)' }}
                        value={i.status}
                        onChange={e => setInvStatus(i.id, e.target.value)}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button type="button" className="btn-icon" title="Export CSV" onClick={() => exportInv(i.id)}>
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && (
        <>
          <div className="overlay" style={{ zIndex: 100 }} onClick={() => setShowCreate(false)} />
          <div className="drawer" style={{
            zIndex: 101, width: 440, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            height: 'auto', borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Log timesheet hours</h3>
            <form onSubmit={createTs} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">PLACEMENT *</label>
                <select
                  className="input"
                  required
                  style={{ background: 'var(--surface-2)' }}
                  value={form.placementId}
                  onChange={e => setForm({ ...form, placementId: e.target.value })}
                >
                  <option value="">Select placement…</option>
                  {placements.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.candidateName || p.CandidateName || `Placement #${p.id}`}
                      {' · '}
                      {p.jobTitle || p.JobTitle || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">WEEK START (MON)</label>
                  <input className="input" type="date" required value={form.weekStart} onChange={e => setForm({ ...form, weekStart: e.target.value })} />
                </div>
                <div>
                  <label className="label">HOURS</label>
                  <input className="input" type="number" step="0.25" min="0.25" max="168" required value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">NOTES</label>
                <textarea className="input" rows={2} style={{ height: 'auto' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.submit} onChange={e => setForm({ ...form, submit: e.target.checked })} />
                Submit for approval now
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy || !form.placementId}>
                  {busy ? 'Saving…' : 'Save timesheet'}
                </button>
              </div>
            </form>
            {placements.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 12 }}>
                No placements yet — hire a candidate first (pipeline → placement).
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
