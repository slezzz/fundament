import type { ParsedDomain, ParsedUrl, RiskSignal } from "@shared/types";
import { isOfficialAnyBrand } from "../impersonation/detect";
import { ELEVATED_RISK_TLDS } from "./patterns";
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
const AI_BRAND_RE = /chatgpt|openai|claude|anthropic|gemini|copilot|grok|perplexity/i;

function signal(
  id: string,
  weight: number,
  title: string,
  explanation: string,
): RiskSignal {
  return { id, weightApplied: weight, severity: "warn", title, explanation };
}

export function extraWeb3AiSignals(
  parsed: ParsedUrl,
  domain: ParsedDomain | null,
  impersonation: boolean,
): RiskSignal[] {
  if (domain && isOfficialAnyBrand(domain)) return [];

  const blob = `${parsed.pathname}${parsed.search}`;
  const out: RiskSignal[] = [];
  const cheapHost = Boolean(domain && ELEVATED_RISK_TLDS.has(domain.tld));
  const http = parsed.protocol === "http:";

  if (CRYPTO_SECRET_RE.test(blob)) {
    out.push(
      signal(
        "crypto-secret-url",
        WEIGHTS.cryptoSecretUrl,
        "Seed or key in the address",
        "This URL looks like a wallet recovery or private-key flow on a site that is not a catalogued official wallet. Fundament does not inspect the transaction. Do not paste a seed phrase here.",
      ),
    );
  } else if (CRYPTO_CLAIM_RE.test(blob) && (impersonation || cheapHost || http)) {
    const extra = impersonation ? WEIGHTS.cryptoBaitBoost : 0;
    out.push(
      signal(
        "crypto-claim-url",
        WEIGHTS.cryptoClaimUrl + extra,
        "Crypto claim or approval bait",
        impersonation
          ? "This address combines a brand lookalike with airdrop, mint, or wallet-connect bait. That is a common drainer pattern. Fundament does not simulate contracts or stop a signature in your wallet."
          : "This address looks like an airdrop, mint, or wallet-connect lure on an unusual host. Treat token approvals as hostile until you verified the site yourself.",
      ),
    );
  }

  if (AI_BRAND_RE.test(parsed.hostname) && AI_CRED_RE.test(blob)) {
    out.push(
      signal(
        "ai-credential-url",
        WEIGHTS.aiCredentialUrl,
        "AI login on an unofficial host",
        "This looks like a ChatGPT, Claude, or similar sign-in on a host that is not the official product domain. Do not paste an API key or account password here.",
      ),
    );
  } else if (AI_BRAND_RE.test(blob) && (AI_CRED_RE.test(blob) || impersonation) && (impersonation || cheapHost || http)) {
    out.push(
      signal(
        "ai-credential-url",
        WEIGHTS.aiCredentialUrl,
        "AI login on an unofficial host",
        "This URL dresses up as an AI product login. Official ChatGPT, Claude, and similar apps are not on this domain.",
      ),
    );
  }

  return out;
}
