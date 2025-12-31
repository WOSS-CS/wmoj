'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';
import { SocialProofTicker } from '@/components/landing/SocialProofTicker';
import { FeatureHighlights } from '@/components/landing/FeatureHighlights';

export default function Home() {
  const { user, signOut, userDashboardPath } = useAuth();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo={userDashboardPath || "/dashboard"}>
      <div className="min-h-screen bg-[#0F1115] relative overflow-hidden font-sans text-gray-100 selection:bg-green-500/30">

        {/* Background Layer: Ambient Light & Geometric Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 60%), #0F1115`
          }}
        />
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Floating particles (Decorative) */}
        <div className="absolute top-20 left-20 w-1 h-1 bg-green-400 rounded-full animate-pulse z-0" />
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-green-500/50 rounded-full animate-ping z-0" style={{ animationDuration: '3s' }} />

        {/* Navbar */}
        <nav className="relative z-50 flex justify-between items-center p-6 max-w-7xl mx-auto">
          <Logo size="md" className="cursor-pointer" priority />
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <span className="hidden md:inline-block px-4 py-1.5 text-sm text-green-300 border border-green-800/50 rounded-full bg-[#064e3b]/30">
                  {user.user_metadata?.username || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2 text-sm bg-red-500/10 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-500/20 transition-all duration-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg shadow-lg shadow-green-900/20 hover:shadow-green-900/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Section A: Hero (Above the fold) */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-[90vh] px-6 max-w-7xl mx-auto pt-10 pb-20">

          {/* Left Side: Headline */}
          <div className={`lg:w-3/5 text-center lg:text-left mb-16 lg:mb-0 transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <h1 className="font-mono text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              <span className="text-white block mb-2">Master</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 block">
                Competitive
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 block">
                Programming
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Join the official White Oaks Secondary School platform. Solve problems, climb the leaderboard, and prepare for the next contest.
            </p>
          </div>

          {/* Right Side: CTA Card */}
          <div className={`lg:w-2/5 w-full max-w-md transition-all duration-1000 ease-out delay-200 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl shadow-green-900/10 backdrop-blur-xl relative overflow-hidden group">
              {/* Subtle inner glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -z-10 group-hover:bg-green-500/20 transition-all duration-500" />

              {user ? (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
                    <span className="text-3xl font-bold text-white font-mono">
                      {(user.user_metadata?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Welcome Back!</h3>
                  <Link
                    href="/dashboard"
                    className="block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-white leading-tight">
                    Ready to start your journey?
                  </h2>
                  <div className="space-y-4">
                    <Link
                      href="/auth/signup"
                      className="block w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      Create Account
                    </Link>
                    <Link
                      href="/auth/login"
                      className="block w-full py-4 bg-transparent border border-white/10 text-white rounded-xl font-semibold text-center hover:bg-[#21262D] transition-all duration-300"
                    >
                      Sign In
                    </Link>
                  </div>
                  <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-mono">
                    Official WOSS Platform
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section B: Social Proof Ticker */}
        <section className="relative z-20">
          <SocialProofTicker />
        </section>

        {/* Section C: Feature Highlights */}
        <div className={`transition-all duration-1000 ease-out delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          <FeatureHighlights />
        </div>

        {/* Footer */}
        <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-gray-500">
            <div className="mb-4 md:mb-0">
              <span className="text-xs font-mono tracking-[0.2em] text-green-500/80 uppercase">White Oaks Secondary School</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} WMOJ. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </AuthGuard>
  );
}
