'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { Activity } from '@/types/activity';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const hasLoadedActivitiesRef = useRef(false);

  const fetchActivities = useCallback(async () => {
    try {
      setActivitiesLoading(!hasLoadedActivitiesRef.current);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/user/activity', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(data.activities);
          return;
        }
      }

      if (!user?.id) return;
      const userId = user.id;

      const { data: subs } = await supabase
        .from('submissions')
        .select('id, problem_id, created_at, summary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      const problemIds = Array.from(new Set((subs || []).map(s => s.problem_id).filter(Boolean)));
      let problemInfo: Record<string, { name: string; contest: string | null }> = {};
      if (problemIds.length > 0) {
        const { data: probs } = await supabase.from('problems').select('id, name, contest').in('id', problemIds);
        type Prob = { id: string; name: string; contest: string | null };
        problemInfo = (probs || []).reduce((acc: Record<string, { name: string; contest: string | null }>, p: Prob) => {
          acc[p.id] = { name: p.name, contest: p.contest };
          return acc;
        }, {});
      }

      const subActivities = (subs || []).map((s) => {
        const summary = (s.summary || {}) as { passed?: number; failed?: number; total?: number };
        const total = Number(summary.total ?? 0);
        const passed = Number(summary.passed ?? 0);
        const failed = Number(summary.failed ?? 0);
        const solved = total > 0 && failed === 0 && passed === total;
        const pinfo = problemInfo[s.problem_id] || { name: 'Unknown Problem', contest: null };
        return {
          id: `sub-${s.id}`, type: 'submission' as const,
          action: solved ? 'Solved' : 'Attempted', item: pinfo.name, itemId: s.problem_id as string,
          timestamp: s.created_at as string, status: solved ? 'success' as const : 'warning' as const,
          passed, total, contestId: pinfo.contest, contestName: undefined as string | undefined,
        };
      });

      const { data: joins } = await supabase.from('join_history').select('id, contest_id, joined_at').eq('user_id', userId).order('joined_at', { ascending: false }).limit(100);
      const joinContestIds = Array.from(new Set((joins || []).map(j => j.contest_id).filter(Boolean)));
      let contestNames: Record<string, string> = {};
      if (joinContestIds.length > 0) {
        const { data: contests } = await supabase.from('contests').select('id, name').in('id', joinContestIds);
        type ContestRow = { id: string; name: string };
        contestNames = (contests || []).reduce((acc: Record<string, string>, c: ContestRow) => { acc[c.id] = c.name; return acc; }, {});
      }
      const joinActivities = (joins || []).map(j => ({
        id: `join-${j.id}`, type: 'contest_join' as const, action: 'Joined',
        item: contestNames[j.contest_id as string] || 'Unknown Contest', itemId: j.contest_id as string,
        timestamp: j.joined_at as string, status: 'info' as const,
      }));

      const merged = [...subActivities, ...joinActivities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(merged);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchActivities(); }, [user?.id, fetchActivities]);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const totalSubmissions = activities.filter(a => a.type === 'submission').length;
  const recentSolves = activities.filter(a => a.type === 'submission' && a.status === 'success').length;

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <RegularOnlyGuard>
        <div className="space-y-6">
          {/* Welcome + Stats */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 glass-panel p-6">
              <h1 className="text-xl font-semibold text-foreground mb-1">
                Welcome back, <span className="text-brand-primary">{user?.user_metadata?.username || 'Programmer'}</span>
              </h1>
              <p className="text-sm text-text-muted mb-5">
                You&apos;ve solved {recentSolves} problems recently. Keep going!
              </p>
              <div className="flex gap-3">
                <Link href="/problems" className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-secondary">
                  Solve Problems
                </Link>
                <Link href="/contests" className="px-4 py-2 text-sm font-medium border border-border text-text-muted rounded-lg hover:text-foreground hover:bg-surface-2">
                  View Contests
                </Link>
              </div>
            </div>

            <div className="glass-panel p-6 w-full md:w-64 shrink-0">
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-surface-2">
                  <div className="text-xl font-semibold text-foreground">{totalSubmissions}</div>
                  <div className="text-xs text-text-muted">Submissions</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2">
                  <div className="text-xl font-semibold text-brand-primary">{recentSolves}</div>
                  <div className="text-xs text-text-muted">Solved</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="glass-panel p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>

            <LoadingState isLoading={activitiesLoading} skeleton={<SkeletonText lines={5} />}>
              <DataTable<Activity>
                columns={[
                  { key: 'item', header: 'Item', className: 'w-[35%]', sortable: true, sortAccessor: (r) => r.item.toLowerCase(), render: (r) => <span className="text-foreground font-medium text-sm">{r.item}</span> },
                  { key: 'type', header: 'Type', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.type, render: (r) => <span className="text-text-muted text-xs">{r.type === 'submission' ? 'Submission' : 'Join'}</span> },
                  { key: 'status', header: 'Status', className: 'w-[15%]', sortable: true, sortAccessor: (r) => r.status, render: (r) => { const v = r.status === 'success' ? 'success' : r.status === 'warning' ? 'warning' : 'info'; const l = r.type === 'submission' ? (r.status === 'success' ? 'Solved' : 'Attempted') : 'Joined'; return <Badge variant={v as any}>{l}</Badge>; } },
                  { key: 'score', header: 'Score', className: 'w-[15%]', render: (r) => <span className="text-text-muted font-mono text-xs">{r.type === 'submission' && r.passed != null && r.total != null ? `${r.passed}/${r.total}` : '-'}</span> },
                  { key: 'when', header: 'When', className: 'w-[20%]', sortable: true, sortAccessor: (r) => new Date(r.timestamp).getTime(), render: (r) => <span className="text-text-muted text-xs">{formatTimeAgo(r.timestamp)}</span> },
                ]}
                rows={activities}
                rowKey={(r) => r.id}
                emptyState={
                  <EmptyState title="No activity yet" description="Start solving problems to see your activity here." action={<Link href="/problems" className="text-sm text-brand-primary hover:underline">Browse Problems</Link>} />
                }
                headerVariant="gray"
              />
            </LoadingState>
          </div>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
