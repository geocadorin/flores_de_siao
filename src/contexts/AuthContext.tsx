import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name: string;
  role: 'admin' | 'user' | 'staff' | string;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  signUp: (email: string, password: string, fullName: string, clinicName: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  markOnboardingCompleted: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      setOnboardingCompleted(null);
      return;
    }

    setProfile(data as Profile);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('onboarding_completed')
      .eq('id', data.tenant_id)
      .maybeSingle();

    if (tenantError) {
      setOnboardingCompleted(null);
      return;
    }

    setOnboardingCompleted(Boolean((tenant as { onboarding_completed?: boolean } | null)?.onboarding_completed));
  }, []);

  const refreshAuthState = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id);
      return;
    }

    setProfile(null);
    setOnboardingCompleted(null);
  }, [fetchProfile]);

  const markOnboardingCompleted = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  useEffect(() => {
    const syncSession = async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
        setOnboardingCompleted(null);
      }

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    void (async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      await syncSession(initialSession);
    })();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, clinicName: string) => {
    const slug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Signup failed');

    const { error: setupError } = await supabase.rpc('setup_new_tenant' as any, {
      p_user_id: authData.user.id,
      p_tenant_name: clinicName,
      p_tenant_slug: slug,
      p_full_name: fullName,
    });

    if (setupError) throw setupError;

    return authData;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOnboardingCompleted(null);
    navigate('/auth', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        onboardingCompleted,
        signUp,
        signIn,
        signOut,
        refreshAuthState,
        markOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
