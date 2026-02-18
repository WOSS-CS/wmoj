'use client';

import React, { useState, useEffect, useRef } from 'react';

const CodeWindow = () => {
    // State for rendering. We drive this from the ref.
    const [lines, setLines] = useState<{ text: string; color: string }[]>([]);

    // Cursor position state
    const [cursorLine, setCursorLine] = useState(0);

    const [badge, setBadge] = useState<{ text: string; color: 'green' | 'red'; visible: boolean }>({
        text: '',
        color: 'green',
        visible: false
    });

    useEffect(() => {
        let isMounted = true;

        // Use a ref to keep track of the lines state synchronously for the animation logic
        // preventing stale closure issues relative to the 'lines' state.
        const linesRef = { current: [] as { text: string; color: string }[] };

        // Track acttive line internally for the loop
        let activeLineIndex = 0;

        const syncState = () => {
            if (isMounted) {
                setLines([...linesRef.current]);
                setCursorLine(activeLineIndex);
            }
        };

        const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Helper to type text into a specific line index
        const typeLine = async (lineIndex: number, text: string, color: string, speed = 50) => {
            activeLineIndex = lineIndex;
            let currentText = "";

            // Ensure line exists in ref
            while (linesRef.current.length <= lineIndex) {
                linesRef.current.push({ text: '', color: 'var(--foreground)' });
            }

            // Typing loop
            for (let i = 0; i < text.length; i++) {
                if (!isMounted) break;
                currentText += text[i];

                // Update specific line
                linesRef.current[lineIndex] = { text: currentText, color };
                syncState();

                await wait(speed + Math.random() * 30);
            }
        };

        // Helper to backspace a line
        const backspaceLine = async (lineIndex: number) => {
            if (!isMounted) return;
            activeLineIndex = lineIndex;
            syncState(); // Ensure cursor moves to this line before deleting

            // Get current text from ref
            if (!linesRef.current[lineIndex]) return;
            let currentText = linesRef.current[lineIndex].text;

            while (currentText.length > 0) {
                if (!isMounted) break;
                currentText = currentText.slice(0, -1);

                linesRef.current[lineIndex].text = currentText;
                syncState();

                await wait(30);
            }
        };

        const runAnimation = async () => {
            while (isMounted) {
                // --- SETUP ---
                linesRef.current = [];
                activeLineIndex = 0;
                syncState();
                setBadge({ text: '', color: 'green', visible: false });
                await wait(1000);

                // --- PHASE 1: Write Naive Solution ---
                // Line 0: function solve(n) {
                await typeLine(0, 'function solve(n) {', '#ff7b72');
                await wait(200);

                // Line 1:   if (n <= 1) return n;
                await typeLine(1, '  if (n <= 1) return n;', 'var(--foreground)');
                await wait(200);

                // Line 2:   return solve(n-1) + solve(n-2);
                await typeLine(2, '  return solve(n-1) + solve(n-2);', 'var(--foreground)');
                await wait(200);

                // Line 3: }
                await typeLine(3, '}', 'var(--foreground)');

                await wait(800);

                // --- PHASE 2: TLE ---
                setBadge({ text: 'Time Limit Exceeded', color: 'red', visible: true });
                await wait(2500);
                setBadge(prev => ({ ...prev, visible: false }));
                await wait(500);

                // --- PHASE 3: Refactor (Memoization) ---
                await backspaceLine(3); // Delete }
                await backspaceLine(2); // Delete return ...

                await typeLine(2, '  if (memo[n]) return memo[n];', 'var(--foreground)');
                await wait(200);

                await typeLine(3, '  return memo[n] = solve(n-1) + solve(n-2);', 'var(--foreground)');
                await wait(200);

                await typeLine(4, '}', 'var(--foreground)');
                await wait(800);

                // --- PHASE 4: Success ---
                setBadge({ text: 'Passed: 12ms', color: 'green', visible: true });
                await wait(4000);
                setBadge(prev => ({ ...prev, visible: false }));
                await wait(500);

                // --- PHASE 5: Clear ---
                // Backspace all lines explicitly from bottom up
                // We know we have lines 0, 1, 2, 3, 4
                await backspaceLine(4); // }
                await wait(50);
                await backspaceLine(3); // memo return
                await wait(50);
                await backspaceLine(2); // memo check
                await wait(50);
                await backspaceLine(1); // base case
                await wait(50);
                await backspaceLine(0); // function

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
                <div className="glass-panel p-6 bg-surface-1/80 backdrop-blur-md rounded-xl border border-border shadow-2xl shadow-black/50 overflow-hidden min-h-[220px]">

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        <div className="ml-4 text-xs text-text-muted font-mono">solution.js</div>
                    </div>

                    {/* Code Content */}
                    <div className="font-mono text-sm leading-relaxed min-h-[120px]">
                        {lines.map((line, i) => (
                            <div key={i} className="flex min-h-[1.5em]">
                                {/* Line Number */}
                                <span className="w-8 text-text-muted/50 select-none text-right mr-4">{i + 1}</span>
                                <span style={{ color: line.color }} className="transition-colors duration-300 whitespace-pre flex items-center">
                                    {line.text}
                                    {/* Cursor Logic: Show if it's the active line, OR if it's the very first line and empty (start state) */}
                                    {(!badge.visible) && (i === cursorLine || (lines.length === 0 && i === 0)) && (
                                        <span className="animate-pulse inline-block w-2 h-4 bg-brand-primary ml-1"></span>
                                    )}
                                </span>
                            </div>
                        ))}
                        {/* Empty State Cursor (if lines is empty) */}
                        {lines.length === 0 && (
                            <div className="flex">
                                <span className="w-8 text-text-muted/50 select-none text-right mr-4">1</span>
                                <span className="animate-pulse inline-block w-2 h-4 bg-brand-primary ml-1"></span>
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
