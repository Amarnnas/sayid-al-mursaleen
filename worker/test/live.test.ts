/**
 * LIVE integration test against the real Internet Archive IAS3 endpoint.
 *
 * Opt-in only (it uploads and then deletes a real test file):
 *
 *   LIVE_TEST=1 npx vitest run live.test.ts
 *
 * Credentials are read from worker/.dev.vars (gitignored) — never hardcode them.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import handler, { generateItemName } from '../src/index';

const runLive = process.env.LIVE_TEST === '1';

const loadDevVars = (): Record<string, string> => {
  try {
    const raw = readFileSync(join(__dirname, '..', '.dev.vars'), 'utf8');
    const vars: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return vars;
  } catch {
    return {};
  }
};

describe.skipIf(!runLive)('live IAS3 integration', () => {
  const dev = loadDevVars();
  const env = {
    IA_ACCESS_KEY: dev.IA_ACCESS_KEY,
    IA_SECRET_KEY: dev.IA_SECRET_KEY,
  };

  it('has credentials available in .dev.vars', () => {
    expect(env.IA_ACCESS_KEY).toBeTruthy();
    expect(env.IA_SECRET_KEY).toBeTruthy();
  });

  it('answers OPTIONS preflight', async () => {
    const res = await handler.fetch(
      new Request('https://worker.local/upload/test.mp3', { method: 'OPTIONS' }),
      env
    );
    expect(res.status).toBe(204);
  });

  it('rejects an unsupported extension without contacting IA', async () => {
    const res = await handler.fetch(
      new Request('https://worker.local/upload/bad.exe', { method: 'PUT', body: 'x' }),
      env
    );
    expect(res.status).toBe(415);
  });

  it('streams a real upload to archive.org and returns a download URL', async () => {
    const payload = 'SAED-LIVE-TEST ' + '0123456789'.repeat(200);
    const res = await handler.fetch(
      new Request(
        `https://worker.local/upload/live-selftest-${Date.now()}.mp3?title=${encodeURIComponent(
          'Saed Worker Live Selftest'
        )}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/mpeg', 'x-content-length': String(payload.length) },
          body: payload,
        }
      ),
      env
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
    expect(json.url).toMatch(/^https:\/\/archive\.org\/download\/sayid-al-mursaleen-\d{8}-[0-9a-f]{12}\/live-selftest-\d+\.mp3$/);
    expect(json.size).toBe(payload.length);

    // Cleanup: IA commits uploads asynchronously, so retry the delete a few
    // times and tolerate eventual-consistency 404s.
    const auth = `LOW ${env.IA_ACCESS_KEY}:${env.IA_SECRET_KEY}`;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let deleted = false;
    for (let i = 0; i < 4 && !deleted; i++) {
      await sleep(4000);
      const del = await fetch(`https://s3.us.archive.org/${json.item}/${json.file}`, {
        method: 'DELETE',
        headers: { Authorization: auth },
      });
      if ([200, 204].includes(del.status)) deleted = true;
    }
    // Best-effort removal of the bucket itself; ignore its status.
    await fetch(`https://s3.us.archive.org/${json.item}`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    void generateItemName;
  }, 120_000);
});
