import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  profileStatus: 'loading' | 'loaded' | 'missing' | 'error';
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<AuthContextValue['profileStatus']>('loading');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (!user) {
      setProfile(null);
      setProfileStatus('missing');
      return () => {
        isCurrent = false;
      };
    }

    const userId = user.id;
    setProfile(null);
    setProfileStatus('loading');

    async function loadProfile() {
      try {
        const { data, error } = await supabase
        .from('z_users')
        .select('id, display_name, email')
        .eq('id', userId)
        .maybeSingle();

        if (!isCurrent) {
        return;
        }

        if (error) {
        console.error('Failed to load user profile from z_users:', { userId, error });
        setProfileStatus('error');
        } else if (!data) {
        console.warn('No z_users row found for authenticated user:', userId);
        setProfileStatus('missing');
        } else {
        setProfile(data);
        setProfileStatus('loaded');
        }
      } catch (error) {
        if (isCurrent) {
        console.error('Unexpected error loading user profile from z_users:', { userId, error });
        setProfileStatus('error');
        }
      }
    }

    void loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const value = useMemo(
    () => ({ user, profile, profileStatus, isLoading }),
    [user, profile, profileStatus, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
