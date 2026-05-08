'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface UserIdentity {
  username: string;
  userId: string;
  apiKey: string;
}

interface UserContextType {
  user: UserIdentity | null;
  loading: boolean;
  showIdentityModal: boolean;
  setShowIdentityModal: (show: boolean) => void;
  register: (username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const STORAGE_KEY = 'co_human_identity';

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username && parsed.userId && parsed.apiKey) {
          setUser(parsed);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  const register = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMsg = `Login failed (${res.status})`;
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errorMsg = data.detail[0].msg || errorMsg;
        }
        return { success: false, error: errorMsg };
      }

      const data = await res.json();
      const identity: UserIdentity = {
        username: data.user.username,
        userId: data.user.id,
        apiKey: data.api_key,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
      setUser(identity);
      setShowIdentityModal(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (user?.apiKey) {
      headers.set('Authorization', `Bearer ${user.apiKey}`);
    }
    return fetch(url, { ...options, headers });
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, showIdentityModal, setShowIdentityModal, register, logout, authFetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
