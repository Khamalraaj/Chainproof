import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole') || 'manager';
    if (token) {
      try {
        if (token === 'mock-token-123') {
          setUser({ id: 'demo', role });
        } else {
          const decoded = jwtDecode(token);
          setUser(decoded);
        }
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, role = 'manager') => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role); // Save role for mock persist
    if (token === 'mock-token-123') {
      setUser({ id: 'demo', role });
    } else {
      setUser(jwtDecode(token));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
