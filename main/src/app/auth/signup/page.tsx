'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';

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
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(error.message);
      } else {
        setSuccess('Account created successfully! Please check your email to verify your account.');
        // Redirect to login page after successful signup
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (err) {
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
  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Circuit Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full"></div>
        <div className="absolute top-20 left-20 w-32 h-0.5 bg-green-400"></div>
        <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full"></div>
        <div className="absolute top-20 left-52 w-0.5 h-16 bg-green-400"></div>
        <div className="absolute top-36 left-52 w-24 h-0.5 bg-green-400"></div>
        <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full"></div>
        
        <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full"></div>
        <div className="absolute top-40 right-20 w-0.5 h-20 bg-green-400"></div>
        <div className="absolute top-60 right-20 w-40 h-0.5 bg-green-400"></div>
        <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full"></div>
        
        <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full"></div>
        <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-green-400"></div>
        <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-green-400"></div>
        <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full"></div>
      </div>
      <div className="max-w-md w-full">
        {/* Back to Home */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="text-green-400 hover:text-green-300 flex items-center gap-2 transition-colors duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* WMOJ Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-white mb-2">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </div>
          <p className="text-gray-400">Join the competitive programming community</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h1 className="text-2xl font-bold text-white text-center mb-6">Create Account</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-all duration-300"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-all duration-300"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-all duration-300"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-all duration-300"
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="terms" 
                required
                className="mr-3 rounded border-white/20 bg-white/10 text-green-600 focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="terms" className="text-gray-300 text-sm">
                I agree to the{' '}
                <a href="#" className="text-green-400 hover:text-green-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-green-400 hover:text-green-300">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="text-green-400 hover:text-green-300 font-medium"
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
