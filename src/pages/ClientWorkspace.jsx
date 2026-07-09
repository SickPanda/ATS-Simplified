import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Routes, Route, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Globe, Phone, Mail, MoreVertical, Search, Plus } from 'lucide-react';

const TABS = [
  { id: 'snapshot', label: 'Snapshot', path: '' },
  { id: 'format', label: 'Client Submission Format', path: 'format' },
  { id: 'eforms', label: 'eForms', path: 'eforms' },
  { id: 'hires', label: 'Hires', path: 'hires' },
  { id: 'checklists', label: 'Checklists', path: 'checklists' },
  { id: 'markup', label: 'Markup Calculations', path: 'markup' },
];

export default function ClientWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [client, setClient] = useState(null);

  useEffect(() => {
    fetch(`/api/ats/clients/${id}`)
      .then(r => r.json())
      .then(setClient)
      .catch(console.error);
  }, [id]);

  if (!client) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading client...</div>;

  const currentTab = TABS.find(t => pathname.endsWith(t.path)) || TABS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Top Tab Bar */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 20, 
        padding: '0 24px', background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)' 
      }}>
        {TABS.map(tab => {
          const isActive = (tab.path === '' && pathname.endsWith(id)) || pathname.endsWith(tab.path);
          return (
            <Link
              key={tab.id}
              to={tab.path}
              style={{
                padding: '16px 0',
                color: isActive ? 'var(--primary)' : 'var(--text-2)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all var(--t-fast)'
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Routes>
          <Route path="/" element={<SnapshotTab client={client} setClient={setClient} />} />
          <Route path="/format" element={<PlaceholderTab title="Client Submission Format" />} />
          <Route path="/eforms" element={<PlaceholderTab title="eForms" />} />
          <Route path="/hires" element={<PlaceholderTab title="Hires" />} />
          <Route path="/checklists" element={<PlaceholderTab title="Checklists" />} />
          <Route path="/markup" element={<PlaceholderTab title="Markup Calculations" />} />
        </Routes>
      </div>
    </div>
  );
}

function SnapshotTab({ client, setClient }) {
  let contacts = [];
  try { contacts = JSON.parse(client.contactsJson || '[]'); } catch(e) {}

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Left Main Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Header Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--rose) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{client.name}</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Globe size={14} color="var(--primary)" />
                  <Search size={14} color="var(--primary)" />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                {client.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12}/> {client.phone}</span>}
                {client.contactEmail && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12}/> {client.contactEmail}</span>}
                {client.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12}/> {client.location}</span>}
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>Edit Client</button>
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>Add Job</button>
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>Add Job Requisition</button>
              </div>
              <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 11, marginTop: 12, background: 'var(--emerald)', color: '#fff' }}>
                + Add Tag
              </button>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
            Accounts
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>CONTACT PERSON</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>EMAIL ID</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>DESIGNATION</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>OFFICE NUMBER</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>MOBILE NUMBER</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-4)' }}>No data available</td>
              </tr>
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--text-4)' }}>Showing 0 to 0 of 0 entries</div>
        </div>

        {/* Contacts Table */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 16 }}>
              Contacts
              <div className="input-search" style={{ width: 200, padding: '4px 8px' }}>
                <Search size={12} color="var(--text-4)" />
                <input placeholder="Search contacts" style={{ fontSize: 12 }} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }}>+ Add</button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                <th style={{ width: 40, padding: '10px 10px 10px 20px' }}><input type="checkbox" /></th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>NAME</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>EMAIL</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>DESIGNATION</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>CONTACTS</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-4)' }}>No contacts found. Add one above.</td>
                </tr>
              ) : contacts.map((c, i) => (
                <tr key={i} className="trow">
                  <td style={{ padding: '12px 10px 12px 20px' }}><input type="checkbox" /></td>
                  <td style={{ padding: '12px 20px', color: 'var(--primary)', fontWeight: 500 }}>{c.Name}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--primary)' }}>{c.Email}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>{c.Title || 'N/A'}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>
                    <div>(M) {c.Phone || 'N/A'}</div>
                    <div style={{ marginTop: 2 }}>(O) N/A</div>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-3)' }}>Active</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <MoreVertical size={14} color="var(--text-4)" style={{ cursor: 'pointer' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--text-4)' }}>
            Showing 1 to {contacts.length} of {contacts.length} entries
          </div>
        </div>
      </div>

      {/* Right Sidebar - Client Information */}
      <div className="card" style={{ width: 300, flexShrink: 0, padding: 24, alignSelf: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Client Information</h3>
          <button className="btn-icon" style={{ padding: 4 }}><Globe size={14}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Ownership</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{client.primaryOwner || 'N/A'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Client Lead</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>N/A</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Email ID</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>N/A</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Fax</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>Fax</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Federal ID</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{client.federalId || 'N/A'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Send Hotlist</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>No</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Send Requirement</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>No</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Payment Terms</div>
            <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{client.paymentTerms || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ title }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>This section requires additional backend models and is currently under construction.</p>
    </div>
  );
}
