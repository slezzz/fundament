import type { ParsedDomain, ParsedUrl, RiskSignal } from "@shared/types";
import { isOfficialAnyBrand } from "../impersonation/detect";
import { ELEVATED_RISK_TLDS } from "./patterns";
import { textSignal } from "../i18n/signal";
import { WEIGHTS } from "../risk/weights";

/**
 * URL-shape traps for AI credential phishing and crypto drain bait.
 * This does not read wallets, simulate contracts, or rewrite transactions.
 */
const CRYPTO_SECRET_RE =
  /seed.?phrase|secret.?phrase|recovery.?phrase|mnemonic|private.?key|wallet.?seed|12.?word|24.?word/i;
const CRYPTO_CLAIM_RE =
  /airdrop|free.?mint|claim.?nft|claim.?token|connect-wallet|walletconnect|approve.?token|permit2|drain/i;
const AI_CRED_RE =
  /\/(login|signin|sign-in|auth|oauth|session|api.?key|apikey)(\/|$)/i;
const AI_BRAND_RE = /(^|[^a-z0-9])(chatgpt|openai|claude|anthropic|gemini|copilot|grok|perplexity)([^a-z0-9]|$)/i;
const AI_BRANDS = new Set(["chatgpt", "openai", "claude", "anthropic", "gemini", "copilot", "grok", "perplexity"]);

/** Whole hostname parts only: capgemini, ngrok, and copilotkit are not AI brand logins. */
function hostNamesAiBrand(hostname: string): boolean {
  return hostname
    .toLowerCase()
    .split(/[.-]/)
    .some((part) => AI_BRANDS.has(part));
}


export function extraWeb3AiSignals(
  parsed: ParsedUrl,
  domain: ParsedDomain | null,
  impersonation: boolean,
  popular = false,
): RiskSignal[] {
  // Established sites publish articles like /what-is-a-seed-phrase; URL shape is no signal there.
  if (popular || (domain && isOfficialAnyBrand(domain))) return [];

  const blob = `${parsed.pathname}${parsed.search}`;
  const out: RiskSignal[] = [];
  const cheapHost = Boolean(domain && ELEVATED_RISK_TLDS.has(domain.tld));
  const http = parsed.protocol === "http:";

  if (CRYPTO_SECRET_RE.test(blob)) {
    out.push(
      textSignal("crypto-secret-url", "crypto-secret-url", WEIGHTS.cryptoSecretUrl, "warn"),
    );
  } else if (CRYPTO_CLAIM_RE.test(blob) && (impersonation || cheapHost || http)) {
    const extra = impersonation ? WEIGHTS.cryptoBaitBoost : 0;
    out.push(
      textSignal("crypto-claim-url", "crypto-claim-url", WEIGHTS.cryptoClaimUrl + extra, "warn"),
    );
  }

  if (hostNamesAiBrand(parsed.hostname) && AI_CRED_RE.test(blob)) {
    out.push(
      textSignal("ai-credential-url", "ai-credential-url", WEIGHTS.aiCredentialUrl, "warn"),
    );
  } else if (AI_BRAND_RE.test(blob) && (AI_CRED_RE.test(blob) || impersonation) && (impersonation || cheapHost || http)) {
    out.push(
      textSignal("ai-credential-url", "ai-credential-url", WEIGHTS.aiCredentialUrl, "warn"),
    );
  }

  return out;
}
