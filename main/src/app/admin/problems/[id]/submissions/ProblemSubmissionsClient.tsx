'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from '@/components/ui/Toast';

interface Submission {
    id: string; user_id: string; username: string; email: string; language: string; code: string;
    results: Array<{ index: number; passed: boolean; stdout: string; stderr: string; exitCode: number; timedOut: boolean; expected: string; received: string; }>;
    summary: { total: number; passed: number; failed: number; };
    created_at: string;
}

export default function ProblemSubmissionsClient({ 
    initialSubmissions, 
    initialProblemName 
}: { 
    initialSubmissions: Submission[]; 
    initialProblemName: string;
}) {
    const { session } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const problemName = initialProblemName;
    const token = session?.access_token;

    const deleteSubmission = async (submissionId: string) => {
        if (!confirm('Delete this submission?')) return;
        try {
            const res = await fetch(`/api/admin/submissions/${submissionId}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');
            setSubmissions(prev => prev.filter(s => s.id !== submissionId));
            if (selectedSubmission?.id === submissionId) setSelectedSubmission(null);
            toast.success('Submission deleted successfully');
        } catch (e: unknown) { toast.error('Error', e instanceof Error ? e.message : 'Failed to delete'); }
    };

    type Row = Submission;
    const columns: Array<DataTableColumn<Row>> = [
        {
            key: 'user', header: 'User', className: 'w-2/12', sortable: true, sortAccessor: (r) => (r.username || r.email).toLowerCase(), render: (r) => (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{r.username}</span>
                    <span className="text-xs text-text-muted">{r.email}</span>
                </div>
            )
        },
        {
            key: 'status', header: 'Status', className: 'w-2/12', render: (r) => {
                const passed = r.summary?.passed === r.summary?.total && r.summary?.total > 0;
                return <Badge variant={passed ? 'success' : 'error'}>{passed ? 'Accepted' : 'Rejected'}</Badge>;
            }
        },
        { key: 'score', header: 'Score', className: 'w-2/12', render: (r) => <span className="text-text-muted font-mono">{r.summary?.passed ?? 0}/{r.summary?.total ?? 0}</span> },
        { key: 'language', header: 'Language', className: 'w-1/12', sortable: true, sortAccessor: (r) => r.language, render: (r) => <span className="uppercase text-xs font-mono bg-surface-2 px-2 py-0.5 rounded">{r.language}</span> },
        { key: 'created_at', header: 'Date', className: 'w-2/12', sortable: true, sortAccessor: (r) => new Date(r.created_at).getTime(), render: (r) => <span className="text-text-muted text-sm font-mono">{new Date(r.created_at).toLocaleString()}</span> },
        {
            key: 'actions', header: 'Actions', className: 'w-3/12', render: (r) => (
                <div className="flex gap-1.5">
                    <button onClick={() => setSelectedSubmission(r)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20">View Code</button>
                    <button onClick={() => deleteSubmission(r.id)} className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-error/10 text-error hover:bg-error/20">Delete</button>
                </div>
            )
        },
    ];

    return (
        <AuthGuard requireAuth allowAuthenticated>
            <AdminGuard>
                <div className="w-full space-y-6">
                    <div>
                        <Link href="/admin/problems/manage" className="text-sm text-text-muted hover:text-foreground">← Back to Problems</Link>
                        <h1 className="text-xl font-semibold text-foreground mt-2">Submissions: {problemName}</h1>
                        <p className="text-sm text-text-muted mt-1">View and manage user submissions for this problem.</p>
                    </div>

                    {submissions.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-8">No submissions found for this problem.</p>
                    ) : (
                        <DataTable<Row> columns={columns} rows={submissions} rowKey={(r) => r.id} />
                    )}
                </div>

                {/* View Code Modal */}
                {selectedSubmission && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div className="w-full max-w-4xl bg-surface-1 border border-border rounded-lg flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Submission Details</h2>
                                    <p className="text-xs text-text-muted">by {selectedSubmission.username} • {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setSelectedSubmission(null)} className="text-text-muted hover:text-foreground text-lg">×</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Status</div>
                                        <div className={`text-sm font-semibold mt-1 ${selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'text-success' : 'text-error'}`}>
                                            {selectedSubmission.summary.passed === selectedSubmission.summary.total ? 'Accepted' : 'Rejected'}
                                        </div>
                                    </div>
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
                                        <div className="text-sm font-semibold text-foreground mt-1 font-mono">{selectedSubmission.summary.passed}/{selectedSubmission.summary.total}</div>
                                    </div>
                                    <div className="bg-surface-2 p-3 rounded-md border border-border">
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
                                        <div className="text-sm font-semibold text-foreground mt-1 uppercase">{selectedSubmission.language}</div>
                                    </div>
                                </div>

                                {/* Source Code */}
                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
                                    <div className="rounded-md overflow-hidden border border-border text-sm">
                                        <SyntaxHighlighter
                                            language={selectedSubmission.language}
                                            // @ts-ignore
                                            style={vscDarkPlus}
                                            customStyle={{ margin: 0, borderRadius: 0, maxHeight: '400px' }}
                                            showLineNumbers
                                        >
                                            {selectedSubmission.code}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>

                                {/* Test Case Results */}
                                <div>
                                    <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
                                    <div className="space-y-1.5">
                                        {selectedSubmission.results?.map((r, i) => (
                                            <div key={i} className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-medium text-sm ${r.passed ? 'text-success' : 'text-error'}`}>
                                                        Case #{i + 1}: {r.passed ? 'Passed' : 'Failed'}
                                                    </span>
                                                    <span className="text-xs text-text-muted font-mono">
                                                        Exit: {r.exitCode ?? 'N/A'} {r.timedOut ? '(Timed Out)' : ''}
                                                    </span>
                                                </div>
                                                {!r.passed && (r.expected || r.received) && (
                                                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
                                                        <div>
                                                            <div className="text-text-muted mb-0.5">Expected:</div>
                                                            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-text-muted border border-border">{r.expected}</pre>
                                                        </div>
                                                        <div>
                                                            <div className="text-text-muted mb-0.5">Received:</div>
                                                            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-error border border-border">{r.received}</pre>
                                                        </div>
                                                        {r.stderr && (
                                                            <div className="col-span-2">
                                                                <div className="text-text-muted mb-0.5">Stderr:</div>
                                                                <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-warning border border-border">{r.stderr}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t border-border flex justify-end">
                                <button onClick={() => setSelectedSubmission(null)} className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </AdminGuard>
        </AuthGuard>
    );
}
