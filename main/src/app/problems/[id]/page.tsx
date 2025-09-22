'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Problem } from '@/types/problem';

interface ProblemPageProps {
  params: {
    id: string;
  };
}

export default function ProblemPage({ params }: ProblemPageProps) {
  const { user, signOut } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProblem(params.id);
    }
  }, [params.id]);

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
    setSubmitting(true);
    
    // Placeholder for future submission logic
    setTimeout(() => {
      setSubmitting(false);
      alert('Submission functionality will be implemented soon!');
    }, 1000);
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
        <div className="absolute inset-0 opacity-5">
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
            <Link
              href="/problems"
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
            >
              Back to Problems
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2 text-white border border-green-400 rounded-lg hover:bg-green-400 hover:text-black transition-all duration-300"
            >
              Dashboard
            </Link>
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
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <p className="text-red-400">{error}</p>
              <Link
                href="/problems"
                className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Problems
              </Link>
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
