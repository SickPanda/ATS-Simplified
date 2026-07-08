import { useState, useEffect } from 'react';
import { Key, CheckCircle2, XCircle, Zap, Shield, Info } from 'lucide-react';

export default function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | testing | ok | fail
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved key from localStorage (display purposes only — in production this would be server-side)
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const testConnection = async () => {
    if (!apiKey.trim()) return;
    setStatus('testing');
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
      );
      setStatus(r.ok ? 'ok' : 'fail');
    } catch {
      setStatus('fail');
    }
  };

  const saveKey = async () => {
    // In this app, the key lives in appsettings.Development.json on the backend.
    // Here we show a UX flow and store it locally.
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const displayKey = masked && apiKey ? apiKey.slice(0, 8) + '•'.repeat(Math.max(0, apiKey.length - 12)) + apiKey.slice(-4) : apiKey;

  const StatusIcon = () => {
    if (status === 'testing') return <div className="anim-spin" style={{width:16,height:16,border:'2px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%'}} />;
    if (status === 'ok')   return <CheckCircle2 size={16} color="var(--emerald)" />;
    if (status === 'fail') return <XCircle size={16} color="var(--rose)" />;
    return null;
  };

  return (
    <div style={{ padding:'28px 28px 60px', maxWidth:700 }}>
      <div className="anim-fade-up" style={{ marginBottom:28 }}>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
          Settings
        </h2>
        <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
          Configure your ATS Pro workspace
        </p>
      </div>

      {/* API Key Section */}
      <div className="card anim-fade-up" style={{ animationDelay:'0.05s', overflow:'hidden', marginBottom:16 }}>
        {/* Card top accent */}
        <div style={{ height:2, background:'linear-gradient(90deg, var(--primary), var(--cyan))', borderRadius:'14px 14px 0 0' }} />

        <div style={{ padding:'22px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{
              width:38, height:38, borderRadius:10,
              background:'var(--primary-glow)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Zap size={17} color="var(--primary-light)" />
            </div>
            <div>
              <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, color:'var(--text-1)' }}>
                Gemini AI Configuration
              </h3>
              <p style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>
                Powers resume parsing and candidate-to-job match scoring
              </p>
            </div>

            {/* Connection status badge */}
            {status !== 'idle' && (
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7 }}>
                <StatusIcon />
                <span style={{
                  fontSize:12.5, fontWeight:600,
                  color: status==='ok'?'var(--emerald)': status==='fail'?'var(--rose)':'var(--text-3)',
                }}>
                  {status==='testing'?'Testing...': status==='ok'?'Connected': 'Invalid key'}
                </span>
              </div>
            )}
          </div>

          {/* Info banner */}
          <div style={{
            display:'flex', gap:10, padding:'12px 14px',
            background:'rgba(109,92,255,0.06)',
            border:'1px solid rgba(109,92,255,0.15)',
            borderRadius:9, marginBottom:20, alignItems:'flex-start',
          }}>
            <Info size={14} color="var(--primary-light)" style={{ flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:12.5, color:'var(--text-2)', lineHeight:1.6 }}>
              Your API key must also be set in <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>AtsApi/appsettings.Development.json</code> under the <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>GeminiApiKey</code> field for the backend parser to work.
            </p>
          </div>

          {/* Key Input */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:7, letterSpacing:'0.03em' }}>
              API KEY
            </label>
            <div style={{ position:'relative' }}>
              <Key size={14} color="var(--text-4)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              <input
                className="input"
                style={{ paddingLeft:34 }}
                type={masked ? 'password' : 'text'}
                placeholder="AIza..."
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setStatus('idle'); }}
                spellCheck={false}
              />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
              <button
                style={{ fontSize:12, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}
                onClick={()=>setMasked(!masked)}
              >
                {masked ? 'Show key' : 'Hide key'}
              </button>
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button
              className="btn btn-ghost"
              style={{ flex:1 }}
              onClick={testConnection}
              disabled={!apiKey.trim() || status==='testing'}
            >
              Test Connection
            </button>
            <button
              className="btn btn-primary"
              style={{ flex:2 }}
              onClick={saveKey}
              disabled={!apiKey.trim()}
            >
              {saved ? <><CheckCircle2 size={14} /> Saved!</> : 'Save API Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card anim-fade-up" style={{ animationDelay:'0.1s', padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'var(--emerald-glow)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Shield size={17} color="var(--emerald)" />
          </div>
          <div>
            <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:15, color:'var(--text-1)' }}>
              Security & Access
            </h3>
            <p style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>User roles, SSO, and 2FA</p>
          </div>
        </div>
        <div style={{
          padding:'14px 16px', borderRadius:9,
          background:'rgba(255,255,255,0.02)',
          border:'1px dashed var(--border)',
          fontSize:13, color:'var(--text-3)', textAlign:'center',
        }}>
          Multi-user authentication coming in v2.0
        </div>
      </div>
    </div>
  );
}
