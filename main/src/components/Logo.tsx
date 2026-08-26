import Image from 'next/image';
import Link from 'next/link';

// These are the sizes actually rendered. The map used to claim 28/36/48 while
// the component drew at `imageSize + 14`, so `size="md"` was a 50px logo
// described as 36 — the numbers below are the real ones, pixel-for-pixel
// identical to what shipped.
const SIZE_MAP = {
  sm: 42,
  md: 50,
  lg: 62,
} as const;

const TEXT_SIZE_MAP = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const;

export type LogoSize = keyof typeof SIZE_MAP;

interface LogoProps {
  className?: string;
  textClassName?: string;
  withText?: boolean;
  size?: LogoSize;
  href?: string | null;
  priority?: boolean;
  badge?: string;
}

export function Logo({
  className = '',
  textClassName = '',
  withText = true,
  size = 'md',
  href = '/',
  priority = false,
  badge,
}: LogoProps) {
  const imageSize = SIZE_MAP[size];
  const textSizeClass = TEXT_SIZE_MAP[size];

  const content = (
    <>
      <Image
        src="/logo.png"
        alt="WMOJ logo"
        width={imageSize}
        height={imageSize}
        priority={priority}
        className="object-contain"
      />
      {withText && (
        <span className={`flex flex-col items-start leading-none ${textSizeClass} font-semibold tracking-wide text-foreground ${textClassName}`}>
          <span>
            <span>WM</span>
            <span className="text-brand-primary">::</span>
            <span>OJ</span>
          </span>
          {badge && (
            <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-primary/80">
              {badge}
            </span>
          )}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <div className={`group inline-flex items-center gap-3 ${className}`} aria-label="WMOJ logo">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={`group inline-flex items-center gap-3 ${className}`} aria-label="WMOJ home">
      {content}
    </Link>
  );
}
