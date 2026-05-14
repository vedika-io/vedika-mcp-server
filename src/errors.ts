export class VedikaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(VedikaApiError.buildMessage(status, body));
    this.name = 'VedikaApiError';
  }

  private static buildMessage(status: number, body: unknown): string {
    const detail = typeof body === 'object' && body !== null && 'message' in body
      ? (body as { message: string }).message
      : JSON.stringify(body);

    switch (status) {
      case 400:
        return `Bad Request: ${detail}`;
      case 401:
        return 'Invalid API key. Get one at https://vedika.io/pricing — format: vk_live_*';
      case 402: {
        const bal = typeof body === 'object' && body !== null && 'walletBalance' in body
          ? ` ($${((body as { walletBalance: number }).walletBalance / 100).toFixed(2)} remaining)`
          : '';
        return `Insufficient wallet balance${bal}. Add funds at https://vedika.io/dashboard`;
      }
      case 403:
        return 'Subscription inactive or endpoint not included in your plan. Plans start at $12/mo: https://vedika.io/pricing';
      case 404:
        return `Endpoint not found: ${detail}`;
      case 429: {
        const info = typeof body === 'object' && body !== null && 'retryAfter' in body
          ? ` Retry after ${(body as { retryAfter: number }).retryAfter}s.`
          : '';
        return `Rate limited.${info} Upgrade your plan for higher limits: https://vedika.io/pricing`;
      }
      default:
        return `Vedika API error (${status}): ${detail}`;
    }
  }

  toMcpError(): { content: Array<{ type: 'text'; text: string }>; isError: true } {
    return {
      content: [{ type: 'text' as const, text: this.message }],
      isError: true,
    };
  }
}
