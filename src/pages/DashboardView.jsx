import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Users, CheckCircle, Clock, UserPlus, ListTodo, ArrowRightLeft,
  DollarSign, AlertTriangle, Sparkles, Calendar, Building2, TrendingUp,
  ArrowRight, Target, Inbox,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';

import { STAGE_CHART_COLORS } from '../lib/stages';
const FUNNEL_COLORS = STAGE_CHART_COLORS;

function displayName(user) {
  if (!user) return 'there';
  const raw = user.name || user.email?.split('@')[0] || 'there';
  // admin@… → Admin; first.last → First
  const part = raw.includes(' ') ? raw.split(' ')[0] : raw.split(/[._-]/)[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const AVATAR_COLORS = [
  ['#64748b', '#f1f5f9'], ['#3b82f6', '#eff6ff'], ['#2563eb', '#dbeafe'],
  ['#1d4ed8', '#dbeafe'], ['#1e3a8a', '#e0e7ff'], ['#475569', '#f8fafc'],
];
function getAvatarColors(name) {
  let h = 0;
  for (let i = 0; i < (name?.length || 0); i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}

function StatCard({ icon: Icon, label, value, subtext, color, delay = 0, to }) {
  const inner = (
    <div className="card-lift" style={{
      padding: '18px 20px',
      animationDelay: `${delay}s`,
      animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      cursor: to ? 'pointer' : 'default',
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
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link> : inner;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hover)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
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
        background: 'var(--surface)',
        border: '1px solid var(--border-hover)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12.5,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
        <p style={{ color: 'var(--primary)' }}>Pipeline adds: <strong>{payload[0]?.value ?? 0}</strong></p>
        <p style={{ color: 'var(--success)' }}>Client sends: <strong>{payload[1]?.value ?? 0}</strong></p>
      </div>
    );
  }
  return null;
};

function severityStyle(sev) {
  if (sev === 'high') return { bg: 'var(--danger-soft)', color: 'var(--danger)', border: 'rgba(185,28,28,0.2)' };
  if (sev === 'medium') return { bg: 'var(--warning-soft)', color: 'var(--warning)', border: 'rgba(180,83,9,0.22)' };
  return { bg: 'var(--surface-2)', color: 'var(--text-3)', border: 'var(--border)' };
}

function actionIcon(type) {
  if (type === 'empty_pipeline' || type === 'no_submittals') return Target;
  if (type === 'pending_submittal') return Inbox;
  if (type === 'interview' || type === 'interview_feedback') return Calendar;
  if (type === 'stale_candidate') return Clock;
  return AlertTriangle;
}

export default function DashboardView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0, totalCandidates: 0, activeApplications: 0, hiredCandidates: 0,
    pendingSubmittals: 0, interviewsThisWeek: 0, activeClients: 0,
  });
  const [analytics, setAnalytics] = useState({
    funnel: [], recentCandidates: [],
    metrics: {
      totalMargin: 0, avgTimeToHire: 0, dropoffRate: 0,
      weekSubmissions: 0, weekClientSends: 0, pendingSubmittals: 0,
      activeJobs: 0, emptyPipelines: 0,
    },
    weeklyTrend: [],
    recruiterKpis: [],
    recentPlacements: [],
    bySource: [],
    openActions: 0,
    actionItems: [],
    jobHealth: [],
    upcomingInterviews: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          fetch('/api/ats/dashboard'),
          fetch('/api/ats/analytics'),
        ]);
        if (dashRes.ok) {
          const d = await dashRes.json();
          if (!cancelled) {
            setStats({
              totalJobs: d.totalJobs ?? d.TotalJobs ?? 0,
              totalCandidates: d.totalCandidates ?? d.TotalCandidates ?? 0,
              activeApplications: d.activeApplications ?? d.ActiveApplications ?? 0,
              hiredCandidates: d.hiredCandidates ?? d.HiredCandidates ?? 0,
              pendingSubmittals: d.pendingSubmittals ?? d.PendingSubmittals ?? 0,
              interviewsThisWeek: d.interviewsThisWeek ?? d.InterviewsThisWeek ?? 0,
              activeClients: d.activeClients ?? d.ActiveClients ?? 0,
            });
          }
        }
        if (analyticsRes.ok) {
          const d = await analyticsRes.json();
          if (!cancelled) {
            setAnalytics({
              funnel: (d.funnel ?? d.Funnel ?? []).map(f => ({ Stage: f.stage ?? f.Stage, Count: f.count ?? f.Count })),
              recentCandidates: (d.recentCandidates ?? d.RecentCandidates ?? []).map(c => ({
                id: c.id ?? c.Id,
                name: c.name ?? c.Name,
                role: c.role ?? c.Role,
                source: c.source ?? c.Source ?? 'Sourced',
                createdAt: c.createdAt ?? c.CreatedAt,
              })),
              weeklyTrend: (d.weeklyTrend ?? d.WeeklyTrend ?? []).map(t => ({
                day: t.day ?? t.Day,
                Submissions: t.submissions ?? t.Submissions ?? 0,
                ClientSends: t.clientSends ?? t.ClientSends ?? 0,
              })),
              recruiterKpis: (d.recruiterKpis ?? d.RecruiterKpis ?? []).map(r => ({
                name: r.name ?? r.Name,
                role: r.role ?? r.Role ?? 'Recruiter',
                submissions: r.submissions ?? r.Submissions ?? 0,
                clientSends: r.clientSends ?? r.ClientSends ?? 0,
                interviews: r.interviews ?? r.Interviews ?? 0,
                placements: r.placements ?? r.Placements ?? 0,
              })),
              recentPlacements: (d.recentPlacements ?? d.RecentPlacements ?? []).map(p => ({
                candidate: p.candidate ?? p.Candidate,
                client: p.client ?? p.Client,
                role: p.role ?? p.Role,
                pay: p.pay ?? p.Pay ?? 0,
                bill: p.bill ?? p.Bill ?? 0,
                recruiter: p.recruiter ?? p.Recruiter,
                date: p.date ?? p.Date,
                status: p.status ?? p.Status ?? 'Hired',
              })),
              bySource: (d.bySource ?? d.BySource ?? []).map(s => ({
                source: s.source ?? s.Source,
                count: s.count ?? s.Count ?? 0,
              })),
              openActions: d.openActions ?? d.OpenActions ?? 0,
              actionItems: (d.actionItems ?? d.ActionItems ?? []).map(a => ({
                type: a.type ?? a.Type,
                severity: a.severity ?? a.Severity ?? 'low',
                title: a.title ?? a.Title,
                detail: a.detail ?? a.Detail,
                href: a.href ?? a.Href ?? '/',
                meta: a.meta ?? a.Meta,
              })),
              jobHealth: (d.jobHealth ?? d.JobHealth ?? []).map(j => ({
                id: j.id ?? j.Id,
                title: j.title ?? j.Title,
                jobCode: j.jobCode ?? j.JobCode,
                location: j.location ?? j.Location,
                pipeline: j.pipeline ?? j.Pipeline ?? 0,
                hired: j.hired ?? j.Hired ?? 0,
                submittals: j.submittals ?? j.Submittals ?? 0,
                needsTalent: j.needsTalent ?? j.NeedsTalent ?? false,
                needsSubmittals: j.needsSubmittals ?? j.NeedsSubmittals ?? false,
              })),
              upcomingInterviews: (d.upcomingInterviews ?? d.UpcomingInterviews ?? []).map(iv => ({
                id: iv.id ?? iv.Id,
                scheduledAt: iv.scheduledAt ?? iv.ScheduledAt,
                type: iv.type ?? iv.Type,
                candidate: iv.candidate ?? iv.Candidate,
                jobTitle: iv.jobTitle ?? iv.JobTitle,
                jobId: iv.jobId ?? iv.JobId,
                needsFeedback: iv.needsFeedback ?? iv.NeedsFeedback ?? false,
              })),
              metrics: {
                totalMargin: d.metrics?.totalMargin ?? d.Metrics?.TotalMargin ?? 0,
                avgTimeToHire: d.metrics?.avgTimeToHire ?? d.Metrics?.AvgTimeToHire ?? 0,
                dropoffRate: d.metrics?.dropoffRate ?? d.Metrics?.DropoffRate ?? 0,
                weekSubmissions: d.metrics?.weekSubmissions ?? d.Metrics?.WeekSubmissions ?? 0,
                weekClientSends: d.metrics?.weekClientSends ?? d.Metrics?.WeekClientSends ?? 0,
                pendingSubmittals: d.metrics?.pendingSubmittals ?? d.Metrics?.PendingSubmittals ?? 0,
                activeJobs: d.metrics?.activeJobs ?? d.Metrics?.ActiveJobs ?? 0,
                emptyPipelines: d.metrics?.emptyPipelines ?? d.Metrics?.EmptyPipelines ?? 0,
              },
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const name = displayName(user);
  const roleLabel = user?.role || user?.roles?.[0] || 'Recruiter';
  const today = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

  const attentionCount = analytics.actionItems.filter(a => a.severity === 'high').length
    + (analytics.metrics.emptyPipelines || 0);

  const STAT_CARDS = [
    {
      icon: Briefcase, label: 'Open reqs', value: stats.totalJobs,
      subtext: analytics.metrics.emptyPipelines
        ? `${analytics.metrics.emptyPipelines} need candidates`
        : 'Active job openings',
      color: 'var(--primary)', to: '/jobs',
    },
    {
      icon: Users, label: 'Talent pool', value: stats.totalCandidates,
      subtext: `${analytics.metrics.weekSubmissions || 0} added to pipeline this week`,
      color: 'var(--primary-light)', to: '/candidates',
    },
    {
      icon: ArrowRightLeft, label: 'In pipeline', value: stats.activeApplications,
      subtext: `${stats.pendingSubmittals || analytics.metrics.pendingSubmittals || 0} submittals pending`,
      color: 'var(--primary-dark)', to: '/placements',
    },
    {
      icon: CheckCircle, label: 'Placements', value: stats.hiredCandidates,
      subtext: analytics.metrics.totalMargin
        ? `$${Number(analytics.metrics.totalMargin).toFixed(0)}/hr total margin`
        : 'Hired & started',
      color: 'var(--success)', to: '/placements',
    },
    {
      icon: ListTodo, label: 'Needs you', value: analytics.actionItems.length || analytics.openActions || 0,
      subtext: attentionCount > 0 ? `${attentionCount} high priority` : 'All clear for now',
      color: attentionCount > 0 ? 'var(--warning)' : 'var(--text-3)',
    },
  ];

  const WEEKLY_TREND = analytics.weeklyTrend?.length
    ? analytics.weeklyTrend
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, Submissions: 0, ClientSends: 0 }));

  const RECRUITER_KPI = analytics.recruiterKpis?.length ? analytics.recruiterKpis : [];
  const RECENT_CONFIRMATIONS = analytics.recentPlacements || [];

  if (loading) {
    return (
      <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)' }}>
        <div className="anim-spin" style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        Loading workspace…
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 1600, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }} className="anim-fade-up">
        <div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 22,
            color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: 4,
          }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {today} · <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{roleLabel}</span>
            {' · '}Your recruiting command center
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/candidates" className="btn btn-ghost" style={{ fontSize: 12.5, textDecoration: 'none' }}>
            <UserPlus size={14} /> Source talent
          </Link>
          <Link to="/jobs" className="btn btn-primary" style={{ fontSize: 12.5, textDecoration: 'none' }}>
            <Briefcase size={14} /> Open jobs
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {STAT_CARDS.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.04} />
        ))}
      </div>

      {/* Attention + Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Needs attention */}
        <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} color="var(--primary)" /> Needs attention
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Empty pipelines, pending feedback, aging candidates</p>
            </div>
            {analytics.actionItems.length > 0 && (
              <span className="badge" style={{ fontSize: 10, background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                {analytics.actionItems.length}
              </span>
            )}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {analytics.actionItems.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <CheckCircle size={22} color="var(--emerald)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>You&apos;re clear</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>No empty reqs, stale stages, or pending interview scores.</p>
              </div>
            ) : (
              analytics.actionItems.map((item, i) => {
                const Icon = actionIcon(item.type);
                const sev = severityStyle(item.severity);
                return (
                  <Link
                    key={`${item.type}-${i}`}
                    to={item.href}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 18px', textDecoration: 'none',
                      borderBottom: i < analytics.actionItems.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: sev.bg, border: `1px solid ${sev.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} color={sev.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{item.detail}</div>
                    </div>
                    <ArrowRight size={14} color="var(--text-4)" style={{ marginTop: 4, flexShrink: 0 }} />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Pulse metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card anim-fade-up" style={{ padding: 18, flex: 1 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 14 }}>
              This week&apos;s pulse
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Pipeline adds', value: analytics.metrics.weekSubmissions, icon: TrendingUp, color: 'var(--primary)' },
                { label: 'Client sends', value: analytics.metrics.weekClientSends, icon: Inbox, color: 'var(--success)' },
                { label: 'Avg time to hire', value: analytics.metrics.avgTimeToHire ? `${analytics.metrics.avgTimeToHire}d` : '—', icon: Clock, color: 'var(--text-2)' },
                { label: 'Interviews (7d)', value: stats.interviewsThisWeek, icon: Calendar, color: 'var(--primary-dark)' },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <m.icon size={12} color={m.color} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</span>
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--text-1)' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming interviews */}
          <div className="card anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)' }}>
                Interviews
              </h3>
            </div>
            {analytics.upcomingInterviews.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text-4)', textAlign: 'center' }}>
                No interviews scheduled in the next 2 weeks
              </div>
            ) : (
              analytics.upcomingInterviews.slice(0, 4).map((iv, i) => (
                <Link
                  key={iv.id || i}
                  to={iv.jobId ? `/jobs/${iv.jobId}` : '/jobs'}
                  style={{
                    display: 'block', padding: '10px 16px', textDecoration: 'none',
                    borderBottom: i < Math.min(3, analytics.upcomingInterviews.length - 1) ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{iv.candidate || 'Candidate'}</span>
                    {iv.needsFeedback && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)' }}>Feedback</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {iv.jobTitle} · {iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div className="card anim-fade-up" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                Weekly activity
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Pipeline adds vs client submittals (last 7 days)</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} /> Pipeline
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Client sends
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={WEEKLY_TREND} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSends" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#047857" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="Submissions" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
              <Area type="monotone" dataKey="ClientSends" stroke="#047857" strokeWidth={2} fillOpacity={1} fill="url(#colorSends)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card anim-fade-up" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                Pipeline by stage
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Live application distribution</p>
            </div>
            <span className="badge badge-active" style={{ fontSize: 10 }}>Live</span>
          </div>
          {analytics.funnel.every(f => !f.Count) ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-4)', minHeight: 180 }}>
              <Target size={22} />
              <p style={{ fontSize: 12.5 }}>No applications yet — assign talent to a job</p>
              <Link to="/jobs" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Go to jobs →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.funnel} barSize={26} margin={{ top: 5, right: 5, bottom: 0, left: -28 }}>
                <XAxis dataKey="Stage" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="Count" radius={[5, 5, 0, 0]}>
                  {analytics.funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Job health + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active reqs health */}
          <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                  Active requirements
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Pipeline depth and client sends per req</p>
              </div>
              <Link to="/jobs" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>View all</Link>
            </div>
            {analytics.jobHealth.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: 12.5 }}>
                No active jobs — <Link to="/jobs" style={{ color: 'var(--primary)', fontWeight: 600 }}>create a req</Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>JOB</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>PIPELINE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>SENDS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>HIRED</th>
                    <th style={{ padding: '10px 18px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.jobHealth.map((j, idx) => (
                    <tr key={j.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <Link to={`/jobs/${j.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{j.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{j.jobCode || '—'} · {j.location || 'Location n/a'}</div>
                        </Link>
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: j.pipeline === 0 ? 'var(--primary)' : 'var(--text-2)' }}>{j.pipeline}</td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--text-2)' }}>{j.submittals}</td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--emerald)', fontWeight: 600 }}>{j.hired}</td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {j.needsTalent ? (
                          <Link to={`/jobs/${j.id}`} style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={12} /> Match talent
                          </Link>
                        ) : j.needsSubmittals ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)' }}>Submit to client</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)' }}>Healthy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recruiter KPI */}
          <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                Team performance
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>From candidate ownership & activity — not mock data</p>
            </div>
            {RECRUITER_KPI.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: 12.5 }}>
                Activity will appear once candidates are owned and moved through the pipeline.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>OWNER</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>PIPELINE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>SENDS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>IV</th>
                    <th style={{ padding: '10px 18px', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>PLACED</th>
                  </tr>
                </thead>
                <tbody>
                  {RECRUITER_KPI.map((rep, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '11px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{rep.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{rep.role}</div>
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--text-2)' }}>{rep.submissions}</td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--text-2)' }}>{rep.clientSends}</td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--text-2)' }}>{rep.interviews}</td>
                      <td style={{ padding: '11px 18px', textAlign: 'center', color: 'var(--emerald)', fontWeight: 700 }}>{rep.placements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Placements */}
          <div className="card anim-fade-up" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                  Recent placements
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Bill / pay margin tracking</p>
              </div>
              <Link to="/placements" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>All</Link>
            </div>
            {RECENT_CONFIRMATIONS.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: 12.5 }}>
                No placements yet — mark Hired from a job pipeline to track margin.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>CANDIDATE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>CLIENT / ROLE</th>
                    <th style={{ padding: '10px 18px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11 }}>MARGIN</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_CONFIRMATIONS.map((conf, idx) => {
                    const margin = conf.bill - conf.pay;
                    return (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '11px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{conf.candidate}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{conf.date}</div>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ color: 'var(--text-2)' }}>{conf.client}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{conf.role}</div>
                        </td>
                        <td style={{ padding: '11px 18px' }}>
                          <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>${conf.bill}/hr · ${conf.pay}/hr</div>
                          <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <DollarSign size={10} /> {margin}/hr
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card anim-fade-up" style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 12 }}>
              Quick actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/candidates', icon: Users, label: 'Source / parse resumes', color: 'var(--primary)' },
                { to: '/jobs', icon: Briefcase, label: 'Manage requirements', color: 'var(--primary-dark)' },
                { to: '/placements', icon: ArrowRightLeft, label: 'Pipeline & placements', color: 'var(--primary-light)' },
                { to: '/clients', icon: Building2, label: 'Client accounts', color: 'var(--success)' },
              ].map(a => (
                <Link
                  key={a.to}
                  to={a.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)',
                    textDecoration: 'none', fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600,
                  }}
                >
                  <a.icon size={14} color={a.color} /> {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Source mix */}
          {analytics.bySource.length > 0 && (
            <div className="card anim-fade-up" style={{ padding: 18 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 12 }}>
                Talent sources
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analytics.bySource.slice(0, 6).map(s => {
                  const max = analytics.bySource[0]?.count || 1;
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <div key={s.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{s.source}</span>
                        <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{s.count}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 99, opacity: 0.7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent talent */}
          <div className="card anim-fade-up" style={{ padding: 18 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 12 }}>
              Recently added
            </h3>
            {analytics.recentCandidates.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                No candidates yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {analytics.recentCandidates.slice(0, 6).map((c, i) => {
                  const [fg, bg] = getAvatarColors(c.name);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderBottom: i < Math.min(5, analytics.recentCandidates.length - 1) ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 28, height: 28, minWidth: 28, borderRadius: 7, fontSize: 10, fontWeight: 700,
                        background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{getInitials(c.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{c.role || '—'} · {c.source || 'Sourced'}</div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                        {getTimeAgo(c.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to="/candidates" style={{ display: 'block', marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              View talent pool →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
