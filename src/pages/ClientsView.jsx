import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Mail, Phone, MapPin, X, FileText, Send, Globe, Landmark, CreditCard, User, Users, PlusCircle, Trash2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadCsvExport } from '../lib/export';
import { isMine } from '../lib/ownership';

function ownerLabel(user) {
  if (!user) return '';
  const raw = user.name || user.email?.split('@')[0] || '';
  const parts = raw.split(/[._\s-]+/).filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || raw;
}

export default function ClientsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const me = ownerLabel(user);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [deskMode, setDeskMode] = useState('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [submittals, setSubmittals] = useState([]);
  
  // New Client Form
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [primaryOwner, setPrimaryOwner] = useState(me);
  const [federalId, setFederalId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [aboutCompany, setAboutCompany] = useState('');

  // Contacts Sub-form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTitle, setContactTitle] = useState('');

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
        body: JSON.stringify({ 
          name, 
          industry, 
          contactEmail: email, 
          phone, 
          location,
          website,
          primaryOwner,
          federalId,
          paymentTerms,
          aboutCompany,
          contactsJson: '[]'
        })
      });
      if (res.ok) {
        setShowDrawer(false);
        setName(''); setIndustry(''); setEmail(''); setPhone(''); setLocation('');
        setWebsite(''); setPrimaryOwner(me); setFederalId(''); setPaymentTerms('Net 30'); setAboutCompany('');
        fetchClients();
      }
    } catch(err) { console.error(err); }
  };

  const openClientDetails = (client) => {
    navigate(`/clients/${client.id}`);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !selectedClient) return;

    let currentContacts = [];
    try {
      currentContacts = JSON.parse(selectedClient.contactsJson || '[]');
    } catch(err) { currentContacts = []; }

    const newContact = {
      Name: contactName.trim(),
      Email: contactEmail.trim(),
      Phone: contactPhone.trim(),
      Title: contactTitle.trim()
    };

    const updatedContacts = [...currentContacts, newContact];
    const updatedClient = {
      ...selectedClient,
      contactsJson: JSON.stringify(updatedContacts)
    };

    try {
      const res = await fetch(`/api/ats/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient)
      });
      if (res.ok) {
        setSelectedClient(updatedClient);
        setContactName(''); setContactEmail(''); setContactPhone(''); setContactTitle('');
        fetchClients();
      }
    } catch(err) { console.error(err); }
  };

  const handleDeleteContact = async (index) => {
    if (!selectedClient) return;

    let currentContacts = [];
    try {
      currentContacts = JSON.parse(selectedClient.contactsJson || '[]');
    } catch(err) { currentContacts = []; }

    const updatedContacts = currentContacts.filter((_, i) => i !== index);
    const updatedClient = {
      ...selectedClient,
      contactsJson: JSON.stringify(updatedContacts)
    };

    try {
      const res = await fetch(`/api/ats/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient)
      });
      if (res.ok) {
        setSelectedClient(updatedClient);
        fetchClients();
      }
    } catch(err) { console.error(err); }
  };

  const filtered = clients.filter(c => {
    const searchOk = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.primaryOwner?.toLowerCase().includes(search.toLowerCase());
    const deskOk = deskMode !== 'mine' || isMine(c.primaryOwner, user);
    return searchOk && deskOk;
  });

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            Client Command Center
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            Manage hiring companies and staffing clients
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => downloadCsvExport('clients').catch(e => alert(e.message))}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
            <Plus size={14} /> New Client
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, animationDelay: '0.05s' }}>
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon"><Building2 size={18} color="var(--primary)" /></div>
          <div className="kpi-val">{clients.length}</div>
          <div className="kpi-label">Active Clients</div>
        </div>
        <div className="kpi-card kpi-muted">
          <div className="kpi-icon" style={{ background: 'var(--surface-3)' }}><MapPin size={18} color="var(--text-2)" /></div>
          <div className="kpi-val">{new Set(clients.map(c => c.industry).filter(Boolean)).size}</div>
          <div className="kpi-label">Industries Represented</div>
        </div>
      </div>

      {/* Filters */}
      <div className="anim-fade-up" style={{ display:'flex', gap:12, animationDelay:'0.05s', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="tab-bar">
          <button type="button" className={`tab${deskMode==='all'?' active':''}`} onClick={() => setDeskMode('all')}>All desk</button>
          <button type="button" className={`tab${deskMode==='mine'?' active':''}`} onClick={() => setDeskMode('mine')}>My desk</button>
        </div>
        <div className="input-search" style={{ flex:1, maxWidth:400 }}>
          <Search size={14} color="var(--text-3)" style={{flexShrink:0}} />
          <input
            placeholder="Search by Name, Industry, Owner or Location..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="anim-fade-up" style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16, animationDelay:'0.1s'
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>{c.industry}</span>
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:11, color:'var(--primary-light)', textDecoration:'none' }}>
                      {c.website.replace('https://','').replace('http://','')}
                    </a>
                  )}
                </div>
              </div>
              <div style={{
                padding:'4px 8px', borderRadius:99, fontSize:10, fontWeight:700, textTransform:'uppercase',
                background: c.status==='Active' ? 'var(--success-soft)' : 'var(--surface-2)',
                color: c.status==='Active' ? 'var(--success)' : 'var(--text-3)',
                border: `1px solid ${c.status==='Active' ? 'rgba(4,120,87,0.2)' : 'var(--border)'}`
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
              {c.primaryOwner && (
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--text-2)' }}>
                  <User size={13} color="var(--text-4)" /> Lead: {c.primaryOwner}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Drawer: New Client Form */}
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
              width:480, background:'var(--surface)', borderLeft:'1px solid var(--border)',
              display:'flex', flexDirection:'column',
              animation:'slideRight 0.32s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-1)' }}>New Client</h3>
                <button type="button" className="btn-icon" onClick={()=>setShowDrawer(false)}><X size={16} /></button>
              </div>

              <form onSubmit={handleCreate} style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:18 }}>
                <div>
                  <label className="label">Company Name *</label>
                  <input className="input" required value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="label">Industry</label>
                    <input className="input" placeholder="e.g. Technology" value={industry} onChange={e=>setIndustry(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input className="input" placeholder="https://acme.com" value={website} onChange={e=>setWebsite(e.target.value)} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="label">Contact Email</label>
                    <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" placeholder="City, State" value={location} onChange={e=>setLocation(e.target.value)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="label">Federal Tax ID (EIN)</label>
                    <input className="input" placeholder="XX-XXXXXXX" value={federalId} onChange={e=>setFederalId(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Payment Terms</label>
                    <select className="input" value={paymentTerms} onChange={e=>setPaymentTerms(e.target.value)} style={{ appearance:'none', background:'var(--surface-2)' }}>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Client Lead (Primary Owner)</label>
                  <input className="input" value={primaryOwner} onChange={e=>setPrimaryOwner(e.target.value)} />
                </div>
                <div>
                  <label className="label">About Company</label>
                  <textarea className="input" rows={3} style={{ height:'auto', padding:'8px 12px' }} value={aboutCompany} onChange={e=>setAboutCompany(e.target.value)} />
                </div>
                
                <div style={{ marginTop:'auto', display:'flex', gap:12, paddingTop:20 }}>
                  <button type="button" className="btn btn-ghost" style={{flex:1}} onClick={()=>setShowDrawer(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{flex:1}}>Create Client</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
