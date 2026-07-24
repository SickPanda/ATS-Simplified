import { useState } from 'react';
import { Mail, Lock, Zap } from 'lucide-react';
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
        let msg = 'Invalid email or password';
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            msg = errData.message;
          } else if (errData && errData.error) {
            msg = errData.error;
          }
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      login(data.token, data.user);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to server. Please ensure the backend is running and healthy.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-hero">
      <div className="epic-frame anim-scale-in" style={{
        width: '100%',
        maxWidth: 420,
        padding: '40px 36px 36px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="mark-torch" style={{ margin: '0 auto 18px' }}>
            <Zap size={26} color="#e8c547" fill="#e8c547" />
          </div>
          <h1 className="brand-wordmark" style={{
            fontSize: 28,
            color: 'var(--text-1)',
            lineHeight: 1.15,
          }}>
            Candeo
          </h1>
          <p style={{
            color: 'var(--gold-deep)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            marginTop: 6,
            textTransform: 'uppercase',
          }}>
            I shine · Staffing OS
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginTop: 12 }}>
            Sign in to your desk
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid rgba(155, 44, 44, 0.2)',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <a href="#" style={{ fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</a>
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
            style={{ padding: '12px', fontSize: 14.5, marginTop: 6, letterSpacing: '0.03em' }}
          >
            {loading ? 'Signing in…' : 'Enter Candeo'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid rgba(201, 162, 39, 0.18)',
          fontSize: 12.5,
          color: 'var(--text-3)',
        }}>
          Demo access<br />
          <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>admin@candeo.com</strong>
          {' · '}
          <strong style={{ color: 'var(--text-2)' }}>password123</strong>
        </div>
      </div>
    </div>
  );
}
