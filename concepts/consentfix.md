# ConsentFix

**Recommendation: No.** Do not add a detector. The step that finishes the attack is a URL the user pastes into the page. This extension does not read typed values or the user’s clipboard. The URL the browser can see without that paste is also how real apps finish a loopback login.

## Threat and primary source

Push Security, Luke Jennings, 11 December 2025, [ConsentFix](https://pushsecurity.com/blog/consentfix). A page sends the visitor to a real Microsoft authorize URL for the Azure CLI app. Microsoft redirects to `http://localhost` with an authorization code in the query. Nothing is listening, so the browser shows an error and leaves the URL in the address bar. The page tells the visitor to copy that URL and paste it back. The attacker redeems the code. No password is entered on the phishing host. If a Microsoft session already exists, the real login page may not ask for MFA.

Glück & Kanja, 31 December 2025, describes a later variant in which the visitor drags the URL instead of pasting it. The video behind that claim was not watched. Treat the drag variant as **nicht bestätigt** here.

## What the browser can see

The authorize navigation goes to a real Microsoft host. The loopback navigation is `http://localhost` or `http://127.0.0.1` with a `code` query. `webNavigation` and `tabs` already observe main-frame URLs. The paste into the phishing page is typed input. The drag variant moves that URL into the page without a navigation.

`oauth-proxy` in `src/engine/url/kits.ts` does not cover this. It fires only when a non-popular, non-official host carries a nested IdP URL. The authorize hop is the official host, so that check returns nothing. The loopback URL is not an IdP host either.

## Detection

No rule in this memo is approved to build.

A later design, if a corpus exists, would look only at a link on a non-Microsoft page whose target is the Microsoft authorize endpoint and whose `redirect_uri` is localhost or `127.0.0.1`. It would not read the code, not store it, and not warn on the localhost navigation itself. A localhost URL with `code=` is not sufficient: native apps use that shape on purpose.

## Data read

Today: nothing new. The worker already sees main-frame URLs for analysis.

A later link check would read the link target on the page, locally. It would not read the address-bar code, a form field, or the clipboard.

## Does anything leave the device

No. Reputation, when enabled, sends the origin only. An authorization code must never be sent, logged, or written to storage. That is a constraint on any later design, not a feature of one.

## Permissions

None. `webNavigation`, `tabs`, and host access are already required. No new permission and no new request.

## False alarms and the counterexample corpus

Legitimate pages in this category: Azure CLI and other public-client docs that show an authorize URL with a localhost `redirect_uri`, and real loopback logins that land on `http://127.0.0.1/?code=`. Localhost dev servers are already a known false-alarm class (changelog). There is no corpus of those pages. Do not invent one by special-casing a vendor host.

## Store policy

Program policies and the MV3 remote-code rule were read 2026-11-15. This design adds no remote code and no new network request. It is still a new warning about sign-in, so the store listing would have to name it before any code shipped. Listing text is a later change, not this memo.

## Effort

A link-target check is small. The corpus is the work: real CLI and “sign in with a browser” docs, plus loopback navigations that must stay quiet. That corpus does not exist. Building the check first would guess.

## Recommendation

**No.**
