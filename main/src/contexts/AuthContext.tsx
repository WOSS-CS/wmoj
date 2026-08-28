'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole, UserProfile, getUserDashboardPath } from '@/types/user';
import { sanitizeUsername, USERNAME_MAX_LENGTH } from '@/utils/validation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  userRole: UserRole | null;
  userDashboardPath: string | null;
  signUp: (email: string, password: string, username: string) => Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userDashboardPath, setUserDashboardPath] = useState<string | null>(null);

  // Dedup guard: drop concurrent ensureUserSetup calls for the same user.
  // Without this, initializeAuth and onAuthStateChange(TOKEN_REFRESHED) both
  // fire on every page load, doubling the DB work.
  const setupInProgressRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const ensureUserSetup = useCallback(async (currentUser: User) => {
    if (setupInProgressRef.current === currentUser.id) return;
    setupInProgressRef.current = currentUser.id;

    const doSetup = async () => {
      const now = new Date().toISOString();

      // Round 1 — 3 queries in parallel: role check + full profile in one shot.
      // Previously this was 8 sequential queries (6 of which were duplicates).
      //
      // Both role checks pin `is_active = true`: a row in `admins`/`managers` is
      // membership, not authorization. `managers_select_all` lets a deactivated
      // manager read their own row, so without this filter deactivation would
      // revoke nothing here.
      const [adminResult, managerResult, userResult] = await Promise.all([
        supabase.from('admins').select('id').eq('id', currentUser.id).eq('is_active', true).maybeSingle(),
        supabase.from('managers').select('id').eq('id', currentUser.id).eq('is_active', true).maybeSingle(),
        supabase.from('users').select('*').eq('id', currentUser.id).maybeSingle(),
      ]);

      // Derive role and path immediately from Round 1 — no extra queries needed.
      // Manager is the higher tier and wins precedence over admin when a user
      // is present in both tables.
      const role: UserRole = managerResult.data ? 'manager' : adminResult.data ? 'admin' : 'regular';
      setUserRole(role);
      setUserDashboardPath(getUserDashboardPath());

      // Profile is already in Round 1 — set it right away instead of waiting
      // for a separate fetchUserProfile call.
      if (userResult.data) {
        setProfile(userResult.data);
        setProfileLoading(false);
      }

      // Round 2 — fire background updates in parallel; don't block the UI.
      // These are fire-and-forget for latency, not for correctness: log every
      // failure, or a missing UPDATE policy stays invisible forever.
      const updates: Promise<unknown>[] = [];

      const stampLastLogin = async (table: 'managers' | 'admins' | 'users') => {
        const { error } = await supabase
          .from(table)
          .update({ last_login: now, updated_at: now })
          .eq('id', currentUser.id);
        if (error) console.error(`Failed to stamp ${table}.last_login:`, error);
      };

      if (managerResult.data) {
        updates.push(stampLastLogin('managers'));
      } else if (adminResult.data) {
        updates.push(stampLastLogin('admins'));
      }

      if (!userResult.data) {
        // New user: insert then fetch profile (fetchUserProfile clears profileLoading).
        //
        // `desired` comes from user metadata or an email local part, so it can very
        // easily violate `users_username_format` (23514) — a `+` tag, a dot-heavy
        // corporate address, or simply being too long. Sanitise it to something the
        // constraint accepts before the first attempt, and keep a suffixed fallback
        // that still fits in 30 characters for the collision case (23505). Both
        // results are checked: a silent failure here leaves a verified auth user
        // with no `public.users` row, permanently.
        const rawDesired =
          currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user';
        const suffix = `_${currentUser.id.slice(0, 8)}`;
        const desired = sanitizeUsername(rawDesired);
        const fallback = `${sanitizeUsername(rawDesired, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;

        updates.push((async () => {
          const insertProfile = (username: string) =>
            supabase.from('users').insert({
              id: currentUser.id,
              username,
              email: currentUser.email || '',
              created_at: currentUser.created_at,
              last_login: now,
            });

          const insert = await insertProfile(desired);
          if (insert.error) {
            if (insert.error.code === '23505' || insert.error.code === '23514') {
              const retry = await insertProfile(fallback);
              if (retry.error) {
                console.error('Failed to create user profile (retry):', retry.error);
              }
            } else {
              console.error('Failed to create user profile:', insert.error);
            }
          }
          await fetchUserProfile(currentUser.id);
        })());
      } else {
        updates.push(stampLastLogin('users'));
      }

      await Promise.all(updates);
    };

    try {
      // Safety timeout: if DB queries hang, fall through after 4 seconds
      await Promise.race([
        doSetup(),
        new Promise<void>(resolve => setTimeout(resolve, 4000)),
      ]);
    } catch (error) {
      console.error('Error in ensureUserSetup:', error);
    } finally {
      setupInProgressRef.current = null;
      // Guarantee these are always resolved even if we timed out or threw
      setUserRole(prev => prev ?? 'regular');
      setUserDashboardPath(prev => prev ?? '/');
      setProfileLoading(false);
    }
  }, [fetchUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  useEffect(() => {
    let isMounted = true;

    // Use only onAuthStateChange (Supabase recommended pattern).
    // The callback is intentionally NOT async — ensureUserSetup is called
    // fire-and-forget to avoid a circular deadlock: Supabase's _initialize()
    // awaits all onAuthStateChange callbacks via _notifyAllSubscribers, but
    // ensureUserSetup's PostgREST queries call getSession() which awaits
    // initializePromise (i.e. _initialize() completing). Awaiting here would
    // create an unresolvable circular wait, broken only by the 8-second
    // safety timeout — causing the 30+ second profile loading delay.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);

      if (event === 'INITIAL_SESSION') {
        setLoading(false);
      }

      if (currentUser && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        if (event === 'SIGNED_IN') {
          setProfileLoading(true);
          setupInProgressRef.current = null; // allow re-run on fresh sign-in
        }
        ensureUserSetup(currentUser).catch((err) => {
          console.error('ensureUserSetup error:', err);
        });
      } else if (event === 'INITIAL_SESSION' && !currentUser) {
        setProfileLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserRole(null);
        setUserDashboardPath(null);
        setProfileLoading(false);
        setupInProgressRef.current = null;
      }
    });

    // Safety net: if INITIAL_SESSION never fires (e.g. stale navigator lock),
    // force loading off after 5 seconds so the app is never permanently stuck.
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setProfileLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [ensureUserSetup]);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    profileLoading,
    userRole,
    userDashboardPath,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }), [user, session, profile, loading, profileLoading, userRole, userDashboardPath, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
