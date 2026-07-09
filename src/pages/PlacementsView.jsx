import { useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle, Users, Landmark, Clock, Phone, Mail, DollarSign, Calendar, Search, MapPin, TrendingUp } from 'lucide-react';

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

  // Totals calculations
  const totalMargin = placements.reduce((acc, p) => acc + (p.grossMargin ?? (p.billRate - p.payRate)), 0);
  const avgBill = placements.length ? placements.reduce((acc, p) => acc + p.billRate, 0) / placements.length : 0;
  const avgPay = placements.length ? placements.reduce((acc, p) => acc + p.payRate, 0) / placements.length : 0;

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

      {activeTab === 'placements' && placements.length > 0 && (
        /* Financial Placement KPIs */
        <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, animationDelay: '0.05s' }}>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="kpi-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle size={18} color="var(--emerald)" /></div>
            <div className="kpi-val">{placements.length}</div>
            <div className="kpi-label">Hired Starts</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.02) 100%)', border: '1px solid rgba(34,211,238,0.2)' }}>
            <div className="kpi-icon" style={{ background: 'rgba(34,211,238,0.15)' }}><DollarSign size={18} color="var(--cyan)" /></div>
            <div className="kpi-val">${avgBill.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Average Bill Rate</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><DollarSign size={18} color="var(--amber)" /></div>
            <div className="kpi-val">${avgPay.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Average Pay Rate</div>
          </div>
          <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(109,92,255,0.1) 0%, rgba(109,92,255,0.02) 100%)', border: '1px solid rgba(109,92,255,0.2)' }}>
            <div className="kpi-icon" style={{ background: 'var(--primary-glow)' }}><TrendingUp size={18} color="var(--primary-light)" /></div>
            <div className="kpi-val">${totalMargin.toFixed(2)}<span style={{ fontSize:13, color:'var(--text-3)' }}>/hr</span></div>
            <div className="kpi-label">Total Gross Margin</div>
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
                          background: sub.status === 'Submitted to Client' ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
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
                    const margin = plc.grossMargin ?? (plc.billRate - plc.payRate);
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
                        <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>
                          Bill: <strong>${plc.billRate}/hr</strong> · Pay: <strong>${plc.payRate}/hr</strong>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)'
                          }}>
                            +${margin.toFixed(2)}/hr
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
