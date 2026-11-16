# Device-code phishing

**Recommendation: No.** The page the visitor is sent to is Microsoft’s real device-login page. Warning on that URL warns the legitimate flow. A hint from the opener tab is a single weak signal, and this project does not warn on those.

## Threat and primary source

Microsoft Security Blog, 13 February 2025, [Storm-2372 conducts device code phishing](https://www.microsoft.com/en-us/security/blog/2025/02/13/storm-2372-conducts-device-code-phishing-campaign/). The visitor is told to enter an attacker-generated code on a real Microsoft sign-in page. Microsoft’s own hunting query looks for clicks to `microsoft.com/devicelogin` and `login.microsoftonline.com/common/oauth2/deviceauth`. Those are the same URLs a real device login uses.

Microsoft Security Blog, 6 April 2026, [AI-enabled device code phishing](https://www.microsoft.com/en-us/security/blog/2026/04/06/ai-enabled-device-code-phishing-campaign-april-2026/). The phishing page shows a live code and a button to `microsoft.com/devicelogin`. The code lasts about 15 minutes. Microsoft’s write-up says detection cannot rest on the reputation of that legitimate URL.

## What the browser can see

A navigation to the real device-login URL. `webNavigation` can also see `sourceTabId` on a navigation created by another tab. This extension does not record that opener today. Download protection already uses a download referrer. That is a different event.

The code the visitor types into the Microsoft page is typed input. It is off limits. The code printed on the phishing page is page text. Reading it is not required for the decision below, and storing it would keep a live credential on disk.

## Detection

No rule in this memo is approved to build.

The opener hint the backlog names would be: a tab whose host is not Microsoft created a navigation to the device-login URL. That is one weak hint. `AGENTS.md` says a single weak hint never warns. Microsoft’s own pages, an email client, and a desktop app often have no web opener at all, so the hint is absent on both attacks and real logins.

Matching the phrase “enter this code” plus a link to the device-login URL on a non-Microsoft page collides with documentation that teaches the same flow.

## Data read

Today: nothing new.

A later hint would store the opener’s origin and the fact of a device-login navigation, locally, in session storage. It would not store the code, the path, or the query.

## Does anything leave the device

No. The opener origin must not be added to the reputation request. Reputation stays origin-of-the-page, opt-in, as it is now.

## Permissions

None. `webNavigation` is already required. No new permission.

## False alarms and the counterexample corpus

Legitimate pages in this category: Microsoft’s device-login page itself, Microsoft Learn, GitHub CLI and Azure CLI docs that say to open the device-login URL and enter a code, and a real login the user started from email. None of those are in the 22-page excerpt corpus. A warning on the URL alone fails that set by construction.

## Store policy

Same policy pages as the other memos, read 2026-11-15. No remote code and no new request. A warning that fires on Microsoft’s own login page would be a store-listing defect. That is a reason not to build it, not a wording change.

## Effort

Recording an opener is small. Proving it stays quiet on real device-login docs and on the Microsoft page is the work, and that set has not been collected. The hint also cannot warn by itself, so the user-visible result of building it is nothing until some other signal is added. That is not worth a weights change.

## Recommendation

**No.**
