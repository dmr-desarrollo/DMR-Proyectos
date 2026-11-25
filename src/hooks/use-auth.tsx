
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getVendedores, getPersonasInvolucradas } from '@/lib/data';
import { findPersonByEmail, isAdmin as checkIsAdmin } from '@/lib/utils';
import type { Vendedor, PersonaInvolucrada } from '@/lib/types';


interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [allPeople, setAllPeople] = useState<(Vendedor | PersonaInvolucrada)[]>([]);

  useEffect(() => {
    const fetchPeople = async () => {
        try {
            setPeopleLoading(true);
            const [vendedores, personas] = await Promise.all([getVendedores(), getPersonasInvolucradas()]);
            setAllPeople([...vendedores, ...personas]);
        } catch (error) {
            console.error("Failed to fetch people list for auth", error);
        } finally {
            setPeopleLoading(false);
        }
    };
    fetchPeople();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setFirebaseLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const loggedInPerson = useMemo(() => findPersonByEmail(user, allPeople), [user, allPeople]);
  const isAdmin = useMemo(() => checkIsAdmin(loggedInPerson), [loggedInPerson]);

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    user,
    isAdmin,
    loading: firebaseLoading || peopleLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
