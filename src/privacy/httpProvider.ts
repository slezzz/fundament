import type { DomainResult, ThreatIntelligenceProvider, ThreatResult } from "@shared/types";

const DEFAULT_TIMEOUT_MS = 1500;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface HttpThreatIntelligenceOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

function unavailable(source = "fundament-reputation"): DomainResult {
  return { listed: false, source, available: false };
}

function parseResult(value: unknown): DomainResult {
  if (typeof value !== "object" || value === null) {
    return unavailable();
  }
  const o = value as Record<string, unknown>;
  if (typeof o.listed !== "boolean" || typeof o.available !== "boolean") {
    return unavailable();
  }
  const source = typeof o.source === "string" && o.source.length <= 64 ? o.source : "unknown";
  if (!/^[a-z0-9._-]+$/i.test(source)) {
    return unavailable();
  }
  return { listed: o.listed, available: o.available, source };
}

/**
 * Calls the Fundament reputation service. Never holds API keys.
 * Treats every response as untrusted input.
 */
export class HttpThreatIntelligence implements ThreatIntelligenceProvider {
  private readonly cache = new Map<string, { until: number; result: DomainResult }>();
  private readonly inflight = new Map<string, Promise<DomainResult>>();

  constructor(private readonly options: HttpThreatIntelligenceOptions) {}

  async checkUrl(url: string): Promise<ThreatResult> {
    return this.lookup(url);
  }

  async checkDomain(domain: string): Promise<DomainResult> {
    return this.lookup(`https://${domain}`);
  }

  private async lookup(origin: string): Promise<DomainResult> {
    const base = this.options.baseUrl.replace(/\/$/, "");
    if (!base) {
      return unavailable();
    }

    const now = this.options.now ?? Date.now;
    const cached = this.cache.get(origin);
    if (cached && cached.until > now()) {
      return cached.result;
    }

    const pending = this.inflight.get(origin);
    if (pending) {
      return pending;
    }

    const request = this.fetchOrigin(base, origin)
      .then((result) => {
        if (result.available) {
          this.cache.set(origin, { until: now() + CACHE_TTL_MS, result });
        }
        return result;
      })
      .finally(() => {
        this.inflight.delete(origin);
      });

    this.inflight.set(origin, request);
    return request;
  }

  private async fetchOrigin(base: string, origin: string): Promise<DomainResult> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      const response = await fetchImpl(`${base}/v1/reputation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ origin }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        return unavailable();
      }
      const json: unknown = await response.json();
      return parseResult(json);
    } catch {
      return unavailable();
    }
  }
}
