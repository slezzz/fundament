export type ExtensionRiskLevel = "low" | "medium" | "high" | "critical";

export interface ExtensionRisk {
  id: string;
  name: string;
  enabled: boolean;
  installType: string;
  level: ExtensionRiskLevel;
  reasons: string[];
}

const CRITICAL = new Set(["debugger", "nativeMessaging", "proxy", "webRequest", "webRequestBlocking", "userScripts"]);
const HIGH = new Set([
  "cookies",
  "history",
  "management",
  "privacy",
  "tabCapture",
  "clipboardRead",
  "geolocation",
  "webNavigation",
  "declarativeNetRequestWithHostAccess",
  "scripting",
]);
const HOST_WIDE = ["<all_urls>", "*://*/*", "http://*/*", "https://*/*"];

export function scoreExtensionPermissions(
  permissions: string[],
  hostPermissions: string[],
  installType = "",
): { level: ExtensionRiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level: ExtensionRiskLevel = "low";

  for (const perm of permissions) {
    if (CRITICAL.has(perm)) {
      reasons.push(`critical API: ${perm}`);
      level = "critical";
    } else if (HIGH.has(perm) && level !== "critical") {
      reasons.push(`sensitive API: ${perm}`);
      level = "high";
    }
  }

  if (hostPermissions.some((h) => HOST_WIDE.includes(h))) {
    reasons.push("can read data on almost every site");
    if (level === "low") level = "medium";
    if (permissions.includes("scripting") || permissions.includes("tabs") || permissions.includes("scripting")) {
      if (level !== "critical") level = "high";
    }
  }

  if (
    hostPermissions.some((h) => HOST_WIDE.includes(h)) &&
    (permissions.includes("cookies") || permissions.includes("webRequest") || permissions.includes("debugger"))
  ) {
    reasons.push("wide host access plus session or traffic APIs — extension-to-extension and session theft surface");
    if (level !== "critical") level = "high";
  }

  if (installType === "sideload" || installType === "development") {
    reasons.push("not installed from the Chrome Web Store");
    if (level === "low") level = "medium";
  }

  return { level, reasons };
}
