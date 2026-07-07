import React, { useState, useEffect, useRef } from 'react';

export default function CandidatesView() {
  const [candidates, setCandidates] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/ats/candidates')
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error("Error fetching candidates", err));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/ats/resume/parse', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      console.log("Parsed Resume Result:", result);
      
      if (result.candidate) {
        setCandidates(prev => [...prev, result.candidate]);
      }
    } catch (err) {
      console.error("Error uploading resume", err);
      alert('Failed to parse resume.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.header}>Global Talent Pool</h2>
        
        <div>
          <input 
            type="file" 
            accept=".pdf" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            id="resume-upload" 
          />
          <label htmlFor="resume-upload" className="btn-primary" style={{cursor: 'pointer'}}>
            {isUploading ? 'Parsing with AI...' : 'Upload Resume (PDF)'}
          </label>
        </div>
      </div>
      
      <div className="glass-panel" style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Candidate Name</th>
              <th style={styles.th}>Role / Headline</th>
              <th style={styles.th}>Experience</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Rating</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => (
              <tr key={c.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.nameCell}>
                    <div style={styles.avatar}>{c.name.charAt(0)}</div>
                    {c.name}
                  </div>
                </td>
                <td style={styles.td}>{c.role}</td>
                <td style={styles.td}>{c.experience}</td>
                <td style={styles.td}>{c.email}</td>
                <td style={styles.td}>
                  {c.rating ? (
                    <span style={styles.ratingBadge}>⭐ {c.rating}</span>
                  ) : (
                    <span style={styles.unratedBadge}>Unrated</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  header: {
    fontSize: '1.75rem',
    fontWeight: '700'
  },
  tableContainer: {
    flex: 1,
    overflow: 'auto',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  th: {
    padding: '1rem',
    color: 'hsl(var(--text-muted-hsl))',
    fontWeight: '600',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s'
  },
  td: {
    padding: '1rem',
    fontSize: '0.95rem'
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontWeight: '600'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem'
  },
  ratingBadge: {
    background: 'rgba(255, 170, 0, 0.1)',
    color: '#ffaa00',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  unratedBadge: {
    color: 'hsl(var(--text-muted-hsl))',
    fontSize: '0.85rem'
  }
};
