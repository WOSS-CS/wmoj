'use client';

import { useState, useEffect } from 'react';

// The browser MUST NOT know the judge URL — we route through the Next.js
// proxy at /api/status/health instead. The proxy forwards the health probe
// server-side with the JUDGE_SHARED_SECRET header (server-only env var).
interface JudgeStatus {
  name: string;
  status: 'online' | 'offline' | 'loading';
  latency?: number;
}

export default function StatusClient() {
  const [judges, setJudges] = useState<JudgeStatus[]>([
    {
      name: 'Primary Judge',
      status: 'loading',
    },
  ]);

  useEffect(() => {
    const checkHealth = async () => {
      setJudges((prev) =>
        prev.map((j) => ({ ...j, status: 'loading' as const }))
      );

      const results = await Promise.all(
        judges.map(async (judge) => {
          const start = Date.now();
          try {
            const res = await fetch(`/api/status/health`, { cache: 'no-store' });
            const latency = Date.now() - start;
            if (res.ok) {
              return { ...judge, status: 'online' as const, latency };
            }
            return { ...judge, status: 'offline' as const, latency: undefined };
          } catch {
            return { ...judge, status: 'offline' as const, latency: undefined };
          }
        })
      );
      setJudges(results);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">System Status</h1>
        <p className="text-sm text-text-muted mt-1">Current health of WMOJ services</p>
        <hr className="mt-3 border-border" />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Service
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted text-right">
                  Latency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {judges.map((judge) => (
                <tr key={judge.name} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {judge.name}
                  </td>
                  <td className="px-4 py-3">
                    {judge.status === 'loading' ? (
                      <span className="inline-flex items-center gap-2 text-sm text-text-muted">
                        <span className="w-2 h-2 rounded-full bg-text-muted animate-pulse" />
                        Checking...
                      </span>
                    ) : judge.status === 'online' ? (
                      <span className="inline-flex items-center gap-2 text-sm text-success">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm text-error">
                        <span className="w-2 h-2 rounded-full bg-error" />
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-text-muted text-right">
                    {judge.status === 'online' && judge.latency != null
                      ? `${judge.latency}ms`
                      : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-text-muted">Auto-refreshes every 30 seconds.</p>
    </div>
  );
}
