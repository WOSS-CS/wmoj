'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';

export default function Home() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
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
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6">
        <div className="text-3xl font-bold text-white">
          <span className="text-green-400">W</span>
          <span className="text-white">MOJ</span>
        </div>
        <div className="flex gap-4">
          {user ? (
            <>
              <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">
                Welcome, {user.user_metadata?.username || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center justify-center min-h-[80vh] px-6">
        <div className="lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
          <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6">
            Master
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              Competitive
            </span>
            <span className="block text-white">Programming</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            {user 
              ? `Welcome back to WMOJ, ${user.user_metadata?.username || 'competitive programmer'}! Ready to solve some problems?`
              : 'Join WMOJ, the ultimate platform for competitive programmers. Solve challenging problems, participate in contests, and climb the leaderboards.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105"
                >
                  Start Coding Now
                </Link>
                <button className="px-8 py-4 border-2 border-green-400 text-green-400 rounded-lg text-lg font-semibold hover:bg-green-400 hover:text-black transition-all duration-300">
                  View Problems
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105"
                >
                  Start Coding Now
                </Link>
                <button className="px-8 py-4 border-2 border-green-400 text-green-400 rounded-lg text-lg font-semibold hover:bg-green-400 hover:text-black transition-all duration-300">
                  Learn More
                </button>
              </>
            )}
          </div>
        </div>

        {/* Auth Form / User Dashboard */}
        <div className="lg:w-1/2 max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            {user ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-black">
                      {(user.user_metadata?.username || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Welcome back!
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {user.user_metadata?.username || user.email}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Link
                    href="/dashboard"
                    className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 text-center"
                  >
                    View Dashboard
                  </Link>
                  
                  <button className="block w-full py-3 border border-green-400 text-green-400 rounded-lg font-semibold hover:bg-green-400 hover:text-black transition-all duration-300 text-center">
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
                      className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 text-center"
                    >
                      Create Account
                    </Link>
                    
                    <Link
                      href="/auth/login"
                      className="block w-full py-3 border border-green-400 text-green-400 rounded-lg font-semibold hover:bg-green-400 hover:text-black transition-all duration-300 text-center"
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

      {/* Features Section */}
      <div className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Why Choose WMOJ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-white mb-3">Competitions</h3>
              <p className="text-gray-300">
                Participate in regular contests and climb the global leaderboards.
              </p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
              <div className="text-4xl mb-4">💻</div>
              <h3 className="text-xl font-semibold text-white mb-3">Practice</h3>
              <p className="text-gray-300">
                Access thousands of problems with detailed solutions and explanations.
              </p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white mb-3">Progress</h3>
              <p className="text-gray-300">
                Track your improvement with detailed analytics and skill assessments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2024 WMOJ. All rights reserved. Built for competitive programmers.
          </p>
        </div>
      </footer>
      </div>
    </AuthGuard>
  );
}
