'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

interface AuthPromptModalProps {
    message: string;
    onClose: () => void;
}

export function AuthPromptModal({ message, onClose }: AuthPromptModalProps) {
    return (
        <Modal
            open
            onClose={onClose}
            title="Authentication Required"
            hideTitle
            className="max-w-sm"
        >
            <div className="text-center space-y-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <div>
                    <p className="text-base font-semibold text-foreground mb-1">Authentication Required</p>
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
        </Modal>
    );
}
