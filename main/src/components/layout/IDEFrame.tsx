'use client';

import React, { useEffect, useState } from 'react';

const IDEFrame = () => {
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

            {/* --- TOP BAR: Tabs & Breadcrumbs --- */}
            <div className="absolute top-0 left-0 right-0 h-[70px] bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 z-50 flex flex-col pointer-events-auto">
                {/* Tabs */}
                <div className="flex h-[35px] items-end px-2 gap-1 bg-[#050505]">
                    {/* Active Tab */}
                    <div className="relative h-full px-4 flex items-center gap-2 bg-[#0F1115] border-t-2 border-green-500 rounded-t-sm">
                        <span className="text-blue-400 text-xs">TSX</span>
                        <span className="text-gray-200 text-xs font-mono">page.tsx</span>
                        <span className="ml-2 hover:bg-white/10 rounded p-0.5 cursor-pointer">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </span>
                    </div>
                    {/* Inactive Tabs */}
                    <div className="h-full px-4 flex items-center gap-2 hover:bg-[#0F1115]/50 transition-colors cursor-pointer opacity-50">
                        <span className="text-yellow-400 text-xs">TSX</span>
                        <span className="text-gray-400 text-xs font-mono">layout.tsx</span>
                    </div>
                    <div className="h-full px-4 flex items-center gap-2 hover:bg-[#0F1115]/50 transition-colors cursor-pointer opacity-50">
                        <span className="text-blue-300 text-xs text-opacity-50">#</span>
                        <span className="text-gray-400 text-xs font-mono">globals.css</span>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="flex-1 flex items-center px-4 gap-2 text-[11px] font-mono text-gray-500">
                    <span>wmoj-client</span>
                    <span className="text-gray-700">/</span>
                    <span>src</span>
                    <span className="text-gray-700">/</span>
                    <span>app</span>
                    <span className="text-gray-700">/</span>
                    <span className="text-gray-300">page.tsx</span>
                    <span className="ml-4 flex items-center gap-1 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        Home
                    </span>
                    <span className="ml-auto text-gray-600 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-gray-600" /> 0 errors</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-gray-600" /> 0 warnings</span>
                    </span>
                </div>
            </div>

            {/* --- LEFT GUTTER: Line Numbers & Git Markers --- */}
            <div className="absolute top-[70px] bottom-[24px] left-0 w-16 bg-[#0a0a0a]/50 border-r border-white/5 flex flex-col items-end py-4 pr-3 select-none font-mono text-[11px] text-gray-700/50">
                {lineNumbers.map((num) => (
                    <div key={num} className="leading-6 font-medium tracking-wide flex items-center gap-3 w-full justify-end relative group">
                        {/* Git Diff Marker (Randomized simulation) */}
                        {num % 12 === 0 && <div className="absolute left-1 w-0.5 h-4 bg-green-500/50" />}
                        {num % 23 === 0 && <div className="absolute left-1 w-0.5 h-4 bg-blue-500/50" />}

                        {/* Breakpoint Hint */}
                        <div className="absolute left-3 w-2 h-2 rounded-full bg-red-500/0 group-hover:bg-red-500/50 transition-colors cursor-pointer" />

                        {num.toString()}
                    </div>
                ))}
            </div>

            {/* --- RIGHT GUTTER: Interactive Minimap --- */}
            <div className="absolute top-[70px] bottom-[24px] right-0 w-24 bg-[#0a0a0a]/30 border-l border-white/5 p-2 flex flex-col gap-0.5 select-none z-40 pointer-events-auto">
                <div className="w-full relative h-full overflow-hidden">
                    {/* Code Blocks */}
                    {minimapBlocks.map((block, i) => (
                        <div
                            key={i}
                            className="h-[2px] rounded-full mb-[1px]"
                            style={{
                                width: block.width,
                                backgroundColor: block.color,
                                opacity: block.opacity
                            }}
                        />
                    ))}

                    {/* Viewport Slider Overlay */}
                    <div
                        className="absolute w-full bg-white/5 border border-white/10 shadow-sm backdrop-blur-[1px] cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                        style={{
                            height: '150px', // Approximated viewport ratio
                            top: `${scrollProgress}%`,
                            transform: 'translateY(-50%)' // Center on the point
                        }}
                    />
                </div>
            </div>

            {/* --- BOTTOM STATUS BAR --- */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#0F1115] border-t border-green-900/20 flex items-center justify-between px-3 text-[10px] font-mono text-gray-500 z-50 select-none">

                {/* Left: Source Control */}
                <div className="flex items-center gap-4 h-full">
                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer h-full px-2 hover:bg-white/5">
                        <svg className="w-3 h-3 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                        <span className="text-gray-300">main*</span>
                        <span className="ml-1 text-gray-600 text-[9px] flex gap-1">
                            <span>0↓</span>
                            <span>1↑</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer h-full px-2 hover:bg-white/5">
                        <span className="w-3 h-3 rounded-full border border-gray-600 flex items-center justify-center text-[7px]">x</span>
                        0
                        <span className="w-3 h-3 rounded-full border border-gray-600 flex items-center justify-center text-[7px] ml-1">!</span>
                        0
                    </div>
                </div>

                {/* Right: Language/Config */}
                <div className="flex items-center gap-4 h-full">
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5">
                        Ln {Math.floor(scrollProgress + 1)}, Col {Math.floor(Math.random() * 80) + 1}
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5">
                        Spaces: 2
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5">
                        UTF-8
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5">
                        CRLF
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center gap-1.5 px-2 hover:bg-white/5 text-blue-400">
                        {/* Brackets Icon */}
                        <span className="font-bold">{'{}'}</span>
                        <span>TypeScript React</span>
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5">
                        <span className="text-green-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Prettier
                        </span>
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer h-full flex items-center px-2 hover:bg-white/5 text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default IDEFrame;
