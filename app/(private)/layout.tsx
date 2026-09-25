'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { useTheme } from 'next-themes';
import { Menu, Sun, Moon } from 'lucide-react';

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  let currentView = 'dashboard';
  if (pathname.startsWith('/tuition')) {
    currentView = 'tuition';
  } else if (pathname.startsWith('/invoices')) {
    currentView = 'invoices';
  } else if (pathname.startsWith('/notes')) {
    currentView = 'notes';
  } else if (pathname.startsWith('/loans')) {
    currentView = 'loans';
  } else if (pathname.startsWith('/attendx')) {
    currentView = 'attendx';
  } else if (pathname.startsWith('/payment-methods')) {
    currentView = 'payment-methods';
  } else if (pathname.startsWith('/clients')) {
    currentView = 'clients';
  } else if (pathname.startsWith('/companies')) {
    currentView = 'companies';
  } else if (pathname.startsWith('/sources')) {
    currentView = 'sources';
  } else if (pathname.startsWith('/links/logs')) {
    currentView = 'logs';
  } else if (pathname.startsWith('/links')) {
    currentView = 'links';
  } else if (pathname.startsWith('/documents')) {
    currentView = 'documents';
  } else if (pathname.startsWith('/subscriptions')) {
    currentView = 'subscriptions';
  }

  const handleViewChange = (view: string) => {
    if (view === 'dashboard') router.push('/dashboard');
    else if (view === 'tuition') router.push('/tuition');
    else if (view === 'invoices') router.push('/invoices');
    else if (view === 'notes') router.push('/notes');
    else if (view === 'loans') router.push('/loans');
    else if (view === 'attendx') router.push('/attendx');
    else if (view === 'payment-methods') router.push('/payment-methods');
    else if (view === 'clients') router.push('/clients');
    else if (view === 'companies') router.push('/companies');
    else if (view === 'sources') router.push('/sources');
    else if (view === 'links') router.push('/links');
    else if (view === 'logs') router.push('/links/logs');
    else if (view === 'documents') router.push('/documents');
    else if (view === 'subscriptions') router.push('/subscriptions');
  };

  return (
    <div className="flex bg-zinc-100/60 dark:bg-zinc-950 w-full min-h-screen">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        theme={(mounted ? theme : 'light') as 'light' | 'dark'}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="relative flex flex-col flex-1 h-screen overflow-hidden min-w-0">
        <div className="md:hidden flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-3 border-zinc-200 dark:border-zinc-800 border-b no-print shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight">
            My Invoice
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 dark:text-zinc-400"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
          <div className="pb-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
