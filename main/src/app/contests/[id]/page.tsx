'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { checkContestParticipation } from '@/utils/participationCheck';
import type { Contest } from '@/types/contest';
import { useRouter } from 'next/navigation';

export default function ContestPage() {
  const params = useParams<{ id: string }>();
  const { user, signOut } = useAuth();
  const { timeRemaining, contestName, isActive } = useCountdown();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<{ id: string; name: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Check access permission
  useEffect(() => {
    (async () => {
      if (!user || !params.id) return;
      
      try {
        const hasAccess = await checkContestParticipation(user.id, params.id);
        if (!hasAccess) {
          router.push('/contests');
          return;
        }
        setAccessChecked(true);
      } catch (error) {
        console.error('Error checking contest access:', error);
        router.push('/contests');
      }
    })();
  }, [user, params.id, router]);

  useEffect(() => {
    if (!accessChecked) return;
    
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
        
        // Fetch leaderboard
        const resL = await fetch(`/api/contests/${params.id}/leaderboard`);
        const jsonL = await resL.json();
        if (resL.ok) setLeaderboard(jsonL.leaderboard || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contest');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, accessChecked]);

  const handleSignOut = async () => { await signOut(); };

  const handleLeaveContest = async () => {
    if (!user || !params.id) return;
    
    try {
      setLeaving(true);
      const token = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ).auth.getSession().then(s => s.data.session?.access_token);
      
      const res = await fetch(`/api/contests/${params.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed to leave contest');
      }
      
      // Redirect to contests page
      router.push('/contests');
    } catch (error) {
      console.error('Error leaving contest:', error);
      alert(error instanceof Error ? error.message : 'Failed to leave contest');
    } finally {
      setLeaving(false);
    }
  };

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
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{contest?.name}</h1>
                  <div className="text-gray-300 mb-4">{contest?.description}</div>
                  <div className="text-gray-400">Length: <span className="text-white">{contest?.length} min</span></div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                  </button>
                  <button
                    onClick={handleLeaveContest}
                    disabled={leaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {leaving ? 'Leaving...' : 'Leave Contest'}
                  </button>
                </div>
              </div>
              {isActive && timeRemaining !== null && (
                <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <div>
                      <div className="text-green-400 text-sm font-medium">Contest Active</div>
                      <div className="text-white text-lg font-bold">
                        {Math.floor(timeRemaining / 3600) > 0 
                          ? `${Math.floor(timeRemaining / 3600)}:${Math.floor((timeRemaining % 3600) / 60).toString().padStart(2, '0')}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                          : `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`
                        } remaining
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {showLeaderboard && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">Leaderboard</h2>
                  {leaderboard.length === 0 ? (
                    <div className="text-gray-400">No submissions yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboard.map((entry, index) => (
                        <div key={entry.user_id} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                          <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {entry.rank}
                            </div>
                            <div>
                              <div className="text-white font-medium">{entry.username}</div>
                              <div className="text-gray-400 text-sm">{entry.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">{entry.total_score} pts</div>
                            <div className="text-gray-400 text-sm">{entry.solved_problems}/{entry.total_problems} solved</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
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


