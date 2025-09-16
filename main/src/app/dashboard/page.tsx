'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
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
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to your Dashboard
            </h1>
            <p className="text-gray-300 text-lg">
              Ready to tackle some competitive programming challenges?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">Statistics</h3>
              <p className="text-gray-300 mb-4">Track your progress and achievements</p>
              <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                View Stats
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">💻</div>
              <h3 className="text-xl font-semibold text-white mb-3">Problems</h3>
              <p className="text-gray-300 mb-4">Browse and solve coding challenges</p>
              <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Start Solving
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-white mb-3">Contests</h3>
              <p className="text-gray-300 mb-4">Join live competitions</p>
              <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                View Contests
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div>
                  <p className="text-white font-medium">Account created successfully</p>
                  <p className="text-gray-400 text-sm">
                    {user?.created_at && new Date(user.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <div>
                  <p className="text-white font-medium">Welcome to WMOJ!</p>
                  <p className="text-gray-400 text-sm">Ready to start your coding journey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
