'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export default function SignupClient() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, userDashboardPath } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(formData.email, formData.password, formData.username);
      if (error) {
        if (error.message.includes('For security purposes, you can only request this after')) {
          const seconds = error.message.match(/after (\d+) seconds/)?.[1] || 'some';
          setError(`Please check your email for the verification link that was already sent. You can resend in ${seconds} seconds.`);
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Account created! Please check your email to verify your account.');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
      {show ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      )}
    </button>
  );

  const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder:text-text-muted/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none";

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo={userDashboardPath || "/dashboard"}>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link href="/" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
              Back
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-1">Create account</h1>
          <p className="text-sm text-text-muted mb-8">Join the competitive programming community</p>

          <div className="space-y-5">
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error">{error}</div>
            )}
            {success && (
              <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-sm text-success">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleChange} required className={inputClass} placeholder="Choose a username" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required className={`${inputClass} pr-10`} placeholder="Min. 6 characters" />
                  <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Confirm password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className={`${inputClass} pr-10`} placeholder="Repeat your password" />
                  <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><LoadingSpinner size="sm" /><span>Creating account...</span></> : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-text-muted pt-4 border-t border-border">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-primary font-medium hover:text-brand-secondary">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
