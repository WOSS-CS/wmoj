'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';

export default function ManagerHelpClient() {
  const generatorExample = String.raw`// generator.cpp for a problem where you add two integers together.

#include <bits/stdc++.h>

using namespace std;

string json_escape(const string &s) {
    string out;
    out.reserve(s.size());
    for (char c : s) {
        if (c == '\\') out += "\\\\";
        else if (c == '"') out += "\\\"";
        else if (c == '\b') out += "\\b";
        else if (c == '\f') out += "\\f";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else out += c;
    }
    return out;
}

int main() {
    const int N = 50;
    std::mt19937_64 rng(123456789); // fixed seed for reproducibility
    std::uniform_int_distribution<long long> dist(-1000000000LL, 1000000000LL);

    vector<string> inputs;
    vector<string> outputs;
    inputs.reserve(N);
    outputs.reserve(N);

    for (int i = 0; i < N; ++i) {
        long long a = dist(rng);
        long long b = dist(rng);
        long long s = a + b;

        string in = to_string(a) + " " + to_string(b);
        string out = to_string(s);

        inputs.push_back(in);
        outputs.push_back(out);
    }

    // Print input JSON array to stdout
    cout << "[";
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i) cout << ", ";
        cout << "\"" << json_escape(inputs[i]) << "\"";
    }
    cout << "]" << endl;

    // Print output JSON array to stderr
    cerr << "[";
    for (size_t i = 0; i < outputs.size(); ++i) {
        if (i) cerr << ", ";
        cerr << "\"" << json_escape(outputs[i]) << "\"";
    }
    cerr << "]" << endl;

    return 0;
}`

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Manager Help & Operations Guide</h1>
            <p className="text-base text-text-muted mt-1">Everything you need to manage WMOJ.</p>
          </div>

          <div className="space-y-8 text-base">
            <nav className="glass-panel p-4">
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Contents</h2>
              <ul className="space-y-1">
                {[
                  { href: '#manage-problems', label: 'Managing Problems' },
                  { href: '#contests', label: 'Contests (Create & Manage)' },
                  { href: '#judge', label: 'Judge Service' },
                  { href: '#timers', label: 'Contest Timers & Participation' },
                  { href: '#generators', label: 'Test Case Generators (C++)' },
                  { href: '#generator-guide', label: 'Detailed Generator Guide' },
                  { href: '#subtasks', label: 'Sub-tasks & Constraint Groups' },
                  { href: '#troubleshooting', label: 'Troubleshooting' },
                ].map(item => (
                  <li key={item.href}>
                    <a href={item.href} className="text-brand-primary hover:text-brand-secondary">{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <section id="manage-problems" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Managing Problems</h2>
              <p className="text-text-muted">Go to <Link href="/manager/problems/manage" className="text-brand-primary hover:underline">Manage Problems</Link> to review, edit, or deactivate problems.</p>
              <p className="text-text-muted"><strong className="text-foreground">Approving Problems: </strong>When admins create problems (and contests), they are inactive by default until a manager activates it.</p>
            </section>

            <section id="contests" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Contests</h2>
              <p className="text-text-muted">Create contests via <Link href="/manager/contests/create" className="text-brand-primary hover:underline">Create Contest</Link> and manage them in <Link href="/manager/contests/manage" className="text-brand-primary hover:underline">Manage Contests</Link>. Manage Contests is also where you approve admin-submitted contests; those remain pending until you review them, so check the queue regularly.</p>
              <p className="text-text-muted">When a problem is part of a contest, it is accessible as a standalone problem if the contest is virtual. Also, a problem can belong to multiple contests at once, subject to these rules:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><strong className="text-foreground">Rated ongoing/upcoming contests lock their problems.</strong> A problem in such a contest cannot be added to any other contest.</li>
                <li><strong className="text-foreground">Rated contests require standalone problems.</strong> When creating or editing a rated contest, you can only add problems not already in another contest.</li>
                <li><strong className="text-foreground">Unrated contests share freely.</strong> Problems in virtual, inactive, or other unrated contests can be added to any unrated contest.</li>
              </ul>
            </section>

            <section id="judge" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Judge Service</h2>
              <p className="text-text-muted">Compilation and grading run on a separate judge service. The app sends the language, the submitted source, and the problem&apos;s stored test data, then records the verdict that comes back — the judge never writes to the database itself. Its current state is on the <Link href="/status" className="text-brand-primary hover:underline">Status</Link> page.</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><strong className="text-foreground">Supported languages:</strong> Python 3, PyPy 3, and C++14, C++17, C++20 and C++23. Nothing else — do not promise a language the submit dropdown does not offer.</li>
                <li><strong className="text-foreground">Submissions are stored only for active problems.</strong> Your own test submissions against a pending problem run and render normally but are never recorded, so they never move anyone&apos;s points.</li>
                <li><strong className="text-foreground">A compile error is a verdict, not an outage.</strong> It comes back as <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">CE</code> with the compiler output attached.</li>
                <li><strong className="text-foreground">A broken custom checker is a configuration fault.</strong> The submission is rejected outright and nothing is stored — it is never counted against the student. Fix the checker, then ask them to resubmit.</li>
              </ul>
            </section>

            <section id="timers" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Contest Timers &amp; Participation</h2>
              <p className="text-text-muted">A contest&apos;s status is never stored — it is computed from its start/end window every time it is shown. Leave both blank and the contest is <strong className="text-foreground">virtual</strong>: open indefinitely for practice. Set both and it is <strong className="text-foreground">upcoming</strong> before the start, <strong className="text-foreground">ongoing</strong> between the two, and virtual afterwards. Setting one without the other is rejected.</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><strong className="text-foreground">Duration is per participant, not per contest.</strong> Joining starts that user&apos;s own countdown of Duration minutes; the start/end window only decides when joining is possible at all.</li>
                <li><strong className="text-foreground">Expiry is destructive.</strong> When a participant&apos;s countdown runs out they are removed from the contest and their timer is deleted, and the moment they left is stamped on the permanent join history.</li>
                <li><strong className="text-foreground">Join history is permanent.</strong> A contest anyone has ever joined cannot be deleted — that record is the proof of who competed. Deactivate it instead.</li>
                <li>A contest&apos;s creator cannot join their own contest.</li>
              </ul>
            </section>

            <section id="generators" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Test Case Generators (C++)</h2>
              <p className="text-text-muted">Upload a single <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">.cpp</code> on the Create Problem page and click <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">Generate Test Cases</code>. The judge compiles and runs it. It must:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li>Write the input JSON array to <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">stdout</code>.</li>
                <li>Write the output JSON array to <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">stderr</code>.</li>
                <li>Both arrays must be the same length and contain only strings.</li>
              </ul>
              <p className="text-text-muted">Example outputs for an addition problem:</p>
              <pre className="bg-surface-1 border border-border text-text-muted p-3 rounded-lg overflow-x-auto text-sm font-mono"><code>{`stdout: ["6 7", "10 5", "3 3"]
stderr: ["13", "15", "6"]`}</code></pre>
              <p className="text-text-muted">Compile, runtime, and JSON errors are reported on the page so you can fix and reupload.</p>
              <p className="text-text-muted">The judge caps both individual case size and total volume. If the output is too large to upload, reduce individual case size, reduce the number of cases, or both, but keep the essentials (samples, edge cases, scaling cases) so the problem still functions correctly and admits only the intended solution. This especially matters for problems imported from DMOJ, where the original test data is what made the problem hard.</p>
            </section>

            <section id="generator-guide" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Test Case Generator Guidelines</h2>
              <p className="text-text-muted">Every generator must output <strong className="text-foreground">verbatim JSON arrays</strong>:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">stdout</code>: JSON array of input strings, one entry per test case.</li>
                <li><code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">stderr</code>: JSON array of output strings in the same order.</li>
                <li>Both must be the same length, contain only strings, and be valid JSON.</li>
              </ul>
              <p className="text-text-muted">Recommended structure:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1 text-text-muted">
                <li>Include headers and a helper like <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">json_escape</code> to escape quotes, newlines, and backslashes.</li>
                <li>Seed an RNG (fixed seed preferred) for deterministic inputs/outputs.</li>
                <li>Store generated strings in two <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">std::vector&lt;std::string&gt;</code> containers.</li>
                <li>Print valid JSON arrays via <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">std::cout</code> and <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">std::cerr</code>.</li>
              </ol>
              <p className="text-text-muted">Example:</p>
              <pre className="bg-surface-1 border border-border text-text-muted p-3 rounded-lg overflow-x-auto text-sm font-mono"><code>{generatorExample}</code></pre>
            </section>

            <section id="subtasks" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Sub-tasks & Constraint Groups</h2>
              <p className="text-text-muted">Some problems award partial credit through <strong className="text-foreground">sub-tasks</strong>: groups of test cases that each operate under a specific set of constraints. Common in competitions like the CCC, where different groups correspond to different difficulty tiers and point values. An easy sub-task might restrict input to 0 ≤ N ≤ 100, while a harder one allows 0 ≤ N ≤ 10<sup>9</sup>.</p>
              <p className="text-text-muted"><strong className="text-foreground">This is entirely controlled by your generator.</strong> The platform has no separate sub-task configuration. You write <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">generator.cpp</code> to produce the right number of cases for each sub-task with inputs that respect the corresponding constraints. In practice, produce them in batches: the first 10 with small N for Sub-task 1, the next 10 with medium N for Sub-task 2, and so on. State which cases belong to which sub-task in the problem description.</p>
            </section>

            <section id="troubleshooting" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Troubleshooting</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li>Generator compile error: verify C++17 compatibility and includes.</li>
                <li>Invalid JSON: ensure stdout and stderr each contain a single JSON array of strings.</li>
                <li>Judge unavailable: check judge service health and URL configuration.</li>
                <li>Forbidden manager pages: confirm your account is in the managers table.</li>
                <li>The judge caps both individual case size and total volume. If the output is too large to upload, reduce individual case size, reduce the number of cases, or both, but keep the essentials (samples, edge cases, scaling cases) so the problem still functions correctly and admits only the intended solution. This especially matters for problems imported from DMOJ, where the original test data is what made the problem hard.</li>
              </ul>
            </section>
          </div>
        </div>
      </ManagerGuard>
    </AuthGuard>
  );
}
