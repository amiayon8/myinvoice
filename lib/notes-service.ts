import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NoteItem, NoteFolder, NoteMention, DEFAULT_FOLDERS } from '@/types/notes';
export type { NoteItem, NoteFolder, NoteMention } from '@/types/notes';
export { DEFAULT_FOLDERS } from '@/types/notes';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const WRITABLE_DATA_DIR = path.join(os.tmpdir(), 'myinvoice_data');

function ensureDataDir(): string {
  try {
    if (!fs.existsSync(WRITABLE_DATA_DIR)) {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    }
    return WRITABLE_DATA_DIR;
  } catch {
    return BUNDLED_DATA_DIR;
  }
}

function getReadFilePath(filename: string): string {
  const writablePath = path.join(WRITABLE_DATA_DIR, filename);
  if (fs.existsSync(writablePath)) {
    return writablePath;
  }
  return path.join(BUNDLED_DATA_DIR, filename);
}

function readLocalNotes(): NoteItem[] {
  try {
    const file = getReadFilePath('internal_notes.json');
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveLocalNotes(notes: NoteItem[]) {
  try {
    const dir = ensureDataDir();
    const targetFile = path.join(dir, 'internal_notes.json');
    fs.writeFileSync(targetFile, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local notes write skipped:', err);
  }
}

/**
 * Fetch all note folders from Supabase (with defaults fallback)
 */
export async function getFolders(): Promise<NoteFolder[]> {
  const supabase = createServiceRoleClient();
  try {
    const { data, error } = await supabase
      .from('note_folders')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((f: any) => ({
        id: f.id,
        name: f.name,
        icon: f.icon,
        color: f.color
      }));
    }
  } catch (e) {
    console.warn('Supabase getFolders fallback:', e);
  }

  return DEFAULT_FOLDERS;
}

/**
 * Fetch notes from Supabase database
 */
export async function getNotes(folderId?: string): Promise<NoteItem[]> {
  const supabase = createServiceRoleClient();
  try {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (folderId && folderId !== 'all') {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;
    if (!error && data) {
      const mapped: NoteItem[] = data.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        plain_text: n.plain_text,
        folder_id: n.folder_id,
        is_pinned: n.is_pinned,
        is_archived: n.is_archived,
        tags: n.tags || [],
        mentions: n.mentions || [],
        created_at: n.created_at,
        updated_at: n.updated_at
      }));
      // Sync local JSON as secondary cache
      saveLocalNotes(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase getNotes fallback:', err);
  }

  const localNotes = readLocalNotes();
  if (folderId && folderId !== 'all') {
    return localNotes.filter(n => n.folder_id === folderId && !n.is_archived);
  }
  return localNotes.filter(n => !n.is_archived);
}

/**
 * Extract smart mentions from HTML
 */
export function extractMentionsFromContent(html: string): NoteMention[] {
  const mentions: NoteMention[] = [];
  if (!html) return mentions;

  // 1. WhatsApp link detection
  const waRegex = /(?:https?:\/\/wa\.me\/|wa\.me\/)([0-9+]+)/gi;
  let waMatch;
  while ((waMatch = waRegex.exec(html)) !== null) {
    const phone = waMatch[1].replace(/[^0-9]/g, '');
    mentions.push({
      type: 'entity',
      label: `WhatsApp (+${phone})`,
      url: `https://wa.me/${phone}`,
      icon: 'fa-whatsapp'
    });
  }

  // 2. Instagram link / mention detection
  const igRegex = /(?:https?:\/\/(?:www\.)?instagram\.com\/|@instagram:?)([a-zA-Z0-9._]+)/gi;
  let igMatch;
  while ((igMatch = igRegex.exec(html)) !== null) {
    const handle = igMatch[1].replace('@', '');
    if (!['p', 'reel', 'stories', 'explore'].includes(handle.toLowerCase())) {
      mentions.push({
        type: 'entity',
        label: `@${handle}`,
        url: `https://instagram.com/${handle}`,
        icon: 'fa-instagram'
      });
    }
  }

  // 3. Invoice @INV- detection
  const invRegex = /@INV-[0-9A-Za-z_-]+/gi;
  let invMatch;
  while ((invMatch = invRegex.exec(html)) !== null) {
    const invNumber = invMatch[0].replace('@', '');
    mentions.push({
      type: 'invoice',
      label: invNumber,
      icon: 'fa-file-invoice-dollar'
    });
  }

  // 4. External URL detection
  const urlRegex = /href="(https?:\/\/[^"]+)"/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(html)) !== null) {
    const linkUrl = urlMatch[1];
    if (!linkUrl.includes('wa.me') && !linkUrl.includes('instagram.com')) {
      try {
        const domain = new URL(linkUrl).hostname;
        mentions.push({
          type: 'link',
          label: domain,
          url: linkUrl,
          icon: 'fa-arrow-up-right-from-square'
        });
      } catch {}
    }
  }

  return mentions;
}

