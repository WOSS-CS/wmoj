'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { NewsPost, CompactContest, CompactProblem } from './page';
import { formatTimeUntil } from '@/utils/contestStatus';
import { toast } from '@/components/ui/Toast';

const NEWS_PAGE_SIZE = 10;

/**
 * Module scope, not component scope: it reads the wall clock, so it is not a
 * pure render-time computation.
 */
function formatTimeAgo(timestamp: string) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface DashboardClientProps {
  initialNewsPosts: NewsPost[];
  ongoingContests: CompactContest[];
  upcomingContests: CompactContest[];
  recentProblems: CompactProblem[];
}

export default function DashboardClient({ 
  initialNewsPosts,
  ongoingContests,
  upcomingContests,
  recentProblems 
}: DashboardClientProps) {
  const [posts, setPosts] = useState<NewsPost[]>(initialNewsPosts || []);
  const [offset, setOffset] = useState(NEWS_PAGE_SIZE);
  const [hasMore, setHasMore] = useState((initialNewsPosts || []).length === NEWS_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, content, date_posted, users!inner(username)')
        .order('date_posted', { ascending: false })
        // Tiebreaker: two posts sharing a date_posted have no stable order
        // across separate LIMIT/OFFSET queries, so one could repeat while
        // another was skipped.
        .order('id', { ascending: true })
        .range(offset, offset + NEWS_PAGE_SIZE - 1);

      if (error) {
        // A failed fetch used to be indistinguishable from "no more posts" and
        // silently hid the Load More button for the rest of the session.
        console.error('[Dashboard] Failed to load more news posts:', error);
        toast.error('Error', 'Failed to load more news posts.');
        return;
      }

      const batch = (data || []) as unknown as NewsPost[];
      // Functional updates: reading `posts`/`offset` out of the closure dropped
      // a whole batch when two loads overlapped. The id filter keeps a post
      // published between two pages from appearing twice.
      setPosts(prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...batch.filter(p => !seen.has(p.id))];
      });
      setOffset(prev => prev + batch.length);
      setHasMore(batch.length === NEWS_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: News */}
      <div className="flex-[3] min-w-0">
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">News</h2>
          </div>
          
          {posts.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No news posts available at the moment.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => {
                const username = Array.isArray(post.users) ? post.users[0]?.username : post.users?.username;
                return (
                  <div key={post.id} className="p-6">
                    <h3 className="text-xl font-semibold text-brand-primary mb-1">{post.title}</h3>
                    <div className="text-sm text-text-muted mb-4 pb-4 border-b border-border/50">
                      <span className="font-medium text-foreground">{username || 'Unknown'}</span> posted {formatTimeAgo(post.date_posted)}
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <MarkdownRenderer content={post.content} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="px-6 py-4 border-t border-border bg-surface-1/50 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-medium border border-border text-text-muted rounded-lg hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="flex-1 min-w-0 space-y-6">
        
        {/* Ongoing Contests */}
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Ongoing contests</h2>
          </div>
          <div className="divide-y divide-border">
            {ongoingContests.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">No ongoing contests.</div>
            ) : (
              ongoingContests.map(contest => (
                <div key={contest.id} className="p-4 text-center">
                  <Link href={`/contests/${contest.id}/view`} className="block text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors mb-1">
                    {contest.name}
                  </Link>
                  <div className="text-xs text-text-muted">
                    Ends {contest.ends_at ? formatTimeUntil(contest.ends_at) : 'never'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Contests */}
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Upcoming contests</h2>
          </div>
          <div className="divide-y divide-border">
            {upcomingContests.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">No upcoming contests.</div>
            ) : (
              upcomingContests.map(contest => (
                <div key={contest.id} className="p-4 text-center">
                  <Link href={`/contests/${contest.id}/view`} className="block text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors mb-1">
                    {contest.name}
                  </Link>
                  <div className="text-xs text-text-muted">
                    Starting {contest.starts_at ? formatTimeUntil(contest.starts_at) : 'soon'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* New Problems */}
        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">New problems</h2>
          </div>
          <div className="divide-y divide-border">
            {recentProblems.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">No problems found.</div>
            ) : (
              recentProblems.map(problem => (
                <div key={problem.id} className="p-4 flex items-center justify-between gap-3">
                  <Link href={`/problems/${problem.id}`} className="block text-sm font-semibold text-brand-primary hover:text-brand-secondary transition-colors truncate">
                    {problem.name}
                  </Link>
                  <div className="shrink-0">
                    <span className="text-sm font-mono text-text-muted">{problem.points} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>

    </div>
  );
}
