'use client';

import { useAuth } from '@/contexts/AuthContext';

export function SocialProofTicker() {
    // Placeholder logos/text. ideally duplicates to ensure seamless loop
    const items = [
        "Harvard", "MIT", "Stanford", "Waterloo", "UofT", "Google", "Meta", "Netflix", "Amazon", "Apple",
        "Harvard", "MIT", "Stanford", "Waterloo", "UofT", "Google", "Meta", "Netflix", "Amazon", "Apple",
    ];

    return (
        <div className="w-full bg-background border-y border-border overflow-hidden py-4 relative">
            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-background via-transparent to-background" />

            <div className="flex w-max animate-infinite-scroll hover:pause-animation">
                {items.map((item, idx) => (
                    <div key={idx} className="mx-8 flex items-center gap-2 grayscale hover:grayscale-0 opacity-50 hover:opacity-100 transition-all duration-300 cursor-default">
                        {/* Placeholder icon */}
                        <div className="w-6 h-6 bg-surface-2 rounded-full" />
                        <span className="text-sm font-mono text-text-muted font-medium tracking-wide">{item}</span>
                    </div>
                ))}
            </div>

            <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center z-0 pointer-events-none opacity-0 md:opacity-100">
                {/* Optional centered text if desired, hidden for now to focus on marquee */}
            </div>
        </div>
    );
}
