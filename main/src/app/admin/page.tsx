'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AdminGuard } from '@/components/AdminGuard';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ Admin</span>
          </Link>
          <div className="flex gap-4">
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">Sign Out</button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/admin/problems/new" className="block p-6 bg-white/10 border border-white/20 rounded-xl hover:border-green-400/50 transition">
              <h3 className="text-xl font-semibold text-white mb-2">Create Problem</h3>
              <p className="text-gray-300">Add a new problem, description, and test cases.</p>
            </Link>
            <Link href="/admin/contests/new" className="block p-6 bg-white/10 border border-white/20 rounded-xl hover:border-green-400/50 transition">
              <h3 className="text-xl font-semibold text-white mb-2">Create Contest</h3>
              <p className="text-gray-300">Create a new contest and manage its visibility.</p>
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}


