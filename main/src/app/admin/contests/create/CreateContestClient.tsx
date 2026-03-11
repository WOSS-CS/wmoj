'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useRouter } from 'next/navigation';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/AnimationWrapper';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function CreateContestClient() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', length: 60 });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'length' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/contests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Contest created successfully!');
        setFormData({ name: '', description: '', length: 60 });
        setTimeout(() => router.push('/admin/dashboard'), 2000);
      } else { setError(json.error || 'Failed to create contest'); }
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Create New Contest</h1>
            <p className="text-sm text-text-muted mt-1">Create a new competitive programming contest with custom settings</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">Contest Name *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter contest name" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Description (Markdown) *</label>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <MarkdownEditor value={formData.description} onChange={(value: string) => setFormData(prev => ({ ...prev, description: value }))} placeholder="Write contest description in Markdown..." height={360} />
                <div className="p-4 overflow-auto max-h-[480px] bg-surface-1 border border-border rounded-lg">
                  <div className="text-xs text-text-muted uppercase tracking-wider font-medium mb-3">Preview</div>
                  <MarkdownRenderer content={formData.description || '*Nothing yet...*'} />
                </div>
              </div>
            </div>

            <div className="max-w-xs space-y-1.5">
              <label htmlFor="length" className="block text-sm font-medium text-foreground">Duration (minutes) *</label>
              <input type="number" id="length" name="length" value={formData.length} onChange={handleChange} required min="1" max="1440" className={inputClass} placeholder="60" />
              <p className="text-xs text-text-muted">Contest duration in minutes (1–1440)</p>
            </div>

            {/* Summary Preview */}
            <div>
              {(() => {
                type Row = { name: string; description: string; length: number; active: boolean };
                const columns: Array<DataTableColumn<Row>> = [
                  { key: 'name', header: 'Name', className: 'w-[25%]', render: (r) => <span className="text-foreground font-medium">{r.name || '-'}</span> },
                  { key: 'description', header: 'Description', className: 'w-[50%]', render: (r) => <div className="text-text-muted text-sm line-clamp-2 break-words">{r.description || '-'}</div> },
                  { key: 'length', header: 'Length', className: 'w-[15%]', render: (r) => <span className="text-text-muted font-mono">{r.length || 0} min</span> },
                  { key: 'active', header: 'Active', className: 'w-[10%]', render: () => <span className="text-success text-xs font-medium">Yes</span> },
                ];
                return <DataTable<Row> columns={columns} rows={[{ name: formData.name, description: formData.description, length: formData.length, active: true }]} rowKey={(_r, i) => String(i)} />;
              })()}
            </div>

            {error && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm">{error}</p></div>}
            {success && <div className="bg-success/10 border border-success/20 rounded-lg p-3"><p className="text-success text-sm">{success}</p></div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <><LoadingSpinner size="sm" /><span>Creating...</span></> : 'Create Contest'}
              </button>
              <Link href="/admin/dashboard" className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center">Cancel</Link>
            </div>
          </form>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
