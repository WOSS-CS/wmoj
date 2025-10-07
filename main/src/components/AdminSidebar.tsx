"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-300 border";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items: NavItem[] = [
    {
      href: '/admin/dashboard',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/dashboard'),
    },
    {
      href: '/admin/usermanagement',
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M7 10a4 4 0 118 0 4 4 0 01-8 0z" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/usermanagement'),
    },
    {
      href: '/admin/contests/create',
      label: 'Create Contest',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/contests/create'),
    },
    {
      href: '/admin/problems/create',
      label: 'Create Problem',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/problems/create'),
    },
    {
      href: '/admin/problems/manage',
      label: 'Manage Problems',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/problems/manage'),
    },
    {
      href: '/admin/contests/manage',
      label: 'Manage Contests',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      ),
      match: (p) => p.startsWith('/admin/contests/manage'),
    },
    {
      href: '/dashboard',
      label: 'User Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      match: (p) => p === '/dashboard',
    },
  ];

  return (
    <aside className="w-64 bg-white/5 backdrop-blur-lg border-r border-white/10 min-h-screen flex flex-col">
      <div className="h-16 border-b border-white/10" />
      <nav className="p-4 space-y-2 flex-1">
        {items.map(item => {
          const active = item.match(pathname || '');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${baseClasses} ${active ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-300 hover:text-white hover:bg-white/10 border-transparent'}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-[10px] text-gray-500 tracking-wide uppercase">Admin Navigation</div>
    </aside>
  );
}
