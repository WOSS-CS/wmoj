import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  className?: string;
}

type Theme = "light" | "dark" | "dark-green";

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Check current theme
    const html = document.documentElement;
    if (html.classList.contains('dark-green')) {
      setTheme('dark-green');
    } else if (html.classList.contains('dark')) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    
    // Remove all theme classes
    html.classList.remove('dark', 'dark-green');
    
    // Apply new theme
    if (newTheme !== 'light') {
      html.classList.add(newTheme);
    }
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'dark-green'].includes(savedTheme)) {
      applyTheme(savedTheme);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => applyTheme('light')}
        className="relative transition-all duration-200"
        title="Light theme"
      >
        <Sun className="w-4 h-4" />
        <span className="sr-only">Light theme</span>
      </Button>
      
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => applyTheme('dark')}
        className="relative transition-all duration-200"
        title="Dark theme"
      >
        <Moon className="w-4 h-4" />
        <span className="sr-only">Dark theme</span>
      </Button>
      
      <Button
        variant={theme === 'dark-green' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => applyTheme('dark-green')}
        className={`relative transition-all duration-200 ${theme === 'dark-green' ? 'hover:shadow-md hover:shadow-green-500/20' : ''}`}
        title="Dark green theme"
      >
        <Palette className="w-4 h-4 text-green-400" />
        <span className="sr-only">Dark green theme</span>
      </Button>
    </div>
  );
}

// Keep the old export name for backward compatibility
export function DarkModeToggle(props: ThemeToggleProps) {
  return <ThemeToggle {...props} />;
}
