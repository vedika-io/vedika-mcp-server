export class VedikaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(VedikaApiError.buildMessage(status, body));
    this.name = 'VedikaApiError';
  }

  private static buildMessage(status: number, body: unknown): string {
    // Upstream text can contain credentials or internal paths. Only known
    // categories and bounded numeric hints are safe to return to a model.
    const fields = typeof body === 'object' && body !== null
      ? body as Record<string, unknown> : {};
    switch (status) {
      case 400:
      case 422:
        return 'Invalid request. Check the tool input against its schema.';
      case 401:
        return 'Invalid API key. Check your Vedika API key configuration.';
      case 402:
        return fields.code === 'SUBSCRIPTION_EXPIRED'
          ? 'Subscription expired. Renew at https://vedika.io/dashboard'
          : 'Payment required. Check your wallet and subscription at https://vedika.io/dashboard';
      case 403:
        return 'Access denied. Check your subscription and endpoint access.';
      case 404:
        return 'Endpoint not found. Check the tool and API configuration.';
      case 429: {
        const seconds = fields.retryAfter;
        const hint = typeof seconds === 'number' && Number.isFinite(seconds)
          && seconds >= 0 && seconds <= 86400
          ? ` Retry after ${seconds}s.` : '';
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
