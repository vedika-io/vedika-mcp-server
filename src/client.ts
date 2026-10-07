import { VedikaApiError } from './errors.js';
import { SafeToolInputError } from './tool-wrapper.js';
import { MCP_SERVER_USER_AGENT } from './version.js';

const PUBLIC_API_ORIGIN = 'https://api.vedika.io';
// The sandbox is served from the same origin under /sandbox, so credentials
// still only ever go to the canonical API host.
const SANDBOX_API_BASE = `${PUBLIC_API_ORIGIN}/sandbox`;

export function resolveVedikaBaseUrl(configured: string | undefined): string {
  const raw = configured?.trim() || PUBLIC_API_ORIGIN;
  const failure = () => new Error(
    `VEDIKA_BASE_URL must be exactly ${PUBLIC_API_ORIGIN} (or ${SANDBOX_API_BASE} for the sandbox)`,
  );
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw failure();
  }

  if (
    url.origin !== PUBLIC_API_ORIGIN
    || url.search !== ''
    || url.hash !== ''
    || url.username !== ''
    || url.password !== ''
  ) {
    throw failure();
  }

  if (url.pathname === '/') return PUBLIC_API_ORIGIN;
  if (url.pathname === '/sandbox' || url.pathname === '/sandbox/') return SANDBOX_API_BASE;
  throw failure();
}

export class VedikaApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = process.env['VEDIKA_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'VEDIKA_API_KEY environment variable is required.\n' +
        'Get your API key at https://vedika.io/pricing\n' +
        'Then set it: export VEDIKA_API_KEY=vk_live_your_key_here'
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = resolveVedikaBaseUrl(process.env['VEDIKA_BASE_URL']);
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>, timeoutMs = 30_000, idempotencyKey?: string): Promise<T> {
    const batch = path === '/v2/vastu/assessments/batch' || path === '/v2/astrology/vastu/assessments/batch';
    if ((batch || idempotencyKey !== undefined) &&
        (!idempotencyKey || idempotencyKey !== idempotencyKey.trim() || !/^[\x20-\x7e]{1,200}$/.test(idempotencyKey))) {
      throw new SafeToolInputError('Send an Idempotency-Key of 1 to 200 printable ASCII characters without surrounding spaces and retain it for retries');
    }
    return this.requestWithRetry<T>('POST', path, { body, timeoutMs, idempotencyKey });
  }

  async get<T = unknown>(path: string, params?: Record<string, string>, timeoutMs = 15_000): Promise<T> {
    return this.requestWithRetry<T>('GET', path, { params, timeoutMs });
  }

  async delete<T = unknown>(path: string, timeoutMs = 15_000): Promise<T> {
    return this.requestWithRetry<T>('DELETE', path, { timeoutMs });
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    opts: { body?: Record<string, unknown>; params?: Record<string, string>; timeoutMs: number; idempotencyKey?: string },
  ): Promise<T> {
    // A billed POST is only retried when the caller supplied an Idempotency-Key:
    // without one, a 5xx or a dropped connection after the server charged would
    // charge again. GET and DELETE are retried once.
    const maxRetries = method === 'POST' && opts.idempotencyKey === undefined ? 0 : 1;
    // The only request id we ever send is the caller's own Idempotency-Key. On
    // /v2 the server treats ANY caller-sent x-request-id as an idempotency
    // claim and answers 422 IDEMPOTENCY_NOT_SUPPORTED on uncertified routes,
    // so an automatic id on every call would fail those routes.
    const requestId = opts.idempotencyKey;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.doRequest<T>(method, path, opts, requestId);
      } catch (err) {
        lastError = err;
        if (err instanceof VedikaApiError) {
          // Only retry on 5xx server errors, not 4xx client errors
          if (err.status < 500) throw err;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          // Don't retry timeouts on AI chat (already 90s)
          if (opts.timeoutMs >= 60_000) throw err;
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  private async doRequest<T>(
    method: string,
    path: string,
    opts: { body?: Record<string, unknown>; params?: Record<string, string>; timeoutMs: number; idempotencyKey?: string },
    requestId: string | undefined,
  ): Promise<T> {
    let url: string;
    if (method === 'GET' && opts.params) {
      const u = new URL(`${this.baseUrl}${path}`);
      for (const [k, v] of Object.entries(opts.params)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, v);
      }
      url = u.toString();
    } else {
      url = `${this.baseUrl}${path}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const fetchOpts: RequestInit = {
        method,
        headers: { ...this.headers(requestId), ...(opts.idempotencyKey === undefined ? {} : { 'Idempotency-Key': opts.idempotencyKey }) },
        redirect: 'manual',
        signal: controller.signal,
      };
      if (opts.body) fetchOpts.body = JSON.stringify(opts.body);

      const res = await fetch(url, fetchOpts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new VedikaApiError(res.status, data);
      return data as T;
    } catch (err) {
      if (err instanceof VedikaApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutError = new Error(`Request timed out after ${opts.timeoutMs / 1000}s — ${path}`);
        timeoutError.name = 'AbortError';
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private headers(requestId: string | undefined): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'x-api-key': this.apiKey,
      ...(requestId === undefined ? {} : { 'x-request-id': requestId }),
      'User-Agent': MCP_SERVER_USER_AGENT,
    };
  }
}
