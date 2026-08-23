import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { sanitizeFilename, sanitizeItemName, generateItemName } from '../src/index';
import type { Env } from '../src/index';

const BASE_ENV: Partial<Env> = {
  IA_ACCESS_KEY: 'test-access-key',
  IA_SECRET_KEY: 'test-secret-value',
};

const makeEnv = (extra: Partial<Env> = {}): Env =>
  ({ ...BASE_ENV, ...extra }) as Env;

const makeRequest = (method: string, path: string, init: RequestInit = {}) =>
  new Request(`https://worker.example.com${path}`, { method, ...init });

describe('sanitizeFilename', () => {
  it('accepts a normal mp3 name', () => {
    expect(sanitizeFilename('khutbah-1.mp3')).toBe('khutbah-1.mp3');
  });

  it('normalizes spaces and casing of extension', () => {
    expect(sanitizeFilename('my file name.MP4')).toBe('my-file-name.mp4');
  });

  it('rejects path traversal', () => {
    expect(sanitizeFilename('../../secret.mp3')).toBeNull();
    expect(sanitizeFilename('..%2F..%2Fsecret.mp3')).toBeNull();
    expect(sanitizeFilename('..\\secret.mp3')).toBeNull();
  });

  it('rejects dot-segments only', () => {
    expect(sanitizeFilename('./file.mp3')).toBeNull();
    expect(sanitizeFilename('.mp3')).toBeNull();
  });

  it('rejects empty and extensionless names', () => {
    expect(sanitizeFilename('')).toBeNull();
    expect(sanitizeFilename('noext')).toBeNull();
  });

  it('rejects unsupported extensions', () => {
    expect(sanitizeFilename('malware.exe')).toBeNull();
    expect(sanitizeFilename('script.php')).toBeNull();
  });

  it('keeps dots inside base name but collapses multiples', () => {
    expect(sanitizeFilename('a..b---c.mp3')).toBe('a.b-c.mp3');
  });

  it('strips non-latin (arabic) characters into dashes', () => {
    const out = sanitizeFilename('خطبة الجمعة.mp3')!;
    expect(out).toMatch(/^[a-zA-Z0-9._-]+\.mp3$/);
  });
});

describe('sanitizeItemName', () => {
  it('accepts valid lowercase names', () => {
    expect(sanitizeItemName('sayid-al-mursaleen-20260823-ab12cd34ef56')).toBe(
      'sayid-al-mursaleen-20260823-ab12cd34ef56'
    );
  });

  it('rejects traversal and unsafe names', () => {
    expect(sanitizeItemName('../../secret')).toBeNull();
    expect(sanitizeItemName('has space')).toBeNull();
    expect(sanitizeItemName('-leadingdash')).toBeNull();
    expect(sanitizeItemName('trailing.')).toBeNull();
    expect(sanitizeItemName('ab')).toBeNull(); // too short
  });

  it('normalizes case instead of rejecting', () => {
    expect(sanitizeItemName('UPPERCASE-case')).toBe('uppercase-case');
  });

  it('rejects embedded double-dots', () => {
    expect(sanitizeItemName('item..name')).toBeNull();
  });
});

describe('generateItemName', () => {
  it('generates a safe deterministic-shaped id', () => {
    const name = generateItemName();
    expect(name).toMatch(/^sayid-al-mursaleen-\d{8}-[0-9a-f]{12}$/);
    expect(sanitizeItemName(name)).toBe(name);
  });
});

