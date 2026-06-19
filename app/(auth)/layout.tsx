import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#020617]">
      {children}
    </div>
  );
}
