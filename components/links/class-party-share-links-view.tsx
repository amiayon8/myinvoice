"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Eye,
  Radio,
} from "lucide-react";

export interface ClassPartyShareLinkData {
  id: string;
  token: string;
  label: string | null;
  type: string;
  url: string;
  expiresAt: string | null;
  isExpired?: boolean;
  neverExpires: boolean;
  viewCount?: number;
  lastViewedAt?: string | null;
  showFinancials?: boolean;
  showContactInfo?: boolean;
  showHistory?: boolean;
}

interface ClassPartyShareLinksViewProps {
  initialLinks?: ClassPartyShareLinkData[];
  onCreateLink?: (newLink: {
    label: string;
    neverExpires: boolean;
    daysExpiry?: number;
    showFinancials: boolean;
    showContactInfo: boolean;
    showHistory: boolean;
  }) => Promise<void> | void;
  onEditLink?: (
    id: string,
    updates: Partial<ClassPartyShareLinkData>,
  ) => Promise<void> | void;
  onDeleteLink?: (id: string) => Promise<void> | void;
}

export function ClassPartyShareLinksView({
  initialLinks = [],
  onCreateLink,
  onEditLink,
  onDeleteLink,
}: ClassPartyShareLinksViewProps) {
  const [links, setLinks] = useState<ClassPartyShareLinkData[]>(initialLinks);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [label, setLabel] = useState("");
  const [daysExpiry, setDaysExpiry] = useState("30");
  const [neverExpires, setNeverExpires] = useState(true);
  const [showFinancials, setShowFinancials] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const [editingLink, setEditingLink] =
    useState<ClassPartyShareLinkData | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editNeverExpires, setEditNeverExpires] = useState(true);
  const [editShowFinancials, setEditShowFinancials] = useState(true);
  const [editShowContactInfo, setEditShowContactInfo] = useState(true);
  const [editShowHistory, setEditShowHistory] = useState(true);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    if (onCreateLink) {
      await onCreateLink({
        label: label.trim(),
        neverExpires,
        daysExpiry: neverExpires ? undefined : Number(daysExpiry),
        showFinancials,
        showContactInfo,
        showHistory,
      });
    }

    setLabel("");
    setNeverExpires(true);
    setDaysExpiry("30");
    setShowFinancials(true);
    setShowContactInfo(true);
    setShowHistory(true);
    setIsModalOpen(false);
  };

  const handleOpenEdit = (link: ClassPartyShareLinkData) => {
    setEditingLink(link);
    setEditLabel(link.label || "");
    setEditExpiresAt(link.expiresAt || "");
    setEditNeverExpires(link.neverExpires);
    setEditShowFinancials(link.showFinancials !== false);
    setEditShowContactInfo(link.showContactInfo !== false);
    setEditShowHistory(link.showHistory !== false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    const updates: Partial<ClassPartyShareLinkData> = {
      label: editLabel.trim(),
      neverExpires: editNeverExpires,
      expiresAt: editNeverExpires ? null : editExpiresAt || null,
      showFinancials: editShowFinancials,
      showContactInfo: editShowContactInfo,
      showHistory: editShowHistory,
    };

    if (onEditLink) {
      await onEditLink(editingLink.id, updates);
    }

    setLinks((prev) =>
      prev.map((l) => (l.id === editingLink.id ? { ...l, ...updates } : l)),
    );
    setEditingLink(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Class Party &apos;26 Shared Access Links
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
              Realtime Sync
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Public boards for attendee lists, reconciliation, and live status.
            All views are logged with browser and timestamp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Class Party Link
        </button>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
        {links.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No class party links created yet. Click above to generate a labeled
            share link.
          </div>
        ) : (
          links.map((link) => {
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {link.label || "General Attendance"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                      Class Party &apos;26
                    </span>
                    {link.isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
                        Expired
                      </span>
                    ) : link.neverExpires ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Permanent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Active until {link.expiresAt}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">
                      <Eye className="w-3.5 h-3.5" />
                      {link.viewCount || 0} views logged
                    </span>
                    {link.lastViewedAt && (
                      <span>
                        Last view:{" "}
                        {new Date(link.lastViewedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className=" text-[11px] text-zinc-400 truncate max-w-xs">
                      {link.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.id, link.url)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {isCopied ? "Copied" : "Copy"}
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                    title="Open Live Public Board"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(link)}
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                    title="Edit Link Configuration"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {onDeleteLink && (
                    <button
                      type="button"
                      onClick={() => onDeleteLink(link.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition cursor-pointer"
                      title="Revoke / Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Create Class Party Share Link
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Label
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Batch 2026, Ayon Group, General Invite"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={neverExpires}
                    onChange={(e) => setNeverExpires(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  Never expires
                </label>

                {!neverExpires && (
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Days Valid
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={daysExpiry}
                      onChange={(e) => setDaysExpiry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Viewer Permissions
                </span>
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFinancials}
                      onChange={(e) => setShowFinancials(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Total Collection & Financial Breakdown
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showContactInfo}
                      onChange={(e) => setShowContactInfo(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Contact Phone Numbers & Trx IDs
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHistory}
                      onChange={(e) => setShowHistory(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Live History & Activity Feed
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold shadow-xs"
                >
                  Generate Share Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Edit Share Link
              </h3>
              <button
                type="button"
                onClick={() => setEditingLink(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Label
                </label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editNeverExpires}
                    onChange={(e) => setEditNeverExpires(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  Never expires
                </label>

                {!editNeverExpires && (
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Viewer Permissions
                </span>
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editShowFinancials}
                      onChange={(e) => setEditShowFinancials(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Total Collection & Financial Breakdown
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editShowContactInfo}
                      onChange={(e) => setEditShowContactInfo(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Contact Phone Numbers & Trx IDs
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editShowHistory}
                      onChange={(e) => setEditShowHistory(e.target.checked)}
                      className="rounded text-violet-600"
                    />
                    Display Live History & Activity Feed
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
