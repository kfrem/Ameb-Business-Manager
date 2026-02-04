import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Business } from '@shared/schema';

interface AuthState {
  user: User | null;
  businesses: Business[];
  currentBusiness: Business | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface RegisterResult {
  success: boolean;
  error?: string;
}

interface AuthContextType extends AuthState {
  login: (phone: string, pin?: string) => Promise<boolean>;
  register: (name: string, phone: string, pin: string) => Promise<RegisterResult>;
  logout: () => void;
  setCurrentBusiness: (business: Business | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    businesses: [],
    currentBusiness: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('deebi_user');
    const savedBusiness = localStorage.getItem('deebi_business');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const business = savedBusiness ? JSON.parse(savedBusiness) : null;
      setState(prev => ({
        ...prev,
        user,
        currentBusiness: business,
        isAuthenticated: true,
        isLoading: false,
      }));
      fetchBusinesses(user.id);
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchBusinesses = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/businesses`);
      if (res.ok) {
        const businesses = await res.json();
        setState(prev => ({ ...prev, businesses }));
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    }
  };

  const login = async (phone: string, pin?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      if (res.ok) {
        const { user, businesses } = await res.json();
        localStorage.setItem('deebi_user', JSON.stringify(user));
        setState(prev => ({
          ...prev,
          user,
          businesses,
          isAuthenticated: true,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (name: string, phone: string, pin: string): Promise<RegisterResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, pin }),
      });
      const data = await res.json();
      
      if (res.ok) {
        const { user, businesses } = data;
        localStorage.setItem('deebi_user', JSON.stringify(user));
        setState(prev => ({
          ...prev,
          user,
          businesses,
          isAuthenticated: true,
        }));
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('deebi_user');
    localStorage.removeItem('deebi_business');
    setState({
      user: null,
      businesses: [],
      currentBusiness: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const setCurrentBusiness = (business: Business | null) => {
    if (business) {
      localStorage.setItem('deebi_business', JSON.stringify(business));
    } else {
      localStorage.removeItem('deebi_business');
    }
    setState(prev => ({ ...prev, currentBusiness: business }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, setCurrentBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
