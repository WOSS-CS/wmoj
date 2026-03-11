'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { RegularOnlyGuard } from '@/components/RegularOnlyGuard';
import { Activity } from '@/types/activity';
import Link from 'next/link';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardClient({ initialActivities }: { initialActivities: Activity[] }) {
  const { user } = useAuth();
  const activities = initialActivities;

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
          </div>
        </div>
      </RegularOnlyGuard>
    </AuthGuard>
  );
}
