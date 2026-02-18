'use client';

export function FeatureHighlights() {
    const features = [
        {
            title: "Instant Feedback",
            body: "Submit your code and get judged instantly against extensive test cases. No waiting around.",
            icon: (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            title: "Grow Your Skills",
            body: "From beginner basics to advanced algorithms. Problems designed to level up your thinking.",
            icon: (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            title: "Compete with Peers",
            body: "Climb the ranks in weekly contests and see where you stand among the best.",
            icon: (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            )
        }
    ];

    return (
        <section className="py-20 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {features.map((feature, idx) => (
                    <div
                        key={idx}
                        className="glass-panel p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300 group"
                    >
                        <div className="w-12 h-12 bg-surface-2 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-border">
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-3 font-mono">{feature.title}</h3>
                        <p className="text-text-muted leading-relaxed">{feature.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
