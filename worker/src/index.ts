/**
 * Internet Archive IAS3 streaming upload proxy.
 *
 * Browser --PUT stream--> this Worker --PUT stream--> https://s3.us.archive.org/{item}/{file}
 *
 * Security model:
 * - IA credentials (IA_ACCESS_KEY / IA_SECRET_KEY) live ONLY in Worker secrets.
 * - The client never supplies Authorization or x-archive-* headers; outgoing
 *   headers are built exclusively server-side.
 * - Item names are generated server-side by default; an optional client-supplied
 *   item name is strictly validated.
 * - Filenames are normalized and extension-whitelisted to block path traversal
 *   and unsafe characters.
 * - An optional shared UPLOAD_TOKEN gates the endpoint so it cannot be abused
 *   as a free upload relay to the IA account.
 */

export interface Env {
  IA_ACCESS_KEY: string;
  IA_SECRET_KEY: string;
  /** Optional shared secret; clients must send header `x-upload-token`. */
  UPLOAD_TOKEN?: string;
  /** Comma-separated CORS origin allowlist. Empty = reflect any Origin. */
  ALLOWED_ORIGINS?: string;
  /** Optional IA collection metadata header (e.g. "opensource_media"). */
  IA_COLLECTION?: string;
  /** Optional hard limit in MB (default 4096). */
  MAX_UPLOAD_MB?: string;
}

const S3_HOST = 's3.us.archive.org';
const DOWNLOAD_BASE = 'https://archive.org/download';
const DEFAULT_MAX_UPLOAD_MB = 4096;

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'aac', 'flac']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv']);
const ALLOWED_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Normalize a client-supplied filename into a safe flat name, or null. */
export function sanitizeFilename(raw: string): string | null {
  if (!raw) return null;
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const segments = name.split(/[\\/]/);
  if (segments.some((s) => s === '..' || s === '.')) return null;
  name = segments[segments.length - 1].trim().replace(/\s+/g, '-');
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  let base = name
    .slice(0, dot)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/\.{2,}/g, '.')
    .replace(/[.-]+$/, '');
  if (!base) base = 'file';
  const finalName = `${base}.${ext}`;
  return finalName.length <= 120 ? finalName : null;
}

/** Validate a client-supplied item name, or null when unsafe. */
export function sanitizeItemName(raw: string): string | null {
  if (!raw) return null;
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  name = name.trim().toLowerCase();
  if (name.includes('..')) return null;
  if (!/^[a-z0-9][a-z0-9._-]{2,99}$/.test(name)) return null;
  if (/[._-]$/.test(name)) return null;
  return name;
}

