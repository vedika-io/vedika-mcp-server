export class VedikaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(VedikaApiError.buildMessage(status, body));
    this.name = 'VedikaApiError';
  }

  // Upstream text can contain credentials or internal paths. Only a fixed set
  // of error codes and bounded numeric hints are ever turned into text for a
  // model; nothing else from the response body is echoed.
  private static fields(body: unknown): Record<string, unknown> {
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown> : {};
  }

  private static usd(value: unknown): string | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9
      ? `$${Number(value.toFixed(4))}` : undefined;
  }

  private static seconds(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 86400
      ? value : undefined;
  }

  private static walletHint(fields: Record<string, unknown>): string {
    const wallet = VedikaApiError.fields(fields.wallet);
    const required = VedikaApiError.usd(wallet.required);
    const available = VedikaApiError.usd(wallet.available);
    const deficit = VedikaApiError.usd(wallet.deficit);
    const parts = [
      required && `required ${required}`,
      available && `available ${available}`,
      deficit && `deficit ${deficit}`,
    ].filter(Boolean);
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  private static buildMessage(status: number, body: unknown): string {
    const fields = VedikaApiError.fields(body);
    const code = fields.code;
    switch (status) {
      case 400:
        return 'Invalid request. Check the tool input against its schema.';
      case 422:
        // Safe to resend once without the key: no charge was attempted.
        return code === 'IDEMPOTENCY_NOT_SUPPORTED'
          ? 'This endpoint does not accept an idempotency key. No charge was attempted. Send the request again without idempotencyKey.'
          : 'Invalid request. Check the tool input against its schema.';
      case 401:
        return 'Invalid API key. Check your Vedika API key configuration.';
      case 402:
        if (code === 'SUBSCRIPTION_EXPIRED') {
          return 'Subscription expired. Renew at https://vedika.io/dashboard';
        }
        if (typeof code === 'string' && code.startsWith('INSUFFICIENT_BALANCE')) {
          return `Insufficient wallet balance${VedikaApiError.walletHint(fields)}. Add funds at https://vedika.io/dashboard. Do not retry until the wallet is topped up.`;
        }
        return 'Payment required. Check your wallet and subscription at https://vedika.io/dashboard';
      case 403:
        return 'Access denied. Check your subscription and endpoint access.';
      case 404:
        return 'Endpoint not found. Check the tool and API configuration.';
      case 429: {
        // The body `code` says which limiter refused. The rate-limit headers
        // describe only the per-minute limiter, so they are never consulted.
        const seconds = VedikaApiError.seconds(fields.retryAfter);
        const hint = seconds === undefined ? '' : ` Retry after ${seconds}s.`;
        if (code === 'DAILY_LIMIT_EXCEEDED') {
          return 'Daily call limit reached. Do not retry until the limit resets; upgrade at https://vedika.io/pricing for a higher limit.';
        }
        return `Rate limited.${hint}`;
      }
      default:
        return Number.isInteger(status) && status >= 100 && status <= 599
          ? `Vedika API error (${status}). Try again later.`
          : 'Vedika API request failed. Try again later.';
    }
  }

  toMcpError(): { content: Array<{ type: 'text'; text: string }>; isError: true } {
    return {
      content: [{ type: 'text' as const, text: this.message }],
      isError: true,
    };
  }
}
