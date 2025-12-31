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
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
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
        <div className="relative overflow-hidden min-h-full">
          {/* Main Content */}
          <main className="max-w-5xl mx-auto p-6 py-12">
            <LoadingState
              isLoading={loading}
              skeleton={
                <div className="space-y-6">
                  <div className="h-8 bg-surface-2 rounded-lg w-1/4 mb-8"></div>
                  <SkeletonText lines={2} width="60%" />
                  <SkeletonText lines={4} />
                </div>
              }
            >
              {error ? (
                <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
                  <p className="text-red-400">{error}</p>
                  <Link href="/contests" className="text-sm text-red-300 hover:underline mt-2 inline-block">← Back to Contests</Link>
                </div>
              ) : contest ? (
                <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                  <div className="mb-8">
                    <Link href="/contests" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-4">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back to Contests
                    </Link>
                    <h1 className="text-5xl font-bold text-white font-heading relative inline-block">
                      {contest.name}
                      <div className="absolute -bottom-2 left-0 w-1/2 h-1 bg-gradient-to-r from-brand-primary to-emerald-400 rounded-full" />
                    </h1>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      {/* Description Panel */}
                      <div className="glass-panel p-8">
                        <h2 className="text-xl font-heading text-white mb-6 flex items-center gap-2">
                          <span className="text-brand-primary">#</span> About this Contest
                        </h2>
                        <div className="prose prose-invert max-w-none">
                          <MarkdownRenderer content={contest.description || '*No description provided*'} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Action Panel */}
                      <div className="glass-panel p-6 border-t-4 border-t-brand-primary">
                        <div className="mb-6">
                          <div className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-2">Duration</div>
                          <div className="text-3xl font-mono text-white flex items-baseline gap-2">
                            {contest.length} <span className="text-sm text-gray-500 font-sans">minutes</span>
                          </div>
                        </div>

                        <button
                          onClick={handleJoin}
                          disabled={joining}
                          className="w-full py-4 bg-brand-primary text-black font-bold rounded-lg hover:bg-brand-secondary transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
                        >
                          {joining ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              Joining...
                            </span>
                          ) : (
                            'Join Contest Now'
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-4 text-center">
                          By joining, you agree to the contest rules.
                        </p>
                      </div>
                    </div>
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


