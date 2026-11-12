import type { ThreatIntelligenceProvider, DomainResult, ThreatResult } from "@shared/types";

/** Default provider: honest unavailability. No invented listings. */
export class NullThreatIntelligence implements ThreatIntelligenceProvider {
  async checkUrl(_url: string): Promise<ThreatResult> {
    return { listed: false, source: "none", available: false };
  }

  async checkDomain(_domain: string): Promise<DomainResult> {
    return { listed: false, source: "none", available: false };
  }
}
