'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Contest = { id: string; name: string; description: string | null; length: number; participants?: string[] | null };
type ProblemLite = { id: string; name: string };
type LeaderRow = { userId: string; name: string; solved: number };

export default function ContestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<ProblemLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const deadline = useMemo(() => {
    if (!joinedAt || !contest) return null;
    const start = new Date(joinedAt).getTime();
    const ms = (contest.length || 0) * 60 * 1000;
    return new Date(start + ms);
  }, [joinedAt, contest]);

  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = useMemo(() => (deadline ? Math.max(0, deadline.getTime() - now.getTime()) : null), [deadline, now]);
  const isLocked = useMemo(() => remainingMs === 0 && deadline != null, [remainingMs, deadline]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await refreshContest();
        await loadJoinedAtFromServer();
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Track joinedAt only if actually joined or active markers match
  useEffect(() => {
    if (!user || !id) return;
    const isParticipant = (contest?.participants || []).includes(user.id);
    const activeId = localStorage.getItem('activeContestId');
    if (!isParticipant && activeId !== id) { setJoinedAt(null); return; }
    const key = `contest:${id}:user:${user.id}:joinedAt`;
    const existing = localStorage.getItem(key);
    if (existing) {
      setJoinedAt(existing);
    } else if (isParticipant) {
      const nowIso = new Date().toISOString();
      localStorage.setItem(key, nowIso);
      setJoinedAt(nowIso);
    }
  }, [user, id, contest]);

  const joinContest = async () => {
    if (!user || !contest) return;
    // Delegate all checks to RPC; if it succeeds, reload contest info
    const { error } = await supabase.rpc('join_contest', { p_contest_id: contest.id });
    if (error) { setError(error.message || 'Failed to join'); return; }
    // Refresh contest and set joinedAt from server participation row
    await refreshContest();
    await loadJoinedAtFromServer();
  };

  const leaveContest = async () => {
    if (!user || !contest) return;
    const { error } = await supabase.rpc('leave_contest', { p_contest_id: contest.id });
    if (error) { setError(error.message || 'Failed to leave'); return; }
    setJoinedAt(null);
    await refreshContest();
  };

  async function refreshContest() {
    try {
      const res = await fetch(`/api/contests/${id}`);
      const data = await res.json();
      if (res.ok) {
        setContest(data.contest);
        setProblems(data.problems || []);
      }
    } catch {}
  }

  async function loadJoinedAtFromServer() {
    if (!user || !contest) return;
    const { data } = await supabase
      .from('contest_participants')
      .select('joined_at')
      .eq('contest_id', contest.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.joined_at) setJoinedAt(data.joined_at);
  }

  // Build leaderboard when contest or problems change
  useEffect(() => {
    (async () => {
      try {
        if (!contest || problems.length === 0) { setLeaderboard([]); return; }
        const participantIds = (contest.participants || []).filter(Boolean) as string[];
        if (participantIds.length === 0) { setLeaderboard([]); return; }
        setLoadingBoard(true);
        // Load participant names
        const { data: profiles } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', participantIds);
        const nameById: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          nameById[p.id] = p.username || p.email || p.id;
        });
        // Load submissions for these users and problems
        const problemIds = problems.map((p) => p.id);
        const { data: subs } = await supabase
          .from('submissions')
          .select('user_id, problem_id, summary')
          .in('user_id', participantIds)
          .in('problem_id', problemIds);
        const solvedByUser: Record<string, Set<string>> = {};
        (subs || []).forEach((s: any) => {
          const sum = s.summary || {};
          const solved = Number(sum.failed ?? 0) === 0 && Number(sum.total ?? 0) > 0;
          if (solved) {
            if (!solvedByUser[s.user_id]) solvedByUser[s.user_id] = new Set<string>();
            solvedByUser[s.user_id].add(s.problem_id);
          }
        });
        const rows: LeaderRow[] = participantIds.map((uid) => ({
          userId: uid,
          name: nameById[uid] || uid,
          solved: (solvedByUser[uid]?.size || 0),
        }));
        rows.sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name));
        setLeaderboard(rows);
      } catch (e) {
        // ignore board errors for now
      } finally {
        setLoadingBoard(false);
      }
    })();
  }, [contest, problems]);

  const formatRemaining = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        <nav className="flex justify-between items-center p-6">
          <Link href="/contests" className="text-white hover:underline">← Back to Contests</Link>
          <Link href="/dashboard" className="text-white hover:underline">Dashboard</Link>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-10">
          {loading && <div className="text-gray-300">Loading…</div>}
          {error && <div className="text-red-400">{error}</div>}

          {contest && (
            <div className="mb-8 p-6 bg-white/10 border border-white/20 rounded-xl">
              <div className="flex items-start justify-between">
                <h1 className="text-3xl font-bold text-white">{contest.name}</h1>
                <div className="flex gap-2">
                  {(contest.participants || []).includes(user?.id || '') ? (
                    <button onClick={leaveContest} className="px-4 py-2 bg-red-600 text-white rounded">Leave Contest</button>
                  ) : (
                    <button onClick={joinContest} disabled={!user} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">Join Contest</button>
                  )}
                </div>
              </div>
              {error && <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}
              <p className="text-gray-300 mt-3">{contest.description || 'No description'}</p>
              <div className="text-gray-400 mt-2">Length: {contest.length} minutes</div>

              {(contest.participants || []).includes(user?.id || '') && deadline && (
                <div className="mt-4 p-4 bg-black/30 rounded border border-white/10">
                  <div className="text-white font-semibold mb-1">Time Remaining</div>
                  <div className="text-green-400 text-2xl">{formatRemaining(remainingMs || 0)}</div>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Problems</h2>
            {isLocked ? (
              <div className="text-red-400">Your contest time has ended. You can no longer view problems.</div>
            ) : !(contest?.participants || []).includes(user?.id || '') ? (
              <div className="text-gray-300">Join this contest to view problems.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {problems.length === 0 ? (
                  <div className="text-gray-300">No problems in this contest yet.</div>
                ) : (
                  problems.map((p) => (
                    <Link key={p.id} href={`/problems/${p.id}`} className="p-4 bg-white/10 border border-white/20 rounded hover:border-green-400/40 transition">
                      <div className="text-white font-medium">{p.name}</div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold text-white mb-4">Leaderboard</h2>
            {loadingBoard ? (
              <div className="text-gray-300">Loading leaderboard…</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-gray-300">No participants yet.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/20">
                <table className="w-full text-left">
                  <thead className="bg-white/10 text-gray-300 text-sm">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Solved</th>
                      <th className="px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, idx) => (
                      <tr key={r.userId} className="border-t border-white/10">
                        <td className="px-4 py-2 text-white">{idx + 1}</td>
                        <td className="px-4 py-2 text-white">{r.name}</td>
                        <td className="px-4 py-2 text-white">{r.solved}</td>
                        <td className="px-4 py-2 text-white">{problems.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}


