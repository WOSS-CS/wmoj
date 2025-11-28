'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, signOut, userDashboardPath } = useAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  // Removed unused rotating feature indicator to satisfy linter

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo={userDashboardPath || "/dashboard"}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Mouse-following glow */}
          <div
            className="absolute w-96 h-96 bg-green-400/10 rounded-full blur-3xl transition-all duration-500 ease-out"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
            }}
          />

          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-20 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>

          {/* Circuit Pattern with animations */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 left-20 w-32 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse"></div>
            <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-20 left-52 w-0.5 h-16 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-36 left-52 w-24 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-40 right-20 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-60 right-20 w-40 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>
        </div>
        {/* Enhanced Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
          <Logo size="md" className="cursor-pointer" priority />
          <div className="flex gap-4">
            {user ? (
              <>
                <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-colors duration-300">
                  Welcome, {user.user_metadata?.username || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-colors duration-300"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Enhanced Hero Section */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-[80vh] px-6">
          <div className={`lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="mb-8 flex justify-center lg:justify-start">
              <span className="px-4 py-1 rounded-full border border-green-400/40 bg-white/5 text-green-300 text-xs font-semibold tracking-[0.3em] uppercase">Competitive Programming</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 relative">
              Master
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 relative">
                Competitive
                <div className="absolute -inset-1 bg-green-400/20 rounded-lg blur-sm animate-pulse" />
              </span>
              <span className="block text-white relative">
                Programming
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {user
                ? `Welcome back to WMOJ, ${user.user_metadata?.username || 'competitive programmer'}! Ready to solve some problems?`
                : 'Join WMOJ, the official White Oaks Secondary School Competitive Programming Platform.'
              }
            </p>
            {/* Buttons removed as per instructions */}
          </div>

          {/* Enhanced Auth Form / User Dashboard */}
          <div className={`lg:w-1/2 max-w-md w-full transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s' }}>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-colors duration-300">
              {user ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse transition-colors duration-300">
                      <span className="text-2xl font-bold text-black">
                        {(user.user_metadata?.username || user.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2 animate-fade-in">
                      Welcome back!
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {user.user_metadata?.username || user.email}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Link
                      href="/dashboard"
                      className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors duration-300 text-center relative overflow-hidden group"
                    >
                      <span className="relative z-10">View Dashboard</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>

                    <button className="block w-full py-3 border border-green-400 text-green-400 rounded-lg font-semibold hover:bg-green-400 hover:text-black transition-colors duration-300 text-center">
                      Browse Problems
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-400 text-xs">
                      Account created: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-gray-300 mb-4">
                        Ready to start your competitive programming journey?
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Link
                        href="/auth/signup"
                        className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-colors duration-300 text-center relative overflow-hidden group"
                      >
                        <span className="relative z-10">Create Account</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Link>

                      <Link
                        href="/auth/login"
                        className="block w-full py-3 border border-green-400 text-green-400 rounded-lg font-semibold hover:bg-green-400 hover:text-black transition-colors duration-300 text-center"
                      >
                        Sign In
                      </Link>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                      Join thousands of developers competing and learning together
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


        {/* Enhanced Footer */}
        <footer className="relative z-10 py-8 px-6 border-t border-white/10 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto text-center space-y-4">
            <span className="text-sm font-semibold tracking-[0.3em] uppercase text-green-300">WMOJ</span>
            <p className="text-gray-400">
              © 2025 WMOJ. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
