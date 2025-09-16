'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setError(error.message);
      } else {
        // Redirect to dashboard after successful login
        router.push('/dashboard');
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
          <p className="text-gray-400">Welcome back, competitive programmer</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h1 className="text-2xl font-bold text-white text-center mb-6">Sign In</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

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
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2 rounded border-white/20 bg-white/10 text-green-600 focus:ring-green-500 focus:ring-2"
                  />
                <span className="text-gray-300 text-sm">Remember me</span>
              </label>
              <Link 
                href="#" 
                className="text-green-400 text-sm hover:text-green-300 transition-colors duration-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link 
                href="/auth/signup" 
                className="text-green-400 hover:text-green-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

      </div>
      </div>
    </AuthGuard>
  );
}
