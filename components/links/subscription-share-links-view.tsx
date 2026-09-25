"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

export interface SubscriptionShareLink {
  id: string;
  serviceName: string;
  planName?: string;
  occupiedSlots: number;
  totalSlots: number;
  url: string;
  expiresAt: string | null;
  isExpired?: boolean;
}

interface SubscriptionShareLinksViewProps {
  initialLinks?: SubscriptionShareLink[];
  onCreateLink?: (
    newLink: Omit<SubscriptionShareLink, "id">,
  ) => Promise<void> | void;
  onEditLink?: (
    id: string,
    updates: Partial<SubscriptionShareLink>,
  ) => Promise<void> | void;
  onDeleteLink?: (id: string) => Promise<void> | void;
}

const DEFAULT_SUBSCRIPTION_LINKS: SubscriptionShareLink[] = [
  {
    id: "sub-link-1",
    serviceName: "Netflix",
    planName: "Premium 4K",
    occupiedSlots: 2,
    totalSlots: 4,
    url: "https://myinvoice.app/subscriptions/share/nflx-fam-892",
    expiresAt: "2026-10-31",
    isExpired: false,
  },
  {
    id: "sub-link-2",
    serviceName: "Spotify",
    planName: "Family Plan",
    occupiedSlots: 5,
    totalSlots: 6,
    url: "https://myinvoice.app/subscriptions/share/sptf-grp-301",
    expiresAt: null,
    isExpired: false,
  },
  {
    id: "sub-link-3",
    serviceName: "YouTube Premium",
    planName: "Family",
    occupiedSlots: 5,
    totalSlots: 5,
    url: "https://myinvoice.app/subscriptions/share/yt-fam-771",
    expiresAt: "2026-09-01",
    isExpired: true,
  },
];

