import React from 'react';

const IDEFrame = () => {
    // Generate line numbers
    const lineNumbers = Array.from({ length: 40 }, (_, i) => i + 1);

    // Generate random code blocks for minimap
    const minimapBlocks = Array.from({ length: 50 }, (_, i) => ({
        width: Math.floor(Math.random() * 60) + 20 + '%',
        opacity: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.8 ? '#22c55e' : Math.random() > 0.9 ? '#3b82f6' : '#ffffff'
    }));

    return (
        <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block overflow-hidden">

            {/* Left Gutter: Line Numbers */}
            <div className="absolute top-0 bottom-[24px] left-0 w-16 bg-[#0a0a0a]/50 border-r border-white/5 flex flex-col items-end py-6 pr-4 select-none font-mono text-xs text-gray-700/50">
                {lineNumbers.map((num) => (
                    <div key={num} className="leading-6 font-medium tracking-wide">
                        {num.toString().padStart(2, '0')}
                    </div>
                ))}
                {/* Fade out at bottom */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0F1115] to-transparent" />
            </div>

            {/* Right Gutter: Minimap */}
            <div className="absolute top-0 bottom-[24px] right-0 w-20 bg-[#0a0a0a]/50 border-l border-white/5 p-2 flex flex-col gap-1 select-none">
                {minimapBlocks.map((block, i) => (
                    <div
                        key={i}
                        className="h-1 rounded-full"
                        style={{
                            width: block.width,
                            backgroundColor: block.color,
                            opacity: block.opacity
                        }}
                    />
                ))}
                {/* Fade out at bottom */}
                <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-t from-[#0F1115] to-transparent" />

                {/* Fake Viewport Slider */}
                <div className="absolute top-20 right-1 w-16 h-32 bg-white/5 border border-white/10 rounded-sm backdrop-blur-sm" />
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#0d1117] border-t border-white/10 flex items-center justify-between px-4 text-[10px] font-mono text-gray-500 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer pointer-events-auto">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span>Connected to WMOJ v2.1</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer pointer-events-auto">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        <span>main.tsx</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hover:text-white transition-colors cursor-pointer pointer-events-auto">
                        Ln 42, Col 18
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer pointer-events-auto">
                        UTF-8
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer pointer-events-auto flex items-center gap-1">
                        <span className="text-blue-400">⚡</span> TypeScript React
                    </div>
                    <div className="hover:text-white transition-colors cursor-pointer pointer-events-auto">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default IDEFrame;
