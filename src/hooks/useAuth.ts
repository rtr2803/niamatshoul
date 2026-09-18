import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import type { Profile } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, isOwner, setUser, setLoading, logout } = useAuthStore();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      // 5-second timeout to prevent hanging on network issues
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.warn('Error fetching profile:', error);
            return null;
          }
          return data as Profile;
        });

      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Error fetching profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          let profile = await fetchProfile(session.user.id);
          if (profile && mounted) {
            setUser(profile);
          } else if (mounted) {
            // Profile doesn't exist yet, attempt upsert
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split('@')[0] : 'Exploitant'),
                role: 'OWNER',
              })
              .select()
              .single();

            if (newProfile && mounted) {
              setUser(newProfile as Profile);
            } else if (mounted) {
              // Resilient fallback profile
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || 'Exploitant',
                role: 'OWNER',
                avatar_url: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.warn('Auth init error:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          let profile = await fetchProfile(session.user.id);
          if (!profile) {
            profile = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Exploitant',
              role: 'OWNER',
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
          if (mounted) setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          if (mounted) logout();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, setUser, logout, setLoading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoading(false);
        throw error;
      }
      if (data.user) {
        let profile = await fetchProfile(data.user.id);
        if (!profile) {
          profile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: 'OWNER',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        setUser(profile);
      }
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  const invitePartner = async (email: string, fullName: string) => {
    if (!isOwner) throw new Error('Seul le propriétaire peut inviter des partenaires');

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