export function SubscriptionShareLinksView({
  initialLinks = DEFAULT_SUBSCRIPTION_LINKS,
  onCreateLink,
  onEditLink,
  onDeleteLink,
}: SubscriptionShareLinksViewProps) {
  const [links, setLinks] = useState<SubscriptionShareLink[]>(initialLinks);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [planName, setPlanName] = useState("");
  const [totalSlots, setTotalSlots] = useState("4");
  const [occupiedSlots, setOccupiedSlots] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [neverExpires, setNeverExpires] = useState(true);

  const [editingLink, setEditingLink] = useState<SubscriptionShareLink | null>(
    null,
  );
  const [editServiceName, setEditServiceName] = useState("");
  const [editPlanName, setEditPlanName] = useState("");
  const [editTotalSlots, setEditTotalSlots] = useState("4");
  const [editOccupiedSlots, setEditOccupiedSlots] = useState("1");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editNeverExpires, setEditNeverExpires] = useState(true);

  const handleOpenEdit = (link: SubscriptionShareLink) => {
    setEditingLink(link);
    setEditServiceName(link.serviceName);
    setEditPlanName(link.planName || "");
    setEditTotalSlots(link.totalSlots.toString());
    setEditOccupiedSlots(link.occupiedSlots.toString());
    setEditExpiresAt(link.expiresAt || "");
    setEditNeverExpires(!link.expiresAt);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    const updates: Partial<SubscriptionShareLink> = {
      serviceName: editServiceName.trim() || editingLink.serviceName,
      planName: editPlanName.trim() || undefined,
      totalSlots: Math.max(1, parseInt(editTotalSlots, 10) || 1),
      occupiedSlots: Math.max(0, parseInt(editOccupiedSlots, 10) || 0),
      expiresAt: editNeverExpires ? null : editExpiresAt || null,
      isExpired: editNeverExpires
        ? false
        : editExpiresAt
          ? new Date(editExpiresAt).getTime() < Date.now()
          : false,
    };

    if (onEditLink) {
      await onEditLink(editingLink.id, updates);
    }

    setLinks((prev) =>
      prev.map((l) => (l.id === editingLink.id ? { ...l, ...updates } : l)),
    );
    setEditingLink(null);
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    const token = Math.random().toString(36).substring(2, 9);
    const domain =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://myinvoice.app";
    const generatedUrl = `${domain}/subscriptions/share/${token}`;

    const newLinkData: SubscriptionShareLink = {
      id: `sub-link-${Date.now()}`,
      serviceName: serviceName.trim(),
      planName: planName.trim() || undefined,
      totalSlots: Math.max(1, parseInt(totalSlots, 10) || 1),
      occupiedSlots: Math.max(0, parseInt(occupiedSlots, 10) || 0),
      url: generatedUrl,
      expiresAt: neverExpires ? null : expiresAt || null,
      isExpired: false,
    };

    if (onCreateLink) {
      await onCreateLink(newLinkData);
    }

    setLinks((previous) => [newLinkData, ...previous]);
    setServiceName("");
    setPlanName("");
    setTotalSlots("4");
    setOccupiedSlots("1");
    setExpiresAt("");
    setNeverExpires(true);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (onDeleteLink) {
      await onDeleteLink(id);
    }
    setLinks((previous) => previous.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Subscription Share Links
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Public join links for shared plans and member seat allocation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Share Link
        </button>
      </div>

      {links.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
            No subscription share links
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            You have not created any shareable links for subscription groups
            yet.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Share Link
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                <th className="py-3 pr-4 font-normal">Service</th>
                <th className="py-3 px-4 font-normal">Shareable URL</th>
                <th className="py-3 px-4 font-normal">Expiry</th>
                <th className="py-3 pl-4 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
              {links.map((link) => {
                const availableSlots = Math.max(
                  0,
                  link.totalSlots - link.occupiedSlots,
                );
                const isFull = availableSlots === 0;
                const isExpired = Boolean(
                  link.isExpired ||
                  (link.expiresAt &&
                    new Date(link.expiresAt).getTime() < Date.now()),
                );

                return (
                  <tr
                    key={link.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {link.serviceName}
                        </span>
                        {link.planName && (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            {link.planName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className=" text-zinc-600 dark:text-zinc-400 truncate max-w-[220px]">
                          {link.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(link.id, link.url)}
                          title="Copy Link"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 ">
                      {isExpired ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          Expired
                        </span>
                      ) : link.expiresAt ? (
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {link.expiresAt}
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600">
                          Never
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 pl-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(link)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          title="Edit Link"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
            <h3 className="text-sm font-semibold tracking-tight">
              Create Subscription Share Link
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Generate a direct link to invite members to a subscription group.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Spotify"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Plan or Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Family 4K, Duo, Annual Group"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Total Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalSlots}
                    onChange={(e) => setTotalSlots(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Taken Slots
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={occupiedSlots}
                    onChange={(e) => setOccupiedSlots(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Link Expiration
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="neverExpires"
                      checked={neverExpires}
                      onChange={() => setNeverExpires(true)}
                      className="accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Never expires</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="neverExpires"
                      checked={!neverExpires}
                      onChange={() => setNeverExpires(false)}
                      className="accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Set date</span>
                  </label>
                </div>
                {!neverExpires && (
                  <input
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  Create Share Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold tracking-tight">
                Edit Subscription Share Link
              </h3>
              <button
                type="button"
                onClick={() => setEditingLink(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Service / Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Plan Tier (Optional)
                </label>
                <input
                  type="text"
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Total Slots
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editTotalSlots}
                    onChange={(e) => setEditTotalSlots(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Occupied Slots
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editOccupiedSlots}
                    onChange={(e) => setEditOccupiedSlots(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Link Expiration
                </label>
                <div className="flex items-center gap-4 mb-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editExpirationOption"
                      checked={editNeverExpires}
                      onChange={() => setEditNeverExpires(true)}
                      className="accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Never expires</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="editExpirationOption"
                      checked={!editNeverExpires}
                      onChange={() => setEditNeverExpires(false)}
                      className="accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span>Set date</span>
                  </label>
                </div>
                {!editNeverExpires && (
                  <input
                    type="date"
                    required
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent border border-zinc-300 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 "
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
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
