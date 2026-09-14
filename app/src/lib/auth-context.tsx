import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api, track, type User } from '@/lib/api';

type Session = { token: string; user: User };

type AuthValue = {
  session: Session | null;
  ready: boolean;
  signIn: (mode: 'login' | 'register', email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const KEY = 'tripwindow.session';

// SecureStore (iOS Keychain / Android Keystore) on device; it has no web implementation.
const storage = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(KEY)) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(KEY, v)) : SecureStore.setItemAsync(KEY, v)),
  del: () => (Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(KEY)) : SecureStore.deleteItemAsync(KEY)),
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage
      .get()
      .then((raw) => raw && setSession(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function signIn(mode: 'login' | 'register', email: string, password: string) {
    const s = await api<Session>(`/auth/${mode}`, { method: 'POST', body: { email, password } });
    await storage.set(JSON.stringify(s));
    setSession(s);
    track(mode === 'login' ? 'login' : 'register', {}, s.token);
  }

  async function signOut() {
    track('logout', {}, session?.token);
    await storage.del();
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
