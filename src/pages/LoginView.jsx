import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Loader2 } from 'lucide-react';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'url(/resumes/bg-blur.jpg) center/cover, var(--bg)', // Fake bg for pitch
      position: 'relative'
    }}>
      {/* Dynamic background effects to make it feel premium */}
      <div style={{
        position: 'absolute', top: '10%', left: '20%', width: 500, height: 500,
        background: 'var(--primary-glow-strong)', filter: 'blur(120px)', opacity: 0.4, borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '20%', width: 500, height: 500,
        background: 'rgba(0, 229, 255, 0.15)', filter: 'blur(120px)', opacity: 0.4, borderRadius: '50%'
      }} />

      <div className="card anim-fade-up" style={{
        width: 420,
        padding: '40px',
        position: 'relative',
        zIndex: 10,
        background: 'rgba(23, 24, 28, 0.7)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, var(--primary) 0%, #a78bfa 100%)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px var(--primary-glow-strong)',
            marginBottom: 16
          }}>
            <Zap size={24} color="white" fill="white" />
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-1)' }}>
            Welcome to ATS Pro
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>
            Sign in to access your recruitment pipeline
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="label">Email Address</label>
            <input 
              type="email" 
              className="input" 
              placeholder="admin@atspro.com"
              value={email} 
              onChange={e=>setEmail(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.03)' }}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password} 
              onChange={e=>setPassword(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.03)' }}
            />
          </div>

          {error && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255, 59, 48, 0.1)', color: 'var(--rose)', fontSize: 13, textAlign: 'center', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ height: 44, marginTop: 8 }} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Demo Accounts:</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            Admin: <strong>admin@atspro.com</strong> / password123<br/>
            Recruiter: <strong>recruiter@atspro.com</strong> / password123
          </div>
        </div>
      </div>
    </div>
  );
}
