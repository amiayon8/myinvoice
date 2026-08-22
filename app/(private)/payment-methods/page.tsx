"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethod, PaymentField, PaymentUpdateRequest, PRESET_PAYMENT_SVGS, PRESET_PAYMENT_COLORS } from "@/types/payment-methods";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Users,
  Search
} from "lucide-react";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDebounce } from "@/hooks/use-debounce";

export default function PaymentMethodsPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"methods" | "requests">("methods");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [requests, setRequests] = useState<PaymentUpdateRequest[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Editor Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [saving, setSaving] = useState(false);

  // Request review modal
  const [reviewingReq, setReviewingReq] = useState<PaymentUpdateRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [methodsRes, reqsRes, clientsRes] = await Promise.all([
        fetch("/api/payment-methods"),
        fetch("/api/payment-requests"),
        supabase.from("clients").select("id, name, email").order("name")
      ]);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setMethods(data.payment_methods || []);
      }

      if (reqsRes.ok) {
        const data = await reqsRes.json();
        setRequests(data.requests || []);
      }

      if (clientsRes.data) {
        setClients(clientsRes.data || []);
      }
    } catch (err) {
      console.error("Error fetching payment methods data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEditor = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(JSON.parse(JSON.stringify(method)));
    } else {
      setEditingMethod({
        name: "New Payment Method",
        type: "mobile_banking",
        badge: "Send Money",
        color: "#6366f1",
        bg_gradient: "from-indigo-500 to-purple-600",
        icon_svg: PRESET_PAYMENT_SVGS.mobile,
        icon_name: "fa-credit-card",
        is_active: true,
        sort_order: methods.length + 1,
        instructions: "Please mention the invoice number as reference.",
        fields: [
          { id: "f_" + Date.now(), label: "Account Number", value: "017XXXXXXXX", is_copyable: true, is_highlighted: true }
        ],
        visibility: { mode: "all", client_ids: [] }
      });
    }
    setModalOpen(true);
  };

  const handleAddField = () => {
    if (!editingMethod) return;
    const newField: PaymentField = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      label: "Field Name",
      value: "",
      is_copyable: true,
      is_highlighted: false
    };
    setEditingMethod({
      ...editingMethod,
      fields: [...(editingMethod.fields || []), newField]
    });
  };

  const handleRemoveField = (fieldId: string) => {
    if (!editingMethod) return;
    setEditingMethod({
      ...editingMethod,
      fields: (editingMethod.fields || []).filter(f => f.id !== fieldId)
    });
  };

  const handleUpdateField = (fieldId: string, updates: Partial<PaymentField>) => {
    if (!editingMethod) return;
    setEditingMethod({
      ...editingMethod,
      fields: (editingMethod.fields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
    });
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    setSaving(true);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMethod)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save payment method");
      }

      toast.success("Payment method saved successfully!");
      setModalOpen(false);
      setEditingMethod(null);
      fetchData();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMethod = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleReviewRequest = async (requestId: string, action: "approved" | "rejected") => {
    setReviewActionLoading(true);
    try {
      const res = await fetch(`/api/payment-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, admin_notes: adminNotes })
      });

      if (res.ok) {
        toast.success(`Request ${action === "approved" ? "approved" : "rejected"} successfully`);
        setReviewingReq(null);
        setAdminNotes("");
        fetchData();
      } else {
        const err = await res.json();
        toast.error("Error: " + (err.error || "Action failed"));
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setReviewActionLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");

  const filteredMethods = methods.filter(m => {
    const q = debouncedSearchQuery.toLowerCase();
    if (!q) return true;
    const nameMatch = m.name?.toLowerCase().includes(q);
    const typeMatch = m.type?.toLowerCase().includes(q);
    const badgeMatch = m.badge?.toLowerCase().includes(q);
    const fieldMatch = m.fields?.some(f => f.label?.toLowerCase().includes(q) || f.value?.toLowerCase().includes(q));
    return nameMatch || typeMatch || badgeMatch || fieldMatch;
  });

  const filteredRequests = requests.filter(r => {
    const q = debouncedSearchQuery.toLowerCase();
    if (!q) return true;
    const clientMatch = r.client_name?.toLowerCase().includes(q);
    const trxMatch = r.transaction_id?.toLowerCase().includes(q);
    const accMatch = r.account_number?.toLowerCase().includes(q);
    const invMatch = r.invoice_number?.toLowerCase().includes(q);
    const notesMatch = r.notes?.toLowerCase().includes(q);
    return clientMatch || trxMatch || accMatch || invMatch || notesMatch;
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              Payment Gateway & Verification
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Payment Information System
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure dynamic payment methods, SVG icons, client-level exclusions, and verify customer transactions.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payment data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleOpenEditor()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer uppercase tracking-wider shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Method</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("methods")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "methods"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Methods ({methods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "requests"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Client Verification Requests</span>
          {pendingRequests.length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingRequests.length} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PAYMENT METHODS */}
      {activeTab === "methods" && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"></div>
              ))}
            </div>
          ) : filteredMethods.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <CreditCard className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No payment methods found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or add a new method.</p>
              <button
                onClick={() => handleOpenEditor()}
                className="mt-2 inline-flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Create One
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMethods.map((method) => {
                const accent = method.color || "#6366f1";
                const visMode = method.visibility?.mode || "all";
                const visClientsCount = method.visibility?.client_ids?.length || 0;

                return (
                  <div
                    key={method.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                      method.is_active
                        ? "border-slate-200 dark:border-slate-800 hover:shadow-md"
                        : "border-slate-200/60 dark:border-slate-800/40 opacity-60"
                    }`}
                  >
                    {/* Color bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: accent }} />

                    <div className="space-y-4">
                      {/* Top info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {method.icon_svg ? (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center p-2 text-white shadow-md shadow-slate-900/10 shrink-0"
                              style={{ backgroundColor: accent }}
                              dangerouslySetInnerHTML={{ __html: method.icon_svg }}
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shadow-slate-900/10 shrink-0"
                              style={{ backgroundColor: accent }}
                            >
                              <i className={`fa-solid ${method.icon_name || "fa-credit-card"} text-lg`}></i>
                            </div>
                          )}
                          <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                              {method.name}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 capitalize block">
                              {method.type.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {method.badge && (
                            <span
                              className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                              style={{ backgroundColor: `${accent}18`, color: accent }}
                            >
                              {method.badge}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              method.is_active
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}
                          >
                            {method.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </div>

                      {/* Fields preview */}
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        {method.fields && method.fields.length > 0 ? (
                          method.fields.map(f => (
                            <div key={f.id} className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">{f.label}:</span>
                              <span className={`font-bold text-[11px] ${f.is_highlighted ? "font-black text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                                {f.value}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No custom fields</span>
                        )}
                      </div>

                      {/* Client visibility indicator */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {visMode === "all"
                            ? "Visible to All Clients"
                            : visMode === "include"
                            ? `Only visible to ${visClientsCount} client${visClientsCount === 1 ? "" : "s"}`
                            : `Hidden from ${visClientsCount} client${visClientsCount === 1 ? "" : "s"}`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Order: #{method.sort_order}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditor(method)}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Method"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMethod(method.id)}
                          className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete Method"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLIENT VERIFICATION REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {requests.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No payment verification requests</h3>
              <p className="text-xs text-slate-500">Requests submitted by clients on shared invoices/subscriptions will appear here.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 font-black text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Submission Details</th>
                      <th className="px-6 py-4">Invoice / Type</th>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Sender A/C</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.map((req) => {
                      const isPending = req.status === "pending";
                      const isApproved = req.status === "approved";

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {req.client_name || "Client Submission"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(req.submitted_at).toLocaleString()}
                            </div>
                            {req.payment_method_name && (
                              <span className="inline-block text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded mt-0.5">
                                {req.payment_method_name}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-black text-slate-800 dark:text-slate-200">
                              {req.invoice_number ? `#${req.invoice_number}` : req.type === "invoice" ? "Invoice" : "Subscription"}
                            </span>
                            {req.notes && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-xs" title={req.notes}>
                                "{req.notes}"
                              </p>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded select-all cursor-pointer">
                              {req.transaction_id}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {req.account_number}
                          </td>

                          <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                            {req.amount ? `${req.currency || "৳"}${req.amount.toLocaleString()}` : "N/A"}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPending
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                  : isApproved
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                              }`}
                            >
                              {isPending && <Clock className="w-3 h-3" />}
                              {isApproved && <CheckCircle2 className="w-3 h-3" />}
                              {!isPending && !isApproved && <XCircle className="w-3 h-3" />}
                              <span>{req.status}</span>
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReviewRequest(req.id, "approved")}
                                  disabled={reviewActionLoading}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                                >
                                  Approve & Record
                                </button>
                                <button
                                  onClick={() => handleReviewRequest(req.id, "rejected")}
                                  disabled={reviewActionLoading}
                                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[11px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                {req.reviewed_at ? `Reviewed on ${new Date(req.reviewed_at).toLocaleDateString()}` : "Completed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Payment Method Editor */}
      {modalOpen && editingMethod && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingMethod.id ? "Edit Payment Method" : "Create Payment Method"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define custom fields, SVG icon, instructions, and client visibility.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMethod} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bKash Personal, City Bank Transfer"
                    value={editingMethod.name || ""}
                    onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Type
                  </label>
                  <select
                    value={editingMethod.type || "mobile_banking"}
                    onChange={(e) => setEditingMethod({ ...editingMethod, type: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="mobile_banking">Mobile Banking (bKash, Nagad, Rocket)</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="crypto">Cryptocurrency / USDT</option>
                    <option value="other">Other / Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Badge / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Send Money Only, Direct Deposit"
                    value={editingMethod.badge || ""}
                    onChange={(e) => setEditingMethod({ ...editingMethod, badge: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Brand Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingMethod.color || "#6366f1"}
                      onChange={(e) => setEditingMethod({ ...editingMethod, color: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={editingMethod.color || "#6366f1"}
                      onChange={(e) => setEditingMethod({ ...editingMethod, color: e.target.value })}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Icon SVG Selector & Custom SVG input */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Icon SVG / Preset Icon
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {Object.entries(PRESET_PAYMENT_SVGS).map(([key, svg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setEditingMethod({
                          ...editingMethod,
                          icon_svg: svg,
                          color: PRESET_PAYMENT_COLORS[key] || editingMethod.color || "#000000",
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold capitalize"
                    >
                      <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: svg }} />
                      <span>{key}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Paste custom SVG code here: <svg ...>...</svg>"
                  value={editingMethod.icon_svg || ""}
                  onChange={(e) => setEditingMethod({ ...editingMethod, icon_svg: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Dynamic Key-Value Pairs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Payment Information Fields (Dynamic Key-Value Pairs)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="flex items-center gap-1 text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingMethod.fields || []).map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Label (e.g. Account Number)"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        className="w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 01870828373)"
                        value={field.value}
                        onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold"
                      />
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.is_highlighted || false}
                          onChange={(e) => handleUpdateField(field.id, { is_highlighted: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>Highlight</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Payment Instructions / Policy Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions displayed to clients when paying..."
                  value={editingMethod.instructions || ""}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Client Visibility Settings */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Client Visibility & Restrictions
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Control which clients can see this payment method on shared invoices and subscriptions.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "Show to All Clients" },
                    { id: "exclude", label: "Hide from Selected" },
                    { id: "include", label: "Show Only to Selected" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setEditingMethod({
                        ...editingMethod,
                        visibility: {
                          mode: mode.id as any,
                          client_ids: editingMethod.visibility?.client_ids || []
                        }
                      })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        editingMethod.visibility?.mode === mode.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {editingMethod.visibility?.mode !== "all" && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Select Clients ({editingMethod.visibility?.mode === "exclude" ? "To Hide From" : "To Show To"}):
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      {clients.map((c) => {
                        const isChecked = (editingMethod.visibility?.client_ids || []).includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentIds = editingMethod.visibility?.client_ids || [];
                                const newIds = e.target.checked
                                  ? [...currentIds, c.id]
                                  : currentIds.filter(id => id !== c.id);
                                setEditingMethod({
                                  ...editingMethod,
                                  visibility: {
                                    mode: editingMethod.visibility?.mode || "exclude",
                                    client_ids: newIds
                                  }
                                });
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Toggle & Sort Order */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMethod.is_active !== false}
                    onChange={(e) => setEditingMethod({ ...editingMethod, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Active & Enabled for Shared Invoices/Subs</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold">Sort Order:</span>
                  <input
                    type="number"
                    value={editingMethod.sort_order || 1}
                    onChange={(e) => setEditingMethod({ ...editingMethod, sort_order: parseInt(e.target.value) || 1 })}
                    className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-center font-bold"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {saving ? "Saving..." : "Save Payment Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          try {
            const res = await fetch(`/api/payment-methods?id=${encodeURIComponent(deleteConfirmId)}`, { method: "DELETE" });
            if (res.ok) {
              toast.success("Payment method deleted successfully");
              fetchData();
            } else {
              toast.error("Failed to delete payment method");
            }
          } catch (err: any) {
            toast.error("Error: " + err.message);
          }
        }}
        title="Delete Payment Method"
        description="Are you sure you want to delete this payment method? Shared links will no longer show this payment option."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
