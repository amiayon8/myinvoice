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
  Share2,
  ExternalLink,
  MessageCircle,
  Camera,
  FileText,
  User,
  Sparkles,
  Save,
  Clock,
  Check,
  CheckCircle2,
  ChevronRight,
  Layers,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import {
  EntityMentionModal,
  EntityType,
} from "@/components/admin/EntityMentionModal";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Dynamically import BlockNote AdminRichEditor to prevent SSR issues
const AdminRichEditor = dynamic(
  () => import("@/components/admin/AdminRichEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-950 border border-white/10 rounded-lg min-h-[350px] flex flex-col items-center justify-center text-zinc-400 space-y-2">
        <i className="fa-solid fa-spinner animate-spin text-2xl text-indigo-500"></i>
        <p className="text-xs">Loading rich block editor...</p>
      </div>
    ),
  },
);

export default function NotesPage() {
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
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  // CRM entity references for quick mentions
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Active note editing states
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [currentFolder, setCurrentFolder] = useState("all");
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [mentions, setMentions] = useState<NoteMention[]>([]);

  // Interactive Entity Mention Modal state
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [activeEntityType, setActiveEntityType] = useState<EntityType | null>(
    null,
  );

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial CRM data
  useEffect(() => {
    const fetchCRM = async () => {
      try {
        const [invRes, clientRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, invoice_number, status")
            .limit(50),
          supabase.from("clients").select("id, name, email").limit(50),
        ]);
        if (invRes.data) setInvoices(invRes.data);
        if (clientRes.data) setClients(clientRes.data);
      } catch (e) {
        console.warn("CRM fetch for notes skipped:", e);
      }
    };
    fetchCRM();
  }, []);

  // Fetch notes based on folder & search
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
        } else if (loadedNotes.length > 0) {
          loadNoteToEditor(loadedNotes[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(true);
  }, [selectedFolder, searchQuery]);

  const loadNoteToEditor = (note: NoteItem) => {
    setSelectedNoteId(note.id);
    setCurrentTitle(note.title);
    setCurrentContent(note.content);
    setCurrentFolder(note.folder_id);
    setCurrentTags(note.tags || []);
    setIsPinned(note.is_pinned);
    setMentions(note.mentions || []);
    setSavingStatus("saved");
    setMobileView("editor");
  };

  const handleCreateNewNote = async () => {
    const newNoteData: Partial<NoteItem> = {
      title: "New Note",
      content: "<p>Start typing or type '/' for commands...</p>",
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

  // Auto-save debounced
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
          // Update note in local state list
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* COLUMN 1: FOLDERS SIDEBAR (Notes Style) */}
      <div className="w-60 bg-zinc-950 border-r border-zinc-800 flex-col justify-between shrink-0 hidden lg:flex">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                <i className="fa-solid fa-note-sticky text-sm"></i>
              </div>
              <span className="font-black text-sm text-white uppercase tracking-wider">
                Notes
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-2 font-black text-[9px] text-zinc-500 uppercase tracking-widest mb-2">
              Folders
            </p>
            {folders.map((f) => {
              const isSelected = selectedFolder === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <i
                      className={`fa-solid ${f.icon} text-xs w-4 text-center`}
                      style={{ color: isSelected ? "white" : f.color }}
                    ></i>
                    <span className="truncate">{f.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom stats / new folder */}
        <div className="p-4 border-t border-zinc-900 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>{notes.length} Total Notes</span>
          <span className=" text-zinc-400">v2.0</span>
        </div>
      </div>

      {/* COLUMN 2: NOTE LIST */}
      <div
        className={`w-full md:w-72 lg:w-80 bg-zinc-900/90 border-r border-zinc-800 flex-col shrink-0 ${mobileView === "editor" ? "hidden md:flex" : "flex"}`}
      >
        {/* Search & New Note header */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-base text-white capitalize">
              {folders.find((f) => f.id === selectedFolder)?.name ||
                "All Notes"}
            </h2>
            <button
              onClick={handleCreateNewNote}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              title="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Folder Pills for Mobile / Tablet */}
          <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolder(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${selectedFolder === f.id ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search in notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
              <i className="fa-solid fa-spinner animate-spin text-xl text-indigo-500"></i>
              <span className="text-xs">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-2">
              <FileText className="w-8 h-8 stroke-1 text-zinc-600" />
              <p className="text-xs">No notes found. Click + to create one.</p>
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const dateStr = new Date(note.updated_at).toLocaleDateString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                },
              );

              return (
                <div
                  key={note.id}
                  onClick={() => loadNoteToEditor(note)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-600/10"
                      : "bg-zinc-950/60 hover:bg-zinc-950 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-xs text-white truncate max-w-[190px]">
                      {note.title || "Untitled Note"}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {note.is_pinned && (
                        <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                      )}
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {note.plain_text || "No preview available..."}
                  </p>

                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{dateStr}</span>
                    {note.tags && note.tags.length > 0 && (
                      <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded  text-[9px]">
                        #{note.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMN 3: NOTE WORKSPACE & BLOCKNOTE EDITOR */}
      <div
        className={`w-full flex-1 flex-col bg-zinc-950 overflow-hidden ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
      >
        {selectedNoteId ? (
          <>
            {/* Top Toolbar */}
            <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-zinc-950/80">
              <div className="flex-1 flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setMobileView("list")}
                  className="md:hidden flex items-center gap-1 text-xs text-zinc-300 font-bold hover:text-white px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Notes</span>
                </button>
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note Title..."
                  className="bg-transparent border-0 font-black text-xl md:text-2xl text-white placeholder-zinc-600 focus:outline-none w-full"
                />
              </div>

              {/* Action chips & Auto-save status */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Folder Selector */}
                <select
                  value={currentFolder}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>

                {/* Pin Button */}
                <button
                  onClick={() => handleTogglePin(selectedNoteId)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isPinned
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title={isPinned ? "Unpin Note" : "Pin to Top"}
                >
                  <Pin
                    className={`w-4 h-4 ${isPinned ? "fill-amber-400" : ""}`}
                  />
                </button>

                {/* Save status indicator */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                  {savingStatus === "saving" ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin text-indigo-400 text-xs"></i>
                      <span>Saving...</span>
                    </>
                  ) : savingStatus === "saved" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Unsaved</span>
                  )}
                </div>
              </div>
            </div>

            {/* Entity Quick Mentions Toolbar */}
            <div className="px-6 py-2.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Insert
                Entity:
              </span>
              <button
                onClick={() => handleInsertEntityMention("invoice")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/40 border border-indigo-800/40 text-indigo-400 hover:bg-indigo-900/60 transition-colors shrink-0"
              >
                <FileText className="w-3 h-3" /> @Invoice
              </button>
              <button
                onClick={() => handleInsertEntityMention("client")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors shrink-0"
              >
                <User className="w-3 h-3" /> @Client
              </button>
              <button
                onClick={() => handleInsertEntityMention("subscription_user")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 hover:bg-cyan-900/60 transition-colors shrink-0"
              >
                <User className="w-3 h-3" /> @SubUser
              </button>
              <button
                onClick={() => handleInsertEntityMention("plan")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/40 border border-amber-800/40 text-amber-400 hover:bg-amber-900/60 transition-colors shrink-0"
              >
                <Layers className="w-3 h-3" /> @Plan
              </button>
              <button
                onClick={() => handleInsertEntityMention("whatsapp")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-950/40 border border-green-800/40 text-green-400 hover:bg-green-900/60 transition-colors shrink-0"
              >
                <MessageCircle className="w-3 h-3" /> @WhatsApp
              </button>
              <button
                onClick={() => handleInsertEntityMention("instagram")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-950/40 border border-pink-800/40 text-pink-400 hover:bg-pink-900/60 transition-colors shrink-0"
              >
                <i className="fa-brands fa-instagram text-sm"></i> @Instagram
              </button>
              <button
                onClick={() => handleInsertEntityMention("attendx")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/40 border border-purple-800/40 text-purple-400 hover:bg-purple-900/60 transition-colors shrink-0"
              >
                <Globe className="w-3 h-3" /> @AttendX
              </button>
            </div>

            {/* Editor Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <AdminRichEditor
                value={currentContent}
                onChange={handleContentChange}
              />

              {/* Tags & Metadata footer */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-zinc-500" />
                  {currentTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1 rounded-lg  transition-colors"
                    >
                      #{t}
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
                    placeholder="Add tag (Press Enter)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-3 p-8">
            <FileText className="w-16 h-16 stroke-1 text-zinc-700" />
            <h3 className="font-extrabold text-base text-zinc-300">
              No Note Selected
            </h3>
            <p className="text-xs text-zinc-500 text-center max-w-sm">
              Select a note from the left sidebar or create a new one to start
              writing with the rich block editor.
            </p>
            <button
              onClick={handleCreateNewNote}
              className="mt-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" /> Create New Note
            </button>
          </div>
        )}
      </div>

      {/* Interactive Entity Mention Modal (Dropdown / Manual Entry) */}
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
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
