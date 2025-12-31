'use client';

import React, { useState, useEffect } from 'react';

const CodeWindow = () => {
    const [lines, setLines] = useState([
        { text: 'function solve(input) {', color: '#ff7b72' }, // Red/Pink for keyword
        { text: '  // Analyzing...', color: '#8b949e' }, // Comment gray
        { text: '  ', color: '#e5e5e5' },
        { text: '}', color: '#e5e5e5' }
    ]);
    const [showBadge, setShowBadge] = useState(false);

    useEffect(() => {
        const cycle = async () => {
            // Reset
            setShowBadge(false);
            setLines([
                { text: 'function solve(input) {', color: '#ff7b72' },
                { text: '  // Analyzing...', color: '#8b949e' },
                { text: '  ', color: '#e5e5e5' },
                { text: '}', color: '#e5e5e5' }
            ]);

            // Simulate typing solution
            await new Promise(r => setTimeout(r, 1000));
            setLines(prev => {
                const newLines = [...prev];
                newLines[2] = { text: '  return optimizedSolution;', color: '#79c0ff' }; // Blue for var
                return newLines;
            });

            // Show success
            await new Promise(r => setTimeout(r, 1500));
            setShowBadge(true);

            // Loop
            await new Promise(r => setTimeout(r, 2000));
            cycle();
        };

        // Initial delay
        const timer = setTimeout(() => {
            cycle(); // Start the cycle but we need to manage the recursion correctly or use interval. 
            // Re-implementing with a simple interval wrapper to avoid complexities of async recursion in useEffect cleanup
        }, 100);

        // Let's actually use a continuous loop controlled by a flag or just simplistic recursion
        let isMounted = true;
        const runAnimation = async () => {
            while (isMounted) {
                setShowBadge(false);
                setLines([
                    { text: 'function solve(input) {', color: '#ff7b72' },
                    { text: '  // Analyzing...', color: '#8b949e' },
                    { text: '  ', color: '#e5e5e5' },
                    { text: '}', color: '#e5e5e5' }
                ]);
                await new Promise(r => setTimeout(r, 1000));
                if (!isMounted) break;

                setLines(current => {
                    const newLines = [...current];
                    newLines[2] = { text: '  return optimizedSolution;', color: '#79c0ff' };
                    return newLines;
                });
                await new Promise(r => setTimeout(r, 800));
                if (!isMounted) break;

                setShowBadge(true);
                await new Promise(r => setTimeout(r, 2200));
            }
        }

        runAnimation();

        return () => { isMounted = false; };
    }, []);

    return (
        <div className="relative group perspective-1000 w-full max-w-lg mx-auto">
            <div className="relative transform transition-all duration-500 ease-out hover:rotate-x-2 hover:rotate-y-2 preserve-3d">
                {/* Glass Container */}
                <div className="glass-panel p-6 bg-[#0d1117]/80 backdrop-blur-md rounded-xl border border-[#30363d] shadow-2xl shadow-black/50 overflow-hidden min-h-[220px]">

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 border-b border-[#30363d] pb-3">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        <div className="ml-4 text-xs text-gray-400 font-mono">solution.js</div>
                    </div>

                    {/* Code Content */}
                    <div className="font-mono text-sm leading-relaxed">
                        {lines.map((line, i) => (
                            <div key={i} className="flex">
                                <span className="w-8 text-gray-600 select-none text-right mr-4">{i + 1}</span>
                                <span style={{ color: line.color }} className="transition-all duration-300">
                                    {line.text}
                                    {i === 2 && !showBadge && <span className="animate-pulse inline-block w-2 h-4 bg-green-500 ml-1 align-middle"></span>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Success Badge Overlay */}
                    <div className={`absolute bottom-6 right-6 transition-all duration-500 transform ${showBadge ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
                        <div className="bg-[#238636] text-white px-4 py-2 rounded-full font-mono text-sm font-bold shadow-lg shadow-green-900/50 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Passed: 12ms
                        </div>
                    </div>

                </div>

                {/* Decorative Glow Behind */}
                <div className="absolute -inset-1 bg-green-500/20 blur-2xl -z-10 opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-xl" />
            </div>
        </div>
    );
};

export default CodeWindow;
