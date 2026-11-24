import React, { createContext, useCallback, useContext, useState } from 'react';
import { apiRequest, setAuthToken } from '../lib/api';
import type { UserProfile } from '../types/domain';

interface AuthContextValue {
  user: UserProfile | null;
  isAdmin: boolean;
  setSession: (token: string, user: UserProfile) => void;
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const setSession = useCallback((token: string, nextUser: UserProfile) => {
    setAuthToken(token);
    setUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        setSession,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
