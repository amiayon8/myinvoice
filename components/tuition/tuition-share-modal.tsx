"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  Share2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  Calendar,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Teacher, Subject, TuitionShareLink, TuitionShareType } from "@/types/tuition";
import {
  getTuitionShareLinks,
  createTuitionShareLink,
  revokeTuitionShareLink,
} from "@/lib/tuition-service";

interface TuitionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  subjects: Subject[];
}

export default function TuitionShareModal({
  isOpen,
  onClose,
  teachers,
  subjects,
}: TuitionShareModalProps) {
  const [shareLinks, setShareLinks] = useState<TuitionShareLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const [label, setLabel] = useState("");
  const [shareType, setShareType] = useState<TuitionShareType>("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || "");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || "");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [neverExpires, setNeverExpires] = useState(true);
  const [daysExpiry, setDaysExpiry] = useState(30);
  const [allowRecordClass, setAllowRecordClass] = useState(true);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true);
      const links = await getTuitionShareLinks();
      setShareLinks(links);
    } catch (err: any) {
      toast.error(err.message || "Failed to load share links");
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
      setLabel("");
      setShareType("all");
      setNeverExpires(true);
      setDaysExpiry(30);
      setAllowRecordClass(true);
      setNewlyCreatedUrl(null);
      if (teachers.length > 0) setSelectedTeacherId(teachers[0].id);
      if (subjects.length > 0) setSelectedSubjectId(subjects[0].id);
      setSelectedTeacherIds([]);
      setSelectedSubjectIds([]);
    }
  }, [isOpen, teachers, subjects]);

  if (!isOpen) return null;

  const handleToggleTeacherId = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSubjectId = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingLink(true);
      const params: any = {};
      if (shareType === "teacher") {
        params.teacherId = selectedTeacherId;
      } else if (shareType === "teachers") {
        if (selectedTeacherIds.length === 0) {
          toast.error("Please select at least one teacher.");
          setCreatingLink(false);
          return;
        }
        params.teacherIds = selectedTeacherIds;
      } else if (shareType === "subject") {
        params.subjectId = selectedSubjectId;
      } else if (shareType === "subjects") {
        if (selectedSubjectIds.length === 0) {
          toast.error("Please select at least one subject.");
          setCreatingLink(false);
          return;
        }
        params.subjectIds = selectedSubjectIds;
      }

      const created = await createTuitionShareLink(
        label.trim(),
        shareType,
        params,
        neverExpires,
        daysExpiry,
        allowRecordClass
      );

      if (!created) {
        toast.error("Failed to generate share link");
        return;
      }

      const fullUrl = `${window.location.origin}/tuition/share/${created.token}`;
      setNewlyCreatedUrl(fullUrl);
      toast.success("Tuition share link created successfully!");
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || "Failed to create share link");
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/tuition/share/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevokeLink = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this share link? Teachers will no longer have access.")) {
      return;
    }
    try {
      const ok = await revokeTuitionShareLink(id);
      if (ok) {
        toast.success("Share link revoked");
        fetchLinks();
      } else {
        toast.error("Failed to revoke share link");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke share link");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Share Calendar & Agenda
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Generate scoped links for teachers to view schedule and record classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          <form onSubmit={handleCreateLink} className="space-y-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Create New Share Link
            </h4>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Link Description / Label
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Abir Bhai Teaching Schedule"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Share Scope
                </label>
                <select
                  value={shareType}
                  onChange={(e) => setShareType(e.target.value as TuitionShareType)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <option value="all">Everything (All Teachers & Subjects)</option>
                  <option value="teacher">Single Teacher</option>
                  <option value="teachers">Multiple Teachers</option>
                  <option value="subject">Specific Subject</option>
                  <option value="subjects">Multiple Subjects</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Expiry Policy
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNeverExpires(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      neverExpires
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Never Expires
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeverExpires(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      !neverExpires
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Custom Days
                  </button>
                </div>
              </div>
            </div>

            {!neverExpires && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={daysExpiry}
                  onChange={(e) => setDaysExpiry(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            )}

            {shareType === "teacher" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shareType === "teachers" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Select Teachers (Multiple)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                  {teachers.map((t) => {
                    const isChecked = selectedTeacherIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTeacherId(t.id)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {shareType === "subject" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Select Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {shareType === "subjects" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Select Subjects (Multiple)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                  {subjects.map((s) => {
                    const isChecked = selectedSubjectIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubjectId(s.id)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                        />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                id="allowRecordCheckbox"
                type="checkbox"
                checked={allowRecordClass}
                onChange={(e) => setAllowRecordClass(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="allowRecordCheckbox"
                className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
              >
                Allow teacher to record class sessions (submissions require admin approval)
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creatingLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {creatingLink ? "Generating..." : "Generate Share Link"}
              </button>
            </div>
          </form>

          {newlyCreatedUrl && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <Check className="w-4 h-4" />
                Share link generated successfully:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newlyCreatedUrl}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 px-3 py-2 rounded-lg text-xs font-mono text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedUrl);
                    toast.success("Link copied!");
                  }}
                  className="px-3 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Active Share Links ({shareLinks.filter((l) => !l.revokedAt).length})
            </h4>

            {loadingLinks ? (
              <div className="text-center py-6 text-xs text-zinc-400">Loading links...</div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No share links generated yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {shareLinks.map((link) => {
                  const isRevoked = Boolean(link.revokedAt);
                  const isExpired =
                    !link.neverExpires &&
                    link.expiresAt &&
                    new Date(link.expiresAt) < new Date();

                  let scopeDescription = "All Teachers & Subjects";
                  if (link.type === "teacher" && link.params.teacherId) {
                    const t = teachers.find((item) => item.id === link.params.teacherId);
                    scopeDescription = `Teacher: ${t?.name || "Specific Teacher"}`;
                  } else if (link.type === "teachers" && Array.isArray(link.params.teacherIds)) {
                    scopeDescription = `${link.params.teacherIds.length} Teachers`;
                  } else if (link.type === "subject" && link.params.subjectId) {
                    const s = subjects.find((item) => item.id === link.params.subjectId);
                    scopeDescription = `Subject: ${s?.name || "Specific Subject"}`;
                  } else if (link.type === "subjects" && Array.isArray(link.params.subjectIds)) {
                    scopeDescription = `${link.params.subjectIds.length} Subjects`;
                  }

                  return (
                    <div
                      key={link.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isRevoked || isExpired
                          ? "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {link.label || "Untitled Link"}
                          </h5>
                          {isRevoked ? (
                            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                              Revoked
                            </span>
                          ) : isExpired ? (
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                              Expired
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{scopeDescription}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {link.viewCount || 0} views
                          </span>
                          {link.allowRecordClass && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400">Can Record</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isRevoked && !isExpired && (
                          <>
                            <button
                              onClick={() => handleCopyLink(link.token)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                              title="Copy share link"
                            >
                              {copiedToken === link.token ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <a
                              href={`/tuition/share/${link.token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                              title="Open portal in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => handleRevokeLink(link.id)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title="Revoke access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
