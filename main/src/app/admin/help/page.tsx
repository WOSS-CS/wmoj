'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { Logo } from '@/components/Logo';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminHelpPage() {
  const { user, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
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

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-96 h-96 bg-[#1a1a1a] rounded-full transition-all duration-500 ease-out"
              style={{ left: mousePosition.x - 200, top: mousePosition.y - 200 }}
            />
          </div>

          <nav className="relative z-10 flex justify-between items-center p-4 bg-[#0a0a0a] border-b border-[#262626]">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-red-400 border border-red-900 rounded-lg bg-[#450a0a]">
                Admin: {user?.user_metadata?.username || user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Sign Out
              </button>
            </div>
          </nav>

          <div className="flex">
            <AdminSidebar />

            <main className="flex-1 p-8">
              <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Admin Help & Operations Guide
                  <span className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">Everything you need to effectively administer WMOJ.</p>
              </div>

              <div className="p-8 text-gray-200 space-y-10">
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-3">Contents</h2>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li><a href="#problems" className="text-blue-400 hover:underline">Creating Problems</a></li>
                    <li><a href="#generators" className="text-blue-400 hover:underline">Test Case Generators (C++)</a></li>
                    <li><a href="#generator-guide" className="text-blue-400 hover:underline">Detailed Generator Guide</a></li>
                    <li><a href="#manage-problems" className="text-blue-400 hover:underline">Managing Problems</a></li>
                    <li><a href="#contests" className="text-blue-400 hover:underline">Contests (Create & Manage)</a></li>
                    <li><a href="#judge" className="text-blue-400 hover:underline">Judge Service</a></li>
                    <li><a href="#timers" className="text-blue-400 hover:underline">Contest Timers & Participation</a></li>
                    <li><a href="#troubleshooting" className="text-blue-400 hover:underline">Troubleshooting</a></li>
                  </ul>
                </section>

                <section id="problems" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Creating Problems</h2>
                  <p>- Navigate to <Link href="/admin/problems/create" className="text-blue-400 underline">Admin → Create Problem</Link>.</p>
                  <p>- Fill in name, description (Markdown), and optionally choose a contest.</p>
                  <p>- Test cases are generated via a C++ generator (see below). After successful generation, click <span className="px-2 py-0.5 rounded bg-blue-900">Create Problem</span> to save.</p>
                </section>

                <section id="generators" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Test Case Generators (C++)</h2>
                  <p>- Upload a single <code className="px-1 py-0.5 bg-[#262626] rounded">.cpp</code> file on the Create Problem page and click <span className="px-2 py-0.5 rounded bg-green-900">Generate Test Cases</span>.</p>
                  <p>- The generator is compiled and executed by the judge. It must:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Write the input JSON array to <code className="px-1 py-0.5 bg-[#262626] rounded">stdout</code>.</li>
                    <li>Write the output JSON array to <code className="px-1 py-0.5 bg-[#262626] rounded">stderr</code>.</li>
                    <li>Both arrays must be the same length and contain strings.</li>
                  </ul>
                  <p className="text-gray-300">Example outputs for an addition problem:</p>
                  <pre className="bg-[#111111] border border-[#262626] text-gray-100 p-4 rounded-lg overflow-x-auto"><code>{`stdout: ["6 7", "10 5", "3 3"]
stderr: ["13", "15", "6"]`}</code></pre>
                  <p>- On failure (compile/runtime/JSON), errors appear on the page so you can fix and reupload.</p>
                  <p>- See the detailed guide below for a complete template.</p>
                </section>

                <section id="generator-guide" className="space-y-4">
                  <h2 className="text-2xl font-semibold text-white">Detailed Generator Guide</h2>
                  <p>Every generator must emit <strong>verbatim JSON arrays</strong>:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><code className="px-1 py-0.5 bg-[#262626] rounded">stdout</code> → JSON array of input strings (one entry per test case).</li>
                    <li><code className="px-1 py-0.5 bg-[#262626] rounded">stderr</code> → JSON array of output strings in the same order.</li>
                    <li>The arrays must be the same length, contain only strings, and be valid JSON (quoted, escaped, comma separated, enclosed in <code>[]</code>).</li>
                  </ul>
                  <p className="text-gray-300">Recommended structure:</p>
                  <ol className="list-decimal list-inside ml-4 space-y-1 text-gray-300">
                    <li>Include headers and helper functions (e.g., <code>json_escape</code>) to escape quotes, newlines, and backslashes.</li>
                    <li>Seed a random number generator (fixed seed preferred for reproducibility) and produce deterministic inputs/outputs.</li>
                    <li>Store generated strings in two <code>std::vector&lt;std::string&gt;</code> containers so you can print them once at the end.</li>
                    <li>When printing, wrap each string in quotes and separate entries with commas to form valid JSON arrays.</li>
                    <li>Use <code>std::cout</code> for the input array and <code>std::cerr</code> for the output array, then flush/terminate with <code>std::endl</code>.</li>
                  </ol>
                  <p className="text-gray-300">Example generator:</p>
                  <pre className="bg-[#111111] border border-[#262626] text-gray-100 p-4 rounded-lg overflow-x-auto"><code>{generatorExample}</code></pre>
                  <p>Key takeaways:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><code>json_escape</code> ensures control characters or quotes within strings do not break the JSON.</li>
                    <li>Inputs and outputs are paired by index; make sure both vectors have identical lengths.</li>
                    <li>You can replace the random logic with handcrafted cases for edge coverage—just keep the printing format identical.</li>
                    <li>Do not print debugging text or additional lines; only the JSON arrays should be emitted.</li>
                  </ul>
                </section>

                <section id="manage-problems" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Managing Problems</h2>
                  <p>- Go to <Link href="/admin/problems/manage" className="text-blue-400 underline">Manage Problems</Link> to review, edit, or deactivate problems.</p>
                </section>

                <section id="contests" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Contests</h2>
                  <p>- Create contests via <Link href="/admin/contests/create" className="text-blue-400 underline">Create Contest</Link> and manage them in <Link href="/admin/contests/manage" className="text-blue-400 underline">Manage Contests</Link>.</p>
                  <p>- When a problem is linked to a contest, submissions are allowed only for participants and within the timer window.</p>
                </section>

                <section id="judge" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Judge Service</h2>
                  <p>- Submissions are executed through the judge using the configured URL in the app.</p>
                  <p>- Supported languages include C++, Python, and Java for submissions; generators are C++ only.</p>
                </section>

                <section id="timers" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Contest Timers & Participation</h2>
                  <p>- Users must join a contest to submit linked problems.</p>
                  <p>- Timer enforcement prevents submissions after expiry.</p>
                </section>

                <section id="troubleshooting" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Troubleshooting</h2>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Generator compile error: verify C++17 compatibility and includes.</li>
                    <li>Invalid JSON: ensure stdout and stderr each contain a single JSON array of strings.</li>
                    <li>Judge unavailable: check judge service health and URL configuration.</li>
                    <li>Forbidden admin pages: confirm your account is in the admins table.</li>
                  </ul>
                </section>
              </div>
            </main>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}


