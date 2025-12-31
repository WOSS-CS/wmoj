'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export default function ProblemsPage() {
  const { user, signOut } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusByProblem, setStatusByProblem] = useState<Record<string, 'solved' | 'attempted' | 'not_attempted'>>({});

  useEffect(() => {
    fetchStandaloneProblems();
    setIsLoaded(true);
    // Mouse listener removed
  }, []);

  const fetchStandaloneProblems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/problems/standalone');
      const json = await res.json();
      if (res.ok) {
        setProblems(json.problems || []);
      } else {
        setError(json.error || 'Failed to fetch problems');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        if (!user?.id || problems.length === 0) {
          setStatusByProblem({});
          return;
        }
        const problemIds = problems.map(p => p.id);
        const { data, error } = await supabase
          .from('submissions')
          .select('problem_id, summary')
          .eq('user_id', user.id)
          .in('problem_id', problemIds);
        if (error) {
          console.error('Status load error:', error);
          return;
        }
        const map: Record<string, 'solved' | 'attempted' | 'not_attempted'> = {};
        for (const id of problemIds) map[id] = 'not_attempted';

        const perProblem: Record<string, { any: boolean; solved: boolean }> = {};
        for (const row of data || []) {
          const pid = row.problem_id as string;
          const s = (row.summary || {}) as { total?: number; passed?: number; failed?: number };
          const total = Number(s.total ?? 0);
          const passed = Number(s.passed ?? 0);
          const failed = Number(s.failed ?? 0);
          const solved = total > 0 && failed === 0 && passed === total;
          if (!perProblem[pid]) perProblem[pid] = { any: false, solved: false };
          perProblem[pid].any = true;
          perProblem[pid].solved = perProblem[pid].solved || solved;
        }
        for (const [pid, agg] of Object.entries(perProblem)) {
          map[pid] = agg.solved ? 'solved' : 'attempted';
        }
        setStatusByProblem(map);
      } catch (e) {
        console.error('Unexpected status calc error:', e);
      }
    };
    loadStatuses();
  }, [user?.id, problems]);

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q)
    );
  }, [problems, search]);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="relative overflow-hidden">
          {/* Legacy nav and sidebar removed. Background animations kept but container simplified. */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Reduced animations for clarity */}
            <div className="absolute top-20 left-20 w-2 h-2 bg-brand-primary/50 rounded-full animate-ping"></div>
          </div>

          <LoadingState
            isLoading={!isLoaded}
            skeleton={
              <div className="mb-8 space-y-4">
                <SkeletonText lines={2} width="60%" />
                <SkeletonText lines={1} width="40%" />
              </div>
            }
          >
            <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h1 className="text-4xl font-bold text-white mb-4 relative">
                Practice Problems
                <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-brand-primary to-emerald-400 rounded-full animate-pulse" />
              </h1>
              <p className="text-gray-300 text-lg">
                Solve standalone problems to improve your competitive programming skills
              </p>
            </div>
          </LoadingState>

          {loading && (
            <div className="py-6">
              <CardLoading count={6} />
              <div className="flex justify-center items-center py-8">
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-label="Loading problems" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchStandaloneProblems}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4 glass-panel p-6">
              {problems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 animate-bounce">📝</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">No Problems Available</h3>
                  <p className="text-gray-300">
                    There are no standalone problems available at the moment.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search problems by name..."
                      className="w-full px-4 py-2 rounded-lg bg-surface-1 border border-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {filteredProblems.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-2xl font-semibold text-white mb-2">No Problems Found</h3>
                      <p className="text-gray-300">
                        No problems match your search criteria. Try a different search term.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        type Row = Problem;
                        const columns: Array<DataTableColumn<Row>> = [
                          {
                            key: 'name',
                            header: 'Problem',
                            className: 'w-[50%]',
                            sortable: true,
                            sortAccessor: (r) => r.name.toLowerCase(),
                            render: (r) => (
                              <h3 className="text-white font-semibold">{r.name}</h3>
                            ),
                          },
                          {
                            key: 'difficulty',
                            header: 'Difficulty',
                            className: 'w-[15%]',
                            render: () => (
                              <Badge variant="easy">Easy</Badge>
                            ),
                          },
                          {
                            key: 'status',
                            header: 'Status',
                            className: 'w-[15%]',
                            render: (r) => {
                              const st = statusByProblem[r.id] || 'not_attempted';
                              if (st === 'solved') {
                                return <Badge variant="success">Solved</Badge>;
                              }
                              if (st === 'attempted') {
                                return <Badge variant="warning">Attempted</Badge>;
                              }
                              return <Badge variant="neutral">Not Attempted</Badge>;
                            },
                          },
                          {
                            key: 'actions',
                            header: 'Actions',
                            className: 'w-[20%]',
                            render: (r) => (
                              <Link
                                href={`/problems/${r.id}`}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-300 text-sm"
                              >
                                Start Solving
                              </Link>
                            ),
                          },
                        ];
                        return (
                          <DataTable<Problem>
                            columns={columns}
                            rows={filteredProblems}
                            rowKey={(r) => r.id}
                            headerVariant="gray"
                            className="shadow-inner"
                          />
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
