# Theme System Guide

This application now supports three themes:

## Available Themes

1. **Light Mode** - Clean, bright interface
2. **Dark Mode** - Standard dark theme with neutral colors
3. **Dark Green Mode** - DMOJ-inspired dark theme with green accents

## Theme Toggle Component

The `ThemeToggle` component (formerly `DarkModeToggle`) provides a dropdown menu to switch between themes:

```tsx
import { ThemeToggle } from "@/components/DarkModeToggle";

// Use in your component
<ThemeToggle />
```

## Theme Features

### Dark Green Mode
- Deep green background tones
- Green accent colors for interactive elements
- Enhanced visibility for coding interfaces
- Similar to DMOJ's visual style
- Green glow effects on hover

### Implementation Details

The theme system uses:
- CSS custom properties (CSS variables) for all colors
- Automatic theme persistence in localStorage
- Smooth transitions between themes
- OKLCH color space for better color consistency

### CSS Classes

The themes are applied via CSS classes on the `<html>` element:
- No class = Light mode
- `.dark` = Dark mode  
- `.dark-green` = Dark green mode

### Customizing Colors

Edit the CSS variables in `app/globals.css` to customize theme colors:

```css
.dark-green {
  --background: oklch(0.11 0.02 152);
  --primary: oklch(0.65 0.15 152);
  /* ... other variables */
}
```

### Usage in Components

Components automatically inherit the theme colors through CSS variables:

```tsx
// These will automatically adapt to the current theme
<div className="bg-background text-foreground">
  <div className="bg-card text-card-foreground">
    <button className="bg-primary text-primary-foreground">
      Button
    </button>
  </div>
</div>
```
