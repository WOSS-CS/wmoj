'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';

type Row = {
  id: string;
  user: string;
  problem: string;
  language: string;
  status: string;
  score: string;
  passed: boolean;
  timestamp: string;
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Row[]>([]);
  const hasLoadedActivitiesRef = useRef(false);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const languageLabels: Record<string, string> = {
    python: 'Python',
    cpp: 'C++',
    java: 'Java',
  };

  const fetchSubmissions = useCallback(async () => {
    try {
      setActivitiesLoading(!hasLoadedActivitiesRef.current);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/activity/recent-submissions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSubmissions((json.submissions || []).map((s: {
          id: string; created_at: string; user: string; problem: string;
          language: string; status: string; score: string; passed: boolean;
        }) => ({
          id: s.id,
          user: s.user,
          problem: s.problem,
          language: s.language,
          status: s.status,
          score: s.score,
          passed: s.passed,
          timestamp: s.created_at,
        })));
      }
    } catch (e) {
      console.error('Failed to fetch submissions', e);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const columns: Array<DataTableColumn<Row>> = [
    {
      key: 'user',
      header: 'User',
      className: 'w-[20%]',
      sortable: true,
      sortAccessor: (r) => r.user.toLowerCase(),
      render: (r) => <span className="text-foreground font-medium">{r.user}</span>,
    },
    {
      key: 'problem',
      header: 'Problem',
      className: 'w-[25%]',
      sortable: true,
      sortAccessor: (r) => r.problem.toLowerCase(),
      render: (r) => <span className="text-text-muted">{r.problem}</span>,
    },
    {
      key: 'language',
      header: 'Language',
      className: 'w-[12%]',
      sortable: true,
      sortAccessor: (r) => r.language,
      render: (r) => (
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-text-muted border border-border">
          {languageLabels[r.language] || r.language}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      className: 'w-[10%]',
      sortable: true,
      sortAccessor: (r) => {
        const parts = r.score.split('/');
        if (parts.length !== 2) return -1;
        return Number(parts[0]) / Number(parts[1]);
      },
      render: (r) => <span className="text-foreground font-mono text-sm">{r.score}</span>,
    },
    {
      key: 'result',
      header: 'Result',
      className: 'w-[13%]',
      sortable: true,
      sortAccessor: (r) => (r.passed ? 1 : 0),
      render: (r) => <Badge variant={r.passed ? 'success' : 'error'}>{r.passed ? 'Accepted' : 'Failed'}</Badge>,
    },
    {
      key: 'when',
      header: 'Submitted',
      className: 'w-[20%]',
      sortable: true,
      sortAccessor: (r) => new Date(r.timestamp).getTime(),
      render: (r) => (
        <span className="text-text-muted text-sm font-mono" title={formatDate(r.timestamp)}>
          {formatTimeAgo(r.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-text-muted mt-1">Manage contests and problems for the competitive programming platform</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">All Submissions</h2>
              {!activitiesLoading && (
                <span className="text-xs text-text-muted font-mono">{submissions.length} total</span>
              )}
            </div>
            <LoadingState isLoading={activitiesLoading} skeleton={<SkeletonText lines={6} />}>
              {submissions.length > 0 ? (
                <DataTable<Row> columns={columns} rows={submissions} rowKey={(r) => r.id} />
              ) : (
                <p className="text-sm text-text-muted py-6 text-center">No submissions found.</p>
              )}
            </LoadingState>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
