'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditInvoicePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  useEffect(() => {
    if (id) {
      router.replace(`/invoices/${id}?tab=edit`);
    }
  }, [id, router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-100 dark:bg-[#020617]">
      <div className="text-center">
        <div className="mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        <p className="font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
          Syncing Editor Workspace...
        </p>
      </div>
    </div>
  );
}
