"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { TableSkeleton } from "@/components/skeleton";
import {
  getPlans,
  savePlan,
  deletePlan,
  getSubscriptionUsers,
  saveSubscriptionUser,
  deleteSubscriptionUser,
  getSubscriptions,
  saveSubscription,
  kickSubscription,
  changeSubscriptionPrice,
  recordSubscriptionPayment,
  deductSubscriptionPayment,
  getPaymentHistory,
  getShareLinks,
  createSubscriptionShareLink,
  revokeShareLink,
  editSubscriptionPayment,
  deleteSubscriptionPayment,
} from "@/services/subscriptions";
import {
  getCalendarMonthsElapsed,
  getPaidUpToMonthStr,
  getStartMonthStr,
} from "@/lib/date-utils";

export default function SubscriptionsDashboardPage() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    "subscriptions" | "plans" | "users" | "links"
  >("subscriptions");
  const [loading, setLoading] = useState(true);

  // Data states
  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [shareLinks, setShareLinks] = useState<any[]>([]);

  // Search & Filter states
  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState<
    "all" | "active" | "kicked" | "due" | "advance"
  >("all");
  const [planSearch, setPlanSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paySub, setPaySub] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payAmountPerSlot, setPayAmountPerSlot] = useState<number | "">("");
  const [payNotes, setPayNotes] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceSub, setPriceSub] = useState<any>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [recalculateAdvance, setRecalculateAdvance] = useState(true);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareType, setShareType] = useState<
    "all" | "client" | "clients" | "plan" | "subscriptions"
  >("all");
  const [shareNeverExpires, setShareNeverExpires] = useState(true);
  const [shareDays, setShareDays] = useState(30);
  const [shareClientId, setShareClientId] = useState("");
  const [shareClientIds, setShareClientIds] = useState<string[]>([]);
  const [sharePlanId, setSharePlanId] = useState("");
  const [shareSubIds, setShareSubIds] = useState<string[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySub, setHistorySub] = useState<any>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payment edit states
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editMonths, setEditMonths] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, usersRes, subsRes, linksRes] = await Promise.all([
        getPlans(),
        getSubscriptionUsers(),
        getSubscriptions(),
        getShareLinks(),
      ]);
      setPlans(plansRes);
      setUsers(usersRes);
      setSubscriptions(subsRes);
      setShareLinks(linksRes);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load subscriptions data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----------------------------------------------------
  // PLANS ACTIONS
  // ----------------------------------------------------
  const handleOpenPlanModal = (plan: any = null) => {
    setEditingPlan(
      plan
        ? { ...plan }
        : {
            name: "",
            original_price: 0,
            selling_price: 0,
            number_of_slots: 1,
            mail: "",
          },
    );
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePlan(editingPlan);
      toast.success(
        editingPlan.id
          ? "Plan updated successfully"
          : "Plan created successfully",
      );
      setIsPlanModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this plan? This will also remove associated subscriptions.",
      )
    )
      return;
    try {
      await deletePlan(id);
      toast.success("Plan deleted successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete plan");
    }
  };

  // ----------------------------------------------------
  // USERS ACTIONS
  // ----------------------------------------------------
  const handleOpenUserModal = (user: any = null) => {
    setEditingUser(user ? { ...user } : { name: "", contact: "", phone: "" });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSubscriptionUser(editingUser);
      toast.success(
        editingUser.id
          ? "User updated successfully"
          : "User profile created successfully",
      );
      setIsUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user profile? All associated subscriptions will be removed.",
      )
    )
      return;
    try {
      await deleteSubscriptionUser(id);
      toast.success("User profile deleted successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  // ----------------------------------------------------
  // SUBSCRIPTIONS ACTIONS
  // ----------------------------------------------------
  const handleOpenSubModal = (sub: any = null) => {
    setEditingSub(
      sub
        ? { ...sub }
        : {
            user_id: users[0]?.id || "",
            plan_id: plans[0]?.id || "",
            slots_count: 1,
            price_per_slot: plans[0]?.selling_price || 0,
            start_date: new Date().toISOString().split("T")[0],
            status: "active",
          },
    );
    setIsSubModalOpen(true);
  };

  const handleSubPlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan && editingSub) {
      setEditingSub({
        ...editingSub,
        plan_id: planId,
        price_per_slot: plan.selling_price,
      });
    }
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSubscription(editingSub);
      toast.success(
        editingSub.id
          ? "Subscription updated"
          : "Subscription successfully created",
      );
      setIsSubModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save subscription");
    }
  };

  const handleKickUser = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to kick ${name}? Their history and past payments will remain, but their subscription status will be set to Kicked.`,
      )
    )
      return;
    try {
      await kickSubscription(id);
      toast.success(`${name} kicked successfully. Status updated.`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to kick user");
    }
  };

  const handleQuickPay = async (sub: any) => {
    const oneMonthVal = Number(sub.price_per_slot) * Number(sub.slots_count);
    try {
      await recordSubscriptionPayment(
        sub.id,
        oneMonthVal,
        1,
        "Quick recorded 1 month payment",
      );
      toast.success("Recorded 1 month payment successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record quick payment");
    }
  };

  const handleDeductPay = async (sub: any) => {
    if (
      !confirm(
        "Deduct 1 month payment from this subscription? This will subtract 1 month from paid duration and subtract cash value from total paid.",
      )
    )
      return;
    try {
      await deductSubscriptionPayment(sub.id, "Deducted 1 month payment");
      toast.success("Deducted 1 month payment successfully");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to deduct payment");
    }
  };

  // ----------------------------------------------------
  // RECEIVED AMOUNT POPULATING PAYMENT
  // ----------------------------------------------------
  const getPaymentOptions = (sub: any) => {
    if (!sub) return [];
    const options = [
      { months: 1 },
      { months: 2 },
      { months: 3 },
      { months: 6 },
      { months: 12 },
    ];

    const slotPrice = Number(sub.price_per_slot);
    const slots = Number(sub.slots_count);
    const currentMonthsPaid = Number(sub.months_paid);

    return options.map((opt) => {
      const targetMonths = currentMonthsPaid + opt.months;
      const targetDate = getPaidUpToMonthStr(sub.start_date, targetMonths);
      const totalCost = opt.months * slotPrice * slots;
      return {
        label: `Paid upto: ${targetDate}`,
        months: opt.months,
        targetDate,
        totalCost,
      };
    });
  };

  const handleOpenPayModal = (sub: any) => {
    setPaySub(sub);
    setPayAmount("");
    setPayAmountPerSlot("");
    setPayNotes("");
    setIsPayModalOpen(true);
  };

  const handlePayAmountChange = (val: number | "") => {
    setPayAmount(val);
    if (val === "" || !paySub) {
      setPayAmountPerSlot("");
    } else {
      setPayAmountPerSlot(
        Math.round((val / Number(paySub.slots_count)) * 100) / 100,
      );
    }
  };

  const handlePayAmountPerSlotChange = (val: number | "") => {
    setPayAmountPerSlot(val);
    if (val === "" || !paySub) {
      setPayAmount("");
    } else {
      setPayAmount(Math.round(val * Number(paySub.slots_count) * 100) / 100);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySub || !payAmount || payAmount <= 0) return;
    setIsRecordingPayment(true);

    const slotPrice = Number(paySub.price_per_slot);
    const slots = Number(paySub.slots_count);
    const calculatedMonths =
      Math.round((Number(payAmount) / (slotPrice * slots)) * 100) / 100;

    try {
      await recordSubscriptionPayment(
        paySub.id,
        Number(payAmount),
        calculatedMonths,
        payNotes || `Payment of ৳${payAmount} recorded`,
      );
      toast.success(
        `Payment recorded successfully! Populated ${calculatedMonths} month(s).`,
      );
      setIsPayModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // ----------------------------------------------------
  // EDIT PRICE ACTIONS
  // ----------------------------------------------------
  const handleOpenPriceModal = (sub: any) => {
    setPriceSub(sub);
    setNewPrice(Number(sub.price_per_slot));
    setRecalculateAdvance(true);
    setIsPriceModalOpen(true);
  };

  const handleSavePriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceSub || newPrice <= 0) return;
    setIsUpdatingPrice(true);

    try {
      await changeSubscriptionPrice(priceSub.id, newPrice, recalculateAdvance);
      toast.success("Price updated successfully");
      setIsPriceModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update price");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // ----------------------------------------------------
  // SHARE LINK ACTIONS
  // ----------------------------------------------------
  const handleOpenShareModal = () => {
    setShareLabel("");
    setShareType("all");
    setShareNeverExpires(true);
    setShareDays(30);
    setShareClientId(users[0]?.id || "");
    setShareClientIds([]);
    setSharePlanId(plans[0]?.id || "");
    setShareSubIds([]);
    setGeneratedLink(null);
    setIsShareModalOpen(true);
  };

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingShareLink(true);

    let params: any = {};
    if (shareType === "client") {
      params = { client_id: shareClientId };
    } else if (shareType === "clients") {
      params = { client_ids: shareClientIds };
    } else if (shareType === "plan") {
      params = { plan_id: sharePlanId };
    } else if (shareType === "subscriptions") {
      params = { subscription_ids: shareSubIds };
    }

    try {
      const res = await createSubscriptionShareLink(
        shareLabel,
        shareType,
        params,
        shareNeverExpires,
        shareDays,
      );
      const origin = window.location.origin;
      const fullUrl = `${origin}/subscriptions/share/${res.token}`;
      setGeneratedLink(fullUrl);
      toast.success("Share link generated successfully!");
      // Refresh share links list
      const links = await getShareLinks();
      setShareLinks(links);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link");
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleRevokeShareLink = async (id: string) => {
    if (
      !confirm(
        "Revoke this share link? Anyone using it will instantly lose access.",
      )
    )
      return;
    try {
      await revokeShareLink(id);
      toast.success("Share link revoked successfully");
      // Refresh share links list
      const links = await getShareLinks();
      setShareLinks(links);
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke link");
    }
  };

  // ----------------------------------------------------
  // HISTORY MODAL
  // ----------------------------------------------------
  const handleOpenHistoryModal = async (sub: any) => {
    setHistorySub(sub);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await getPaymentHistory(sub.id);
      setHistoryPayments(history);
    } catch (err: any) {
      toast.error("Failed to load payment history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditPaymentClick = (payment: any) => {
    setEditingPaymentId(payment.id);
    setEditAmount(payment.amount);
    setEditMonths(payment.months);
    setEditNotes(payment.notes || "");
  };

  const handleCancelPaymentEdit = () => {
    setEditingPaymentId(null);
    setEditAmount("");
    setEditMonths("");
    setEditNotes("");
  };

  const handleSavePaymentEdit = async (paymentId: string) => {
    if (editAmount === "" || editMonths === "") {
      toast.error("Please enter a valid amount and months.");
      return;
    }
    setIsSavingEdit(true);
    try {
      await editSubscriptionPayment(paymentId, {
        amount: Number(editAmount),
        months: Number(editMonths),
        notes: editNotes,
      });
      toast.success("Payment record updated successfully.");
      setEditingPaymentId(null);
      // Reload history and dashboard data
      if (historySub) {
        const history = await getPaymentHistory(historySub.id);
        setHistoryPayments(history);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment record.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePaymentClick = async (paymentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this payment record? This will adjust the subscription's paid months and total cash spent accordingly."
      )
    )
      return;
    try {
      await deleteSubscriptionPayment(paymentId);
      toast.success("Payment record deleted successfully.");
      // Reload history and dashboard data
      if (historySub) {
        const history = await getPaymentHistory(historySub.id);
        setHistoryPayments(history);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment record.");
    }
  };

  // Calculate stats for top analytics cards
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const totalSlotsCapacity = plans.reduce(
    (sum, p) => sum + (p.number_of_slots || 0),
    0,
  );
  const totalSlotsUsed = activeSubs.reduce(
    (sum, s) => sum + (s.slots_count || 0),
    0,
  );
  const mrr = activeSubs.reduce(
    (sum, s) => sum + Number(s.price_per_slot) * Number(s.slots_count),
    0,
  );
  const kickedCount = subscriptions.filter((s) => s.status === "kicked").length;

  // Filter subscriptions list
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Search query filter
    const query = subSearch.toLowerCase();
    const userName = sub.user?.name?.toLowerCase() || "";
    const userContact = sub.user?.contact?.toLowerCase() || "";
    const userPhone = sub.user?.phone?.toLowerCase() || "";
    const planName = sub.plan?.name?.toLowerCase() || "";
    const matchesSearch =
      userName.includes(query) ||
      userContact.includes(query) ||
      userPhone.includes(query) ||
      planName.includes(query);

    if (!matchesSearch) return false;

    // Status filter
    const todayStr = new Date().toISOString().split("T")[0];
    const endStr = sub.kicked_at
      ? new Date(sub.kicked_at).toISOString().split("T")[0]
      : todayStr;
    const monthsConsumed = getCalendarMonthsElapsed(sub.start_date, endStr);
    const monthsRemaining = Number(sub.months_paid) - monthsConsumed;

    if (subFilter === "active" && sub.status !== "active") return false;
    if (subFilter === "kicked" && sub.status !== "kicked") return false;
    if (
      subFilter === "due" &&
      (sub.status !== "active" || monthsRemaining >= 0)
    )
      return false;
    if (
      subFilter === "advance" &&
      (sub.status !== "active" || monthsRemaining <= 0)
    )
      return false;

    return true;
  });

  const filteredPlans = plans.filter((p) =>
    p.name?.toLowerCase().includes(planSearch.toLowerCase()),
  );
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.contact?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.includes(userSearch),
  );

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="bg-slate-200 dark:bg-slate-800 rounded w-48 h-7 animate-pulse"></div>
            <div className="bg-slate-100 dark:bg-slate-900 rounded w-64 h-3 animate-pulse"></div>
          </div>
        </div>
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto p-4 lg:p-12 max-w-7xl h-full font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-black text-slate-800 dark:text-white text-xl lg:text-2xl uppercase tracking-tighter">
            Subscriptions Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Manage plans, client allocations, slots, payments, and secure public
            tracking links.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenShareModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-650/20 shadow-lg px-4 py-2.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
          >
            <i className="fa-solid fa-share-nodes"></i> Share Dashboard
          </button>
          {activeTab === "subscriptions" && (
            <button
              onClick={() => handleOpenSubModal()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-650/20 shadow-lg px-4 py-2.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
            >
              <i className="fa-solid fa-plus"></i> New Subscription
            </button>
          )}
          {activeTab === "plans" && (
            <button
              onClick={() => handleOpenPlanModal()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-650/20 shadow-lg px-4 py-2.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
            >
              <i className="fa-solid fa-plus"></i> Create Plan
            </button>
          )}
          {activeTab === "users" && (
            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-650/20 shadow-lg px-4 py-2.5 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
            >
              <i className="fa-solid fa-plus"></i> Add User
            </button>
          )}
        </div>
      </div>

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                Monthly Recurring Revenue
              </span>
              <h3 className="mt-1 font-black text-slate-800 dark:text-white text-2xl tracking-tight">
                ৳{mrr.toLocaleString()}
              </h3>
            </div>
            <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
              <i className="fa-solid fa-sack-dollar text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                Slot Allocation
              </span>
              <h3 className="mt-1 font-black text-slate-800 dark:text-white text-2xl tracking-tight">
                {totalSlotsUsed} / {totalSlotsCapacity}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                {totalSlotsCapacity > 0
                  ? Math.round((totalSlotsUsed / totalSlotsCapacity) * 100)
                  : 0}
                % capacity utilized
              </p>
            </div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-ticket text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                Active Subscriptions
              </span>
              <h3 className="mt-1 font-black text-slate-850 dark:text-white text-2xl tracking-tight">
                {activeSubs.length}
              </h3>
            </div>
            <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-600 dark:text-sky-400">
              <i className="fa-solid fa-users text-lg"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl p-5 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                Kicked (History Retained)
              </span>
              <h3 className="mt-1 font-black text-rose-500 text-2xl tracking-tight">
                {kickedCount}
              </h3>
            </div>
            <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-600 dark:text-rose-450">
              <i className="fa-solid fa-ban text-lg"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto pb-px scrollbar-none mb-6">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === "subscriptions"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-ticket"></i> Subscriptions
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === "plans"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-layer-group"></i> Manage Plans
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-users"></i> Subscription Users
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
            activeTab === "links"
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-link"></i> Share Links
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl shadow-xl overflow-hidden">
        {/* TAB 1: SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && (
          <div>
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-start gap-4">
              <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                User Allocations ({filteredSubscriptions.length})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={subFilter}
                  onChange={(e: any) => setSubFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-xs dark:text-white"
                >
                  <option value="all">All Subs</option>
                  <option value="active">Active Only</option>
                  <option value="due">Due / Overdue</option>
                  <option value="advance">Paid in Advance</option>
                  <option value="kicked">Kicked / History</option>
                </select>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search User or Plan..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-full sm:w-64 text-xs dark:text-white"
                  />
                  <i className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 text-[10px] fa-solid fa-search"></i>
                </div>
              </div>
              {/* Grouped by Plan Member Cards */}
              <div className="p-6 space-y-8">
                {plans.map((plan) => {
                  const planSubs = filteredSubscriptions.filter(
                    (sub) => sub.plan_id === plan.id,
                  );
                  if (planSubs.length === 0 && subSearch !== "") return null;

                  const activeSlots = planSubs.reduce(
                    (sum, sub) =>
                      sub.status === "active"
                        ? sum + Number(sub.slots_count)
                        : sum,
                    0,
                  );

                  const freeSlots = Math.max(0, plan.number_of_slots - activeSlots);
                  const showFreeSlotCard = freeSlots > 0 && subSearch === "";

                  return (
                    <div
                      key={plan.id}
                      className="space-y-4 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h3 className="font-black text-slate-850 dark:text-white text-base uppercase tracking-tight flex items-center gap-2">
                            {plan.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide">
                            ৳{Number(plan.selling_price).toLocaleString()} per
                            slot · original price ৳
                            {Number(plan.original_price).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                            Slots: {activeSlots} / {plan.number_of_slots}{" "}
                            occupied
                          </span>
                          {activeSlots >= plan.number_of_slots && (
                            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                              Full
                            </span>
                          )}
                        </div>
                      </div>

                      {planSubs.length === 0 && !showFreeSlotCard ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">
                          No allocations found for this plan.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {planSubs.map((sub) => {
                            const todayStr = new Date()
                              .toISOString()
                              .split("T")[0];
                            const endStr = sub.kicked_at
                              ? new Date(sub.kicked_at)
                                  .toISOString()
                                  .split("T")[0]
                              : todayStr;
                            const monthsConsumed = getCalendarMonthsElapsed(
                              sub.start_date,
                              endStr,
                            );
                            const monthsRemaining =
                              Number(sub.months_paid) - monthsConsumed;
                            const totalCostPerMonth =
                              Number(sub.price_per_slot) *
                              Number(sub.slots_count);
                            const balanceAmount = Math.round(
                              Math.abs(monthsRemaining) * totalCostPerMonth,
                            );

                            const startMonthStr = getStartMonthStr(
                              sub.start_date,
                            );
                            const paidUpTo = getPaidUpToMonthStr(
                              sub.start_date,
                              sub.months_paid,
                            );

                            // Colors / visual helpers
                            const isKicked = sub.status === "kicked";
                            const isDue = !isKicked && monthsRemaining < -0.01;
                            const isAdvance =
                              !isKicked && monthsRemaining > 0.01;

                            // Initials for avatar
                            const initials = sub.user?.name
                              ? sub.user.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .substring(0, 2)
                                  .toUpperCase()
                              : "??";

                            return (
                              <div
                                key={sub.id}
                                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative flex flex-col justify-between ${
                                  isKicked
                                    ? "border-slate-200 dark:border-slate-800 opacity-60"
                                    : isDue
                                      ? "border-rose-200 dark:border-rose-900/50 shadow-rose-50/10"
                                      : isAdvance
                                        ? "border-emerald-250 dark:border-emerald-900/50 shadow-emerald-50/10"
                                        : "border-slate-200 dark:border-slate-800"
                                }`}
                              >
                                {/* Card Header */}
                                <div>
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-10 h-10 rounded-full flex justify-center items-center font-black text-sm text-white ${
                                          isKicked
                                            ? "bg-slate-400"
                                            : isDue
                                              ? "bg-rose-500 shadow-lg shadow-rose-500/20"
                                              : isAdvance
                                                ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                                : "bg-indigo-550 shadow-lg shadow-indigo-650/20"
                                        }`}
                                      >
                                        {initials}
                                      </div>
                                      <div>
                                        <h4 className="font-black text-slate-850 dark:text-white text-sm tracking-tight leading-tight">
                                          {sub.user?.name}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">
                                          {sub.user?.contact || "No Email"}
                                        </span>
                                      </div>
                                    </div>

                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                        isKicked
                                          ? "bg-slate-100 text-slate-500 dark:bg-slate-855"
                                          : isDue
                                            ? "bg-rose-100 text-rose-600 dark:bg-rose-950/30"
                                            : isAdvance
                                              ? "bg-emerald-100 text-emerald-605 dark:bg-emerald-950/30"
                                              : "bg-slate-100 text-slate-655 dark:bg-slate-800"
                                      }`}
                                    >
                                      {sub.slots_count} Slot
                                      {sub.slots_count > 1 ? "s" : ""}
                                    </span>
                                  </div>

                                  {/* Card Details */}
                                  <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold">
                                        Monthly Price:
                                      </span>
                                      <span className="font-black text-slate-800 dark:text-slate-200">
                                        ৳{totalCostPerMonth.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold">
                                        Start Month:
                                      </span>
                                      <span className="font-bold text-slate-655 dark:text-slate-350">
                                        {startMonthStr}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold">
                                        Paid Upto:
                                      </span>
                                      <span className="font-black text-indigo-600 dark:text-indigo-400">
                                        {paidUpTo}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold">
                                        Total Spent:
                                      </span>
                                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                                        ৳
                                        {Number(
                                          sub.total_amount_paid || 0,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Paid Upto Indicator */}
                                  <div
                                    className={`mt-4 p-3 rounded-xl flex items-center gap-2 border ${
                                      isKicked
                                        ? "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-500"
                                        : isDue
                                          ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 text-rose-600 dark:text-rose-455"
                                          : isAdvance
                                            ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 text-emerald-605 dark:text-emerald-400"
                                            : "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-355"
                                    }`}
                                  >
                                    <i
                                      className={`text-sm fa-solid ${
                                        isKicked
                                          ? "fa-user-slash"
                                          : isDue
                                            ? "fa-triangle-exclamation"
                                            : "fa-circle-check"
                                      }`}
                                    ></i>
                                    <div className="text-[10px] leading-tight">
                                      <span className="block font-black uppercase tracking-wider">
                                        {isKicked
                                          ? "Kicked / Frozen"
                                          : isDue
                                            ? "Overdue Debt"
                                            : isAdvance
                                              ? "Paid in Advance"
                                              : "Up to Date"}
                                      </span>
                                      <span className="block font-bold mt-0.5">
                                        {isKicked
                                          ? `Kicked in ${getStartMonthStr(sub.kicked_at)}`
                                          : (() => {
                                              const nextMonthIndex = Math.floor(Number(sub.months_paid)) + 1;
                                              const nextMonthName = getPaidUpToMonthStr(sub.start_date, nextMonthIndex);
                                              let remainsVal = 0;
                                              if (monthsRemaining < -0.01) {
                                                remainsVal = balanceAmount;
                                              } else if (monthsRemaining > 0.01) {
                                                const partialPaid = Number(sub.total_amount_paid || 0) % totalCostPerMonth;
                                                remainsVal = partialPaid === 0 ? totalCostPerMonth : Math.round(totalCostPerMonth - partialPaid);
                                              } else {
                                                remainsVal = 0;
                                              }
                                              return `${remainsVal} remains. Next for ${nextMonthName}`;
                                            })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card Actions */}
                                <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Actions
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleOpenPayModal(sub)}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-indigo-600 transition-colors cursor-pointer"
                                      title="Enter Received Amount"
                                    >
                                      <i className="fa-solid fa-money-bill-wave text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() => handleQuickPay(sub)}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-emerald-500 transition-colors cursor-pointer"
                                      title="Quick Pay (+1 Month)"
                                    >
                                      <i className="fa-solid fa-circle-plus text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() => handleDeductPay(sub)}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-amber-500 transition-colors cursor-pointer"
                                      title="Deduct Pay (-1 Month)"
                                    >
                                      <i className="fa-solid fa-circle-minus text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() => handleOpenPriceModal(sub)}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-sky-550 transition-colors cursor-pointer"
                                      title="Change Price"
                                    >
                                      <i className="fa-solid fa-tags text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOpenHistoryModal(sub)
                                      }
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                      title="Payment History"
                                    >
                                      <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                                    </button>
                                    {sub.status === "active" && (
                                      <button
                                        onClick={() =>
                                          handleKickUser(sub.id, sub.user?.name)
                                        }
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-red-500 transition-colors cursor-pointer"
                                        title="Kick User"
                                      >
                                        <i className="fa-solid fa-user-slash text-sm"></i>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {showFreeSlotCard && (
                            <div
                              onClick={() => {
                                setEditingSub({
                                  user_id: users[0]?.id || "",
                                  plan_id: plan.id,
                                  slots_count: Math.min(freeSlots, 1),
                                  price_per_slot: plan.selling_price || 0,
                                  start_date: new Date().toISOString().split("T")[0],
                                  status: "active",
                                });
                                setIsSubModalOpen(true);
                              }}
                              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 rounded-2xl p-5 transition-all flex flex-col justify-center items-center text-center cursor-pointer min-h-[220px] group"
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex justify-center items-center text-slate-400 group-hover:text-indigo-500 transition-colors mb-3 border border-slate-200 dark:border-slate-850">
                                <i className="fa-solid fa-plus text-sm"></i>
                              </div>
                              <h4 className="font-black text-slate-700 dark:text-slate-200 text-sm transition-colors group-hover:text-indigo-650 dark:group-hover:text-indigo-400">
                                {freeSlots} Free Slot{freeSlots > 1 ? "s" : ""} Available
                              </h4>
                              <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-[200px] mt-1 font-semibold">
                                Click here to quickly allocate a free slot and add a member.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredSubscriptions.length === 0 && (
                  <div className="py-12 text-slate-400 text-sm text-center italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No allocations found matching the filters.
                  </div>
                )}
              </div>{" "}
            </div>
          </div>
        )}

        {/* TAB 2: PLANS */}
        {activeTab === "plans" && (
          <div>
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                Subscription Plans ({filteredPlans.length})
              </h2>
              <div>
                <input
                  type="text"
                  placeholder="Search Plans..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-48 sm:w-64 text-xs dark:text-white"
                />
              </div>
            </div>

            {/* Grid list of plans */}
            <div className="p-6">
              {filteredPlans.length === 0 ? (
                <div className="py-12 text-slate-400 text-sm text-center italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No plans found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlans.map((plan) => {
                    const planSubs = subscriptions.filter(
                      (sub) =>
                        sub.plan_id === plan.id && sub.status === "active",
                    );
                    const slotsOccupied = planSubs.reduce(
                      (sum, s) => sum + Number(s.slots_count),
                      0,
                    );

                    return (
                      <div
                        key={plan.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-black text-slate-850 dark:text-white text-base tracking-tight">
                              {plan.name}
                            </h3>
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {plan.number_of_slots} Slots
                            </span>
                          </div>
                          <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Selling Price:
                              </span>
                              <span className="font-black text-slate-800 dark:text-slate-200">
                                ৳{Number(plan.selling_price).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Original Price:
                              </span>
                              <span className="font-bold text-slate-500 dark:text-slate-400 line-through">
                                ৳{Number(plan.original_price).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Slots Occupied:
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {slotsOccupied} / {plan.number_of_slots}
                              </span>
                            </div>
                            {plan.mail && (
                              <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-550 font-semibold bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 max-h-20 overflow-y-auto">
                                <span className="block text-[8px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-wider mb-1">
                                  Email Template:
                                </span>
                                {plan.mail}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Plan Actions
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenPlanModal(plan)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Edit Plan"
                            >
                              <i className="fa-solid fa-pen text-sm"></i>
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete Plan"
                            >
                              <i className="fa-solid fa-trash text-sm"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USERS */}
        {activeTab === "users" && (
          <div>
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                Subscription Users ({filteredUsers.length})
              </h2>
              <div>
                <input
                  type="text"
                  placeholder="Search Users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-48 sm:w-64 text-xs dark:text-white"
                />
              </div>
            </div>

            {/* Grid list of users */}
            <div className="p-6">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-slate-400 text-sm text-center italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No users found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user) => {
                    const userSubs = subscriptions.filter(
                      (sub) => sub.user_id === user.id,
                    );
                    const activeSubsCount = userSubs.filter(
                      (sub) => sub.status === "active",
                    ).length;
                    const totalPaidByUser = userSubs.reduce(
                      (sum, s) => sum + (Number(s.total_amount_paid) || 0),
                      0,
                    );
                    const slotsOwned = userSubs.reduce(
                      (sum, s) => sum + (s.slots_count || 0),
                      0,
                    );

                    const initials = user.name
                      ? user.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "??";

                    return (
                      <div
                        key={user.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex justify-center items-center font-black text-sm text-white bg-indigo-500 shadow-lg shadow-indigo-500/20">
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-850 dark:text-white text-base tracking-tight">
                                {user.name}
                              </h3>
                              <span className="text-[10px] text-slate-400 block font-semibold">
                                {user.contact || "No Email"}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Phone Number:
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {user.phone || "---"}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Active Subscriptions:
                              </span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {activeSubsCount} active
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Slots Owned:
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-350">
                                {slotsOwned} Slots
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400 font-bold">
                                Total Spent:
                              </span>
                              <span className="font-black text-emerald-605 dark:text-emerald-400">
                                ৳{totalPaidByUser.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            User Actions
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenUserModal(user)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                              title="Edit User"
                            >
                              <i className="fa-solid fa-pen text-sm"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete User"
                            >
                              <i className="fa-solid fa-trash text-sm"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SHARE LINKS */}
        {activeTab === "links" && (
          <div>
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                Active Dashboard Share Links ({shareLinks.length})
              </h2>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 font-black text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-6 py-4">Link Label</th>
                    <th className="px-6 py-4">Scope / Type</th>
                    <th className="px-6 py-4">Views</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {shareLinks.map((link) => {
                    const isExpired =
                      !link.never_expires &&
                      new Date(link.expires_at) < new Date();
                    const isRevoked = !!link.revoked_at;
                    const isActiveLink = !isExpired && !isRevoked;

                    return (
                      <tr
                        key={link.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                              {link.label || "Unnamed Link"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono select-all">
                              {link.token}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                            {link.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-655 dark:text-slate-450">
                          {link.view_count || 0} View
                          {link.view_count === 1 ? "" : "s"}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-550 dark:text-slate-400 font-semibold">
                          {link.never_expires
                            ? "Never Expires"
                            : new Date(link.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {isRevoked ? (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-red-100 text-red-600">
                              Revoked
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-100 text-amber-600">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-100 text-emerald-600">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {isActiveLink && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/subscriptions/share/${link.token}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success(
                                    "Share link copied to clipboard!",
                                  );
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Copy Share Link"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </button>
                            )}
                            {isActiveLink && (
                              <button
                                onClick={() => handleRevokeShareLink(link.id)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                title="Revoke Link"
                              >
                                <i className="fa-solid fa-ban"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {shareLinks.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-slate-400 text-sm text-center italic"
                      >
                        No share links created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PLAN MODAL (CREATE & EDIT) */}
      {isPlanModalOpen && editingPlan && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-md my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">
                {editingPlan.id
                  ? "Edit Subscription Plan"
                  : "Create Subscription Plan"}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix UHD Family"
                  value={editingPlan.name}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Original Price (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPlan.original_price}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        original_price: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Selling Price (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPlan.selling_price}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        selling_price: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Number of Slots
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPlan.number_of_slots}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      number_of_slots: Number(e.target.value),
                    })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Mail Details (template/notes)
                </label>
                <textarea
                  rows={3}
                  placeholder="Insert plan notification mail text or details..."
                  value={editingPlan.mail}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, mail: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-xs dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 cursor-pointer"
              >
                Save Plan Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER MODAL (CREATE & EDIT) */}
      {isUserModalOpen && editingUser && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-md my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">
                {editingUser.id ? "Edit User Profile" : "Add Subscription User"}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Contact Email / Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. john@example.com"
                  value={editingUser.contact}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, contact: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 w-full text-sm dark:text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +8801700000000"
                  value={editingUser.phone}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, phone: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 w-full text-sm dark:text-white font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 cursor-pointer"
              >
                Save User Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION MODAL (CREATE & EDIT) */}
      {isSubModalOpen && editingSub && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-md my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">
                {editingSub.id ? "Edit Subscription" : "Create Subscription"}
              </h3>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaveSub} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Select User Profile
                </label>
                <select
                  required
                  value={editingSub.user_id}
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, user_id: e.target.value })
                  }
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.contact || "No contact"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Select Plan
                </label>
                <select
                  required
                  value={editingSub.plan_id}
                  onChange={(e) => handleSubPlanChange(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (৳{Number(p.selling_price).toLocaleString()}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Slots Bought
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingSub.slots_count}
                    onChange={(e) =>
                      setEditingSub({
                        ...editingSub,
                        slots_count: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Custom Price per Slot (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingSub.price_per_slot}
                    onChange={(e) =>
                      setEditingSub({
                        ...editingSub,
                        price_per_slot: Number(e.target.value),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editingSub.start_date}
                    onChange={(e) =>
                      setEditingSub({
                        ...editingSub,
                        start_date: e.target.value,
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-xs font-semibold dark:text-white cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Status
                  </label>
                  <select
                    required
                    value={editingSub.status}
                    onChange={(e) =>
                      setEditingSub({ ...editingSub, status: e.target.value })
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="kicked">Kicked</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 cursor-pointer"
              >
                Save Subscription Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVED AMOUNT / RECORD PAYMENT MODAL */}
      {isPayModalOpen && paySub && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-md my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Record Received Payment
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                  For {paySub.user?.name} · {paySub.plan?.name} (
                  {paySub.slots_count} slots)
                </p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 border border-indigo-200 dark:border-indigo-850 rounded-xl">
                <span className="text-[10px] uppercase font-black text-indigo-650 dark:text-indigo-400 block mb-1">
                  Subscription Pricing Summary
                </span>
                <span className="block text-xs font-bold text-slate-600 dark:text-slate-350">
                  Slots: {paySub.slots_count} @ ৳
                  {Number(paySub.price_per_slot).toLocaleString()}/slot
                </span>
                <span className="block text-sm font-black text-slate-900 dark:text-white mt-1">
                  Monthly Total Cost: ৳
                  {(
                    Number(paySub.price_per_slot) * Number(paySub.slots_count)
                  ).toLocaleString()}
                </span>
              </div>

              {/* Month Paid Upto Buttons */}
              <div className="space-y-2">
                <label className="block font-bold text-[10px] text-slate-400 uppercase">
                  Select Month Paid Up To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getPaymentOptions(paySub).map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handlePayAmountChange(opt.totalCost);
                        setPayNotes(`Paid up to ${opt.targetDate}`);
                      }}
                      className="bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center transition-all cursor-pointer group active:scale-[0.98] flex flex-col justify-center items-center"
                    >
                      <span className="block font-black text-indigo-650 dark:text-indigo-400 text-xs">
                        {opt.label}
                      </span>
                      <span className="block text-[10px] font-black text-slate-800 dark:text-slate-200 mt-1">
                        ৳{opt.totalCost.toLocaleString()}
                      </span>
                      <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        to {opt.targetDate}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Received (Total ৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payAmount}
                    onChange={(e) =>
                      handlePayAmountChange(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Received (Per Slot ৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={payAmountPerSlot}
                    onChange={(e) =>
                      handlePayAmountPerSlotChange(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                  />
                </div>
              </div>
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const endStr = paySub.kicked_at
                  ? new Date(paySub.kicked_at).toISOString().split("T")[0]
                  : todayStr;
                const monthsConsumed = getCalendarMonthsElapsed(
                  paySub.start_date,
                  endStr,
                );
                const monthsRemaining = Number(paySub.months_paid) - monthsConsumed;
                const isDue = monthsRemaining < -0.01;

                if (payAmount && payAmount > 0 && !isDue) {
                  return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 border border-emerald-200 dark:border-emerald-850 rounded-xl text-center">
                      <span className="block text-[10px] font-black text-emerald-650 dark:text-emerald-450 uppercase">
                        Autopopulated Duration
                      </span>
                      <span className="block text-base font-black text-slate-900 dark:text-white mt-1">
                        {Math.round(
                          (Number(payAmount) /
                            (Number(paySub.price_per_slot) *
                              Number(paySub.slots_count))) *
                            100,
                        ) / 100}{" "}
                        Month(s) Paid
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Reference / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via bKash transaction #TX123"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 w-full text-xs dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isRecordingPayment || !payAmount || payAmount <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 flex justify-center items-center gap-2 cursor-pointer"
              >
                {isRecordingPayment ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-circle-check"></i>
                )}
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PRICE MODAL */}
      {isPriceModalOpen && priceSub && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-md my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Update Subscription Pricing
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                  For {priceSub.user?.name} · {priceSub.plan?.name}
                </p>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSavePriceUpdate} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  New Price per Slot (৳)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-550 w-full text-sm dark:text-white font-semibold"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="recalc"
                  checked={recalculateAdvance}
                  onChange={(e) => setRecalculateAdvance(e.target.checked)}
                  className="mt-1 accent-indigo-650 h-4 w-4 rounded cursor-pointer"
                />
                <label htmlFor="recalc" className="cursor-pointer select-none">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-300">
                    Recalculate Advanced Paid
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Check to adjust remaining paid months according to the new
                    slot rate. If unchecked, the paid months duration count
                    stays identical.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPrice}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 flex justify-center items-center gap-2 cursor-pointer"
              >
                {isUpdatingPrice ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-tags"></i>
                )}
                Update Price
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHARE LINKS MODAL (CREATOR) */}
      {isShareModalOpen && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-lg my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Create Subscription Share Link
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                  Generate secure real-time dashboards with scoped permissions.
                </p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleCreateShareLink} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                  Link Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix Share Link for John"
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Share Scope
                  </label>
                  <select
                    value={shareType}
                    onChange={(e: any) => setShareType(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                  >
                    <option value="all">Everything (All records)</option>
                    <option value="client">Single Client</option>
                    <option value="clients">Multiple Clients</option>
                    <option value="plan">Specific Plan</option>
                    <option value="subscriptions">
                      Multiple Slots / Subscriptions
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Expiry Policy
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShareNeverExpires(true)}
                      className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all border cursor-pointer ${
                        shareNeverExpires
                          ? "bg-emerald-650 text-white border-transparent"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Never
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareNeverExpires(false)}
                      className={`flex-1 py-2.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all border cursor-pointer ${
                        !shareNeverExpires
                          ? "bg-indigo-600 text-white border-transparent"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Custom Days
                    </button>
                  </div>
                </div>
              </div>

              {!shareNeverExpires && (
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Expires in (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={shareDays}
                    onChange={(e) => setShareDays(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm dark:text-white font-semibold"
                  />
                </div>
              )}

              {/* SCOPED TARGET SELECTORS */}
              {shareType === "client" && (
                <div>
                  <label className="block mb-1 font-bold text-[10px] text-slate-400 uppercase">
                    Select Client User
                  </label>
                  <select
                    value={shareClientId}
                    onChange={(e) => setShareClientId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shareType === "clients" && (
                <div>
                  <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase">
                    Select Clients (Hold Ctrl/Cmd to choose multiple)
                  </label>
                  <select
                    multiple
                    value={shareClientIds}
                    onChange={(e) => {
                      const options = e.target.options;
                      const selected: string[] = [];
                      for (let i = 0; i < options.length; i++) {
                        if (options[i].selected)
                          selected.push(options[i].value);
                      }
                      setShareClientIds(selected);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-xs dark:text-white font-semibold h-24 cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shareType === "plan" && (
                <div>
                  <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase">
                    Select Plan
                  </label>
                  <select
                    value={sharePlanId}
                    onChange={(e) => setSharePlanId(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-sm font-semibold dark:text-white cursor-pointer"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {shareType === "subscriptions" && (
                <div>
                  <label className="block mb-1.5 font-bold text-[10px] text-slate-400 uppercase">
                    Select Subscriptions / Slots (Hold Ctrl/Cmd to choose
                    multiple)
                  </label>
                  <select
                    multiple
                    value={shareSubIds}
                    onChange={(e) => {
                      const options = e.target.options;
                      const selected: string[] = [];
                      for (let i = 0; i < options.length; i++) {
                        if (options[i].selected)
                          selected.push(options[i].value);
                      }
                      setShareSubIds(selected);
                    }}
                    className="bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-full text-xs dark:text-white font-semibold h-28 cursor-pointer"
                  >
                    {subscriptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.user?.name} · {s.plan?.name} ({s.slots_count} slots)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* GENERATED SHARE LINK ALERT */}
              {generatedLink && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 border border-emerald-250 rounded-xl animate-fade-in space-y-2.5">
                  <span className="block text-[10px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest">
                    Real-time Share Link Created!
                  </span>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-mono rounded-lg outline-none dark:text-white select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        toast.success("Link copied!");
                      }}
                      className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      <i className="fa-solid fa-copy"></i>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingShareLink}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-black text-white text-xs uppercase tracking-widest transition-all mt-4 flex justify-center items-center gap-2 cursor-pointer"
              >
                {isCreatingShareLink ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-link"></i>
                )}
                Generate Share Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT TRANSACTION HISTORY MODAL */}
      {isHistoryModalOpen && historySub && (
        <div className="z-50 fixed inset-0 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex justify-center items-center animate-fade-in">
          <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-lg my-auto animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                  Transaction Payment History
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                  For {historySub.user?.name} · {historySub.plan?.name}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingHistory ? (
                <div className="py-12 flex justify-center items-center text-slate-400">
                  <i className="fa-solid fa-spinner animate-spin text-2xl"></i>
                </div>
              ) : historyPayments.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-sm italic">
                  No payments/deductions logged yet for this slot.
                </p>
              ) : (
                <div className="space-y-4">
                  {historyPayments.map((p) => {
                    const isEditing = editingPaymentId === p.id;
                    const isDeduction = p.amount < 0;

                    if (isEditing) {
                      return (
                        <div
                          key={p.id}
                          className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 space-y-3"
                        >
                          <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                            Editing Transaction Record
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1 font-bold text-[9px] text-slate-400 uppercase">
                                Amount (৳)
                              </label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) =>
                                  setEditAmount(
                                    e.target.value ? Number(e.target.value) : "",
                                  )
                                }
                                className="bg-white dark:bg-slate-950 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full text-xs font-semibold dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block mb-1 font-bold text-[9px] text-slate-400 uppercase">
                                Duration (Months)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={editMonths}
                                onChange={(e) =>
                                  setEditMonths(
                                    e.target.value ? Number(e.target.value) : "",
                                  )
                                }
                                className="bg-white dark:bg-slate-950 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full text-xs font-semibold dark:text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 font-bold text-[9px] text-slate-400 uppercase">
                              Reference / Notes
                            </label>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="bg-white dark:bg-slate-950 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full text-xs dark:text-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={handleCancelPaymentEdit}
                              className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => handleSavePaymentEdit(p.id)}
                              className="px-3 py-1.5 text-[10px] font-black text-white bg-indigo-650 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isSavingEdit ? (
                                <i className="fa-solid fa-spinner animate-spin"></i>
                              ) : (
                                "Save"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={p.id}
                        className={`p-4 border rounded-xl flex justify-between items-center transition-all ${
                          isDeduction
                            ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
                            : "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30"
                        }`}
                      >
                        <div className="space-y-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider block ${
                              isDeduction
                                ? "text-rose-500"
                                : "text-emerald-650 dark:text-emerald-450"
                            }`}
                          >
                            {isDeduction
                              ? "Deduction / Chargeback"
                              : "Payment Received"}
                          </span>
                          <span className="block text-xs text-slate-700 dark:text-slate-350 font-semibold">
                            {p.notes || "No description"}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            {new Date(p.payment_date).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <span
                              className={`text-sm font-black block ${
                                isDeduction
                                  ? "text-rose-650"
                                  : "text-emerald-650 dark:text-emerald-400"
                              }`}
                            >
                              {isDeduction ? "-" : "+"}৳
                              {Math.abs(Number(p.amount)).toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-bold">
                              {isDeduction ? "-" : "+"}
                              {Math.abs(Number(p.months))} Month
                              {Math.abs(Number(p.months)) === 1 ? "" : "s"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                            <button
                              onClick={() => handleEditPaymentClick(p)}
                              className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              onClick={() => handleDeletePaymentClick(p.id)}
                              className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
