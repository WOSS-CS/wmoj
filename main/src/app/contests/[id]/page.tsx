'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';

export default function ContestPage() {
  const params = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [contest, setContest] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/contests/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load contest');
        setContest(json.contest);
        const resP = await fetch(`/api/contests/${params.id}/problems`);
        const jsonP = await resP.json();
        if (resP.ok) setProblems(jsonP.problems || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contest');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const handleSignOut = async () => { await signOut(); };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300">Dashboard</Link>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">{user?.user_metadata?.username || user?.email}</span>
            <button onClick={handleSignOut} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">Sign Out</button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{contest?.name}</h1>
              <div className="text-gray-300 mb-6">{contest?.description}</div>
              <div className="text-gray-400 mb-8">Length: <span className="text-white">{contest?.length} min</span></div>
              <h2 className="text-2xl font-semibold text-white mb-4">Problems</h2>
              {problems.length === 0 ? (
                <div className="text-gray-400">No problems yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {problems.map(p => (
                    <Link key={p.id} href={`/problems/${p.id}`} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-green-400/50 transition-all">
                      <div className="text-lg font-semibold text-white">{p.name}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}


