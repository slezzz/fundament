/**
 * The store-zip run loads the unpacked fundament-store.zip and runs tests/e2e/live.spec.ts
 * and tests/e2e/store-free.spec.ts. These are the scenarios that stay on the dev build,
 * with the reason each one is not a store-zip test.
 */
export const storeZipExcluded: { id: string; reason: string }[] = [
  {
    id: "page-cost",
    reason:
      "The store zip strips the timing marks. The page budget is measured on a dev build with VITE_FUNDAMENT_MARKS=1.",
  },
  {
    id: "dev-package-shape",
    reason:
      "tests/e2e/scenarios.spec.ts reads dist/ from the development build. The store manifest drops the scripting permission and content-shield.js; storeOmitProblems checks that cut on the packed zip.",
  },
  {
    id: "fingerprint-shield",
    reason:
      "content-shield.js is not in the store zip. Turning the shield on would test a feature the launch build must not contain.",
  },
  {
    id: "cosmetic-hiding",
    reason:
      "The cosmetic stylesheet is a store-omit cut. The packed zip must not contain fundament-cosmetic, and no scenario expects an ad to be hidden.",
  },
  {
    id: "extended-trackers",
    reason: "trackers-extended.json and trackers-plus.json are not in the store zip. The launch build does not ship that catalog.",
  },
  {
    id: "license-and-plan",
    reason:
      "The store build cannot activate a license. store-free.spec.ts, against the unpacked zip, checks that no page shows Pro, Upgrade, or a license field.",
  },
  {
    id: "security-level",
    reason: "Relaxed and Strict are not in the store package. No store scenario switches them.",
  },
];

/** Detection the store package must still do. The titles are the live.spec.ts tests. */
export const storeZipDetection = [
  "a ClickFix fake captcha cannot put its command on the clipboard",
  "a weak command stays on a popular install page when the instruction is only a picture",
  "a fake browser-crash page cannot copy a shell command",
  "a page that claims to be Microsoft and asks for a password is stopped",
  "a brand-lookalike sign-in URL is stopped before the page is used",
  "a page that replaces one builtin still cannot copy a lure",
  "a sealed attachShadow still behaves on a page of custom elements",
  "a host from the shipped phishing feed is redirected, and Continue works",
  "a program downloaded over plain HTTP is cancelled",
  "an unlimited token approval asks before it reaches the wallet, and cancel drops it",
  "a Permit signature asks before it reaches the wallet",
  "eth_sign asks before it reaches the wallet",
  "a chain id, an account list, and a small approval reach the wallet with no question",
  "a page message to the bridge cannot turn the wallet question off",
];
