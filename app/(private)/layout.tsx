'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { useTheme } from 'next-themes';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Map active route to ViewType ID
  let currentView = 'dashboard';
  if (pathname.startsWith('/invoices')) {
    currentView = 'invoices';
  } else if (pathname.startsWith('/loans')) {
    currentView = 'loans';
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
  }

  const handleViewChange = (view: string) => {
    if (view === 'dashboard') router.push('/dashboard');
    else if (view === 'invoices') router.push('/invoices');
    else if (view === 'loans') router.push('/loans');
    else if (view === 'clients') router.push('/clients');
    else if (view === 'companies') router.push('/companies');
    else if (view === 'sources') router.push('/sources');
    else if (view === 'links') router.push('/links');
    else if (view === 'logs') router.push('/links/logs');
    else if (view === 'documents') router.push('/documents');
  };

  return (
    <div className="flex bg-slate-50 dark:bg-[#020617] w-full min-h-screen transition-colors duration-500">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        theme={(mounted ? theme : 'light') as 'light' | 'dark'}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="relative flex flex-col flex-1 h-screen overflow-hidden">
        {/* Toggle button for mobile sidebar */}
        <div className="lg:hidden flex justify-between items-center bg-white dark:bg-slate-900 p-4 border-slate-200 dark:border-slate-800 border-b no-print">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg text-slate-500 transition-colors"
          >
            <i className="text-xl fa-solid fa-bars"></i>
          </button>
          <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            My Invoice Pro
          </span>
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white dark:text-slate-400"
          >
            <i className={`fa-solid ${mounted && theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
        </div>

        <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
          <div className='pb-8'>{children}</div>
        </div>
      </main>
    </div>
  );
}
