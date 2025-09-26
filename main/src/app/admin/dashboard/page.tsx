'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { HoverAnimation } from '@/components/AnimationWrapper';
import { RippleEffect, MagneticEffect, TiltEffect } from '@/components/MicroInteractions';
import { LoadingState, CardLoading, SkeletonText } from '@/components/LoadingStates';
import Link from 'next/link';
import { AdminSidebar } from '@/components/AdminSidebar';
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
          <AdminSidebar />

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
                  },
                  {
                    icon: '🧩',
                    title: 'Manage Problems',
                    desc: 'Edit, activate/deactivate or delete existing problems',
                    href: '/admin/problems/manage',
                    color: 'from-green-600 to-green-700'
                  },
                  {
                    icon: '📋',
                    title: 'Manage Contests',
                    desc: 'Update contest settings and control visibility',
                    href: '/admin/contests/manage',
                    color: 'from-pink-600 to-pink-700'
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
