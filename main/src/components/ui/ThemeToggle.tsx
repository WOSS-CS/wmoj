"use client";

// Dark mode does not exist in this app: `<html className="light">` is hardcoded
// and ThemeContext returns a frozen `{ theme: 'light' }`. This is the
// deliberate no-op left behind for the four `app/auth/**` clients that still
// render it; it takes no props because no call site passes any.
export const ThemeToggle = () => null;
