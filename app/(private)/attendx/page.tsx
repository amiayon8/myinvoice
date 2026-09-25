"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Server,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  Clock,
  DollarSign,
  AlertTriangle,
  FileText,
  Activity,
  CreditCard,
  Building2,
  Trash2,
  Edit,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Cpu,
  Receipt,
  PlusCircle,
  Copy,
  Terminal,
  ArrowLeft,
  Sparkles,
  Percent,
  Calendar,
  Layers,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { AttendxOrganization, HardwareItem } from "@/types/attendx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDebounce } from "@/hooks/use-debounce";

// Default pricing tiers for AttendX / AcademiX
export const ATTENDX_DEFAULT_PLANS = [
  {
    id: "bronze",
    name: "Bronze",
    students: "50-100 Students",
    monthlyPrice: 1500,
    yearlyPrice: 15000,
    color: "#CD7F32",
    studentLimit: 100,
  },
  {
    id: "silver",
    name: "Silver",
    students: "100-200 Students",
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    color: "#94a3b8",
    studentLimit: 200,
  },
  {
    id: "gold",
    name: "Gold",
    students: "200-400 Students",
    monthlyPrice: 3000,
    yearlyPrice: 30000,
    color: "#f59e0b",
    studentLimit: 400,
  },
  {
    id: "diamond",
    name: "Diamond",
    students: "400-1000 Students",
    monthlyPrice: 4000,
    yearlyPrice: 40000,
    color: "#06b6d4",
    studentLimit: 1000,
  },
  {
    id: "platinum",
    name: "Platinum",
    students: ">1000 Students",
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    color: "#a855f7",
    studentLimit: 2000,
  },
];

