'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export default function ResetPasswordClient() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // The PASSWORD_RECOVERY event may fire before this component mounts
    // (Supabase processes the token from the URL immediately on page load).
    // Check for an existing session first, then fall back to the event listener.
    let cancelled = false;

    // If Supabase rejects the recovery token no session is ever created and
    // PASSWORD_RECOVERY never fires, so without this the page waits forever.
    const timeout = setTimeout(() => {
      if (!cancelled) setLinkFailed(true);
    }, 5000);

    const markReady = () => {
      if (cancelled) return;
      clearTimeout(timeout);
      setReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        // The recovery link signed this user in. Without signing out, AuthGuard on
        // the login page bounces them straight to `/` and they never see the form.
        await supabase.auth.signOut();
        router.push('/auth/login');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/auth/login" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-1">Reset password</h1>
        <p className="text-sm text-text-muted mb-8">Enter your new password below</p>

        <div className="space-y-5">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {!ready && linkFailed ? (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error">
              <p className="font-medium">This reset link is invalid or has expired</p>
              <p className="mt-1">
                <Link href="/auth/forgot-password" className="font-medium underline hover:no-underline">
                  Request a new reset link
                </Link>
              </p>
            </div>
          ) : !ready ? (
            <div className="text-sm text-text-muted text-center py-4">
              Verifying reset link... please wait
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-10 px-3 pr-10 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder:text-text-muted/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><LoadingSpinner size="sm" /><span>Updating...</span></> : 'Update Password'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted pt-4 border-t border-border">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-brand-primary font-medium hover:text-brand-secondary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
