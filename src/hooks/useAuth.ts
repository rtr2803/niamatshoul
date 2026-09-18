import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import type { Profile } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, isOwner, setUser, setLoading, logout } = useAuthStore();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const profile = await fetchProfile(session.user.id);
          if (profile && mounted) {
            setUser(profile);
          } else if (mounted) {
            // Profile doesn't exist yet, create it
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || '',
                role: 'OWNER', // First user is owner
              })
              .select()
              .single();
            if (newProfile && mounted) {
              setUser(newProfile as Profile);
            }
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) setUser(null);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile && mounted) {
            setUser(profile);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) logout();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, setUser, logout]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      if (profile) {
        setUser(profile);
      }
    }
    return data;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const invitePartner = async (email: string, fullName: string) => {
    if (!isOwner) throw new Error('Seul le propriétaire peut inviter des partenaires');

    // Create the user via Supabase Auth admin (this would need an edge function in production)
    // For now, the partner registers themselves and the owner sets their role
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'PARTNER' })
      .eq('email', email)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isOwner,
    signIn,
    signUp,
    signOut,
    invitePartner,
  };
}
