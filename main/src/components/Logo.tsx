import Image from 'next/image';
import Link from 'next/link';

const SIZE_MAP = {
  sm: 28,
  md: 36,
  lg: 48,
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
  const wrapperSize = imageSize + 14;
  const textSizeClass = TEXT_SIZE_MAP[size];

  const content = (
    <>
      <span
        className="relative flex items-center justify-center rounded-full border border-white/20 bg-white/5 shadow-[0_0_18px_rgba(34,197,94,0.18)]"
        style={{ width: wrapperSize, height: wrapperSize }}
      >
        <span className="absolute inset-0 rounded-full bg-green-400/15 blur-md" aria-hidden />
        <Image
          src="/logo.png"
          alt="WMOJ logo"
          width={imageSize}
          height={imageSize}
          priority={priority}
          className="relative z-10 h-[70%] w-[70%] object-contain"
        />
      </span>
      {withText && (
        <span className={`flex flex-col items-start leading-none ${textSizeClass} font-semibold tracking-wide text-white transition-colors duration-300 ${textClassName}`}>
          <span>
            <span className="text-green-400 inline-block">
              W
            </span>
            <span className="ml-0.5">MOJ</span>
          </span>
          {badge && (
            <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-green-400/80">
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
