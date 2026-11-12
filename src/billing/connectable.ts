/** Matches allowed to talk to the extension after checkout. */

export function storeConnectableMatches(
  existing: string[],
  payOrigin: string,
  storePack: boolean,
): string[] | null {
  if (!storePack) {
    const matches = new Set(existing);
    try {
      const origin = new URL(payOrigin);
      if (origin.protocol === "https:" && !origin.username && !origin.password) {
        matches.add(`${origin.origin}/*`);
      }
    } catch {
      /* keep shipped localhost for unpacked Pro */
    }
    return [...matches];
  }

  try {
    const origin = new URL(payOrigin.trim());
    if (origin.protocol === "https:" && !origin.username && !origin.password) {
      return [`${origin.origin}/*`];
    }
  } catch {
    /* no pay host yet */
  }
  return null;
}
