declare module "*.mjs" {
  export const parseOrigin: (value: unknown) => string | null;
  export const domainToHttpsOrigin: (domain: unknown) => string | null;
  export const lookupOrigin: (
    origin: string,
    hostname: string,
    opts: { apiKey: string; mock: boolean; fetchImpl?: typeof fetch },
  ) => Promise<{ listed: boolean; source: string; available: boolean }>;
  export function verifyStripeSignature(
    rawBody: string,
    header: unknown,
    secret: string,
    nowMs?: number,
  ): boolean;
  export function emptyBillingState(): {
    orders: { sid: string; customer: string; sub: string; pi: string }[];
    revokedSid: string[];
    revokedSub: string[];
    revokedCustomer: string[];
  };
  export function applyStripeEvent(
    state: ReturnType<typeof emptyBillingState>,
    event: { type?: string; data?: { object?: Record<string, unknown> } },
  ): ReturnType<typeof emptyBillingState>;
  export function licenseIsRevoked(
    state: ReturnType<typeof emptyBillingState>,
    ids: { sid?: string; sub?: string },
  ): boolean;
  export function canonical(version: number, generated: string, hosts: string[]): string;
  export function keepHost(host: string): boolean;
  export function registrableOf(host: string): string | null;
}
