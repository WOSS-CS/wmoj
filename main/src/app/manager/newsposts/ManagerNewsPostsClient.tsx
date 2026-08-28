'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

interface NewsPostRow {
  id: string;
  title: string;
  date_posted: string;
  updated_at: string | null;
  author: string;
}

export default function ManagerNewsPostsClient({
  rows,
  currentPage,
  totalPages,
  currentSearch,
}: {
  rows: NewsPostRow[];
  currentPage: number;
  totalPages: number;
  currentSearch: string;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const token = session?.access_token;

  const currentParams: Record<string, string | undefined> = {
    search: currentSearch || undefined,
  };

  const { displayPage, isLoading, handlePageChange, startTransition, buildHref } =
    usePaginatedNavigation({ currentPage, totalPages, currentParams });

  const { value: searchValue, onChange: onSearchChange } = useDebouncedSearch({
    param: 'search',
    initialValue: currentSearch,
    preserveParams: {},
    startTransition,
  });

  const deletePost = async (p: NewsPostRow) => {
    if (!confirm('Delete this news post? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/manager/newsposts/${p.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setActionMessage(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const columns: Array<DataTableColumn<NewsPostRow>> = [
    {
      key: 'title',
      header: 'Title',
      className: 'w-5/12',
      sortable: true,
      sortAccessor: r => r.title.toLowerCase(),
      render: r => <span className="text-foreground font-medium">{r.title}</span>,
    },
    {
      key: 'author',
      header: 'Author',
      className: 'w-2/12',
      sortable: true,
      sortAccessor: r => r.author.toLowerCase(),
      render: r => <span className="text-text-muted">{r.author}</span>,
    },
    {
      key: 'date_posted',
      header: 'Posted',
      className: 'w-2/12',
      sortable: true,
      sortAccessor: r => new Date(r.date_posted).getTime(),
      render: r => (
        <span className="text-text-muted text-sm font-mono">
          {new Date(r.date_posted).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-3/12',
      render: r => (
        <div className="flex gap-1.5">
          <Link
            href={`/manager/newsposts/${r.id}/edit`}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
          >
            Edit
          </Link>
          <button
            onClick={() => deletePost(r)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <div className="w-full space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">News Posts</h1>
            <p className="text-sm text-text-muted mt-1">Create, edit, and delete news posts.</p>
          </div>
          <Link
            href="/manager/newsposts/create"
            className="h-9 px-4 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary flex items-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Post
          </Link>
        </div>

        {actionMessage && (
          <div className="p-2.5 rounded-md bg-surface-2 border border-border text-sm flex justify-between items-center text-foreground">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-text-muted hover:text-foreground text-lg leading-none">×</button>
          </div>
        )}

        <input
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by title..."
          className="w-full h-9 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

        <div className="glass-panel overflow-hidden">
          <div className="bg-surface-2 px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">All Posts</h2>
          </div>
          <div className="px-4 py-2 border-b border-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
              displayPage={displayPage}
              loading={isLoading}
              onPageChange={handlePageChange}
            />
          </div>
          <DataTable<NewsPostRow> columns={columns} rows={rows} rowKey={r => r.id} loading={isLoading} skeletonRowCount={20} />
        </div>
      </div>
    </AuthGuard>
  );
}