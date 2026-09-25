"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  User,
  MessageCircle,
  Globe,
  Search,
  X,
  Plus,
  Check,
  ExternalLink,
  Sparkles,
  Link,
  Phone,
  Building,
  CreditCard,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type EntityType =
  | "invoice"
  | "client"
  | "subscription_user"
  | "plan"
  | "whatsapp"
  | "instagram"
  | "attendx";

interface EntityMentionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType | null;
  onInsert: (snippet: string, mentionData?: any) => void;
}

export function EntityMentionModal({
  open,
  onOpenChange,
  entityType,
  onInsert,
}: EntityMentionModalProps) {
  const supabase = createClient();

  const [mode, setMode] = useState<"select" | "manual">("select");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // CRM datasets
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [subUsers, setSubUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Selected item state
  const [selectedId, setSelectedId] = useState<string>("");

  // Manual input states
  const [manualTitle, setManualTitle] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [manualExtra, setManualExtra] = useState("");

  useEffect(() => {
    if (open && entityType) {
      setMode("select");
      setSearch("");
      setSelectedId("");
      setManualTitle("");
      setManualValue("");
      setManualExtra("");

      const loadData = async () => {
        setLoading(true);
        try {
          if (entityType === "invoice") {
            const { data } = await supabase
              .from("invoices")
              .select(
                "id, invoice_number, date, currency, status, client:clients(name), items:invoice_items(*)",
              )
              .order("date", { ascending: false })
              .limit(50);
            setInvoices(data || []);
            if (data && data.length > 0) setSelectedId(data[0].id);
          } else if (entityType === "client") {
            const { data } = await supabase
              .from("clients")
              .select("id, name, email, phone")
              .order("name")
              .limit(50);
            setClients(data || []);
            if (data && data.length > 0) setSelectedId(data[0].id);
          } else if (entityType === "subscription_user") {
            const { data } = await supabase
              .from("subscription_users")
              .select("id, name, contact, phone")
              .order("name")
              .limit(50);
            setSubUsers(data || []);
            if (data && data.length > 0) setSelectedId(data[0].id);
          } else if (entityType === "plan") {
            const { data } = await supabase
              .from("subscription_plans")
              .select("id, name, selling_price, number_of_slots")
              .order("name")
              .limit(50);
            setPlans(data || []);
            if (data && data.length > 0) setSelectedId(data[0].id);
          } else if (entityType === "attendx") {
            const res = await fetch("/api/attendx");
            if (res.ok) {
              const data = await res.json();
              setOrganizations(data.organizations || []);
              if (data.organizations?.length > 0)
                setSelectedId(data.organizations[0].id);
            }
          }
        } catch (e) {
          console.error("Error loading entity data:", e);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [open, entityType]);

  if (!open || !entityType) return null;

  const handleConfirmInsert = () => {
    let snippet = "";
    let mentionData: any = null;

    if (entityType === "invoice") {
      if (mode === "select") {
        const inv = invoices.find((i) => i.id === selectedId);
        if (!inv) return;
        const subtotal =
          inv.items?.reduce(
            (sum: number, item: any) => sum + item.quantity * item.rate,
            0,
          ) || 0;
        snippet = `<p>📄 <strong>Invoice Reference:</strong> <span style="background-color: rgba(99,102,241,0.15); color: #818cf8; padding: 2px 8px; border-radius: 6px; font-weight: bold;">#${inv.invoice_number}</span> ${inv.client?.name ? `(${inv.client.name})` : ""} - <strong>${inv.currency || "৳"}${subtotal.toLocaleString()}</strong></p>`;
        mentionData = {
          type: "invoice",
          id: inv.id,
          label: `#${inv.invoice_number}`,
        };
      } else {
        const num = manualValue.trim() || "INV-CUSTOM";
        snippet = `<p>📄 <strong>Invoice Reference:</strong> <span style="background-color: rgba(99,102,241,0.15); color: #818cf8; padding: 2px 8px; border-radius: 6px; font-weight: bold;">#${num}</span> ${manualExtra ? `(${manualExtra})` : ""}</p>`;
        mentionData = { type: "invoice", label: `#${num}` };
      }
    } else if (entityType === "client") {
      if (mode === "select") {
        const client = clients.find((c) => c.id === selectedId);
        if (!client) return;
        snippet = `<p>👤 <strong>Client CRM:</strong> <span style="background-color: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${client.name}</span> ${client.email ? `&lt;${client.email}&gt;` : ""} ${client.phone ? `(${client.phone})` : ""}</p>`;
        mentionData = {
          type: "client",
          id: client.id,
          label: `@${client.name}`,
        };
      } else {
        const name = manualValue.trim() || "Client Name";
        snippet = `<p>👤 <strong>Client CRM:</strong> <span style="background-color: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${name}</span> ${manualExtra ? `(${manualExtra})` : ""}</p>`;
        mentionData = { type: "client", label: `@${name}` };
      }
    } else if (entityType === "subscription_user") {
      if (mode === "select") {
        const u = subUsers.find((u) => u.id === selectedId);
        if (!u) return;
        snippet = `<p>💳 <strong>Subscription User:</strong> <span style="background-color: rgba(6,182,212,0.15); color: #22d3ee; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${u.name}</span> ${u.contact ? `(${u.contact})` : ""} ${u.phone ? `[${u.phone}]` : ""}</p>`;
        mentionData = { type: "user", id: u.id, label: `@${u.name}` };
      } else {
        const name = manualValue.trim() || "Subscriber";
        snippet = `<p>💳 <strong>Subscription User:</strong> <span style="background-color: rgba(6,182,212,0.15); color: #22d3ee; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${name}</span> ${manualExtra ? `(${manualExtra})` : ""}</p>`;
        mentionData = { type: "user", label: `@${name}` };
      }
    } else if (entityType === "plan") {
      if (mode === "select") {
        const p = plans.find((pl) => pl.id === selectedId);
        if (!p) return;
        snippet = `<p>📦 <strong>Subscription Plan:</strong> <span style="background-color: rgba(245,158,11,0.15); color: #fbbf24; padding: 2px 8px; border-radius: 6px; font-weight: bold;">${p.name}</span> (Price: ৳${p.selling_price}/slot · Slots: ${p.number_of_slots})</p>`;
        mentionData = { type: "plan", id: p.id, label: p.name };
      } else {
        const name = manualValue.trim() || "Subscription Plan";
        snippet = `<p>📦 <strong>Subscription Plan:</strong> <span style="background-color: rgba(245,158,11,0.15); color: #fbbf24; padding: 2px 8px; border-radius: 6px; font-weight: bold;">${name}</span> ${manualExtra ? `(${manualExtra})` : ""}</p>`;
        mentionData = { type: "plan", label: name };
      }
    } else if (entityType === "whatsapp") {
      const phone = (mode === "select" ? "8801870828373" : manualValue).replace(
        /[^0-9]/g,
        "",
      );
      const label = manualTitle.trim() || `WhatsApp (${phone || "Official"})`;
      const waUrl = `https://wa.me/${phone || "8801870828373"}${manualExtra ? `?text=${encodeURIComponent(manualExtra)}` : ""}`;
      snippet = `<p>💬 <strong>WhatsApp:</strong> <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="color: #4ade80; font-weight: bold; text-decoration: underline;">${label}</a></p>`;
      mentionData = { type: "entity", label, url: waUrl, icon: "fa-whatsapp" };
    } else if (entityType === "instagram") {
      const handle = (mode === "select" ? "thenicedev" : manualValue)
        .replace("@", "")
        .trim();
      const igUrl = `https://instagram.com/${handle}`;
      snippet = `<p>📸 <strong>Instagram:</strong> <a href="${igUrl}" target="_blank" rel="noopener noreferrer" style="color: #f472b6; font-weight: bold; text-decoration: underline;">@${handle}</a></p>`;
      mentionData = {
        type: "entity",
        label: `@${handle}`,
        url: igUrl,
        icon: "fa-instagram",
      };
    } else if (entityType === "attendx") {
      if (mode === "select") {
        const org = organizations.find((o) => o.id === selectedId);
        if (!org) return;
        snippet = `<p>🎓 <strong>AttendX / AcademiX SaaS:</strong> <span style="background-color: rgba(168,85,247,0.15); color: #c084fc; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${org.org_name}</span> (OrgID: <code>${org.org_id}</code> - Status: <strong>${org.status}</strong>) - <a href="/attendx" style="color: #818cf8; text-decoration: underline;">Open Dashboard</a></p>`;
        mentionData = {
          type: "subscription",
          id: org.org_id,
          label: org.org_name,
          icon: "fa-graduation-cap",
        };
      } else {
        const orgId = manualValue.trim() || "academix_main";
        const orgName = manualTitle.trim() || "AttendX Organization";
        snippet = `<p>🎓 <strong>AttendX / AcademiX SaaS:</strong> <span style="background-color: rgba(168,85,247,0.15); color: #c084fc; padding: 2px 8px; border-radius: 6px; font-weight: bold;">@${orgName}</span> (OrgID: <code>${orgId}</code>) - <a href="/attendx" style="color: #818cf8; text-decoration: underline;">Open Dashboard</a></p>`;
        mentionData = {
          type: "subscription",
          id: orgId,
          label: orgName,
          icon: "fa-graduation-cap",
        };
      }
    }

    if (snippet) {
      onInsert(snippet, mentionData);
      onOpenChange(false);
    }
  };

  const getModalConfig = () => {
    switch (entityType) {
      case "invoice":
        return {
          title: "Insert Invoice Reference (@Invoice)",
          icon: <FileText className="w-5 h-5 text-indigo-400" />,
          badgeColor: "bg-indigo-500/20 text-indigo-400",
          selectLabel: "Select Invoice from Database",
          manualLabel: "Enter Invoice Number",
        };
      case "client":
        return {
          title: "Insert Client Mention (@Client)",
          icon: <User className="w-5 h-5 text-emerald-400" />,
          badgeColor: "bg-emerald-500/20 text-emerald-400",
          selectLabel: "Select Client from CRM",
          manualLabel: "Enter Client Name",
        };
      case "subscription_user":
        return {
          title: "Insert Subscription User (@User)",
          icon: <CreditCard className="w-5 h-5 text-cyan-400" />,
          badgeColor: "bg-cyan-500/20 text-cyan-400",
          selectLabel: "Select Subscription User",
          manualLabel: "Enter User Name",
        };
      case "plan":
        return {
          title: "Insert Subscription Plan (@Plan)",
          icon: <Layers className="w-5 h-5 text-amber-400" />,
          badgeColor: "bg-amber-500/20 text-amber-400",
          selectLabel: "Select Subscription Plan",
          manualLabel: "Enter Plan Name",
        };
      case "whatsapp":
        return {
          title: "Insert WhatsApp Chat Link (@WhatsApp)",
          icon: <MessageCircle className="w-5 h-5 text-green-400" />,
          badgeColor: "bg-green-500/20 text-green-400",
          selectLabel: "Quick Preset",
          manualLabel: "Enter Custom Phone Number",
        };
      case "instagram":
        return {
          title: "Insert Instagram Profile (@Instagram)",
          icon: (
            <i className="fa-brands fa-instagram text-lg text-pink-400"></i>
          ),
          badgeColor: "bg-pink-500/20 text-pink-400",
          selectLabel: "Quick Preset Handle",
          manualLabel: "Enter Instagram Handle",
        };
      case "attendx":
        return {
          title: "Insert AttendX / AcademiX Org (@AttendX)",
          icon: <Globe className="w-5 h-5 text-purple-400" />,
          badgeColor: "bg-purple-500/20 text-purple-400",
          selectLabel: "Select Organization from AttendX",
          manualLabel: "Enter Custom Org ID",
        };
      default:
        return {
          title: "Insert Entity Mention",
          icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
          badgeColor: "bg-indigo-500/20 text-indigo-400",
          selectLabel: "Select from System",
          manualLabel: "Manually Enter",
        };
    }
  };

  const config = getModalConfig();

  // Filtered lists for selection
  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.client?.name &&
        i.client.name.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredOrgs = organizations.filter(
    (o) =>
      o.org_name.toLowerCase().includes(search.toLowerCase()) ||
      o.org_id.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredSubUsers = subUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.contact && u.contact.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.badgeColor}`}
            >
              {config.icon}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{config.title}</h3>
              <p className="text-xs text-zinc-400">
                Choose from existing database or type custom values
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Select from Dropdown vs Manually Enter */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2">
          <button
            onClick={() => setMode("select")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "select"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Select from System Dropdown
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "manual"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Manually Enter
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
          {mode === "select" ? (
            <div className="space-y-3">
              {/* Search bar for lists */}
              {["invoice", "client", "attendx"].includes(entityType) && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder={`Search ${entityType}s...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* LIST: Invoices */}
              {entityType === "invoice" && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      Loading invoices...
                    </p>
                  ) : filteredInvoices.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      No invoices found.
                    </p>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isSelected = selectedId === inv.id;
                      const subtotal =
                        inv.items?.reduce(
                          (sum: number, item: any) =>
                            sum + item.quantity * item.rate,
                          0,
                        ) || 0;
                      return (
                        <div
                          key={inv.id}
                          onClick={() => setSelectedId(inv.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs flex items-center gap-2">
                              <span>#{inv.invoice_number}</span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  inv.status === "paid"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400">
                              Client: {inv.client?.name || "N/A"} ·{" "}
                              {new Date(inv.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-black text-xs text-indigo-400">
                            {inv.currency || "৳"}
                            {subtotal.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* LIST: Clients */}
              {entityType === "client" && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      Loading clients...
                    </p>
                  ) : filteredClients.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      No clients found.
                    </p>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = selectedId === client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => setSelectedId(client.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600/20 border-emerald-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-white">
                              @{client.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400">
                              {client.email ||
                                client.phone ||
                                "No contact info"}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* LIST: Subscription Users */}
              {entityType === "subscription_user" && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      Loading subscription users...
                    </p>
                  ) : filteredSubUsers.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      No subscription users found.
                    </p>
                  ) : (
                    filteredSubUsers.map((u) => {
                      const isSelected = selectedId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedId(u.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-cyan-600/20 border-cyan-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-white">
                              @{u.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400">
                              {u.contact || u.phone || "No contact info"}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* LIST: Subscription Plans */}
              {entityType === "plan" && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      Loading subscription plans...
                    </p>
                  ) : filteredPlans.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      No subscription plans found.
                    </p>
                  ) : (
                    filteredPlans.map((p) => {
                      const isSelected = selectedId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-600/20 border-amber-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-white">
                              {p.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400">
                              Slots: {p.number_of_slots}
                            </p>
                          </div>
                          <span className="font-black text-xs text-amber-400">
                            ৳{p.selling_price?.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* LIST: AttendX Organizations */}
              {entityType === "attendx" && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      Loading organizations...
                    </p>
                  ) : filteredOrgs.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 py-6">
                      No AttendX organizations found.
                    </p>
                  ) : (
                    filteredOrgs.map((org) => {
                      const isSelected = selectedId === org.id;
                      return (
                        <div
                          key={org.id}
                          onClick={() => setSelectedId(org.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-600/20 border-purple-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div>
                            <h4 className="font-extrabold text-xs text-white">
                              @{org.org_name}
                            </h4>
                            <p className="text-[10px]  text-zinc-400">
                              OrgID: {org.org_id} ({org.status})
                            </p>
                          </div>
                          <span className="font-black text-xs text-purple-400">
                            {org.currency}
                            {org.plan_price?.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* PRESET: WhatsApp */}
              {entityType === "whatsapp" && (
                <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    <span className="font-bold text-xs text-white">
                      Default Business WhatsApp
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 ">
                    Phone: +8801870828373 (Official Support)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Generates direct chat link: <code>wa.me/8801870828373</code>
                  </p>
                </div>
              )}

              {/* PRESET: Instagram */}
              {entityType === "instagram" && (
                <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <i className="fa-brands fa-instagram text-pink-400 text-base"></i>
                    <span className="font-bold text-xs text-white">
                      Default Instagram Profile
                    </span>
                  </div>
                  <p className="text-xs text-pink-400 ">@thenicedev</p>
                  <p className="text-[11px] text-zinc-500">
                    Generates profile link:{" "}
                    <code>https://instagram.com/thenicedev</code>
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL ENTER MODE */
            <div className="space-y-4">
              {entityType === "whatsapp" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Phone Number (with Country Code) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8801870828373 or +1234567890"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs  font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Display Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Customer Support Line"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Prefilled Message (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hello, I have an inquiry regarding..."
                      value={manualExtra}
                      onChange={(e) => setManualExtra(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : entityType === "instagram" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Instagram Username / Handle *
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-pink-400">
                        @
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. thenicedev, brandname"
                        value={manualValue}
                        onChange={(e) =>
                          setManualValue(e.target.value.replace("@", ""))
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs  font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : entityType === "invoice" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-9918"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Additional Details / Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Event Management Portfolio - ৳25,000"
                      value={manualExtra}
                      onChange={(e) => setManualExtra(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : entityType === "client" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Client / Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AcademiX University ERP"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Email or Contact Info (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. admin@academix.xyz"
                      value={manualExtra}
                      onChange={(e) => setManualExtra(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : (
                /* AttendX */
                <>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AttendX Dhaka Campus"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
                      Organization ID (orgId) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. attendx_campus_dhaka"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs  text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmInsert}
            className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 uppercase tracking-wider"
          >
            Insert {config.title.split(" ")[1] || "Mention"}
          </button>
        </div>
      </div>
    </div>
  );
}
