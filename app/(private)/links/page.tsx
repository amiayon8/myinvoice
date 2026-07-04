'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  listAllInvoiceTokens,
  createInvoiceShareToken,
  revokeInvoiceToken,
} from '@/services/invoices';
import { Invoice } from '@/types';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/skeleton';

export default function ShareLinksPage() {
  const supabase = createClient();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data states
  const [tokens, setTokens] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Search & Filters states
  const [linkSearch, setLinkSearch] = useState('');
  const [linkFilter, setLinkFilter] = useState<'all' | 'active' | 'revoked_expired'>('all');

  // Share Creator states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [shareLabel, setShareLabel] = useState('');
  const [shareNeverExpires, setShareNeverExpires] = useState(false);
  const [shareDays, setShareDays] = useState(30);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tokensRes, invoicesRes] = await Promise.all([
        listAllInvoiceTokens(),
        supabase
          .from('invoices')
          .select('*, items:invoice_items(*), client:clients(name), company:companies(name)')
          .order('created_at', { ascending: false }),
      ]);
      setTokens(tokensRes || []);
      setInvoices(invoicesRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load sharing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice first.');
      return;
    }
    setActionLoading(true);
    try {
      const tokenData = await createInvoiceShareToken(selectedInvoiceId, {
        label: shareLabel || undefined,
        neverExpires: shareNeverExpires,
        daysExpiry: shareNeverExpires ? undefined : shareDays,
      });
      const origin = window.location.origin;
      const fullUrl = `${origin}/invoices/token/${tokenData.token}`;
      setGeneratedLink(fullUrl);

      // Refresh token list
      const updatedTokens = await listAllInvoiceTokens();
      setTokens(updatedTokens);

      // Reset inputs
      setSelectedInvoiceId('');
      setShareLabel('');
      toast.success('Share link successfully generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate share link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this link? Anyone holding it will lose access immediately.')) return;
    try {
      await revokeInvoiceToken(tokenId);
      const updatedTokens = await listAllInvoiceTokens();
      setTokens(updatedTokens);
      toast.success('Link has been revoked.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke link.');
    }
  };

  // Calculate statistics
  const totalLinksCount = tokens.length;
  const activeLinksCount = tokens.filter(t => !t.revoked_at && (!t.expires_at || new Date(t.expires_at) > new Date())).length;
  const revokedExpiredCount = totalLinksCount - activeLinksCount;

  // Filter links
  const filteredTokens = tokens.filter((t) => {
    const isRevoked = !!t.revoked_at;
    const isExpired = !t.never_expires && t.expires_at && new Date(t.expires_at) < new Date();

    // Status filter
    if (linkFilter === 'active' && (isRevoked || isExpired)) return false;
    if (linkFilter === 'revoked_expired' && !isRevoked && !isExpired) return false;

    // Search query filter
    const query = linkSearch.toLowerCase();
    const invoiceNum = t.invoice?.invoice_number?.toLowerCase() || '';
    const clientName = t.invoice?.client?.name?.toLowerCase() || '';
    const label = t.label?.toLowerCase() || '';

    return invoiceNum.includes(query) || clientName.includes(query) || label.includes(query);
  });

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="bg-slate-200 dark:bg-slate-800 rounded w-48 h-7 animate-pulse"></div>
            <div className="bg-slate-100 dark:bg-slate-900 rounded w-64 h-3 animate-pulse"></div>
          </div>
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
            Share Links Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Create secure, temporary links to share invoices with clients, and revoke access instantly.
          </p>
        </div>
      </div>

      {/* Stats Cards (3 Columns) */}
      <div className="gap-5 grid grid-cols-1 md:grid-cols-3">

        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Total Links</span>
              <h3 className="mt-1 font-black text-slate-850 dark:text-white text-2xl tracking-tight">
                {totalLinksCount}
              </h3>
            </div>
            <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
              <i className="fa-solid fa-link text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Active Links</span>
              <h3 className="mt-1 font-black text-emerald-600 dark:text-emerald-400 text-2xl tracking-tight">
                {activeLinksCount}
              </h3>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-circle-check text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Revoked/Expired</span>
              <h3 className="mt-1 font-black text-rose-500 dark:text-rose-450 text-2xl tracking-tight">
                {revokedExpiredCount}
              </h3>
            </div>
            <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-600 dark:text-rose-400">
              <i className="fa-solid fa-ban text-lg"></i>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Layout for Creator & Table */}
      <div className="gap-8 grid grid-cols-1 lg:grid-cols-3">

        {/* Creator Panel (Left Side - 1 Column) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-6 rounded-2xl">
            <h3 className="mb-4 font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
              Quick Share Creator
            </h3>

            <form onSubmit={handleCreateShareLink} className="space-y-4">
              {/* Select Invoice */}
              <div>
                <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase tracking-wide">
                  Select Invoice
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                >
                  <option value="">-- Choose an Invoice --</option>
                  {invoices.map((inv) => {
                    const subtotal = inv.items?.reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0;
                    const taxAmount = subtotal * ((inv.tax_rate || 0) / 100);
                    const total = subtotal + taxAmount;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} ({inv.client?.name || 'No Client'} · {inv.company?.name || 'No Entity'}) - {total.toFixed(2)}{inv.currency}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Link Label */}
              <div>
                <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase tracking-wide">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via email to Client"
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                />
              </div>

              {/* Expiry Selector */}
              <div>
                <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase tracking-wide">
                  Expiry Period
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setShareNeverExpires(false); setShareDays(d); }}
                      className={`flex-1 min-w-[50px] py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${!shareNeverExpires && shareDays === d
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShareNeverExpires(true)}
                    className={`flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${shareNeverExpires
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    Never
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={actionLoading}
                className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-600/20 shadow-lg mt-2 py-3.5 rounded-xl w-full font-black text-white text-xs uppercase tracking-widest transition-all"
              >
                <i className={`fa-solid ${actionLoading ? 'fa-spinner animate-spin' : 'fa-link'}`}></i>
                {actionLoading ? 'Creating...' : 'Create Share Link'}
              </button>
            </form>

            {/* Generated Link Alert Box */}
            {generatedLink && (
              <div className="mt-6 space-y-3 bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-200 dark:border-emerald-800/40 rounded-xl animate-fade-in">
                <p className="font-black text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Share Link Created!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 bg-white dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-mono text-slate-700 dark:text-slate-300 text-xs"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success('Copied to clipboard!'); }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg font-black text-white text-xs transition-colors"
                  >
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Table (Right Side - 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden">

            {/* Header & Filtering Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-6 border-slate-100 dark:border-slate-800 border-b">
              <div>
                <h3 className="font-black text-slate-850 dark:text-white text-xs uppercase tracking-wider">
                  Active Share Links ({filteredTokens.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={linkFilter}
                  onChange={(e) => setLinkFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-xs dark:text-white"
                >
                  <option value="all">All Links</option>
                  <option value="active">Active Only</option>
                  <option value="revoked_expired">Revoked/Expired</option>
                </select>
                <div className="relative flex-1 sm:w-48">
                  <input
                    type="text"
                    placeholder="Search link..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full text-xs dark:text-white"
                  />
                  <i className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 text-[10px] fa-solid fa-search"></i>
                </div>
              </div>
            </div>

            {/* TABLE CONTENT */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/40 border-slate-250 dark:border-slate-800 border-b font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Label</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4">Views</th>
                    <th className="px-6 py-4">Copy Link</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredTokens.map((t) => {
                    const isRevoked = !!t.revoked_at;
                    const isExpired = !t.never_expires && t.expires_at && new Date(t.expires_at) < new Date();
                    const linkUrl = `${window.location.origin}/invoices/token/${t.token}`;

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors ${isRevoked || isExpired ? 'opacity-60 bg-slate-50/20 dark:bg-slate-950/10' : ''
                          }`}
                      >
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                              {t.invoice?.invoice_number || 'Deleted Invoice'}
                            </span>
                            <span className="font-semibold text-slate-400 text-[10px] tracking-tighter">
                              {t.invoice?.client?.name || 'Unknown Client'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-slate-700 dark:text-slate-350 text-xs">
                          {t.label || <span className="text-slate-400 italic">Untitled</span>}
                        </td>
                        <td className="px-6 py-4.5">
                          {isRevoked ? (
                            <span className="bg-orange-100 dark:bg-orange-950/30 px-2 py-0.5 rounded-full font-black text-[8px] text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                              Revoked
                            </span>
                          ) : isExpired ? (
                            <span className="bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-full font-black text-[8px] text-red-700 dark:text-red-400 uppercase tracking-wider">
                              Expired
                            </span>
                          ) : (
                            <span className="bg-emerald-100 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-black text-[8px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500 text-xs whitespace-nowrap">
                          {t.never_expires ? (
                            <span className="text-slate-400 dark:text-slate-500 italic">Never</span>
                          ) : (
                            new Date(t.expires_at).toLocaleDateString()
                          )}
                        </td>
                        <td className="px-6 py-4.5 font-bold text-indigo-500 text-sm">
                          {t.view_count || 0}
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              readOnly
                              value={linkUrl}
                              className="bg-slate-50 dark:bg-slate-950 px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-mono text-[10px] text-slate-400 w-36"
                            />
                            <button
                              onClick={() => { navigator.clipboard.writeText(linkUrl); toast.success('Copied!'); }}
                              className="hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Copy sharing link"
                            >
                              <i className="text-xs fa-solid fa-copy"></i>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          {!isRevoked && (
                            <button
                              onClick={() => handleRevokeToken(t.id)}
                              className="hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                              title="Revoke Link"
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTokens.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-slate-400 text-center italic text-xs">
                        No sharing links match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
