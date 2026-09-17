'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, getAuthUser, onAuthStateChange } from '../lib/auth';
import { setCurrentUser, getUsers } from '../lib/storage';
import { User } from '../types';

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

function syncAuthUserToStorage(u: AuthUser | null) {
  if (typeof window === 'undefined') return;
  if (!u) {
    setCurrentUser(null);
    return;
  }
  const username = u.email ? u.email.split('@')[0] : u.id;
  const mappedUser: User = {
    id: u.id,
    username: username,
    password: '',
    name: u.name || username,
    email: u.email,
    role: u.role,
    avatar: u.avatarUrl || undefined,
    title: u.role === 'admin' ? 'Chief Bureau Administrator' : 'Field Operative',
    department: 'Dispatch & Logistics',
    deskNumber: `DK-${u.id.slice(0, 4).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  const existingIdx = users.findIndex(
    (existing) => existing.id === u.id || existing.username.toLowerCase() === username.toLowerCase()
  );
  if (existingIdx >= 0) {
    users[existingIdx] = {
      ...users[existingIdx],
      id: u.id,
      name: mappedUser.name,
      avatar: mappedUser.avatar || users[existingIdx].avatar,
      role: u.role,
      email: u.email,
    };
    localStorage.setItem('daily_bureau_users_v3', JSON.stringify(users));
  } else {
    users.push(mappedUser);
    localStorage.setItem('daily_bureau_users_v3', JSON.stringify(users));
  }
  setCurrentUser(mappedUser);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = (u: AuthUser | null) => {
    setUser(u);
    syncAuthUserToStorage(u);
  };

  const refresh = async () => {
    const u = await getAuthUser();
    applyUser(u);
  };

  useEffect(() => {
    // Initial load
    getAuthUser().then((u) => {
      applyUser(u);
      setLoading(false);
    });

    // Listen for sign-in / sign-out
    const unsub = onAuthStateChange((u) => {
      applyUser(u);
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
