'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { HoverAnimation } from '@/components/AnimationWrapper';
import { RippleEffect, MagneticEffect, TiltEffect } from '@/components/MicroInteractions';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthGuard requireAuth={true} allowAuthenticated={true}>
      <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Mouse-following glow */}
          <div 
            className="absolute w-96 h-96 bg-green-400/5 rounded-full blur-3xl transition-all duration-500 ease-out"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
            }}
          />
          
          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 right-20 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
          
          {/* Circuit Pattern with animations */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute top-20 left-20 w-32 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse"></div>
            <div className="absolute top-20 left-52 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-20 left-52 w-0.5 h-16 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-36 left-52 w-24 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-36 left-76 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            <div className="absolute top-40 right-20 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-40 right-20 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-60 right-20 w-40 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-60 right-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="absolute bottom-32 left-32 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-32 left-32 w-0.5 h-24 bg-gradient-to-b from-green-400 to-transparent animate-pulse" style={{ animationDelay: '2.5s' }}></div>
            <div className="absolute bottom-8 left-32 w-28 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }}></div>
            <div className="absolute bottom-8 left-60 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>
        </div>

        {/* Top Navigation Bar */}
        <nav className="relative z-10 flex justify-between items-center p-4 backdrop-blur-sm border-b border-white/10">
          <Logo size="md" className="cursor-pointer" />
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 text-red-400 border border-red-400 rounded-lg bg-red-400/10 backdrop-blur-sm">
              Admin: {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25"
            >
              Sign Out
            </button>
          </div>
        </nav>

        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 min-h-screen">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Admin Dashboard</h2>
              <nav className="space-y-2">
                <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Overview
                </Link>
                <Link href="/admin/contests/create" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Contest
                </Link>
                <Link href="/admin/problems/create" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Problem
                </Link>
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  User Dashboard
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            <LoadingState 
              isLoading={!isLoaded}
              skeleton={
                <div className="mb-8 space-y-4">
                  <SkeletonText lines={2} width="60%" />
                  <SkeletonText lines={1} width="40%" />
                </div>
              }
            >
              <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <Logo size="md" className="mb-6 cursor-default" badge="Admin Hub" href={null} />
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Admin Dashboard
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Manage contests and problems for the competitive programming platform
                </p>
              </div>
            </LoadingState>

            {/* Admin Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <LoadingState 
                isLoading={!isLoaded}
                skeleton={<CardLoading count={2} />}
              >
                {[
                  { 
                    icon: '🏆', 
                    title: 'Create Contest', 
                    desc: 'Create new competitive programming contests with custom settings', 
                    href: '/admin/contests/create', 
                    color: 'from-purple-600 to-purple-700' 
                  },
                  { 
                    icon: '📝', 
                    title: 'Create Problem', 
                    desc: 'Add new problems to contests or create standalone problems', 
                    href: '/admin/problems/create', 
                    color: 'from-blue-600 to-blue-700' 
                  }
                ].map((card, index) => (
                  <TiltEffect key={index} maxTilt={2}>
                    <MagneticEffect strength={0.06} maxOffset={4}>
                      <RippleEffect color="green">
                        <HoverAnimation effect="lift">
                          <div 
                            className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-300 flex flex-col transform hover:scale-[1.02] hover:shadow-lg hover:shadow-green-400/10 group cursor-pointer ${
                              hoveredCard === index ? 'bg-white/15 scale-[1.02] shadow-lg shadow-green-400/20 border-green-400/50' : ''
                            }`}
                            onMouseEnter={() => setHoveredCard(index)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{ transitionDelay: `${index * 0.1}s` }}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className={`text-4xl transition-all duration-300 ${
                                hoveredCard === index ? 'animate-wiggle' : 'group-hover:animate-wiggle'
                              }`}>
                                {card.icon}
                              </div>
                              <h3 className={`text-2xl font-bold transition-colors duration-300 ${
                                hoveredCard === index ? 'text-green-400' : 'text-white group-hover:text-green-400'
                              }`}>
                                {card.title}
                              </h3>
                            </div>
                            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                              {card.desc}
                            </p>
                            <Link href={card.href} className="mt-auto">
                              <div className={`px-6 py-3 bg-gradient-to-r ${card.color} text-white rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-[1.02]`}>
                                Get Started
                              </div>
                            </Link>
                          </div>
                        </HoverAnimation>
                      </RippleEffect>
                    </MagneticEffect>
                  </TiltEffect>
                ))}
              </LoadingState>
            </div>

            {/* Admin Stats */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.3s' }}>
              <h2 className="text-2xl font-bold text-white mb-6 relative">
                Platform Statistics
                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-pulse" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-green-400 mb-2">12</div>
                  <div className="text-gray-300">Active Contests</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">156</div>
                  <div className="text-gray-300">Total Problems</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400 mb-2">1,234</div>
                  <div className="text-gray-300">Registered Users</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      </AdminGuard>
    </AuthGuard>
  );
}
