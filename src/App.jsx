import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './pages/LoginView';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text-3)' }}>
        Loading ATS...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <Layout />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
