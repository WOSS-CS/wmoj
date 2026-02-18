'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import FeatureVerdict from '@/components/landing/FeatureVerdict';
import FeatureArchive from '@/components/landing/FeatureArchive';
import IDEFrame from '@/components/layout/IDEFrame';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Home() {
  const { user, signOut, userDashboardPath } = useAuth();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <AuthGuard requireAuth={false} allowAuthenticated={false} redirectTo={userDashboardPath || "/dashboard"}>
      <div className={`min-h-screen bg-background relative overflow-hidden font-sans text-foreground selection:bg-green-500/30 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'} lg:pl-16 lg:pr-24 lg:pt-[70px] lg:pb-6`}>

        {/* 1. The "Living" Background */}
        <div className="bg-noise" /> {/* Noise Overlay */}
        {/* Assuming CodeRainBackground would be here if it existed, adding IDEFrame after it */}
        {/* <CodeRainBackground /> */} {/* Code Rain Abstract Texture */}
        <IDEFrame user={user} onSignOut={handleSignOut} /> {/* The "Editor" Frame */}

        {/* Navbar - Mobile Only */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex lg:hidden justify-between items-center p-6 bg-surface-1/80 backdrop-blur-md border-b border-white/5">
          <Logo size="md" className="cursor-pointer" priority />
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            {user ? (
              <>
                <span className="hidden md:inline-block px-4 py-1.5 text-sm text-green-300 border border-green-800/50 rounded-full bg-[#064e3b]/30 backdrop-blur-md">
                  {user.user_metadata?.username || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2 text-sm bg-red-500/10 text-red-400 border border-red-900/50 rounded-lg hover:bg-red-500/20 transition-all duration-300 backdrop-blur-md"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>

              </>
            )}
          </div>
        </nav>

        {/* 2. Hero Section: "Code Editor" Window */}
        <HeroSection />

        {/* 3. The Feature Showcase (The "Zig-Zag" Layout) */}
        <div className="relative z-10 space-y-0">
          {/* Feature 1: The "Verdict" Moment */}
          <FeatureVerdict />

          {/* Feature 2: The Archive */}
          <FeatureArchive />
        </div>

        {/* Footer */}
        <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-gray-500">
            <div className="mb-4 md:mb-0">
              <span className="text-xs font-mono tracking-[0.2em] text-green-500/80 uppercase">White Oaks Secondary School</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} WMOJ. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </AuthGuard>
  );
}
