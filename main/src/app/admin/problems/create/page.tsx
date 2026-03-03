'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useRouter } from 'next/navigation';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/AnimationWrapper';

interface Contest { id: string; name: string; }

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function CreateProblemPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);
  const [formData, setFormData] = useState({ name: '', content: '', contest: '', timeLimit: '5000', memoryLimit: '256', difficulty: 'Easy' });
  const [generatorFile, setGeneratorFile] = useState<File | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');

  const token = session?.access_token;

  const fetchContests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/contests/list', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setContests(json.contests || []);
    } catch (e) { console.error('Error fetching contests:', e); }
  }, [token]);

  useEffect(() => { if (token) fetchContests(); }, [token, fetchContests]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGeneratorSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGenError(''); setGeneratedInput(null); setGeneratedOutput(null);
    setGeneratorFile(e.target.files?.[0] || null);
  };

  const handleGenerate = async () => {
    if (!generatorFile) return;
    setGenLoading(true); setGenError(''); setError(''); setSuccess('');
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const fd = new FormData();
      fd.append('file', generatorFile);
      const res = await fetch('/api/admin/problems/generator/generate', { method: 'POST', headers, body: fd });
      const json = await res.json();
      if (!res.ok) { setGenError(json.error || 'Failed to generate test cases'); setGeneratedInput(null); setGeneratedOutput(null); }
      else { setGeneratedInput(json.input || null); setGeneratedOutput(json.output || null); }
    } catch { setGenError('Unexpected error running generator'); }
    finally { setGenLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      if (!generatedInput || !generatedOutput) { setError('Please generate test cases first.'); setLoading(false); return; }
      if (generatedInput.length === 0 || generatedOutput.length === 0) { setError('Generated test cases are empty.'); setLoading(false); return; }
      if (generatedInput.length !== generatedOutput.length) { setError('Input and output arrays must match.'); setLoading(false); return; }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/problems/create', {
        method: 'POST', headers,
        body: JSON.stringify({ name: formData.name, content: formData.content, contest: formData.contest || null, input: generatedInput, output: generatedOutput, timeLimit: parseInt(formData.timeLimit, 10), memoryLimit: parseInt(formData.memoryLimit, 10), difficulty: formData.difficulty })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Problem created successfully!');
        setFormData({ name: '', content: '', contest: '', timeLimit: '5000', memoryLimit: '256', difficulty: 'Easy' });
        setGeneratorFile(null); setGeneratedInput(null); setGeneratedOutput(null); setGenError('');
        setTimeout(() => router.push('/admin/dashboard'), 2000);
      } else { setError(json.error || 'Failed to create problem'); }
    } catch { setError('Unexpected error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Create New Problem</h1>
            <p className="text-sm text-text-muted mt-1">Add a new problem to a contest or create a standalone problem</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">Problem Name *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter problem name" />
            </div>

            <MarkdownEditor value={formData.content} onChange={(value) => setFormData(prev => ({ ...prev, content: value }))} placeholder="Enter problem description..." height={500} />

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contest" className="block text-sm font-medium text-foreground">Contest (Optional)</label>
                <select id="contest" name="contest" value={formData.contest} onChange={handleChange} className={inputClass}>
                  <option value="">Standalone Problem</option>
                  {contests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="difficulty" className="block text-sm font-medium text-foreground">Difficulty *</label>
                <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={handleChange} className={inputClass}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground">Time Limit (ms) *</label>
                <input type="number" id="timeLimit" name="timeLimit" value={formData.timeLimit} onChange={handleChange} required min="1" className={inputClass} placeholder="5000" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="memoryLimit" className="block text-sm font-medium text-foreground">Memory Limit (MB) *</label>
                <input type="number" id="memoryLimit" name="memoryLimit" value={formData.memoryLimit} onChange={handleChange} required min="1" className={inputClass} placeholder="256" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Generator (C++) *</label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input type="file" accept=".cpp" onChange={handleGeneratorSelect} className="block text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-primary file:text-white hover:file:bg-brand-secondary" />
                <button type="button" onClick={handleGenerate} disabled={!generatorFile || genLoading} className="px-4 py-1.5 bg-success/10 text-success text-sm font-medium rounded-md hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  {genLoading ? 'Generating…' : 'Generate Test Cases'}
                </button>
              </div>
              <p className="text-xs text-text-muted">Upload a C++ generator. It must print input JSON to stdout and output JSON to stderr.</p>

              {genError && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm whitespace-pre-wrap break-words">{genError}</p></div>}

              {generatedInput && generatedOutput && (
                <div className="p-4 border border-border rounded-lg bg-surface-2">
                  <div className="mb-2 text-text-muted text-sm">Generated cases: {generatedInput.length}</div>
                  {(() => {
                    type Row = { idx: number; input: string; output: string };
                    const columns: Array<DataTableColumn<Row>> = [
                      { key: 'idx', header: '#', className: 'w-1/12', render: (r) => <span className="text-text-muted font-mono">{r.idx + 1}</span> },
                      { key: 'input', header: 'Input', className: 'w-5/12', render: (r) => <pre className="text-foreground text-xs whitespace-pre-wrap break-words font-mono">{r.input}</pre> },
                      { key: 'output', header: 'Output', className: 'w-5/12', render: (r) => <pre className="text-foreground text-xs whitespace-pre-wrap break-words font-mono">{r.output}</pre> },
                    ];
                    const rows: Row[] = generatedInput.slice(0, 10).map((inp, i) => ({ idx: i, input: String(inp), output: String(generatedOutput[i] ?? '') }));
                    return <DataTable<Row> columns={columns} rows={rows} rowKey={(r) => String(r.idx)} />;
                  })()}
                  {generatedInput.length > 10 && <div className="mt-2 text-xs text-text-muted">Showing first 10 of {generatedInput.length} cases…</div>}
                </div>
              )}
            </div>

            {error && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm">{error}</p></div>}
            {success && <div className="bg-success/10 border border-success/20 rounded-lg p-3"><p className="text-success text-sm">{success}</p></div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <><LoadingSpinner size="sm" /><span>Creating...</span></> : 'Create Problem'}
              </button>
              <Link href="/admin/dashboard" className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center">Cancel</Link>
            </div>
          </form>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
