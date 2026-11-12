import type { ThreatIntelligenceProvider, DomainResult, ThreatResult } from "@shared/types";
import { NullThreatIntelligence } from "@engine/reputation/null-provider";
import { originOnly } from "./sanitize";

/**
 * Wraps a provider so remote calls never receive path/query/userinfo.
 */
export class ThreatIntelligenceClient implements ThreatIntelligenceProvider {
  constructor(private readonly inner: ThreatIntelligenceProvider = new NullThreatIntelligence()) {}

  async checkUrl(url: string): Promise<ThreatResult> {
    const origin = originOnly(url);
    if (!origin) {
      return { listed: false, source: "none", available: false };
    }
    return this.inner.checkUrl(origin);
  }

  async checkDomain(domain: string): Promise<DomainResult> {
    const host = domain.toLowerCase().trim();
    if (!host || host.includes("/") || host.includes("?")) {
      return { listed: false, source: "none", available: false };
    }
    return this.inner.checkDomain(host);
  }
}
