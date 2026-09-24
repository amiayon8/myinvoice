"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, DollarSign, User, BookOpen, AlertCircle, Trash2, Pencil } from "lucide-react";
import {
  Subject,
  Teacher,
  PaymentPolicyType,
  CalendarEventType,
  ClassSession,
  PaymentRecord,
  ClassStatus,
  PaymentStatus
} from "@/types/tuition";
import { TEACHER_PALETTE, TEACHER_FREE_PALETTE, getTeacherSessionColor } from "@/lib/tuition-storage";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// -------------------------------------------------------------
// 1. ADD / EDIT TEACHER MODAL (Developer-Grade UX)
// -------------------------------------------------------------
interface AddTeacherModalProps extends ModalProps {
  subjects: Subject[];
  onSave: (teacherData: Partial<Teacher>) => void;
  existingTeacher?: Teacher | null;
  onQuickAddSubject?: (name: string) => void;
}

export function AddTeacherModal({
  isOpen,
  onClose,
  subjects,
  onSave,
  existingTeacher,
  onQuickAddSubject
}: AddTeacherModalProps) {
  // Modal step/tab: "info" | "policy" | "routine"
  const [activeTab, setActiveTab] = useState<"info" | "policy" | "routine">("info");

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dailyRate, setDailyRate] = useState("500");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [color, setColor] = useState(TEACHER_PALETTE[0]);
  const [freeClassColor, setFreeClassColor] = useState(TEACHER_FREE_PALETTE[0]);

  // Payment policy state
  const [policyType, setPolicyType] = useState<PaymentPolicyType>("AFTER_N_CLASSES");
  const [cycleSize, setCycleSize] = useState("4");
  const [advanceBalance, setAdvanceBalance] = useState("0");

  // Weekday Routine state
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]); // default Mon, Wed, Fri
  const [defaultTime, setDefaultTime] = useState("16:00");
  const [defaultDurationMin, setDefaultDurationMin] = useState("60");
  const [defaultSubjectId, setDefaultSubjectId] = useState("");

  // Inline subject creator
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  // Sync state whenever modal opens or existingTeacher changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("info");
      if (existingTeacher) {
        setName(existingTeacher.name || "");
        setPhone(existingTeacher.phone || "");
        setEmail(existingTeacher.email || "");
        setDailyRate(
          (existingTeacher.dailyRate ?? existingTeacher.hourlyRate)?.toString() || "500"
        );
        setSelectedSubjectIds(existingTeacher.subjectIds ? [...existingTeacher.subjectIds] : []);
        setColor(existingTeacher.color || TEACHER_PALETTE[0]);
        setFreeClassColor(existingTeacher.freeClassColor || getTeacherSessionColor(existingTeacher, true));
        setPolicyType(existingTeacher.paymentPolicy?.type || "AFTER_N_CLASSES");
        setCycleSize(existingTeacher.paymentPolicy?.cycleSize?.toString() || "4");
        setAdvanceBalance(existingTeacher.paymentPolicy?.advanceBalance?.toString() || "0");
        setWeekdays(existingTeacher.weekdays || []);
        setDefaultTime(existingTeacher.defaultTime || "16:00");
        setDefaultDurationMin(existingTeacher.defaultDurationMin?.toString() || "60");
        setDefaultSubjectId(existingTeacher.defaultSubjectId || existingTeacher.subjectIds?.[0] || "");
      } else {
        // Reset for new teacher
        setName("");
        setPhone("");
        setEmail("");
        setDailyRate("500");
        setSelectedSubjectIds(subjects.length > 0 ? [subjects[0].id] : []);
        const randIdx = Math.floor(Math.random() * TEACHER_PALETTE.length);
        setColor(TEACHER_PALETTE[randIdx]);
        setFreeClassColor(TEACHER_FREE_PALETTE[randIdx]);
        setPolicyType("AFTER_N_CLASSES");
        setCycleSize("4");
        setAdvanceBalance("0");
        setWeekdays([1, 3, 5]); // default Mon, Wed, Fri
        setDefaultTime("16:00");
        setDefaultDurationMin("60");
        setDefaultSubjectId(subjects[0]?.id || "");
      }
      setNewSubjectInput("");
      setIsCreatingSubject(false);
    }
  }, [isOpen, existingTeacher, subjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRate = Math.max(0, parseFloat(dailyRate) || 0);

    onSave({
      id: existingTeacher?.id,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourlyRate: parsedRate,
      dailyRate: parsedRate,
      subjectIds: selectedSubjectIds,
      color,
      freeClassColor,
      paymentPolicy: {
        type: policyType,
        cycleSize: Math.max(1, parseInt(cycleSize, 10) || 1),
        advanceBalance: Math.max(0, parseFloat(advanceBalance) || 0),
        isDelayed: existingTeacher?.paymentPolicy?.isDelayed || false,
        delayedUntil: existingTeacher?.paymentPolicy?.delayedUntil,
        delayReason: existingTeacher?.paymentPolicy?.delayReason,
      },
      weekdays,
      defaultTime,
      defaultDurationMin: parseInt(defaultDurationMin, 10) || 60,
      defaultSubjectId: defaultSubjectId || selectedSubjectIds[0] || undefined,
    });
    onClose();
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleCreateSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubjectInput.trim()) return;
    if (onQuickAddSubject) {
      onQuickAddSubject(newSubjectInput.trim());
    }
    setNewSubjectInput("");
    setIsCreatingSubject(false);
  };

  const ratePresets = [300, 400, 500, 600, 800, 1000];
  const cyclePresets = [2, 4, 6, 8, 12];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-xl shadow-2xl text-zinc-900 dark:text-zinc-100 my-8 transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Title & Tabs */}
        <div className="px-6 pt-5 pb-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-1.5 shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold z-10 shadow-2xs border-2 border-white dark:border-zinc-900"
                  style={{ backgroundColor: color }}
                  title={`Paid Class Color: ${color}`}
                >
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : "T"}
                </div>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-900 text-[10px] font-bold shadow-2xs border-2 border-white dark:border-zinc-900"
                  style={{ backgroundColor: freeClassColor }}
                  title={`Free Class Color: ${freeClassColor}`}
                >
                  F
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {existingTeacher ? `Edit: ${existingTeacher.name}` : "Add New Teacher"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {existingTeacher ? "Update profile details, dual class colors, and settlement policy" : "Register a private tutor with dual class colors, daily rate, and payment rules"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex gap-4 sm:gap-6 text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`pb-3 border-b-2 transition-colors cursor-pointer shrink-0 ${activeTab === "info"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
            >
              1. Profile & Rate
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("policy")}
              className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${activeTab === "policy"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
            >
              2. Payment Terms
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("routine")}
              className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${activeTab === "routine"
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
            >
              3. Scheduled Weekdays
              {weekdays.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
                  {weekdays.length}d/wk
                </span>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {/* TAB 1: Profile & Daily Rate */}
          {activeTab === "info" && (
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Teacher Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Dr. Paul Robinson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                />
              </div>

              {/* Rate Per Day with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Rate Per Day / Session (৳) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Amount charged per class day
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs  text-zinc-400">৳</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      placeholder="500"
                      value={dailyRate}
                      onChange={e => setDailyRate(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100  text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-1">Quick presets:</span>
                  {ratePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDailyRate(preset.toString())}
                      className={`px-2 py-0.5 text-[11px]  border transition-colors cursor-pointer ${dailyRate === preset.toString()
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                      ৳{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 "
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="teacher@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Teacher Dual Color Swatches (Paid Class & Free Class) */}
              <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Teacher Class Colors
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Every teacher has 2 distinct colors on calendar rings: Default Paid Class & Free Class
                    </span>
                  </div>
                </div>

                {/* Color 1: Default Paid Class Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      Default Paid Class Color
                    </label>
                    <span className="text-[11px] font-mono text-zinc-400">{color}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TEACHER_PALETTE.map((palColor, idx) => (
                      <button
                        type="button"
                        key={palColor}
                        onClick={() => {
                          setColor(palColor);
                          if (TEACHER_FREE_PALETTE[idx]) {
                            setFreeClassColor(TEACHER_FREE_PALETTE[idx]);
                          }
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          color === palColor
                            ? "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 scale-110"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: palColor }}
                        title={`Select Paid Color: ${palColor}`}
                      >
                        {color === palColor && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 p-0 cursor-pointer bg-transparent"
                        title="Custom Paid Color"
                      />
                    </div>
                  </div>
                </div>

                {/* Color 2: Free Class Color */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: freeClassColor }} />
                      Free / Complimentary Class Color
                    </label>
                    <span className="text-[11px] font-mono text-zinc-400">{freeClassColor}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TEACHER_FREE_PALETTE.map((palColor) => (
                      <button
                        type="button"
                        key={palColor}
                        onClick={() => setFreeClassColor(palColor)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          freeClassColor === palColor
                            ? "ring-2 ring-emerald-600 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-zinc-900 scale-110"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: palColor }}
                        title={`Select Free Class Color: ${palColor}`}
                      >
                        {freeClassColor === palColor && (
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 shadow-xs" />
                        )}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="color"
                        value={freeClassColor}
                        onChange={e => setFreeClassColor(e.target.value)}
                        className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 p-0 cursor-pointer bg-transparent"
                        title="Custom Free Color"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Subjects */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Subjects Taught
                  </label>
                  {!isCreatingSubject && onQuickAddSubject && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingSubject(true)}
                      className="text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
                    >
                      + New Subject
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {subjects.map(sub => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => toggleSubject(sub.id)}
                        className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-950"
                          }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color || "#888" }}
                        />
                        {sub.name}
                      </button>
                    );
                  })}
                  {subjects.length === 0 && (
                    <span className="text-xs text-zinc-400 italic">No subjects registered yet.</span>
                  )}
                </div>

                {/* Inline Subject Creation */}
                {isCreatingSubject && (
                  <div className="mt-2.5 flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <input
                      type="text"
                      placeholder="Subject name (e.g. Higher Math, Biology)"
                      value={newSubjectInput}
                      onChange={e => setNewSubjectInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreateSubject(e); }}
                      className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateSubject()}
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsCreatingSubject(false); setNewSubjectInput(""); }}
                      className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Payment Policy */}
          {activeTab === "policy" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-2">
                  Select Settlement Rule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Pay after N classes */}
                  <button
                    type="button"
                    onClick={() => setPolicyType("AFTER_N_CLASSES")}
                    className={`p-3 text-left border transition-all cursor-pointer ${policyType === "AFTER_N_CLASSES"
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 shadow-2xs ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
                      }`}
                  >
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1">
                      Pay After N Classes
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Most popular. Pay the teacher after every batch of classes (e.g. 4 or 8 classes).
                    </p>
                  </button>

                  {/* Option 2: Prepay in Advance */}
                  <button
                    type="button"
                    onClick={() => setPolicyType("ADVANCE_CYCLE")}
                    className={`p-3 text-left border transition-all cursor-pointer ${policyType === "ADVANCE_CYCLE"
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 shadow-2xs ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
                      }`}
                  >
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1">
                      Pay in Advance
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Upfront prepayment. Classes automatically deduct from available credit.
                    </p>
                  </button>

                  {/* Option 3: Pay Per Class */}
                  <button
                    type="button"
                    onClick={() => setPolicyType("PER_CLASS")}
                    className={`p-3 text-left border transition-all cursor-pointer ${policyType === "PER_CLASS"
                        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 shadow-2xs ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
                      }`}
                  >
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1">
                      Pay Per Class
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Settle individually right after each class session finishes.
                    </p>
                  </button>
                </div>
              </div>

              {/* Policy Specific Config */}
              {policyType === "AFTER_N_CLASSES" && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Settlement Threshold (Number of Classes)
                    </label>
                    <span className=" text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Every {cycleSize} classes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={cycleSize}
                      onChange={e => setCycleSize(e.target.value)}
                      className="w-24 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5  text-sm focus:outline-none focus:border-zinc-900"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {cyclePresets.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCycleSize(preset.toString())}
                          className={`px-2 py-1 text-xs  border transition-colors cursor-pointer ${cycleSize === preset.toString()
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                              : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                            }`}
                        >
                          {preset} classes
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    An alert will appear when {cycleSize} classes are completed without payment (estimated batch total: ৳{((parseFloat(dailyRate) || 0) * (parseInt(cycleSize, 10) || 1)).toFixed(2)}).
                  </p>
                </div>
              )}

              {policyType === "ADVANCE_CYCLE" && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block mb-1">
                        Prepaid Cycle Size (Classes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={cycleSize}
                        onChange={e => setCycleSize(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5  text-sm focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block mb-1">
                        Starting Advance Credit (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={advanceBalance}
                        onChange={e => setAdvanceBalance(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5  text-sm focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Each class completed with this teacher automatically consumes credit from the advance balance until depleted.
                  </p>
                </div>
              )}

              {policyType === "PER_CLASS" && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                  <p>
                    Each class fee (৳{dailyRate || "0"}) becomes immediately due upon completion and can be settled individually with a single click.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Scheduled Weekdays & Routine */}
          {activeTab === "routine" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Active Teaching Weekdays
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                  Classes on these weekdays will automatically appear scheduled on the calendar.
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {[
                    { label: "Sun", day: 0 },
                    { label: "Mon", day: 1 },
                    { label: "Tue", day: 2 },
                    { label: "Wed", day: 3 },
                    { label: "Thu", day: 4 },
                    { label: "Fri", day: 5 },
                    { label: "Sat", day: 6 },
                  ].map(w => {
                    const isSelected = weekdays.includes(w.day);
                    return (
                      <button
                        key={w.day}
                        type="button"
                        onClick={() => {
                          setWeekdays(prev =>
                            prev.includes(w.day) ? prev.filter(d => d !== w.day) : [...prev, w.day]
                          );
                        }}
                        className={`py-2 text-xs font-medium border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs"
                            : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Default Class Time
                </label>
                <input
                  type="time"
                  value={defaultTime}
                  onChange={e => setDefaultTime(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Default Routine Subject
                </label>
                <select
                  value={defaultSubjectId}
                  onChange={e => setDefaultSubjectId(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
                >
                  {subjects
                    .filter(s => selectedSubjectIds.length === 0 || selectedSubjectIds.includes(s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              {/* Immutable past notice */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  Automatic Progression & Historical Protection
                </div>
                <p>• Weekday classes are automatically scheduled ahead on your calendar.</p>
                <p>• When each scheduled day passes, the class automatically marks as completed.</p>
                <p className="text-zinc-900 dark:text-zinc-200 font-medium">
                  • Changing weekdays here updates only upcoming schedules. Already completed classes remain completely intact and unaffected.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {activeTab === "info" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("policy")}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
                >
                  Payment Terms →
                </button>
              )}
              {activeTab === "policy" && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("info")}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
                  >
                    ← Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("routine")}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
                  >
                    Set Weekdays →
                  </button>
                </>
              )}
              {activeTab === "routine" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("policy")}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
                >
                  ← Payment Terms
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
              >
                {existingTeacher ? "Update Teacher Profile" : "Add Teacher"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. SCHEDULE / CREATE CLASS MODAL
// -------------------------------------------------------------
export interface ScheduleClassModalProps extends ModalProps {
  teachers: Teacher[];
  subjects: Subject[];
  initialDate?: string;
  onSave: (sessionData: Partial<ClassSession>) => void;
}

export function ScheduleClassModal({ isOpen, onClose, teachers, subjects, initialDate, onSave }: ScheduleClassModalProps) {
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [date, setDate] = useState(() => (initialDate && typeof initialDate === 'string' && initialDate.length === 10) ? initialDate : new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("16:00");
  const [status, setStatus] = useState<ClassStatus>("SCHEDULED");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [customFee, setCustomFee] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isExtra, setIsExtra] = useState(false);
  const [attendance, setAttendance] = useState<"PRESENT" | "ABSENT">("PRESENT");

  // Sync defaults when modal opens or initialDate/teachers change
  useEffect(() => {
    if (isOpen) {
      if (initialDate && typeof initialDate === 'string' && initialDate.length === 10) {
        setDate(initialDate);
      } else {
        setDate(new Date().toISOString().split("T")[0]);
      }
      const activeTeacher = teachers.find(t => t.id === teacherId) || teachers[0];
      if (activeTeacher) {
        setTeacherId(activeTeacher.id);
        if (activeTeacher.defaultTime) {
          setTime(activeTeacher.defaultTime);
        }
        const availSubs = activeTeacher.subjectIds?.length 
          ? subjects.filter(s => activeTeacher.subjectIds.includes(s.id)) 
          : subjects;
        if (activeTeacher.defaultSubjectId && availSubs.some(s => s.id === activeTeacher.defaultSubjectId)) {
          setSubjectId(activeTeacher.defaultSubjectId);
        } else if (availSubs.length > 0) {
          setSubjectId(availSubs[0].id);
        }
      }
      setIsFree(false);
      setIsExtra(false);
      setAttendance("PRESENT");
      setStatus("SCHEDULED");
      setPaymentStatus("UNPAID");
      setCustomFee("");
    }
  }, [isOpen, initialDate, teachers, subjects]);

  if (!isOpen) return null;

  const currentTeacher = teachers.find(t => t.id === teacherId);
  // Show ONLY this teacher's subjects
  const teacherSubjects = currentTeacher?.subjectIds?.length
    ? subjects.filter(s => currentTeacher.subjectIds.includes(s.id))
    : subjects;

  const defaultRate = currentTeacher ? Number(currentTeacher.dailyRate ?? currentTeacher.hourlyRate ?? 500) : 500;
  const isAbsent = attendance === "ABSENT";
  const calculatedFee = isAbsent || isFree ? 0 : (customFee !== "" ? parseFloat(customFee) : defaultRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !subjectId) return;

    const scheduledAt = `${date}T${time}:00`;
    const hasAdvance = currentTeacher?.paymentPolicy?.type === "ADVANCE_CYCLE" && (currentTeacher?.paymentPolicy?.advanceBalance || 0) >= calculatedFee;

    let sessionStatus: ClassStatus = status;
    let finalPayStatus: PaymentStatus = paymentStatus;

    if (isAbsent) {
      sessionStatus = "TEACHER_ABSENT";
      finalPayStatus = "WAIVED";
    } else if (isFree) {
      finalPayStatus = "FREE";
    } else if (status === "COMPLETED" && paymentStatus === "UNPAID" && hasAdvance) {
      finalPayStatus = "COVERED_BY_ADVANCE";
    }

    onSave({
      teacherId,
      subjectId,
      scheduledAt,
      durationMin: 60,
      fee: isFree || isAbsent ? 0 : (calculatedFee || 0),
      isFree,
      isExtra,
      attendance,
      status: sessionStatus,
      paymentStatus: finalPayStatus,
      notes: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-md shadow-xl text-zinc-900 dark:text-zinc-100 my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Schedule Class Session</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Routine, extra, or free trial tutoring session</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Teacher Selection */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Teacher</label>
            <select
              value={teacherId}
              onChange={e => {
                const newTId = e.target.value;
                setTeacherId(newTId);
                const t = teachers.find(item => item.id === newTId);
                if (t?.defaultTime) {
                  setTime(t.defaultTime);
                }
                const avail = t?.subjectIds?.length ? subjects.filter(s => t.subjectIds.includes(s.id)) : subjects;
                if (t?.defaultSubjectId && avail.some(s => s.id === t.defaultSubjectId)) {
                  setSubjectId(t.defaultSubjectId);
                } else if (avail.length > 0) {
                  setSubjectId(avail[0].id);
                }
              }}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} (৳{t.dailyRate ?? t.hourlyRate}/day)</option>
              ))}
            </select>
          </div>

          {/* Subject Selection - STRICTLY shows only his subjects */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Subject (Taught by {currentTeacher?.name || "Teacher"})
              </label>
              {currentTeacher?.subjectIds?.length === 0 && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">All subjects shown</span>
              )}
            </div>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              {teacherSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Start Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 font-mono"
              />
            </div>
          </div>

          {/* Class Lifecycle Status: Scheduled vs Already Completed */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Class Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus("SCHEDULED");
                  setPaymentStatus("UNPAID");
                }}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  status === "SCHEDULED"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                }`}
              >
                📅 Upcoming / Scheduled
              </button>
              <button
                type="button"
                onClick={() => setStatus("COMPLETED")}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  status === "COMPLETED"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                }`}
              >
                ✓ Already Completed
              </button>
            </div>
          </div>

          {/* If already completed, select settlement / payment status */}
          {status === "COMPLETED" && !isFree && attendance === "PRESENT" && (
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                Completed Class Settlement Status
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              >
                <option value="UNPAID">Unpaid (Add to teacher's cycle / pending balance)</option>
                <option value="PAID">Paid in Full (Already settled)</option>
                <option value="COVERED_BY_ADVANCE">Covered by Prepaid Advance</option>
              </select>
            </div>
          )}

          {/* Teacher Attendance State */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Teacher Attendance Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAttendance("PRESENT")}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  attendance === "PRESENT"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                ✓ Present (Default)
              </button>
              <button
                type="button"
                onClick={() => setAttendance("ABSENT")}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  attendance === "ABSENT"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                ✕ Teacher Absent (No Fee)
              </button>
            </div>
          </div>

          {/* Extra Class Toggle Card */}
          <div className={`p-3 border transition-colors ${
            isExtra 
              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Extra / Special Class</span>
                  {isExtra && (
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                      EXTRA CLASS
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Additional tutoring session outside normal weekdays routine.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isExtra}
                onChange={e => setIsExtra(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Free Class Toggle Card */}
          <div className={`p-3 border transition-colors ${
            isFree 
              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Complimentary / Free Class</span>
                  {isFree && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                      ৳0.00 FREE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Trial, bonus, or complimentary session with no fee charged.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isFree}
                disabled={isAbsent}
                onChange={e => setIsFree(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Fee Input */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Fee (৳) {isAbsent ? "(Absent: ৳0)" : isFree ? "(Free)" : "(Per Day)"}
            </label>
            <input
              type="number"
              step="1"
              min="0"
              disabled={isFree || isAbsent}
              placeholder={isFree || isAbsent ? "0.00" : defaultRate.toString()}
              value={isFree || isAbsent ? "0" : customFee}
              onChange={e => setCustomFee(e.target.value)}
              className={`w-full border px-3 py-2 font-mono text-sm focus:outline-none ${
                isFree || isAbsent
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 cursor-not-allowed" 
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-400"
              }`}
            />
          </div>

          {currentTeacher?.paymentPolicy?.type === "ADVANCE_CYCLE" && !isFree && !isAbsent && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              Teacher has <span className="font-semibold text-zinc-900 dark:text-zinc-100">৳{currentTeacher.paymentPolicy.advanceBalance.toFixed(2)}</span> prepaid advance credit.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Confirm Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. EDIT CLASS SESSION MODAL (Edit literally everything from Calendar)
// -------------------------------------------------------------
export interface EditClassSessionModalProps extends ModalProps {
  session: ClassSession | null;
  teachers: Teacher[];
  subjects: Subject[];
  onSave: (updatedSession: ClassSession) => void;
  onDelete?: (sessionId: string) => void;
}

export function EditClassSessionModal({
  isOpen,
  onClose,
  session,
  teachers,
  subjects,
  onSave,
  onDelete
}: EditClassSessionModalProps) {
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [fee, setFee] = useState("500");
  const [status, setStatus] = useState<ClassStatus>("SCHEDULED");
  const [attendance, setAttendance] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [isFree, setIsFree] = useState(false);
  const [isExtra, setIsExtra] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");

  useEffect(() => {
    if (isOpen && session) {
      setTeacherId(session.teacherId);
      setSubjectId(session.subjectId);
      const [d, t] = session.scheduledAt.split("T");
      setDate(d || new Date().toISOString().split("T")[0]);
      setTime(t?.slice(0, 5) || "16:00");
      setFee(session.fee?.toString() || "0");
      setStatus(session.status);
      setAttendance(session.attendance || (session.status === "TEACHER_ABSENT" ? "ABSENT" : "PRESENT"));
      setIsFree(Boolean(session.isFree || session.paymentStatus === "FREE"));
      setIsExtra(Boolean(session.isExtra));
      setPaymentStatus(session.paymentStatus);
    }
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const currentTeacher = teachers.find(t => t.id === teacherId);
  // Show only this teacher's subjects
  const teacherSubjects = currentTeacher?.subjectIds?.length
    ? subjects.filter(s => currentTeacher.subjectIds.includes(s.id))
    : subjects;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !subjectId) return;

    const scheduledAt = `${date}T${time}:00`;
    const numFee = isFree || attendance === "ABSENT" ? 0 : (parseFloat(fee) || 0);

    let finalStatus = status;
    let finalPayStatus = paymentStatus;

    if (attendance === "ABSENT") {
      finalStatus = "TEACHER_ABSENT";
      finalPayStatus = "WAIVED";
    } else if (isFree) {
      finalPayStatus = "FREE";
    }

    const updated: ClassSession = {
      ...session,
      teacherId,
      subjectId,
      scheduledAt,
      durationMin: session.durationMin || 60,
      fee: numFee,
      isFree,
      isExtra,
      attendance,
      status: finalStatus,
      paymentStatus: finalPayStatus,
    };

    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to permanently delete this class session?")) {
      if (onDelete) onDelete(session.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-lg shadow-2xl text-zinc-900 dark:text-zinc-100 my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit Class Session</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Modify schedule, teacher, attendance, status or fee</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Teacher Selection */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Teacher</label>
            <select
              value={teacherId}
              onChange={e => {
                const newTId = e.target.value;
                setTeacherId(newTId);
                const t = teachers.find(item => item.id === newTId);
                const avail = t?.subjectIds?.length ? subjects.filter(s => t.subjectIds.includes(s.id)) : subjects;
                if (avail.length > 0 && !avail.some(s => s.id === subjectId)) {
                  setSubjectId(avail[0].id);
                }
              }}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Subject Selection - Only his subjects */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Subject ({currentTeacher?.name}&apos;s Subjects)
            </label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
            >
              {teacherSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Start Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>
          </div>

          {/* Attendance Toggle: Present vs Absent */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Teacher Attendance
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttendance("PRESENT");
                  if (status === "TEACHER_ABSENT") setStatus("COMPLETED");
                }}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  attendance === "PRESENT"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                ✓ Teacher Present
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendance("ABSENT");
                  setStatus("TEACHER_ABSENT");
                  setFee("0");
                  setPaymentStatus("WAIVED");
                }}
                className={`py-2 px-3 text-xs font-medium border text-center transition-all cursor-pointer ${
                  attendance === "ABSENT"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                ✕ Teacher Absent (No Fee)
              </button>
            </div>
          </div>

          {/* Session Progress Status & Payment Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Class Status</label>
              <select
                value={status}
                onChange={e => {
                  const s = e.target.value as ClassStatus;
                  setStatus(s);
                  if (s === "TEACHER_ABSENT") {
                    setAttendance("ABSENT");
                    setFee("0");
                  } else {
                    setAttendance("PRESENT");
                  }
                }}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
              >
                <option value="SCHEDULED">Scheduled (Upcoming)</option>
                <option value="COMPLETED">Completed (Class Held)</option>
                <option value="TEACHER_ABSENT">Teacher Absent</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RESCHEDULED">Rescheduled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
              >
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="COVERED_BY_ADVANCE">Covered by Advance</option>
                <option value="FREE">Free of Charge</option>
                <option value="WAIVED">Waived</option>
              </select>
            </div>
          </div>

          {/* Toggles: Extra Class & Free Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Extra Class Toggle */}
            <div className={`p-2.5 border transition-colors ${
              isExtra 
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30' 
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40'
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">Extra Class</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Bonus / unscheduled</span>
                </div>
                <input
                  type="checkbox"
                  checked={isExtra}
                  onChange={e => setIsExtra(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Free Class Toggle */}
            <div className={`p-2.5 border transition-colors ${
              isFree 
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30' 
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40'
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">Free / Trial</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">৳0.00 fee</span>
                </div>
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsFree(checked);
                    if (checked) {
                      setFee("0");
                      setPaymentStatus("FREE");
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Fee Input */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Fee Amount (৳)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              disabled={isFree || attendance === "ABSENT"}
              value={fee}
              onChange={e => setFee(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 font-mono text-sm focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-800 disabled:text-zinc-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                Delete Class
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. RECORD PAYMENT / CYCLE SETTLEMENT / ADVANCE DEPOSIT MODAL
// -------------------------------------------------------------
interface RecordPaymentModalProps extends ModalProps {
  teachers: Teacher[];
  preselectedTeacherId?: string;
  unpaidSessionsByTeacher: Record<string, ClassSession[]>;
  onRecordPayment: (payment: {
    teacherId: string;
    sessionIds: string[];
    type: 'PER_CLASS' | 'CYCLE_SETTLEMENT' | 'ADVANCE_DEPOSIT';
    amount: number;
    method: string;
    reference?: string;
    note?: string;
    paidAt?: string;
  }) => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  teachers,
  preselectedTeacherId,
  unpaidSessionsByTeacher,
  onRecordPayment
}: RecordPaymentModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(preselectedTeacherId || teachers[0]?.id || "");
  const [paymentType, setPaymentType] = useState<'CYCLE_SETTLEMENT' | 'ADVANCE_DEPOSIT' | 'CUSTOM'>('CYCLE_SETTLEMENT');
  const [paidAtDate, setPaidAtDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const teacherUnpaidSessions = unpaidSessionsByTeacher[selectedTeacherId] || [];

  useEffect(() => {
    setSelectedSessionIds(teacherUnpaidSessions.map(s => s.id));
  }, [selectedTeacherId, teacherUnpaidSessions.length]);

  if (!isOpen) return null;

  const currentTeacher = teachers.find(t => t.id === selectedTeacherId);
  const selectedSessions = teacherUnpaidSessions.filter(s => selectedSessionIds.includes(s.id));
  const selectedTotalAmount = selectedSessions.reduce((acc, curr) => acc + curr.fee, 0);

  const suggestedAmount = paymentType === 'CYCLE_SETTLEMENT'
    ? selectedTotalAmount
    : paymentType === 'ADVANCE_DEPOSIT'
      ? ((currentTeacher?.dailyRate ?? currentTeacher?.hourlyRate ?? 500) * (currentTeacher?.paymentPolicy?.cycleSize || 4))
      : parseFloat(customAmount) || 0;

  const finalAmount = customAmount ? parseFloat(customAmount) : suggestedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || finalAmount <= 0) return;

    const originalTime = new Date().toTimeString().slice(0, 8);
    const resolvedPaidAt = paidAtDate ? `${paidAtDate}T${originalTime}` : new Date().toISOString();

    onRecordPayment({
      teacherId: selectedTeacherId,
      sessionIds: paymentType === 'CYCLE_SETTLEMENT' ? selectedSessionIds : [],
      type: paymentType === 'ADVANCE_DEPOSIT' ? 'ADVANCE_DEPOSIT' : 'CYCLE_SETTLEMENT',
      amount: finalAmount,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
      paidAt: resolvedPaidAt,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-lg shadow-xl text-zinc-900 dark:text-zinc-100 my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Record Payment</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Settle classes, log historical payments, or deposit advance credit</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Teacher</label>
            <select
              value={selectedTeacherId}
              onChange={e => {
                setSelectedTeacherId(e.target.value);
                setCustomAmount("");
              }}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
              Payment Intention
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentType('CYCLE_SETTLEMENT');
                  setCustomAmount("");
                }}
                className={`p-2.5 text-left border text-xs transition-colors cursor-pointer ${paymentType === 'CYCLE_SETTLEMENT'
                    ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
              >
                <div className="font-semibold text-xs">Settle Classes</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {teacherUnpaidSessions.length} pending
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('ADVANCE_DEPOSIT');
                  setCustomAmount("");
                }}
                className={`p-2.5 text-left border text-xs transition-colors cursor-pointer ${paymentType === 'ADVANCE_DEPOSIT'
                    ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
              >
                <div className="font-semibold text-xs">Add Advance</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Deposit credit
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('CUSTOM');
                  setCustomAmount("");
                }}
                className={`p-2.5 text-left border text-xs transition-colors cursor-pointer ${paymentType === 'CUSTOM'
                    ? "border-zinc-900 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
              >
                <div className="font-semibold text-xs">Direct History</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Standalone entry
                </div>
              </button>
            </div>
          </div>

          {paymentType === 'CYCLE_SETTLEMENT' && (
            <div>
              {teacherUnpaidSessions.length > 0 ? (
                <div className="space-y-1.5 border border-zinc-200 dark:border-zinc-800 p-2.5 max-h-40 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <span>Select Classes to Settle ({selectedSessionIds.length}/{teacherUnpaidSessions.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSessionIds.length === teacherUnpaidSessions.length) {
                          setSelectedSessionIds([]);
                        } else {
                          setSelectedSessionIds(teacherUnpaidSessions.map(s => s.id));
                        }
                      }}
                      className="text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
                    >
                      {selectedSessionIds.length === teacherUnpaidSessions.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {teacherUnpaidSessions.map(s => {
                    const isSelected = selectedSessionIds.includes(s.id);
                    const sessionDate = new Date(s.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <label key={s.id} className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer rounded">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedSessionIds(prev =>
                                prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                          />
                          <span>{sessionDate} - ৳{s.fee.toFixed(2)}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 capitalize">{s.status.toLowerCase()}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                  All classes for this teacher are currently marked as paid. You can record advance funds or an unlinked payment history entry above.
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={suggestedAmount.toFixed(2)}
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                {customAmount ? "Custom amount" : `Default: ৳${suggestedAmount.toFixed(2)}`}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paidAtDate}
                onChange={e => setPaidAtDate(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Payment Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              >
                <option>Bank Transfer</option>
                <option>bKash / Mobile Wallet</option>
                <option>Cash</option>
                <option>Card / PayPal</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Transaction Reference</label>
              <input
                type="text"
                placeholder="e.g. TXN-998234 or receipt #"
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid for Calculus classes"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Confirm ৳{finalAmount.toFixed(2)} Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3.5. EDIT PAYMENT MODAL
// -------------------------------------------------------------
interface EditPaymentModalProps extends ModalProps {
  payment: PaymentRecord | null;
  teachers: Teacher[];
  onSave: (updatedPayment: PaymentRecord) => void;
  onDelete?: (paymentId: string) => void;
}

export function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  teachers,
  onSave,
  onDelete
}: EditPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paidAtDate, setPaidAtDate] = useState("");
  const [method, setMethod] = useState("Cash");
  const [type, setType] = useState<PaymentRecord["type"]>("CYCLE_SETTLEMENT");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen && payment) {
      setAmount(payment.amount.toString());
      setPaidAtDate(payment.paidAt ? payment.paidAt.split("T")[0] : new Date().toISOString().split("T")[0]);
      setMethod(payment.method || "Cash");
      setType(payment.type || "CYCLE_SETTLEMENT");
      setReference(payment.reference || "");
      setNote(payment.note || "");
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const currentTeacher = teachers.find(t => t.id === payment.teacherId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    let finalPaidAt = payment.paidAt;
    if (paidAtDate) {
      const originalTime = payment.paidAt && payment.paidAt.includes("T")
        ? payment.paidAt.split("T")[1]
        : "12:00:00";
      finalPaidAt = `${paidAtDate}T${originalTime}`;
    }

    onSave({
      ...payment,
      amount: parsedAmount,
      paidAt: finalPaidAt,
      method,
      type,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to permanently delete this payment of ৳${payment.amount.toFixed(2)}? Any linked classes will revert to unpaid and advance credits will be updated.`)) {
      if (onDelete) onDelete(payment.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-lg shadow-xl text-zinc-900 dark:text-zinc-100 my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Edit Payment Record</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Modify settlement amounts, payment dates, or payment details</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Recipient Teacher Info */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-semibold">
                Recipient Teacher
              </span>
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {currentTeacher?.name || "Teacher"}
              </span>
            </div>
            {payment.sessionIds?.length > 0 && (
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                Covers {payment.sessionIds.length} classes
              </span>
            )}
          </div>

          {/* Payment Type */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Payment Category
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as PaymentRecord["type"])}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              <option value="CYCLE_SETTLEMENT">Cycle Settlement (Settles regular classes)</option>
              <option value="ADVANCE_DEPOSIT">Advance Deposit (Prepaid tutor balance)</option>
              <option value="SINGLE_CLASS">Single Class Payment</option>
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                Amount (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 font-mono text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paidAtDate}
                onChange={e => setPaidAtDate(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Payment Method
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              <option value="Cash">Cash in Hand</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank Transfer">Bank Transfer (EFT/NPSB)</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Reference / TrxID */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Transaction ID / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TrxID BK9928192 or Bank slip #4819"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Internal Note / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Settle February classes batch, bonus included..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          {/* Bottom Actions: Delete on Left, Cancel/Save on Right */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                title="Delete this payment record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Payment
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. DELAY PAYMENT MODAL (Snooze / Scheduled Deferred Settlement)
// -------------------------------------------------------------
interface DelayPaymentModalProps extends ModalProps {
  teacher: Teacher | null;
  onConfirmDelay: (teacherId: string, delayedUntil: string, reason: string) => void;
  onClearDelay: (teacherId: string) => void;
}

export function DelayPaymentModal({ isOpen, onClose, teacher, onConfirmDelay, onClearDelay }: DelayPaymentModalProps) {
  const [delayedUntil, setDelayedUntil] = useState(
    teacher?.paymentPolicy?.delayedUntil ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [reason, setReason] = useState(teacher?.paymentPolicy?.delayReason || "");

  if (!isOpen || !teacher) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmDelay(teacher.id, delayedUntil, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-md shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Delay Settlement with {teacher.name}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Record a deferral date so it is not treated as overdue</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Defer Until Date *</label>
            <input
              type="date"
              required
              value={delayedUntil}
              onChange={e => setDelayedUntil(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 "
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Reason for Delay (Human Note)</label>
            <textarea
              rows={3}
              placeholder="e.g. Teacher requested payment combined with next month, or waiting for salary on Oct 5"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {teacher.paymentPolicy.isDelayed ? (
              <button
                type="button"
                onClick={() => {
                  onClearDelay(teacher.id);
                  onClose();
                }}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Remove Delay
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
              >
                Confirm Delay
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. ADD EVENT MODAL (Exams, Assignments, Holidays, Meetings)
// -------------------------------------------------------------
interface AddEventModalProps extends ModalProps {
  subjects: Subject[];
  onSave: (event: {
    title: string;
    description?: string;
    startAt: string;
    eventType: CalendarEventType;
    subjectId?: string;
  }) => void;
}

export function AddEventModal({ isOpen, onClose, subjects, onSave }: AddEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  const [eventType, setEventType] = useState<CalendarEventType>("EXAM");
  const [subjectId, setSubjectId] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      startAt: `${date}T${time}:00`,
      eventType,
      subjectId: subjectId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-md shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Add Calendar Event</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Record an exam, homework deadline, or holiday</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Event Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["EXAM", "ASSIGNMENT_DUE", "HOLIDAY", "PARENT_MEETING"] as const).map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setEventType(type)}
                  className={`py-1.5 text-center text-xs font-medium border transition-colors cursor-pointer ${eventType === type
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 bg-white dark:bg-zinc-950"
                    }`}
                >
                  {type === "ASSIGNMENT_DUE" ? "Assignment" : type === "PARENT_MEETING" ? "Meeting" : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Physics Midterm Exam or Problem Set Due"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 "
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 "
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Linked Subject (Optional)</label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            >
              <option value="">None / General</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Description / Location</label>
            <textarea
              rows={2}
              placeholder="e.g. Room 402, Chapters 1-5 covered"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-2.5 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. ADD SUBJECT MODAL
// -------------------------------------------------------------
interface AddSubjectModalProps extends ModalProps {
  onSave: (subjectData: { name: string; color: string; defaultDurationMin: number }) => void;
}

export function AddSubjectModal({ isOpen, onClose, onSave }: AddSubjectModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      color,
      defaultDurationMin: 60,
    });
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 w-full max-w-sm shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Add Academic Subject</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Create a dedicated course entity</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Linear Algebra, Physics"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 p-0.5 cursor-pointer bg-white dark:bg-zinc-950"
              />
              <span className=" text-xs text-zinc-600 dark:text-zinc-400">{color}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Save Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
