'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { Logo } from '@/components/Logo';
import { AdminSidebar } from '@/components/AdminSidebar';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Submission {
    id: string;
    user_id: string;
    username: string;
    email: string;
    language: string;
    code: string;
    results: Array<{
        index: number;
        passed: boolean;
        stdout: string;
        stderr: string;
        exitCode: number;
        timedOut: boolean;
        expected: string;
        received: string;
    }>;
    summary: {
        total: number;
        passed: number;
        failed: number;
    };
    created_at: string;
}

export default function ProblemSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { session, user, signOut } = useAuth();
    const router = useRouter();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [problemName, setProblemName] = useState<string>('Problem');
    const token = session?.access_token;

    // Unwrap params using React.use()
    const { id } = use(params);

    const fetchSubmissions = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/problems/${id}/submissions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load submissions');

            setSubmissions(data.submissions || []);
            if (data.problem_name) setProblemName(data.problem_name);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error fetching submissions');
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        if (token) {
            fetchSubmissions();
        }
    }, [token, fetchSubmissions]);

    const deleteSubmission = async (submissionId: string) => {
        if (!confirm('Delete this submission? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/submissions/${submissionId}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');

            setSubmissions(prev => prev.filter(s => s.id !== submissionId));
            if (selectedSubmission?.id === submissionId) {
                setSelectedSubmission(null);
            }
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Failed to delete submission');
        }
    };

    const closeModal = () => setSelectedSubmission(null);

    return (
        <AuthGuard requireAuth allowAuthenticated>
            <AdminGuard>
                <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
                    {/* Navbar */}
                    <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
                        <Logo size="md" className="cursor-pointer" />
                        <div className="flex items-center gap-4">
                            <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
                                Admin: {user?.user_metadata?.username || user?.email}
                            </span>
                            <button
                                onClick={async () => { await signOut(); }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                            >
                                Sign Out
                            </button>
                        </div>
                    </nav>

                    <div className="flex">
                        <AdminSidebar />
                        <main className="flex-1 p-8">
                            <div className="mb-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <Link href="/admin/problems/manage" className="text-gray-400 hover:text-white transition-colors">
                                        ← Back to Problems
                                    </Link>
                                </div>
                                <h1 className="text-4xl font-bold text-white mb-4 relative">
                                    Submissions: {problemName}
                                    <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse" />
                                </h1>
                                <p className="text-gray-300 text-lg">View and manage user submissions for this problem.</p>
                            </div>

                            {error && <div className="text-red-400 mb-4">{error}</div>}

                            {loading ? (
                                <div className="animate-pulse text-gray-400">Loading submissions...</div>
                            ) : submissions.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No submissions found for this problem.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    {(() => {
                                        type Row = Submission;
                                        const columns: Array<DataTableColumn<Row>> = [
                                            {
                                                key: 'user',
                                                header: 'User',
                                                className: 'w-2/12',
                                                sortable: true,
                                                sortAccessor: (r) => (r.username || r.email).toLowerCase(),
                                                render: (r) => (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white">{r.username}</span>
                                                        <span className="text-xs text-gray-400">{r.email}</span>
                                                    </div>
                                                ),
                                            },
                                            {
                                                key: 'status',
                                                header: 'Status',
                                                className: 'w-2/12',
                                                render: (r) => {
                                                    const passed = r.summary?.passed === r.summary?.total && r.summary?.total > 0;
                                                    return (
                                                        <span className={`px-2 py-1 rounded text-xs border ${passed ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-red-400/10 text-red-400 border-red-400/30'}`}>
                                                            {passed ? 'Accepted' : 'Rejected'}
                                                        </span>
                                                    );
                                                },
                                            },
                                            {
                                                key: 'score',
                                                header: 'Score',
                                                className: 'w-2/12',
                                                render: (r) => (
                                                    <span className="text-gray-300">
                                                        {r.summary?.passed ?? 0} / {r.summary?.total ?? 0}
                                                    </span>
                                                ),
                                            },
                                            {
                                                key: 'language',
                                                header: 'Language',
                                                className: 'w-2/12',
                                                sortable: true,
                                                sortAccessor: (r) => r.language,
                                                render: (r) => <span className="uppercase text-xs font-mono bg-white/10 px-2 py-1 rounded">{r.language}</span>
                                            },
                                            {
                                                key: 'created_at',
                                                header: 'Date',
                                                className: 'w-2/12',
                                                sortable: true,
                                                sortAccessor: (r) => new Date(r.created_at).getTime(),
                                                render: (r) => <span className="text-gray-400 text-sm">{new Date(r.created_at).toLocaleString()}</span>,
                                            },
                                            {
                                                key: 'actions',
                                                header: 'Actions',
                                                className: 'w-2/12',
                                                render: (r) => (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setSelectedSubmission(r)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-blue-600 hover:bg-blue-700 text-white text-sm">View Code</button>
                                                        <button onClick={() => deleteSubmission(r.id)} className="px-3 py-2 rounded-lg transition-colors duration-300 bg-red-600 hover:bg-red-700 text-white text-sm">Delete</button>
                                                    </div>
                                                ),
                                            },
                                        ];
                                        return (
                                            <DataTable<Row>
                                                columns={columns}
                                                rows={submissions}
                                                rowKey={(r) => r.id}
                                                headerVariant="purple"
                                            />
                                        );
                                    })()}
                                </div>
                            )}
                        </main>
                    </div>

                    {/* View Code Modal */}
                    {selectedSubmission && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="w-full max-w-5xl bg-gray-900 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-xl">
                                    <div>
                                        <h2 className="text-xl font-bold tracking-wide">Submission Details</h2>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            by {selectedSubmission.username} • {new Date(selectedSubmission.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <button onClick={closeModal} className="text-gray-400 hover:text-white transition text-2xl">×</button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                    {/* Results Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                            <div className="text-gray-400 text-xs uppercase tracking-wider">Status</div>
                                            <div className={`text-xl font-bold ${selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'text-green-400' : 'text-red-400'}`}>
                                                {selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'Accepted' : 'Rejected'}
                                            </div>
                                        </div>
                                        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                            <div className="text-gray-400 text-xs uppercase tracking-wider">Score</div>
                                            <div className="text-xl font-bold text-white">
                                                {selectedSubmission.summary.passed} / {selectedSubmission.summary.total}
                                            </div>
                                        </div>
                                        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                            <div className="text-gray-400 text-xs uppercase tracking-wider">Language</div>
                                            <div className="text-xl font-bold text-white uppercase">{selectedSubmission.language}</div>
                                        </div>
                                    </div>

                                    {/* Source Code */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">Source Code</h3>
                                        <div className="rounded-lg overflow-hidden border border-white/10 text-sm">
                                            <SyntaxHighlighter
                                                language={selectedSubmission.language}
                                                style={atomDark}
                                                customStyle={{ margin: 0, borderRadius: 0, maxHeight: '500px' }}
                                                showLineNumbers
                                            >
                                                {selectedSubmission.code}
                                            </SyntaxHighlighter>
                                        </div>
                                    </div>

                                    {/* Detailed Results */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">Test Case Results</h3>
                                        <div className="space-y-2">
                                            {selectedSubmission.results && selectedSubmission.results.map((r, i) => (
                                                <div key={i} className={`p-3 rounded border ${r.passed ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-medium ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                            Case #{i + 1}: {r.passed ? 'Passed' : 'Failed'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Exit: {r.exitCode ?? 'N/A'} {r.timedOut ? '(Timed Out)' : ''}
                                                        </span>
                                                    </div>
                                                    {!r.passed && (r.expected || r.received) && (
                                                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                                                            <div>
                                                                <div className="text-gray-500 mb-1">Expected:</div>
                                                                <pre className="bg-black/50 p-2 rounded overflow-x-auto text-gray-300">{r.expected}</pre>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-500 mb-1">Received:</div>
                                                                <pre className="bg-black/50 p-2 rounded overflow-x-auto text-red-300">{r.received}</pre>
                                                            </div>
                                                            {r.stderr && (
                                                                <div className="col-span-2">
                                                                    <div className="text-gray-500 mb-1">Stderr:</div>
                                                                    <pre className="bg-black/50 p-2 rounded overflow-x-auto text-yellow-300">{r.stderr}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                <div className="px-6 py-4 border-t border-white/10 flex justify-end bg-gray-900/80 rounded-b-xl">
                                    <button onClick={closeModal} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm font-medium">Close</button>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </AdminGuard>
        </AuthGuard>
    );
}
