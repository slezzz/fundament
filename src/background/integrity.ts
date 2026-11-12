import {
  fingerprintPackage,
  INTEGRITY_FILES,
  sha256HexBytes,
} from "@engine/integrity/selfCheck";
import {
  loadInstallFingerprint,
  saveInstallFingerprint,
  saveIntegrityStatus,
  statusFromFingerprint,
  type IntegrityStatus,
} from "@storage/integrity";

export async function runIntegrityCheck(reason: "install" | "startup"): Promise<IntegrityStatus> {
  const files: Record<string, string> = {};
  for (const name of INTEGRITY_FILES) {
    try {
      const response = await fetch(chrome.runtime.getURL(name));
      if (!response.ok) continue;
      files[name] = await sha256HexBytes(await response.arrayBuffer());
    } catch {
      /* missing file */
    }
  }
  const actual = await fingerprintPackage(files);
  let expected = await loadInstallFingerprint();
  if (!expected || reason === "install") {
    await saveInstallFingerprint(actual);
    expected = actual;
  }
  const status = statusFromFingerprint(expected, actual);
  await saveIntegrityStatus(status);
  return status;
}
