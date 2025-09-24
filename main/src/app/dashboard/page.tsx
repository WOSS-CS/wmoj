'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
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

        {/* Enhanced Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6 backdrop-blur-sm">
          <Link href="/" className="text-3xl font-bold text-white group cursor-pointer">
            <span className="text-green-400 transition-all duration-300 group-hover:scale-110 inline-block">W</span>
            <span className="text-white transition-all duration-300 group-hover:scale-110 inline-block" style={{ animationDelay: '0.1s' }}>MOJ</span>
          </Link>
          <div className="flex gap-4">
            <span className="px-6 py-2 text-green-400 border border-green-400 rounded-lg bg-green-400/10 backdrop-blur-sm hover:bg-green-400/20 transition-all duration-300 transform hover:scale-105">
              {user?.user_metadata?.username || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-600/25"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Enhanced Dashboard Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
          <div className={`mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="text-4xl font-bold text-white mb-4 relative">
              Welcome to your Dashboard
              <div className="absolute -bottom-2 left-0 w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
            </h1>
            <p className="text-gray-300 text-lg">
              Ready to tackle some competitive programming challenges?
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: '📊', title: 'Statistics', desc: 'Track your progress and achievements', action: 'View Stats', href: null },
              { icon: '💻', title: 'Problems', desc: 'Browse and solve coding challenges', action: 'Start Solving', href: '/problems' },
              { icon: '🏆', title: 'Contests', desc: 'Join live competitions', action: 'View Contests', href: '/contests' }
            ].map((card, index) => (
              <div 
                key={index}
                className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/10 group cursor-pointer ${
                  hoveredCard === index ? 'bg-white/15 scale-105 shadow-lg shadow-green-400/20' : ''
                }`}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                <div className={`text-6xl mb-6 transition-all duration-300 ${hoveredCard === index ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {card.icon}
                </div>
                <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${hoveredCard === index ? 'text-green-400' : 'text-white group-hover:text-green-400'}`}>
                  {card.title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {card.desc}
                </p>
                {card.href ? (
                  <Link
                    href={card.href}
                    className="block w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 text-center relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10">{card.action}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  </Link>
                ) : (
                  <button className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-400/25">
                    {card.action}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '0.3s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 relative">
              Recent Activity
              <div className="absolute -bottom-2 left-0 w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-white font-medium group-hover:text-green-400 transition-colors duration-300">Account created successfully</p>
                  <p className="text-gray-400 text-sm">
                    {user?.created_at && new Date(user.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <div>
                  <p className="text-white font-medium group-hover:text-green-400 transition-colors duration-300">Welcome to WMOJ!</p>
                  <p className="text-gray-400 text-sm">Ready to start your coding journey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
