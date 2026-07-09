import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Validate token with backend and get fresh user details
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    // Intercept global fetch to automatically append Bearer token
    const originalFetch = window.fetch;
    window.fetch = async function () {
      let [resource, config] = arguments;
      if (resource.startsWith('/api/')) {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          if (!config) config = {};
          if (!config.headers) config.headers = {};
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
      }
      
      const response = await originalFetch(resource, config);
      
      // Auto-logout if token expired/invalid
      if (response.status === 401 && resource !== '/api/auth/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch; // cleanup
    };
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
