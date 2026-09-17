'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, getAuthUser, onAuthStateChange } from '../lib/auth';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const u = await getAuthUser();
    setUser(u);
  };

  useEffect(() => {
    // Initial load
    getAuthUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Listen for sign-in / sign-out
    const unsub = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
