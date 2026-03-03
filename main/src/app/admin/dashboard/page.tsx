'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Array<{
    id: string; user: string; problem: string; passed: boolean; timestamp: string;
  }>>([]);
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
    return `${days}d ago`;
  };

  const fetchRecentSubmissions = useCallback(async () => {
    try {
      setActivitiesLoading(!hasLoadedActivitiesRef.current);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/activity/recent-submissions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSubmissions((json.submissions || []).map((s: { id: string; created_at: string; user: string; problem: string; passed: boolean }) => ({
          id: s.id, user: s.user, problem: s.problem, passed: !!s.passed, timestamp: s.created_at
        })));
      }
    } catch (e) {
      console.error('Failed to fetch recent submissions', e);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecentSubmissions(); }, [fetchRecentSubmissions]);

  type Row = { id: string; user: string; problem: string; passed: boolean; timestamp: string };
  const columns: Array<DataTableColumn<Row>> = [
    { key: 'user', header: 'User', className: 'w-[25%]', sortable: true, sortAccessor: (r) => r.user.toLowerCase(), render: (r) => <span className="text-foreground font-medium">{r.user}</span> },
    { key: 'problem', header: 'Problem', className: 'w-[35%]', sortable: true, sortAccessor: (r) => r.problem.toLowerCase(), render: (r) => <span className="text-text-muted">{r.problem}</span> },
    { key: 'result', header: 'Result', className: 'w-[15%]', sortable: true, sortAccessor: (r) => (r.passed ? 1 : 0), render: (r) => <Badge variant={r.passed ? 'success' : 'warning'}>{r.passed ? 'Solved' : 'Attempted'}</Badge> },
    { key: 'when', header: 'When', className: 'w-[25%]', sortable: true, sortAccessor: (r) => new Date(r.timestamp).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{formatTimeAgo(r.timestamp)}</span> },
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
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Recent Activity</h2>
            <LoadingState isLoading={activitiesLoading} skeleton={<SkeletonText lines={4} />}>
              {submissions.length > 0 ? (
                <DataTable<Row> columns={columns} rows={submissions} rowKey={(r) => r.id} />
              ) : (
                <p className="text-sm text-text-muted py-6 text-center">No submissions in the last 24 hours.</p>
              )}
            </LoadingState>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
