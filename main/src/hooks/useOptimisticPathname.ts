'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

export function useOptimisticPathname() {
  const pathname = usePathname();
  const router = useRouter();
  const [optimisticPathname, setOptimisticPathname] = useOptimistic(pathname);
  const [, startTransition] = useTransition();

  const navigate = (href: string) => {
    // Clicking the already-active nav item used to push a duplicate history
    // entry, so Back appeared to do nothing.
    if (href === pathname) return;
    startTransition(() => {
      setOptimisticPathname(href);
      router.push(href);
    });
  };

  // Click handler for nav <Link>s. Prevents default for primary unmodified
  // clicks (so we can drive an optimistic highlight + client-side navigation),
  // but leaves modifier clicks (cmd/ctrl/shift/middle-click) untouched so the
  // browser can still open links in new tabs.
  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };

  return { pathname: optimisticPathname, navigate, handleNavClick };
}