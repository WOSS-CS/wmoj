'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface IDEFrameProps {
    user: any;
    onSignOut: () => void;
}

const IDEFrame = ({ user, onSignOut }: IDEFrameProps) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [windowHeight, setWindowHeight] = useState(0);

    // Track scroll position for minimap
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(Math.min(Math.max(progress, 0), 100));
        };

        const handleResize = () => setWindowHeight(window.innerHeight);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        handleScroll();
        handleResize();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Generate line numbers (more plentiful)
    const lineNumbers = Array.from({ length: 60 }, (_, i) => i + 1);

    // Generate deterministic minimap blocks
    const minimapBlocks = Array.from({ length: 150 }, (_, i) => {
        const width = Math.floor(Math.abs(Math.sin(i)) * 60) + 20; // Deterministic "randomness"
        const isCommit = i % 15 === 0;
        const color = isCommit ? '#22c55e' : i % 23 === 0 ? '#3b82f6' : '#ffffff';
        return { width: `${width}%`, color, opacity: isCommit ? 0.6 : 0.1 };
    });

    return (
        <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block overflow-hidden">

            {/* --- TOP BAR: Tabs & Breadcrumbs & Auth --- */}
            <div className="absolute top-0 left-0 right-0 h-[70px] bg-background/90 backdrop-blur-md border-b border-border z-50 flex flex-col pointer-events-auto">
                {/* Tabs Row */}
                <div className="flex h-[35px] items-end px-2 gap-1 bg-surface-2/50 relative">
                    {/* Active Tab */}
                    <div className="relative h-full px-4 flex items-center gap-2 bg-background border-t-2 border-brand-primary rounded-t-sm z-10">
                        <span className="text-blue-500 dark:text-blue-400 text-xs text-opacity-100">TSX</span>
                        <span className="text-foreground text-xs font-mono">page.tsx</span>
                        <span className="ml-2 hover:bg-foreground/10 rounded p-0.5 cursor-pointer">
                            <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </span>
                    </div>
                    {/* Inactive Tabs */}
                    <div className="h-full px-4 flex items-center gap-2 hover:bg-surface-2/80 transition-colors cursor-pointer opacity-50 border-t-2 border-transparent">
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">TSX</span>
                        <span className="text-text-muted text-xs font-mono">layout.tsx</span>
                    </div>
                    <div className="h-full px-4 flex items-center gap-2 hover:bg-surface-2/80 transition-colors cursor-pointer opacity-50">
                        <span className="text-blue-600 dark:text-blue-300 text-xs text-opacity-50">#</span>
                        <span className="text-text-muted text-xs font-mono">globals.css</span>
                    </div>

                    {/* Desktop Toolbar (Auth Actions) - Far Right of Tabs Row */}
                    <div className="ml-auto flex items-center gap-3 pr-4 h-full">
                        <ThemeToggle className="!p-1 !glass-panel hover:!bg-foreground/10 !border-border h-8 w-8" />
                        {user ? (
                            <>
                                <span className="text-xs text-brand-primary font-mono hidden xl:inline-block">
                                    {user.user_metadata?.username || user.email}
                                </span>
                                <button onClick={onSignOut} className="text-xs text-text-muted hover:text-foreground transition-colors bg-foreground/5 px-3 py-1 rounded hover:bg-foreground/10">
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" className="text-xs text-text-muted hover:text-foreground transition-colors">
                                    Log In
                                </Link>
                                <Link href="/auth/signup" className="text-xs text-background bg-foreground px-3 py-1 rounded font-bold hover:bg-foreground/80 transition-colors shadow-lg">
                                    Sign Up
                                </Link>
                            </>
                        )}
                        {/* Run Button (Just for visuals) */}
                        <div className="w-px h-4 bg-border mx-1" />
                        <button className="text-brand-primary/80 hover:text-brand-primary transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs Row */}
                <div className="flex-1 flex items-center px-4 gap-2 text-[11px] font-mono text-text-muted/80 bg-background border-t border-border">
                    <span>wmoj-client</span>
                    <span className="text-border">/</span>
                    <span>src</span>
                    <span className="text-border">/</span>
                    <span>app</span>
                    <span className="text-border">/</span>
                    <span className="text-foreground/80">page.tsx</span>
                    <span className="ml-4 flex items-center gap-1 text-text-muted/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
                        Home
                    </span>
                    <span className="ml-auto text-text-muted/60 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-text-muted/40" /> 0 errors</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-text-muted/40" /> 0 warnings</span>
                    </span>
                </div>
            </div>

            {/* --- LEFT GUTTER: Line Numbers & Git Markers --- */}
            <div className="absolute top-[70px] bottom-[24px] left-0 w-16 bg-surface-1/30 border-r border-border flex flex-col items-end py-4 pr-3 select-none font-mono text-[11px] text-text-muted/40">
                {lineNumbers.map((num) => (
                    <div key={num} className="leading-6 font-medium tracking-wide flex items-center gap-3 w-full justify-end relative group">
                        {/* Git Diff Marker (Randomized simulation) */}
                        {num % 12 === 0 && <div className="absolute left-1 w-0.5 h-4 bg-brand-primary/50" />}
                        {num % 23 === 0 && <div className="absolute left-1 w-0.5 h-4 bg-blue-500/50" />}

                        {/* Breakpoint Hint */}
                        <div className="absolute left-3 w-2 h-2 rounded-full bg-red-500/0 group-hover:bg-red-500/50 transition-colors cursor-pointer" />

                        {num.toString()}
                    </div>
                ))}
            </div>

            {/* --- RIGHT GUTTER: Interactive Minimap --- */}
            <div className="absolute top-[70px] bottom-[24px] right-0 w-24 bg-surface-1/20 border-l border-border p-2 flex flex-col gap-0.5 select-none z-40 pointer-events-auto">
                <div className="w-full relative h-full overflow-hidden">
                    {/* Code Blocks */}
                    {minimapBlocks.map((block, i) => (
                        <div
                            key={i}
                            className="h-[2px] rounded-full mb-[1px]"
                            style={{
                                width: block.width,
                                backgroundColor: block.color === '#ffffff' ? 'var(--foreground)' : block.color === '#22c55e' ? 'var(--color-brand-primary)' : block.color,
                                opacity: block.opacity
                            }}
                        />
                    ))}

                    {/* Viewport Slider Overlay */}
                    <div
                        className="absolute w-full bg-foreground/5 border border-foreground/10 shadow-sm backdrop-blur-[1px] cursor-grab active:cursor-grabbing hover:bg-foreground/10 transition-colors"
                        style={{
                            height: '150px', // Approximated viewport ratio
                            top: `${scrollProgress}%`,
                            transform: 'translateY(-50%)' // Center on the point
                        }}
                    />
                </div>
            </div>

            {/* --- BOTTOM STATUS BAR --- */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-surface-2 border-t border-brand-primary/20 flex items-center justify-between px-3 text-[10px] font-mono text-text-muted z-50 select-none">

                {/* Left: Source Control */}
                <div className="flex items-center gap-4 h-full">
                    <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer h-full px-2 hover:bg-foreground/5">
                        <svg className="w-3 h-3 text-purple-500 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                        <span className="text-foreground/80">main*</span>
                        <span className="ml-1 text-text-muted/60 text-[9px] flex gap-1">
                            <span>0↓</span>
                            <span>1↑</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer h-full px-2 hover:bg-foreground/5">
                        <span className="w-3 h-3 rounded-full border border-text-muted/40 flex items-center justify-center text-[7px]">x</span>
                        0
                        <span className="w-3 h-3 rounded-full border border-text-muted/40 flex items-center justify-center text-[7px] ml-1">!</span>
                        0
                    </div>
                </div>

                {/* Right: Language/Config */}
                <div className="flex items-center gap-4 h-full">
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5">
                        Ln {Math.floor(scrollProgress + 1)}, Col {Math.floor(Math.random() * 80) + 1}
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5">
                        Spaces: 2
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5">
                        UTF-8
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5">
                        CRLF
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center gap-1.5 px-2 hover:bg-foreground/5 text-blue-600 dark:text-blue-400">
                        {/* Brackets Icon */}
                        <span className="font-bold">{'{}'}</span>
                        <span>TypeScript React</span>
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5">
                        <span className="text-brand-primary flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Prettier
                        </span>
                    </div>
                    <div className="hover:text-foreground transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-foreground/5 text-text-muted/60">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default IDEFrame;
