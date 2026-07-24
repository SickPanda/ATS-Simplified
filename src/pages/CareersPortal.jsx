import { useEffect, useState } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, ArrowLeft, Upload, CheckCircle, Building2 } from 'lucide-react';

function CareersHome() {
  const [jobs, setJobs] = useState([]);
  const [brand, setBrand] = useState({ companyName: 'ATS Pro', tagline: "We're hiring" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/careers/jobs').then(r => r.ok ? r.json() : []),
      fetch('/api/careers/branding').then(r => r.ok ? r.json() : null),
    ]).then(([j, b]) => {
      setJobs(Array.isArray(j) ? j : []);
      if (b) setBrand(b);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: '0 auto 14px',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Building2 size={22} />
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 28, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
          {brand.companyName} Careers
        </h1>
        <p style={{ color: 'var(--text-3)', marginTop: 8, fontSize: 15 }}>{brand.tagline}</p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-3)' }}>Loading open roles…</p>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Briefcase size={32} color="var(--text-4)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-2)' }}>No open roles right now</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>Check back soon or email recruiting.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(j => (
            <Link
              key={j.id}
              to={`/careers/jobs/${j.id}`}
              className="card-lift"
              style={{ padding: 20, textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{j.title}</h2>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    {j.department && <span>{j.department}</span>}
                    {j.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {j.location}
                      </span>
                    )}
                    {j.jobCode && <span>{j.jobCode}</span>}
                  </div>
                  {j.summary && (
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.5 }}>{j.summary}</p>
                  )}
                </div>
                <span className="badge badge-primary" style={{ flexShrink: 0 }}>Apply</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: 'var(--text-4)' }}>
        <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Recruiter sign-in</Link>
      </p>
    </div>
  );
}

function CareersJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', linkedIn: '', message: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch(`/api/careers/jobs/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error('Job not found');
        return r.json();
      })
      .then(setJob)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      if (form.phone) fd.append('phone', form.phone);
      if (form.message) fd.append('message', form.message);
      if (form.linkedIn) fd.append('linkedIn', form.linkedIn);
      if (file) fd.append('resume', file);

      const res = await fetch(`/api/careers/jobs/${id}/apply`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Application failed');
      setDone(data);
    } catch (ex) {
      setErr(ex.message || 'Application failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>;
  }

  if (!job) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>{err || 'Job not found'}</p>
        <Link to="/careers" style={{ color: 'var(--primary)' }}>← All roles</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: 24 }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>Application received</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.5 }}>{done.message}</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>{done.jobTitle}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/careers')}>
            View more roles
          </button>
        </div>
      </div>
    );
  }

  let skills = [];
  try { skills = JSON.parse(job.skills || '[]'); } catch { skills = []; }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link to="/careers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
        <ArrowLeft size={14} /> All open roles
      </Link>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          {job.title}
        </h1>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
          {job.department && <span>{job.department}</span>}
          {job.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {job.location}</span>}
          {job.salaryRange && <span>{job.salaryRange}</span>}
          {job.jobCode && <span>{job.jobCode}</span>}
        </div>
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {skills.map(s => (
              <span key={s} className="badge badge-primary" style={{ fontSize: 11 }}>{s}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {job.description}
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Apply for this role</h2>
        {err && (
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{err}</div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">FULL NAME *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">EMAIL *</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">PHONE</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">LINKEDIN</label>
              <input className="input" placeholder="https://linkedin.com/in/…" value={form.linkedIn} onChange={e => setForm({ ...form, linkedIn: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">COVER NOTE</label>
            <textarea className="input" rows={4} style={{ height: 'auto', resize: 'vertical' }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Why you're a fit…" />
          </div>
          <div>
            <label className="label">RESUME (PDF / DOCX)</label>
            <label className="btn btn-ghost" style={{ display: 'inline-flex', cursor: 'pointer' }}>
              <Upload size={14} /> {file ? file.name : 'Choose file'}
              <input type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CareersPortal() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Link to="/careers" style={{ fontWeight: 800, color: 'var(--text-1)', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Careers
        </Link>
        <Link to="/" style={{ fontSize: 12.5, color: 'var(--text-3)', textDecoration: 'none' }}>ATS Pro</Link>
      </header>
      <Routes>
        <Route index element={<CareersHome />} />
        <Route path="jobs/:id" element={<CareersJob />} />
      </Routes>
    </div>
  );
}
