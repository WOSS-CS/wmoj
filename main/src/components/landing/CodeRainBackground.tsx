'use client';

import React, { useEffect, useRef } from 'react';

const CodeRainBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const snippets = [
            "function optimize(x) { return x * 2; }",
            "const graph = new Map();",
            "if (dp[i][j] === -1) solve(i, j);",
            "while (l < r) { let mid = (l + r) >> 1; }",
            "return memo[n] = result;",
            "class SegmentTree { constructor(size) { ... } }",
            "std::vector<int> adj[MAXN];",
            "priority_queue<int, vector<int>, greater<int>> pq;",
            "import { useState, useEffect } from 'react';",
            "console.log('Hello World');",
            "void dfs(int u, int p) { vis[u] = true; }",
            "int query(int node, int start, int end) { ... }"
        ];

        const columns = Math.floor(width / 200);
        const drops = Array(columns).fill(0).map(() => ({
            y: Math.random() * height,
            speed: 0.5 + Math.random() * 0.5,
            text: snippets[Math.floor(Math.random() * snippets.length)],
            opacity: 0.1 + Math.random() * 0.2
        }));

        const draw = () => {
            // Clear with slight transparency for trail effect? No, we want clean text for this style.
            // But we need to clear the canvas.
            ctx.clearRect(0, 0, width, height);

            // We want a fixed position background style, but animated.
            // Actually, per spec: "Abstracted: Do not use Matrix rain. Instead, have very faint, large snippets of code... scrolling slowly... skewed at -15deg"

            ctx.save();
            // Apply skew
            ctx.transform(1, -0.26, 0, 1, 0, 0); // tan(-15deg) is approx -0.26

            ctx.font = '16px "JetBrains Mono", monospace';

            drops.forEach((drop, i) => {
                ctx.fillStyle = `rgba(33, 38, 45, ${drop.opacity})`; // #21262D
                ctx.fillText(drop.text, i * 250, drop.y);

                drop.y -= drop.speed; // Scroll upwards slowly? Or downwards? Usually code scrolls up as you write, or down as you read.
                // Spec says "scrolling slowly". Let's go upwards to simulate reading/history.
                // Wait, matrix rain goes down. Code scrolling usually implies reading.
                // Let's make it scroll UP (y decreases).

                if (drop.y < -50) {
                    drop.y = height + 50;
                    drop.text = snippets[Math.floor(Math.random() * snippets.length)];
                }
            });

            ctx.restore();

            requestAnimationFrame(draw);
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);
        const animationId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    );
};

export default CodeRainBackground;
