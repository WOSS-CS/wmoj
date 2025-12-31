'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { LoadingState, SkeletonText } from '@/components/LoadingStates';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { AdminSidebar } from '@/components/AdminSidebar';
import DataTable, { type DataTableColumn } from '@/components/DataTable';

const MarkdownEditor = dynamic(() => import('@/components/MarkdownEditor').then(m => m.MarkdownEditor), { ssr: false });
const MarkdownRenderer = dynamic(() => import('@/components/MarkdownRenderer').then(m => m.MarkdownRenderer), { ssr: false });

export default function CreateContestPage() {
  const { user, signOut, session } = useAuth();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    length: 60
  });

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'length' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/contests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (res.ok) {
        setSuccess('Contest created successfully!');
        setFormData({ name: '', description: '', length: 60 });
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 2000);
      } else {
        setError(json.error || 'Failed to create contest');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
          {/* Enhanced Animated Background */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Solid shapes instead of glow */}
            <div
              className="absolute w-96 h-96 bg-[#1a1a1a] rounded-full transition-all duration-500 ease-out"
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
          <nav className="relative z-10 flex justify-between items-center p-4 bg-[#0a0a0a] border-b border-[#262626]">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-red-400 border border-red-900 rounded-lg bg-[#450a0a]">
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
                    Create New Contest
                    <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse" />
                  </h1>
                  <p className="text-gray-300 text-lg">
                    Create a new competitive programming contest with custom settings
                  </p>
                </div>
              </LoadingState>

              {/* Create Contest Form */}
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                      Contest Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[#111111] border border-[#262626] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter contest name"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                      Description (Markdown) *
                    </label>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2 min-h-[360px]">
                        <MarkdownEditor
                          value={formData.description}
                          onChange={(value: string) => setFormData(prev => ({ ...prev, description: value }))}
                          placeholder="Write contest description in Markdown..."
                          height={360}
                        />
                      </div>
                      <div className="p-4 overflow-auto max-h-[480px]">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> Live Preview
                        </div>
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                          <MarkdownRenderer content={formData.description || '*Nothing yet...*'} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="length" className="block text-sm font-medium text-white mb-2">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      id="length"
                      name="length"
                      value={formData.length}
                      onChange={handleChange}
                      required
                      min="1"
                      max="1440"
                      className="w-full px-4 py-3 bg-[#111111] border border-[#262626] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter duration in minutes"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      Contest duration in minutes (1-1440 minutes)
                    </p>
                  </div>

                  {/* Summary Preview Table */}
                  <div className="mt-4">
                    {(() => {
                      type Row = { name: string; description: string; length: number; active: boolean };
                      const columns: Array<DataTableColumn<Row>> = [
                        { key: 'name', header: 'Name', className: 'w-[25%]', render: (r) => <span className="text-white font-medium">{r.name || '-'}</span> },
                        { key: 'description', header: 'Description (preview)', className: 'w-[50%]', render: (r) => <div className="text-gray-300 text-sm line-clamp-2 break-words">{r.description || '-'}</div> },
                        { key: 'length', header: 'Length (min)', className: 'w-[15%]', render: (r) => <span className="text-gray-300">{r.length || 0}</span> },
                        { key: 'active', header: 'Active', className: 'w-[10%]', render: (r) => <span className="px-2 py-0.5 rounded text-xs border bg-[#064e3b] text-green-400 border-green-900">{r.active ? 'Yes' : 'No'}</span> },
                      ];
                      const rows: Row[] = [
                        { name: formData.name, description: formData.description, length: formData.length, active: true },
                      ];
                      return (
                        <DataTable<Row>
                          columns={columns}
                          rows={rows}
                          rowKey={(_r, i) => String(i)}
                          headerVariant="emerald"
                        />
                      );
                    })()}
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
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </div>
                      ) : (
                        'Create Contest'
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
