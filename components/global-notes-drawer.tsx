"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  NoteItem,
  NoteFolder,
  NoteMention,
  DEFAULT_FOLDERS,
} from "@/types/notes";
import { createClient } from "@/lib/supabase/client";
import {
  Folder,
  Plus,
  Search,
  Pin,
  Trash2,
  Tag,
  FileText,
  User,
  Sparkles,
  Check,
  ChevronRight,
  Globe,
  MessageCircle,
  X,
  ChevronLeft,
  StickyNote,
} from "lucide-react";
import {
  EntityMentionModal,
  EntityType,
} from "@/components/admin/EntityMentionModal";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const AdminRichEditor = dynamic(
  () => import("@/components/admin/AdminRichEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-950 border border-white/10 rounded-lg min-h-[250px] flex flex-col items-center justify-center text-zinc-400 space-y-2">
        <i className="fa-solid fa-spinner animate-spin text-2xl text-indigo-500"></i>
        <p className="text-xs">Loading editor...</p>
      </div>
    ),
  },
);

interface GlobalNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalNotesDrawer({ isOpen, onClose }: GlobalNotesDrawerProps) {
  const supabase = createClient();

  const [folders, setFolders] = useState<NoteFolder[]>(DEFAULT_FOLDERS);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [savingStatus, setSavingStatus] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");

