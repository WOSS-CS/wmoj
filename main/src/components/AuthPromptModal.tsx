'use client';

import Link from 'next/link';

interface AuthPromptModalProps {
    message: string;
    onClose: () => void;
}

export function AuthPromptModal({ message, onClose }: AuthPromptModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                role="button" 
                tabIndex={0} 
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }} 
                className="absolute inset-0 bg-black/60" 
                onClick={onClose} 
                aria-label="Close modal"
            />

            {/* Modal */}
            <div className="relative bg-surface-1 border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-text-muted hover:text-foreground"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center space-y-4">
                    <div className="w-10 h-10 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>

                    <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Authentication Required</h3>
                        <p className="text-sm text-text-muted">{message}</p>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                        <Link
                            href="/auth/login"
                            className="h-10 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-secondary flex items-center justify-center"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="h-10 bg-surface-2 text-foreground text-sm font-medium rounded-lg hover:bg-surface-3 border border-border flex items-center justify-center"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
