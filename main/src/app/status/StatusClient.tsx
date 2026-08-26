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

// The services probed, declared outside the component so the 30 s poller has
// nothing to close over. The effect used to map over the `judges` state with
// an empty dependency array, capturing the render-0 array forever — correct
// only by accident, because that array has exactly one element.
const SERVICES: { name: string; endpoint: string }[] = [
  { name: 'Primary Judge', endpoint: '/api/status/health' },
];

export default function StatusClient() {
  const [judges, setJudges] = useState<JudgeStatus[]>(
    SERVICES.map((s) => ({ name: s.name, status: 'loading' as const })),
  );

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      setJudges((prev) =>
        prev.map((j) => ({ ...j, status: 'loading' as const }))
      );

      const results = await Promise.all(
        SERVICES.map(async (service): Promise<JudgeStatus> => {
          const start = Date.now();
          try {
            const res = await fetch(service.endpoint, { cache: 'no-store' });
            const latency = Date.now() - start;
            if (res.ok) {
              return { name: service.name, status: 'online', latency };
            }
            return { name: service.name, status: 'offline', latency: undefined };
          } catch {
            return { name: service.name, status: 'offline', latency: undefined };
          }
        })
      );
      if (!cancelled) setJudges(results);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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
