'use client';

import React, { useState, useEffect } from 'react';

const CodeWindow = () => {
    const [lines, setLines] = useState<{ text: string; color: string }[]>([]);
    const [badge, setBadge] = useState<{ text: string; color: 'green' | 'red'; visible: boolean }>({
        text: '',
        color: 'green',
        visible: false
    });

    useEffect(() => {
        let isMounted = true;

        const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Helper to type text into a specific line index
        const typeLine = async (lineIndex: number, text: string, color: string, speed = 50) => {
            let currentText = "";
            for (let i = 0; i < text.length; i++) {
                if (!isMounted) break;
                currentText += text[i];
                setLines(prev => {
                    const newLines = [...prev];
                    // Ensure line exists
                    while (newLines.length <= lineIndex) {
                        newLines.push({ text: '', color: '#e5e5e5' });
                    }
                    newLines[lineIndex] = { text: currentText, color };
                    return newLines;
                });
                await wait(speed + Math.random() * 30);
            }
        };

        // Helper to backspace a line
        const backspaceLine = async (lineIndex: number) => {
            if (!isMounted) return;
            // Get current text length to know how many times to backspace
            let currentLength = 0;
            setLines(prev => {
                if (prev[lineIndex]) currentLength = prev[lineIndex].text.length;
                return prev;
            });

            for (let i = 0; i < currentLength; i++) {
                if (!isMounted) break;
                setLines(prev => {
                    const newLines = [...prev];
                    if (newLines[lineIndex]) {
                        newLines[lineIndex].text = newLines[lineIndex].text.slice(0, -1);
                    }
                    return newLines;
                });
                await wait(30);
            }
            // Remove the line entirely if empty to clean up
            setLines(prev => {
                const newLines = [...prev];
                if (newLines[lineIndex] && newLines[lineIndex].text === '') {
                    // We keep the empty line object or remove it?
                    // Keeping it prevents array shift issues if we rely on index,
                    // but for "clearing" usually we want it gone.
                    // For editing, we usually just clear the text.
                }
                return newLines;
            });
        };

        const runAnimation = async () => {
            while (isMounted) {
                // --- SETUP ---
                setLines([]);
                setBadge({ text: '', color: 'green', visible: false });
                await wait(1000);

                // --- PHASE 1: Write Naive Solution ---
                // Line 0: function solve(n) {
                await typeLine(0, 'function solve(n) {', '#ff7b72');
                await wait(200);

                // Line 1:   if (n <= 1) return n;
                await typeLine(1, '  if (n <= 1) return n;', '#e5e5e5'); // White/Default
                await wait(200);

                // Line 2:   return solve(n-1) + solve(n-2);
                await typeLine(2, '  return solve(n-1) + solve(n-2);', '#e5e5e5');
                await wait(200);

                // Line 3: }
                await typeLine(3, '}', '#e5e5e5');

                await wait(800);

                // --- PHASE 2: TLE ---
                setBadge({ text: 'Time Limit Exceeded', color: 'red', visible: true });
                await wait(2500); // Let user see the failure
                setBadge(prev => ({ ...prev, visible: false }));
                await wait(500);

                // --- PHASE 3: Refactor (Memoization) ---
                // Delete Line 3 '}'
                await backspaceLine(3);
                // Delete Line 2 'return ...'
                await backspaceLine(2);

                // Type new Line 2:   if (memo[n]) return memo[n];
                // Using a slightly different color for variables if we want, but keeping simple for now
                await typeLine(2, '  if (memo[n]) return memo[n];', '#e5e5e5');
                await wait(200);

                // Type new Line 3:   return memo[n] = solve(n-1) + solve(n-2);
                await typeLine(3, '  return memo[n] = solve(n-1) + solve(n-2);', '#e5e5e5');
                await wait(200);

                // Type Line 4: }
                await typeLine(4, '}', '#e5e5e5');
                await wait(800);

                // --- PHASE 4: Success ---
                setBadge({ text: 'Passed: 12ms', color: 'green', visible: true });
                await wait(4000); // Hold success
                setBadge(prev => ({ ...prev, visible: false }));
                await wait(500);

                // --- PHASE 5: Clear ---
                // Backspace all lines rapidly
                for (let i = 4; i >= 0; i--) {
                    await backspaceLine(i);
                    await wait(100);
                }

                await wait(1000);
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
                    <div className="font-mono text-sm leading-relaxed min-h-[120px]">
                        {lines.map((line, i) => (
                            <div key={i} className="flex min-h-[1.5em]">
                                {/* Line Number */}
                                <span className="w-8 text-gray-600 select-none text-right mr-4">{i + 1}</span>
                                <span style={{ color: line.color }} className="transition-colors duration-300 whitespace-pre">
                                    {line.text}
                                    {/* Blinking Cursor on the active typing line */}
                                    {i === lines.length - 1 && !badge.visible && (
                                        <span className="animate-pulse inline-block w-2 H-4 bg-brand-primary ml-1 align-middle"></span>
                                    )}
                                </span>
                            </div>
                        ))}
                        {/* Empty cursor if no lines */}
                        {lines.length === 0 && (
                            <div className="flex">
                                <span className="w-8 text-gray-600 select-none text-right mr-4">1</span>
                                <span className="animate-pulse inline-block w-2 h-4 bg-brand-primary ml-1 align-middle"></span>
                            </div>
                        )}
                    </div>

                    {/* Status Badge Overlay */}
                    <div className={`absolute bottom-6 right-6 transition-all duration-500 transform ${badge.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}>
                        <div className={`
                            px-4 py-2 rounded-full font-mono text-sm font-bold shadow-lg flex items-center gap-2
                            ${badge.color === 'green'
                                ? 'bg-[#238636] text-white shadow-green-900/50'
                                : 'bg-red-500 text-white shadow-red-900/50'
                            }
                        `}>
                            {badge.color === 'green' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {badge.text}
                        </div>
                    </div>

                </div>

                {/* Decorative Glow Behind */}
                <div className={`absolute -inset-1 blur-2xl -z-10 opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-xl ${badge.visible && badge.color === 'red' ? 'bg-red-500/20' : 'bg-green-500/20'}`} />
            </div>
        </div>
    );
};

export default CodeWindow;
