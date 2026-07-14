import { useState } from 'react';
import { Mail, Lock, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(232, 48, 74, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(255, 140, 66, 0.08), transparent 40%)',
      backgroundColor: 'var(--bg)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 420,
        padding: 40,
        boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--rose) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(232, 48, 74, 0.25)'
          }}>
            <Building2 size={28} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>Sign in to continue to ATS Pro</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(232, 48, 74, 0.1)',
            color: 'var(--rose)',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 24,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="label">Email Address</label>
            <div className="input-search">
              <Mail size={16} color="var(--text-4)" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{ fontSize: 14, padding: '10px 0' }}
              />
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="label" style={{ margin: 0 }}>Password</label>
              <a href="#" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
            </div>
            <div className="input-search">
              <Lock size={16} color="var(--text-4)" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ fontSize: 14, padding: '10px 0' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '12px', fontSize: 15, marginTop: 8 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-3)' }}>
          For demo purposes, use:<br/>
          <strong style={{ color: 'var(--text-2)' }}>mdaazam@gmail.com</strong> / <strong style={{ color: 'var(--text-2)' }}>Recruiter@111*</strong>
        </div>
      </div>
    </div>
  );
}
