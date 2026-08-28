'use client';

import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/AnimationWrapper';

const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor),
  { ssr: false }
);

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function ManagerCreateNewsPostClient() {
  const { session } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = session?.access_token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!content.trim()) { setError('Content is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/manager/newsposts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, content }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to create post'); return; }
      router.push('/manager/newsposts');
    } catch {
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Create News Post</h1>
          <p className="text-sm text-text-muted mt-1">Write and publish a new news post for all users to see.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-medium text-foreground">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className={inputClass}
              placeholder="Enter post title"
            />
          </div>

          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Write your news post content in markdown..."
            height={500}
            label="Post Content"
          />

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <><LoadingSpinner size="sm" /><span>Publishing...</span></> : 'Publish Post'}
            </button>
            <Link
              href="/manager/newsposts"
              className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
