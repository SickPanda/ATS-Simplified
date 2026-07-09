import { useEffect, useState } from 'react';
import { Building2, Plus, Search, Mail, Phone, MapPin, X, FileText, Send, Globe, Landmark, CreditCard, User, Users, PlusCircle, Trash2 } from 'lucide-react';

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
  const [website, setWebsite] = useState('');
  const [primaryOwner, setPrimaryOwner] = useState('Aazam Qureshi');
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
        setWebsite(''); setPrimaryOwner('Aazam Qureshi'); setFederalId(''); setPaymentTerms('Net 30'); setAboutCompany('');
        fetchClients();
      }
    } catch(err) { console.error(err); }
  };

  const openClientDetails = async (client) => {
    setSelectedClient(client);
    try {
      const res = await fetch(`/api/ats/clients/${client.id}/submittals`);
      if (res.ok) setSubmittals(await res.json());
    } catch (e) { console.error(e); }
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

  const filtered = clients.filter(c => 
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.industry?.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase()) ||
    c.primaryOwner?.toLowerCase().includes(search.toLowerCase())
  );

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
        <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
          <Plus size={14} /> New Client
        </button>
      </div>

      {/* KPI Cards */}
      <div className="anim-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, animationDelay: '0.05s' }}>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(109,92,255,0.1) 0%, rgba(109,92,255,0.02) 100%)', border: '1px solid rgba(109,92,255,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'var(--primary-glow)' }}><Building2 size={18} color="var(--primary-light)" /></div>
          <div className="kpi-val">{clients.length}</div>
          <div className="kpi-label">Active Clients</div>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.02) 100%)', border: '1px solid rgba(34,211,238,0.2)' }}>
          <div className="kpi-icon" style={{ background: 'rgba(34,211,238,0.15)' }}><MapPin size={18} color="var(--cyan)" /></div>
          <div className="kpi-val">{new Set(clients.map(c => c.industry).filter(Boolean)).size}</div>
          <div className="kpi-label">Industries Represented</div>
        </div>
      </div>

      {/* Filters */}
      <div className="anim-fade-up" style={{ display:'flex', gap:12, animationDelay:'0.05s' }}>
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

      {/* Client Details Drawer */}
      {selectedClient && (
        <>
          <div className="overlay" onClick={()=>setSelectedClient(null)} />
          <div className="drawer" style={{ width: 850, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding:'24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>{selectedClient.name}</h3>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap:'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12}/> {selectedClient.location || 'No Location'}
                    </span>
                    {selectedClient.website && (
                      <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={12}/> 
                        <a href={selectedClient.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', textDecoration:'none' }}>
                          {selectedClient.website}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" className="btn-icon" onClick={()=>setSelectedClient(null)}><X size={16} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', minHeight: 0 }}>
              {/* Left Column: Corporate Profile Info */}
              <div style={{ flex: 1, padding: 24, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 12 }}>
                    CORPORATE PROFILE
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Industry:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.industry}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Client Lead:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.primaryOwner || 'Unassigned'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Federal Tax ID:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.federalId || 'Not Specified'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Payment Terms:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.paymentTerms || 'Net 30'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Main Phone:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.phone || 'N/A'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      <strong>Main Email:</strong> <span style={{ color: 'var(--text-1)' }}>{selectedClient.contactEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {selectedClient.aboutCompany && (
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 8 }}>
                      ABOUT COMPANY
                    </h4>
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid var(--border)', margin: 0 }}>
                      {selectedClient.aboutCompany}
                    </p>
                  </div>
                )}

                {/* Submittals Section */}
                <div style={{ marginTop: 'auto' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={14} color="var(--primary)" /> PIPELINE SUBMITTALS ({submittals.length})
                  </h4>
                  
                  {submittals.length === 0 ? (
                    <div className="empty-state" style={{ padding: 20 }}>
                      <p style={{ fontSize:12.5 }}>No candidates submitted yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                      {submittals.map(s => (
                        <div key={s.id} style={{
                          padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{s.candidateName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>For: {s.jobTitle}</div>
                          </div>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(109,92,255,0.1)', color: 'var(--primary-light)', fontWeight: 600 }}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Contact Directory */}
              <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="var(--primary)" /> CONTACT DIRECTORY
                  </h4>

                  {/* List of Contacts */}
                  {(() => {
                    let parsedContacts = [];
                    try {
                      parsedContacts = JSON.parse(selectedClient.contactsJson || '[]');
                    } catch (e) { parsedContacts = []; }

                    if (parsedContacts.length === 0) {
                      return (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                          <p style={{ fontSize: 12.5 }}>No additional corporate contacts stored.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {parsedContacts.map((contact, idx) => (
                          <div key={idx} style={{
                            padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{contact.Name}</div>
                              <div style={{ fontSize: 12, color: 'var(--primary-light)', marginTop: 2 }}>{contact.Title}</div>
                              <div style={{ display:'flex', gap:10, marginTop: 4, fontSize:11.5, color:'var(--text-3)' }}>
                                <span>{contact.Email}</span>
                                {contact.Phone && <span>• {contact.Phone}</span>}
                              </div>
                            </div>
                            <button type="button" className="btn-icon" title="Remove Contact" onClick={() => handleDeleteContact(idx)}>
                              <Trash2 size={13} color="var(--rose)" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Add New Contact Form */}
                <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', padding: 16, borderRadius: 12 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PlusCircle size={13} color="var(--primary)" /> Add Directory Contact
                  </h5>
                  <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input className="input text-xs" style={{ height: 32 }} required placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
                      <input className="input text-xs" style={{ height: 32 }} placeholder="Title (e.g. HR Manager)" value={contactTitle} onChange={e=>setContactTitle(e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input type="email" className="input text-xs" style={{ height: 32 }} placeholder="Email Address" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} />
                      <input className="input text-xs" style={{ height: 32 }} placeholder="Direct Phone" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ height: 32, fontSize:12 }}>
                      Add Contact to Directory
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
