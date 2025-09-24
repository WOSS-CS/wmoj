'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { checkContestParticipation } from '@/utils/participationCheck';

export default function ProblemPage() {
  const routeParams = useParams<{ id: string }>();
  const problemId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [results, setResults] = useState<Array<{
    index: number;
    exitCode: number | null;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    passed: boolean;
    expected: string;
    received: string;
  }> | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [bestSummary, setBestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);

  const JUDGE_URL = (process.env.NEXT_PUBLIC_JUDGE_URL as string) || 'http://localhost:4001';

  useEffect(() => {
    if (problemId) {
      fetchProblem(problemId);
    }
  }, [problemId]);

  // Check access permission for contest problems
  useEffect(() => {
    (async () => {
      if (!user || !problem) return;
      
      // If problem is part of a contest, check participation
      if (problem.contest) {
        try {
          const hasAccess = await checkContestParticipation(user.id, problem.contest);
          if (!hasAccess) {
            router.push('/problems');
            return;
          }
        } catch (error) {
          console.error('Error checking contest access:', error);
          router.push('/problems');
        }
      }
      setAccessChecked(true);
    })();
  }, [user, problem, router]);

  useEffect(() => {
    if (user && problem) {
      fetchBestSubmission(user.id, problem.id);
    }
  }, [user, problem]);

  const fetchProblem = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/problems/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problem');
      }

      setProblem(data.problem);
    } catch (err) {
      console.error('Error fetching problem:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch problem');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCodeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem || !user || !codeFile) return;
    setSubmitting(true);
    setSubmitError('');
    setResults(null);
    setSummary(null);

    try {
      const code = await codeFile.text();
      const payload = {
        language: selectedLanguage,
        code,
        input: problem.input,
        output: problem.output,
      };

      const resp = await fetch(`${JUDGE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Judge failed to evaluate submission');
      }

      setResults(data.results || []);
      setSummary(data.summary || null);

      // Persist submission to Supabase
      await supabase.from('submissions').insert({
        problem_id: problem.id,
        user_id: user.id,
        language: selectedLanguage,
        code,
        input: problem.input,
        output: problem.output,
        results: data.results,
        summary: data.summary,
      });

      // Refresh best submission indicator
      await fetchBestSubmission(user.id, problem.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchBestSubmission = async (userId: string, problemId: string) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('summary')
        .eq('user_id', userId)
        .eq('problem_id', problemId);

      if (error) {
        console.error('Error loading best submission:', error);
        return;
      }

      if (!data || data.length === 0) {
        setBestSummary(null);
        return;
      }

      let best: { total: number; passed: number; failed: number } | null = null;
      for (const row of data) {
        const s = row.summary as { total?: number; passed?: number; failed?: number } | null;
        if (!s) continue;
        const current = {
          total: Number(s.total ?? 0),
          passed: Number(s.passed ?? 0),
          failed: Number(s.failed ?? 0),
        };
        if (
          !best ||
          current.passed > best.passed ||
          (current.passed === best.passed && current.total > best.total)
        ) {
          best = current;
        }
      }
      setBestSummary(best);
    } finally {
      // no-op
    }
  };

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' }
  ];

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Circuit Pattern Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-20 w-32 h-0.5 bg-green-400"></div>
          <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-20 left-52 w-0.5 h-16 bg-green-400"></div>
          <div className="absolute top-36 left-52 w-24 h-0.5 bg-green-400"></div>
          <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full"></div>
          
          <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute top-40 right-20 w-0.5 h-20 bg-green-400"></div>
          <div className="absolute top-60 right-20 w-40 h-0.5 bg-green-400"></div>
          <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full"></div>
          
          <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-green-400"></div>
          <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-green-400"></div>
          <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="flex justify-between items-center p-6">
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-green-400">W</span>
            <span className="text-white">MOJ</span>
          </Link>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/problems')}
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
            >
              Back to Problems
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
            >
              Back to Dashboard
            </button>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Loading State */}
          {(loading || !accessChecked) && (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => router.push('/problems')}
                className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Problems
              </button>
            </div>
          )}

          {/* Problem Content */}
          {!loading && !error && problem && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Problem Description */}
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-white">
                      {problem.name}
                    </h1>
                    <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm">
                      {problem.contest ? 'Contest Problem' : 'Standalone'}
                    </span>
                  </div>
                  
                  <div className="prose prose-invert max-w-none">
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {problem.content}
                    </div>
                  </div>
                  {bestSummary && (
                    <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${bestSummary.failed === 0 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                        {bestSummary.failed === 0 ? 'Passed' : 'Failed'}
                      </span>
                      <span className="text-gray-300">
                        Best score: <span className="text-white font-semibold">{bestSummary.passed}/{bestSummary.total}</span>
                      </span>
                    </div>
                  )}

                  {summary && results && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold text-white mb-4">Latest Submission Results</h3>
                      <div className="mb-4 flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm ${summary.failed === 0 ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                          {summary.failed === 0 ? 'All Passed' : 'Some Failed'}
                        </span>
                        <span className="text-gray-300">Score:</span>
                        <span className="text-white font-semibold">{summary.passed}/{summary.total}</span>
                      </div>
                      <div className="space-y-3">
                        {results.map((r) => (
                          <div key={r.index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${r.passed ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                                  {r.passed ? 'Passed' : 'Failed'}
                                </span>
                                <span className="text-white font-medium">Test case {r.index + 1}</span>
                              </div>
                              <div className="text-xs text-gray-400">exit {r.exitCode}{r.timedOut ? ' · timed out' : ''}</div>
                            </div>
                            {!r.passed && (
                              <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <div className="text-gray-400 mb-1">Expected</div>
                                  <pre className="p-3 rounded bg-black/40 text-gray-200 whitespace-pre-wrap">{r.expected}</pre>
                                </div>
                                <div>
                                  <div className="text-gray-400 mb-1">Received</div>
                                  <pre className="p-3 rounded bg-black/40 text-gray-200 whitespace-pre-wrap">{r.received}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Submission Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-8">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Submit Solution
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Language Selection */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Programming Language
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-400 transition-all duration-300"
                      >
                        {languages.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Upload Code File
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept=".py,.cpp,.java,.c,.h"
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 focus:outline-none focus:border-green-400 transition-all duration-300"
                        />
                      </div>
                      {codeFile && (
                        <p className="mt-2 text-sm text-green-400">
                          Selected: {codeFile.name}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    {submitError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!codeFile || submitting}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {submitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                  </form>

                  {/* Problem Stats */}
                  <div className="mt-8 pt-6 border-t border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Problem Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Test Cases:</span>
                        <span className="text-white font-medium">
                          {problem.input.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Type:</span>
                        <span className="text-white font-medium">
                          {problem.contest ? 'Contest' : 'Practice'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Created:</span>
                        <span className="text-white font-medium">
                          {new Date(problem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
