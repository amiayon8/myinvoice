'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  deleteInvoice,
  saveInvoice,
  generateRecurringInstanceAction,
  createInvoiceShareToken,
  revokeInvoiceToken,
  listInvoiceTokens,
  listInvoiceViewLogs,
} from '@/services/invoices';
import { Invoice } from '@/types';
import { useToast } from '@/components/ui/toast';
import { calculateNextGenDate } from '@/lib/date-utils';
import { TableSkeleton } from '@/components/skeleton';

export default function InvoicesPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'recurring'>('all');

  // Manage Invoice & Recurring Modal State
  const [selectedManageInvoice, setSelectedManageInvoice] = useState<Invoice | null>(null);
  const [manageInvoiceNumber, setManageInvoiceNumber] = useState('');
  const [manageStatus, setManageStatus] = useState<string>('draft');
  const [manageDate, setManageDate] = useState('');
  const [manageNotes, setManageNotes] = useState('');
  const [manageCurrency, setManageCurrency] = useState('');
  const [manageTaxRate, setManageTaxRate] = useState(0);
  const [manageIsRecurring, setManageIsRecurring] = useState(false);
  const [manageRecurringFrequency, setManageRecurringFrequency] = useState<string>('monthly');
  const [manageNextGenDate, setManageNextGenDate] = useState('');
  const [isSavingManager, setIsSavingManager] = useState(false);
  const [batchMonths, setBatchMonths] = useState(3);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [recurringLogs, setRecurringLogs] = useState<any[]>([]);
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});

  // Share Link Manager state
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);
  const [shareTab, setShareTab] = useState<'create' | 'tokens' | 'logs'>('create');
  const [shareLabel, setShareLabel] = useState('');
  const [shareNeverExpires, setShareNeverExpires] = useState(false);
  const [shareDays, setShareDays] = useState(30);
  const [shareTokens, setShareTokens] = useState<any[]>([]);
  const [shareLogs, setShareLogs] = useState<any[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const toggleExpandTemplate = (id: string) => {
    setExpandedTemplates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getChildrenForParent = (parentId: string) => {
    const childIds = recurringLogs
      .filter((l) => l.parent_invoice_id === parentId)
      .map((l) => l.child_invoice_id);
    return invoices.filter((inv) => childIds.includes(inv.id));
  };

  const openShareModal = useCallback(async (invoice: Invoice) => {
    setShareInvoice(invoice);
    setShareTab('create');
    setShareLabel('');
    setShareNeverExpires(false);
    setShareDays(30);
    setGeneratedLink(null);
    setShareLoading(true);
    try {
      const [tokens, logs] = await Promise.all([
        listInvoiceTokens(invoice.id),
        listInvoiceViewLogs(invoice.id),
      ]);
      setShareTokens(tokens);
      setShareLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setShareLoading(false);
    }
  }, []);

  const handleCreateShareLink = async () => {
    if (!shareInvoice) return;
    setShareLoading(true);
    try {
      const tokenData = await createInvoiceShareToken(shareInvoice.id, {
        label: shareLabel || undefined,
        neverExpires: shareNeverExpires,
        daysExpiry: shareNeverExpires ? undefined : shareDays,
      });
      const origin = window.location.origin;
      setGeneratedLink(`${origin}/invoices/token/${tokenData.token}`);
      const tokens = await listInvoiceTokens(shareInvoice.id);
      setShareTokens(tokens);
      setShareLabel('');
      toast.success('Share link generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Revoke this link? Anyone with it will no longer be able to view the invoice.')) return;
    try {
      await revokeInvoiceToken(tokenId);
      const tokens = await listInvoiceTokens(shareInvoice!.id);
      setShareTokens(tokens);
      toast.success('Link revoked.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke');
    }
  };



  const handleOpenManager = (invoice: Invoice) => {
    setSelectedManageInvoice(invoice);
    setManageInvoiceNumber(invoice.invoice_number || '');
    setManageStatus(invoice.status || 'draft');
    setManageDate(invoice.date || '');
    setManageNotes(invoice.notes || '');
    setManageCurrency(invoice.currency || '৳ ');
    setManageTaxRate(invoice.tax_rate || 0);
    setManageIsRecurring(invoice.is_recurring || false);
    setManageRecurringFrequency(invoice.recurring_frequency || 'monthly');
    setManageNextGenDate(invoice.next_generation_date || '');
    setBatchMonths(3);
  };

  const handleSaveManager = async () => {
    if (!selectedManageInvoice) return;
    setIsSavingManager(true);
    try {
      const updatedData = {
        ...selectedManageInvoice,
        invoice_number: manageInvoiceNumber,
        status: manageStatus as any,
        date: manageDate,
        notes: manageNotes,
        currency: manageCurrency,
        tax_rate: manageTaxRate,
        is_recurring: manageIsRecurring,
        recurring_frequency: manageRecurringFrequency as any,
        next_generation_date: manageIsRecurring ? (manageNextGenDate || new Date().toISOString().split('T')[0]) : null,
      };

      await saveInvoice(updatedData, selectedManageInvoice.items || []);
      toast.success('Invoice details updated successfully.');
      setSelectedManageInvoice(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating invoice.');
    } finally {
      setIsSavingManager(false);
    }
  };

  const handleStopRecurringInModal = async () => {
    if (!selectedManageInvoice) return;
    setIsProcessingAction(true);
    try {
      const updatedData = {
        ...selectedManageInvoice,
        is_recurring: false,
      };
      await saveInvoice(updatedData, selectedManageInvoice.items || []);
      setManageIsRecurring(false);
      toast.success('Recurring billing stopped.');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error stopping recurring.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGenerateRecurringNow = async () => {
    if (!selectedManageInvoice) return;
    setIsProcessingAction(true);
    try {
      const result = await generateRecurringInstanceAction(selectedManageInvoice.id, 1);
      toast.success(`Successfully generated 1 invoice: ${result.generated[0].invoice_number}`);
      if (result.nextScheduledDate) {
        setManageNextGenDate(result.nextScheduledDate);
      }
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error generating recurring invoice.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGenerateMultipleMonths = async () => {
    if (!selectedManageInvoice) return;
    if (batchMonths <= 0) {
      toast.error('Please enter a valid number of months.');
      return;
    }
    setIsProcessingAction(true);
    try {
      const result = await generateRecurringInstanceAction(selectedManageInvoice.id, batchMonths);
      toast.success(`Successfully generated ${result.generatedCount} invoice instance(s).`);
      if (result.nextScheduledDate) {
        setManageNextGenDate(result.nextScheduledDate);
      }
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error generating recurring invoices.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, logsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, items:invoice_items(*), client:clients(*), company:companies(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('recurring_invoices')
          .select('*')
      ]);

      if (invRes.error) throw invRes.error;

      setInvoices(invRes.data || []);
      setRecurringLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted successfully.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting invoice');
    }
  };

  const handleDuplicate = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Duplicate this invoice?')) return;
    try {
      const { id, items, client, company, created_at, ...cleanInvoice } = invoice;
      const duplicatedData = {
        ...cleanInvoice,
        invoice_number: `${cleanInvoice.invoice_number}-COPY`,
        status: 'draft' as const,
        paid_amount: 0,
      };
      const cleanItems = items?.map(({ id: _id, invoice_id: _inv_id, ...item }) => item) || [];
      await saveInvoice(duplicatedData, cleanItems);
      toast.success('Invoice duplicated.');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error duplicating invoice');
    }
  };

  const childInvoiceIds = new Set(recurringLogs.map((l) => l.child_invoice_id));
  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'recurring') return inv.is_recurring;
    return inv.status === filter;
  });

  const showGrouped = filter === 'all' || filter === 'recurring';

  const displayInvoices = showGrouped
    ? filteredInvoices.filter((inv) => !childInvoiceIds.has(inv.id))
    : filteredInvoices;

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans animate-fade-in">
        <div className="flex justify-between items-center mb-8 no-print">
          <div className="space-y-2">
            <div className="bg-slate-200 dark:bg-slate-800 rounded w-48 h-7 animate-pulse"></div>
            <div className="bg-slate-100 dark:bg-slate-900 rounded w-64 h-3 animate-pulse"></div>
          </div>
        </div>
        <TableSkeleton rows={8} cols={8} />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full">
      <div className="flex justify-between items-center mb-8 no-print">
        <div>
          <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
            Master Registry
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Manage your billing records, tracking state and access tokens.
          </p>
        </div>
        <button
          onClick={() => router.push('/invoices/new')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-lg px-6 py-3 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-colors"
        >
          <i className="fa-solid fa-plus"></i> Create Invoice
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-slate-200 dark:border-slate-800 border-b">
        {(['all', 'draft', 'sent', 'paid', 'overdue', 'recurring'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${filter === t
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table Grid */}
      <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 border-b font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {displayInvoices.map((invoice) => {
                const isTemplate = invoice.is_recurring;
                const children = isTemplate ? getChildrenForParent(invoice.id) : [];
                const isExpanded = expandedTemplates[invoice.id];

                const amount = invoice.items?.reduce((sum, i) => sum + (i.quantity * i.rate), 0) || 0;
                const paid = invoice.paid_amount || 0;
                const due = amount - paid;

                // Combined children stats for templates
                const totalChildrenCount = children.length;
                const totalChildrenValue = children.reduce((sum, child) => {
                  return sum + (child.items?.reduce((s, i) => s + (i.quantity * i.rate), 0) || 0);
                }, 0);
                const totalChildrenPaid = children.reduce((sum, child) => sum + (child.paid_amount || 0), 0);
                const totalChildrenDue = totalChildrenValue - totalChildrenPaid;

                if (isTemplate && showGrouped) {
                  return (
                    <React.Fragment key={invoice.id}>
                      {/* Accordion Header Row */}
                      <tr
                        onClick={() => totalChildrenCount > 0 && toggleExpandTemplate(invoice.id)}
                        className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${totalChildrenCount > 0 ? 'cursor-pointer' : ''} ${isExpanded ? 'border-l-4 border-indigo-500' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {totalChildrenCount > 0 && (
                              <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-indigo-500 text-xs transition-transform duration-200`}></i>
                            )}
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                              {invoice.invoice_number}
                            </span>
                            <span className="bg-indigo-100 dark:bg-indigo-950/40 ml-1 px-2 py-0.5 rounded-full font-black text-[8px] text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                              MAIN
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-300 text-sm">
                              {invoice.client?.name || '---'}
                            </span>
                            <span className="font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                              {invoice.company?.name || '---'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Freq: {invoice.recurring_frequency}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Next: {invoice.next_generation_date}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs">
                          {totalChildrenCount} Invoices
                        </td>
                        <td className="px-6 py-4 font-black text-black dark:text-white text-sm">
                          {invoice.currency}
                          {totalChildrenPaid.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 font-black text-sm ${totalChildrenDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                          {invoice.currency}
                          {totalChildrenDue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full font-black text-[8px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            Recurring
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openShareModal(invoice)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Share Link"
                            >
                              <i className="fa-solid fa-link"></i>
                            </button>
                            <button
                              onClick={() => window.open(`/invoices/${invoice.id}/print`, '_blank')}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Print"
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                            <button
                              onClick={() => handleOpenManager(invoice)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Manage Invoice & Recurring"
                            >
                              <i className="fa-solid fa-gears"></i>
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(invoice, e)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Duplicate"
                            >
                              <i className="fa-solid fa-copy"></i>
                            </button>
                            <button
                              onClick={() => router.push(`/invoices/${invoice.id}?tab=edit`)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              onClick={(e) => handleDelete(invoice.id, e)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Content Row (Children Invoices) */}
                      {isExpanded && totalChildrenCount > 0 && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border-indigo-500 border-l-4">
                            <div className="space-y-3 pl-6">
                              <div className="flex justify-between items-center pb-2 border-slate-100 dark:border-slate-800 border-b">
                                <span className="font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                  Generated Child Invoices ({totalChildrenCount})
                                </span>
                                <span className="font-black text-[10px] text-indigo-500 uppercase">
                                  Combined Total: {invoice.currency}{totalChildrenValue.toLocaleString()}
                                </span>
                              </div>
                              {children.length === 0 ? (
                                <p className="py-2 text-slate-400 text-xs italic">
                                  No instances generated yet. Use the cron task or trigger manually from the gears panel.
                                </p>
                              ) : (
                                <div className="bg-white dark:bg-slate-900/60 shadow-inner border border-slate-100 dark:border-slate-800/85 rounded-lg overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 border-b font-black text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      <tr>
                                        <th className="px-4 py-2">Invoice #</th>
                                        <th className="px-4 py-2">Issue Date</th>
                                        <th className="px-4 py-2">Total Amount</th>
                                        <th className="px-4 py-2">Paid Amount</th>
                                        <th className="px-4 py-2">Due Amount</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                      {children.map((child) => {
                                        const childAmount = child.items?.reduce((s, i) => s + (i.quantity * i.rate), 0) || 0;
                                        const childPaid = child.paid_amount || 0;
                                        const childDue = childAmount - childPaid;
                                        return (
                                          <tr
                                            key={child.id}
                                            onClick={() => router.push(`/invoices/${child.id}`)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                                          >
                                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-200">
                                              {child.invoice_number}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                                              {new Date(child.date).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                              })}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold">
                                              {child.currency}{childAmount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                                              {child.currency}{childPaid.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-rose-600 dark:text-rose-400">
                                              {child.currency}{childDue.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5">
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${getStatusColor(child.status)}`}>
                                                {child.status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex justify-end gap-1">
                                                <button
                                                  onClick={() => window.open(`/invoices/${child.id}/print`, '_blank')}
                                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                  title="Print"
                                                >
                                                  <i className="fa-solid fa-print"></i>
                                                </button>
                                                <button
                                                  onClick={() => handleOpenManager(child)}
                                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                  title="Manage"
                                                >
                                                  <i className="fa-solid fa-gears"></i>
                                                </button>
                                                <button
                                                  onClick={() => router.push(`/invoices/${child.id}?tab=edit`)}
                                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                  title="Edit"
                                                >
                                                  <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button
                                                  onClick={(e) => handleDelete(child.id, e)}
                                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                  title="Delete"
                                                >
                                                  <i className="fa-solid fa-trash"></i>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                } else {
                  return (
                    <tr
                      key={invoice.id}
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-300 text-sm">
                            {invoice.client?.name || '---'}
                          </span>
                          <span className="font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {invoice.company?.name || '---'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(invoice.created_at || '').toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                        {invoice.currency}
                        {amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                        {invoice.currency}
                        {paid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                        {invoice.currency}
                        {due.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openShareModal(invoice)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Share Link"
                          >
                            <i className="fa-solid fa-link"></i>
                          </button>
                          <button
                            onClick={() => window.open(`/invoices/${invoice.id}/print`, '_blank')}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Print"
                          >
                            <i className="fa-solid fa-print"></i>
                          </button>
                          <button
                            onClick={() => handleOpenManager(invoice)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Manage Invoice & Recurring"
                          >
                            <i className="fa-solid fa-gears"></i>
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(invoice, e)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Duplicate"
                          >
                            <i className="fa-solid fa-copy"></i>
                          </button>
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}?tab=edit`)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            onClick={(e) => handleDelete(invoice.id, e)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-slate-400 dark:text-slate-500 text-sm text-center italic">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal Overlay */}
      {selectedManageInvoice && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up custom-scrollbar">

            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-slate-100 dark:border-slate-800 border-b">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">
                  Manage Invoice & Recurring
                </h3>
                <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-xs">
                  Configure metadata settings and trigger automated recurring instances.
                </p>
              </div>
              <button
                onClick={() => setSelectedManageInvoice(null)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                <i className="text-lg fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6">

              {/* Part 1: General Details */}
              <div className="space-y-4">
                <h4 className="pb-2 border-indigo-50 dark:border-indigo-950/30 border-b font-black text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  1. General Details
                </h4>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                      value={manageInvoiceNumber}
                      onChange={(e) => setManageInvoiceNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                      Status
                    </label>
                    <select
                      className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                      value={manageStatus}
                      onChange={(e) => setManageStatus(e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                      value={manageDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setManageDate(newDate);
                        if (manageIsRecurring && newDate) {
                          setManageNextGenDate(calculateNextGenDate(newDate, manageRecurringFrequency));
                        }
                      }}
                    />
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div>
                      <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Currency
                      </label>
                      <input
                        type="text"
                        className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                        value={manageCurrency}
                        onChange={(e) => setManageCurrency(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                        value={manageTaxRate}
                        onChange={(e) => setManageTaxRate(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                    Invoice Notes
                  </label>
                  <textarea
                    rows={2}
                    className="bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-medium dark:text-white text-xs"
                    value={manageNotes}
                    onChange={(e) => setManageNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Part 2: Recurring Billing Configuration */}
              <div className="space-y-4">
                <h4 className="pb-2 border-indigo-50 dark:border-indigo-950/30 border-b font-black text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  2. Recurring Billing Configuration
                </h4>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <input
                    type="checkbox"
                    id="modalIsRecurringInvoicesPage"
                    className="border-slate-300 rounded focus:ring-indigo-500 w-4 h-4 text-indigo-600"
                    checked={manageIsRecurring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setManageIsRecurring(checked);
                      if (checked && manageDate) {
                        setManageNextGenDate(calculateNextGenDate(manageDate, manageRecurringFrequency));
                      }
                    }}
                  />
                  <label htmlFor="modalIsRecurringInvoicesPage" className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide cursor-pointer">
                    Enable Recurring Invoicing for this Record
                  </label>
                </div>

                {manageIsRecurring && (
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 bg-slate-50/50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                    <div>
                      <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Billing Frequency
                      </label>
                      <select
                        className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                        value={manageRecurringFrequency}
                        onChange={(e) => {
                          const newFreq = e.target.value;
                          setManageRecurringFrequency(newFreq);
                          if (manageIsRecurring && manageDate) {
                            setManageNextGenDate(calculateNextGenDate(manageDate, newFreq));
                          }
                        }}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 ml-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Next Generation Date
                      </label>
                      <input
                        type="date"
                        className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                        value={manageNextGenDate}
                        onChange={(e) => setManageNextGenDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Part 3: Instant Recurring Actions */}
              {selectedManageInvoice && manageIsRecurring && (
                <div className="space-y-4">
                  <h4 className="pb-2 border-indigo-50 dark:border-indigo-950/30 border-b font-black text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    3. Professional Recurring Controls
                  </h4>

                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    {/* Stop Recurring Button */}
                    <div className="flex flex-col justify-between bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-xs">Active Recurrence</span>
                        <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                          Halt automated billing templates. Keeps invoice data intact.
                        </p>
                      </div>
                      <button
                        onClick={handleStopRecurringInModal}
                        disabled={isProcessingAction}
                        className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 disabled:opacity-50 mt-4 py-2.5 rounded-lg w-full font-black text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider transition-colors"
                      >
                        <i className="mr-2 fa-solid fa-ban"></i> Stop Recurring
                      </button>
                    </div>

                    {/* Generate Recurring Now Button */}
                    <div className="flex flex-col justify-between bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-xs">Run Generation Now</span>
                        <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                          Force-trigger the next scheduled invoice instance immediately.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateRecurringNow}
                        disabled={isProcessingAction}
                        className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 disabled:opacity-50 mt-4 py-2.5 rounded-lg w-full font-black text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider transition-colors"
                      >
                        <i className="mr-2 fa-solid fa-bolt"></i> Generate Now
                      </button>
                    </div>
                  </div>

                  {/* Batch Combined Multi-Month Generation */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                    <span className="block mb-1 font-bold text-slate-800 dark:text-white text-xs">
                      Generate for Combined Months (Batch Mode)
                    </span>
                    <p className="mb-4 text-[10px] text-slate-400 leading-relaxed">
                      Pre-generate invoice records in bulk for consecutive future periods.
                    </p>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <input
                          type="number"
                          min={1}
                          max={12}
                          className="bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full font-bold dark:text-white text-xs text-center"
                          value={batchMonths}
                          onChange={(e) => setBatchMonths(Math.max(1, Number(e.target.value)))}
                        />
                      </div>
                      <button
                        onClick={handleGenerateMultipleMonths}
                        disabled={isProcessingAction}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md py-2.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-colors"
                      >
                        <i className="fa-layer-group mr-2 fa-solid"></i>
                        Pre-Generate {batchMonths} Runs
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-6 border-slate-100 dark:border-slate-800 border-t">
              <button
                onClick={() => setSelectedManageInvoice(null)}
                className="bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveManager}
                disabled={isSavingManager}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-white shadow-lg px-5 py-2.5 rounded-lg font-black text-white dark:text-slate-900 text-xs uppercase tracking-widest transition-colors"
              >
                {isSavingManager ? 'Saving...' : 'Save Config'}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ====================================================
          Share Link Manager Modal
      ==================================================== */}
      {shareInvoice && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="flex flex-col bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-slate-100 dark:border-slate-800 border-b">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-widest">
                  Share Invoice
                </h2>
                <p className="mt-0.5 text-slate-400 text-xs">{shareInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setShareInvoice(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                <i className="text-lg fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 border-slate-100 dark:border-slate-800 border-b">
              {(['create', 'tokens', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setShareTab(tab)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${shareTab === tab
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {tab === 'create' ? 'New Link' : tab === 'tokens' ? `Links (${shareTokens.length})` : `View Log (${shareLogs.length})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-5 p-6 overflow-y-auto">

              {/* ---- CREATE TAB ---- */}
              {shareTab === 'create' && (
                <div className="space-y-5">
                  <div>
                    <label className="block mb-1.5 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">Link Label (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sent to John — June 2026"
                      value={shareLabel}
                      onChange={(e) => setShareLabel(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 w-full text-slate-800 dark:text-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">Expiry</label>
                    <div className="flex flex-wrap gap-2">
                      {[7, 14, 30, 90].map((d) => (
                        <button
                          key={d}
                          onClick={() => { setShareNeverExpires(false); setShareDays(d); }}
                          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${!shareNeverExpires && shareDays === d
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                          {d} days
                        </button>
                      ))}
                      <button
                        onClick={() => setShareNeverExpires(true)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${shareNeverExpires
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                      >
                        Never
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateShareLink}
                    disabled={shareLoading}
                    className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-600/20 shadow-lg py-3 rounded-xl w-full font-black text-white text-xs uppercase tracking-widest transition-all"
                  >
                    <i className={`fa-solid ${shareLoading ? 'fa-spinner animate-spin' : 'fa-link'}`}></i>
                    {shareLoading ? 'Generating...' : 'Generate Share Link'}
                  </button>

                  {generatedLink && (
                    <div className="space-y-3 bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                      <p className="font-black text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Link Ready</p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={generatedLink}
                          className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-mono text-slate-700 dark:text-slate-300 text-xs"
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success('Copied!'); }}
                          className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg font-black text-white text-xs transition-colors"
                        >
                          <i className="fa-solid fa-copy"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---- TOKENS TAB ---- */}
              {shareTab === 'tokens' && (
                <div className="space-y-3">
                  {shareLoading && <p className="py-4 text-slate-400 text-xs text-center">Loading...</p>}
                  {!shareLoading && shareTokens.length === 0 && (
                    <p className="py-6 text-slate-400 text-xs text-center italic">No share links yet. Create one from the New Link tab.</p>
                  )}
                  {shareTokens.map((t) => {
                    const isRevoked = !!t.revoked_at;
                    const isExpired = !t.never_expires && t.expires_at && new Date(t.expires_at) < new Date();
                    return (
                      <div
                        key={t.id}
                        className={`rounded-xl border p-4 flex items-start gap-4 ${isRevoked || isExpired
                            ? 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                      >
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRevoked ? 'bg-orange-500/10 text-orange-500' :
                            isExpired ? 'bg-red-500/10 text-red-500' :
                              'bg-emerald-500/10 text-emerald-500'
                          }`}>
                          <i className={`fa-solid text-xs ${isRevoked ? 'fa-ban' :
                              isExpired ? 'fa-clock' :
                                'fa-check'
                            }`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                            {t.label || 'Untitled Link'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {isRevoked ? `Revoked ${new Date(t.revoked_at).toLocaleDateString()}` :
                              isExpired ? `Expired ${new Date(t.expires_at).toLocaleDateString()}` :
                                t.never_expires ? 'Never expires' :
                                  `Expires ${new Date(t.expires_at).toLocaleDateString()}`}
                            {' · '}
                            <span className="font-bold text-indigo-500">{t.view_count} view{t.view_count !== 1 ? 's' : ''}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              readOnly
                              value={`${window.location.origin}/invoices/token/${t.token}`}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-mono text-[10px] text-slate-500"
                            />
                            <button
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invoices/token/${t.token}`); toast.success('Copied!'); }}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Copy"
                            >
                              <i className="text-xs fa-solid fa-copy"></i>
                            </button>
                          </div>
                        </div>
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevokeToken(t.id)}
                            className="font-bold text-slate-400 hover:text-red-500 text-xs uppercase tracking-wider transition-colors shrink-0"
                            title="Revoke"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ---- LOGS TAB ---- */}
              {shareTab === 'logs' && (
                <div>
                  {shareLoading && <p className="py-4 text-slate-400 text-xs text-center">Loading...</p>}
                  {!shareLoading && shareLogs.length === 0 && (
                    <p className="py-6 text-slate-400 text-xs text-center italic">No views recorded yet.</p>
                  )}
                  {shareLogs.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 border-b font-black text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-4 py-3">Viewed At</th>
                            <th className="px-4 py-3">IP</th>
                            <th className="px-4 py-3">Browser</th>
                            <th className="px-4 py-3">OS</th>
                            <th className="px-4 py-3">Device</th>
                            <th className="px-4 py-3">Link Label</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {shareLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                {new Date(log.viewed_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{log.ip_address || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{log.browser || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{log.os || '—'}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase tracking-wider ${log.device === 'Mobile' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' :
                                    log.device === 'Tablet' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}>{log.device || '—'}</span>
                              </td>
                              <td className="px-4 py-2.5 text-[10px] text-slate-400">{log.token?.label || 'Untitled'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
