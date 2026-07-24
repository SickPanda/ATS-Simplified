import { useEffect, useState } from 'react';
import { ScrollText, RefreshCw, Download, Filter } from 'lucide-react';
import { downloadCsvExport } from '../lib/export';

const ENTITY_FILTERS = ['All', 'Job', 'Candidate', 'Application', 'Placement', 'Client', 'Submittal', 'System'];

const EXPORTS = [
  { id: 'candidates', label: 'Candidates' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'clients', label: 'Clients' },
  { id: 'placements', label: 'Placements' },
  { id: 'pipeline', label: 'Pipeline' },
];

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleString();
}

export default function AuditView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('All');
  const [exporting, setExporting] = useState(null);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    setErr('');
    const q = entity === 'All' ? '' : `?entityType=${encodeURIComponent(entity)}`;
    fetch(`/api/ats/audit${q ? q + '&take=150' : '?take=150'}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load audit log');
        return r.json();
      })
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entity]);

  const onExport = async (id) => {
    setExporting(id);
    setErr('');
    try {
      await downloadCsvExport(id);
      load(); // refresh so export shows in audit
    } catch (e) {
      setErr(e.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200 }}>
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            Audit &amp; Export
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            Who changed what — and download CSV for ops / finance
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* CSV exports */}
      <div className="card anim-fade-up" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Download size={16} color="var(--primary)" />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Export CSV</h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXPORTS.map(e => (
            <button
              key={e.id}
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12.5 }}
              disabled={exporting === e.id}
              onClick={() => onExport(e.id)}
            >
              <Download size={13} />
              {exporting === e.id ? `Exporting ${e.label}…` : e.label}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, background: 'var(--danger-soft)',
          color: 'var(--danger)', fontSize: 13, border: '1px solid rgba(185,28,28,0.2)',
        }}>
          {err}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} className="anim-fade-up">
        <Filter size={14} color="var(--text-3)" />
        {ENTITY_FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={`tab${entity === f ? ' active' : ''}`}
            onClick={() => setEntity(f)}
            style={{ cursor: 'pointer' }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading audit trail…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <ScrollText size={36} />
            <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>No audit entries yet</p>
            <p style={{ fontSize: 13 }}>Create a job, move a pipeline stage, or export CSV to start the trail.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead className="table-head">
                <tr>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>When</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Who</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Action</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Entity</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="trow">
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }} title={r.createdAt}>
                      {timeAgo(r.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.actorName || 'System'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.actorEmail || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{r.action}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                      {r.entityType}{r.entityId ? ` #${r.entityId}` : ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-1)' }}>{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