export default function AttendxPage() {
  const [organizations, setOrganizations] = useState<AttendxOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "invoices" | "payments" | "hardware" | "api"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clients, setClients] = useState<any[]>([]);

  // Modals state
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] =
    useState<Partial<AttendxOrganization> | null>(null);
  const [orgPlanCycle, setOrgPlanCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);
  const [activeOrgForHardware, setActiveOrgForHardware] =
    useState<AttendxOrganization | null>(null);
  const [hardwareForm, setHardwareForm] = useState<Partial<HardwareItem>>({
    name: "AttendX NFC Hardware Kit",
    quantity: 1,
    unit_price: 12000,
    warranty_months: 12,
    sold_date: new Date().toISOString().split("T")[0],
    serial_numbers: [],
    notes: "",
  });
  const [serialInput, setSerialInput] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "danger" | "info" | "warning";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billingOrg, setBillingOrg] = useState<AttendxOrganization | null>(
    null,
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<
    "combined" | "saas_only" | "hardware_only"
  >("combined");
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>("silver");
  const [billBillingCycle, setBillBillingCycle] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [billDurationMonths, setBillDurationMonths] = useState<number>(1);
  const [customPlanPrice, setCustomPlanPrice] = useState<number>(2000);
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed" | "none"
  >("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedHardwareIds, setSelectedHardwareIds] = useState<string[]>([]);
  const [newHardwareToSell, setNewHardwareToSell] = useState<any[]>([]);
  const [showAddHardwareInBill, setShowAddHardwareInBill] = useState(false);
  const [inlineHwName, setInlineHwName] = useState("AttendX NFC Hardware Kit");
  const [inlineHwQty, setInlineHwQty] = useState(1);
  const [inlineHwPrice, setInlineHwPrice] = useState(12000);
  const [inlineHwWarranty, setInlineHwWarranty] = useState(12);
  const [inlineHwSerials, setInlineHwSerials] = useState("");
  const [generatedBillResult, setGeneratedBillResult] = useState<any | null>(
    null,
  );

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer",
    transaction_id: "",
    invoice_id: "",
    notes: "",
  });
  const [payLoading, setPayLoading] = useState(false);

  const [apiTesterOpen, setApiTesterOpen] = useState(false);
  const [testedOrg, setTestedOrg] = useState<AttendxOrganization | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendx");
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations || []);
        if (selectedOrg) {
          const updated = (data.organizations || []).find(
            (o: any) =>
              o.id === selectedOrg.id || o.org_id === selectedOrg.org_id,
          );
          if (updated) {
            fetchOrgDetails(updated.org_id);
          }
        }
      }
    } catch (e: any) {
      toast.error("Failed to load organizations: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgDetails = async (orgId: string) => {
    try {
      const res = await fetch(
        `/api/attendx?orgId=${encodeURIComponent(orgId)}`,
      );
      const data = await res.json();
      if (data.success && data.organization) {
        setSelectedOrg(data.organization);
      }
    } catch (e) {
      console.warn("Failed to fetch detailed org data", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || data || []);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchClients();
  }, []);

  const handleSelectOrg = (org: AttendxOrganization) => {
    setSelectedOrg(org);
    fetchOrgDetails(org.org_id);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Edit/Create Org Modal
  const handleOpenOrgModal = (org?: AttendxOrganization) => {
    if (org) {
      setEditingOrg({ ...org });
      setOrgPlanCycle(
        (org.billing_cycle as any) === "yearly" ? "yearly" : "monthly",
      );
    } else {
      const defaultPlan = ATTENDX_DEFAULT_PLANS[1]; // Silver
      setEditingOrg({
        org_id: "",
        org_name: "",
        client_web_base: "https://myinvoice.thenicedev.xyz",
        plan_tier: "silver",
        plan_price: defaultPlan.monthlyPrice,
        currency: "৳",
        billing_cycle: "monthly",
        status: "active",
        warning_start: new Date(Date.now() + 25 * 86400000).toISOString(),
        subscription_ends: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setOrgPlanCycle("monthly");
    }
    setOrgModalOpen(true);
  };

  const handleSelectPlanForOrg = (
    plan: (typeof ATTENDX_DEFAULT_PLANS)[0],
    cycle: "monthly" | "yearly",
  ) => {
    if (!editingOrg) return;
    const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    setEditingOrg({
      ...editingOrg,
      plan_tier: plan.id as any,
      plan_price: price,
      billing_cycle: cycle,
      student_count: plan.studentLimit,
    });
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg || !editingOrg.org_id || !editingOrg.org_name) {
      toast.error("Please enter both Org ID and Organization Name");
      return;
    }

    const toastId = toast.loading("Saving organization to database...");
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingOrg),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Organization saved successfully!", { id: toastId });
        setOrgModalOpen(false);
        await fetchOrganizations();
        if (data.organization) {
          setSelectedOrg(data.organization);
          fetchOrgDetails(data.organization.org_id);
        }
      } else {
        toast.error("Failed to save: " + (data.error || "Unknown error"), {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    }
  };

  const handleDeleteOrg = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Organization",
      description: `Are you sure you want to delete ${name}? This will permanently remove its configuration.`,
      confirmText: "Delete Organization",
      variant: "danger",
      action: async () => {
        const toastId = toast.loading("Deleting organization...");
        try {
          const res = await fetch(`/api/attendx?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Organization deleted", { id: toastId });
            if (selectedOrg?.id === id || selectedOrg?.org_id === id) {
              setSelectedOrg(null);
            }
            fetchOrganizations();
          } else {
            toast.error(data.error || "Failed to delete org", { id: toastId });
          }
        } catch (err: any) {
          toast.error("Error: " + err.message, { id: toastId });
        }
      },
    });
  };

  // Webhook cache purge
  const handlePurgeCache = async (org: AttendxOrganization) => {
    const toastId = toast.loading(`Triggering webhook for ${org.org_name}...`);
    try {
      const res = await fetch("/api/attendx/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.org_id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Client cache refreshed successfully!`, { id: toastId });
      } else {
        toast.error(`Webhook returned: ${data.message || "Failed"}`, {
          id: toastId,
        });
      }
      fetchOrganizations();
    } catch (e: any) {
      toast.error("Webhook network failure: " + e.message, { id: toastId });
    }
  };

  // Quick Extend Subscription by 30 days
  const handleQuickExtend = async (org: AttendxOrganization) => {
    const currentEnd = new Date(org.subscription_ends || Date.now());
    const baseTime =
      currentEnd.getTime() > Date.now() ? currentEnd.getTime() : Date.now();
    const newEnd = new Date(baseTime + 30 * 86400000).toISOString();
    const newWarning = new Date(baseTime + 25 * 86400000).toISOString();

    const toastId = toast.loading(`Extending ${org.org_name} by 30 days...`);
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...org,
          status: "active",
          warning_start: newWarning,
          subscription_ends: newEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Extended until ${new Date(newEnd).toLocaleDateString()}`,
          { id: toastId },
        );
        await fetchOrganizations();
        if (selectedOrg?.id === org.id || selectedOrg?.org_id === org.org_id) {
          fetchOrgDetails(org.org_id);
        }
      }
    } catch (e: any) {
      toast.error("Failed to extend: " + e.message, { id: toastId });
    }
  };

  // Save standalone hardware item
  const handleOpenHardwareModal = (org: AttendxOrganization) => {
    setActiveOrgForHardware(org);
    setHardwareForm({
      name: "AttendX NFC Hardware Kit",
      quantity: 1,
      unit_price: 12000,
      warranty_months: 12,
      sold_date: new Date().toISOString().split("T")[0],
      serial_numbers: [],
      notes: "",
    });
    setSerialInput("");
    setHardwareModalOpen(true);
  };

  const handleSaveHardware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgForHardware || !hardwareForm.name) return;

    const toastId = toast.loading("Recording hardware deployment...");
    try {
      const res = await fetch("/api/attendx", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: activeOrgForHardware.org_id || activeOrgForHardware.id,
          hardware_item: {
            ...hardwareForm,
            serial_numbers: serialInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Hardware recorded successfully in database!", {
          id: toastId,
        });
        setHardwareModalOpen(false);
        await fetchOrganizations();
        if (activeOrgForHardware.org_id) {
          fetchOrgDetails(activeOrgForHardware.org_id);
        }
      } else {
        toast.error(
          "Failed to record hardware: " + (data.error || "Unknown error"),
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    }
  };

  const handleDeleteHardware = (hardwareId: string) => {
    if (!selectedOrg) return;
    setConfirmModal({
      isOpen: true,
      title: "Delete Hardware Record",
      description:
        "Are you sure you want to delete this hardware deployment record?",
      confirmText: "Delete Hardware",
      variant: "danger",
      action: async () => {
        const toastId = toast.loading("Deleting hardware item...");
        try {
          const res = await fetch(
            `/api/attendx?org_id=${encodeURIComponent(selectedOrg.org_id)}&hardware_id=${encodeURIComponent(hardwareId)}`,
            {
              method: "DELETE",
            },
          );
          const data = await res.json();
          if (data.success) {
            toast.success("Hardware item deleted!", { id: toastId });
            fetchOrgDetails(selectedOrg.org_id);
          } else {
            toast.error(data.error || "Failed to delete hardware item", {
              id: toastId,
            });
          }
        } catch (err: any) {
          toast.error("Error: " + err.message, { id: toastId });
        }
      },
    });
  };

  // Open Invoice / Bill Generator Modal
  const handleOpenBillModal = (org: AttendxOrganization) => {
    setBillingOrg(org);
    const plan =
      ATTENDX_DEFAULT_PLANS.find((p) => p.id === (org.plan_tier || "silver")) ||
      ATTENDX_DEFAULT_PLANS[1];
    setSelectedPlanTier(plan.id);
    const cycle = org.billing_cycle === "yearly" ? "yearly" : "monthly";
    setBillBillingCycle(cycle);
    setBillDurationMonths(cycle === "yearly" ? 12 : 1);
    setCustomPlanPrice(
      cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice,
    );
    setDiscountType("none");
    setDiscountValue(0);
    setSelectedHardwareIds([]);
    setNewHardwareToSell([]);
    setShowAddHardwareInBill(false);
    setGeneratedBillResult(null);
    setBillModalOpen(true);
  };

  const handleBillPlanChange = (planId: string) => {
    setSelectedPlanTier(planId);
    const plan = ATTENDX_DEFAULT_PLANS.find((p) => p.id === planId);
    if (plan) {
      const price =
        billBillingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      setCustomPlanPrice(price);
    }
  };

  const handleBillCycleChange = (cycle: "monthly" | "yearly") => {
    setBillBillingCycle(cycle);
    const plan = ATTENDX_DEFAULT_PLANS.find((p) => p.id === selectedPlanTier);
    if (plan) {
      setCustomPlanPrice(
        cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice,
      );
    }
  };

  const handleAddInlineHardware = () => {
    if (!inlineHwName.trim()) {
      toast.error("Please enter a hardware model or device name");
      return;
    }
    const newItem = {
      id: `new-${Date.now()}`,
      name: inlineHwName.trim() || "AttendX NFC Hardware Kit",
      quantity: inlineHwQty,
      unit_price: inlineHwPrice,
      warranty_months: inlineHwWarranty,
      serial_numbers: inlineHwSerials
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_new: true,
    };
    setNewHardwareToSell([...newHardwareToSell, newItem]);
    setInlineHwName("AttendX NFC Hardware Kit");
    setInlineHwQty(1);
    setInlineHwSerials("");
    setShowAddHardwareInBill(false);
    toast.success("Hardware item added to invoice!");
  };

  // Calculate live grand total for invoice modal
  const billTotals = useMemo(() => {
    const isHardwareOnly = invoiceType === "hardware_only";
    const isSaasOnly = invoiceType === "saas_only";

    const planSubtotal = isHardwareOnly
      ? 0
      : customPlanPrice * billDurationMonths;

    let discountAmount = 0;
    if (!isHardwareOnly) {
      if (discountType === "percentage" && discountValue > 0) {
        discountAmount = Math.round((planSubtotal * discountValue) / 100);
      } else if (discountType === "fixed" && discountValue > 0) {
        discountAmount = discountValue;
      }
    }

    const existingHardwareItems = isSaasOnly
      ? []
      : (billingOrg?.hardware_sales || []).filter((h) =>
          selectedHardwareIds.includes(h.id),
        );
    const existingHardwareTotal = existingHardwareItems.reduce(
      (sum, h) => sum + h.unit_price * h.quantity,
      0,
    );
    const newHardwareItems = isSaasOnly ? [] : newHardwareToSell;
    const newHardwareTotal = newHardwareItems.reduce(
      (sum, h) => sum + h.unit_price * h.quantity,
      0,
    );
    const hardwareTotal = existingHardwareTotal + newHardwareTotal;

    const grandTotal = Math.max(
      0,
      planSubtotal - discountAmount + hardwareTotal,
    );

    return {
      planSubtotal,
      discountAmount,
      existingHardwareItems,
      newHardwareItems,
      hardwareTotal,
      grandTotal,
    };
  }, [
    invoiceType,
    customPlanPrice,
    billDurationMonths,
    discountType,
    discountValue,
    selectedHardwareIds,
    newHardwareToSell,
    billingOrg,
  ]);

  // Execute Invoice Generation
  const handleExecuteGenerateBill = async () => {
    if (!billingOrg) return;
    setBillingLoading(true);

    const allHardwareToSend = [
      ...billTotals.existingHardwareItems.map((h) => ({
        id: h.id,
        name: h.name,
        quantity: h.quantity,
        unit_price: h.unit_price,
        warranty_months: h.warranty_months,
        serial_numbers: h.serial_numbers,
        is_new: false,
      })),
      ...billTotals.newHardwareItems,
    ];

    try {
      const res = await fetch("/api/attendx/generate-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: billingOrg.org_id,
          options: {
            plan_tier: selectedPlanTier,
            custom_plan_name: billingOrg.plan_name,
            invoice_type: invoiceType,
            billing_cycle: billBillingCycle,
            duration_months: billDurationMonths,
            custom_rate: customPlanPrice,
            discount_type: discountType,
            discount_value: discountValue,
            selected_hardware_ids: selectedHardwareIds,
            selected_hardware: allHardwareToSend,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedBillResult(data);
        toast.success(
          `Official invoice #${data.invoice_number} created in Supabase!`,
        );
        await fetchOrganizations();
        if (selectedOrg?.org_id === billingOrg.org_id) {
          fetchOrgDetails(billingOrg.org_id);
        }
      } else {
        toast.error(
          "Failed to generate bill: " + (data.error || "Unknown error"),
        );
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setBillingLoading(false);
    }
  };

  // Open Record Payment Modal
  const handleOpenPayModal = (org: any) => {
    setSelectedOrg(org);
    const unpaidInv = (org.invoices || []).find(
      (i: any) => i.status !== "paid",
    );
    setPayForm({
      amount: unpaidInv
        ? unpaidInv.due_amount || unpaidInv.total_amount
        : org.plan_price || 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Bank Transfer",
      transaction_id: "",
      invoice_id: unpaidInv ? unpaidInv.id : "",
      notes: "",
    });
    setPayModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !payForm.amount) return;

    setPayLoading(true);
    const toastId = toast.loading("Recording payment in database...");
    try {
      const res = await fetch("/api/attendx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          organization_id: selectedOrg.id || selectedOrg.org_id,
          amount: payForm.amount,
          payment_date: payForm.payment_date,
          payment_method: payForm.payment_method,
          transaction_id: payForm.transaction_id,
          invoice_id: payForm.invoice_id || undefined,
          notes: payForm.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Payment recorded successfully!", { id: toastId });
        setPayModalOpen(false);
        await fetchOrganizations();
        fetchOrgDetails(selectedOrg.org_id);
      } else {
        toast.error(
          "Failed to record payment: " + (data.error || "Unknown error"),
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    } finally {
      setPayLoading(false);
    }
  };

  // Live CheckSubscription API Tester
  const handleOpenApiTester = async (org: AttendxOrganization) => {
    setTestedOrg(org);
    setApiTesterOpen(true);
    setApiLoading(true);
    try {
      const res = await fetch(
        `/management/api/checkSubscription?orgId=${encodeURIComponent(org.org_id)}`,
      );
      const data = await res.json();
      setApiResponse(data);
    } catch (err: any) {
      setApiResponse({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  // Filtered organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.org_name
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        org.org_id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (org.contact_email || "")
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, debouncedSearchQuery, statusFilter]);

  // Overall KPI stats
  const stats = useMemo(() => {
    const activeCount = organizations.filter(
      (o) => o.status === "active",
    ).length;
    const warningCount = organizations.filter(
      (o) => o.status === "warning",
    ).length;
    const expiredCount = organizations.filter(
      (o) => o.status === "expired",
    ).length;
    const totalMrr = organizations
      .filter((o) => o.status === "active")
      .reduce(
        (sum, o) =>
          sum +
          (o.billing_cycle === "yearly"
            ? Math.round(o.plan_price / 12)
            : o.plan_price),
        0,
      );
    const totalHardwareUnits = organizations.reduce((sum, o) => {
      return (
        sum + (o.hardware_sales || []).reduce((hSum, h) => hSum + h.quantity, 0)
      );
    }, 0);

    return {
      activeCount,
      warningCount,
      expiredCount,
      totalMrr,
      totalHardwareUnits,
    };
  }, [organizations]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 font-sans space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  AttendX & AcademiX
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Institutional biometric ERP subscriptions, hardware deployments
                & official billing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchOrganizations}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => handleOpenOrgModal()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Active Institutions
            </span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.activeCount}{" "}
            <span className="text-xs text-slate-500 font-normal">
              / {organizations.length}
            </span>
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3" /> System Operational
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Estimated MRR
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            ৳{stats.totalMrr.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold">
            Recurring SaaS Revenue
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Hardware Deployed
            </span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {stats.totalHardwareUnits}{" "}
            <span className="text-xs text-slate-500 font-normal">Units</span>
          </div>
          <div className="text-[10px] text-purple-300 font-semibold">
            Terminals & Biometrics
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Attention Required
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {stats.warningCount + stats.expiredCount}
          </div>
          <div className="text-[10px] text-amber-300 font-semibold">
            {stats.warningCount} in warning, {stats.expiredCount} expired
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: MASTER-DETAIL INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: INSTITUTION DIRECTORY (4 COLS ON DESKTOP, HIDDEN ON MOBILE IF ORG SELECTED) */}
        <div
          className={`space-y-4 ${selectedOrg ? "hidden lg:block lg:col-span-4" : "col-span-12 lg:col-span-4"}`}
        >
          {/* SEARCH & FILTER BAR */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search org name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
              {["all", "active", "warning", "expired"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase tracking-wide capitalize whitespace-nowrap cursor-pointer transition-all ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* ORGANIZATIONS LIST */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-1">
            {filteredOrgs.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                No organizations found matching criteria.
              </div>
            ) : (
              filteredOrgs.map((org) => {
                const isSelected =
                  selectedOrg?.org_id === org.org_id ||
                  selectedOrg?.id === org.id;
                const daysLeft = Math.ceil(
                  (new Date(org.subscription_ends).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                );
                const hardwareCount = (org.hardware_sales || []).reduce(
                  (sum, h) => sum + h.quantity,
                  0,
                );

                return (
                  <div
                    key={org.id || org.org_id}
                    onClick={() => handleSelectOrg(org)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/50"
                        : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-white group-hover:text-indigo-400 transition-colors">
                            {org.org_name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              org.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : org.status === "warning"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {org.status}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${isSelected ? "text-indigo-400 translate-x-1" : "text-slate-600"}`}
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">
                          {org.currency}
                          {org.plan_price.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">
                          /{org.billing_cycle || "mo"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hardwareCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold flex items-center gap-1">
                            <Cpu className="w-2.5 h-2.5" /> {hardwareCount} HW
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold ${daysLeft <= 5 ? "text-rose-400" : daysLeft <= 15 ? "text-amber-400" : "text-slate-400"}`}
                        >
                          {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePurgeCache(org);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-purple-400 transition-colors"
                          title="Trigger refreshSubscription Webhook"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INSTITUTION DETAILS & ACTIONS (8 COLS ON DESKTOP, FULL WIDTH ON MOBILE) */}
        <div
          className={`space-y-5 ${selectedOrg ? "col-span-12 lg:col-span-8" : "hidden lg:block lg:col-span-8"}`}
        >
          {selectedOrg ? (
            <div className="space-y-5">
              {/* INSTITUTION HEADER CARD */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                {/* Mobile Back Button */}
                <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-800">
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Institutions List
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black text-white">
                        {selectedOrg.org_name}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          selectedOrg.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : selectedOrg.status === "warning"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {selectedOrg.status}
                      </span>
                      {selectedOrg.plan_tier && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {selectedOrg.plan_tier} tier
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {selectedOrg.client_web_base && (
                        <a
                          href={selectedOrg.client_web_base}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>{selectedOrg.client_web_base}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Top Action Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenOrgModal(selectedOrg)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Edit Settings"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteOrg(
                          selectedOrg.id || selectedOrg.org_id,
                          selectedOrg.org_name,
                        )
                      }
                      className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/60 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Delete Institution"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* PRIMARY ACTION TOOLBAR */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenBillModal(selectedOrg)}
                    className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Bill</span>
                  </button>

                  <button
                    onClick={() => handleOpenPayModal(selectedOrg)}
                    className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>

                  <button
                    onClick={() => handleQuickExtend(selectedOrg)}
                    className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>+30 Days</span>
                  </button>

                  <button
                    onClick={() => handlePurgeCache(selectedOrg)}
                    className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Purge Webhook</span>
                  </button>
                </div>
              </div>

              {/* TABS NAVIGATION */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: "overview", label: "Overview & Dues", icon: Activity },
                  {
                    id: "invoices",
                    label: `Invoices (${selectedOrg.invoices?.length || 0})`,
                    icon: Receipt,
                  },
                  {
                    id: "payments",
                    label: `Payments (${selectedOrg.payments?.length || 0})`,
                    icon: CreditCard,
                  },
                  {
                    id: "hardware",
                    label: `Hardware (${selectedOrg.hardware_sales?.length || 0})`,
                    icon: HardDrive,
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: OVERVIEW & METRICS */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Financial Metrics Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Total Invoiced
                      </span>
                      <div className="text-lg font-black text-white mt-0.5">
                        {selectedOrg.currency}
                        {(
                          selectedOrg.financials?.total_billed || 0
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        Total Collected
                      </span>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        {selectedOrg.currency}
                        {(
                          selectedOrg.financials?.total_collected || 0
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">
                        Outstanding Due
                      </span>
                      <div className="text-lg font-black text-amber-400 mt-0.5">
                        {selectedOrg.currency}
                        {(
                          selectedOrg.financials?.outstanding_due || 0
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Webhook & Subscription Integration Details */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                        Webhook & Integration Credentials
                      </span>
                      <button
                        onClick={() => handleOpenOrgModal(selectedOrg)}
                        className="text-[10px] font-bold text-indigo-400 hover:underline"
                      >
                        Edit Credentials
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          Client Web Base URL
                        </span>
                        <span className=" text-xs text-white block truncate">
                          {selectedOrg.client_web_base || "Not configured"}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                        <span className="text-[10px] text-purple-400 font-bold uppercase block">
                          Webhook Secret (Authorization Bearer Token)
                        </span>
                        <div className="flex items-center justify-between  text-xs text-purple-300">
                          <span className="truncate font-bold">
                            {selectedOrg.webhook_secret ||
                              selectedOrg.client_id ||
                              "Not configured"}
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(
                                selectedOrg.webhook_secret ||
                                  selectedOrg.client_id ||
                                  "",
                                "sec_overview",
                              )
                            }
                            className="text-[10px] text-purple-400 hover:text-white font-bold uppercase ml-2 shrink-0 cursor-pointer"
                          >
                            {copiedKey === "sec_overview" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Subscription Information */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h4 className="font-black text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Subscription
                      Lifecycle
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">
                          Warning Period Starts
                        </span>
                        <div className="font-bold text-amber-400">
                          {selectedOrg.warning_start
                            ? new Date(
                                selectedOrg.warning_start,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Client ERP displays renewal warning after this date
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">
                          Subscription Expiry Date
                        </span>
                        <div className="font-bold text-rose-400">
                          {selectedOrg.subscription_ends
                            ? new Date(
                                selectedOrg.subscription_ends,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Client ERP biometric access pauses if unpaid after
                          this date
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Client Contacts */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                      Contact & Organization Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Contact Person
                        </span>
                        <span className="font-bold text-slate-200">
                          {selectedOrg.contact_person || "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Email
                        </span>
                        <span className=" text-slate-200">
                          {selectedOrg.contact_email || "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Phone
                        </span>
                        <span className=" text-slate-200">
                          {selectedOrg.contact_phone || "Not specified"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES & BILLING */}
              {activeTab === "invoices" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                      Official Invoices in Supabase
                    </h4>
                    <button
                      onClick={() => handleOpenBillModal(selectedOrg)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Generate New Bill
                    </button>
                  </div>

                  {!selectedOrg.invoices ||
                  selectedOrg.invoices.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                      No invoices created yet for this institution. Click
                      "Generate New Bill" to create an official invoice with
                      plan & hardware.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedOrg.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className=" font-black text-sm text-white">
                                #{inv.invoice_number}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  inv.status === "paid"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Date: {inv.date} | Due: {inv.due_date}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className=" font-black text-sm text-white">
                                {inv.currency}
                                {inv.total_amount?.toLocaleString()}
                              </div>
                              {inv.due_amount > 0 && (
                                <div className="text-[10px] text-rose-400 font-bold">
                                  Due: {inv.currency}
                                  {inv.due_amount.toLocaleString()}
                                </div>
                              )}
                            </div>

                            <a
                              href={inv.share_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS HISTORY */}
              {activeTab === "payments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                      Payment Transactions
                    </h4>
                    <button
                      onClick={() => handleOpenPayModal(selectedOrg)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record Payment
                    </button>
                  </div>

                  {!selectedOrg.payments ||
                  selectedOrg.payments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                      No direct payments recorded yet. Click "Record Payment" to
                      log client transfers or bKash/Nagad transactions.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOrg.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-white flex items-center gap-2">
                              <span>{p.payment_method || "Payment"}</span>
                              {p.transaction_id && (
                                <span className=" text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 border border-slate-800">
                                  Trx: {p.transaction_id}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Date: {p.payment_date}{" "}
                              {p.notes ? `• ${p.notes}` : ""}
                            </p>
                          </div>
                          <div className="font-black text-sm text-emerald-400 ">
                            +{selectedOrg.currency}
                            {Number(p.amount).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HARDWARE DEPLOYMENTS */}
              {activeTab === "hardware" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-400">
                        Hardware & Biometric Terminals
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Physical devices deployed at this institution
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenHardwareModal(selectedOrg)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Deploy Device
                    </button>
                  </div>

                  {!selectedOrg.hardware_sales ||
                  selectedOrg.hardware_sales.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                      No hardware deployments recorded. Click "Deploy Device" to
                      add biometric terminals, readers, or access controllers.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedOrg.hardware_sales.map((hw: HardwareItem) => (
                        <div
                          key={hw.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 relative group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-xs text-white">
                                {hw.name}
                              </h5>
                              <span className="text-[10px] text-purple-400 font-bold">
                                Qty: {hw.quantity} @ {selectedOrg.currency}
                                {hw.unit_price.toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteHardware(hw.id)}
                              className="text-slate-600 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
                              title="Delete hardware item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-400 space-y-1">
                            <div>
                              Warranty:{" "}
                              <strong>{hw.warranty_months || 12} Months</strong>
                            </div>
                            <div>
                              Sold Date:{" "}
                              <strong>{hw.sold_date || "N/A"}</strong>
                            </div>
                            {hw.serial_numbers &&
                              hw.serial_numbers.length > 0 && (
                                <div className="pt-1">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                                    Serial Numbers
                                  </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {hw.serial_numbers.map((sn, idx) => (
                                      <span
                                        key={idx}
                                        className=" text-[9px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300"
                                      >
                                        {sn}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/60 rounded-3xl space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-black text-sm text-slate-300">
                Select an Institution
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose an institution from the list on the left to manage
                billing, generate official invoices, record hardware, or inspect
                live subscription API contracts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT INSTITUTION */}
      {/* ========================================================================= */}
      {orgModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white">
                {editingOrg?.id
                  ? "Edit Institution Configuration"
                  : "Register New Institution"}
              </h3>
              <button
                onClick={() => setOrgModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveOrg}
              className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs"
            >
              {/* Plan Tier Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                    Select Plan Tier & Pricing
                  </label>
                  <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setOrgPlanCycle("monthly")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        orgPlanCycle === "monthly"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgPlanCycle("yearly")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        orgPlanCycle === "yearly"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ATTENDX_DEFAULT_PLANS.map((plan) => {
                    const isSelected = editingOrg?.plan_tier === plan.id;
                    const price =
                      orgPlanCycle === "yearly"
                        ? plan.yearlyPrice
                        : plan.monthlyPrice;
                    return (
                      <div
                        key={plan.id}
                        onClick={() =>
                          handleSelectPlanForOrg(plan, orgPlanCycle)
                        }
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span
                          className="font-black text-xs block"
                          style={{ color: plan.color }}
                        >
                          {plan.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {plan.studentLimit} std
                        </span>
                        <div className="font-black text-xs text-white mt-1">
                          ৳{price.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ID & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Organization ID (orgId) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. academix_dhaka"
                    value={editingOrg?.org_id || ""}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        org_id: e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "_"),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5  font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhaka Model College"
                    value={editingOrg?.org_name || ""}
                    onChange={(e) =>
                      setEditingOrg({ ...editingOrg, org_name: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Custom Plan Name for Invoice */}
              <div>
                <label className="block text-[10px] font-black uppercase text-indigo-400 mb-1">
                  Custom Plan Name for Invoices (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AcademiX Enterprise Plan / AttendX Pro Tier"
                  value={editingOrg?.plan_name || ""}
                  onChange={(e) =>
                    setEditingOrg({
                      ...editingOrg,
                      plan_name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Web URL */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Client Web Base URL
                </label>
                <input
                  type="text"
                  placeholder="https://myinvoice.thenicedev.xyz"
                  value={editingOrg?.client_web_base || ""}
                  onChange={(e) =>
                    setEditingOrg({
                      ...editingOrg,
                      client_web_base: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5  text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Webhook Secret */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-black uppercase text-purple-400">
                    Webhook Secret (Authorization Bearer Token)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randSecret =
                        "whsec_" +
                        Math.random().toString(36).substring(2, 12) +
                        Math.random().toString(36).substring(2, 12);
                      setEditingOrg({
                        ...editingOrg,
                        webhook_secret: randSecret,
                      });
                    }}
                    className="text-[10px] font-bold text-purple-400 hover:underline uppercase tracking-wider"
                  >
                    Generate Secret
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. whsec_a1b2c3d4e5f6g7h8..."
                  value={editingOrg?.webhook_secret || ""}
                  onChange={(e) =>
                    setEditingOrg({
                      ...editingOrg,
                      webhook_secret: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5  text-xs text-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Used by client's{" "}
                  <code className="text-slate-400">
                    /api/refreshSubscription
                  </code>{" "}
                  webhook to verify{" "}
                  <code className="text-slate-400">
                    Authorization: Bearer WEBHOOK_SECRET
                  </code>
                  .
                </p>
              </div>

              {/* Pricing rate and cycle */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Rate (৳)
                  </label>
                  <input
                    type="number"
                    value={editingOrg?.plan_price || 0}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        plan_price: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={editingOrg?.billing_cycle || "monthly"}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        billing_cycle: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={editingOrg?.status || "active"}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="warning">Warning</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-400 mb-1">
                    Warning Start Date
                  </label>
                  <input
                    type="date"
                    value={editingOrg?.warning_start?.split("T")[0] || ""}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        warning_start: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-rose-400 mb-1">
                    Subscription Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editingOrg?.subscription_ends?.split("T")[0] || ""}
                    onChange={(e) =>
                      setEditingOrg({
                        ...editingOrg,
                        subscription_ends: new Date(
                          e.target.value,
                        ).toISOString(),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Link CRM Client */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Link with CRM Client (Optional)
                </label>
                <select
                  value={editingOrg?.linked_client_id || ""}
                  onChange={(e) =>
                    setEditingOrg({
                      ...editingOrg,
                      linked_client_id: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Client from CRM --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || "No email"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOrgModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 cursor-pointer"
                >
                  Save Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEPLOY HARDWARE */}
      {/* ========================================================================= */}
      {hardwareModalOpen && activeOrgForHardware && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white">
                Record Hardware Deployment
              </h3>
              <button
                onClick={() => setHardwareModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveHardware}
              className="p-4 sm:p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Device Model / Terminal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AttendX NFC Hardware Kit"
                  value={hardwareForm.name || ""}
                  onChange={(e) =>
                    setHardwareForm({ ...hardwareForm, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={hardwareForm.quantity || 1}
                    onChange={(e) =>
                      setHardwareForm({
                        ...hardwareForm,
                        quantity: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Unit Price ({activeOrgForHardware.currency})
                  </label>
                  <input
                    type="number"
                    value={hardwareForm.unit_price || 0}
                    onChange={(e) =>
                      setHardwareForm({
                        ...hardwareForm,
                        unit_price: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    value={hardwareForm.warranty_months || 12}
                    onChange={(e) =>
                      setHardwareForm({
                        ...hardwareForm,
                        warranty_months: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Sold Date
                  </label>
                  <input
                    type="date"
                    value={hardwareForm.sold_date || ""}
                    onChange={(e) =>
                      setHardwareForm({
                        ...hardwareForm,
                        sold_date: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Serial Numbers (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SN-ZK-991, SN-ZK-992"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5  text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setHardwareModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Save Hardware
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADVANCED INVOICE & BILL GENERATOR */}
      {/* ========================================================================= */}
      {billModalOpen && billingOrg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    Generate Official Invoice
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {billingOrg.org_name} ({billingOrg.org_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBillModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
              {/* Invoice Type Selection */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="block text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Select Billing Mode / Invoice Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceType("combined")}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      invoiceType === "combined"
                        ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    Combined (SaaS + Hardware)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType("saas_only")}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      invoiceType === "saas_only"
                        ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    SaaS Subscription Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceType("hardware_only")}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      invoiceType === "hardware_only"
                        ? "bg-purple-600/30 border-purple-500 ring-2 ring-purple-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    Device / Hardware Only
                  </button>
                </div>
              </div>

              {/* Step 1: Subscription Tier (Hidden if Hardware Only) */}
              {invoiceType !== "hardware_only" && (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      1. Subscription Tier
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {ATTENDX_DEFAULT_PLANS.map((plan) => {
                        const isSelected = selectedPlanTier === plan.id;
                        const price =
                          billBillingCycle === "yearly"
                            ? plan.yearlyPrice
                            : plan.monthlyPrice;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => handleBillPlanChange(plan.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500"
                                : "bg-slate-950 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <span
                              className="font-black text-xs block"
                              style={{ color: plan.color }}
                            >
                              {plan.name}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {plan.studentLimit} std
                            </span>
                            <div className="font-black text-xs text-white mt-1">
                              ৳{price.toLocaleString()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Duration & Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        2. Duration Period (Months)
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {[1, 3, 6, 12, 24].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setBillDurationMonths(m);
                              if (m >= 12 && billBillingCycle !== "yearly")
                                handleBillCycleChange("yearly");
                              else if (m < 12 && billBillingCycle === "yearly")
                                handleBillCycleChange("monthly");
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              billDurationMonths === m
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-950 border border-slate-800 text-slate-400"
                            }`}
                          >
                            {m}{" "}
                            {m === 12
                              ? "Yr (12 Mo)"
                              : m === 24
                                ? "2 Yrs"
                                : "Mo"}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={billDurationMonths}
                        onChange={(e) =>
                          setBillDurationMonths(
                            Math.max(1, Number(e.target.value)),
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Base Plan Rate ({billingOrg.currency})
                      </label>
                      <input
                        type="number"
                        value={customPlanPrice}
                        onChange={(e) =>
                          setCustomPlanPrice(Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-black text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-7"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Hardware Selling & Bundling */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" /> 3.
                    Hardware Selling & Bundling
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddHardwareInBill(!showAddHardwareInBill)
                    }
                    className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + Sell New Hardware
                  </button>
                </div>

                {/* Inline form to sell new hardware on this invoice */}
                {showAddHardwareInBill && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-purple-900/50 space-y-2.5 animate-fade-in">
                    <span className="text-[10px] font-bold uppercase text-purple-300 block">
                      Add New Hardware Line Item
                    </span>
                    <input
                      type="text"
                      placeholder="Device Model (e.g. AttendX NFC Hardware Kit)"
                      value={inlineHwName}
                      onChange={(e) => setInlineHwName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block uppercase">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={inlineHwQty}
                          onChange={(e) =>
                            setInlineHwQty(Math.max(1, Number(e.target.value)))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block uppercase">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={inlineHwPrice}
                          onChange={(e) =>
                            setInlineHwPrice(Number(e.target.value))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block uppercase">
                          Warranty (Mo)
                        </label>
                        <input
                          type="number"
                          value={inlineHwWarranty}
                          onChange={(e) =>
                            setInlineHwWarranty(Number(e.target.value))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Serial numbers (e.g. SN-1, SN-2)"
                      value={inlineHwSerials}
                      onChange={(e) => setInlineHwSerials(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddHardwareInBill(false)}
                        className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddInlineHardware}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px]"
                      >
                        Add to Invoice
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing hardware list */}
                {billingOrg.hardware_sales &&
                  billingOrg.hardware_sales.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                      {billingOrg.hardware_sales.map((hw) => {
                        const isChecked = selectedHardwareIds.includes(hw.id);
                        return (
                          <div
                            key={hw.id}
                            onClick={() => {
                              if (isChecked)
                                setSelectedHardwareIds(
                                  selectedHardwareIds.filter(
                                    (id) => id !== hw.id,
                                  ),
                                );
                              else
                                setSelectedHardwareIds([
                                  ...selectedHardwareIds,
                                  hw.id,
                                ]);
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer ${
                              isChecked
                                ? "bg-purple-950/30 border-purple-600 text-white"
                                : "bg-slate-900 border-slate-800 text-slate-400"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="rounded text-purple-600"
                              />
                              <div>
                                <span className="font-bold text-xs">
                                  {hw.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Qty: {hw.quantity}
                                </span>
                              </div>
                            </div>
                            <span className="font-black text-xs text-purple-400">
                              {billingOrg.currency}
                              {(hw.unit_price * hw.quantity).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Newly added hardware in bill */}
                {newHardwareToSell.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">
                      New Hardware Items:
                    </span>
                    {newHardwareToSell.map((nh, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-purple-950/40 border border-purple-600/50 flex items-center justify-between text-xs text-white"
                      >
                        <span>
                          {nh.name} (Qty: {nh.quantity})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-300">
                            {billingOrg.currency}
                            {(nh.unit_price * nh.quantity).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewHardwareToSell(
                                newHardwareToSell.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-rose-400 hover:text-rose-300 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 4: Discounts */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" /> 4.
                    Promotional Discount
                  </span>
                  <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountType("none")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "none"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "percentage"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      % Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        discountType === "fixed"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      ৳ Off
                    </button>
                  </div>
                </div>

                {discountType !== "none" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={
                        discountType === "percentage"
                          ? "e.g. 10 (for 10% off)"
                          : "e.g. 500 (for ৳500 off)"
                      }
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* LIVE TOTALS CARD */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                  Invoice Breakdown
                </span>
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    Subscription ({billDurationMonths} Mo @{" "}
                    {billingOrg.currency}
                    {customPlanPrice.toLocaleString()})
                  </span>
                  <span className="">
                    {billingOrg.currency}
                    {billTotals.planSubtotal.toLocaleString()}
                  </span>
                </div>
                {billTotals.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="">
                      - {billingOrg.currency}
                      {billTotals.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {billTotals.hardwareTotal > 0 && (
                  <div className="flex items-center justify-between text-purple-400">
                    <span>Hardware Line Items</span>
                    <span className="">
                      + {billingOrg.currency}
                      {billTotals.hardwareTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between font-black">
                  <span className="text-white text-sm">Grand Total Amount</span>
                  <span className="text-emerald-400 text-base">
                    {billingOrg.currency}
                    {billTotals.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* ACTION / RESULT */}
              {generatedBillResult ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-3">
                  <div className="font-black text-emerald-400 text-xs">
                    Official Invoice #{generatedBillResult.invoice_number}{" "}
                    Created in Supabase!
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        window.location.origin + generatedBillResult.share_url
                      }
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg  text-[11px] text-slate-300"
                    />
                    <button
                      onClick={() =>
                        handleCopy(
                          window.location.origin +
                            generatedBillResult.share_url,
                          "inv_link",
                        )
                      }
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                    >
                      {copiedKey === "inv_link" ? "Copied!" : "Copy Link"}
                    </button>
                    <a
                      href={generatedBillResult.share_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleExecuteGenerateBill}
                  disabled={billingLoading}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {billingLoading
                      ? "Creating Invoice in Database..."
                      : "Confirm & Create Invoice"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {payModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-sm text-white">
                  Record Client Payment
                </h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleRecordPaymentSubmit}
              className="p-4 sm:p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Payment Amount ({selectedOrg.currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payForm.amount || ""}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-lg font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) =>
                      setPayForm({ ...payForm, payment_date: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Method
                  </label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, payment_method: e.target.value })
                    }
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
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Transaction ID / Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRX-88912 or Bank Ref"
                  value={payForm.transaction_id}
                  onChange={(e) =>
                    setPayForm({ ...payForm, transaction_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5  text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {selectedOrg.invoices && selectedOrg.invoices.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Link to Unpaid Invoice
                  </label>
                  <select
                    value={payForm.invoice_id}
                    onChange={(e) =>
                      setPayForm({ ...payForm, invoice_id: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">
                      -- Direct Payment (No Invoice Link) --
                    </option>
                    {selectedOrg.invoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoice_number} ({inv.currency}
                        {inv.total_amount?.toLocaleString()}) - Status:{" "}
                        {inv.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly subscription payment"
                  value={payForm.notes}
                  onChange={(e) =>
                    setPayForm({ ...payForm, notes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {payLoading ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: API TESTER */}
      {/* ========================================================================= */}
      {apiTesterOpen && testedOrg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" /> Management API
                Live Tester
              </h3>
              <button
                onClick={() => setApiTesterOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Endpoint
                </label>
                <div className="p-2 bg-slate-950 border border-slate-800  text-purple-300 text-xs break-all rounded-lg">
                  GET /management/api/checkSubscription?orgId={testedOrg.org_id}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Response JSON
                </label>
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800  text-emerald-400 text-xs overflow-x-auto">
                  {apiLoading
                    ? "Fetching..."
                    : JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
      />
    </div>
  );
}
