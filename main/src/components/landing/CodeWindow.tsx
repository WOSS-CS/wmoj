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
        let isMounted = true;

        const typeLine = async (fullText: string) => {
            let currentText = "  "; // Start with indentation
            for (let i = 2; i < fullText.length; i++) {
                if (!isMounted) break;
                currentText += fullText[i];
                setLines(prev => {
                    const newLines = [...prev];
                    newLines[2] = { text: currentText, color: '#e5e5e5' };
                    return newLines;
                });
                await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
            }
        };

        const runAnimation = async () => {
            while (isMounted) {
                // Reset state
                setShowBadge(false);
                setLines([
                    { text: 'function solve(input) {', color: '#ff7b72' },
                    { text: '  // Analyzing...', color: '#8b949e' },
                    { text: '  ', color: '#e5e5e5' },
                    { text: '}', color: '#e5e5e5' }
                ]);

                // Wait a bit before starting
                await new Promise(r => setTimeout(r, 1000));
                if (!isMounted) break;

                // Type the solution
                await typeLine("  return optimizedSolution;");

                // Highlight syntax after typing is done
                if (!isMounted) break;
                setLines(prev => {
                    const newLines = [...prev];
                    newLines[2] = { text: '  return optimizedSolution;', color: '#79c0ff' }; // Colorize
                    return newLines;
                });

                // Wait before showing badge
                await new Promise(r => setTimeout(r, 500));
                if (!isMounted) break;

                // Show Success
                setShowBadge(true);

                // Hold the success state
                await new Promise(r => setTimeout(r, 4000));
            }
        };

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
