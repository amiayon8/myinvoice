
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Invoice, Client, CompanyProfile, ViewType, InvoiceItem, RecurringFrequency, Theme } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardStats } from './components/DashboardStats';
import { InvoiceList } from './components/InvoiceList';
import { InvoicePreview } from './components/InvoicePreview';
import { Auth } from './components/Auth';
import { LogoUpload } from './components/LogoUpload';

const INITIAL_INVOICE_DATA = (): Partial<Invoice> => ({
  invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
  date: new Date().toISOString().split('T')[0],
  status: 'draft',
  currency: '৳ ',
  tax_rate: 0,
  notes: 'Thank you for your business.',
  items: [],
  is_recurring: false,
  recurring_frequency: 'monthly'
});

function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewType>('dashboard');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Partial<Invoice> | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [editingCompany, setEditingCompany] = useState<Partial<CompanyProfile> | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  useEffect(() => {
    const root = window.document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invs, cls, comps] = await Promise.all([
        supabase.from('invoices').select('*, items:invoice_items(*), client:clients(*), company:companies(*)').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('companies').select('*').order('name')
      ]);
      setInvoices(invs.data || []);
      setClients(cls.data || []);
      setCompanies(comps.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveInvoice = async (invoiceData: Partial<Invoice>) => {
    setIsSaving(true);
    const { items, client, company, ...baseData } = invoiceData;
    try {
      let savedInvoice;
      const dataToSave = { ...baseData };
      if (baseData.id) {
        const { data } = await supabase.from('invoices').update(dataToSave).eq('id', baseData.id).select().single();
        savedInvoice = data;
      } else {
        const { data } = await supabase.from('invoices').insert(dataToSave).select().single();
        savedInvoice = data;
      }
      if (savedInvoice && items) {
        await supabase.from('invoice_items').delete().eq('invoice_id', savedInvoice.id);
        const itemsToInsert = items.map(({ id: _id, ...item }) => ({ ...item, invoice_id: savedInvoice.id }));
        await supabase.from('invoice_items').insert(itemsToInsert);
      }
      await fetchData();
      setView('invoices');
      setEditingInvoice(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    setIsSaving(true);
    try {
      const dataToSave = { ...clientData };
      clientData.id
        ? await supabase.from('clients').update(dataToSave).eq('id', clientData.id)
        : await supabase.from('clients').insert(dataToSave);
      await fetchData();
      setEditingClient(null);
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleSaveCompany = async (companyData: Partial<CompanyProfile>) => {
    setIsSaving(true);
    try {
      const dataToSave = { ...companyData };
      companyData.id
        ? await supabase.from('companies').update(dataToSave).eq('id', companyData.id)
        : await supabase.from('companies').insert(dataToSave);
      await fetchData();
      setEditingCompany(null);
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  if (!session) return <Auth />;

  const Header = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-8 no-print">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg text-slate-500 transition-colors"
        >
          <i className="text-xl fa-solid fa-bars"></i>
        </button>
        <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Top Bar Actions */}
      </div>
    </div>
  );

  const renderView = () => {
    if (loading) return (
      <div className="flex justify-center items-center bg-slate-50 dark:bg-dark-bg h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
          <p className="font-black text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cloud Synching</p>
        </div>
      </div>
    );

    switch (view) {
      case 'dashboard':
        return (
          <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full overflow-y-auto custom-scrollbar">
            <Header title="Intelligence" />
            <DashboardStats invoices={invoices} />
            <div className="bg-white dark:bg-dark-card shadow-xl border border-slate-100 dark:border-white/5 rounded-lg overflow-hidden">
              <InvoiceList
                invoices={invoices.slice(0, 10)}
                onEdit={(inv) => { setEditingInvoice(inv); setView('edit-invoice'); }}
                onDuplicate={(inv) => handleDuplicate(inv)}
                onDelete={async (id) => { if (confirm('Permanently delete?')) { await supabase.from('invoices').delete().eq('id', id); fetchData(); } }}
                onAddNew={() => { setEditingInvoice(INITIAL_INVOICE_DATA()); setView('edit-invoice'); }}
              />
            </div>
          </div>
        );

      case 'edit-invoice':
        return (
          <div className="flex lg:flex-row flex-col bg-slate-50 dark:bg-dark-bg h-full overflow-hidden">
            {/* Sidebar Editor */}
            <div className="z-10 relative space-y-10 bg-white dark:bg-dark-card shadow-2xl p-4 lg:p-8 border-slate-200 dark:border-white/5 border-r w-full lg:w-[480px] h-full overflow-y-auto custom-scrollbar no-print">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-slate-900 dark:text-white text-xl uppercase tracking-tighter">Editor</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrint} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-2 rounded-lg text-indigo-600 transition-all" title="Print/Export">
                    <i className="text-lg fa-solid fa-print"></i>
                  </button>
                  <button onClick={() => setView('dashboard')} className="p-2 text-slate-400 hover:text-slate-600"><i className="text-lg fa-solid fa-xmark"></i></button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Business & Client Selection */}
                <div className="space-y-4">
                  <label className="block ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Entity Profile</label>
                  <select className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" value={editingInvoice?.company_id || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, company_id: e.target.value }))}>
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" value={editingInvoice?.client_id || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, client_id: e.target.value }))}>
                    <option value="">Select Recipient</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Metadata */}
                <div className="gap-4 grid grid-cols-2">
                  <div>
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Invoice ID</label>
                    <input className="dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-lg outline-none w-full dark:text-white text-sm" placeholder="Invoice #" value={editingInvoice?.invoice_number || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, invoice_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      className="bg-slate-50 dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                      value={editingInvoice?.status || 'draft'}
                      onChange={(e) => setEditingInvoice(p => ({ ...p!, status: e.target.value as any }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="block font-black text-[10px] text-slate-400 uppercase tracking-widest">Work Items</label>
                    <span className="font-black text-[10px] text-indigo-500 uppercase">Live Total: {editingInvoice?.currency}{(editingInvoice?.items?.reduce((s, i) => s + (i.quantity * i.rate), 0) || 0).toLocaleString()}</span>
                  </div>
                  {(editingInvoice?.items || []).map((item, idx) => (
                    <div key={item.id} className="group relative bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-100 dark:border-white/5 rounded-lg animate-slide-in">
                      <input className="bg-transparent mb-3 outline-none w-full font-bold dark:text-white text-sm" placeholder="Description..." value={item.description} onChange={(e) => { const items = [...editingInvoice!.items!]; items[idx].description = e.target.value; setEditingInvoice({ ...editingInvoice!, items }); }} />
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block mb-1 font-black text-[8px] text-slate-400 uppercase">Hours / Qty</label>
                          <input type="number" className="bg-white dark:bg-slate-900 p-3 border dark:border-white/5 rounded-lg outline-none w-full font-bold dark:text-white text-xs" value={item.quantity} onChange={(e) => { const items = [...editingInvoice!.items!]; items[idx].quantity = Number(e.target.value); setEditingInvoice({ ...editingInvoice!, items }); }} />
                        </div>
                        <div className="flex-1">
                          <label className="block mb-1 font-black text-[8px] text-slate-400 uppercase">Unit Rate</label>
                          <input type="number" className="bg-white dark:bg-slate-900 p-3 border dark:border-white/5 rounded-lg outline-none w-full font-bold dark:text-white text-xs" value={item.rate} onChange={(e) => { const items = [...editingInvoice!.items!]; items[idx].rate = Number(e.target.value); setEditingInvoice({ ...editingInvoice!, items }); }} />
                        </div>
                        <button onClick={() => { const items = editingInvoice!.items?.filter((_, i) => i !== idx); setEditingInvoice({ ...editingInvoice!, items }); }} className="mt-4 p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEditingInvoice({ ...editingInvoice!, items: [...(editingInvoice?.items || []), { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }] })} className="py-4 border-2 border-slate-200 dark:border-white/5 border-dashed rounded-lg w-full font-black text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-all">+ Add New Entry</button>
                </div>

                <div className="gap-4 grid grid-cols-6">
                  <div className="col-span-4">
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Paid Amount</label>
                    <input className="dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-lg outline-none w-full dark:text-white text-sm" placeholder="Paid Amount" type="number" value={editingInvoice?.paid_amount || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, paid_amount: e.target.value }))} />
                  </div>

                  <div className="col-span-2">
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Tax (%)</label>
                    <input className="dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-lg outline-none w-full dark:text-white text-sm" placeholder="Tax Rate" type="number" value={editingInvoice?.tax_rate || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, tax_rate: e.target.value }))} />
                  </div>
                </div>

                <div className="gap-4">
                  <div>
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Official Notes</label>
                    <textarea className="dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-lg outline-none w-full dark:text-white text-sm" placeholder="Official Notes" value={editingInvoice?.notes || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, notes: e.target.value }))} />
                  </div>
                </div>

                <div className="gap-4 grid grid-cols-2">
                  {/* Recurring Toggle Switch */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 p-5 border border-slate-100 dark:border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <label className="inline-flex relative items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editingInvoice?.is_recurring || false}
                          onChange={(e) => setEditingInvoice(p => ({ ...p!, is_recurring: e.target.checked }))}
                        />
                        <div className="peer after:top-1/2 after:left-[2px] after:absolute bg-slate-300 after:bg-white dark:bg-slate-700 peer-checked:bg-indigo-600 after:border after:border-gray-300 peer-checked:after:border-white rounded-full after:rounded-full peer-focus:outline-none dark:peer-focus:ring-indigo-900 peer-focus:ring-4 peer-focus:ring-indigo-300 w-11 after:w-5 h-6 after:h-5 after:content-[''] after:transition-all after:translate-y-[-50%] peer-checked:after:translate-x-[calc(100%-6px)]"></div>
                        <span className="ml-3 font-medium text-slate-900 dark:text-slate-300 text-sm">Recurring Invoice</span>
                      </label>
                    </div>

                    {/* Frequency Dropdown (Only shows if Recurring is checked) */}
                    {editingInvoice?.is_recurring && (
                      <div className="mt-4 animate-slide-in">
                        <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Frequency</label>
                        <select
                          className="bg-white dark:bg-slate-900 p-3 border dark:border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold dark:text-white text-xs"
                          value={editingInvoice.recurring_frequency || 'monthly'}
                          onChange={(e) => setEditingInvoice(p => ({ ...p!, recurring_frequency: e.target.value as any }))}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 ml-1 font-black text-[10px] text-slate-400 uppercase tracking-widest">Next Generation Date</label>
                    <input className="dark:bg-slate-950/50 p-4 border dark:border-white/5 rounded-lg outline-none w-full dark:text-white text-sm" placeholder="Next Generation Date" type="date" value={editingInvoice?.next_generation_date || ''} onChange={(e) => setEditingInvoice(p => ({ ...p!, next_generation_date: e.target.value }))} />
                  </div>
                </div>


                <div className="pt-10">
                  <button onClick={() => handleSaveInvoice(editingInvoice!)} disabled={isSaving} className="flex justify-center items-center gap-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 shadow-2xl py-5 rounded-lg w-full font-black text-white dark:text-slate-950 text-sm transition-all">
                    {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    DEPLOY TO CLOUD
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview Pane */}
            <div className="flex flex-1 justify-center items-start bg-slate-200 dark:bg-dark-bg p-6 lg:p-12 print:p-0 overflow-y-auto transition-colors custom-scrollbar">
              {editingInvoice && (
                <div className="shadow-[0_40px_100px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.6)] print:!shadow-none print:p-0 rounded-sm print:w-full print:h-full scale-[0.6] lg:scale-[0.8] print:scale-100 xl:scale-95 origin-top transition-transform duration-500 print-only">
                  <InvoicePreview
                    data={{
                      invoiceNumber: editingInvoice.invoice_number || '---',
                      date: editingInvoice.created_at || new Date().toISOString(),
                      companyId: editingInvoice.company_id || '',
                      client: clients.find(cl => cl.id === editingInvoice.client_id) || { name: 'Recipient', email: '', address: '' },
                      items: (editingInvoice.items || []).map(i => ({ id: i.id, description: i.description, quantity: i.quantity, rate: i.rate })),
                      notes: editingInvoice.notes || '',
                      currency: editingInvoice.currency || '৳ ',
                      taxRate: editingInvoice.tax_rate || 0,
                      isRecurring: editingInvoice.is_recurring || false,
                      recurringFrequency: editingInvoice.recurring_frequency,
                      paid_amount: editingInvoice.paid_amount || 0,
                    }}
                    company={companies.find(c => c.id === editingInvoice.company_id) || { name: 'Select Entity', logo_url: '', email: '', website: '', address: '', phone: '', color: '#6366f1' } as any}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full overflow-y-auto custom-scrollbar">
            <Header title="Clients Registry" />
            <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <button onClick={() => setEditingClient({ name: '', email: '', address: '', phone: '' })} className="group flex flex-col justify-center items-center gap-4 bg-white/50 dark:bg-white/5 border-2 border-slate-200 hover:border-indigo-600 dark:border-white/10 dark:hover:border-indigo-400 border-dashed rounded-lg h-full hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                <div className="flex justify-center items-center bg-white dark:bg-slate-900 shadow-sm rounded-lg w-16 h-16 group-hover:scale-110 transition-transform">
                  <i className="text-2xl fa-solid fa-user-plus"></i>
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Enlist Recipient</span>
              </button>
              {clients.map(client => {
                // 1. Calculate Stats for this specific client
                const clientInvoices = invoices.filter(inv => inv.client_id === client.id);

                const totalBilled = clientInvoices.reduce((sum, inv) => {
                  const subtotal = (inv.items || []).reduce((s, i) => s + (i.quantity * i.rate), 0);
                  const tax = subtotal * ((inv.tax_rate || 0) / 100);
                  return sum + subtotal + tax;
                }, 0);

                const totalPaid = clientInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
                const totalDue = totalBilled - totalPaid;

                return (
                  <div key={client.id} className="group relative bg-white dark:bg-dark-card shadow-xl hover:shadow-2xl p-8 border border-slate-100 dark:border-white/5 rounded-lg overflow-hidden transition-all animate-slide-in">
                    <div className="flex justify-center items-center bg-indigo-500 shadow-indigo-500/20 shadow-lg mb-6 rounded-lg w-14 h-14 font-black text-white text-2xl">
                      {client.name.charAt(0)}
                    </div>
                    <h3 className="mb-2 font-black text-slate-900 dark:text-white text-xl">{client.name}</h3>
                    <p className="mb-6 font-black text-[10px] text-slate-400 dark:text-slate-500 truncate uppercase tracking-widest">{client.email}</p>

                    {/* --- NEW STATS GRID --- */}
                    <div className="gap-2 grid grid-cols-3 mb-6 py-4 border-slate-50 border-y dark:border-white/5">
                      <div className="text-center">
                        <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Total</p>
                        <p className="font-black text-slate-700 dark:text-slate-300 text-xs">৳{totalBilled.toLocaleString()}</p>
                      </div>
                      <div className="border-slate-100 dark:border-white/5 border-l text-center">
                        <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Paid</p>
                        <p className="font-black text-emerald-500 text-xs">৳{totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="border-slate-100 dark:border-white/5 border-l text-center">
                        <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Due</p>
                        <p className="font-black text-rose-500 text-xs">৳{totalDue.toLocaleString()}</p>
                      </div>
                    </div>
                    {/* ---------------------- */}

                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-3 font-medium text-slate-500 dark:text-slate-400 text-xs italic leading-relaxed">
                        <i className="mt-1 text-indigo-400 fa-solid fa-location-dot"></i> {client.address || 'No address registered'}
                      </div>
                    </div>

                    <div className="top-8 right-8 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <button onClick={() => setEditingClient(client)} className="flex justify-center items-center bg-slate-50 dark:bg-slate-800 shadow-sm rounded-full w-10 h-10 text-slate-400 hover:text-indigo-600 transition-colors">
                        <i className="text-xs fa-solid fa-pen"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {editingClient && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-white dark:bg-dark-card shadow-2xl p-10 border border-white/5 rounded-lg w-full max-w-md animate-slide-in">
                  <h2 className="mb-8 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tighter">Recipient Profile</h2>
                  <div className="space-y-6">
                    <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" placeholder="Business or Name" value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
                    <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" placeholder="Email Contact" value={editingClient.email} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} />
                    <textarea className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-32 dark:text-white text-sm resize-none" placeholder="Registered Address" value={editingClient.address} onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })} />
                    <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" placeholder="Phone Number" value={editingClient.phone} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} />
                  </div>
                  <div className="flex gap-4 mt-10">
                    <button onClick={() => setEditingClient(null)} className="flex-1 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Abandon</button>
                    <button onClick={() => handleSaveClient(editingClient)} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-5 rounded-lg font-black text-[10px] text-white uppercase tracking-widest transition-all">{isSaving ? 'Synching...' : 'Commit Changes'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'companies':
        return (
          <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full overflow-y-auto custom-scrollbar">
            <Header title="Entities Management" />
            <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <button onClick={() => setEditingCompany({ name: '', email: '', website: '', address: '', phone: '', color: '#6366f1', logo_url: '' })} className="group flex flex-col justify-center items-center gap-4 bg-white/50 dark:bg-white/5 border-2 border-slate-200 hover:border-indigo-600 dark:border-white/10 dark:hover:border-indigo-400 border-dashed rounded-lg h-full hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                <div className="flex justify-center items-center bg-white dark:bg-slate-900 shadow-sm rounded-lg w-16 h-16 group-hover:scale-110 transition-transform">
                  <i className="text-2xl fa-solid fa-building-shield"></i>
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Register Entity</span>
              </button>
              {companies.map(company => {
                // 1. Calculate Stats for this specific company
                const companyInvoices = invoices.filter(inv => inv.company_id === company.id);

                const totalBilled = companyInvoices.reduce((sum, inv) => {
                  const subtotal = (inv.items || []).reduce((s, i) => s + (i.quantity * i.rate), 0);
                  const tax = subtotal * ((inv.tax_rate || 0) / 100);
                  return sum + subtotal + tax;
                }, 0);

                const totalPaid = companyInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
                const totalDue = totalBilled - totalPaid;

                return (
                  <div key={company.id} className="group relative bg-white dark:bg-dark-card shadow-xl hover:shadow-2xl border border-slate-100 dark:border-white/5 rounded-lg overflow-hidden transition-all animate-slide-in">
                    <div className="w-full h-3" style={{ backgroundColor: company.color }}></div>
                    <div className="p-8">
                      <div className="flex justify-center items-center bg-white shadow-inner mb-6 border border-slate-100 dark:border-white/5 rounded-lg w-48 h-24 overflow-hidden">
                        {company.logo_url ? <img src={company.logo_url} className="p-2 w-full h-full object-contain" /> : <i className="text-slate-200 text-3xl fa-solid fa-briefcase"></i>}
                      </div>

                      <h3 className="mb-1 font-black text-slate-900 dark:text-white text-xl">{company.name}</h3>
                      <p className="mb-6 font-black text-[9px] text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{company.website}</p>

                      {/* --- NEW STATS GRID --- */}
                      <div className="gap-2 grid grid-cols-3 mb-6 py-4 border-slate-50 border-y dark:border-white/5">
                        <div className="text-center">
                          <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Total</p>
                          <p className="font-black text-slate-700 dark:text-slate-300 text-xs">৳{totalBilled.toLocaleString()}</p>
                        </div>
                        <div className="border-slate-100 dark:border-white/5 border-l text-center">
                          <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Paid</p>
                          <p className="font-black text-emerald-500 text-xs">৳{totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="border-slate-100 dark:border-white/5 border-l text-center">
                          <p className="mb-1 font-black text-[8px] text-slate-400 uppercase tracking-wider">Due</p>
                          <p className="font-black text-rose-500 text-xs">৳{totalDue.toLocaleString()}</p>
                        </div>
                      </div>
                      {/* ---------------------- */}

                      <div className="space-y-3 font-bold text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-3"><i className="text-indigo-400 fa-solid fa-envelope-open"></i> {company.email}</div>
                        <div className="flex items-center gap-3"><i className="text-indigo-400 fa-solid fa-phone"></i> {company.phone}</div>
                      </div>
                    </div>
                    <div className="top-10 right-8 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <button onClick={() => setEditingCompany(company)} className="flex justify-center items-center bg-slate-50 dark:bg-slate-800 shadow-sm rounded-full w-10 h-10 text-slate-400 hover:text-indigo-600 transition-colors"><i className="text-xs fa-solid fa-pen"></i></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {editingCompany && (
              <div className="z-50 fixed inset-0 flex justify-center items-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
                <div className="bg-white dark:bg-dark-card shadow-2xl my-8 p-10 border border-white/5 rounded-lg w-full max-w-xl animate-slide-in">
                  <h2 className="mb-8 font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tighter">Corporate Identity</h2>
                  <div className="space-y-8">
                    <LogoUpload
                      userId={session.user.id}
                      currentUrl={editingCompany.logo_url}
                      onUploadSuccess={(url) => setEditingCompany({ ...editingCompany, logo_url: url })}
                    />
                    <div className="gap-6 grid grid-cols-2">
                      <div className="col-span-2">
                        <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Legal Name</label>
                        <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" value={editingCompany.name} onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })} />
                      </div>
                      <div className="col-span-1">
                        <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Brand Signature</label>
                        <input type="color" className="bg-slate-50 dark:bg-slate-950/50 p-2 border dark:border-white/5 rounded-lg outline-none w-full h-16" value={editingCompany.color} onChange={(e) => setEditingCompany({ ...editingCompany, color: e.target.value })} />
                      </div>
                      <div className="col-span-1">
                        <label className="block mb-2 ml-1 font-black text-[8px] text-slate-400 uppercase">Billing Email</label>
                        <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-16 dark:text-white text-sm" value={editingCompany.email} onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })} />
                      </div>
                      <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" placeholder="Domain / Website" value={editingCompany.website} onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })} />
                      <input className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm" placeholder="Contact Phone" value={editingCompany.phone} onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })} />
                      <div className="col-span-2">
                        <textarea className="bg-slate-50 dark:bg-slate-950/50 p-5 border dark:border-white/5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full h-24 dark:text-white text-sm resize-none" placeholder="Headquarters Address" value={editingCompany.address} onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-12">
                    <button onClick={() => setEditingCompany(null)} className="flex-1 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Cancel</button>
                    <button onClick={() => handleSaveCompany(editingCompany)} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-5 rounded-lg font-black text-[10px] text-white uppercase tracking-widest transition-all">{isSaving ? 'Synching...' : 'Commit Profile'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'invoices':
      case 'recurring':
        const filteredInvoices = view === 'recurring' ? invoices.filter(i => i.is_recurring) : invoices;
        return (
          <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full overflow-y-auto custom-scrollbar">
            <Header title={view === 'recurring' ? 'Auto-Generation' : 'Master Registry'} />
            <div className="bg-white dark:bg-dark-card shadow-2xl border border-slate-100 dark:border-white/5 rounded-lg overflow-hidden">
              <InvoiceList
                invoices={filteredInvoices}
                onEdit={(inv) => { setEditingInvoice(inv); setView('edit-invoice'); }}
                onDuplicate={(inv) => handleDuplicate(inv)}
                onDelete={async (id) => { if (confirm('Delete record?')) { await supabase.from('invoices').delete().eq('id', id); fetchData(); } }}
                onAddNew={() => { setEditingInvoice(INITIAL_INVOICE_DATA()); setView('edit-invoice'); }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleDuplicate = (invoice: Invoice) => {
    const { id, items, client, company, created_at, ...cleanInvoice } = invoice;
    setEditingInvoice({
      ...cleanInvoice,
      invoice_number: `${cleanInvoice.invoice_number}-COPY`,
      items: items?.map(({ id: _id, invoice_id: _inv_id, ...item }) => ({ ...item, id: crypto.randomUUID() })) || []
    });
    setView('edit-invoice');
  };

  return (
    <div className="flex bg-slate-50 dark:bg-dark-bg w-full h-full transition-colors duration-500">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={() => supabase.auth.signOut()}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="relative flex-1 h-full overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
