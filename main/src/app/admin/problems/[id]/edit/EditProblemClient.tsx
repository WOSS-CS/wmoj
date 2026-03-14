'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/AnimationWrapper';

interface Contest { id: string; name: string; }

interface ProblemData {
  id: string;
  name: string;
  content: string;
  contest: string | null;
  is_active: boolean | null;
  time_limit: number | null;
  memory_limit: number | null;
  difficulty: string | null;
  test_case_count: number;
  created_at: string;
  updated_at: string;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false, loading: () => <div className="h-[300px] bg-surface-2 rounded-md animate-pulse" /> });

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function EditProblemClient({ problem, initialContests }: { problem: ProblemData; initialContests: Contest[] }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contests] = useState<Contest[]>(initialContests);
  const [formData, setFormData] = useState({
    name: problem.name,
    content: problem.content || '',
    contest: problem.contest || '',
    timeLimit: String(problem.time_limit || 5000),
    memoryLimit: String(problem.memory_limit || 256),
    difficulty: problem.difficulty || 'Easy',
    is_active: problem.is_active ?? true,
  });
  const [generatorCode, setGeneratorCode] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');

  const token = session?.access_token;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!generatorCode.trim()) return;
    setGenLoading(true); setGenError(''); setError(''); setSuccess('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/problems/generator/generate', { method: 'POST', headers, body: JSON.stringify({ code: generatorCode }) });
      const json = await res.json();
      if (!res.ok) { setGenError(json.error || 'Failed to generate test cases'); setGeneratedInput(null); setGeneratedOutput(null); }
      else { setGeneratedInput(json.input || null); setGeneratedOutput(json.output || null); }
    } catch { setGenError('Unexpected error running generator'); }
    finally { setGenLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        content: formData.content,
        contest: formData.contest || null,
        is_active: formData.is_active,
        time_limit: parseInt(formData.timeLimit, 10),
        memory_limit: parseInt(formData.memoryLimit, 10),
        difficulty: formData.difficulty,
      };

      // Only include test cases if new ones were generated
      if (generatedInput && generatedOutput) {
        if (generatedInput.length === 0 || generatedOutput.length === 0) { setError('Generated test cases are empty.'); setLoading(false); return; }
        if (generatedInput.length !== generatedOutput.length) { setError('Input and output arrays must match.'); setLoading(false); return; }
        payload.input = generatedInput;
        payload.output = generatedOutput;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/problems/${problem.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Problem updated successfully!');
        setTimeout(() => router.push('/admin/problems/manage'), 1500);
      } else { setError(json.error || 'Failed to update problem'); }
    } catch { setError('Unexpected error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Edit Problem</h1>
            <p className="text-sm text-text-muted mt-1">Update problem details, statement, and optionally regenerate test cases</p>
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
              <div className="space-y-2 flex items-end pb-0.5">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface-2" checked={formData.is_active} onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} />
                  Active
                </label>
              </div>
            </div>

            {/* Existing test case info */}
            <div className="p-4 border border-border rounded-lg bg-surface-2 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-primary" />
              <p className="text-sm text-foreground">
                Current test cases: <span className="font-mono font-medium">{problem.test_case_count}</span>
              </p>
              {generatedInput && generatedOutput && (
                <span className="text-xs text-warning font-medium ml-auto">Will be overridden on save</span>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Generator (C++) — Optional</label>
              <p className="text-xs text-text-muted">Paste a C++ generator to regenerate test cases. It must print input JSON to stdout and output JSON to stderr. Leave blank to keep existing test cases.</p>
              <CodeEditor language="cpp" value={generatorCode} onChange={setGeneratorCode} height="300px" />
              <button type="button" onClick={handleGenerate} disabled={!generatorCode.trim() || genLoading} className="px-4 py-1.5 bg-success/10 text-success text-sm font-medium rounded-md hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {genLoading ? 'Generating…' : 'Generate Test Cases'}
              </button>

              {genError && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm whitespace-pre-wrap break-words">{genError}</p></div>}

              {generatedInput && generatedOutput && (
                <div className="p-4 border border-success/20 rounded-lg bg-success/5 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-success text-sm font-medium">
                    Successfully generated {generatedInput.length} test cases. These will replace the existing ones when you save.
                  </p>
                </div>
              )}
            </div>

            {error && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm">{error}</p></div>}
            {success && <div className="bg-success/10 border border-success/20 rounded-lg p-3"><p className="text-success text-sm">{success}</p></div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <><LoadingSpinner size="sm" /><span>Saving...</span></> : 'Save Changes'}
              </button>
              <Link href="/admin/problems/manage" className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center">Cancel</Link>
            </div>
          </form>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
