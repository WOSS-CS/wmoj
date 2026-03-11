'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useEffect, useState } from 'react';

export default function AboutClient() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      className={`min-h-screen bg-background text-foreground transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="bg-noise" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 bg-surface-1/80 backdrop-blur-md border-b border-border">
        <Logo size="md" href="/" priority />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!user && (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-foreground text-background hover:bg-foreground/80 px-4 py-1.5 rounded-lg font-medium transition-all"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">

        {/* Header */}
        <div className="mb-12">
          <span className="text-xs font-mono tracking-[0.2em] text-brand-primary uppercase">
            White Oaks Secondary School — CS Club
          </span>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            About WMOJ
          </h1>
          <p className="mt-4 text-lg text-text-muted leading-relaxed">
            A competitive programming platform built by students, for students.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-12" />

        {/* Story Sections */}
        <div className="space-y-12 text-base text-text-muted leading-relaxed">

          {/* Origin */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Where it all started</h2>
            <p>
              WMOJ was created by the <span className="text-foreground font-medium">White Oaks Secondary School
              Computer Science Club</span> — a group of students passionate about competitive programming
              and problem solving. Our goal has always been to give White Oaks programmers a dedicated
              arena to practise, compete, and grow throughout the school year.
            </p>
          </section>

          {/* DMOJ History */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">The problem with the old way</h2>
            <p className="mb-4">
              For a long time, the club relied on{' '}
              <span className="text-foreground font-medium">DMOJ (Don Mills Online Judge)</span> to host
              problems and run contests. While DMOJ is a fantastic platform, it came with a set of
              challenges that made running our own events genuinely difficult.
            </p>
            <ul className="space-y-3 pl-4 border-l-2 border-border">
              <li className="pl-4">
                <span className="text-foreground font-medium">Hard to reach admins.</span>{' '}
                Coordinating with DMOJ&apos;s administrators was a once-a-year endeavour — and even then,
                there were no guarantees things would come together in time.
              </li>
              <li className="pl-4">
                <span className="text-foreground font-medium">Costly contests.</span>{' '}
                Running the annual <em>WOSS Dual Olympiad</em> required reaching out to DMOJ each year
                and paying a $50 fee just to host a single contest — with a long list of restrictions
                attached.
              </li>
              <li className="pl-4">
                <span className="text-foreground font-medium">No semester-wide contests.</span>{' '}
                We had no way to run regular in-house contests throughout the semester to keep
                members engaged and sharpening their skills.
              </li>
              <li className="pl-4">
                <span className="text-foreground font-medium">No room for our own problems.</span>{' '}
                Hosting original problems was off the table; we could only link out to existing
                DMOJ problems, limiting our ability to craft challenges tailored to our community.
              </li>
            </ul>
          </section>

          {/* The Solution */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Building something of our own</h2>
            <p className="mb-4">
              Rather than continuing to work around these limitations, we decided to build the platform
              we actually needed. WMOJ is a fully custom competitive programming judge, built from the
              ground up by members of the WOSS CS Club.
            </p>
            <p className="mb-4">
              Along with the web platform, we developed a{' '}
              <span className="text-foreground font-medium">custom judge API</span> to handle code
              submission evaluation — giving us full control over how problems are tested, how verdicts
              are issued, and how contests are structured.
            </p>
            <p>
              Today, WMOJ lets us spin up contests whenever we want, write and publish our own
              problems, and provide every White Oaks competitive programmer with a home base — all
              without fees, restrictions, or waiting on anyone else.
            </p>
          </section>

          {/* Mission */}
          <section className="bg-surface-1 border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">Our mission</h2>
            <p>
              WMOJ exists to make competitive programming accessible, exciting, and community-driven
              at White Oaks Secondary School. Whether you&apos;re tackling your first problem or
              grinding for national competitions, this is your platform — built by people just like you.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-10 px-6 border-t border-border bg-surface-1/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
          <span className="text-xs font-mono tracking-[0.2em] text-brand-primary/80 uppercase">
            White Oaks Secondary School
          </span>
          <p>© {new Date().getFullYear()} WMOJ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
