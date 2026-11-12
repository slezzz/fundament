# Manual test checklist (content script & UI)

Load unpacked `dist/` after `npm.cmd run build`. Reload the extension after every build.

## HTTP honesty

- [ ] `http://example.com` is never labeled Protected
- [ ] A password field on HTTP adds “Password field on HTTP”
- [ ] Inspect verdict score is > 0 on HTTP

## Cosmetic / allowlist

- [ ] On a site with a Google ad iframe, cosmetic hide removes it when Cosmetic filtering is on
- [ ] Allowlisting the site from the interstitial or lists skips cosmetic hide after reload

## Overlay

- [ ] A page with `position:fixed; inset:0; z-index:9999` covering the viewport gets “Blocking dialog overlay” or “Viewport overlay”
- [ ] Turning Overlay protection off and reloading the tab drops that signal

## Dashboard

- [ ] Popup → Open dashboard
- [ ] Extension list shows other extensions with a risk label
- [ ] HIBP: check a known pwned password (`password`) → count > 0; the field is empty after Check
- [ ] DNS-over-HTTPS section does not claim Fundament changed DNS

## Network

- [ ] Tracker count on a news site is > 0 with tracker blocking on
- [ ] Inspect verdict lists ruleset slices (Ads & analytics, etc.)
- [ ] Pause 15 min stops blocking on that host; Resume restores it

## Downloads

- [ ] `http://example.com/setup.exe` is cancelled when download protection is on

## Regression

- [ ] chrome://extensions shows no content.js / content-search.js import error
- [ ] Google search for a lookalike (e.g. paypa1) shows a Fundament mark; the href is unchanged
- [ ] Notification-prompt block stays off until toggled; WhatsApp Web can still request notifications when off
- [ ] Popup does not show a TypeError on first open after reload
