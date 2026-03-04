'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useCountdown } from '@/contexts/CountdownContext';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { toast } from '@/components/ui/Toast';

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
  const { user, session } = useAuth();
  const { startCountdown } = useCountdown();

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

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

  const handleJoinClick = () => {
    if (!user) { setShowAuthPrompt(true); return; }
    handleJoin();
  };

  const handleJoin = async () => {
    if (!contest || joining || !user) return;
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
      toast.error('Error', e instanceof Error ? e.message : 'Failed to join contest');
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      {showAuthPrompt && <AuthPromptModal message="Log in or sign up to join this contest and compete." onClose={() => setShowAuthPrompt(false)} />}
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingState isLoading={loading} skeleton={<SkeletonText lines={4} width="60%" />}>
          {error ? (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-sm text-error mb-2">{error}</p>
              <Link href="/contests" className="text-sm text-error hover:underline">← Back to Contests</Link>
            </div>
          ) : contest ? (
            <>
              <Link href="/contests" className="text-sm text-text-muted hover:text-foreground inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
                Back to Contests
              </Link>

              <h1 className="text-xl font-semibold text-foreground">{contest.name}</h1>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <div className="glass-panel p-6">
                    <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">About this Contest</h2>
                    <div className="prose prose-invert max-w-none">
                      <MarkdownRenderer content={contest.description || '*No description provided*'} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="glass-panel p-5">
                    <div className="mb-5">
                      <div className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">Duration</div>
                      <div className="text-2xl font-semibold text-foreground font-mono">
                        {contest.length} <span className="text-sm text-text-muted font-sans">min</span>
                      </div>
                    </div>

                    <button
                      onClick={handleJoinClick}
                      disabled={joining}
                      className="w-full h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {joining ? <><LoadingSpinner size="sm" /><span>Joining...</span></> : 'Join Contest'}
                    </button>
                    <p className="text-xs text-text-muted mt-3 text-center">
                      By joining, you agree to the contest rules.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </LoadingState>
      </div>
    </>
  );
}
