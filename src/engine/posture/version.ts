/** Compare dotted numeric versions (131.0.6778.86). Returns -1, 0, or 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export interface ServingRelease {
  version: string;
  fraction: number;
  startTime: string;
}

export interface ChromeBaseline {
  /** Newest version Google serves to everyone (fraction 1). */
  version: string;
  /** When that version started being served to everyone. */
  since: number;
}

/**
 * Chrome rolls updates out in stages: a new major can sit at 0.5 % for days while
 * "Chrome is up to date" is correct for everyone else. The yardstick is therefore the
 * newest version served to the full population, not the newest version number.
 */
export function baselineFromReleases(releases: ServingRelease[]): ChromeBaseline | null {
  const valid = releases.filter((r) => /^\d+\.\d+\.\d+\.\d+$/.test(r.version) && Number.isFinite(r.fraction));
  if (valid.length === 0) return null;
  const full = valid.filter((r) => r.fraction >= 0.99);
  const pool = full.length > 0 ? full : [valid.reduce((a, b) => (b.fraction > a.fraction ? b : a))];
  const best = pool.reduce((a, b) => (compareVersions(b.version, a.version) > 0 ? b : a));
  const since = Date.parse(best.startTime);
  return { version: best.version, since: Number.isFinite(since) ? since : Date.now() };
}

export type VersionVerdict = "ok" | "rolling" | "outdated";

/** Grace period after a full rollout before an older Chrome counts as outdated. */
export const UPDATE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function versionVerdict(installed: string, baseline: ChromeBaseline, now = Date.now()): VersionVerdict {
  if (compareVersions(installed, baseline.version) >= 0) return "ok";
  const majorBehind = Number(baseline.version.split(".")[0]) - Number(installed.split(".")[0]);
  if (majorBehind >= 2) return "outdated";
  return now - baseline.since < UPDATE_GRACE_MS ? "rolling" : "outdated";
}
