'use client';

import React from 'react';

interface PublicHeaderProps {
  token?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ token }) => {
  const handlePrint = () => {
    if (token) {
      window.open(`/invoices/token/${token}/print`, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 no-print bg-white dark:bg-slate-900 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-shield-halved text-emerald-500"></i>
        <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Invoice | The Nice Developer
        </span>
      </div>
      <button
        onClick={handlePrint}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded transition-colors"
      >
        <i className="fa-solid fa-print mr-2"></i> Print Invoice
      </button>
    </div>
  );
};
export default PublicHeader;
