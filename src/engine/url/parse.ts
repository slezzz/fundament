import { toUnicode } from "punycode";
import { MAX_HOST_LENGTH, MAX_URL_LENGTH } from "@shared/constants";
import type { ParsedUrl } from "@shared/types";

const IP_V4 =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export class UrlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlParseError";
  }
}

export function parseHttpUrl(raw: string): ParsedUrl {
  if (raw.length > MAX_URL_LENGTH) {
    throw new UrlParseError("URL exceeds maximum length");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlParseError("Malformed URL");
  }

  const protocol =
    url.protocol === "https:" ? "https:" : url.protocol === "http:" ? "http:" : "other";

  if (protocol === "other") {
    throw new UrlParseError("Unsupported scheme");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname.length > MAX_HOST_LENGTH) {
    throw new UrlParseError("Hostname exceeds maximum length");
  }

  const isIpv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const isIpLiteral = isIpv6 || IP_V4.test(hostname);

  let hostnameUnicode = hostname;
  if (!isIpLiteral) {
    try {
      hostnameUnicode = toUnicode(hostname);
    } catch {
      hostnameUnicode = hostname;
    }
  }

  return {
    href: url.href,
    protocol,
    hostname,
    hostnameUnicode,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    isIpLiteral,
    isIpv6,
    hasUserInfo: url.username.length > 0 || url.password.length > 0,
  };
}

export function percentDecodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function countPercentEncodings(value: string): number {
  return (value.match(/%[0-9a-fA-F]{2}/g) ?? []).length;
}

export function looksDoubleEncoded(value: string): boolean {
  return /%25[0-9a-fA-F]{2}/i.test(value);
}
