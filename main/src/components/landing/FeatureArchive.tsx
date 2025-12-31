'use client';

import React from 'react';

const FeatureArchive = () => {
    const problems = [
        { title: "Maximum Subarray Sum", tag: "DP", difficulty: "Medium", color: "text-orange-400 border-orange-400" },
        { title: "Dijkstra's Shortest Path", tag: "Graph", difficulty: "Hard", color: "text-red-400 border-red-400" },
        { title: "Two Sum", tag: "Array", difficulty: "Easy", color: "text-green-400 border-green-400" },
        { title: "Knapsack Problem", tag: "DP", difficulty: "Medium", color: "text-orange-400 border-orange-400" },
        { title: "Lowest Common Ancestor", tag: "Tree", difficulty: "Hard", color: "text-red-400 border-red-400" },
        { title: "Binary Search", tag: "Search", difficulty: "Easy", color: "text-green-400 border-green-400" },
        { title: "Floyd-Warshall", tag: "Graph", difficulty: "Normal", color: "text-blue-400 border-blue-400" },
    ];

    // Duplicate for infinite scroll
    const scrollProblems = problems;

    return (
        <section className="relative py-32 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">

                {/* Visual Side (Left 60%) */}
                <div className="lg:w-3/5 w-full relative h-[500px] perspective-1000">
                    {/* Mask to fade top/bottom */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-[#0F1115] via-transparent to-[#0F1115] h-full" />

                    {/* Scrolling Container */}
                    <div className="relative w-full h-full overflow-hidden flex justify-center transform rotate-y-12 rotate-x-6 scale-90">
                        <div className="absolute w-full max-w-md space-y-4 flex flex-col">
                            {scrollProblems.map((prob, idx) => (
                                <div key={idx} className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl shadow-lg flex items-center justify-between hover:bg-[#21262d] transition-colors group">
                                    <div>
                                        <h3 className="text-gray-200 font-bold font-mono group-hover:text-white transition-colors">{prob.title}</h3>
                                        <div className="mt-2 flex gap-2">
                                            <span className="text-xs font-mono bg-[#30363d] text-gray-400 px-2 py-0.5 rounded">{prob.tag}</span>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold border px-2 py-1 rounded uppercase ${prob.color}`}>
                                        {prob.difficulty}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Text Side (Right 40%) */}
                <div className="lg:w-2/5 space-y-8 lg:text-right">
                    <h2 className="text-4xl md:text-5xl font-heading font-bold text-white leading-tight">
                        Algorithmic <span className="text-blue-400 glow-text-blue" style={{ textShadow: "0 0 20px rgba(96, 165, 250, 0.5)" }}>Depth.</span>
                    </h2>
                    <p className="text-lg text-gray-400 leading-relaxed font-body border-r-2 border-blue-900/50 pr-6 ml-auto">
                        A curated library of problems designed to break your bad habits.
                        From basic arrays to advanced graph traversal.
                    </p>
                    <div className="flex gap-4 justify-end">
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-bold text-white">500+</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Problems</span>
                        </div>
                        <div className="h-10 w-px bg-gray-800"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-bold text-white">12</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Categories</span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default FeatureArchive;