describe('worker fetch handler', () => {
  let iaFetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    iaFetchMock = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', iaFetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers OPTIONS preflight with CORS headers', async () => {
    const res = await handler.fetch(
      makeRequest('OPTIONS', '/upload/x.mp3', {
        headers: { Origin: 'https://app.example.com' },
      }),
      BASE_ENV as Env
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
  });

  it('rejects GET with 405', async () => {
    const res = await handler.fetch(makeRequest('GET', '/upload/a.mp3'), makeEnv());
    expect(res.status).toBe(405);
  });

  it('rejects missing filename with 400', async () => {
    const res = await handler.fetch(makeRequest('PUT', '/upload'), makeEnv());
    expect(res.status).toBe(400);
  });

  it('rejects dangerous filenames with 400/415 and never calls IA', async () => {
    const res = await handler.fetch(makeRequest('PUT', '/upload/..%2F..%2Fsecret'), makeEnv());
    expect([400, 415]).toContain(res.status);
    expect(iaFetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported extensions with 415', async () => {
    const res = await handler.fetch(makeRequest('PUT', '/upload/file.exe'), makeEnv());
    expect(res.status).toBe(415);
    expect(iaFetchMock).not.toHaveBeenCalled();
  });

  it('requires upload token when configured', async () => {
    const envObj: Partial<Env> = { UPLOAD_TOKEN: 'tok-123' };
    const denied = await handler.fetch(
      makeRequest('PUT', '/upload/a.mp3'),
      makeEnv(envObj)
    );
    expect(denied.status).toBe(401);

    const allowed = await handler.fetch(
      makeRequest('PUT', '/upload/a.mp3', {
        headers: { 'x-upload-token': 'tok-123', 'x-content-length': '4' },
        body: 'data',
      }),
      makeEnv(envObj)
    );
    expect(allowed.status).toBe(200);
  });

  it('returns 503 when credentials are missing', async () => {
    const res = await handler.fetch(
      makeRequest('PUT', '/upload/a.mp3'),
      {} as Env
    );
    expect(res.status).toBe(503);
  });

  it('streams PUT to IAS3 with auth + auto-make-bucket and returns download URL', async () => {
    const res = await handler.fetch(
      makeRequest('PUT', '/upload/khutbah.mp3?title=%D8%AE%D8%B7%D8%A8%D8%A9', {
        headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '10' },
        body: '0123456789',
      }),
      BASE_ENV as Env
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      item: string;
      file: string;
      url: string;
      size: number | null;
    };
    expect(json.ok).toBe(true);
    expect(json.url).toBe(`https://archive.org/download/${json.item}/${json.file}`);
    expect(json.file).toBe('khutbah.mp3');

    expect(iaFetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = iaFetchMock.mock.calls[0];
    expect(calledUrl).toBe(`https://s3.us.archive.org/${json.item}/${json.file}`);
    expect(calledInit.method).toBe('PUT');
    const headers: Headers = calledInit.headers;
    expect(headers.get('Authorization')).toBe('LOW test-access-key:test-secret-value');
    expect(headers.get('x-archive-auto-make-bucket')).toBe('1');
    expect(headers.get('x-archive-meta-mediatype')).toBe('audio');
    expect(headers.get('Content-Type')).toBe('audio/mpeg');
  });

  it('uses a client item name only when strictly valid', async () => {
    await handler.fetch(
      makeRequest('PUT', '/upload/my-item-1/file.mp3', {
        headers: { 'x-content-length': '4' },
        body: 'data',
      }),
      makeEnv()
    );
    const [, init] = iaFetchMock.mock.calls[0];
    const url: string = iaFetchMock.mock.calls[0][0];
    expect(url.startsWith('https://s3.us.archive.org/my-item-1/')).toBe(true);
    expect(init.method).toBe('PUT');

    // Uppercase client items are normalized to lowercase, not rejected.
    const upper = await handler.fetch(
      makeRequest('PUT', '/upload/My-Item-2/file.mp3', {
        headers: { 'x-content-length': '4' },
        body: 'data',
      }),
      makeEnv()
    );
    expect(upper.status).toBe(200);
    const json = (await upper.json()) as { ok: boolean; item: string };
    expect(json.item).toBe('my-item-2');

    const bad = await handler.fetch(
      makeRequest('PUT', '/upload/..%2Fescape/file.mp3'),
      makeEnv()
    );
    expect(bad.status).toBe(400);
  });

  it('maps IAS3 500 to 502 JSON error without leaking secrets', async () => {
    iaFetchMock.mockResolvedValueOnce(
      new Response('boom test-secret-value', { status: 500 })
    );
    const res = await handler.fetch(
      makeRequest('PUT', '/upload/a.mp3', {
        headers: { 'x-content-length': '4' },
        body: 'data',
      }),
      makeEnv()
    );
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('test-secret-value');
    expect(text).not.toContain('test-access-key');
  });

  it('reports empty files with 400 before contacting IA', async () => {
    // No body at all => empty upload (browsers always attach a stream for real files).
    const res = await handler.fetch(makeRequest('PUT', '/upload/a.mp3'), makeEnv());
    expect(res.status).toBe(400);
    expect(iaFetchMock).not.toHaveBeenCalled();
  });

  it('rejects a stream with unknown size (no length hint) with 400', async () => {
    const res = await handler.fetch(
      makeRequest('PUT', '/upload/a.mp3', { body: 'data' }),
      makeEnv()
    );
    expect(res.status).toBe(400);
    expect(iaFetchMock).not.toHaveBeenCalled();
  });
});
