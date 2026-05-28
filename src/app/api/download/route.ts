import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'audio.mp3';

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(`Failed to fetch file: ${res.statusText}`, { status: res.status });
    }

    const headers = new Headers();
    // Force attachment download instead of inline streaming
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Content-Type', res.headers.get('Content-Type') || 'audio/mpeg');
    
    const contentLength = res.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Return the response stream directly to the client
    return new Response(res.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download API Proxy error:', error);
    return new Response(`Internal Server Error: ${error.message || 'Unknown error'}`, { status: 500 });
  }
}
