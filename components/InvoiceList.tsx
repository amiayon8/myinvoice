
import React from 'react';
import { Invoice } from '../types';

interface InvoiceListProps {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onDuplicate: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onEdit, onDuplicate, onDelete, onAddNew }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'sent': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'overdue': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 lg:p-6 border-slate-100 dark:border-dark-border border-b">
        <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Recent Records</h2>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-colors"
        >
          <i className="fa-solid fa-plus"></i> New
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Paid</th>
              <th className="px-6 py-4">Due</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-card divide-y divide-slate-100 dark:divide-dark-border">
            {invoices.map((invoice) => {
              const amount = invoice.items?.reduce((sum, i) => sum + (i.quantity * i.rate), 0) || 0;
              return (
                <tr key={invoice.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{invoice.invoice_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800 dark:text-slate-300 text-sm">{invoice.client?.name || '---'}</span>
                      <span className="font-black text-[10px] text-slate-400 uppercase tracking-tighter">{invoice.company?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs">
                    {new Date(invoice.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">{invoice.currency}{amount.toLocaleString()}</td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">{invoice.currency}{invoice.paid_amount.toLocaleString()}</td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">{invoice.currency}{(amount - invoice.paid_amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 lg:opacity-20 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onDuplicate(invoice)} className="p-2 text-slate-400 hover:text-indigo-600" title="Duplicate">
                        <i className="fa-solid fa-copy"></i>
                      </button>
                      <button onClick={() => onEdit(invoice)} className="p-2 text-slate-400 hover:text-indigo-600" title="Edit">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button onClick={() => onDelete(invoice.id)} className="p-2 text-slate-400 hover:text-red-500" title="Delete">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-slate-400 dark:text-slate-500 text-sm text-center italic">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
