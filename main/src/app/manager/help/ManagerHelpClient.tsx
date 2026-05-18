'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ManagerGuard } from '@/components/ManagerGuard';

type CopyState = 'idle' | 'copied' | 'error';

function PromptCopyButton({ label, file }: { label: string; file: string }) {
  const [state, setState] = useState<CopyState>('idle');

  const handleCopy = async () => {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error('fetch failed');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const text = state === 'copied' ? 'Copied!' : state === 'error' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-xs font-medium text-foreground hover:bg-surface-1 transition-colors"
    >
      {text}
    </button>
  );
}

export default function ManagerHelpClient() {
  return (
    <AuthGuard requireAuth allowAuthenticated>
      <ManagerGuard>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Manager Help & Operations Guide</h1>
            <p className="text-sm text-text-muted mt-1">Everything you need to effectively manage WMOJ.</p>
          </div>

          <div className="space-y-8 text-sm">
            <section id="add-problems-llm" className="space-y-3 glass-panel p-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Adding Problems via LLM</h2>
                <p className="text-text-muted mt-1">The fastest way to add a problem: prompt an LLM with our two prepared prompts.</p>
              </div>

              <p className="text-text-muted">Problems are created at <Link href="/manager/problems/create" className="text-brand-primary hover:underline">Manager → Create Problem</Link>, and contests at <Link href="/manager/contests/create" className="text-brand-primary hover:underline">Create Contest</Link>.</p>

              <p className="text-text-muted"><strong className="text-foreground">Manager responsibility:</strong> admins can also create problems and contests, but their submissions stay <strong className="text-foreground">pending</strong> until a manager approves them. You are expected to regularly review and approve admin-submitted items at <Link href="/manager/problems/manage" className="text-brand-primary hover:underline">Manage Problems</Link> and <Link href="/manager/contests/manage" className="text-brand-primary hover:underline">Manage Contests</Link>.</p>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Workflow</h3>
                <ol className="list-decimal list-inside ml-4 space-y-1 text-text-muted">
                  <li>Download a problem PDF from an external source (we recommend <a href="https://dmoj.ca" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">dmoj.ca</a>).</li>
                  <li>Open a fresh chat with any LLM (Claude, ChatGPT, Gemini, etc.). Paste the <strong className="text-foreground">conversion prompt</strong> first, before uploading anything. It will then ask you to upload PDFs one at a time and convert each into the Markdown format expected by <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">/manager/problems/create</code>.</li>
                  <li>Paste the produced <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.md</code> into the problem-description field on the Create Problem page.</li>
                  <li>In a new chat (or the same one), paste the <strong className="text-foreground">generator prompt</strong>, then provide your problem <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.md</code>. The LLM produces a <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">generator.cpp</code> you paste on the same Create Problem page to generate test cases.</li>
                  <li>After test cases are generated, save the problem. Manager-created problems can be published directly; admin-created problems require manager approval.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-2">
                <PromptCopyButton label="Copy Conversion Prompt" file="/conversion.md" />
                <PromptCopyButton label="Copy Generator Prompt" file="/generator.md" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">What each prompt does</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                  <li><strong className="text-foreground">Conversion prompt:</strong> turns the LLM into a converter that takes a PDF problem and outputs a <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.md</code> file in the exact format this site expects (time/memory limits at top, description, input/output specs, sample cases). The LLM iterates: ask for a PDF → produce <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.md</code> → ask for changes or the next PDF.</li>
                  <li><strong className="text-foreground">Generator prompt:</strong> turns the LLM into a <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">generator.cpp</code> author: it reads a problem <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">.md</code> and outputs a C++ generator that emits inputs on stdout and outputs on stderr as JSON arrays, respecting sub-task constraints (each mark = one test case grouping).</li>
                </ul>
              </div>

              <div className="bg-surface-1 border border-border p-3 rounded-lg space-y-1">
                <p className="text-foreground font-semibold text-xs uppercase tracking-wider">Test case size warning</p>
                <p className="text-text-muted">The judge-api has limits on how large test cases can be — both <strong className="text-foreground">individually</strong> and in <strong className="text-foreground">total volume</strong>. If the generator produces too much data, you must:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                  <li>reduce the size of individual test cases,</li>
                  <li>reduce the total quantity (volume) of test cases, or</li>
                  <li>both.</li>
                </ul>
                <p className="text-text-muted">Be careful to <strong className="text-foreground">preserve the essential test cases</strong> so the problem still works as intended and remains solvable only as required — especially for problems transferred from another platform like DMOJ, where the test data is what enforces the intended difficulty.</p>
              </div>
            </section>

            <nav className="glass-panel p-4">
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Contents</h2>
              <ul className="space-y-1">
                {[
                  { href: '#add-problems-llm', label: 'Adding Problems via LLM (Start Here)' },
                  { href: '#problems', label: 'Creating Problems' },
                  { href: '#generators', label: 'Test Case Generators (C++)' },
                  { href: '#generator-guide', label: 'Detailed Generator Guide' },
                  { href: '#subtasks', label: 'Sub-tasks & Constraint Groups' },
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
              <p className="text-text-muted">Navigate to <Link href="/manager/problems/create" className="text-brand-primary hover:underline">Manager → Create Problem</Link>.</p>
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
              <pre className="bg-surface-1 border border-border text-text-muted p-3 rounded-lg overflow-x-auto text-xs font-mono"><code>{`// generator.cpp for a problem where you add two integers together.

#include <bits/stdc++.h>

using namespace std;

string json_escape(const string &s) {
    string out;
    out.reserve(s.size());
    for (char c : s) {
        if (c == '\\\\') out += "\\\\\\\\";
        else if (c == '"') out += "\\\\\\"";
        else if (c == '\\b') out += "\\\\b";
        else if (c == '\\f') out += "\\\\f";
        else if (c == '\\n') out += "\\\\n";
        else if (c == '\\r') out += "\\\\r";
        else if (c == '\\t') out += "\\\\t";
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
        cout << "\\"" << json_escape(inputs[i]) << "\\"";
    }
    cout << "]" << endl;

    // Print output JSON array to stderr
    cerr << "[";
    for (size_t i = 0; i < outputs.size(); ++i) {
        if (i) cerr << ", ";
        cerr << "\\"" << json_escape(outputs[i]) << "\\"";
    }
    cerr << "]" << endl;

    return 0;
}`}</code></pre>
            </section>

            <section id="subtasks" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Sub-tasks & Constraint Groups</h2>
              <p className="text-text-muted">Some problems award partial credit through <strong className="text-foreground">sub-tasks</strong> — groups of test cases that each operate under a specific set of constraints. This is common in competitions like the CCC, where different sets of test cases correspond to different difficulty tiers and point values.</p>
              <p className="text-text-muted">For example, an easy sub-task might restrict the input size to 0 ≤ N ≤ 100, while a harder sub-task allows 0 ≤ N ≤ 10<sup>9</sup>. Each sub-task is a family of test cases that all conform to the same constraint range.</p>
              <p className="text-text-muted"><strong className="text-foreground">This is entirely controlled by your generator.</strong> The platform does not have a separate sub-task configuration — it is up to you, the problem author, to write your <code className="px-1.5 py-0.5 bg-surface-2 rounded text-xs font-mono">generator.cpp</code> so that it produces the correct number of test cases for each sub-task, with inputs that respect the corresponding constraints.</p>
              <p className="text-text-muted">In practice, this means structuring your generator to produce test cases in batches: for instance, the first 10 cases with small N for Sub-task 1, the next 10 with medium N for Sub-task 2, and so on. Make sure the problem description clearly states which test cases belong to which sub-task and what constraints apply.</p>
            </section>

            <section id="manage-problems" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Managing Problems</h2>
              <p className="text-text-muted">Go to <Link href="/manager/problems/manage" className="text-brand-primary hover:underline">Manage Problems</Link> to review, edit, or deactivate problems.</p>
            </section>

            <section id="contests" className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Contests</h2>
              <p className="text-text-muted">Create contests via <Link href="/manager/contests/create" className="text-brand-primary hover:underline">Create Contest</Link> and manage them in <Link href="/manager/contests/manage" className="text-brand-primary hover:underline">Manage Contests</Link>.</p>
              <p className="text-text-muted">When a problem is linked to a contest, submissions are allowed only for participants and within the timer window.</p>
              <p className="text-text-muted">A problem can belong to multiple contests simultaneously, subject to the following rules:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-text-muted">
                <li><strong className="text-foreground">Rated ongoing/upcoming contests lock their problems.</strong> If a problem is in a rated contest that is currently ongoing or upcoming, it cannot be added to any other contest.</li>
                <li><strong className="text-foreground">Rated contests require standalone problems.</strong> When creating or editing a rated contest, you can only add problems that are not already in any other contest.</li>
                <li><strong className="text-foreground">Unrated contests can share problems freely.</strong> Problems in virtual, inactive, or other unrated contests can be added to any unrated contest without restriction.</li>
              </ul>
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
                <li>Forbidden manager pages: confirm your account is in the managers table.</li>
              </ul>
            </section>
          </div>
        </div>
      </ManagerGuard>
    </AuthGuard>
  );
}
