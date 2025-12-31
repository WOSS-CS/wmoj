"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", label, error, leftIcon, rightIcon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              block w-full rounded-lg bg-[#0d1117] border border-[#30363d]
              text-white placeholder-gray-500
              focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20 focus:outline-none
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? "pl-10" : "pl-4"}
              ${rightIcon ? "pr-10" : "pr-4"}
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
              ${className}
            `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-[#f85149] animate-fade-in-up">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
