import type { ParsedDomain, ParsedUrl } from "@shared/types";
import { BRANDS } from "../impersonation/brands";
import { isOfficialBrandHost } from "../impersonation/detect";

/**
 * Free / user-content hosting where anyone can publish a page under a trusted-looking
 * parent domain. Most phishing kits today live here, not on freshly registered domains.
 * Hosting alone is NOT a risk signal; it only amplifies brand or credential signals.
 */
export const FREE_HOSTING_SUFFIXES = [
  "pages.dev", "workers.dev", "r2.dev", "vercel.app", "netlify.app", "github.io", "gitlab.io",
  "firebaseapp.com", "web.app",
  "glitch.me", "repl.co", "replit.app", "replit.dev", "codesandbox.io", "csb.app", "stackblitz.io", "surge.sh",
  "000webhostapp.com", "weebly.com", "weeblysite.com", "wixsite.com", "webflow.io", "blogspot.com",
  "wordpress.com", "carrd.co", "notion.site", "framer.app", "framer.website", "jimdosite.com", "jimdofree.com",
  "square.site", "godaddysites.com", "mystrikingly.com", "gitbook.io", "typedream.app",
  "translate.goog", "ngrok-free.app", "ngrok.io", "ngrok.app", "trycloudflare.com", "loca.lt", "serveo.net",
  "ipfs.io", "dweb.link", "cloudflare-ipfs.com", "ipfs.w3s.link", "nftstorage.link", "fleek.co", "on-fleek.app",
  "4everland.app", "pinata.cloud", "mypinata.cloud", "bubbleapps.io", "softr.app", "glideapp.io", "zohosites.com",
  "yolasite.com", "site123.me", "tilda.ws", "webnode.page", "ucraft.site", "start.page",
  "forms.gle", "hubspotpagebuilder.com",
  "my.canva.site", "canva.site", "page.link", "lovable.app",
];

/**
 * Cloud platforms that host real company apps *and* lots of kits. Only context:
 * they make a weak brand hint count, but a login form there is not suspicious by itself.
 */
export const CLOUD_APP_SUFFIXES = [
  "appspot.com", "herokuapp.com", "onrender.com", "fly.dev", "railway.app", "azurewebsites.net",
  "web.core.windows.net", "blob.core.windows.net", "azurestaticapps.net", "cloudfront.net", "s3.amazonaws.com",
  "amplifyapp.com", "storage.googleapis.com", "firebasestorage.googleapis.com", "run.app", "cloudfunctions.net",
  "digitaloceanspaces.com", "ondigitalocean.app", "backblazeb2.com", "wasabisys.com",
];

/** Google properties where the path, not the host, decides what you are looking at. */
const PATH_HOSTED = [
  { host: "sites.google.com", prefix: "/" },
  { host: "docs.google.com", prefix: "/forms/" },
  { host: "docs.google.com", prefix: "/presentation/" },
  { host: "docs.google.com", prefix: "/drawings/" },
  { host: "script.google.com", prefix: "/" },
  { host: "script.googleusercontent.com", prefix: "/" },
  { host: "storage.googleapis.com", prefix: "/" },
  { host: "firebasestorage.googleapis.com", prefix: "/" },
  { host: "ipfs.io", prefix: "/ip" },
  { host: "cloudflare-ipfs.com", prefix: "/ip" },
  { host: "dweb.link", prefix: "/ip" },
  { host: "gateway.pinata.cloud", prefix: "/ip" },
  { host: "forms.office.com", prefix: "/" },
  { host: "forms.microsoft.com", prefix: "/" },
];

/** Site builders, static hosts, tunnels, IPFS, form services. `pathname` narrows path-hosted Google/Microsoft pages. */
export function freeHostingSuffix(hostname: string, pathname?: string): string | null {
  const host = hostname.toLowerCase();
  for (const item of PATH_HOSTED) {
    if (host === item.host && (pathname === undefined || pathname.toLowerCase().startsWith(item.prefix))) return item.host;
  }
  for (const suffix of FREE_HOSTING_SUFFIXES) {
    // Only user subdomains count: the platform's own login (wordpress.com) is not hosted content.
    if (host.endsWith(`.${suffix}`) && !host.startsWith("www.")) return suffix;
  }
  return null;
}

export function cloudAppSuffix(hostname: string): string | null {
  const host = hostname.toLowerCase();
  for (const suffix of CLOUD_APP_SUFFIXES) {
    if (host.endsWith(`.${suffix}`) || host === suffix) return suffix;
  }
  return null;
}

export function isPathHosted(parsed: ParsedUrl): boolean {
  const host = parsed.hostname.toLowerCase();
  return PATH_HOSTED.some((item) => host === item.host && parsed.pathname.toLowerCase().startsWith(item.prefix));
}

/**
 * Brand named in the path or subdomain of user-hosted content:
 * sites.google.com/view/paypal-verify, ipfs.io/ipfs/Qm…/microsoft365.html.
 */
export function brandInHostedContent(parsed: ParsedUrl, domain: ParsedDomain | null): string | null {
  if (!freeHostingSuffix(parsed.hostname, parsed.pathname) && !cloudAppSuffix(parsed.hostname)) return null;
  const haystack = `${domain?.subdomain ?? ""}/${decodeSafe(parsed.pathname)}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const words = ` ${haystack} `;
  for (const brand of BRANDS) {
    if (domain && isOfficialBrandHost(domain, brand)) continue;
    for (const token of brand.tokens) {
      if (token.length < 5) continue;
      if (words.includes(` ${token} `) || new RegExp(`(^|[^a-z])${token}`).test(haystack)) {
        return brand.name;
      }
    }
  }
  return null;
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
