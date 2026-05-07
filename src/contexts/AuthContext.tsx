import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Grab user details from social logins and implicitly create the profile
      // We wrap this in setTimeout to avoid deadlocking the supabase-js internal auth queue 
      // (as DB queries inside onAuthStateChange can trigger getSession(), causing a deadlock)
      if (event === 'SIGNED_IN' && session?.user) {
        const { id, user_metadata } = session.user;
        const nome = user_metadata?.full_name || user_metadata?.name || 'Membro fitClub';
        const avatar_url = user_metadata?.avatar_url || user_metadata?.picture || null;
        
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .upsert({
              id,
              nome,
              avatar_url
            }, { onConflict: 'id', ignoreDuplicates: true });
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Map Supabase errors to friendly Portuguese messages
      const msg = mapAuthError(error.message);
      return { error: msg };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, nome: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: nome.trim() },
      },
    });

    if (error) {
      const msg = mapAuthError(error.message);
      return { error: msg };
    }

    // Insert profile row
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          nome: nome.trim(),
        });

      if (profileError) {
        console.error('Profile insert error:', profileError);
      }
    }

    // If no session was returned (email confirmation required by GoTrue),
    // attempt to sign in immediately since our DB trigger auto-confirms the email
    if (!data.session && data.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error('Auto sign-in after signup failed:', signInError.message);
        // Don't return error - account was created, user can try logging in manually
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    const keys = [
        '@fitClub:activeWorkout', '@fitClub:workoutMinimized',
        '@fw:currentIndex', '@fw:currentSetIndex', '@fw:focusedIndex',
        '@fw:workoutStarted', '@fw:workoutStartTime',
        '@fw:sessionHistoryIds', '@fw:isResting',
        '@fw:restEndTime'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. Verifique e tente novamente.';
  }
  if (lower.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (lower.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.';
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  if (lower.includes('valid email') || lower.includes('invalid email')) {
    return 'Por favor, insira um e-mail válido.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  }
  return `Erro inesperado: ${message}`;
}
