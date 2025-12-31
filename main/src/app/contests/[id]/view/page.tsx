'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { Logo } from '@/components/Logo';

const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

interface ContestDetail {
  id: string;
  name: string;
  description: string | null;
  length: number;
}

export default function ContestViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const { startCountdown } = useCountdown();

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    (async () => {
      if (!params?.id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/contests/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch contest');
        setContest(json.contest);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.id]);

  const handleSignOut = async () => { await signOut(); };

  const handleJoin = async () => {
    if (!contest || joining) return;
    try {
      setJoining(true);
      const res = await fetch(`/api/contests/${contest.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ userId: user?.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to join contest');
      startCountdown(contest.id, contest.name, contest.length);
      router.push(`/contests/${contest.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to join contest');
    } finally {
      setJoining(false);
    }
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-96 h-96 bg-[#1a1a1a] rounded-full transition-all duration-500 ease-out"
              style={{ left: mousePosition.x - 200, top: mousePosition.y - 200 }}
            />
          </div>

          {/* Top Navigation Bar */}
          <nav className="relative z-10 flex justify-between items-center p-4 bg-[#0a0a0a] border-b border-[#262626]">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <Link href="/contests" className="px-4 py-2 text-white border border-[#333333] rounded-lg hover:bg-[#262626] transition-all duration-300">
                Back
              </Link>
              <span className="px-4 py-2 text-green-400 border border-green-900 rounded-lg bg-[#064e3b]">
                {user?.user_metadata?.username || user?.email}
              </span>
              <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300">
                Sign Out
              </button>
            </div>
          </nav>

          <main className="relative z-10 max-w-5xl mx-auto p-6">
            <LoadingState
              isLoading={loading}
              skeleton={
                <div className="space-y-6">
                  <SkeletonText lines={2} width="60%" />
                  <SkeletonText lines={4} />
                </div>
              }
            >
              {error ? (
                <div className="bg-[#450a0a] border border-red-500/20 rounded-lg p-6 mb-8">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : contest ? (
                <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                  <h1 className="text-4xl font-bold text-white mb-4 relative">
                    {contest.name}
                    <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                  </h1>
                  <div className="text-gray-300 mb-6">Length: <span className="text-white font-semibold">{contest.length} min</span></div>
                  <div className="bg-[#171717] rounded-2xl p-6 border border-[#262626]">
                    <MarkdownRenderer content={contest.description || '*No description provided*'} />
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? 'Joining...' : 'Join'}
                    </button>
                    <Link href="/contests" className="px-6 py-3 bg-[#171717] text-white rounded-lg hover:bg-[#262626] transition-colors duration-300">
                      Cancel
                    </Link>
                  </div>
                </div>
              ) : null}
            </LoadingState>
          </main>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}


