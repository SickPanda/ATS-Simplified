import { useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle, Users, Landmark, Clock, Phone, Mail, DollarSign, Calendar, Search, MapPin, TrendingUp, Download } from 'lucide-react';
import { RateBadge } from '../components/RateFields';
import { marginPercent, unitSuffix, money, isAnnual } from '../lib/rates';
import { downloadCsvExport } from '../lib/export';

export default function PlacementsView() {
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'placements'
  const [submissions, setSubmissions] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [search, setSearch] = useState('');

  const fetchSubmissions = () => {
    fetch('/api/ats/submittals')
      .then(res => res.json())
      .then(setSubmissions)
      .catch(console.error);
  };

  const fetchPlacements = () => {
    fetch('/api/ats/placements')
      .then(res => res.json())
      .then(setPlacements)
      .catch(console.error);
  };

  useEffect(() => {
    fetchSubmissions();
    fetchPlacements();
  }, []);

  // Normalize to hourly for KPIs (2080 hrs/yr) so mixed units still compare
  const toHr = (amount, unit) => {
    const n = Number(amount) || 0;
    return String(unit || '').toLowerCase() === 'annual' ? n / 2080 : n;
  };
  const totalMargin = placements.reduce((acc, p) => {
    const bill = toHr(p.billRate, p.rateUnit);
    const pay = toHr(p.payRate, p.rateUnit);
    return acc + (bill - pay);
  }, 0);
  const avgBill = placements.length
    ? placements.reduce((acc, p) => acc + toHr(p.billRate, p.rateUnit), 0) / placements.length
    : 0;
  const avgPay = placements.length
    ? placements.reduce((acc, p) => acc + toHr(p.payRate, p.rateUnit), 0) / placements.length
    : 0;
  const avgMarginPct = avgBill > 0 ? ((avgBill - avgPay) / avgBill) * 100 : 0;

  const filteredSubmissions = submissions.filter(s =>
    !search ||
    s.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
    s.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
    s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    s.jobCode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPlacements = placements.filter(p =>
    !search ||
    p.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
    p.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.jobCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Pipeline & Placements
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Monitor recruiter submissions, client approvals, and hired onboarding margins
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12.5 }}
            onClick={() => downloadCsvExport(activeTab === 'placements' ? 'placements' : 'pipeline').catch(e => alert(e.message))}
          >
            <Download size={14} /> Export
          </button>
          {/* Tab switcher */}
          <div className="tab-bar">
            <button 
              className={`tab${activeTab === 'submissions' ? ' active' : ''}`} 
              onClick={() => { setActiveTab('submissions'); setSearch(''); }}
            >
              Submissions ({submissions.length})
            </button>
            <button 
              className={`tab${activeTab === 'placements' ? ' active' : ''}`} 
              onClick={() => { setActiveTab('placements'); setSearch(''); }}
            >
              Placements ({placements.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'placements' && placements.length > 0 && (
        /* Financial Placement KPIs */
        <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animationDelay: '0.05s' }}>
          <div className="kpi-card kpi-success">
            <div className="kpi-icon" style={{ background: 'var(--success-soft)' }}><CheckCircle size={18} color="var(--success)" /></div>
            <div className="kpi-val">{placements.length}</div>
            <div className="kpi-label">Hired Starts</div>
          </div>
          <div className="kpi-card kpi-primary">
            <div className="kpi-icon"><DollarSign size={18} color="var(--primary)" /></div>
            <div className="kpi-val">${avgBill.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Average Bill Rate</div>
          </div>
          <div className="kpi-card kpi-muted">
            <div className="kpi-icon" style={{ background: 'var(--surface-3)' }}><DollarSign size={18} color="var(--text-2)" /></div>
            <div className="kpi-val">${avgPay.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Average Pay Rate</div>
          </div>
          <div className="kpi-card kpi-primary">
            <div className="kpi-icon"><TrendingUp size={18} color="var(--primary)" /></div>
            <div className="kpi-val">${totalMargin.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Total Gross Margin · avg {avgMarginPct.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="anim-fade-up" style={{ display:'flex', gap:12, animationDelay:'0.05s' }}>
        <div className="input-search" style={{ flex:1, maxWidth:400 }}>
          <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
          <input
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data tables */}
      <div className="card anim-fade-up" style={{ overflow: 'hidden', animationDelay:'0.1s' }}>
        {activeTab === 'submissions' ? (
          /* SUBMISSIONS TABLE */
          filteredSubmissions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>SUBMISSION ID</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>APPLICANT</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CLIENT ACCOUNT</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>REQUIREMENT / JOB</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>RECRUITER</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>SUBMITTED ON</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600, width:140 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub, idx) => (
                    <tr key={sub.id} className="trow" style={{ borderBottom: idx < filteredSubmissions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-3)' }}>
                        #SUB-{sub.id}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{sub.candidateName}</div>
                        <div style={{ display:'flex', gap:6, fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                          <span>{sub.candidateEmail}</span>
                          {sub.candidatePhone && <span>• {sub.candidatePhone}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-2)' }}>
                        {sub.clientName}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{sub.jobTitle}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Code: {sub.jobCode}</div>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>
                        {sub.primaryRecruiter}
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                          background: sub.status === 'Submitted to Client' ? 'var(--primary-glow)' : 'var(--surface-2)',
                          color: sub.status === 'Submitted to Client' ? 'var(--cyan)' : 'var(--text-3)',
                        }}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <ArrowRightLeft size={36} color="var(--text-4)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>No submissions log</p>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Submit candidates through requirement boards to see them here.</p>
            </div>
          )
        ) : (
          /* PLACEMENTS TABLE */
          filteredPlacements.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>PLACEMENT CODE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>EMPLOYEE / START</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CLIENT ACCOUNT</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>REQUIREMENT / TITLE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>BILL/PAY RATE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>GROSS MARGIN</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>START DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlacements.map((plc, idx) => {
                    const margin = plc.grossMargin ?? ((Number(plc.billRate) || 0) - (Number(plc.payRate) || 0));
                    const mp = plc.marginPercent ?? marginPercent(plc.billRate, plc.payRate);
                    const s = unitSuffix(plc.rateUnit);
                    return (
                      <tr key={plc.id} className="trow" style={{ borderBottom: idx < filteredPlacements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-3)' }}>
                          #PLC-{plc.id}
                        </td>
                        <td style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-1)' }}>
                          {plc.candidateName}
                        </td>
                        <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-2)' }}>
                          {plc.clientName}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{plc.jobTitle}</div>
                          <div style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>Req Code: {plc.jobCode}</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <RateBadge billRate={plc.billRate} payRate={plc.payRate} rateUnit={plc.rateUnit} />
                          <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                            {isAnnual(plc.rateUnit) ? 'Annual' : 'Hourly'} rates
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: 'var(--success-soft)', color: 'var(--success)'
                          }}>
                            +${money(margin)}{s} · {mp}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>
                          {new Date(plc.startDate).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <CheckCircle size={36} color="var(--text-4)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>No hires on file</p>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Promote candidates to 'Hired' stage in Pipeline Board to create placements.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
