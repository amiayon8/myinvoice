"use client";

import React, { useState, useEffect } from "react";
import {
  AttendxOrganization,
  HardwareItem,
  AttendxSubscriptionStatus,
  ATTENDX_DEFAULT_PLANS,
  PricingPlan,
  AttendxPayment,
  AttendxFinancials
} from "@/types/attendx";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Zap,
  FileText,
  Copy,
  Check,
  Globe,
  Radio,
  Server,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Code2,
  HardDrive,
  DollarSign,
  ChevronRight,
  Sparkles,
  Terminal,
  Activity,
  Calendar,
  Tag,
  Percent,
  CheckCircle2,
  Users,
  CreditCard,
  History,
  TrendingUp,
  Receipt,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function AttendxPage() {
  const supabase = createClient();

  const [organizations, setOrganizations] = useState<AttendxOrganization[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Org state & detailed tab view
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeOrgTab, setActiveOrgTab] = useState<"analytics" | "invoices" | "payments" | "hardware" | "integration">("analytics");

  // Pricing Plans view toggle
  const [plansBillingCycle, setPlansBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showPlansReference, setShowPlansReference] = useState(false);

  // Modal States
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<AttendxOrganization> | null>(null);
  const [orgPlanCycle, setOrgPlanCycle] = useState<"monthly" | "yearly">("monthly");

  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);
  const [activeOrgForHardware, setActiveOrgForHardware] = useState<AttendxOrganization | null>(null);
  const [hardwareForm, setHardwareForm] = useState<Partial<HardwareItem>>({
    name: "ZKTeco Biometric Time Attendance Terminal",
    quantity: 1,
    unit_price: 18500,
    warranty_months: 12,
    serial_numbers: [],
    sold_date: new Date().toISOString().split("T")[0]
  });
  const [serialInput, setSerialInput] = useState("");

  // ADVANCED BILL GENERATOR STATE
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billingOrg, setBillingOrg] = useState<AttendxOrganization | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>("silver");
  const [billBillingCycle, setBillBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [billDurationMonths, setBillDurationMonths] = useState<number>(1);
  const [customPlanPrice, setCustomPlanPrice] = useState<number>(1049);
  const [studentCount, setStudentCount] = useState<number>(150);
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedHardwareIds, setSelectedHardwareIds] = useState<string[]>([]);
  const [billCustomNotes, setBillCustomNotes] = useState<string>("");
  const [dueDays, setDueDays] = useState<number>(14);

  const [generatedBillResult, setGeneratedBillResult] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // RECORD PAYMENT MODAL STATE
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState<{
    amount: number;
    payment_date: string;
    payment_method: string;
    transaction_id: string;
    invoice_id: string;
    notes: string;
  }>({
    amount: 1049,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer",
    transaction_id: "",
    invoice_id: "",
    notes: ""
  });
  const [payLoading, setPayLoading] = useState(false);

  // API Tester Modal
  const [apiTesterOpen, setApiTesterOpen] = useState(false);
  const [testedOrg, setTestedOrg] = useState<AttendxOrganization | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Cache Purge Loading states per Org
  const [purgingOrgId, setPurgingOrgId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, clientsRes] = await Promise.all([
        fetch("/api/attendx"),
        supabase.from("clients").select("id, name, email")
      ]);

      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.organizations || []);
        if (data.organizations?.length > 0 && !selectedOrgId) {
          const firstOrgId = data.organizations[0].id;
          setSelectedOrgId(firstOrgId);
          fetchOrgDetails(data.organizations[0].org_id);
        }
      }

      if (clientsRes.data) {
        setClients(clientsRes.data);
      }
    } catch (e) {
      console.error("Failed to load AttendX data:", e);
      toast.error("Failed to load AttendX organizations");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgDetails = async (orgId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/attendx?orgId=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrgDetails(data.organization);
      }
    } catch (e) {
      console.error("Failed to fetch organization details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectOrg = (org: AttendxOrganization) => {
    setSelectedOrgId(org.id);
    fetchOrgDetails(org.org_id);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ONE-CLICK ACTION: Purge Client Cache via Webhook
  const handlePurgeCache = async (org: AttendxOrganization) => {
    setPurgingOrgId(org.id);
    const toastId = toast.loading(`Triggering cache refresh on ${org.org_name}...`);
    try {
      const res = await fetch("/api/attendx/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.org_id })
      });
      const data = await res.json();
      toast.dismiss(toastId);

      if (res.ok && data.success) {
        toast.success(`Cache purged successfully on ${org.org_name}! Client received status 200.`);
      } else {
        toast.error(`Webhook note: ${data.message || "Failed to reach client endpoint"}`);
      }
      fetchData();
      if (selectedOrgDetails) fetchOrgDetails(selectedOrgDetails.org_id);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(`Purge failed: ${e.message}`);
    } finally {
      setPurgingOrgId(null);
    }
  };

  // ONE-CLICK ACTION: Extend Subscription by +30 Days
  const handleQuickExtend30Days = async (org: AttendxOrganization) => {
    const currentEnd = new Date(org.subscription_ends);
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + 30 * 86400000);
    const newWarning = new Date(newEnd.getTime() - 5 * 86400000);

    const toastId = toast.loading(`Extending ${org.org_name} by 30 days...`);
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...org,
          status: "active",
          subscription_ends: newEnd.toISOString(),
          warning_start: newWarning.toISOString()
        })
      });

      if (!res.ok) throw new Error("Failed to save updated subscription");

      toast.dismiss(toastId);
      toast.success(`Extended until ${newEnd.toLocaleDateString()}! Dispatching cache purge...`);

      handlePurgeCache(org);
      fetchData();
      if (selectedOrgDetails) fetchOrgDetails(selectedOrgDetails.org_id);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(`Extend failed: ${e.message}`);
    }
  };

  // ONE-CLICK ACTION: Test API Contract
  const handleTestApi = async (org: AttendxOrganization) => {
    setTestedOrg(org);
    setApiTesterOpen(true);
    setApiLoading(true);
    try {
      const res = await fetch(`/management/api/checkSubscription?orgId=${encodeURIComponent(org.org_id)}`);
      const data = await res.json();
      setApiResponse(data);
    } catch (e: any) {
      setApiResponse({ error: e.message });
    } finally {
      setApiLoading(false);
    }
  };

  // Select Plan for new/editing Org
  const handleSelectPlanForOrg = (plan: PricingPlan, cycle: "monthly" | "yearly") => {
    const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    setEditingOrg((prev) => ({
      ...prev,
      plan_tier: plan.id,
      plan_price: price,
      billing_cycle: cycle,
      student_count: plan.studentMax
    }));
  };

  // Save Organization
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg?.org_id || !editingOrg?.org_name) {
      toast.error("Please fill in Org ID and Organization Name");
      return;
    }

    const toastId = toast.loading("Saving organization to database...");
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingOrg,
          client_id: editingOrg.client_id || editingOrg.org_id,
          client_web_base: editingOrg.client_web_base || "https://managementsite.academix.xyz",
          status: editingOrg.status || "active",
          plan_price: Number(editingOrg.plan_price) || 0,
          currency: editingOrg.currency || "৳",
          warning_start: editingOrg.warning_start || new Date(Date.now() + 25 * 86400000).toISOString(),
          subscription_ends: editingOrg.subscription_ends || new Date(Date.now() + 30 * 86400000).toISOString()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast.dismiss(toastId);
      toast.success("Organization saved to Supabase DB!");
      setOrgModalOpen(false);
      setEditingOrg(null);
      fetchData();
      if (selectedOrgDetails) fetchOrgDetails(selectedOrgDetails.org_id);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message);
    }
  };

  // Delete Organization
  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all linked hardware history.`)) return;

    try {
      const res = await fetch(`/api/attendx?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Organization deleted");
        fetchData();
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  // Save Hardware Item
  const handleSaveHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgForHardware || !hardwareForm.name) return;

    const toastId = toast.loading("Recording hardware deployment...");
    try {
      const res = await fetch("/api/attendx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: activeOrgForHardware.id,
          hardware_item: {
            ...hardwareForm,
            quantity: Number(hardwareForm.quantity) || 1,
            unit_price: Number(hardwareForm.unit_price) || 0,
            warranty_months: Number(hardwareForm.warranty_months) || 12,
            sold_date: hardwareForm.sold_date || new Date().toISOString().split("T")[0]
          }
        })
      });

      if (!res.ok) throw new Error("Failed to record hardware");

      toast.dismiss(toastId);
      toast.success("Hardware sale recorded in Supabase DB!");
      setHardwareModalOpen(false);
      fetchData();
      if (selectedOrgDetails) fetchOrgDetails(selectedOrgDetails.org_id);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message);
    }
  };

  // Open Generate Bill Modal & Initialize Calculation
  const handleOpenBillModal = (org: AttendxOrganization) => {
    setBillingOrg(org);
    setSelectedPlanTier(org.plan_tier || "silver");
    const cycle = org.billing_cycle === "yearly" ? "yearly" : "monthly";
    setBillBillingCycle(cycle);

    const plan = ATTENDX_DEFAULT_PLANS.find(p => p.id === (org.plan_tier || "silver")) || ATTENDX_DEFAULT_PLANS[1];
    const initialPrice = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

    setCustomPlanPrice(org.plan_price || initialPrice);
    setBillDurationMonths(cycle === "yearly" ? 12 : 1);
    setStudentCount(org.student_count || plan.studentMax);
    setDiscountType("none");
    setDiscountValue(0);
    setSelectedHardwareIds((org.hardware_sales || []).map(h => h.id));
    setGeneratedBillResult(null);
    setBillModalOpen(true);
  };

  // Open Record Payment Modal
  const handleOpenPaymentModal = (org: any, defaultAmount?: number, invoiceId?: string) => {
    setPayForm({
      amount: defaultAmount || org.financials?.outstanding_due || org.plan_price || 1049,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Bank Transfer",
      transaction_id: "",
      invoice_id: invoiceId || (org.invoices?.find((i: any) => i.status !== "paid")?.id || ""),
      notes: `Subscription renewal payment for ${org.org_name}`
    });
    setPayModalOpen(true);
  };

  // Submit Direct Payment Record
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setPayLoading(true);
    const toastId = toast.loading("Recording payment in Supabase database...");
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          organization_id: selectedOrg.id,
          ...payForm
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Payment recording failed");

      toast.dismiss(toastId);
      toast.success("Payment successfully recorded in collection ledger!");
      setPayModalOpen(false);
      fetchOrgDetails(selectedOrg.org_id);
      fetchData();
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Handle Plan Change in Bill Modal
  const handleBillPlanChange = (planId: string) => {
    setSelectedPlanTier(planId);
    const plan = ATTENDX_DEFAULT_PLANS.find(p => p.id === planId);
    if (plan) {
      const price = billBillingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      setCustomPlanPrice(price);
      setStudentCount(plan.studentMax);
    }
  };

  // Handle Billing Cycle Change in Bill Modal
  const handleBillCycleChange = (cycle: "monthly" | "yearly") => {
    setBillBillingCycle(cycle);
    const plan = ATTENDX_DEFAULT_PLANS.find(p => p.id === selectedPlanTier);
    if (plan) {
      const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      setCustomPlanPrice(price);
    }
    setBillDurationMonths(cycle === "yearly" ? 12 : 1);
  };

  // Calculate Real-time Invoice Breakdown
  const calculateBillTotals = () => {
    let planSubtotal = customPlanPrice * (billBillingCycle === "yearly" ? Math.max(1, Math.round(billDurationMonths / 12)) : billDurationMonths);

    // Calculate discount
    let discountAmount = 0;
    if (discountType === "percentage" && discountValue > 0) {
      discountAmount = Math.round((planSubtotal * discountValue) / 100);
    } else if (discountType === "fixed" && discountValue > 0) {
      discountAmount = discountValue;
    }

    const discountedPlanTotal = Math.max(0, planSubtotal - discountAmount);

    // Calculate hardware total
    const hardwareItems = (billingOrg?.hardware_sales || []).filter(h => selectedHardwareIds.includes(h.id));
    const hardwareTotal = hardwareItems.reduce((sum, h) => sum + (h.unit_price * h.quantity), 0);

    const grandTotal = discountedPlanTotal + hardwareTotal;

    return {
      planSubtotal,
      discountAmount,
      discountedPlanTotal,
      hardwareItems,
      hardwareTotal,
      grandTotal
    };
  };

  // Execute Invoice Generation
  const handleExecuteGenerateBill = async () => {
    if (!billingOrg) return;
    setBillingLoading(true);

    const totals = calculateBillTotals();

    try {
      const res = await fetch("/api/attendx/generate-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: billingOrg.org_id,
          plan_tier: selectedPlanTier,
          billing_cycle: billBillingCycle,
          duration_months: billDurationMonths,
          custom_rate: customPlanPrice,
          students: studentCount,
          discount_type: discountType,
          discount_value: discountValue,
          selected_hardware: totals.hardwareItems,
          custom_notes: billCustomNotes,
          dueDays: dueDays
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bill generation failed");

      setGeneratedBillResult(data);
      toast.success(`Official Invoice #${data.invoice_number} created in Supabase!`);
      if (selectedOrg) fetchOrgDetails(selectedOrg.org_id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBillingLoading(false);
    }
  };

  // Filtered List
  const filteredOrgs = organizations.filter(o => {
    const matchesSearch =
      o.org_name.toLowerCase().includes(search.toLowerCase()) ||
      o.org_id.toLowerCase().includes(search.toLowerCase()) ||
      (o.client_web_base && o.client_web_base.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === "active").length;
  const warningOrgs = organizations.filter(o => o.status === "past_due" || o.status === "trialing").length;
  const totalMRR = organizations.reduce((sum, o) => sum + (o.status === "active" ? (o.plan_price || 0) : 0), 0);
  const totalHardwareUnits = organizations.reduce(
    (sum, o) => sum + (o.hardware_sales || []).reduce((hSum, h) => hSum + (h.quantity || 0), 0),
    0
  );

  const selectedOrg = selectedOrgDetails || organizations.find(o => o.id === selectedOrgId) || organizations[0];
  const totals = calculateBillTotals();

  const orgFinancials: AttendxFinancials = selectedOrg?.financials || {
    total_billed: 0,
    total_collected: 0,
    outstanding_due: 0,
    hardware_revenue: (selectedOrg?.hardware_sales || []).reduce((sum: number, h: any) => sum + h.unit_price * h.quantity, 0),
    saas_revenue: selectedOrg?.plan_price || 0,
    lifetime_spent: 0,
    collection_rate: 100,
    invoice_count: 0,
    paid_invoices_count: 0,
    unpaid_invoices_count: 0
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 bg-[#020617] text-slate-100 min-h-screen font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                AttendX / Academix Hub
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  DB Persistent
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Subscription analytics, dues, client spent, payment history, hardware sales & management API.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowPlansReference(!showPlansReference)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showPlansReference
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Pricing Plans</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          <button
            onClick={() => {
              setOrgPlanCycle("monthly");
              setEditingOrg({
                status: "active",
                plan_tier: "silver",
                billing_cycle: "monthly",
                currency: "৳",
                plan_price: 1049,
                student_count: 200,
                warning_start: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
                subscription_ends: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
              });
              setOrgModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
        </div>
      </div>

      {/* PRICING PLANS REFERENCE BANNER (EXPANDABLE) */}
      {showPlansReference && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 animate-fade-in shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Official Academix / AttendX Pricing Tiers
              </h3>
              <p className="text-xs text-slate-400">Select any tier to pre-populate billing or create new institution.</p>
            </div>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
              <button
                onClick={() => setPlansBillingCycle("monthly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  plansBillingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setPlansBillingCycle("yearly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  plansBillingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Yearly Billing</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">2 Mo Free</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {ATTENDX_DEFAULT_PLANS.map((plan) => {
              const price = plansBillingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
              const period = plansBillingCycle === "yearly" ? "/year" : "/month";

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border bg-gradient-to-b ${plan.bgGradient} ${plan.borderColor} flex flex-col justify-between space-y-3 relative`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-white" style={{ color: plan.color }}>
                        {plan.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">{plan.students}</span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-black text-white">৳{price.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{period}</span>
                    </div>

                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setOrgPlanCycle(plansBillingCycle);
                      setEditingOrg({
                        status: "active",
                        plan_tier: plan.id,
                        billing_cycle: plansBillingCycle,
                        currency: "৳",
                        plan_price: price,
                        student_count: plan.studentMax,
                        warning_start: new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
                        subscription_ends: new Date(Date.now() + (plansBillingCycle === "yearly" ? 365 : 30) * 86400000).toISOString().split("T")[0]
                      });
                      setOrgModalOpen(true);
                    }}
                    className="w-full py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg transition-all text-center cursor-pointer"
                  >
                    Select {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Institutions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalOrgs}</span>
            <span className="text-xs text-emerald-400 font-bold">({activeOrgs} Active)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Live SaaS client instances</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Recurring</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">৳{totalMRR.toLocaleString()}</span>
            <span className="text-xs text-slate-400">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From active subscription plans</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hardware Deployed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalHardwareUnits}</span>
            <span className="text-xs text-purple-400 font-bold">Devices</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Biometrics, Readers, NFC Terminals</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription Health</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${warningOrgs > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {warningOrgs > 0 ? (
              <>
                <span className="text-2xl font-black text-amber-400">{warningOrgs}</span>
                <span className="text-xs text-amber-400 font-bold">Need Renewal</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-emerald-400">100%</span>
                <span className="text-xs text-emerald-400 font-bold">Healthy</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {warningOrgs > 0 ? "Warning start reached" : "All subscriptions up to date"}
          </p>
        </div>
      </div>

      {/* Main Layout: Directory (4 Cols) & Full Detail Hub (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Organization Directory (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Institutions Directory</h3>
            <span className="text-xs text-slate-500">{filteredOrgs.length} of {organizations.length}</span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search org name, orgId, or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {["all", "active", "past_due", "trialing", "canceled"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap cursor-pointer transition-all ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Organizations List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <i className="fa-solid fa-spinner animate-spin text-indigo-500 text-lg mb-2"></i>
                <p>Loading institutions from database...</p>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
                <p>No institutions matching filters.</p>
                <button
                  onClick={() => {
                    setEditingOrg({
                      org_id: "academix_main",
                      org_name: "Academix University & College ERP",
                      client_id: "academix_main",
                      client_web_base: "https://managementsite.academix.xyz",
                      status: "active",
                      plan_tier: "silver",
                      plan_price: 1049,
                      student_count: 200,
                      currency: "৳",
                      billing_cycle: "monthly"
                    });
                    setOrgModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold cursor-pointer"
                >
                  Add Academix Main
                </button>
              </div>
            ) : (
              filteredOrgs.map((org) => {
                const isSelected = selectedOrg?.id === org.id;
                const isExpired = new Date(org.subscription_ends) < new Date();
                const isWarning = !isExpired && new Date(org.warning_start) <= new Date();

                return (
                  <div
                    key={org.id}
                    onClick={() => handleSelectOrg(org)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-500/50"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white">{org.org_name}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                            {org.org_id}
                          </code>
                          {org.plan_tier && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                              {org.plan_tier}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              org.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : org.status === "past_due"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {org.status.replace("_", " ")}
                          </span>
                          {isWarning && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" /> Warning
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-sm text-white">
                          {org.currency}{org.plan_price?.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">{org.billing_cycle}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[170px] text-slate-400">
                        {org.client_web_base}
                      </span>
                      <span className="font-mono text-slate-300">
                        Ends: {new Date(org.subscription_ends).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Detail Hub with Analytics, Dues, Invoices, Payments (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedOrg ? (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6 shadow-xl">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{selectedOrg.org_name}</h2>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      selectedOrg.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {selectedOrg.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                    <span>Org ID: <strong className="text-indigo-400">{selectedOrg.org_id}</strong></span>
                    {selectedOrg.plan_tier && (
                      <span className="capitalize text-amber-400 font-bold">Tier: {selectedOrg.plan_tier}</span>
                    )}
                    {selectedOrg.student_count && (
                      <span>Capacity: {selectedOrg.student_count} Students</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenPaymentModal(selectedOrg)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingOrg(selectedOrg);
                      setOrgPlanCycle(selectedOrg.billing_cycle === "yearly" ? "yearly" : "monthly");
                      setOrgModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit Settings"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOrg(selectedOrg.id, selectedOrg.org_name)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Organization"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ONE-CLICK ACTIONS TOOLBAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Action 1: Quick Extend */}
                <button
                  onClick={() => handleQuickExtend30Days(selectedOrg)}
                  className="p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer shadow-sm group"
                >
                  <Clock className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                  <span className="text-[11px] font-black">+30 Days Extend</span>
                </button>

                {/* Action 2: Purge Cache */}
                <button
                  onClick={() => handlePurgeCache(selectedOrg)}
                  disabled={purgingOrgId === selectedOrg.id}
                  className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer shadow-sm group"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-400 group-hover:text-white ${purgingOrgId === selectedOrg.id ? "animate-spin" : ""}`} />
                  <span className="text-[11px] font-black">Purge Client Cache</span>
                </button>

                {/* Action 3: Generate Bill */}
                <button
                  onClick={() => handleOpenBillModal(selectedOrg)}
                  className="p-3 rounded-xl bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer shadow-sm group"
                >
                  <FileText className="w-4 h-4 text-amber-400 group-hover:text-white" />
                  <span className="text-[11px] font-black">Generate Bill / Inv</span>
                </button>

                {/* Action 4: Live API Contract Tester */}
                <button
                  onClick={() => handleTestApi(selectedOrg)}
                  className="p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 text-purple-300 hover:text-white flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer shadow-sm group"
                >
                  <Terminal className="w-4 h-4 text-purple-400 group-hover:text-white" />
                  <span className="text-[11px] font-black">Test API Contract</span>
                </button>
              </div>

              {/* TAB NAVIGATION: Analytics, Invoices, Payments, Hardware, Integration */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: "analytics", label: "Analytics & Dues", icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { id: "invoices", label: `Invoices History (${selectedOrg.invoices?.length || 0})`, icon: <Receipt className="w-3.5 h-3.5" /> },
                  { id: "payments", label: `Payments Ledger (${selectedOrg.payments?.length || 0})`, icon: <History className="w-3.5 h-3.5" /> },
                  { id: "hardware", label: `Hardware Devices (${selectedOrg.hardware_sales?.length || 0})`, icon: <HardDrive className="w-3.5 h-3.5" /> },
                  { id: "integration", label: "Server Integration", icon: <Globe className="w-3.5 h-3.5" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveOrgTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeOrgTab === tab.id
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: ANALYTICS & DUES & CLIENT SPENT */}
              {activeOrgTab === "analytics" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lifetime Client Spent</span>
                      <div className="text-xl font-black text-emerald-400 mt-1">
                        {selectedOrg.currency}{orgFinancials.lifetime_spent.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500">Total collected to date</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Dues</span>
                      <div className={`text-xl font-black mt-1 ${orgFinancials.outstanding_due > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {selectedOrg.currency}{orgFinancials.outstanding_due.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {orgFinancials.outstanding_due > 0 ? "Unpaid balance" : "Fully paid"}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</span>
                      <div className="text-xl font-black text-indigo-400 mt-1">
                        {selectedOrg.currency}{orgFinancials.total_billed.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500">{orgFinancials.invoice_count} invoices generated</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hardware Revenue</span>
                      <div className="text-xl font-black text-purple-400 mt-1">
                        {selectedOrg.currency}{orgFinancials.hardware_revenue.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500">{(selectedOrg.hardware_sales || []).length} devices sold</span>
                    </div>
                  </div>

                  {/* Revenue Stream Breakdown */}
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Revenue Breakdown</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300">SaaS Cloud Subscription ({selectedOrg.billing_cycle})</span>
                          <span className="font-bold text-indigo-400">{selectedOrg.currency}{selectedOrg.plan_price?.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: "70%" }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-300">Hardware Terminals & Kits</span>
                          <span className="font-bold text-purple-400">{selectedOrg.currency}{orgFinancials.hardware_revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: "30%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES HISTORY */}
              {activeOrgTab === "invoices" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Generated Official Invoices</span>
                    <button
                      onClick={() => handleOpenBillModal(selectedOrg)}
                      className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Generate New Bill
                    </button>
                  </div>

                  {(!selectedOrg.invoices || selectedOrg.invoices.length === 0) ? (
                    <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs space-y-2">
                      <Receipt className="w-8 h-8 mx-auto stroke-1 text-slate-700" />
                      <p>No invoices generated yet for this institution.</p>
                      <button
                        onClick={() => handleOpenBillModal(selectedOrg)}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold"
                      >
                        Generate First Invoice
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOrg.invoices.map((inv: any) => (
                        <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white">#{inv.invoice_number}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                inv.status === "paid"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Issued: {inv.date} · Due: {inv.due_date}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-black text-sm text-white">
                                {inv.currency}{inv.total_amount?.toLocaleString()}
                              </div>
                              {inv.due_amount > 0 && (
                                <span className="text-[10px] text-rose-400 font-bold block">
                                  Due: {inv.currency}{inv.due_amount?.toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {inv.due_amount > 0 && (
                                <button
                                  onClick={() => handleOpenPaymentModal(selectedOrg, inv.due_amount, inv.id)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                  title="Record Payment"
                                >
                                  Pay
                                </button>
                              )}
                              <a
                                href={inv.share_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                                title="Open Invoice"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS LEDGER */}
              {activeOrgTab === "payments" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Payment Collection History</span>
                    <button
                      onClick={() => handleOpenPaymentModal(selectedOrg)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  </div>

                  {(!selectedOrg.payments || selectedOrg.payments.length === 0) ? (
                    <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs space-y-2">
                      <History className="w-8 h-8 mx-auto stroke-1 text-slate-700" />
                      <p>No payments recorded in collection ledger yet.</p>
                      <button
                        onClick={() => handleOpenPaymentModal(selectedOrg)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                      >
                        Record First Payment
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOrg.payments.map((pmt: AttendxPayment) => (
                        <div key={pmt.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-emerald-400">
                                + {selectedOrg.currency}{pmt.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                                {pmt.payment_method}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Date: {pmt.payment_date} {pmt.transaction_id ? `· Trx: ${pmt.transaction_id}` : ""}
                            </p>
                            {pmt.notes && (
                              <p className="text-[10px] text-slate-500 italic">{pmt.notes}</p>
                            )}
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HARDWARE DEVICES */}
              {activeOrgTab === "hardware" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Hardware Deployments & Inventory</span>
                    <button
                      onClick={() => {
                        setActiveOrgForHardware(selectedOrg);
                        setHardwareModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Device
                    </button>
                  </div>

                  {(!selectedOrg.hardware_sales || selectedOrg.hardware_sales.length === 0) ? (
                    <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs">
                      No hardware devices logged for this organization yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOrg.hardware_sales.map((hw: HardwareItem) => (
                        <div key={hw.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <h5 className="font-bold text-white">{hw.name}</h5>
                            <p className="text-[10px] text-slate-400">
                              Qty: <strong className="text-slate-200">{hw.quantity}</strong> · Warranty: {hw.warranty_months || 12} Mo · Sold: {hw.sold_date}
                            </p>
                            {hw.serial_numbers && hw.serial_numbers.length > 0 && (
                              <p className="text-[10px] font-mono text-indigo-400">
                                S/N: {hw.serial_numbers.join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right font-black text-purple-400">
                            {selectedOrg.currency}{(hw.unit_price * hw.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: INTEGRATION & WEBHOOK */}
              {activeOrgTab === "integration" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" /> Client Server Integration
                    </span>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Client Web Base URL</label>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 mt-1 font-mono text-slate-200">
                          <span className="truncate">{selectedOrg.client_web_base || "Not configured"}</span>
                          <button
                            onClick={() => handleCopy(selectedOrg.client_web_base, "url")}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            {copiedKey === "url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Client ID (Webhook Secret / Bearer Token)</label>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 mt-1 font-mono text-indigo-300">
                          <span>{selectedOrg.client_id || selectedOrg.org_id}</span>
                          <button
                            onClick={() => handleCopy(selectedOrg.client_id || selectedOrg.org_id, "token")}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            {copiedKey === "token" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedOrg.last_webhook_status && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${selectedOrg.last_webhook_status.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                          Last Webhook: {selectedOrg.last_webhook_status.message}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(selectedOrg.last_webhook_status.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 space-y-2">
              <GraduationCap className="w-12 h-12 stroke-1 text-slate-700 mx-auto" />
              <h4 className="font-bold text-slate-300">No Organization Selected</h4>
              <p className="text-xs">Select an organization from the left directory to view details and trigger actions.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT ORGANIZATION WITH INTERACTIVE PLAN SELECTOR */}
      {orgModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white">
                {editingOrg?.id ? "Edit Institution Configuration" : "Add New AttendX Institution"}
              </h3>
              <button onClick={() => setOrgModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveOrg} className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-xs">
              {/* Plan Tier Selection Tiles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    Select Official Pricing Plan Tier
                  </label>
                  <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setOrgPlanCycle("monthly")}
                      className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        orgPlanCycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgPlanCycle("yearly")}
                      className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        orgPlanCycle === "yearly" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ATTENDX_DEFAULT_PLANS.map((plan) => {
                    const isSelected = editingOrg?.plan_tier === plan.id;
                    const price = orgPlanCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlanForOrg(plan, orgPlanCycle)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center space-y-1 relative ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500 shadow-md"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-extrabold text-xs block" style={{ color: plan.color }}>
                          {plan.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block">{plan.students}</span>
                        <div className="font-black text-xs text-white">৳{price.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Organization ID (orgId) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. academix_main"
                    value={editingOrg?.org_id || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, org_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Academix University ERP"
                    value={editingOrg?.org_name || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, org_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Client Web Base URL *</label>
                <input
                  type="text"
                  required
                  placeholder="https://clientapp.academix.xyz"
                  value={editingOrg?.client_web_base || ""}
                  onChange={(e) => setEditingOrg({ ...editingOrg, client_web_base: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Plan Tier</label>
                  <select
                    value={editingOrg?.plan_tier || "silver"}
                    onChange={(e) => {
                      const tier = e.target.value as any;
                      const plan = ATTENDX_DEFAULT_PLANS.find(p => p.id === tier);
                      const price = plan ? (orgPlanCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice) : editingOrg?.plan_price || 0;
                      setEditingOrg({ ...editingOrg, plan_tier: tier, plan_price: price });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none capitalize"
                  >
                    <option value="bronze">Bronze (50-100)</option>
                    <option value="silver">Silver (100-200)</option>
                    <option value="gold">Gold (200-400)</option>
                    <option value="diamond">Diamond (400-1000)</option>
                    <option value="platinum">Platinum (&gt;1000)</option>
                    <option value="custom">Custom Plan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Plan Rate ({editingOrg?.currency || "৳"})</label>
                  <input
                    type="number"
                    value={editingOrg?.plan_price || 0}
                    onChange={(e) => setEditingOrg({ ...editingOrg, plan_price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Billing Cycle</label>
                  <select
                    value={editingOrg?.billing_cycle || "monthly"}
                    onChange={(e) => setEditingOrg({ ...editingOrg, billing_cycle: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none capitalize"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="biannual">Biannual (6 Mo)</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-400 mb-1">Warning Start Date</label>
                  <input
                    type="date"
                    value={editingOrg?.warning_start?.split("T")[0] || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, warning_start: new Date(e.target.value).toISOString() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-rose-400 mb-1">Subscription Ends Date</label>
                  <input
                    type="date"
                    value={editingOrg?.subscription_ends?.split("T")[0] || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, subscription_ends: new Date(e.target.value).toISOString() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Link with CRM Client (Optional)</label>
                <select
                  value={editingOrg?.linked_client_id || ""}
                  onChange={(e) => setEditingOrg({ ...editingOrg, linked_client_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Client from CRM --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email || "No email"})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOrgModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 cursor-pointer"
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD HARDWARE DEPLOYMENT */}
      {hardwareModalOpen && activeOrgForHardware && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white">Record Hardware Deployment</h3>
              <button onClick={() => setHardwareModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveHardware} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Hardware Model / Device Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZKTeco Biometric Time Attendance Terminal"
                  value={hardwareForm.name || ""}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={hardwareForm.quantity || 1}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Unit Price ({activeOrgForHardware.currency})</label>
                  <input
                    type="number"
                    value={hardwareForm.unit_price || 0}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, unit_price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    value={hardwareForm.warranty_months || 12}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, warranty_months: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sold Date</label>
                  <input
                    type="date"
                    value={hardwareForm.sold_date || ""}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, sold_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Serial Numbers (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SN-ZK-991, SN-ZK-992"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value);
                    setHardwareForm({
                      ...hardwareForm,
                      serial_numbers: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setHardwareModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Save Hardware
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADVANCED BILL & INVOICE GENERATOR */}
      {billModalOpen && billingOrg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Generate Official Invoice</h3>
                  <p className="text-[11px] text-slate-400">{billingOrg.org_name} ({billingOrg.org_id})</p>
                </div>
              </div>
              <button onClick={() => setBillModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 text-xs">
              {/* Step 1: Select Plan Tier */}
              <div>
                <label className="block text-[10px] font-black uppercase text-amber-400 tracking-wider mb-2">
                  1. Subscription Tier
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ATTENDX_DEFAULT_PLANS.map((plan) => {
                    const isSelected = selectedPlanTier === plan.id;
                    const price = billBillingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handleBillPlanChange(plan.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500 shadow-md"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-black text-xs block" style={{ color: plan.color }}>
                          {plan.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block">{plan.students}</span>
                        <div className="font-black text-xs text-white mt-1">৳{price.toLocaleString()}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Duration in Months & Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    2. Duration Period (Months)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[1, 3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setBillDurationMonths(m);
                          if (m >= 12 && billBillingCycle !== "yearly") {
                            handleBillCycleChange("yearly");
                          } else if (m < 12 && billBillingCycle === "yearly") {
                            handleBillCycleChange("monthly");
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          billDurationMonths === m
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {m} {m === 12 ? "Yr (12 Mo)" : m === 24 ? "2 Yrs" : "Mo"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={billDurationMonths}
                    onChange={(e) => setBillDurationMonths(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Base Plan Rate ({billingOrg.currency})
                  </label>
                  <input
                    type="number"
                    value={customPlanPrice}
                    onChange={(e) => setCustomPlanPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-black text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-7"
                  />
                </div>
              </div>

              {/* Step 3: Discounts & Promotions */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" /> 3. Promotional Discount
                  </span>
                  <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountType("none")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "none" ? "bg-slate-800 text-white" : "text-slate-400"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "percentage" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "fixed" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Fixed ({billingOrg.currency})
                    </button>
                  </div>
                </div>

                {discountType !== "none" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={discountType === "percentage" ? "e.g. 10 (for 10% off)" : "e.g. 500 (for ৳500 off)"}
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {discountType === "percentage" ? "% Discount" : `${billingOrg.currency} Off`}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 4: Hardware Bundling Selector */}
              {billingOrg.hardware_sales && billingOrg.hardware_sales.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" /> 4. Bundle Hardware Deployments
                  </span>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {billingOrg.hardware_sales.map((hw) => {
                      const isChecked = selectedHardwareIds.includes(hw.id);
                      return (
                        <div
                          key={hw.id}
                          onClick={() => {
                            if (isChecked) setSelectedHardwareIds(selectedHardwareIds.filter(id => id !== hw.id));
                            else setSelectedHardwareIds([...selectedHardwareIds, hw.id]);
                          }}
                          className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer ${
                            isChecked ? "bg-purple-950/30 border-purple-600 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={isChecked} readOnly className="rounded text-purple-600" />
                            <div>
                              <span className="font-bold text-xs">{hw.name}</span>
                              <span className="text-[10px] text-slate-400 block">Qty: {hw.quantity}</span>
                            </div>
                          </div>
                          <span className="font-black text-xs text-purple-400">
                            {billingOrg.currency}{(hw.unit_price * hw.quantity).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE BREAKDOWN & GRAND TOTAL CARD */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                  Invoice Summary & Calculations
                </span>
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    {selectedPlanTier.toUpperCase()} Plan ({billDurationMonths} {billDurationMonths === 1 ? "Month" : "Months"} @ {billingOrg.currency}{customPlanPrice.toLocaleString()})
                  </span>
                  <span className="font-mono">{billingOrg.currency}{totals.planSubtotal.toLocaleString()}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount Applied ({discountType === "percentage" ? `${discountValue}%` : "Fixed"})</span>
                    <span className="font-mono">- {billingOrg.currency}{totals.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {totals.hardwareTotal > 0 && (
                  <div className="flex items-center justify-between text-purple-400">
                    <span>Hardware Deployments ({totals.hardwareItems.length} items)</span>
                    <span className="font-mono">+ {billingOrg.currency}{totals.hardwareTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between">
                  <span className="font-black text-sm text-white">Grand Total Amount</span>
                  <span className="font-black text-lg text-emerald-400">
                    {billingOrg.currency}{totals.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Result Container */}
              {generatedBillResult ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-black">
                    <CheckCircle2 className="w-5 h-5" /> Official Invoice #{generatedBillResult.invoice_number} Created in Supabase!
                  </div>
                  <p className="text-slate-300">
                    Total Amount: <strong>{billingOrg.currency}{generatedBillResult.total_amount?.toLocaleString()}</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={window.location.origin + generatedBillResult.share_url}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300"
                    />
                    <button
                      onClick={() => handleCopy(window.location.origin + generatedBillResult.share_url, "inv_link")}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shrink-0 cursor-pointer"
                    >
                      {copiedKey === "inv_link" ? "Copied!" : "Copy Link"}
                    </button>
                    <a
                      href={generatedBillResult.share_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shrink-0 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleExecuteGenerateBill}
                  disabled={billingLoading}
                  className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4" />
                  <span>{billingLoading ? "Creating Official Invoice in Supabase..." : "Confirm & Generate Invoice"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD PAYMENT MODAL */}
      {payModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-sm text-white">Record Client Payment</h3>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Amount ({selectedOrg.currency}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payForm.amount || ""}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Transaction ID / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TRX-992812 or Bank Ref"
                  value={payForm.transaction_id}
                  onChange={(e) => setPayForm({ ...payForm, transaction_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {selectedOrg.invoices && selectedOrg.invoices.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Link to Unpaid Invoice (Optional)</label>
                  <select
                    value={payForm.invoice_id}
                    onChange={(e) => setPayForm({ ...payForm, invoice_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Direct Payment (No Invoice Link) --</option>
                    {selectedOrg.invoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoice_number} ({inv.currency}{inv.total_amount?.toLocaleString()}) - Status: {inv.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly subscription payment cleared"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {payLoading ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: MANAGEMENT API TESTER */}
      {apiTesterOpen && testedOrg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" /> Management API Live Tester
              </h3>
              <button onClick={() => setApiTesterOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Endpoint URL</label>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-purple-300 break-all">
                  GET /management/api/checkSubscription?orgId={testedOrg.org_id}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Live JSON Response</label>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-emerald-400 text-xs overflow-x-auto">
                  {apiLoading ? "Fetching..." : JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>

              <p className="text-[11px] text-slate-500">
                Matches the client contract: <code>&#123; Status, WarningStart, SubscriptionEnds &#125;</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
