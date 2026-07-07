import React, { useState, useEffect } from 'react';

export default function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState({ submitted: [], relevant: [] });
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDept, setNewJobDept] = useState('');

  useEffect(() => {
    fetch('/api/ats/jobs')
      .then(res => res.json())
      .then(data => setJobs(data))
      .catch(err => console.error("Error fetching jobs", err));
  }, []);

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    fetch(`/api/ats/jobs/${job.id}/candidates`)
      .then(res => res.json())
      .then(data => {
        setCandidates({
          submitted: data.submitted || [],
          relevant: data.relevant || []
        });
      })
      .catch(err => console.error("Error fetching candidates for job", err));
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJobTitle || !newJobDept) return;
    
    try {
      const response = await fetch('/api/ats/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newJobTitle, department: newJobDept, status: 'Active' })
      });
      const created = await response.json();
      setJobs(prev => [...prev, created]);
      setNewJobTitle('');
      setNewJobDept('');
    } catch (err) {
      console.error("Error creating job", err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Column: Job List */}
      <div style={styles.jobListContainer}>
        <h2 style={styles.header}>Active Requisitions</h2>
        <div style={styles.list}>
          {jobs.map(job => (
            <div 
              key={job.id} 
              className={`glass-card-interactive ${selectedJob?.id === job.id ? 'active' : ''}`}
              style={{...styles.jobCard, ...(selectedJob?.id === job.id ? styles.activeCard : {})}}
              onClick={() => handleSelectJob(job)}
            >
              <h3 style={styles.jobTitle}>{job.title}</h3>
              <p style={styles.jobDept}>{job.department} • {job.status}</p>
            </div>
          ))}
        </div>
        
        <div style={{marginTop: '2rem'}}>
          <h3 style={styles.subHeader}>Create New Job</h3>
          <form onSubmit={handleCreateJob} style={styles.createForm}>
            <input 
              style={styles.input} 
              placeholder="Job Title" 
              value={newJobTitle} 
              onChange={e => setNewJobTitle(e.target.value)} 
            />
            <input 
              style={styles.input} 
              placeholder="Department" 
              value={newJobDept} 
              onChange={e => setNewJobDept(e.target.value)} 
            />
            <button type="submit" className="btn-primary" style={{padding: '0.5rem 1rem'}}>Create</button>
          </form>
        </div>
      </div>

      {/* Right Column: Candidates for selected job */}
      <div style={styles.jobDetailsContainer}>
        {selectedJob ? (
          <div>
            <h2 style={styles.header}>Candidates for {selectedJob.title}</h2>
            
            <h3 style={styles.subHeader}>Submitted Candidates</h3>
            <div style={styles.candidateGrid}>
              {candidates.submitted.length > 0 ? candidates.submitted.map(c => (
                <div key={c.id} className="glass-card-interactive">
                  <h4 style={styles.cName}>{c.name}</h4>
                  <p style={styles.cRole}>{c.role}</p>
                  <span style={styles.cStage}>{c.stage}</span>
                </div>
              )) : <p style={styles.noData}>No submitted candidates yet.</p>}
            </div>

            <h3 style={styles.subHeader}>Relevant Global Candidates</h3>
            <div style={styles.candidateGrid}>
              {candidates.relevant.length > 0 ? candidates.relevant.map(c => (
                <div key={c.id} className="glass-card-interactive">
                  <h4 style={styles.cName}>{c.name}</h4>
                  <p style={styles.cRole}>{c.role}</p>
                  <span style={styles.cMatch}>Match: {c.matchScore}%</span>
                </div>
              )) : <p style={styles.noData}>No relevant candidates found.</p>}
            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>Select a job to view candidates</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    padding: '2rem',
    gap: '2rem'
  },
  jobListContainer: {
    flex: '0 0 350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    paddingRight: '2rem'
  },
  jobDetailsContainer: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  header: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  subHeader: {
    fontSize: '1.2rem',
    fontWeight: '500',
    marginTop: '2rem',
    marginBottom: '1rem',
    color: 'hsl(var(--primary-hsl))'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  jobCard: {
    cursor: 'pointer'
  },
  activeCard: {
    borderColor: 'hsl(var(--primary-hsl))',
    background: 'rgba(37, 99, 235, 0.1)'
  },
  jobTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  jobDept: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-secondary-hsl))'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'hsl(var(--text-muted-hsl))'
  },
  candidateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem'
  },
  cName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'white'
  },
  cRole: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary-hsl))',
    marginBottom: '0.5rem'
  },
  cStage: {
    fontSize: '0.75rem',
    padding: '0.2rem 0.5rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  cMatch: {
    fontSize: '0.85rem',
    color: 'hsl(var(--success-hsl))',
    fontWeight: '600'
  },
  noData: {
    color: 'hsl(var(--text-muted-hsl))',
    fontStyle: 'italic'
  },
  createForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  input: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.2)',
    color: 'white'
  }
};
