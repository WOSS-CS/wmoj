'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';

export default function AdminHelpPage() {
  const generatorExample = String.raw`// generator.cpp for a problem where you add two integers together.

#include <bits/stdc++.h>

using namespace std;

string json_escape(const string &s) {
    string out;
    out.reserve(s.size());
    for (char c : s) {
        if (c == '\\') out += "\\\\";
        else if (c == '\"') out += "\\\"";
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
}`;

  return (
    <AuthGuard requireAuth allowAuthenticated>
      <AdminGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Admin Help & Operations Guide</h1>
            <p className="text-sm text-text-muted mt-1">Everything you need to effectively administer WMOJ.</p>
          </div>

          <div className="space-y-8 text-sm">
            <nav className="glass-panel p-4">
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Contents</h2>
              <ul className="space-y-1">
                {[
                  { href: '#problems', label: 'Creating Problems' },
                  { href: '#generators', label: 'Test Case Generators (C++)' },
                  { href: '#generator-guide', label: 'Detailed Generator Guide' },
                  { href: '#manage-problems', label: 'Managing Problems' },
                  { href: '#contests', label: 'Contests (Create & Manage)' },
                  { href: '#judge', label: 'Judge Service' },
                  { href: '#timers', label: 'Contest Timers & Participation' },
                  { href: '#troubleshooting', label: 'Troubleshooting' },
                ].map(item => (
                  <li key={item.href}>
                    <a href={item.href} className="text-brand-primary hover:text-brand-secondary">{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <section id="problems" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Creating Problems</h2>
              <p className="text-text-muted">Navigate to <Link href="/admin/problems/create" className="text-brand-primary hover:underline">Admin → Create Problem</Link>.</p>
              <p className="text-text-muted">Fill in name, description (Markdown), and optionally choose a contest.</p>
              <p className="text-text-muted">Test cases are generated via a C++ generator (see below). After successful generation, click <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">Create Problem</code> to save.</p>
            </section>

            <section id="generators" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Test Case Generators (C++)</h2>
              <p className="text-text-muted">Upload a single <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.cpp</code> file on the Create Problem page and click <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">Generate Test Cases</code>.</p>
              <p className="text-text-muted">The generator is compiled and executed by the judge. It must:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li>Write the input JSON array to <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">stdout</code>.</li>
                <li>Write the output JSON array to <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">stderr</code>.</li>
                <li>Both arrays must be the same length and contain strings.</li>
              </ul>
              <p className="text-text-muted">Example outputs for an addition problem:</p>
              <pre className="bg-surface-1 border border-border text-text-muted p-3 rounded-lg overflow-x-auto text-xs font-mono"><code>{`stdout: ["6 7", "10 5", "3 3"]
stderr: ["13", "15", "6"]`}</code></pre>
              <p className="text-text-muted">On failure (compile/runtime/JSON), errors appear on the page so you can fix and reupload.</p>
            </section>

            <section id="generator-guide" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Detailed Generator Guide</h2>
              <p className="text-text-muted">Every generator must emit <strong className="text-foreground">verbatim JSON arrays</strong>:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">stdout</code> → JSON array of input strings (one entry per test case).</li>
                <li><code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">stderr</code> → JSON array of output strings in the same order.</li>
                <li>The arrays must be the same length, contain only strings, and be valid JSON.</li>
              </ul>
              <p className="text-text-muted">Recommended structure:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1 text-text-muted">
                <li>Include headers and helper functions (e.g., <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">json_escape</code>) to escape quotes, newlines, and backslashes.</li>
                <li>Seed a random number generator (fixed seed preferred) and produce deterministic inputs/outputs.</li>
                <li>Store generated strings in two <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">std::vector&lt;std::string&gt;</code> containers.</li>
                <li>Print as valid JSON arrays using <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">std::cout</code> and <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">std::cerr</code>.</li>
              </ol>
              <p className="text-text-muted">Example generator:</p>
              <pre className="bg-surface-1 border border-border text-text-muted p-3 rounded-lg overflow-x-auto text-xs font-mono"><code>{generatorExample}</code></pre>
            </section>

            <section id="manage-problems" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Managing Problems</h2>
              <p className="text-text-muted">Go to <Link href="/admin/problems/manage" className="text-brand-primary hover:underline">Manage Problems</Link> to review, edit, or deactivate problems.</p>
            </section>

            <section id="contests" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Contests</h2>
              <p className="text-text-muted">Create contests via <Link href="/admin/contests/create" className="text-brand-primary hover:underline">Create Contest</Link> and manage them in <Link href="/admin/contests/manage" className="text-brand-primary hover:underline">Manage Contests</Link>.</p>
              <p className="text-text-muted">When a problem is linked to a contest, submissions are allowed only for participants and within the timer window.</p>
            </section>

            <section id="judge" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Judge Service</h2>
              <p className="text-text-muted">Submissions are executed through the judge using the configured URL in the app.</p>
              <p className="text-text-muted">Supported languages include C++, Python, and Java for submissions; generators are C++ only.</p>
            </section>

            <section id="timers" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Contest Timers & Participation</h2>
              <p className="text-text-muted">Users must join a contest to submit linked problems.</p>
              <p className="text-text-muted">Timer enforcement prevents submissions after expiry.</p>
            </section>

            <section id="troubleshooting" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Troubleshooting</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li>Generator compile error: verify C++17 compatibility and includes.</li>
                <li>Invalid JSON: ensure stdout and stderr each contain a single JSON array of strings.</li>
                <li>Judge unavailable: check judge service health and URL configuration.</li>
                <li>Forbidden admin pages: confirm your account is in the admins table.</li>
              </ul>
            </section>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
