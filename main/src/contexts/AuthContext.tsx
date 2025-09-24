'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserRole, getUserDashboardPath } from '@/utils/userRole';
import { UserRole } from '@/types/user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  userDashboardPath: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userDashboardPath, setUserDashboardPath] = useState<string | null>(null);

  // moved effect below callbacks to avoid TDZ on createUserProfile

  const signUp = async (email: string, password: string, username: string) => {
    console.log('Starting signup process for:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
    } else {
      console.log('Signup successful, user:', data.user?.email);
      console.log('User metadata:', data.user?.user_metadata);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Starting signin process for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Signin error:', error);
    } else {
      console.log('Signin successful, user:', data.user?.email);
      console.log('User metadata:', data.user?.user_metadata);
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        // Clear all state on successful sign out
        setUser(null);
        setSession(null);
        setUserRole(null);
        setUserDashboardPath(null);
      }
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as AuthError };
    }
  };

  const updateUserRoleAndPath = useCallback(async (userId: string) => {
    try {
      const role = await getUserRole(userId);
      const dashboardPath = await getUserDashboardPath(userId);
      
      setUserRole(role);
      setUserDashboardPath(dashboardPath);
      
      console.log(`User role determined: ${role}, dashboard path: ${dashboardPath}`);
    } catch (error) {
      console.error('Error updating user role and path:', error);
      setUserRole('regular');
      setUserDashboardPath('/dashboard');
    }
  }, []);

  const createUserProfile = useCallback(async (user: User) => {
    try {
      // First, check if user is an admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!adminError && adminUser) {
        // User is an admin, update their last login
        console.log('Updating last login for admin user:', user.email);
        
        const { error: updateError } = await supabase
          .from('admins')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating admin profile:', updateError);
        }
        
        // Update user role and dashboard path
        await updateUserRoleAndPath(user.id);
        return;
      }

      // Check if user profile already exists in users table
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      // If user doesn't exist (selectError indicates no rows found)
      if (selectError && selectError.code === 'PGRST116') {
        console.log('Creating new user profile for:', user.email);
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
            email: user.email || '',
            created_at: user.created_at,
            last_login: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          console.log('User profile created successfully');
        }
      } else if (existingUser) {
        // Update last login for existing users
        console.log('Updating last login for existing user:', user.email);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
        }
      } else if (selectError) {
        console.error('Error checking user profile:', selectError);
      }

      // Update user role and dashboard path after profile operations
      await updateUserRoleAndPath(user.id);
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  }, [updateUserRoleAndPath]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('getSession error:', error);
        }
        const session = data?.session ?? null;
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        // Do not block initial render on profile DB ops
        if (currentUser) {
          void createUserProfile(currentUser);
        }
      } catch (e) {
        console.error('getSession exception:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        // Fire-and-forget; avoid blocking UI on network
        if (currentUser && (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED')) {
          void createUserProfile(currentUser);
        }
      } catch (e) {
        console.error('onAuthStateChange exception:', e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [createUserProfile]);

  const value = {
    user,
    session,
    loading,
    userRole,
    userDashboardPath,
    signUp,
    signIn,
    signOut,
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
