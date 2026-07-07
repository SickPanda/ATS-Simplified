import React, { useState } from 'react';
import { X, Upload, Cpu, Star, FileJson, CheckSquare, ShieldCheck, Activity } from 'lucide-react';

export default function CandidateDetails({ candidate, onClose, onUpdateCandidate }) {
  const [parsing, setParsing] = useState(false);
  const [activeTab, setActiveTab] = useState('match');
  
  const [techRating, setTechRating] = useState(candidate.rating ? Math.floor(candidate.rating) : 4);
  const [fitRating, setFitRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [pushingScorecard, setPushingScorecard] = useState(false);
  const [scorecardPushed, setScorecardPushed] = useState(false);

  const [parsedData, setParsedData] = useState(null);

  const simulateAIParse = () => {
    setParsing(true);
    setParsedData(null);
    
    setTimeout(() => {
      setParsing(false);
      setParsedData({
        education: [
          { degree: 'B.S. in Computer Science', institution: 'Georgia Tech', year: '2016' }
        ],
        primarySkills: ['React', 'Node.js', 'TypeScript', 'Kubernetes', 'Cloud Infrastructure', 'GraphQL'],
        contact: { email: candidate.email || 'developer@aura.io', phone: '+1 (555) 992-0481' },
        rawJson: JSON.stringify({
          status: "SUCCESS",
          engine: "Aura-AI-Parser-v1.0",
          schema_version: "1.0.3",
          extracted_at: new Date().toISOString(),
          candidate_profile: {
            full_name: candidate.name,
            matched_role: candidate.role,
            years_experience: candidate.exp,
            cognitive_score: 9.4
          },
          skills_taxonomy: {
            expert_tier: ["React", "TypeScript", "Node.js"],
            proficient_tier: ["Kubernetes", "AWS Cloud", "Docker"]
          }
        }, null, 2)
      });
      
      onUpdateCandidate({
        ...candidate,
        matchScore: 96,
      });
    }, 1800);
  };

  const handlePushScorecard = () => {
    setPushingScorecard(true);
    setTimeout(() => {
      setPushingScorecard(false);
      setScorecardPushed(true);
      
      const averageScore = ((techRating + fitRating + 5) / 3).toFixed(1);
      
      onUpdateCandidate({
        ...candidate,
        rating: averageScore
      });

      setTimeout(() => {
        setScorecardPushed(false);
      }, 2000);
    }, 1200);
  };

  if (!candidate) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div className="glass-panel" style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.drawerHeader}>
          <div style={styles.candidateIntro}>
            <div style={styles.avatar}>
              {candidate.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 style={styles.candidateName}>{candidate.name}</h2>
              <p style={styles.candidateRole}>{candidate.role}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div style={styles.syncBanner}>
          <div style={styles.syncTag}>
            <Activity size={12} className="text-cyan" />
            <span style={styles.syncText}>
              Aura Storage: <strong>Native Talent Record</strong> (Verified ID: AURA_T_9901)
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={styles.tabsRow}>
          <button
            onClick={() => setActiveTab('match')}
            style={{ ...styles.tabBtn, ...(activeTab === 'match' ? styles.tabBtnActive : {}) }}
          >
            <span>Resume Intelligence</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            style={{ ...styles.tabBtn, ...(activeTab === 'json' ? styles.tabBtnActive : {}) }}
          >
            <span>Extracted Schema</span>
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            style={{ ...styles.tabBtn, ...(activeTab === 'scorecard' ? styles.tabBtnActive : {}) }}
          >
            <span>ClearCo Scorecard</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div style={styles.contentBody}>
          {activeTab === 'match' && (
            <div style={styles.tabContent}>
              {!parsedData && !parsing ? (
                <div style={styles.uploadArea}>
                  <Upload size={24} style={{ color: 'hsl(var(--text-muted-hsl))', marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>AI Ingest Engine</h3>
                  <p style={styles.uploadSub}>Simulate automated parsing of incoming recruiter documents.</p>
                  
                  <button onClick={simulateAIParse} className="btn-primary" style={{ marginTop: '1rem' }}>
                    <Cpu size={13} />
                    <span>Run Resume Extraction</span>
                  </button>
                </div>
              ) : parsing ? (
                <div style={styles.parsingLoader}>
                  <RefreshCw size={24} className="spin-sync" style={{ color: 'hsl(var(--primary-hsl))', marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Parsing Candidate Fields</h3>
                  <p style={styles.uploadSub}>Validating skill trees and contact entities...</p>
                </div>
              ) : (
                <div style={styles.parsedContainer}>
                  {/* AI Match Core Scorecard */}
                  <div style={styles.matchScoreCard}>
                    <div style={styles.scoreBarContainer}>
                      <div style={styles.scoreHeaderRow}>
                        <span style={styles.scoreVerdict}>EXCELLENT CANDIDATE FIT</span>
                        <span style={styles.scorePercent}>96 / 100</span>
                      </div>
                      <div style={styles.progressBarTrack}>
                        <div style={{ ...styles.progressBarFill, width: '96%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={styles.infoSection}>
                    <div style={styles.sectionHeader}>CONTACT INFORMATION</div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Email</span>
                      <span style={styles.infoValue}>{parsedData.contact.email}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Phone</span>
                      <span style={styles.infoValue}>{parsedData.contact.phone}</span>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div style={styles.infoSection}>
                    <div style={styles.sectionHeader}>SKILLS TAXONOMY DETECTED</div>
                    <div style={styles.skillsGrid}>
                      {parsedData.primarySkills.map((skill, idx) => (
                        <div key={idx} style={styles.skillChip}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div style={styles.infoSection}>
                    <div style={styles.sectionHeader}>VERIFIED EDUCATION</div>
                    {parsedData.education.map((edu, idx) => (
                      <div key={idx} style={styles.eduBlock}>
                        <div style={styles.eduDegree}>{edu.degree}</div>
                        <div style={styles.eduInst}>{edu.institution} — {edu.year}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <div style={styles.tabContent}>
              {!parsedData ? (
                <div style={styles.emptyState}>
                  <p style={styles.uploadSub}>Run resume ingestion in the first tab to view data schema.</p>
                </div>
              ) : (
                <pre style={styles.jsonTerminal}>{parsedData.rawJson}</pre>
              )}
            </div>
          )}

          {activeTab === 'scorecard' && (
            <div style={styles.tabContent}>
              <div style={styles.scorecardContainer}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Aura Structured Scorecard</h3>
                <p style={styles.uploadSub}>Ratings write directly into your organization's hiring manager evaluation dashboard.</p>

                <div style={styles.scorecardSection}>
                  <div style={styles.ratingRow}>
                    <span style={styles.ratingLabel}>Technical Proficiency</span>
                    <div style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setTechRating(s)} style={styles.starBtn}>
                          <Star size={14} fill={s <= techRating ? "hsl(var(--warning-hsl))" : "none"} stroke="hsl(var(--warning-hsl))" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.ratingRow}>
                    <span style={styles.ratingLabel}>Culture & Communication</span>
                    <div style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setFitRating(s)} style={styles.starBtn}>
                          <Star size={14} fill={s <= fitRating ? "hsl(var(--warning-hsl))" : "none"} stroke="hsl(var(--warning-hsl))" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Evaluation Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add structured recruiter feedback..."
                      style={styles.textarea}
                    />
                  </div>

                  <button
                    onClick={handlePushScorecard}
                    disabled={pushingScorecard}
                    className="btn-primary"
                    style={{ ...styles.submitBtn, background: scorecardPushed ? 'hsl(var(--success-hsl))' : '' }}
                  >
                    <span>{pushingScorecard ? 'Saving Scorecard...' : scorecardPushed ? 'Scorecard Saved Natively!' : 'Submit Scorecard'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  drawer: {
    width: '460px',
    height: '100%',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
    background: '#10131B',
    borderRadius: '0px',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    overflowY: 'auto',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '1rem',
  },
  candidateIntro: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'white',
  },
  candidateName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'white',
  },
  candidateRole: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary-hsl))',
    fontWeight: 500,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'hsl(var(--text-secondary-hsl))',
  },
  syncBanner: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
  },
  syncTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  syncText: {
    fontSize: '0.7rem',
    color: 'hsl(var(--text-secondary-hsl))',
  },
  tabsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '0.2rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-secondary-hsl))',
    fontSize: '0.7rem',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'white',
  },
  contentBody: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px dashed rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-sm)',
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    flexGrow: 1,
    background: 'rgba(255, 255, 255, 0.01)',
  },
  uploadSub: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary-hsl))',
    maxWidth: '280px',
    lineHeight: 1.45,
  },
  parsingLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    flexGrow: 1,
  },
  parsedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  matchScoreCard: {
    background: 'rgba(37, 99, 235, 0.03)',
    border: '1px solid rgba(37, 99, 235, 0.12)',
    borderRadius: 'var(--radius-sm)',
    padding: '1rem',
  },
  scoreBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  scoreHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreVerdict: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'hsl(var(--primary-hsl))',
    letterSpacing: '0.02em',
  },
  scorePercent: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'white',
  },
  progressBarTrack: {
    width: '100%',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'hsl(var(--primary-hsl))',
    borderRadius: '99px',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionHeader: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'hsl(var(--text-muted-hsl))',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '0.35rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  infoLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'hsl(var(--text-secondary-hsl))',
  },
  infoValue: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'white',
  },
  skillsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  skillChip: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'white',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '0.25rem 0.55rem',
    borderRadius: '4px',
  },
  eduBlock: {
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 255, 255, 0.01)',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  eduDegree: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'white',
  },
  eduInst: {
    fontSize: '0.7rem',
    color: 'hsl(var(--text-secondary-hsl))',
  },
  jsonTerminal: {
    background: '#0E1119',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '4px',
    padding: '0.85rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-secondary-hsl))',
    lineHeight: 1.45,
    maxHeight: '350px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    textAlign: 'center',
    padding: '1.5rem',
  },
  scorecardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  scorecardSection: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-sm)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'hsl(var(--text-secondary-hsl))',
  },
  stars: {
    display: 'flex',
    gap: '0.15rem',
  },
  starBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'hsl(var(--text-secondary-hsl))',
  },
  textarea: {
    width: '100%',
    height: '75px',
    padding: '0.55rem',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-sm)',
    color: 'white',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.75rem',
    resize: 'none',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    justifyContent: 'center',
    width: '100%',
    fontSize: '0.8rem',
    padding: '0.55rem',
  },
};
