import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function parseUserAgent(ua: string) {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) && !/Chromium\//.test(ua) ? 'Chrome' :
    /Chromium\//.test(ua) ? 'Chromium' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari' :
    /MSIE |Trident\//.test(ua) ? 'IE' :
    'Unknown';

  const os =
    /Windows NT 10/.test(ua) ? 'Windows 10/11' :
    /Windows NT 6\.3/.test(ua) ? 'Windows 8.1' :
    /Windows NT 6\.1/.test(ua) ? 'Windows 7' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Linux/.test(ua) ? 'Linux' :
    'Unknown';

  const device =
    /Mobile|Android|iPhone/.test(ua) ? 'Mobile' :
    /iPad|Tablet/.test(ua) ? 'Tablet' :
    'Desktop';

  return { browser, os, device };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, referrer } = body as { token: string; referrer?: string };

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Look up token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('invoice_access_tokens')
      .select('id, invoice_id, expires_at, never_expires, is_public, revoked_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    // Validate token
    if (tokenRecord.revoked_at) {
      return NextResponse.json({ valid: false, reason: 'revoked', tokenRecord });
    }
    if (!tokenRecord.is_public) {
      return NextResponse.json({ valid: false, reason: 'not_public', tokenRecord });
    }
    if (!tokenRecord.never_expires && tokenRecord.expires_at) {
      const expiry = new Date(tokenRecord.expires_at);
      if (expiry < new Date()) {
        return NextResponse.json({ valid: false, reason: 'expired', tokenRecord });
      }
    }

    // Parse request details for logging
    const userAgent = request.headers.get('user-agent') || '';
    const ip = getClientIp(request);
    const { browser, os, device } = parseUserAgent(userAgent);

    // Insert view log (fire and forget style — we still await but don't block response on failure)
    await supabase.from('invoice_view_logs').insert({
      token_id: tokenRecord.id,
      invoice_id: tokenRecord.invoice_id,
      ip_address: ip,
      user_agent: userAgent,
      browser,
      os,
      device,
      referrer: referrer || null,
    });

    return NextResponse.json({ valid: true, tokenRecord });
  } catch (err: any) {
    console.error('[invoice-view] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
