'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';
import { supabase } from '@/lib/supabase';

type ContestOption = { id: string; name: string };

function parseRawCasesTo2D(rawCases: string[]): (string | number)[][] {
  // Each raw case is a line; split by spaces; numbers become Number, others kept as strings
  const toToken = (t: string) => {
    if (/^[+-]?\d+$/.test(t)) return Number(t);
    return t;
  };
  return rawCases
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/).map(toToken));
}

export default function AdminNewProblemPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cases, setCases] = useState<string[]>(['']);
  const [outputs, setOutputs] = useState<string[]>(['']);
  const [contests, setContests] = useState<ContestOption[]>([]);
  const [contestId, setContestId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('contests').select('id, name').order('name');
      if (!error && data) setContests(data as ContestOption[]);
    })();
  }, []);

  const cases2D = useMemo(() => parseRawCasesTo2D(cases), [cases]);
  const outputs2D = useMemo(() => parseRawCasesTo2D(outputs), [outputs]);

  const addCase = () => setCases((prev) => [...prev, '']);
  const removeCase = (idx: number) => setCases((prev) => prev.filter((_, i) => i !== idx));
  const updateCase = (idx: number, val: string) => setCases((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const addOutput = () => setOutputs((prev) => [...prev, '']);
  const removeOutput = (idx: number) => setOutputs((prev) => prev.filter((_, i) => i !== idx));
  const updateOutput = (idx: number, val: string) => setOutputs((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!title.trim() || !description.trim()) throw new Error('Title and description are required');
      if (cases2D.length === 0) throw new Error('At least one test case is required');
      if (outputs2D.length !== cases2D.length) throw new Error('Outputs must match number of test cases');

      const payload = {
        name: title.trim(),
        content: description.trim(),
        contest: contestId || null,
        input: cases2D, // 2D array
        output: outputs2D // 2D array
      };

      const { error } = await supabase.from('problems').insert(payload);
      if (error) throw error;

      setSuccess('Problem created successfully');
      setTimeout(() => router.push('/admin'), 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create problem');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black px-6 py-10">
        <div className="max-w-3xl mx-auto bg-white/10 border border-white/20 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Create New Problem</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}
            {success && <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400">{success}</div>}

            <div>
              <label className="block text-gray-300 text-sm mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Test Cases (raw plain text, one case per line)</label>
              {cases.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input value={c} onChange={(e) => updateCase(idx, e.target.value)} placeholder={`Test case #${idx + 1}`} className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
                  <button type="button" onClick={() => removeCase(idx)} className="px-2 py-2 bg-red-600 text-white rounded">−</button>
                </div>
              ))}
              <button type="button" onClick={addCase} className="mt-2 px-3 py-2 bg-green-600 text-white rounded">+ Add Test Case</button>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Expected Outputs (raw plain text, one per line)</label>
              {outputs.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input value={c} onChange={(e) => updateOutput(idx, e.target.value)} placeholder={`Expected output #${idx + 1}`} className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/20 text-white" />
                  <button type="button" onClick={() => removeOutput(idx)} className="px-2 py-2 bg-red-600 text-white rounded">−</button>
                </div>
              ))}
              <button type="button" onClick={addOutput} className="mt-2 px-3 py-2 bg-green-600 text-white rounded">+ Add Output</button>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Contest</label>
              <select value={contestId} onChange={(e) => setContestId(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white">
                <option value="">Standalone</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Problem'}
            </button>
          </form>
        </div>
      </div>
    </AdminGuard>
  );
}


