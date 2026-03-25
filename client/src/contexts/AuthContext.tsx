import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, confirmPassword: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function firebaseUserToUser(u: FirebaseUser | null): User | null {
  if (!u) return null;
  return {
    id: u.uid,
    email: u.email ?? '',
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUserToUser(firebaseUser));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        setUser(firebaseUserToUser(result.user));
        return {};
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Login failed.';
        if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password'))
          return { error: 'Invalid email or password.' };
        if (message.includes('auth/user-not-found')) return { error: 'No account found with this email.' };
        return { error: message };
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, confirmPassword: string): Promise<{ error?: string }> => {
      if (password !== confirmPassword) return { error: 'Password and confirmation do not match.' };
      try {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setUser(firebaseUserToUser(result.user));
        return {};
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Registration failed.';
        if (message.includes('auth/email-already-in-use')) return { error: 'An account with this email already exists.' };
        if (message.includes('auth/weak-password')) return { error: 'Password is too weak.' };
        return { error: message };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
