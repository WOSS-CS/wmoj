'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export default function ProblemsClient({ initialProblems }: { initialProblems: Problem[] }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const fetcher = async () => {
    if (!user?.id || initialProblems.length === 0) return {};
    const problemIds = initialProblems.map(p => p.id);
    const { data, error } = await supabase.from('submissions').select('problem_id, summary').eq('user_id', user.id).in('problem_id', problemIds);
    if (error) { console.error('Status load error:', error); return {}; }
    
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
    return map;
  };

  const { data: statusMap } = useSWR(
    user?.id && initialProblems.length > 0 ? `problems-status-${user.id}` : null,
    fetcher
  );
  
  const statusByProblem = statusMap || {};

  const filteredProblems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialProblems;
    return initialProblems.filter(p => p.name.toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q));
  }, [initialProblems, search]);

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

          <div className="glass-panel p-6">
            {initialProblems.length === 0 ? (
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
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
