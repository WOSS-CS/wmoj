'use client';

import React, { useState, useEffect } from 'react';
import CodeWindow from './CodeWindow';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

const HeroSection = () => {
    const { user } = useAuth();
    const [text, setText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [loopNum, setLoopNum] = useState(0);
    const [typingSpeed, setTypingSpeed] = useState(150);

    // Using useMemo for phrases to avoid re-triggering useEffect unnecessarily, 
    // or just move it inside/outside component. Inside is fine with dependency.
    const phrases = ["Fix", "Optimize", "Submit"];

    useEffect(() => {
        const handleTyping = () => {
            const i = loopNum % phrases.length;
            const fullText = phrases[i];

            setText(isDeleting
                ? fullText.substring(0, text.length - 1)
                : fullText.substring(0, text.length + 1)
            );

            setTypingSpeed(isDeleting ? 50 : 150);

            if (!isDeleting && text === fullText) {
                setTimeout(() => setIsDeleting(true), 2000); // Wait before deleting
            } else if (isDeleting && text === "") {
                setIsDeleting(false);
                setLoopNum(loopNum + 1);
            }
        };

        const timer = setTimeout(handleTyping, typingSpeed);
        return () => clearTimeout(timer);
    }, [text, isDeleting, loopNum, typingSpeed]); // Removing phrases from dependency array since it's constant ref in this render scope effectively

    return (
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Text Content - Center Stage (col-span-12 initially) but design says Center Stage Typography usually implies centered overlay or just centered stack. 
                    However, the spec says "Discard Text on Left, Image on Right layout. It’s too standard." 
                    BUT it also says "2.2 The Visual Hook: The 'Floating IDE' ... directly below the text, tilting slightly"
                    So it's a vertical stack: Text Top, Image Bottom.
                */}
                <div className="lg:col-span-12 flex flex-col items-center text-center">

                    {/* Logo (Centered) */}
                    <div className="mb-8 scale-150">
                        <Logo size="md" priority />
                    </div>

                    {/* Headline */}
                    <h1 className="font-heading font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight text-foreground mb-4">
                        Build. Break. <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 inline-block min-w-[1.5em] text-left">
                            {text}
                            <span className="text-green-400 animate-pulse">_</span>
                        </span>
                    </h1>

                    {/* Sub-headline */}
                    <p className="font-body text-lg md:text-xl text-text-muted max-w-2xl mb-8">
                        The competitive arena for White Oaks Competitive Programmers.
                    </p>

                    {/* CTAs */}
                    <div className="flex gap-4 mb-10">
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
                                    Sign up
                                </Link>
                                <Link
                                    href="/auth/login"
                                    className="px-8 py-3 bg-transparent border border-border text-text-muted hover:border-foreground hover:text-foreground rounded-lg font-mono font-bold transition-all"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </div>

                    {/* The Visual Hook */}
                    <div className="w-full max-w-4xl relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-green-500/10 to-transparent blur-3xl -z-10 rounded-full pointer-events-none" />
                        <CodeWindow />
                    </div>

                </div>
            </div>
        </section>
    );
};

export default HeroSection;
