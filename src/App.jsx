import React, { useState } from 'react';
import Navbar from './components/Navbar';
import JobsView from './components/JobsView';
import CandidatesView from './components/CandidatesView';
import CandidateDetails from './components/CandidateDetails';

export default function App() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const handleUpdateCandidate = (updatedCandidate) => {
    // This would typically be an API call to update the candidate in the DB
    console.log("Candidate updated", updatedCandidate);
    if (selectedCandidate && selectedCandidate.id === updatedCandidate.id) {
      setSelectedCandidate(updatedCandidate);
    }
  };

  return (
    <div className="app-container">
      {/* Sleek, glowing background spots */}
      <div className="glow-canvas" />

      {/* Persistent Left Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Viewport Container */}
      <div style={styles.mainViewport}>
        {activeTab === 'jobs' && (
          <JobsView />
        )}

        {activeTab === 'candidates' && (
          <CandidatesView />
        )}
      </div>

      {/* Sliding Candidate Profile Drawer (Portal overlay) */}
      {selectedCandidate && (
        <CandidateDetails
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdateCandidate={handleUpdateCandidate}
        />
      )}
    </div>
  );
}

const styles = {
  mainViewport: {
    flexGrow: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowY: 'auto',
  },
};
