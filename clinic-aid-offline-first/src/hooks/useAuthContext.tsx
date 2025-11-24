import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean | null;
  user: unknown;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);

  const checkAuth = () => {
    const authData = localStorage.getItem('clinicLiteAuth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const tokenAge = Date.now() - new Date(parsed.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        
        if (tokenAge < maxAge) {
          setIsAuthenticated(true);
          setUser(parsed.user);
          return;
        }
      } catch (error) {
        console.error('Erreur parsing auth data:', error);
      }
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  const logout = () => {
    localStorage.removeItem('clinicLiteAuth');
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}