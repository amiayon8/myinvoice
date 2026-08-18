import { NextRequest, NextResponse } from 'next/server';
import { getNotes, getNoteById, saveNote, deleteNote, togglePinNote } from '@/lib/notes-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'all';
    const id = searchParams.get('id');

    if (id) {
      const note = await getNoteById(id);
      return NextResponse.json({ success: true, note });
    }

    const notes = await getNotes(folder);
    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = await saveNote(body);
    return NextResponse.json({ success: true, note: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    if (action === 'toggle_pin') {
      const updated = await togglePinNote(id);
      return NextResponse.json({ success: true, note: updated });
    }

    const saved = await saveNote(body);
    return NextResponse.json({ success: true, note: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await deleteNote(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
