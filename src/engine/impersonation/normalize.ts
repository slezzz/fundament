import { foldConfusables } from "../homograph/detect";

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const cur = new Array<number>(cols);

  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        (cur[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j < cols; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[b.length] ?? b.length;
}

export function normalizeToken(value: string): string {
  return foldConfusables(value)
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

export function similarToBrandToken(label: string, token: string): boolean {
  const nLabel = normalizeToken(label);
  const nToken = normalizeToken(token);
  if (nLabel.length < 4 || nToken.length < 4) {
    return nLabel === nToken && nLabel.length >= 3;
  }
  if (nLabel.includes(nToken) || nToken.includes(nLabel)) {
    return true;
  }
  const distance = levenshtein(nLabel, nToken);
  const threshold = nToken.length <= 5 ? 1 : 2;
  return distance <= threshold && Math.abs(nLabel.length - nToken.length) <= 2;
}
