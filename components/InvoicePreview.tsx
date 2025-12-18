
import React from 'react';
import { InvoiceData, CompanyProfile } from '../types';

interface InvoicePreviewProps {
  data: InvoiceData;
  company: CompanyProfile;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, company }) => {
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount;

  if (!company) return <div className="bg-white shadow-xl p-12 rounded-lg text-slate-400 italic">Loading entity profile...</div>;

  return (
    <div className="relative bg-white shadow-2xl print:!shadow-none mx-auto p-12 print:p-12 w-[210mm] min-h-[297mm] overflow-hidden font-sans text-slate-800 text-sm invoice-container">

      {/* Dynamic Brand Stripe */}
      <div className="top-0 left-0 absolute w-2 h-full print:no-print" style={{ backgroundColor: company.color }}></div>

      {/* Header Grid */}
      <div className="gap-8 grid grid-cols-2 mb-4">
        <div className="flex flex-col items-start text-start">
          {company.logo_url ? (
            <img src={company.logo_url} alt="Logo" className="mb-4 border border-slate-100 rounded-lg w-64 h-auto object-contain" />
          ) : (
            <h2 className="font-black text-slate-900 text-2xl leading-tight" style={{ color: company.color }}>{company.name || 'Your Company Name'}</h2>
          )}
          <p className="max-w-[220px] font-medium text-[10px] text-slate-500 italic leading-relaxed">{company.address}</p>
          <div className="flex flex-col items-start gap-1 mt-4 font-medium text-[10px] text-slate-600">
            {company.phone && (
              <span className="flex items-center gap-2 text-xs leading-relaxed"><i className="text-slate-500 fa-solid fa-phone"></i> {company.phone}</span>
            )}
            {company.email && (
              <span className="flex items-center gap-2 text-xs leading-relaxed"><i className="text-slate-500 fa-solid fa-envelope"></i> {company.email}</span>
            )}
            {company.website && (
              <span className="flex items-center gap-2 text-xs leading-relaxed"><i className="text-slate-500 fa-solid fa-globe"></i> {company.website}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end text-end">
          <h1 className="mb-4 font-black text-6xl tracking-tighter" style={{ color: company.color }}>INVOICE</h1>
          <div className="flex items-center gap-4">
            <p className="font-black text-slate-900 text-xs uppercase tracking-widest">#{data.invoiceNumber}</p>
            {data.isRecurring && (
              <span className="bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded font-black text-[9px] text-indigo-600 uppercase tracking-tighter">
                <i className="mr-1 fa-solid fa-arrows-rotate"></i> Recurring {data.recurringFrequency}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-100 mb-6 w-full h-0.5"></div>

      {/* Bill To & Metadata */}
      <div className="gap-12 grid grid-cols-2 mb-6">
        <div>
          <h3 className="flex items-center gap-2 mb-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
            <span className="print:hidden bg-slate-400 w-4 h-1"></span> Bill To
          </h3>
          <div className="mb-2 font-black text-slate-900 text-2xl leading-tight">{data.client.name || 'Recipient'}</div>
          <p className="max-w-[280px] font-medium text-slate-500 text-xs leading-relaxed">
            {data.client.address}
          </p>
          <div className="flex flex-col gap-2 mt-4">
            {data.client.email && (
              <div className="flex items-center gap-2 font-bold text-xs">
                <i className="fa-solid fa-at"></i>
                <span>{data.client.email}</span>
              </div>
            )}
            {data.client.phone && (
              <div className="flex items-center gap-2 font-bold text-xs">
                <i className="fa-solid fa-phone"></i>
                <span>{data.client.phone}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="space-y-6 w-full text-right">
            <div className="pb-4 border-slate-50 border-b">
              <p className="mb-1 font-black text-[9px] text-slate-400 uppercase tracking-widest">Date Created</p>
              <p className="font-black text-slate-900 text-lg">{new Date(data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-slate-900 border-b-2">
              <th className="py-4 font-black text-[9px] text-slate-900 text-left uppercase tracking-[0.3em]">Description</th>
              <th className="py-4 font-black text-[9px] text-slate-900 text-center uppercase tracking-[0.3em]">Qty</th>
              <th className="py-4 font-black text-[9px] text-slate-900 text-right uppercase tracking-[0.3em]">Rate</th>
              <th className="py-4 font-black text-[9px] text-slate-900 text-right uppercase tracking-[0.3em]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.length > 0 ? data.items.map((item) => (
              <tr key={item.id}>
                <td className="py-6 pr-8 align-middle">
                  <p className="font-black text-slate-900 text-sm">{item.description}</p>
                </td>
                <td className="py-6 font-black text-slate-600 text-sm text-center align-middle">{item.quantity}</td>
                <td className="py-6 font-black text-slate-600 text-sm text-right align-middle">{data.currency}{item.rate.toLocaleString()}</td>
                <td className="py-6 font-black text-slate-900 text-sm text-right align-middle">
                  {data.currency}{(item.quantity * item.rate).toLocaleString()}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="py-12 text-slate-400 text-center italic">No item listed yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="items-start gap-8 grid grid-cols-2">
        {/* Footer Notes */}
        {data.notes && (
          <div className="bg-slate-50 p-8 rounded-lg">
            <h3 className="mb-2 font-black text-[9px] text-indigo-500 italic uppercase tracking-[0.3em]">Official Notes</h3>
            <p className="font-medium text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
              {data.notes}
            </p>
          </div>
        )}

        {/* Summary Section */}
        <div className="flex justify-end mb-16">
          <div className="space-y-4 w-72">
            <div className="flex justify-between items-center text-slate-400">
              <span className="font-black text-[9px] uppercase tracking-widest">Subtotal</span>
              <span className="font-black text-slate-900 text-base">{data.currency}{subtotal.toLocaleString()}</span>
            </div>
            {data.taxRate > 0 && (
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-black text-[9px] uppercase tracking-widest">Tax ({data.taxRate}%)</span>
                <span className="font-black text-slate-900 text-base">{data.currency}{taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-6 border-slate-900 border-t">
              <span className="font-black text-[10px] text-slate-900 uppercase tracking-[0.2em]">Total Amount</span>
              <span className="font-black text-slate-900 text-2xl leading-none">{data.currency}{total.toLocaleString()}</span>
            </div>
            {data.paid_amount > 0 && (
              <div className="flex justify-between items-center pt-4">
                <span className="font-black text-[10px] text-slate-900 uppercase tracking-[0.2em]">Paid</span>
                <span className="font-black text-slate-900 text-xl leading-none">{data.currency}{data.paid_amount.toLocaleString()}</span>
              </div>
            )}
            {data.paid_amount > 0 && (
              <div className="flex justify-between items-center pt-4">
                <span className="font-black text-[10px] text-slate-900 uppercase tracking-[0.2em]">Due</span>
                <span className="font-black text-slate-900 text-2xl leading-none">{data.currency}{(total - data.paid_amount).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature & Page Stamp */}
      <div className="right-12 bottom-12 left-12 absolute flex justify-between items-end pt-8 border-slate-100 border-t font-black text-[8px] text-slate-300 uppercase">
        <div className="flex flex-col gap-1">
          <span>{new Date().toLocaleString()}</span>
        </div>
        <div className="font-normal text-[8px] text-right">
          <span style={{ color: company.color }}>This is a system generated invoice and doesn't require a signature.</span>
        </div>
      </div>
    </div>
  );
};
