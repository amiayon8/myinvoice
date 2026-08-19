"use client";

import React from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      Icon: Trash2,
    },
    warning: {
      bg: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      Icon: AlertTriangle,
    },
    info: {
      bg: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20",
      iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      Icon: Info,
    },
  }[variant];

  const IconComp = variantStyles.Icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in text-slate-800 dark:text-slate-100">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${variantStyles.iconBg}`}>
            <IconComp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${variantStyles.bg}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
