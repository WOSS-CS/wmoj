'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
// Link not used on this page
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DataTable, { type DataTableColumn } from '@/components/DataTable';

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();

  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Array<{
    id: string;
    user: string;
    problem: string;
    passed: boolean;
    timestamp: string;
  }>>([]);
  const hasLoadedActivitiesRef = useRef(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
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
        const json: { submissions?: Array<{ id: string; created_at: string; user: string; problem: string; passed: boolean }> } = await res.json();
        setSubmissions((json.submissions || []).map((s) => ({
          id: s.id,
          user: s.user,
          problem: s.problem,
          passed: !!s.passed,
          timestamp: s.created_at
        })));
      }
    } catch (e) {
      console.error('Failed to fetch recent submissions', e);
    } finally {
      hasLoadedActivitiesRef.current = true;
      setActivitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentSubmissions();
  }, [fetchRecentSubmissions]);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="w-full">
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
                Admin Dashboard
                <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" />
              </h1>
              <p className="text-gray-300 text-lg">
                Manage contests and problems for the competitive programming platform
              </p>
            </div>
          </LoadingState>

          {/* Recent Activity (last 24 hours submissions) */}
          <div className={`p-0 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 relative">
              Recent Activity
              <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-red-400 to-red-600 animate-pulse" />
            </h2>
            {activitiesLoading ? (
              <div className="space-y-3">
                <SkeletonText lines={3} />
              </div>
            ) : submissions.length > 0 ? (
              <>
                {(() => {
                  type Row = { id: string; user: string; problem: string; passed: boolean; timestamp: string };
                  const columns: Array<DataTableColumn<Row>> = [
                    {
                      key: 'user',
                      header: 'User',
                      className: 'w-[25%]',
                      sortable: true,
                      sortAccessor: (r) => r.user.toLowerCase(),
                      render: (r) => <span className="text-white font-medium">{r.user}</span>,
                    },
                    {
                      key: 'problem',
                      header: 'Problem',
                      className: 'w-[35%]',
                      sortable: true,
                      sortAccessor: (r) => r.problem.toLowerCase(),
                      render: (r) => <span className="text-gray-200">{r.problem}</span>,
                    },
                    {
                      key: 'result',
                      header: 'Result',
                      className: 'w-[15%]',
                      sortable: true,
                      sortAccessor: (r) => (r.passed ? 1 : 0),
                      render: (r) => (
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${r.passed ? 'text-green-400 bg-green-900 border-green-900' : 'text-yellow-400 bg-yellow-900 border-yellow-900'}`}>
                          {r.passed ? 'Solved' : 'Attempted'}
                        </span>
                      ),
                    },
                    {
                      key: 'when',
                      header: 'When',
                      className: 'w-[25%]',
                      sortable: true,
                      sortAccessor: (r) => new Date(r.timestamp).getTime(),
                      render: (r) => (
                        <span className="text-gray-400 text-sm">{formatTimeAgo(r.timestamp)}</span>
                      ),
                    },
                  ];
                  return (
                    <DataTable<Row>
                      columns={columns}
                      rows={submissions}
                      rowKey={(r) => r.id}
                      headerVariant="red"
                    />
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No submissions in the last 24 hours.</p>
              </div>
            )}
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
