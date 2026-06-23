'use client';

import React, { useState, useEffect } from 'react';
import { listAllInvoiceViewLogs } from '@/services/invoices';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/skeleton';

export default function ActivityLogsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [viewLogs, setViewLogs] = useState<any[]>([]);

  // Search & Filters states
  const [logSearch, setLogSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'Desktop' | 'Mobile' | 'Tablet'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsRes = await listAllInvoiceViewLogs();
      setViewLogs(logsRes || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate statistics
  const totalViewsCount = viewLogs.length;
  const uniqueIpsCount = new Set(viewLogs.map(log => log.ip_address).filter(Boolean)).size;
  const mobileVisitsCount = viewLogs.filter(log => log.device === 'Mobile').length;
  const desktopVisitsCount = viewLogs.filter(log => !log.device || log.device === 'Desktop').length;

  // Filter logs
  const filteredLogs = viewLogs.filter((log) => {
    // Device filter
    if (deviceFilter !== 'all') {
      const device = log.device || 'Desktop';
      if (device.toLowerCase() !== deviceFilter.toLowerCase()) return false;
    }

    // Search query filter
    const query = logSearch.toLowerCase();
    const ip = log.ip_address?.toLowerCase() || '';
    const browser = log.browser?.toLowerCase() || '';
    const os = log.os?.toLowerCase() || '';
    const device = log.device?.toLowerCase() || 'desktop';
    const label = log.token?.label?.toLowerCase() || '';
    const invoiceNum = log.invoice?.invoice_number?.toLowerCase() || '';
    
    return ip.includes(query) || browser.includes(query) || os.includes(query) || device.includes(query) || label.includes(query) || invoiceNum.includes(query);
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
            Activity & Share Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Audit history of when client invoices were accessed, including device specifics, browsers, and location IPs.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl font-black text-slate-700 dark:text-slate-200 text-xs transition-colors flex items-center gap-2 shadow-sm"
        >
          <i className="fa-solid fa-arrows-rotate"></i>
          Refresh Logs
        </button>
      </div>

      {/* Stats Cards (4 Columns) */}
      <div className="gap-5 grid grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Total Views</span>
              <h3 className="mt-1 font-black text-slate-850 dark:text-white text-2xl tracking-tight">
                {totalViewsCount}
              </h3>
            </div>
            <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
              <i className="fa-solid fa-eye text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Unique IPs</span>
              <h3 className="mt-1 font-black text-emerald-600 dark:text-emerald-400 text-2xl tracking-tight">
                {uniqueIpsCount}
              </h3>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-network-wired text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Mobile Views</span>
              <h3 className="mt-1 font-black text-amber-600 dark:text-amber-400 text-2xl tracking-tight">
                {mobileVisitsCount}
              </h3>
            </div>
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-mobile-screen-button text-lg"></i>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Desktop Views</span>
              <h3 className="mt-1 font-black text-slate-850 dark:text-white text-2xl tracking-tight">
                {desktopVisitsCount}
              </h3>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl text-slate-600 dark:text-slate-400">
              <i className="fa-solid fa-desktop text-lg"></i>
            </div>
          </div>
        </div>

      </div>

      {/* Full-width Logs Table */}
      <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        
        {/* Filtering Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-6 border-slate-100 dark:border-slate-800 border-b">
          <div>
            <h3 className="font-black text-slate-850 dark:text-white text-xs uppercase tracking-wider">
              Logs Audit History ({filteredLogs.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-xs dark:text-white animate-fade-in"
            >
              <option value="all">All Devices</option>
              <option value="Desktop">Desktop Only</option>
              <option value="Mobile">Mobile Only</option>
              <option value="Tablet">Tablet Only</option>
            </select>
            <div className="relative flex-1 sm:w-64 animate-fade-in">
              <input
                type="text"
                placeholder="Search IP, browser, invoice..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full text-xs dark:text-white"
              />
              <i className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 text-[10px] fa-solid fa-search"></i>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/40 border-slate-250 dark:border-slate-800 border-b font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Viewed At</th>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Client Detail (Browser / OS)</th>
                <th className="px-6 py-4">Device</th>
                <th className="px-6 py-4">Referrer</th>
                <th className="px-6 py-4">Link Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(log.viewed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-slate-250 text-xs">
                      {log.invoice?.invoice_number || 'Deleted Invoice'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300 text-xs">
                    {log.ip_address || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 font-semibold">
                        {log.browser || 'Browser'}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 font-semibold">
                        {log.os || 'OS'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.device === 'Mobile' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400' :
                      log.device === 'Tablet' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {log.device || 'Desktop'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-450 text-[10px] max-w-[150px] truncate" title={log.referrer}>
                    {log.referrer || <span className="text-slate-400 italic">Direct View</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {log.token?.label || <span className="text-slate-400 italic">Untitled Link</span>}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-slate-400 text-center italic text-xs">
                    No access logs match the search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
