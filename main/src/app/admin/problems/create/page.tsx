'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { useRouter } from 'next/navigation';
import DataTable, { type DataTableColumn } from '@/components/DataTable';

interface Contest {
  id: string;
  name: string;
}

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });

export default function CreateProblemPage() {
  const { user, signOut, session } = useAuth();
  const router = useRouter();
  // Mouse position state removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    contest: '',
    timeLimit: '5000',
    memoryLimit: '256'
  });
  // Generator-based testcases
  const [generatorFile, setGeneratorFile] = useState<File | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const fetchContests = useCallback(async () => {
    try {
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/admin/contests/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setContests(json.contests || []);
      }
    } catch (e) {
      console.error('Error fetching contests:', e);
    }
  }, [session?.access_token]);

  const token = session?.access_token;

  useEffect(() => {
    if (token) fetchContests();
  }, [token, fetchContests]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGeneratorSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGenError('');
    setGeneratedInput(null);
    setGeneratedOutput(null);
    const file = e.target.files?.[0] || null;
    setGeneratorFile(file);
  };

  const handleGenerate = async () => {
    if (!generatorFile) return;
    setGenLoading(true);
    setGenError('');
    setError('');
    setSuccess('');
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const fd = new FormData();
      fd.append('file', generatorFile);
      const res = await fetch('/api/admin/problems/generator/generate', {
        method: 'POST',
        headers,
        body: fd
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json.error || 'Failed to generate test cases');
        setGeneratedInput(null);
        setGeneratedOutput(null);
      } else {
        setGeneratedInput(json.input || null);
        setGeneratedOutput(json.output || null);
      }
    } catch (e) {
      console.error('Generator error:', e);
      setGenError('Unexpected error running generator');
    } finally {
      setGenLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!generatedInput || !generatedOutput) {
        setError('Please generate test cases before creating the problem.');
        setLoading(false);
        return;
      }
      if (generatedInput.length === 0 || generatedOutput.length === 0) {
        setError('Generated test cases are empty.');
        setLoading(false);
        return;
      }
      if (generatedInput.length !== generatedOutput.length) {
        setError('Generated input and output arrays must be the same length.');
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/problems/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name,
          content: formData.content,
          contest: formData.contest || null,
          input: generatedInput,
          output: generatedOutput,
          timeLimit: parseInt(formData.timeLimit, 10),
          memoryLimit: parseInt(formData.memoryLimit, 10)
        })
      });

      const json = await res.json();

      if (res.ok) {
        setSuccess('Problem created successfully!');
        setFormData({ name: '', content: '', contest: '', timeLimit: '5000', memoryLimit: '256' });
        setGeneratorFile(null);
        setGeneratedInput(null);
        setGeneratedOutput(null);
        setGenError('');
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 2000);
      } else {
        setError(json.error || 'Failed to create problem');
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error occurred creating problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="w-full">
          <LoadingState
            isLoading={!isLoaded}
            skeleton={
              <div className="mb-8 space-y-4">
                <SkeletonText lines={2} width="60%" />
                <SkeletonText lines={1} width="40%" />
              </div>
            }
          >
            <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h1 className="text-4xl font-bold text-foreground mb-4 relative">
                Create New Problem
                <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" />
              </h1>
              <p className="text-text-muted text-lg">
                Add a new problem to a contest or create a standalone problem
              </p>
            </div>
          </LoadingState>

          {/* Create Problem Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Problem Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter problem name"
                />
              </div>

              <div>
                <MarkdownEditor
                  value={formData.content}
                  onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                  placeholder="Enter problem description, constraints, and examples using markdown..."
                  height={500}
                />
              </div>

              <div>
                <label htmlFor="contest" className="block text-sm font-medium text-foreground mb-2">
                  Contest (Optional)
                </label>
                <select
                  id="contest"
                  name="contest"
                  value={formData.contest}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Standalone Problem</option>
                  {contests.map((contest) => (
                    <option key={contest.id} value={contest.id}>
                      {contest.name}
                    </option>
                  ))}
                </select>
                <p className="text-text-muted text-sm mt-1">
                  Leave empty for standalone problems, or select a contest to add this problem to
                </p>
              </div>

              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
                  Time Limit (ms) *
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  value={formData.timeLimit}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., 5000"
                />
                <p className="text-text-muted text-sm mt-1">
                  Maximum time allowed for problem execution in milliseconds.
                </p>
              </div>

              <div>
                <label htmlFor="memoryLimit" className="block text-sm font-medium text-foreground mb-2">
                  Memory Limit (MB) *
                </label>
                <input
                  type="number"
                  id="memoryLimit"
                  name="memoryLimit"
                  value={formData.memoryLimit}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-foreground placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="e.g., 256"
                />
                <p className="text-text-muted text-sm mt-1">
                  Maximum memory allowed for problem execution in megabytes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Generator (C++) *</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="file"
                    accept=".cpp"
                    onChange={handleGeneratorSelect}
                    className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!generatorFile || genLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {genLoading ? 'Generating…' : 'Generate Test Cases'}
                  </button>
                </div>
                <p className="text-text-muted text-sm mt-1">Upload a C++ generator. It must print input JSON to stdout and output JSON to stderr.</p>

                {genError && (
                  <div className="mt-3 bg-[#450a0a] border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 whitespace-pre-wrap break-words">{genError}</p>
                  </div>
                )}

                {generatedInput && generatedOutput && (
                  <div className="mt-4 p-4 border border-border rounded-lg bg-surface-2">
                    <div className="mb-3 text-text-muted text-sm">Generated cases: {generatedInput.length}</div>
                    {(() => {
                      type Row = { idx: number; input: string; output: string };
                      const columns: Array<DataTableColumn<Row>> = [
                        { key: 'idx', header: '#', className: 'w-1/12', sortable: true, sortAccessor: (r) => r.idx, render: (r) => <span className="text-text-muted">{r.idx + 1}</span> },
                        { key: 'input', header: 'Input', className: 'w-5/12', render: (r) => <pre className="text-foreground text-xs whitespace-pre-wrap break-words">{r.input}</pre> },
                        { key: 'output', header: 'Output', className: 'w-5/12', render: (r) => <pre className="text-foreground text-xs whitespace-pre-wrap break-words">{r.output}</pre> },
                      ];
                      const rows: Row[] = generatedInput.slice(0, Math.min(10, generatedInput.length)).map((inp, i) => ({
                        idx: i,
                        input: String(inp),
                        output: String(generatedOutput[i] ?? ''),
                      }));
                      return (
                        <DataTable<Row>
                          columns={columns}
                          rows={rows}
                          rowKey={(r) => String(r.idx)}
                          headerVariant="blue"
                        />
                      );
                    })()}
                    {generatedInput.length > 10 && (
                      <div className="mt-2 text-xs text-text-muted">Showing first 10 of {generatedInput.length} cases…</div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-[#450a0a] border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-[#022c22] border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-400">{success}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Problem'
                  )}
                </button>

                <Link
                  href="/admin/dashboard"
                  className="px-6 py-3 bg-surface-3 text-foreground rounded-lg hover:bg-surface-4 transition-colors duration-300"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
