'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingState, CardLoading, SkeletonText, CodeEditorLoading } from '@/components/LoadingStates';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Problem } from '@/types/problem';
import { supabase } from '@/lib/supabase';
import { checkContestParticipation } from '@/utils/participationCheck';

export default function ProblemPage() {
  const routeParams = useParams<{ id: string }>();
  const problemId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'results' | 'stats'>('description');
  const [codePreview, setCodePreview] = useState<string>('');
  const [showCodePreview, setShowCodePreview] = useState(false);
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
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
      // Preview code content
      file.text().then(content => {
        setCodePreview(content);
        setShowCodePreview(true);
      });
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
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Mouse-following glow */}
          <div 
            className="absolute w-96 h-96 bg-green-400/5 rounded-full blur-3xl transition-all duration-500 ease-out"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
            }}
          />
          
          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-20 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
          
          {/* Circuit Pattern with animations */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 left-20 w-32 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse"></div>
            <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-20 left-52 w-0.5 h-16 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-36 left-52 w-24 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-40 right-20 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-60 right-20 w-40 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
          <Link href="/" className="text-3xl font-bold text-white group cursor-pointer">
            <span className="text-green-400 transition-all duration-300 group-hover:scale-110 inline-block">W</span>
            <span className="text-white transition-all duration-300 group-hover:scale-110 inline-block" style={{ animationDelay: '0.1s' }}>MOJ</span>
          </Link>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/problems')}
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25"
            >
              Back to Problems
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25"
            >
              Back to Dashboard
            </button>
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-all duration-300 transform hover:scale-105">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Enhanced Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Enhanced Loading State */}
          <LoadingState 
            isLoading={loading || !accessChecked}
            skeleton={
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <SkeletonText lines={3} width="80%" />
                    <div className="mt-6 space-y-4">
                      <SkeletonText lines={5} />
                      <SkeletonText lines={3} width="60%" />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <SkeletonText lines={2} width="60%" />
                    <div className="mt-4 space-y-3">
                      <SkeletonText lines={1} width="40%" />
                      <SkeletonText lines={1} width="60%" />
                    </div>
                  </div>
                  <CodeEditorLoading lines={8} />
                </div>
              </div>
            }
          >
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </LoadingState>

          {/* Enhanced Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8 backdrop-blur-sm">
              <p className="text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => router.push('/problems')}
                className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25"
              >
                Back to Problems
              </button>
            </div>
          )}

          {/* Enhanced Problem Content */}
          {!loading && !error && problem && (
            <div className={`grid lg:grid-cols-3 gap-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Enhanced Problem Description */}
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg hover:shadow-green-400/10">
                  <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-white relative">
                      {problem.name}
                      <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                    </h1>
                    <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm animate-pulse">
                      {problem.contest ? 'Contest Problem' : 'Standalone'}
                    </span>
                  </div>
                  
                  {/* Tab Navigation */}
                  <div className="flex gap-2 mb-6">
                    {[
                      { id: 'description', label: 'Description', icon: '📝' },
                      { id: 'results', label: 'Results', icon: '📊' },
                      { id: 'stats', label: 'Stats', icon: '📈' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                          activeTab === tab.id
                            ? 'bg-green-400/20 text-green-400 border border-green-400/50'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Tab Content */}
                  <div className="transition-all duration-300">
                    {activeTab === 'description' && (
                      <div className="prose prose-invert max-w-none">
                        <MarkdownRenderer content={problem.content} />
                      </div>
                    )}
                    
                    {activeTab === 'results' && (
                      <div className="space-y-4">
                        {summary && results ? (
                          <div>
                            <div className="mb-4 flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-sm ${summary.failed === 0 ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>
                                {summary.failed === 0 ? 'All Passed' : 'Some Failed'}
                              </span>
                              <span className="text-gray-300">Score:</span>
                              <span className="text-white font-semibold">{summary.passed}/{summary.total}</span>
                            </div>
                            <div className="space-y-3">
                              {results.map((r) => (
                                <div key={r.index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]">
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
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-4">📊</div>
                            <p className="text-gray-400">No submission results yet</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'stats' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="text-2xl font-bold text-green-400">{problem.input.length}</div>
                            <div className="text-sm text-gray-400">Test Cases</div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="text-2xl font-bold text-blue-400">{problem.contest ? 'Contest' : 'Practice'}</div>
                            <div className="text-sm text-gray-400">Type</div>
                          </div>
                        </div>
                        {bestSummary && (
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Best Score</span>
                              <span className={`px-2 py-1 rounded text-xs ${bestSummary.failed === 0 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>
                                {bestSummary.failed === 0 ? 'Perfect' : 'Partial'}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-white">{bestSummary.passed}/{bestSummary.total}</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(bestSummary.passed / bestSummary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Code Submission Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-8 hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-green-400/10">
                  <h2 className="text-xl font-semibold text-white mb-6 relative">
                    Submit Solution
                    <div className="absolute -bottom-2 left-0 w-20 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Enhanced Language Selection */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Programming Language
                      </label>
                      <div className="relative">
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25 appearance-none cursor-pointer"
                        >
                          {languages.map((lang) => (
                            <option key={lang.value} value={lang.value} className="bg-gray-800">
                              {lang.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced File Upload */}
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Upload Code File
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept=".py,.cpp,.java,.c,.h"
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 focus:outline-none focus:border-green-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25"
                        />
                      </div>
                      {codeFile && (
                        <div className="mt-2 p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
                          <p className="text-sm text-green-400 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Selected: {codeFile.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowCodePreview(!showCodePreview)}
                            className="mt-2 text-xs text-green-400 hover:text-green-300 transition-colors"
                          >
                            {showCodePreview ? 'Hide' : 'Show'} Code Preview
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Code Preview Modal */}
                    {showCodePreview && codePreview && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Code Preview</h3>
                            <button
                              type="button"
                              onClick={() => setShowCodePreview(false)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="bg-black rounded-lg p-4 overflow-auto max-h-96">
                            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{codePreview}</pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Submit Button */}
                    {submitError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg backdrop-blur-sm">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!codeFile || submitting}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <span>Submit Solution</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                  </form>

                  {/* Enhanced Problem Stats */}
                  <div className="mt-8 pt-6 border-t border-white/20">
                    <h3 className="text-lg font-semibold text-white mb-4 relative">
                      Problem Information
                      <div className="absolute -bottom-2 left-0 w-16 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                    </h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Test Cases:</span>
                          <span className="text-green-400 font-bold text-lg">
                            {problem.input.length}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Type:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            problem.contest 
                              ? 'bg-blue-400/20 text-blue-400' 
                              : 'bg-green-400/20 text-green-400'
                          }`}>
                            {problem.contest ? 'Contest' : 'Practice'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Created:</span>
                          <span className="text-white font-medium">
                            {new Date(problem.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {bestSummary && (
                        <div className="p-4 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-lg border border-green-400/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-300">Best Score</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              bestSummary.failed === 0 
                                ? 'bg-green-400/20 text-green-400' 
                                : 'bg-yellow-400/20 text-yellow-400'
                            }`}>
                              {bestSummary.failed === 0 ? 'Perfect' : 'Partial'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-white mb-2">
                            {bestSummary.passed}/{bestSummary.total}
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(bestSummary.passed / bestSummary.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
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
