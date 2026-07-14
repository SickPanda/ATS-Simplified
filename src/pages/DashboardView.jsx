import { useEffect, useState } from 'react';
import { Briefcase, Users, TrendingUp, CheckCircle, ArrowUpRight, Clock, UserPlus, Star, MessageSquare, ListTodo, FileText, HelpCircle, ArrowRightLeft, DollarSign, Bookmark, Landmark } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FUNNEL_COLORS = ['#22d3ee', '#a78bfa', '#f59e0b', '#6d5cff', '#10b981'];

function StatCard({ icon: Icon, label, value, subtext, color, delay = 0 }) {
  return (
    <div className="card-lift" style={{
      padding: '18px 20px',
      animationDelay: `${delay}s`,
      animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {label}
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 26,
            color: 'var(--text-1)', lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>{value}</p>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)' }}>
        {subtext}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-hover)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
      }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 2 }}>{label}</p>
        <p style={{ color: 'var(--text-1)', fontWeight: 700 }}>{payload[0].value} candidates</p>
      </div>
    );
  }
  return null;
};

const TrendTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-hover)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12.5,
      }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4, fontWeight:600 }}>{label}</p>
        <p style={{ color: '#22d3ee' }}>Submissions: <strong>{payload[0].value}</strong></p>
        <p style={{ color: '#10b981' }}>Client Sends: <strong>{payload[1].value}</strong></p>
      </div>
    );
  }
  return null;
};

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const AVATAR_COLORS = [
  ['#6d5cff','#1a1650'],['#22d3ee','#0a3040'],['#10b981','#0a2820'],
  ['#f59e0b','#3d2800'],['#f43f5e','#3d0f18'],['#a78bfa','#1e1040'],
];
function getAvatarColors(name) {
  let h = 0;
  for (let i = 0; i < (name?.length || 0); i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

const MOCK_TREND = [
  { day: 'Mon', Submissions: 12, ClientSends: 8 },
  { day: 'Tue', Submissions: 19, ClientSends: 12 },
  { day: 'Wed', Submissions: 15, ClientSends: 10 },
  { day: 'Thu', Submissions: 28, ClientSends: 18 },
  { day: 'Fri', Submissions: 22, ClientSends: 15 },
];

export default function DashboardView() {
  const [stats, setStats] = useState({ totalJobs: 0, totalCandidates: 0, activeApplications: 0, hiredCandidates: 0 });
  const [analytics, setAnalytics] = useState({ 
    funnel: [], recentCandidates: [], 
    metrics: { totalMargin: 0, avgTimeToHire: 0, dropoffRate: 0 } 
  });
  const [jobs, setJobs] = useState([]);
  const [clientsCount, setClientsCount] = useState(0);

  useEffect(() => {
    fetch('/api/ats/dashboard')
      .then(r => r.json())
      .then(d => setStats({
        totalJobs: d.totalJobs ?? d.TotalJobs ?? 0,
        totalCandidates: d.totalCandidates ?? d.TotalCandidates ?? 0,
        activeApplications: d.activeApplications ?? d.ActiveApplications ?? 0,
        hiredCandidates: d.hiredCandidates ?? d.HiredCandidates ?? 0,
      }))
      .catch(console.error);

    fetch('/api/ats/analytics')
      .then(r => r.json())
      .then(d => setAnalytics({
        funnel: (d.funnel ?? d.Funnel ?? []).map(f => ({ Stage: f.stage ?? f.Stage, Count: f.count ?? f.Count })),
        recentCandidates: (d.recentCandidates ?? d.RecentCandidates ?? []).map(c => ({
          id: c.id ?? c.Id,
          name: c.name ?? c.Name,
          role: c.role ?? c.Role,
          createdAt: c.createdAt ?? c.CreatedAt,
        })),
        metrics: {
          totalMargin: d.metrics?.totalMargin ?? d.Metrics?.TotalMargin ?? 0,
          avgTimeToHire: d.metrics?.avgTimeToHire ?? d.Metrics?.AvgTimeToHire ?? 0,
          dropoffRate: d.metrics?.dropoffRate ?? d.Metrics?.DropoffRate ?? 0,
        }
      }))
      .catch(console.error);

    fetch('/api/ats/jobs').then(r => r.json()).then(setJobs).catch(console.error);
    fetch('/api/ats/clients').then(r => r.json()).then(d => setClientsCount(d.length)).catch(console.error);
  }, []);

  const STAT_CARDS = [
    { icon: Users,       label: 'Applicants',       value: stats.totalCandidates,  subtext: 'Total candidates sourced', color: '#22d3ee' },
    { icon: Briefcase,   label: 'Open Requirements', value: stats.totalJobs,        subtext: 'Active job openings',      color: '#a78bfa' },
    { icon: ArrowRightLeft, label: 'Client Sends',    value: stats.activeApplications, subtext: 'Candidates in review',     color: '#f59e0b' },
    { icon: CheckCircle, label: 'Placements',       value: stats.hiredCandidates,  subtext: 'Hired & active starts',    color: '#10b981' },
    { icon: ListTodo,    label: 'Open Actions',     value: '4 pending',            subtext: '3 Tasks, 1 Alert pending', color: '#f43f5e' },
  ];

  const RECRUITER_KPI = [
    { name: 'Aazam Qureshi', role: 'Lead Recruiter', submissions: 48, clientSends: 32, interviews: 12, placements: 4 },
    { name: 'Sarah Jenkins', role: 'Technical Recruiter', submissions: 35, clientSends: 20, interviews: 8, placements: 2 },
    { name: 'Michael Chang', role: 'Sourcing Specialist', submissions: 52, clientSends: 15, interviews: 5, placements: 1 },
    { name: 'ATS AI Autopilot', role: 'Copilot Parser', submissions: 88, clientSends: 45, interviews: 18, placements: 3 }
  ];

  const RECENT_CONFIRMATIONS = [
    { candidate: 'David Miller', client: 'Acme Corp', role: 'Senior React Developer', pay: 85, bill: 115, recruiter: 'Aazam Qureshi', date: 'Jul 10, 2026', status: 'Hired' },
    { candidate: 'Amara Lopez', client: 'Globex Corp', role: 'UI/UX Designer', pay: 70, bill: 95, recruiter: 'Sarah Jenkins', date: 'Jul 12, 2026', status: 'Start Pending' },
    { candidate: 'Kofi Boateng', client: 'Acme Corp', role: 'DevOps Engineer', pay: 90, bill: 125, recruiter: 'Aazam Qureshi', date: 'Jul 15, 2026', status: 'Active' },
  ];

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 1600, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="anim-fade-up">
        <div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 23,
            color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: 4
          }}>Welcome back, Aazam 👋</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Here is your ATS Pro workspace status for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            padding: '6px 12px', borderRadius: 9, fontSize: 12, color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <MessageSquare size={13} color="var(--primary-light)" /> 12 Messages
          </div>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            padding: '6px 12px', borderRadius: 9, fontSize: 12, color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Bookmark size={13} color="var(--cyan)" /> 4 Notes
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {STAT_CARDS.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.04} />
        ))}
      </div>

      {/* Middle Section: Funnels & Submissions Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Weekly Submissions Trend */}
        <div className="card anim-fade-up" style={{ padding: 22, display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--text-1)' }}>
                Weekly Submissions Funnel
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Submissions compared with client-sent submittals</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11.5 }}>
              <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text-2)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#22d3ee' }} /> Submissions
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:4, color:'var(--text-2)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981' }} /> Client Sends
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={MOCK_TREND} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSends" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="Submissions" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
              <Area type="monotone" dataKey="ClientSends" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSends)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Distribution Funnel */}
        <div className="card anim-fade-up" style={{ padding: 22, display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--text-1)' }}>
                Pipeline Distribution
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Current candidates by workflow stage</p>
            </div>
            <span className="badge badge-active" style={{ fontSize:10 }}>Live</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={analytics.funnel} barSize={26} margin={{ top: 5, right: 5, bottom: 0, left: -28 }}>
              <XAxis dataKey="Stage" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="Count" radius={[5, 5, 0, 0]}>
                {analytics.funnel.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main content grid: Left Tables, Right Sidebar Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left column widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* JSIP Recruiter KPI Report */}
          <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--text-1)' }}>
                  JSIP Recruiter KPI Report
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Recruiting metrics across the organization</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>RECRUITER</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>SUBMISSIONS</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CLIENT SENDS</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>INTERVIEWS</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>PLACEMENTS</th>
                  </tr>
                </thead>
                <tbody>
                  {RECRUITER_KPI.map((rep, idx) => (
                    <tr key={idx} className="trow" style={{ borderBottom: idx < RECRUITER_KPI.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{rep.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{rep.role}</div>
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-2)', fontWeight: 500 }}>{rep.submissions}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-2)', fontWeight: 500 }}>{rep.clientSends}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-2)', fontWeight: 500 }}>{rep.interviews}</td>
                      <td style={{ padding: '12px 20px', color: 'var(--emerald)', fontWeight: 700 }}>{rep.placements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirmations Placement Tracker */}
          <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--text-1)' }}>
                  Confirmations (Placement Tracking)
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Financial breakdown of client onboarding margins</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CANDIDATE</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>CLIENT & JOB</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>RATES & MARGIN</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>RECRUITER</th>
                    <th style={{ padding: '12px 20px', color: 'var(--text-3)', fontWeight: 600 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_CONFIRMATIONS.map((conf, idx) => {
                    const margin = conf.bill - conf.pay;
                    return (
                      <tr key={idx} className="trow" style={{ borderBottom: idx < RECENT_CONFIRMATIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{conf.candidate}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{conf.date}</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>{conf.client}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{conf.role}</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ color: 'var(--text-2)' }}>
                            Bill: <strong>${conf.bill}/hr</strong> · Pay: <strong>${conf.pay}/hr</strong>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, marginTop: 2, display:'flex', alignItems:'center', gap:3 }}>
                            <DollarSign size={10} style={{marginRight:-1}} /> {margin}/hr Margin
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>{conf.recruiter}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: conf.status === 'Active' ? 'rgba(0,229,160,0.1)' : 'rgba(245,158,11,0.1)',
                            color: conf.status === 'Active' ? 'var(--emerald)' : 'var(--warning)',
                          }}>
                            {conf.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Shortcuts + Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Actions Shortcuts */}
          <div className="card anim-fade-up" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14 }}>
              TalentHire Operations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="/candidates" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                textDecoration: 'none', fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600,
                transition: 'all 0.2s ease'
              }} className="hover-highlight">
                <Users size={14} color="#22d3ee" /> Sourcing Command
              </a>
              <a href="/jobs" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                textDecoration: 'none', fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600,
                transition: 'all 0.2s ease'
              }} className="hover-highlight">
                <Briefcase size={14} color="#a78bfa" /> Add Job Requirement
              </a>
              <a href="/clients" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                textDecoration: 'none', fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600,
                transition: 'all 0.2s ease'
              }} className="hover-highlight">
                <Landmark size={14} color="#10b981" /> Corporate Accounts
              </a>
              <a href="/kanban" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)',
                textDecoration: 'none', fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600,
                transition: 'all 0.2s ease'
              }} className="hover-highlight">
                <Clock size={14} color="#f59e0b" /> Pipelines Board
              </a>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="card anim-fade-up" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14 }}>
              Activity stream
            </h3>
            {analytics.recentCandidates.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <Clock size={20} />
                <p style={{ fontSize: 12 }}>No activity log</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {analytics.recentCandidates.slice(0, 4).map((c, i) => {
                  const [fg, bg] = getAvatarColors(c.name);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div className="avatar" style={{ width:28, height:28, minWidth:28, borderRadius:6, fontSize:11, background: bg, color: fg }}>{getInitials(c.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <UserPlus size={9} /> Sourced via Parser
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                        {getTimeAgo(c.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
