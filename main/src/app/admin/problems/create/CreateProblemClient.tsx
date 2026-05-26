'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/AnimationWrapper';
import { validateSlug } from '@/utils/validation';
import { PromptCopyButton } from '@/components/PromptCopyButton';
import { ProblemCreationGuideModal } from '@/components/ProblemCreationGuideModal';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false, loading: () => <div className="h-[300px] bg-surface-2 rounded-md animate-pulse" /> });

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function CreateProblemClient() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', content: '', timeLimit: '5000', memoryLimit: '256', points: '' });
  const [generatorCode, setGeneratorCode] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');
  // Source string that produced the currently-held generatedInput/Output.
  // Used to detect when the user has edited the generator after a successful
  // generation but before saving — see isStale below.
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  // Tests are stale when we have a successful generation on record but the
  // editor's current source no longer matches what produced those tests.
  // Blocks Create Problem so the stored generator_file is always the exact
  // source that produced the stored input/output arrays.
  const isStale = generatedFor !== null && generatorCode !== generatedFor;

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
      if (!res.ok) { setGenError(json.error || 'Failed to generate test cases'); setGeneratedInput(null); setGeneratedOutput(null); setGeneratedFor(null); }
      else { setGeneratedInput(json.input || null); setGeneratedOutput(json.output || null); setGeneratedFor(generatorCode); }
    } catch { setGenError('Unexpected error running generator'); }
    finally { setGenLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    const slugError = validateSlug(formData.id, 'Problem');
    if (slugError) { setError(slugError); setLoading(false); return; }
    try {
      if (!generatedInput || !generatedOutput) { setError('Please generate test cases first.'); setLoading(false); return; }
      if (generatedInput.length === 0 || generatedOutput.length === 0) { setError('Generated test cases are empty.'); setLoading(false); return; }
      if (generatedInput.length !== generatedOutput.length) { setError('Input and output arrays must match.'); setLoading(false); return; }
      if (isStale) { setError('Generator code has changed since the last test generation. Regenerate before saving so the stored generator matches the stored tests.'); setLoading(false); return; }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/problems/create', {
        method: 'POST', headers,
        body: JSON.stringify({ id: formData.id, name: formData.name, content: formData.content, input: generatedInput, output: generatedOutput, timeLimit: parseInt(formData.timeLimit, 10), memoryLimit: parseInt(formData.memoryLimit, 10), points: parseInt(formData.points, 10), generator_file: generatorCode })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('Problem created successfully!');
        setFormData({ id: '', name: '', content: '', timeLimit: '5000', memoryLimit: '256', points: '' });
        setGeneratorCode(''); setGeneratedInput(null); setGeneratedOutput(null); setGeneratedFor(null); setGenError('');
        setTimeout(() => router.push('/admin/dashboard'), 2000);
      } else { setError(json.error || 'Failed to create problem'); }
    } catch { setError('Unexpected error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Create New Problem</h1>
              <p className="text-sm text-text-muted mt-1">Add a new problem. Assign it to contests from the contest editing page.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-1 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 1.875-2 3.272-2 2.04 0 3.5 1.343 3.5 3 0 1.5-1 2.25-2.5 3-.5.25-1 .75-1 1.5m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Problem Creation Guide
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
            <div className="space-y-1.5">
              <label htmlFor="id" className="block text-sm font-medium text-foreground">Problem ID (Slug) *</label>
              <input type="text" id="id" name="id" value={formData.id} onChange={handleChange} required className={inputClass} placeholder="e.g. two-sum" />
              <p className="text-xs text-text-muted">The id / path in the URL to this problem (e.g. /problems/two-sum). Letters, numbers, hyphens, underscores. Cannot be changed later.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">Problem Name *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter problem name" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-foreground">Problem Description</label>
                <PromptCopyButton label="Copy Conversion Prompt" url="/conversion.md" />
              </div>
              <p className="text-xs text-text-muted">Pasting LLM-generated markdown? Delete the title heading at the very top and enter it in the <strong className="text-foreground">Problem Name</strong> field above instead (otherwise the title shows twice), and delete the time and memory limits listed at the top — enter those in the <strong className="text-foreground">Time Limit</strong> and <strong className="text-foreground">Memory Limit</strong> fields below.</p>
              <MarkdownEditor value={formData.content} onChange={(value) => setFormData(prev => ({ ...prev, content: value }))} placeholder="Enter problem description..." height={500} />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="points" className="block text-sm font-medium text-foreground">Points *</label>
                <input type="number" id="points" name="points" value={formData.points} onChange={handleChange} required min="1" className={inputClass} placeholder="e.g. 3, 6, 10" />
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-foreground">Generator (C++) *</label>
                <PromptCopyButton label="Copy Generator Prompt" url="/generator.md" />
              </div>
              <p className="text-xs text-text-muted">Paste your C++ generator code below. It must print input JSON to stdout and output JSON to stderr.</p>
              <CodeEditor language="cpp" value={generatorCode} onChange={setGeneratorCode} height="300px" />
              <button type="button" onClick={handleGenerate} disabled={!generatorCode.trim() || genLoading} className="px-4 py-1.5 bg-success/10 text-success text-sm font-medium rounded-md hover:bg-success/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {genLoading ? 'Generating…' : 'Generate Test Cases'}
              </button>

              {genError && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm whitespace-pre-wrap break-words">{genError}</p></div>}

              {generatedInput && generatedOutput && !isStale && (
                <div className="p-4 border border-success/20 rounded-lg bg-success/5 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-success text-sm font-medium">
                    Successfully generated {generatedInput.length} test cases.
                  </p>
                </div>
              )}

              {generatedInput && generatedOutput && isStale && (
                <div className="p-4 border border-warning/20 rounded-lg bg-warning/5 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
                  <p className="text-warning text-sm font-medium">
                    Generator code has changed since these {generatedInput.length} test cases were generated. Click <span className="font-semibold">Generate Test Cases</span> again before saving so the stored generator matches the stored tests.
                  </p>
                </div>
              )}
            </div>

            {error && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm">{error}</p></div>}
            {success && <div className="bg-success/10 border border-success/20 rounded-lg p-3"><p className="text-success text-sm">{success}</p></div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading || isStale} className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <><LoadingSpinner size="sm" /><span>Creating...</span></> : 'Create Problem'}
              </button>
              <Link href="/admin/dashboard" className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center">Cancel</Link>
            </div>
          </form>

          <ProblemCreationGuideModal open={showGuide} onClose={() => setShowGuide(false)} role="admin" />
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
