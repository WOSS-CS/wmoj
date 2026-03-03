'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, TableLoading } from '@/components/LoadingStates';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/AnimationWrapper';

export default function ProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusByProblem, setStatusByProblem] = useState<Record<string, 'solved' | 'attempted' | 'not_attempted'>>({});

  useEffect(() => { fetchStandaloneProblems(); }, []);

  const fetchStandaloneProblems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/problems/standalone');
      const json = await res.json();
      if (res.ok) setProblems(json.problems || []);
      else setError(json.error || 'Failed to fetch problems');
    } catch { setError('Failed to fetch problems'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const loadStatuses = async () => {
      if (!user?.id || problems.length === 0) { setStatusByProblem({}); return; }
      const problemIds = problems.map(p => p.id);
      const { data, error } = await supabase.from('submissions').select('problem_id, summary').eq('user_id', user.id).in('problem_id', problemIds);
      if (error) { console.error('Status load error:', error); return; }
      const map: Record<string, 'solved' | 'attempted' | 'not_attempted'> = {};
      for (const id of problemIds) map[id] = 'not_attempted';
      const perProblem: Record<string, { any: boolean; solved: boolean }> = {};
      for (const row of data || []) {
        const pid = row.problem_id as string;
        const s = (row.summary || {}) as { total?: number; passed?: number; failed?: number };
        const total = Number(s.total ?? 0); const passed = Number(s.passed ?? 0); const failed = Number(s.failed ?? 0);
        const solved = total > 0 && failed === 0 && passed === total;
        if (!perProblem[pid]) perProblem[pid] = { any: false, solved: false };
        perProblem[pid].any = true;
        perProblem[pid].solved = perProblem[pid].solved || solved;
      }
      for (const [pid, agg] of Object.entries(perProblem)) { map[pid] = agg.solved ? 'solved' : 'attempted'; }
      setStatusByProblem(map);
    };
    loadStatuses();
  }, [user?.id, problems]);

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return problems;
    return problems.filter(p => p.name.toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q));
  }, [problems, search]);

  const columns: Array<DataTableColumn<Problem>> = [
    { key: 'name', header: 'Problem', className: 'w-[50%]', sortable: true, sortAccessor: (r) => r.name.toLowerCase(), render: (r) => <span className="text-foreground font-medium text-sm">{r.name}</span> },
    {
      key: 'difficulty', header: 'Difficulty', className: 'w-[15%]', render: (r) => {
        const diffStr = r.difficulty || 'Easy';
        const variant = diffStr.toLowerCase() === 'hard' ? 'error' :
          diffStr.toLowerCase() === 'medium' ? 'warning' : 'success';
        return <Badge variant={variant as any}>{diffStr}</Badge>;
      }
    },
    {
      key: 'status', header: 'Status', className: 'w-[15%]', render: (r) => {
        const st = statusByProblem[r.id] || 'not_attempted';
        if (st === 'solved') return <Badge variant="success">Solved</Badge>;
        if (st === 'attempted') return <Badge variant="warning">Attempted</Badge>;
        return <Badge variant="neutral">—</Badge>;
      }
    },
    {
      key: 'actions', header: '', className: 'w-[20%] text-right', render: (r) => (
        <Link href={`/problems/${r.id}`} className="text-sm text-brand-primary hover:text-brand-secondary font-medium">
          Solve →
        </Link>
      )
    },
  ];

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Practice Problems</h1>
            <p className="text-sm text-text-muted">Solve standalone problems to sharpen your skills</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8"><LoadingSpinner size="lg" /></div>
              <TableLoading rows={6} columns={4} />
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <p className="text-sm text-error mb-3">{error}</p>
              <button onClick={fetchStandaloneProblems} className="text-sm font-medium text-error hover:underline">Try Again</button>
            </div>
          ) : (
            <div className="glass-panel p-6">
              {problems.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-base font-medium text-foreground mb-1">No Problems Available</h3>
                  <p className="text-sm text-text-muted">Check back later for new problems.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search problems..."
                      className="w-full max-w-xs h-9 px-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>
                  <DataTable<Problem> columns={columns} rows={filteredProblems} rowKey={(r) => r.id} headerVariant="gray" />
                </>
              )}
            </div>
          )}
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