/** Server-side item id generation (client cannot influence it). */
export function generateItemName(): string {
  const now = new Date();
  const ymd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate()
  ).padStart(2, '0')}`;
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `sayid-al-mursaleen-${ymd}-${rand}`;
}

/** Strip CRLF/NUL to prevent header injection via metadata values. */
export function safeMetaValue(raw: string | null): string {
  return (raw ?? '')
    .replace(/[\r\n\0]+/g, ' ')
    .replace(/x-archive-/gi, '')
    .trim()
    .slice(0, 240);
}

export function isAudioExtension(ext: string): boolean {
  return AUDIO_EXTENSIONS.has(ext);
}

function redact(text: string, env: Env): string {
  let out = text;
  for (const secret of [env.IA_SECRET_KEY, env.IA_ACCESS_KEY]) {
    if (secret) out = out.split(secret).join('[REDACTED]');
  }
  return out.slice(0, 500);
}

function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Content-Length, x-upload-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes('*') || allowed.length === 0 || allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  return headers;
}

function jsonResponse(request: Request, env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function friendlyIaError(status: number): string {
  switch (true) {
    case status === 400:
      return 'رفض أرشيف الإنترنت الطلب لأنه غير صالح.';
    case status === 401 || status === 403:
      return 'فشلت المصادقة مع أرشيف الإنترنت. تحقق من إعدادات الخدمة.';
    case status === 409:
      return 'تعارض في اسم الملف على الأرشيف. حاول مرة أخرى.';
    case status === 429:
      return 'أرشيف الإنترنت يتلقى طلبات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
    case status >= 500:
      return 'خدمة أرشيف الإنترنت غير متاحة حاليًا. حاول لاحقًا.';
    default:
      return `تعذر رفع الملف إلى أرشيف الإنترنت (رمز ${status}).`;
  }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/healthz') {
      return jsonResponse(request, env, { ok: true });
    }

    if (request.method !== 'PUT') {
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'طريقة الطلب غير مدعومة. يُسمح فقط بـ PUT.' },
        405
      );
    }

    if (env.UPLOAD_TOKEN) {
      const token =
        request.headers.get('x-upload-token') || url.searchParams.get('token') || '';
      if (!token || !tokensMatch(token, env.UPLOAD_TOKEN)) {
        return jsonResponse(
          request,
          env,
          { ok: false, error: 'رمز التحقق مفقود أو غير صحيح.' },
          401
        );
      }
    }

    if (!env.IA_ACCESS_KEY || !env.IA_SECRET_KEY) {
      console.error('IA credentials are not configured');
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'خدمة الرفع غير مهيأة حاليًا.' },
        503
      );
    }

    // Path shape: /upload/{file} OR /upload/{item}/{file}
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'upload' || segments.length < 2 || segments.length > 3) {
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'مسار الطلب غير صحيح. الصيغة: /upload/{اسم-الملف}' },
        400
      );
    }

    const clientItem = segments.length === 3 ? segments[1] : null;
    let item: string;
    if (clientItem) {
      const validated = sanitizeItemName(clientItem);
      if (!validated) {
        return jsonResponse(
          request,
          env,
          { ok: false, error: 'اسم العنصر (item) غير صالح.' },
          400
        );
      }
      item = validated;
    } else {
      item = generateItemName();
    }

    const file = sanitizeFilename(segments[segments.length - 1]);
    if (!file) {
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'اسم الملف غير صالح أو امتداد غير مدعوم (المسموح: mp3, mp4, m4a, wav, ogg, opus, webm, mov, mkv, aac, flac).' },
        415
      );
    }

    // IAS3 rejects chunked transfers (HTTP 411): a definite byte length is
    // mandatory. Browsers always send Content-Length for File uploads; the
    // `x-content-length` header is an explicit fallback hint.
    const contentLengthHeader = request.headers.get('Content-Length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    const sizeHint = Number(request.headers.get('x-content-length') || '');
    const effectiveLength =
      Number.isFinite(contentLength) && contentLength > 0
        ? contentLength
        : Number.isFinite(sizeHint)
          ? sizeHint
          : NaN;

    if (!request.body || !Number.isFinite(effectiveLength) || effectiveLength <= 0) {
      return jsonResponse(request, env, { ok: false, error: 'الملف فارغ أو حجمه غير معروف.' }, 400);
    }
    const maxBytes = (Number(env.MAX_UPLOAD_MB) || DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;
    if (effectiveLength > maxBytes) {
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'حجم الملف يتجاوز الحد المسموح به.' },
        413
      );
    }

    const ext = file.slice(file.lastIndexOf('.') + 1);
    const iaUrl = `https://${S3_HOST}/${encodeURIComponent(item)}/${encodeURIComponent(file)}`;

    const iaHeaders = new Headers();
    // Built exclusively here; nothing from the client is copied.
    iaHeaders.set('Authorization', `LOW ${env.IA_ACCESS_KEY}:${env.IA_SECRET_KEY}`);
    iaHeaders.set('x-archive-auto-make-bucket', '1');
    iaHeaders.set('x-archive-meta-mediatype', isAudioExtension(ext) ? 'audio' : 'movies');

    const contentType = request.headers.get('Content-Type');
    if (contentType) {
      const cleanType = contentType.split(';')[0].trim() || 'application/octet-stream';
      iaHeaders.set('Content-Type', cleanType);
    } else {
      iaHeaders.set('Content-Type', 'application/octet-stream');
    }

    const collection = safeMetaValue(env.IA_COLLECTION || '');
    if (collection) iaHeaders.set('x-archive-meta-collection01', collection);

    const title = safeMetaValue(url.searchParams.get('title'));
    if (title) iaHeaders.set('x-archive-meta-title', encodeURIComponent(title));

    iaHeaders.set(
      'x-archive-meta-date',
      new Date().toISOString().slice(0, 10)
    );

    iaHeaders.set('Content-Length', String(effectiveLength));

    try {
      const iaRes = await fetch(iaUrl, {
        method: 'PUT',
        headers: iaHeaders,
        body: request.body as ReadableStream<Uint8Array>,
        // Required by spec-compliant runtimes (e.g. undici) when streaming a
        // request body; harmlessly accepted by workerd.
        duplex: 'half',
      } as RequestInit);

      if (iaRes.ok) {
        return jsonResponse(request, env, {
          ok: true,
          item,
          file,
          url: `${DOWNLOAD_BASE}/${encodeURIComponent(item)}/${encodeURIComponent(file)}`,
          size: effectiveLength,
        });
      }

      console.error(`IAS3 error ${iaRes.status}: ${redact(await iaRes.text(), env)}`);
      return jsonResponse(request, env, { ok: false, error: friendlyIaError(iaRes.status) }, 502);
    } catch (err) {
      console.error(`Upload proxy failure: ${redact(String(err), env)}`);
      return jsonResponse(
        request,
        env,
        { ok: false, error: 'تعذر الاتصال بخدمة الأرشيف. تحقق من الشبكة وحاول مجددًا.' },
        502
      );
    }
  },
};
