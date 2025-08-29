import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

interface DarkModeToggleProps {
  className?: string;
}

export function DarkModeToggle({ className = "" }: DarkModeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is already enabled
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else if (savedDarkMode === 'false') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      }
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      className={`relative transition-all duration-200 hover:bg-accent ${isDark ? 'hover:shadow-md hover:shadow-green-500/20' : ''} ${className}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className={`w-4 h-4 transition-all duration-300 ${isDark ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}`} />
      <Moon className={`absolute w-4 h-4 transition-all duration-300 ${isDark ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} />
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
