/** The free store package. Pro rules, the page-world shield permission, and checkout origins stay out. */

const PRO_RULES = new Set(["trackers-extended", "trackers-plus"]);

export interface StoreManifestShape {
  permissions?: string[];
  externally_connectable?: { matches: string[] };
  declarative_net_request?: { rule_resources?: { id: string; enabled?: boolean; path?: string }[] };
}

export function storeManifest<T extends StoreManifestShape>(manifest: T): T {
  const next = structuredClone(manifest);
  delete next.externally_connectable;
  if (next.permissions) next.permissions = next.permissions.filter((name) => name !== "scripting");
  const rules = next.declarative_net_request?.rule_resources;
  if (rules) {
    next.declarative_net_request = {
      ...next.declarative_net_request,
      rule_resources: rules.filter((rule) => !PRO_RULES.has(rule.id)),
    };
  }
  return next;
}
