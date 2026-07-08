import { useEffect, useState } from 'react';
import { Building2, Plus, Search, Mail, Phone, MapPin, X, FileText, Send } from 'lucide-react';

export default function ClientsView() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [submittals, setSubmittals] = useState([]);
  
  // New Client Form
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const fetchClients = () => {
    fetch('/api/ats/clients')
      .then(res => res.json())
      .then(setClients)
      .catch(console.error);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ats/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry, contactEmail: email, phone, location })
      });
      if (res.ok) {
        setShowDrawer(false);
        setName(''); setIndustry(''); setEmail(''); setPhone(''); setLocation('');
        fetchClients();
      }
    } catch(err) { console.error(err); }
  };

  const filtered = clients.filter(c => 
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const openClientDetails = async (client) => {
    setSelectedClient(client);
    try {
      const res = await fetch(`/api/ats/clients/${client.id}/submittals`);
      if (res.ok) setSubmittals(await res.json());
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Clients
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Manage hiring companies and staffing clients
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
          <Plus size={14} /> New Client
        </button>
      </div>

      {/* Filters */}
      <div className="anim-fade-up" style={{ display:'flex', gap:12, animationDelay:'0.05s' }}>
        <div className="input-search" style={{ flex:1, maxWidth:400 }}>
          <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
          <input
            placeholder="Search clients..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="anim-fade-up" style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16, animationDelay:'0.1s'
      }}>
        {filtered.map(c => (
          <div key={c.id} className="card-lift" onClick={() => openClientDetails(c)} style={{ display:'flex', flexDirection:'column', gap:16, padding:20, cursor:'pointer' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{
                width:44, height:44, borderRadius:10,
                background:'var(--surface-2)', border:'1px solid var(--border)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Building2 size={20} color="var(--primary)" />
              </div>
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-1)' }}>{c.name}</h3>
                <p style={{ fontSize:12, color:'var(--text-3)' }}>{c.industry}</p>
              </div>
              <div style={{
                padding:'4px 8px', borderRadius:99, fontSize:10, fontWeight:700, textTransform:'uppercase',
                background: c.status==='Active' ? 'rgba(0,229,160,0.1)' : 'rgba(255,255,255,0.05)',
                color: c.status==='Active' ? 'var(--emerald)' : 'var(--text-3)',
                border: `1px solid ${c.status==='Active' ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`
              }}>
                {c.status}
              </div>
            </div>

            <div style={{ height:1, background:'var(--border)' }} />

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--text-2)' }}>
                <Mail size={13} color="var(--text-4)" /> {c.contactEmail || 'No email'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--text-2)' }}>
                <Phone size={13} color="var(--text-4)" /> {c.phone || 'No phone'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--text-2)' }}>
                <MapPin size={13} color="var(--text-4)" /> {c.location || 'No location'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {showDrawer && (
        <>
          <div className="overlay" onClick={()=>setShowDrawer(false)} />
          <div style={{
            position:'fixed', inset:0, zIndex:51,
            display:'flex', alignItems:'stretch',
            animation:'fadeIn 0.2s ease both',
          }}>
            <div style={{ flex:1 }} onClick={()=>setShowDrawer(false)} />
            <div style={{
              width:440, background:'var(--surface)', borderLeft:'1px solid var(--border)',
              display:'flex', flexDirection:'column',
              animation:'slideRight 0.32s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-1)' }}>New Client</h3>
                <button type="button" className="btn-icon" onClick={()=>setShowDrawer(false)}><X size={16} /></button>
              </div>

              <form onSubmit={handleCreate} style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:20 }}>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input" required value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" placeholder="e.g. Technology" value={industry} onChange={e=>setIndustry(e.target.value)} />
                </div>
                <div>
                  <label className="label">Contact Email</label>
                  <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={location} onChange={e=>setLocation(e.target.value)} />
                </div>
                
                <div style={{ marginTop:'auto', display:'flex', gap:12 }}>
                  <button type="button" className="btn btn-ghost" style={{flex:1}} onClick={()=>setShowDrawer(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Create Client</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Client Details Drawer */}
      {selectedClient && (
        <>
          <div className="overlay" onClick={()=>setSelectedClient(null)} />
          <div className="drawer" style={{ width: 600 }}>
            <div style={{ padding:'24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>{selectedClient.name}</h3>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12}/> {selectedClient.location}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={12}/> {selectedClient.contactEmail}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" className="btn-icon" onClick={()=>setSelectedClient(null)}><X size={16} /></button>
            </div>

            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={14} color="var(--primary)" /> SUBMITTALS ({submittals.length})
              </h4>
              
              {submittals.length === 0 ? (
                <div className="empty-state">
                  <p>No candidates have been submitted to this client yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submittals.map(s => (
                    <div key={s.id} style={{
                      padding: 16, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{s.candidateName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>For: <span style={{ color: 'var(--text-2)' }}>{s.jobTitle}</span></div>
                        </div>
                        <span className={`badge ${s.status === 'Pending Review' ? 'badge-draft' : 'badge-active'}`}>
                          {s.status}
                        </span>
                      </div>
                      
                      <div style={{
                        padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.2)',
                        fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5
                      }}>
                        <strong>Notes:</strong> {s.summary || 'No summary provided.'}
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', justifyContent: 'flex-end' }}>
                        Submitted {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
