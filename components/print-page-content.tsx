'use client';

import React, { useEffect, useState } from 'react';
import { InvoicePreview } from '@/components/invoice-preview';
import { CompanyProfile } from '@/types';

interface PrintPageContentProps {
  previewData: any;
  company: CompanyProfile;
}

export function PrintPageContent({ previewData, company }: PrintPageContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleAfterPrint = () => {
      window.close();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Wait for styling and brand logo images to load before prompting print dialog
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-6 print:py-0 transition-colors duration-500">
      {/* Dynamic top bar - hidden from printable sheet */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Print Preview Mode
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/10"
        >
          <i className="fa-solid fa-print"></i> Print / Save PDF
        </button>
      </div>

      <div className="print:m-0 print:p-0 shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
        <InvoicePreview data={previewData} company={company} />
      </div>
    </div>
  );
}

export default PrintPageContent;
