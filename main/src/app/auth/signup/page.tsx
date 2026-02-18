'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, userDashboardPath } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    // ... same content
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
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
          setError(`Please check your email for the verification link that was already sent. You will be able to resend a new verification link in ${seconds} seconds. Make sure to click on the NEWEST link that was sent if you choose to resend the verification email!`);
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Account created successfully! Please check your email to verify your account. It may take a minute or two to arrive.');
        // No automatic redirect to allow user to read the message
      }
    } catch (err) {
      console.error('Signup unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo={userDashboardPath || "/dashboard"}>
      <div className="min-h-full flex items-center justify-center p-6 relative z-10">
        {/* Toggle in Top Right */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full">
          {/* Back to Home */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-text-muted hover:text-foreground flex items-center gap-2 transition-colors duration-300 group"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground font-heading mb-2">Create Account</h1>
            <p className="text-text-muted text-sm">Join the competitive programming community</p>
          </div>

          {/* Enhanced Sign Up Form Container */}
          <div className="glass-panel p-8">

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-950/20 border border-green-500/20 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-brand-primary text-sm">{success}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className={`w-full px-4 py-3 bg-surface-2 border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none transition-all duration-300 ${focusedField === 'username'
                      ? 'border-brand-primary shadow-lg shadow-brand-primary/10 bg-surface-1'
                      : 'border-border hover:border-brand-primary/50'
                      }`}
                    placeholder="Choose a username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className={`w-full px-4 py-3 bg-surface-2 border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none transition-all duration-300 ${focusedField === 'email'
                      ? 'border-brand-primary shadow-lg shadow-brand-primary/10 bg-surface-1'
                      : 'border-border hover:border-brand-primary/50'
                      }`}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className={`w-full px-4 py-3 pr-12 bg-surface-2 border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none transition-all duration-300 ${focusedField === 'password'
                      ? 'border-brand-primary shadow-lg shadow-brand-primary/10 bg-surface-1'
                      : 'border-border hover:border-brand-primary/50'
                      }`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-brand-primary transition-colors duration-300"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-text-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className={`w-full px-4 py-3 pr-12 bg-surface-2 border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none transition-all duration-300 ${focusedField === 'confirmPassword'
                      ? 'border-brand-primary shadow-lg shadow-brand-primary/10 bg-surface-1'
                      : 'border-border hover:border-brand-primary/50'
                      }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-brand-primary transition-colors duration-300"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mr-3 rounded border-border bg-surface-2 text-brand-primary focus:ring-brand-primary focus:ring-2 transition-colors duration-300"
                />
                <label htmlFor="terms" className="text-text-muted text-sm cursor-pointer hover:text-foreground transition-colors">
                  I agree to the{' '}
                  <a href="#" className="text-brand-primary hover:text-brand-secondary transition-colors duration-300">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-brand-primary hover:text-brand-secondary transition-colors duration-300">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-primary text-black rounded-lg font-bold hover:bg-brand-secondary transition-all hover:lift disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-border">
              <p className="text-text-muted text-sm">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-brand-primary hover:text-brand-secondary font-bold transition-colors duration-300"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
