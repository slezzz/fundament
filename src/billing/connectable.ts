/** Matches allowed to talk to the extension after checkout. The free store package has none. */

export function storeConnectableMatches(
  existing: string[],
  payOrigin: string,
  storePack: boolean,
): string[] | null {
  if (storePack) return null;
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
