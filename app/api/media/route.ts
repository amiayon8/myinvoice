import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const BUNDLED_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const WRITABLE_UPLOAD_DIR = path.join(os.tmpdir(), 'myinvoice_uploads');

function getWritableUploadDir(): string {
  try {
    if (!fs.existsSync(WRITABLE_UPLOAD_DIR)) {
      fs.mkdirSync(WRITABLE_UPLOAD_DIR, { recursive: true });
    }
    return WRITABLE_UPLOAD_DIR;
  } catch {
    return BUNDLED_UPLOAD_DIR;
  }
}

export async function GET() {
  try {
    const directories = [WRITABLE_UPLOAD_DIR, BUNDLED_UPLOAD_DIR];
    const mediaMap = new Map<string, any>();

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (!/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f)) continue;
          if (mediaMap.has(f)) continue;
          try {
            const stats = fs.statSync(path.join(dir, f));
            mediaMap.set(f, {
              id: f,
              name: f,
              url: `/uploads/${f}`,
              mediumUrl: `/uploads/${f}`,
              size: stats.size,
              created_at: stats.mtime.toISOString()
            });
          } catch {}
        }
      } catch {}
    }

    const mediaList = Array.from(mediaMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, media: mediaList });
  } catch (err: any) {
    return NextResponse.json({ success: true, media: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.png';
    const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}_${safeBase}${ext}`;

    const targetDir = getWritableUploadDir();
    const filePath = path.join(targetDir, fileName);

    try {
      fs.writeFileSync(filePath, buffer);
    } catch (writeErr: any) {
      console.warn('File save warning:', writeErr);
    }

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      media: {
        id: fileName,
        name: file.name,
        url: publicUrl,
        mediumUrl: publicUrl,
        size: buffer.length
      }
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
