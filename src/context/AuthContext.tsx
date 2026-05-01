import React, { createContext, useContext, useEffect, useState } from 'react';
import { type BlocksUser, getCachedUser, isAuthenticated, fetchCurrentAccount, clearSession } from '../lib/blocks';

interface AuthContextType {
  user: BlocksUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<BlocksUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid session
  useEffect(() => {
    const init = async () => {
      if (isAuthenticated()) {
        // Try to use cached user first for instant UI
        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
          setLoading(false);
          // Refresh in background
          try {
            const fresh = await fetchCurrentAccount();
            setUser(fresh);
          } catch {
            // Token might be expired, clear session
            clearSession();
            setUser(null);
          }
        } else {
          try {
            const fresh = await fetchCurrentAccount();
            setUser(fresh);
          } catch {
            clearSession();
            setUser(null);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshUser = async () => {
    try {
      const fresh = await fetchCurrentAccount();
      setUser(fresh);
    } catch {
      clearSession();
      setUser(null);
    }
  };

  const signOut = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
