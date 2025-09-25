'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { HoverAnimation } from '@/components/AnimationWrapper';
import { RippleEffect, MagneticEffect, TiltEffect } from '@/components/MicroInteractions';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
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
          <Link href="/" className="text-2xl font-bold text-white group cursor-pointer">
            <span className="text-green-400 transition-all duration-300 group-hover:scale-110 inline-block">W</span>
            <span className="text-white transition-all duration-300 group-hover:scale-110 inline-block" style={{ animationDelay: '0.1s' }}>MOJ</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-all duration-300 transform hover:scale-105">
              {user?.user_metadata?.username || user?.email}
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
              <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
              <nav className="space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Overview
                </Link>
                <Link href="/problems" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Problems
                </Link>
                <Link href="/contests" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Contests
                </Link>
                <div className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistics
                </div>
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
                <h1 className="text-4xl font-bold text-white mb-4 relative">
                  Welcome to your Dashboard
                  <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </h1>
                <p className="text-gray-300 text-lg">
                  Ready to tackle some competitive programming challenges?
                </p>
              </div>
            </LoadingState>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <LoadingState 
                isLoading={!isLoaded}
                skeleton={<CardLoading count={3} />}
              >
                {[
                  { icon: '💻', title: 'Start Solving', desc: 'Browse and solve coding challenges', href: '/problems', color: 'from-blue-600 to-blue-700' },
                  { icon: '🏆', title: 'Join Contest', desc: 'Participate in live competitions', href: '/contests', color: 'from-purple-600 to-purple-700' },
                  { icon: '📊', title: 'View Stats', desc: 'Track your progress and achievements', href: null, color: 'from-gray-600 to-gray-700' }
                ].map((card, index) => (
                  <TiltEffect key={index} maxTilt={8}>
                    <MagneticEffect strength={0.3}>
                      <RippleEffect color="green">
                        <HoverAnimation effect="lift">
                          <div 
                            className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-300 flex flex-col transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/10 group cursor-pointer ${
                              hoveredCard === index ? 'bg-white/15 scale-105 shadow-lg shadow-green-400/20 border-green-400/50' : ''
                            }`}
                            onMouseEnter={() => setHoveredCard(index)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{ transitionDelay: `${index * 0.1}s` }}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className={`text-3xl transition-all duration-300 ${
                                hoveredCard === index ? 'animate-wiggle' : 'group-hover:animate-wiggle'
                              }`}>
                                {card.icon}
                              </div>
                              <h3 className={`text-xl font-bold transition-colors duration-300 ${
                                hoveredCard === index ? 'text-green-400' : 'text-white group-hover:text-green-400'
                              }`}>
                                {card.title}
                              </h3>
                            </div>
                            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                              {card.desc}
                            </p>
                            {card.href ? (
                              <Link href={card.href} className="mt-auto">
                                <div className={`px-4 py-2 bg-gradient-to-r ${card.color} text-white rounded-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105`}>
                                  Get Started
                                </div>
                              </Link>
                            ) : (
                              <div className="mt-auto">
                                <div className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg cursor-not-allowed">
                                  Coming Soon
                                </div>
                              </div>
                            )}
                          </div>
                        </HoverAnimation>
                      </RippleEffect>
                    </MagneticEffect>
                  </TiltEffect>
                ))}
              </LoadingState>
            </div>

            {/* Recent Activity */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.3s' }}>
              <h2 className="text-2xl font-bold text-white mb-6 relative">
                Recent Activity
                <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
              </h2>
              <div className="space-y-4">
                {[
                  { action: 'Solved', problem: 'Two Sum', time: '2 hours ago', status: 'success' },
                  { action: 'Attempted', problem: 'Binary Search', time: '1 day ago', status: 'warning' },
                  { action: 'Joined', contest: 'Weekly Contest #1', time: '3 days ago', status: 'info' }
                ].map((activity, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group"
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'success' ? 'bg-green-400' : 
                      activity.status === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                    } animate-pulse`} />
                    <div className="flex-1">
                      <p className="text-white font-medium group-hover:text-green-400 transition-colors duration-300">
                        {activity.action} {activity.problem || activity.contest}
                      </p>
                      <p className="text-gray-400 text-sm">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}