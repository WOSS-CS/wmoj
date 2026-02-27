'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
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
    const { session } = useAuth();
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
                <div className="w-full">
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <Link href="/admin/problems/manage" className="text-text-muted hover:text-foreground transition-colors">
                                ← Back to Problems
                            </Link>
                        </div>
                        <h1 className="text-4xl font-bold text-foreground mb-4 relative">
                            Submissions: {problemName}
                            <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full animate-pulse" />
                        </h1>
                        <p className="text-text-muted text-lg">View and manage user submissions for this problem.</p>
                    </div>

                    {error && <div className="text-red-400 mb-4">{error}</div>}

                    {loading ? (
                        <div className="animate-pulse text-text-muted">Loading submissions...</div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-12 text-text-muted">No submissions found for this problem.</div>
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
                                                <span className="font-medium text-foreground">{r.username}</span>
                                                <span className="text-xs text-text-muted">{r.email}</span>
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
                                                <span className={`px-2 py-1 rounded text-xs border ${passed ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
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
                                            <span className="text-text-muted">
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
                                        render: (r) => <span className="uppercase text-xs font-mono bg-surface-2 px-2 py-1 rounded">{r.language}</span>
                                    },
                                    {
                                        key: 'created_at',
                                        header: 'Date',
                                        className: 'w-2/12',
                                        sortable: true,
                                        sortAccessor: (r) => new Date(r.created_at).getTime(),
                                        render: (r) => <span className="text-text-muted text-sm">{new Date(r.created_at).toLocaleString()}</span>,
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
                </div>

                {/* View Code Modal */}
                {selectedSubmission && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-5xl bg-surface-1 border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2 rounded-t-xl">
                                <div>
                                    <h2 className="text-xl font-bold tracking-wide text-foreground">Submission Details</h2>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        by {selectedSubmission.username} • {new Date(selectedSubmission.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="text-text-muted hover:text-foreground transition text-2xl">×</button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                {/* Results Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-surface-2 p-4 rounded-lg border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Status</div>
                                        <div className={`text-xl font-bold ${selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'text-green-400' : 'text-red-400'}`}>
                                            {selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'Accepted' : 'Rejected'}
                                        </div>
                                    </div>
                                    <div className="bg-surface-2 p-4 rounded-lg border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
                                        <div className="text-xl font-bold text-foreground">
                                            {selectedSubmission.summary.passed} / {selectedSubmission.summary.total}
                                        </div>
                                    </div>
                                    <div className="bg-surface-2 p-4 rounded-lg border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
                                        <div className="text-xl font-bold text-foreground uppercase">{selectedSubmission.language}</div>
                                    </div>
                                </div>

                                {/* Source Code */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Source Code</h3>
                                    <div className="rounded-lg overflow-hidden border border-border text-sm">
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
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Test Case Results</h3>
                                    <div className="space-y-2">
                                        {selectedSubmission.results && selectedSubmission.results.map((r, i) => (
                                            <div key={i} className={`p-3 rounded border ${r.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-medium ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                        Case #{i + 1}: {r.passed ? 'Passed' : 'Failed'}
                                                    </span>
                                                    <span className="text-xs text-text-muted">
                                                        Exit: {r.exitCode ?? 'N/A'} {r.timedOut ? '(Timed Out)' : ''}
                                                    </span>
                                                </div>
                                                {!r.passed && (r.expected || r.received) && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                                                        <div>
                                                            <div className="text-text-muted mb-1">Expected:</div>
                                                            <pre className="bg-surface-1 p-2 rounded overflow-x-auto text-text-muted border border-border">{r.expected}</pre>
                                                        </div>
                                                        <div>
                                                            <div className="text-text-muted mb-1">Received:</div>
                                                            <pre className="bg-surface-1 p-2 rounded overflow-x-auto text-red-300 border border-border">{r.received}</pre>
                                                        </div>
                                                        {r.stderr && (
                                                            <div className="col-span-2">
                                                                <div className="text-text-muted mb-1">Stderr:</div>
                                                                <pre className="bg-surface-1 p-2 rounded overflow-x-auto text-yellow-300 border border-border">{r.stderr}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="px-6 py-4 border-t border-border flex justify-end bg-surface-2 rounded-b-xl">
                                <button onClick={closeModal} className="px-4 py-2 rounded-md bg-surface-3 hover:bg-surface-4 transition text-sm font-medium text-foreground">Close</button>
                            </div>

                        </div>
                    </div>
                )}

            </AdminGuard>
        </AuthGuard>
    );
}
