'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { supabase } from '@/lib/supabase';

export default function AdminNewContestPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [length, setLength] = useState<number>(120);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (!title.trim()) throw new Error('Title is required');
      const payload = {
        name: title.trim(),
        description: description.trim(),
        length: Number(length),
        is_active: isActive,
      };
      const { error } = await supabase.from('contests').insert(payload);
      if (error) throw error;
      setSuccess('Contest created successfully');
      setTimeout(() => router.push('/admin'), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to create contest');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-6 py-10">
        <div className="max-w-3xl mx-auto bg-white/10 border border-white/20 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Create New Contest</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}
            {success && <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400">{success}</div>}

            <div>
              <label className="block text-gray-300 text-sm mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Length (minutes)</label>
                <input type="number" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
              </div>
              <div className="flex items-end gap-2">
                <input id="active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-5 h-5" />
                <label htmlFor="active" className="text-gray-300">Active (visible to users)</label>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Contest'}
            </button>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}


