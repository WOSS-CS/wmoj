'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/AnimationWrapper';

interface ProblemData {
  id: string;
  name: string;
  content: string;
  is_active: boolean | null;
  time_limit: number | null;
  memory_limit: number | null;
  points: number;
  test_case_count: number;
  generator_file: string | null;
  checker: string | null;
  created_at: string;
  updated_at: string;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false, loading: () => <div className="h-[300px] bg-surface-2 rounded-md animate-pulse" /> });

const inputClass = "w-full h-10 px-3 bg-surface-2 border border-border rounded-md text-sm text-foreground placeholder-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function ManagerEditProblemClient({ problem }: { problem: ProblemData }) {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: problem.name,
    content: problem.content || '',
    timeLimit: String(problem.time_limit || 5000),
    memoryLimit: String(problem.memory_limit || 256),
    points: String(problem.points),
    is_active: problem.is_active ?? false,
  });
  const initialGenerator = problem.generator_file ?? '';
  const [generatorCode, setGeneratorCode] = useState(initialGenerator);
  // The checker is independent of the stored test data, so — unlike the
  // generator — it is always sent on save and needs no staleness guard.
  const [checkerCode, setCheckerCode] = useState(problem.checker ?? '');
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');
  // Source string we last successfully generated tests for this session.
  // null  = no in-session generation; save will preserve DB tests (Path 1).
  // value = generation succeeded; save will send the new (code, tests) tuple.
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  // Stale-after-gen (BLOCKS save): the user regenerated, then changed the
  // editor away from the source that produced those new tests. Saving would
  // write an inconsistent (code, tests) pair to the DB, so we refuse.
  const isStaleAfterGen =
    generatedInput !== null && generatedOutput !== null &&
    generatedFor !== null && generatorCode !== generatedFor;

  // Edits-will-be-discarded (warns, does not block): the editor diverges
  // from the DB value but no in-session generation happened, so the save
  // payload will omit generator_file and the editor edits will silently
  // vanish. Empty editor is the documented opt-out ("Leave blank to keep
  // existing test cases"), so a cleared editor doesn't trigger the warning.
  const editorEditsWillBeDiscarded =
    generatedInput === null && generatedOutput === null &&
    generatorCode.trim() !== '' && generatorCode !== initialGenerator;

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
      const res = await fetch('/api/manager/problems/generator/generate', { method: 'POST', headers, body: JSON.stringify({ code: generatorCode }) });
      const json = await res.json();
      if (!res.ok) { setGenError(json.error || 'Failed to generate test cases'); setGeneratedInput(null); setGeneratedOutput(null); setGeneratedFor(null); }
      else { setGeneratedInput(json.input || null); setGeneratedOutput(json.output || null); setGeneratedFor(generatorCode); }
    } catch { setGenError('Unexpected error running generator'); }
    finally { setGenLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        content: formData.content,
        is_active: formData.is_active,
        time_limit: parseInt(formData.timeLimit, 10),
        memory_limit: parseInt(formData.memoryLimit, 10),
        points: parseInt(formData.points, 10),
        checker: checkerCode.trim() ? checkerCode : null,
      };

      if (generatedInput && generatedOutput) {
        if (generatedInput.length === 0 || generatedOutput.length === 0) { setError('Generated test cases are empty.'); setLoading(false); return; }
        if (generatedInput.length !== generatedOutput.length) { setError('Input and output arrays must match.'); setLoading(false); return; }
        if (isStaleAfterGen) { setError('Generator code has changed since the last test generation. Regenerate before saving so the stored generator matches the stored tests.'); setLoading(false); return; }
        payload.input = generatedInput;
        payload.output = generatedOutput;
        payload.generator_file = generatorCode;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/manager/problems/${problem.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      // A write filtered to zero rows comes back 200 with no problem; do not
      // report that as saved.
      if (res.ok && json.problem) {
        setSuccess('Problem updated successfully!');
        setTimeout(() => router.push('/manager/problems/manage'), 1500);
      } else { setError(json.error || 'Failed to update problem'); }
    } catch { setError('Unexpected error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Edit Problem</h1>
            <p className="text-sm text-text-muted mt-1">Update problem details, statement, and optionally regenerate test cases</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Problem ID</label>
              <input className={`${inputClass} opacity-60 cursor-not-allowed`} value={problem.id} readOnly disabled />
              <p className="text-xs text-text-muted">The problem ID cannot be changed after creation.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">Problem Name *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter problem name" />
            </div>

            <MarkdownEditor value={formData.content} onChange={(value) => setFormData(prev => ({ ...prev, content: value }))} placeholder="Enter problem description..." height={500} />

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
              <div className="space-y-2 flex items-end pb-0.5">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface-2" checked={formData.is_active} onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))} />
                  Active
                </label>
              </div>
            </div>

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

              {generatedInput && generatedOutput && !isStaleAfterGen && (
                <div className="p-4 border border-success/20 rounded-lg bg-success/5 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-success text-sm font-medium">
                    Successfully generated {generatedInput.length} test cases. These will replace the existing ones when you save.
                  </p>
                </div>
              )}

              {generatedInput && generatedOutput && isStaleAfterGen && (
                <div className="p-4 border border-warning/20 rounded-lg bg-warning/5 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
                  <p className="text-warning text-sm font-medium">
                    Generator code has changed since these {generatedInput.length} test cases were generated. Click <span className="font-semibold">Generate Test Cases</span> again before saving so the stored generator matches the stored tests.
                  </p>
                </div>
              )}

              {editorEditsWillBeDiscarded && (
                <div className="p-4 border border-warning/20 rounded-lg bg-warning/5 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
                  <p className="text-warning text-sm font-medium">
                    Generator code edits will be discarded on save unless you click <span className="font-semibold">Generate Test Cases</span> to apply them. The existing test cases will be preserved.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Custom Checker (C++) — Optional</label>
              <p className="text-xs text-text-muted">Leave this empty for the normal behaviour: every submission is graded by comparing its output to the expected output exactly. Add a checker only when the problem has <strong className="text-foreground">more than one valid answer</strong> — any shortest path, any valid ordering, a floating-point answer within a tolerance. The judge then compiles this program and lets it accept or reject each test case, and its explanation is shown to the student on a rejected case. Unlike the generator above, this field is saved as-is: clearing it removes the checker and returns the problem to exact comparison.</p>
              <CodeEditor language="cpp" value={checkerCode} onChange={setCheckerCode} height="300px" />
            </div>

            {error && <div className="bg-error/10 border border-error/20 rounded-lg p-3"><p className="text-error text-sm">{error}</p></div>}
            {success && <div className="bg-success/10 border border-success/20 rounded-lg p-3"><p className="text-success text-sm">{success}</p></div>}

            <div className="flex gap-3">
              <button type="submit" disabled={loading || isStaleAfterGen} className="h-10 px-5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {loading ? <><LoadingSpinner size="sm" /><span>Saving...</span></> : 'Save Changes'}
              </button>
              <Link href="/manager/problems/manage" className="h-10 px-5 bg-surface-2 text-foreground text-sm font-medium rounded-md hover:bg-surface-3 flex items-center">Cancel</Link>
            </div>
          </form>
        </div>
      </ManagerGuard>
    </AuthGuard>
  );
}
