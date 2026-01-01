'use client';

import React, { useState, useEffect } from 'react';

const FeatureVerdict = () => {
    // Animation state for the 3rd case
    const [case3Status, setCase3Status] = useState<'running' | 'failed' | 'passed'>('running');

    useEffect(() => {
        let isMounted = true;
        const runLoop = async () => {
            while (isMounted) {
                setCase3Status('running');
                await new Promise(r => setTimeout(r, 2000));
                if (!isMounted) break;

                // Glitch fail
                setCase3Status('failed');
                await new Promise(r => setTimeout(r, 1500));
                if (!isMounted) break;

                // Fix to pass
                setCase3Status('passed');
                await new Promise(r => setTimeout(r, 4000));
            }
        };

        runLoop();
        return () => { isMounted = false; };
    }, []);

    return (
        <section className="relative py-24 px-6">
            {/* Visual Connector Line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-green-500/20 to-transparent hidden lg:block" />

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">

                {/* Text Side (Left 40%) */}
                <div className="lg:w-2/5 space-y-8">
                    <h2 className="text-4xl md:text-5xl font-heading font-bold text-white leading-tight">
                        Instant <span className="text-green-400 glow-text-green">Judgement.</span>
                    </h2>
                    <p className="text-lg text-gray-400 leading-relaxed font-body border-l-2 border-green-900/50 pl-6">
                        Don't wait for the server. Get millisecond-precision feedback on your logic.
                        <span className="text-white font-mono text-sm ml-2 bg-gray-800 px-2 py-1 rounded">TLE</span>
                        <span className="text-white font-mono text-sm ml-2 bg-gray-800 px-2 py-1 rounded">MLE</span>
                        <span className="text-white font-mono text-sm ml-2 bg-gray-800 px-2 py-1 rounded">RE</span>
                        <br className="mb-2" />
                        explained in plain English.
                    </p>
                </div>

                {/* Visual Side (Right 60%) */}
                <div className="lg:w-3/5 w-full">
                    <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl overflow-hidden group hover:border-green-500/30 transition-colors duration-500">
                        {/* Background grid hint */}
                        <div className="absolute inset-0 opacity-[0.03]"
                            style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />

                        {/* Test Cases Stack */}
                        <div className="space-y-4 relative z-10 w-full max-w-md mx-auto">

                            {/* Case 1 */}
                            <div className="flex items-center justify-between bg-[#0d1117] p-4 rounded-lg border-l-4 border-green-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                    <span className="font-mono text-sm text-gray-300">Test Case #1</span>
                                </div>
                                <span className="font-mono text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">PASSED 2ms</span>
                            </div>

                            {/* Case 2 */}
                            <div className="flex items-center justify-between bg-[#0d1117] p-4 rounded-lg border-l-4 border-green-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                    <span className="font-mono text-sm text-gray-300">Test Case #2</span>
                                </div>
                                <span className="font-mono text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">PASSED 4ms</span>
                            </div>

                            {/* Case 3 Dynamic */}
                            <div className={`flex items-center justify-between bg-[#0d1117] p-4 rounded-lg border-l-4 transition-all duration-300 ${case3Status === 'failed' ? 'border-red-500 animate-wiggle' :
                                case3Status === 'passed' ? 'border-green-500' : 'border-gray-700'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${case3Status === 'failed' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                                        case3Status === 'passed' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-600'
                                        }`}></div>
                                    <span className="font-mono text-sm text-gray-300">Test Case #3</span>
                                </div>

                                {case3Status === 'running' && (
                                    <span className="font-mono text-xs text-gray-500 animate-pulse">Running...</span>
                                )}
                                {case3Status === 'failed' && (
                                    <span className="font-mono text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded animate-pulse">Time Limit Exceeded</span>
                                )}
                                {case3Status === 'passed' && (
                                    <span className="font-mono text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded animate-bounce-in">PASSED 12ms</span>
                                )}
                            </div>

                            {/* Case 4 */}
                            <div className="flex items-center justify-between bg-[#0d1117] p-4 rounded-lg border-l-4 border-gray-700 opacity-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                    <span className="font-mono text-sm text-gray-300">Test Case #4</span>
                                </div>
                                <span className="font-mono text-xs text-gray-500">Qt.</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeatureVerdict;