  const [currentTitle, setCurrentTitle] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [currentFolder, setCurrentFolder] = useState("all");
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [mentions, setMentions] = useState<NoteMention[]>([]);

  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [activeEntityType, setActiveEntityType] = useState<EntityType | null>(
    null,
  );

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = async (selectFirst = false) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedFolder) q.append("folder", selectedFolder);
      if (searchQuery) q.append("search", searchQuery);

      const res = await fetch(`/api/notes?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const loadedNotes: NoteItem[] = data.notes || [];
        setNotes(loadedNotes);

        if (selectFirst && loadedNotes.length > 0) {
          loadNoteToEditor(loadedNotes[0]);
        } else if (selectedNoteId) {
          const matched = loadedNotes.find((n) => n.id === selectedNoteId);
          if (matched) loadNoteToEditor(matched);
          else if (loadedNotes.length > 0) loadNoteToEditor(loadedNotes[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes(true);
    }
  }, [isOpen, selectedFolder, searchQuery]);

  const loadNoteToEditor = (note: NoteItem) => {
    setSelectedNoteId(note.id);
    setCurrentTitle(note.title);
    setCurrentContent(note.content);
    setCurrentFolder(note.folder_id);
    setCurrentTags(note.tags || []);
    setIsPinned(note.is_pinned);
    setMentions(note.mentions || []);
    setSavingStatus("saved");
    setViewMode("editor");
  };

  const handleCreateNewNote = async () => {
    const newNoteData: Partial<NoteItem> = {
      title: "New Note",
      content: "<p>Start typing...</p>",
      folder_id: selectedFolder !== "all" ? selectedFolder : "all",
      is_pinned: false,
      tags: [],
      mentions: [],
    };

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNoteData),
      });

      if (res.ok) {
        const data = await res.json();
        const saved = data.note;
        setNotes((prev) => [saved, ...prev]);
        loadNoteToEditor(saved);
        toast.success("Note created");
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(
        `/api/notes?id=${encodeURIComponent(deleteConfirmId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const remaining = notes.filter((n) => n.id !== deleteConfirmId);
        setNotes(remaining);
        if (selectedNoteId === deleteConfirmId) {
          if (remaining.length > 0) loadNoteToEditor(remaining[0]);
          else {
            setSelectedNoteId(null);
            setCurrentTitle("");
            setCurrentContent("");
            setViewMode("list");
          }
        }
        toast.success("Note deleted");
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleTogglePin = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle_pin" }),
      });
      if (res.ok) {
        if (selectedNoteId === id) setIsPinned(!isPinned);
        fetchNotes(false);
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const triggerAutoSave = (updatedFields: Partial<NoteItem>) => {
    setSavingStatus("saving");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!selectedNoteId) return;

      const payload = {
        id: selectedNoteId,
        title: currentTitle,
        content: currentContent,
        folder_id: currentFolder,
        tags: currentTags,
        is_pinned: isPinned,
        mentions,
        ...updatedFields,
      };

      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setSavingStatus("saved");
          setNotes((prev) =>
            prev.map((n) =>
              n.id === selectedNoteId ? { ...n, ...data.note } : n,
            ),
          );
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSavingStatus("unsaved");
      }
    }, 800);
  };

  const handleTitleChange = (val: string) => {
    setCurrentTitle(val);
    triggerAutoSave({ title: val });
  };

  const handleContentChange = (html: string) => {
    setCurrentContent(html);
    triggerAutoSave({ content: html });
  };

  const handleFolderChange = (folderId: string) => {
    setCurrentFolder(folderId);
    triggerAutoSave({ folder_id: folderId });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (newTag && !currentTags.includes(newTag)) {
        const updated = [...currentTags, newTag];
        setCurrentTags(updated);
        triggerAutoSave({ tags: updated });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = currentTags.filter((t) => t !== tagToRemove);
    setCurrentTags(updated);
    triggerAutoSave({ tags: updated });
  };

  const handleInsertEntityMention = (type: EntityType) => {
    setActiveEntityType(type);
    setEntityModalOpen(true);
  };

  const handleModalInsert = (snippet: string, mentionData?: any) => {
    const updated = currentContent + snippet;
    setCurrentContent(updated);

    let updatedMentions = mentions;
    if (mentionData && !mentions.some((m) => m.label === mentionData.label)) {
      updatedMentions = [...mentions, mentionData];
      setMentions(updatedMentions);
    }

    triggerAutoSave({ content: updated, mentions: updatedMentions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
      <div className="w-full sm:max-w-xl md:max-w-2xl bg-zinc-950 text-slate-100 border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">
                Quick Notes System
              </h2>
              <p className="text-[10px] text-zinc-400">
                Accessible on any screen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewNote}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {viewMode === "list" ? (
            <div className="w-full flex flex-col bg-zinc-950 p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolder(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedFolder === f.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2.5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2">
                    <i className="fa-solid fa-spinner animate-spin text-xl text-indigo-500"></i>
                    <span className="text-xs">Loading notes...</span>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
                    <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">No notes found.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => loadNoteToEditor(note)}
                      className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-xs text-white truncate">
                          {note.title || "Untitled Note"}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {note.is_pinned && (
                            <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                          )}
                          <button
                            onClick={(e) => handleDeleteNote(note.id, e)}
                            className="p-1 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {note.plain_text || "No preview available..."}
                      </p>
                      <div className="text-[10px] text-zinc-500 pt-1">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col bg-zinc-950 overflow-hidden">
              <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewMode("list")}
                  className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white px-2.5 py-1 bg-zinc-800 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" /> Notes
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(selectedNoteId!)}
                    className={`p-1.5 rounded-lg border text-xs ${
                      isPinned
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    <Pin
                      className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-400" : ""}`}
                    />
                  </button>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">
                    {savingStatus === "saving" ? "Saving..." : "Saved"}
                  </span>
                </div>
              </div>

              <div className="p-4 border-b border-zinc-800">
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full bg-transparent text-lg font-black text-white focus:outline-none placeholder-zinc-600"
                />
              </div>

              <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <span className="text-[10px] font-black uppercase text-zinc-500 shrink-0">
                  Mention:
                </span>
                <button
                  onClick={() => handleInsertEntityMention("invoice")}
                  className="text-xs text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/30 shrink-0"
                >
                  @Invoice
                </button>
                <button
                  onClick={() => handleInsertEntityMention("client")}
                  className="text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30 shrink-0"
                >
                  @Client
                </button>
                <button
                  onClick={() => handleInsertEntityMention("subscription_user")}
                  className="text-xs text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30 shrink-0"
                >
                  @SubUser
                </button>
                <button
                  onClick={() => handleInsertEntityMention("plan")}
                  className="text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30 shrink-0"
                >
                  @Plan
                </button>
                <button
                  onClick={() => handleInsertEntityMention("attendx")}
                  className="text-xs text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30 shrink-0"
                >
                  @AttendX
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                <AdminRichEditor
                  value={currentContent}
                  onChange={handleContentChange}
                />

                <div className="pt-3 border-t border-zinc-800 flex items-center gap-2 flex-wrap">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  {currentTags.map((t) => (
                    <span
                      key={t}
                      className="bg-zinc-800 text-zinc-200 text-xs px-2 py-0.5 rounded "
                    >
                      #{t}{" "}
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="text-zinc-400 hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <EntityMentionModal
          open={entityModalOpen}
          onOpenChange={setEntityModalOpen}
          entityType={activeEntityType}
          onInsert={handleModalInsert}
        />

        <ConfirmDialog
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
          title="Delete Note"
          description="Are you sure you want to delete this note?"
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </div>
  );
}