/**
 * Save / Update a note in Supabase database
 */
export async function saveNote(noteData: Partial<NoteItem> & { title: string; content: string }): Promise<NoteItem> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Strip HTML for plain text search
  const plainText = noteData.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const detectedMentions = extractMentionsFromContent(noteData.content);
  const combinedMentions = [
    ...(noteData.mentions || []),
    ...detectedMentions.filter(dm => !(noteData.mentions || []).some(em => em.label === dm.label))
  ];

  const payload: any = {
    title: noteData.title || 'Untitled Note',
    content: noteData.content || '',
    plain_text: plainText,
    folder_id: noteData.folder_id || 'all',
    is_pinned: noteData.is_pinned ?? false,
    is_archived: noteData.is_archived ?? false,
    tags: noteData.tags || [],
    mentions: combinedMentions,
    updated_at: now
  };

  let savedId = noteData.id;

  try {
    if (noteData.id) {
      const { data, error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', noteData.id)
        .select()
        .single();

      if (!error && data) savedId = data.id;
    } else {
      payload.created_at = now;
      const { data, error } = await supabase
        .from('notes')
        .insert(payload)
        .select()
        .single();

      if (!error && data) savedId = data.id;
    }
  } catch (e) {
    console.warn('Supabase saveNote fallback:', e);
  }

  const finalNote: NoteItem = {
    id: savedId || noteData.id || `note-${Date.now()}`,
    ...payload,
    created_at: noteData.created_at || now,
    updated_at: now
  };

  // Keep local JSON in sync
  const localNotes = readLocalNotes();
  const idx = localNotes.findIndex(n => n.id === finalNote.id);
  if (idx >= 0) {
    localNotes[idx] = finalNote;
  } else {
    localNotes.unshift(finalNote);
  }
  saveLocalNotes(localNotes);

  return finalNote;
}

/**
 * Delete a note from Supabase database
 */
export async function deleteNote(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  try {
    await supabase.from('notes').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase deleteNote fallback:', e);
  }

  const localNotes = readLocalNotes().filter(n => n.id !== id);
  saveLocalNotes(localNotes);
  return true;
}

export async function getNoteById(id: string): Promise<NoteItem | null> {
  const supabase = createServiceRoleClient();
  try {
    const { data, error } = await supabase.from('notes').select('*').eq('id', id).maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        title: data.title,
        content: data.content,
        plain_text: data.plain_text,
        folder_id: data.folder_id,
        is_pinned: data.is_pinned,
        is_archived: data.is_archived,
        tags: data.tags || [],
        mentions: data.mentions || [],
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }
  } catch (e) {
    console.warn('Supabase getNoteById fallback:', e);
  }

  const localNotes = readLocalNotes();
  return localNotes.find(n => n.id === id) || null;
}

/**
 * Toggle pinned status of a note
 */
export async function togglePinNote(id: string): Promise<NoteItem | null> {
  const notes = await getNotes();
  const note = notes.find(n => n.id === id);
  if (!note) return null;

  return saveNote({
    ...note,
    is_pinned: !note.is_pinned
  });
}
