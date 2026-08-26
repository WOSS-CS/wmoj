"use client";

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

/**
 * The accessible text input for this app.
 *
 * It has no importers yet — every form here is hand-rolled — but it is the
 * component the next form will reach for, so it wires up the parts those forms
 * are missing: the `<label>` is bound to the input by id, the error text is
 * announced through `aria-describedby` + `aria-invalid`, and an explicit `id`
 * from the caller still wins.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", label, error, leftIcon, rightIcon, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id ?? `input-${generatedId}`;
        const errorId = `${inputId}-error`;
        const describedBy = [error ? errorId : null, props["aria-describedby"]]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-text-muted mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div aria-hidden="true" className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={error ? true : undefined}
                        className={`
                            block w-full h-10 rounded-lg bg-surface-2 border border-border
                            text-foreground text-sm placeholder:text-text-muted/50
                            focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${leftIcon ? "pl-10" : "px-3"}
                            ${rightIcon ? "pr-10" : "px-3"}
                            ${error ? "border-error focus:border-error focus:ring-error/20" : ""}
                            ${className}
                        `}
                        {...props}
                        aria-describedby={describedBy}
                    />
                    {rightIcon && (
                        <div aria-hidden="true" className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={errorId} className="mt-1.5 text-sm text-error">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
