'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Contest {
  id: string;
  name: string;
}

export default function CreateProblemPage() {
  const { user, signOut, session } = useAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    contest: ''
  });
  // Generator-based testcases
  const [generatorFile, setGeneratorFile] = useState<File | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedInput, setGeneratedInput] = useState<string[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string[] | null>(null);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
          ...formData,
          input: generatedInput,
          output: generatedOutput,
          contest: formData.contest || null
        })
      });

      const json = await res.json();
      
      if (res.ok) {
        setSuccess('Problem created successfully!');
        setFormData({ name: '', content: '', contest: '' });
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

        {/* Top Navigation Bar */}
        <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
          <Logo size="md" className="cursor-pointer" />
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
              Admin: {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="flex">
          <AdminSidebar />

          {/* Main Content */}
          <main className="flex-1 p-8">
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
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Create New Problem
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Add a new problem to a contest or create a standalone problem
                </p>
              </div>
            </LoadingState>

            {/* Create Problem Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Problem Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
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
                  <label htmlFor="contest" className="block text-sm font-medium text-white mb-2">
                    Contest (Optional)
                  </label>
                  <select
                    id="contest"
                    name="contest"
                    value={formData.contest}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="">Standalone Problem</option>
                    {contests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-sm mt-1">
                    Leave empty for standalone problems, or select a contest to add this problem to
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Generator (C++) *</label>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      type="file"
                      accept=".cpp"
                      onChange={handleGeneratorSelect}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
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
                  <p className="text-gray-400 text-sm mt-1">Upload a C++ generator. It must print input JSON to stdout and output JSON to stderr.</p>

                  {genError && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 whitespace-pre-wrap break-words">{genError}</p>
                    </div>
                  )}

                  {generatedInput && generatedOutput && (
                    <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="text-gray-300 text-sm">Generated cases: {generatedInput.length}</div>
                      <div className="text-gray-400 text-xs mt-1">First input sample: {generatedInput[0]}</div>
                      <div className="text-gray-400 text-xs">First output sample: {generatedOutput[0]}</div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
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
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
      </AdminGuard>
    </AuthGuard>
  );
}
