'use client';

import React, { useState, useEffect } from 'react';
import CodeWindow from './CodeWindow';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const HeroSection = () => {
    const { user } = useAuth();
    const [textIndex, setTextIndex] = useState(0);
    const phrases = ["Fix", "Optimize", "Submit"];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % phrases.length);
        }, 3000); // Cycle every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32 overflow-hidden">

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Text Content - Center Stage (col-span-12 initially) but design says Center Stage Typography usually implies centered overlay or just centered stack. 
                    However, the spec says "Discard Text on Left, Image on Right layout. It’s too standard." 
                    BUT it also says "2.2 The Visual Hook: The 'Floating IDE' ... directly below the text, tilting slightly"
                    So it's a vertical stack: Text Top, Image Bottom.
                */}
                <div className="lg:col-span-12 flex flex-col items-center text-center">

                    {/* Headline */}
                    <h1 className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight text-white mb-6">
                        Build. Break. <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 inline-block min-w-[1.5em] text-left">
                            {phrases[textIndex]}
                            <span className="text-green-400 animate-pulse">_</span>
                        </span>
                    </h1>

                    {/* Sub-headline */}
                    <p className="font-body text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
                        The competitive arena for White Oaks developers.
                    </p>

                    {/* CTAs */}
                    <div className="flex gap-4 mb-16">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-mono font-bold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                            >
                                Enter Arena
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/signup"
                                    className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-lg font-mono font-bold transition-all hover:scale-105"
                                >
                                    Start Coding
                                </Link>
                                <Link
                                    href="/problems"
                                    className="px-8 py-3 bg-transparent border border-gray-700 text-gray-300 hover:border-white hover:text-white rounded-lg font-mono font-bold transition-all"
                                >
                                    Explore
                                </Link>
                            </>
                        )}
                    </div>

                    {/* The Visual Hook */}
                    <div className="w-full max-w-4xl relative">
                        <CodeWindow />
                    </div>

                </div>
            </div>
        </section>
    );
};

export default HeroSection;
