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

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute w-96 h-96 bg-green-400/5 rounded-full blur-3xl transition-all duration-500 ease-out"
              style={{ left: mousePosition.x - 200, top: mousePosition.y - 200 }}
            />
          </div>

          <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
            <Logo size="md" className="cursor-pointer" />
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
                Admin: {user?.user_metadata?.username || user?.email}
              </span>
              <Link
                href="/admin/help"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
              >
                Help
              </Link>
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

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-gray-200 space-y-10">
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-3">Contents</h2>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li><a href="#roles" className="text-blue-400 hover:underline">Roles & Access Control</a></li>
                    <li><a href="#problems" className="text-blue-400 hover:underline">Creating Problems</a></li>
                    <li><a href="#generators" className="text-blue-400 hover:underline">Test Case Generators (C++)</a></li>
                    <li><a href="#manage-problems" className="text-blue-400 hover:underline">Managing Problems</a></li>
                    <li><a href="#contests" className="text-blue-400 hover:underline">Contests (Create & Manage)</a></li>
                    <li><a href="#judge" className="text-blue-400 hover:underline">Judge Service</a></li>
                    <li><a href="#timers" className="text-blue-400 hover:underline">Contest Timers & Participation</a></li>
                    <li><a href="#troubleshooting" className="text-blue-400 hover:underline">Troubleshooting</a></li>
                  </ul>
                </section>

                <section id="roles" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Roles & Access Control</h2>
                  <p>- Admin-only pages are protected by <code className="px-1 py-0.5 bg-black/40 rounded">AdminGuard</code>. You must be present in the <code className="px-1 py-0.5 bg-black/40 rounded">admins</code> table.</p>
                  <p>- If access is denied, verify your account exists in <code className="px-1 py-0.5 bg-black/40 rounded">admins</code> and is active.</p>
                </section>

                <section id="problems" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Creating Problems</h2>
                  <p>- Navigate to <Link href="/admin/problems/create" className="text-blue-400 underline">Admin → Create Problem</Link>.</p>
                  <p>- Fill in name, description (Markdown), and optionally choose a contest.</p>
                  <p>- Test cases are generated via a C++ generator (see below). After successful generation, click <span className="px-2 py-0.5 rounded bg-blue-600/40">Create Problem</span> to save.</p>
                </section>

                <section id="generators" className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">Test Case Generators (C++)</h2>
                  <p>- Upload a single <code className="px-1 py-0.5 bg-black/40 rounded">.cpp</code> file on the Create Problem page and click <span className="px-2 py-0.5 rounded bg-green-600/40">Generate Test Cases</span>.</p>
                  <p>- The generator is compiled and executed by the judge. It must:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Write the input JSON array to <code className="px-1 py-0.5 bg-black/40 rounded">stdout</code>.</li>
                    <li>Write the output JSON array to <code className="px-1 py-0.5 bg-black/40 rounded">stderr</code>.</li>
                    <li>Both arrays must be the same length and contain strings.</li>
                  </ul>
                  <p className="text-gray-300">Example outputs for an addition problem:</p>
                  <pre className="bg-black/50 text-gray-100 p-4 rounded-lg overflow-x-auto"><code>{`stdout: ["6 7", "10 5", "3 3"]
stderr: ["13", "15", "6"]`}</code></pre>
                  <p>- On failure (compile/runtime/JSON), errors appear on the page so you can fix and reupload.</p>
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


