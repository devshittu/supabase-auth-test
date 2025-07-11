// src/app/api/auth/[...supabase]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Your original Supabase URL and Key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper function to extract cookies and set them on the response
function handleSupabaseCookies(
  supabaseResponse: Response,
  nextResponse: NextResponse
) {
  const setCookieHeaders = supabaseResponse.headers.getSetCookie();
  logger.debug(`Proxy: Received ${setCookieHeaders.length} Set-Cookie headers from Supabase.`);

  setCookieHeaders.forEach(cookieString => {
    // Parse the cookie string to get name, value, and options
    // A simple regex or library can parse this; for now, we'll do a basic split
    const [nameValue, ...optionsParts] = cookieString.split('; ').filter(Boolean);
    const [name, value] = nameValue.split('=');

    // Reconstruct options, specifically handling domain and secure
    const options: { [key: string]: any } = {};
    optionsParts.forEach(part => {
      const [key, val] = part.split('=');
      if (key && val) {
        options[key.toLowerCase()] = val;
      } else if (key) {
        options[key.toLowerCase()] = true; // For flags like HttpOnly, Secure
      }
    });

    // CRITICAL: Override the domain to your current domain
    // And ensure secure is true if served over HTTPS
    const isSecureContext = nextResponse.url.startsWith('https://');
    const newOptions: { [key: string]: any } = {
      path: options.path || '/',
      expires: options.expires,
      maxAge: options.maxAge ? parseInt(options.maxAge, 10) : undefined,
      httpOnly: options.httponly || false,
      secure: isSecureContext, // Forces secure if using HTTPS proxy
      sameSite: options.samesite || 'lax', // Default to lax if not specified
    };

    logger.debug(`Proxy: Re-setting cookie - Name: ${name}, Value (truncated): ${value.substring(0, 10)}..., New Options: ${JSON.stringify(newOptions)}`);
    nextResponse.cookies.set({
      name: name,
      value: value,
      ...newOptions
    });
  });
}

export async function GET(request: NextRequest, { params }: { params: { supabase: string[] } }) {
  const { searchParams } = new URL(request.url);
  const path = params.supabase.join('/');
  const targetUrl = `${SUPABASE_URL}/auth/v1/${path}?${searchParams.toString()}`;

  logger.debug(`Proxy GET: Forwarding request to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        // Forward other relevant headers if necessary
        ...Object.fromEntries(request.headers.entries())
      },
      redirect: 'manual', // Prevent fetch from following redirects
    });

    const nextResponse = new NextResponse(response.body, { status: response.status });
    // IMPORTANT: Handle Set-Cookie headers from Supabase
    handleSupabaseCookies(response, nextResponse);
    return nextResponse;

  } catch (error) {
    logger.error('Proxy GET: Error forwarding request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


export async function POST(request: NextRequest, { params }: { params: { supabase: string[] } }) {
  const { searchParams } = new URL(request.url);
  const path = params.supabase.join('/');
  const targetUrl = `${SUPABASE_URL}/auth/v1/${path}?${searchParams.toString()}`;

  logger.debug(`Proxy POST: Forwarding request to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()) // Forward all original headers
      },
      body: await request.text(), // Get raw body to forward
      redirect: 'manual',
    });

    const nextResponse = new NextResponse(response.body, { status: response.status });
    // IMPORTANT: Handle Set-Cookie headers from Supabase
    handleSupabaseCookies(response, nextResponse);

    return nextResponse;

  } catch (error) {
      logger.error('Proxy POST: Error forwarding request:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Implement PUT, DELETE, etc. methods if your application needs them
// For auth, POST (sign-in/sign-up) and GET (session, user) are most common.