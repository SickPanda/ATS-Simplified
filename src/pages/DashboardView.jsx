import { useEffect, useState } from 'react';
import { Briefcase, Users, TrendingUp, CheckCircle, ArrowUpRight, Clock, UserPlus, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FUNNEL_COLORS = ['#22d3ee', '#a78bfa', '#f59e0b', '#6d5cff', '#10b981'];

function StatCard({ icon: Icon, label, value, trend, color, delay = 0 }) {
  return (
    <div className="card-lift" style={{
      padding: '22px 24px',
      animationDelay: `${delay}s`,
      animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 10, letterSpacing: '0.03em' }}>
            {label}
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 34,
            color: 'var(--text-1)', lineHeight: 1,
            letterSpacing: '-0.03em',
          }}>{value}</p>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `rgba(${color === '#22d3ee' ? '34,211,238' : color === '#10b981' ? '16,185,129' : color === '#f59e0b' ? '245,158,11' : '109,92,255'},0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowUpRight size={13} color="var(--emerald)" />
          <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>Active</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>this week</span>
        </div>
      )}
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

export default function DashboardView() {
  const [stats, setStats] = useState({ totalJobs: 0, totalCandidates: 0, activeApplications: 0, hiredCandidates: 0 });
  const [analytics, setAnalytics] = useState({ 
    funnel: [], recentCandidates: [], 
    metrics: { totalMargin: 0, avgTimeToHire: 0, dropoffRate: 0 } 
  });
  const [jobs, setJobs] = useState([]);

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
  }, []);

  const STAT_CARDS = [
    { icon: Users,       label: 'TOTAL CANDIDATES',   value: stats.totalCandidates,  color: '#22d3ee', trend: true  },
    { icon: TrendingUp,  label: 'TOTAL MARGIN',       value: `$${analytics.metrics.totalMargin.toLocaleString()}`, color: '#10b981' },
    { icon: Clock,       label: 'TIME-TO-HIRE',       value: `${analytics.metrics.avgTimeToHire}d`, color: '#f59e0b' },
    { icon: CheckCircle, label: 'PIPELINE DROPOFF',   value: `${analytics.metrics.dropoffRate}%`, color: '#f43f5e' },
  ];

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }} className="anim-fade-up">
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: 22,
          color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: 4
        }}>Good evening, Admin 👋</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
          Here are your advanced hiring metrics for today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.05} />
        ))}
      </div>

      {/* Charts + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Hiring Funnel */}
        <div className="card anim-fade-up" style={{ padding: '24px', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                Hiring Funnel
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Candidates by pipeline stage</p>
            </div>
            <span className="badge badge-primary">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.funnel} barSize={36} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis dataKey="Stage" tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                {analytics.funnel.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="card anim-fade-up" style={{ padding: 24, animationDelay: '0.25s' }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-1)', marginBottom: 18 }}>
            Recent Activity
          </h3>
          {analytics.recentCandidates.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Clock size={28} />
              <p style={{ fontSize: 13 }}>No recent activity</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {analytics.recentCandidates.map((c, i) => {
                const [fg, bg] = getAvatarColors(c.name);
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < analytics.recentCandidates.length - 1 ? '1px solid var(--border)' : 'none',
                    animation: `fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${0.05 * i}s both`,
                  }}>
                    <div className="avatar" style={{ background: bg, color: fg }}>{getInitials(c.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserPlus size={10} /> Resume parsed
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                      {getTimeAgo(c.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Open Roles Table */}
      <div className="card anim-fade-up" style={{ animationDelay: '0.3s' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
            Open Positions
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{jobs.filter(j => j.status === 'Active').length} active</span>
        </div>
        <div>
          {jobs.filter(j => j.status === 'Active').slice(0, 5).map((job, i) => (
            <div key={job.id} className="trow" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'var(--primary-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Briefcase size={15} color="var(--primary-light)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{job.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{job.department} · {job.location}</div>
              </div>
              <span className="badge badge-active">Active</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                <Star size={12} />
                {job.salaryRange}
              </div>
            </div>
          ))}
          {jobs.filter(j => j.status === 'Active').length === 0 && (
            <div className="empty-state"><p>No active jobs. Create one!</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
