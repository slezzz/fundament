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
  export function hostnameOnly(value: unknown): string;
  export function hostsMatch(expected: unknown, found: unknown): boolean;
  export function publicRecord(input: {
    group?: string;
    index?: number;
    url?: string;
    host?: string;
    title?: string;
    text?: string;
    signals?: unknown;
    warned?: boolean;
    status?: string;
    copyClicks?: number;
    copyWarned?: boolean;
  }): {
    group: string;
    index: number;
    host: string;
    signals: string[];
    warned: boolean;
    status: string;
    copyClicks: number;
    copyWarned: boolean;
  };
  export function summary(
    records: unknown[],
    date: string,
  ): {
    date: string;
    pages: number;
    measured: number;
    notMeasured: number;
    warnings: number;
    bySignal: Record<string, { seen: number; warned: number }>;
    warningHosts: string[];
  };
  export function writeDeterministicZip(sourceDir: string, destZip: string): void;
  export function insertZipChecksum(markdown: string, sha256: string): string;
  export function freeZipProblems(bytes: Uint8Array): string[];
  export function calibrationLoop(steps: number): number;
  export function median(samples: number[]): number;
  export function withinBudget(elapsed: number, reference: number): boolean;
  export function sideDifferences(
    withExt: { pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number; failed?: boolean },
    bare: { pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number; failed?: boolean },
  ): { kind: string; items?: string[]; deltaMs?: number }[];
  export function unexplained(
    differences: { kind: string }[],
    reasons: { kind: string; text: string }[],
  ): { kind: string }[];
  export function brokenByExtension(differences: { kind: string; items?: string[] }[]): { kind: string }[];
  export const SW_STEPS: number;
  export const FRAME_STEPS: number;
  export const FRAME_COUNT: number;
  export function measurePageCost(options: {
    executablePath: string;
    dist: string;
    swSteps: number;
    frameSteps: number;
  }): Promise<{
    swMs: number[];
    swCalibration: number[];
    bridgeMs: number[];
    contentMs: number[];
    frameCalibration: number[];
    differences: { kind: string; items?: string[]; deltaMs?: number }[];
  }>;
  export function breakageSummary(rows: unknown[]): {
    pages: number;
    measured: number;
    notMeasured: number;
    warnings: number;
    broken: number;
    resourceOnly: number;
    sandboxOnly: number;
    failClasses: Record<string, number>;
  };
  export function breakageRow(
    withExt: { failed?: boolean; reason?: string; warned?: boolean; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number },
    bare: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number },
  ): { measured: boolean; broken: boolean; warned: boolean; resource?: boolean; failClass: string };
  export function netClass(error: unknown): string;
  export function bareDisagrees(left: { failed?: boolean; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number }, right: { failed?: boolean; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number }): boolean;
  export function assignCause(arms: {
    full?: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number };
    noblock?: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number };
    nobridge?: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number };
    bareA?: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number };
    bareB?: { failed?: boolean; reason?: string; pageErrors?: string[]; consoleErrors?: string[]; loadMs?: number };
  }): "ok" | "noise" | "blocking" | "bridge" | "other" | "unmeasured";
  export const LICENSE_TERM_SECONDS: number;
  export function licenseExpFromSession(session: { created?: number }, nowSec: number): number | null;
  export function isCheckoutSessionId(value: unknown): boolean;
  export function mintLicense(days?: number, extra?: { exp?: number | null; now?: number; sid?: string }): string | null;
  export function allowPayAttempt(ip: string, now?: number): boolean;
  export function resetPayLimits(): void;
  export function handlePay(req: { method?: string; socket?: { remoteAddress?: string } }, res: { writeHead: (code: number, headers?: Record<string, string>) => void; end: (chunk?: string) => void }, url: URL): Promise<boolean>;
  export function loadTargets(root: string, majesticCap?: number): {
    corpus: { host: string; url: string }[];
    docs: { host: string; url: string }[];
    majestic: { host: string; url: string }[];
  };
}
