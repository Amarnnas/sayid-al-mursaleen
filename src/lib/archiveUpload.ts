/**
 * Client-side helper for uploading media files directly to Internet Archive
 * through the Cloudflare Worker IAS3 proxy (Browser -> Worker -> archive.org).
 *
 * The browser streams the raw File via HTTP PUT; nothing is base64-encoded and
 * no secrets are involved client-side. The Worker replies with JSON containing
 * the final `https://archive.org/download/{item}/{file}` URL.
 */

export const ARCHIVE_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'aac', 'flac'];
export const ARCHIVE_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv'];
export const ARCHIVE_ALLOWED_EXTENSIONS = [...ARCHIVE_AUDIO_EXTENSIONS, ...ARCHIVE_VIDEO_EXTENSIONS];

const DEFAULT_MAX_UPLOAD_MB = 4096;

export interface ArchiveUploadResult {
  url: string;
  item: string;
  file: string;
  size?: number | null;
}

export interface ArchiveUploadOptions {
  /** Lecture title forwarded as IA item metadata (optional). */
  title?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Configured Worker base URL, e.g. https://saed-ia-upload-worker.workers.dev */
export function getArchiveUploadEndpoint(): string {
  return (process.env.NEXT_PUBLIC_IA_UPLOAD_URL || '').trim().replace(/\/+$/, '');
}

/** Optional shared token matching the Worker's UPLOAD_TOKEN secret. */
export function getArchiveUploadToken(): string {
  return (process.env.NEXT_PUBLIC_IA_UPLOAD_TOKEN || '').trim();
}

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isAllowedMediaFileName(name: string): boolean {
  return ARCHIVE_ALLOWED_EXTENSIONS.includes(getFileExtension(name));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 بايت';
  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function friendlyUploadError(status: number, serverError?: string): string {
  switch (status) {
    case 0:
      return 'انقطع الاتصال بالخادم أثناء الرفع. تحقق من الإنترنت وحاول مجددًا.';
    case 401:
      return 'رمز التحقق الخاص بالرفع غير صحيح.';
    case 405:
      return 'إعداد خادم الرفع غير صحيح (طريقة غير مدعومة).';
    case 413:
      return 'حجم الملف يتجاوز الحد المسموح به.';
    case 415:
      return serverError || 'نوع الملف غير مدعوم.';
    case 502:
    case 504:
      return 'تعذر الوصول إلى أرشيف الإنترنت. حاول لاحقًا.';
    case 503:
      return 'خدمة الرفع غير مهيأة حاليًا. راجع إعدادات الخادم.';
    default:
      return serverError || `فشل رفع الملف (رمز ${status}).`;
  }
}

/**
 * Upload a File to Internet Archive via the Worker proxy.
 * Resolves with the public archive.org download URL.
 */
export function uploadFileToArchive(
  file: File,
  options: ArchiveUploadOptions = {}
): Promise<ArchiveUploadResult> {
  const endpoint = getArchiveUploadEndpoint();
  if (!endpoint) {
    return Promise.reject(new Error('خدمة رفع الأرشيف غير مهيأة. أضف NEXT_PUBLIC_IA_UPLOAD_URL.'));
  }

  const safeName = file.name.replace(/[\\/]+/g, '-');
  let requestUrl = `${endpoint}/upload/${encodeURIComponent(safeName)}`;
  if (options.title && options.title.trim()) {
    requestUrl += `?title=${encodeURIComponent(options.title.trim())}`;
  }

  return new Promise<ArchiveUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', requestUrl, true);
    xhr.responseType = 'text';

    const contentType = file.type && file.type !== '' ? file.type : '';
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    // IAS3 requires an explicit length; browsers normally send Content-Length,
    // this hint guarantees the Worker always has a definite size.
    xhr.setRequestHeader('x-content-length', String(file.size));

    const token = getArchiveUploadToken();
    if (token) xhr.setRequestHeader('x-upload-token', token);

    if (options.signal) {
      const onAbort = () => {
        xhr.abort();
      };
      options.signal.addEventListener('abort', onAbort, { once: true });
      xhr.addEventListener('loadend', () => {
        options.signal?.removeEventListener('abort', onAbort);
      });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => {
      reject(new Error(friendlyUploadError(0)));
    };

    xhr.onabort = () => {
      reject(new DOMException('تم إلغاء الرفع.', 'AbortError'));
    };

    xhr.ontimeout = () => {
      reject(new Error('انتهت مهلة الرفع. تحقق من سرعة الإنترنت وحاول مجددًا.'));
    };

    xhr.onload = () => {
      let payload: { ok?: boolean; error?: string; url?: string; item?: string; file?: string; size?: number | null } = {};
      try {
        payload = JSON.parse(xhr.responseText || '{}');
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.url) {
        resolve({
          url: payload.url,
          item: payload.item || '',
          file: payload.file || safeName,
          size: payload.size ?? null,
        });
      } else {
        reject(new Error(friendlyUploadError(xhr.status, payload.error)));
      }
    };

    xhr.send(file);
  });
}
