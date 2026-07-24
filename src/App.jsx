import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './pages/LoginView';
import CareersPortal from './pages/CareersPortal';

function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', color: 'var(--text-3)',
    }}>
      Loading ATS...
    </div>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <LoginView />;
  return <Layout />;
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/careers/*" element={<CareersPortal />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <LoginView />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
