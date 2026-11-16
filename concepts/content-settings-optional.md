# Move `contentSettings` to optional permissions

**Recommendation: Yes, for this permission only.** `privacy`, `scripting`, and `management` stay required. Do not change the manifest until an update on Chrome and on Edge has shown whether a user who already granted `contentSettings` keeps that grant. That update behavior is **nicht bestätigt**.

## Threat and primary source

This is not a new attack. It is the install warning on a permission the product barely uses.

Chrome’s permission list, fetched 2026-11-15 and recorded in `RELEASE_AUDIT.md`: `contentSettings` warns “Change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera etc.” The only call site is `applyNotificationPromptBlock` in `src/background/contentSettings.ts`. It sets or clears the notification content setting. The toggle defaults off, so WhatsApp Web and calendar sites keep their prompts until the user opts in. The warning describes a much wider power than the code uses.

The same note records why the other three stay required:

- `privacy` backs `hardenBrowser`, which defaults on and runs at boot. Optional would skip WebRTC, prefetch, and hyperlink auditing on a default install.
- `management` backs `checkExtensions`, which runs at boot, not behind a toggle.
- `scripting` has no install-warning sentence on that list. Moving it removes nothing and adds a runtime prompt.

`permissions.request()` must run from a user gesture. `contentSettings` is not on Chrome’s cannot-be-optional list (`debugger`, `declarativeNetRequest`, `devtools`, `geolocation`, `mdns`, `proxy`, `tts`, `ttsEngine`), as recorded from the same pages.

## What the browser can see

Nothing about the page. The API sets a browser content setting. It does not read page content, cookies, or notification payloads.

## Detection

No detection change.

The later patch, after the update check below, would:

1. Move `contentSettings` from `permissions` to `optional_permissions`. Leave `privacy`, `scripting`, and `management` in `permissions`.
2. Request it from the options toggle’s click, not from the worker at boot.
3. If `permissions.request` returns false, leave the toggle off.
4. If `chrome.contentSettings` is missing, do not treat that as “prompts are blocked.” The current function already returns without setting anything. Keep that.
5. Update `tests/e2e/scenarios.spec.ts`, which today expects `contentSettings` inside `permissions`. That assertion is the lock. It changes in the implementation commit, not before.

## Data read

No new data. The setting is a boolean the user already stores.

## Does anything leave the device

No. No new request.

## Permissions

One move: `contentSettings` becomes optional. The other permissions in `src/manifest.json` stay where they are. `optional_permissions` is empty today.

Before release, install an older build, turn the notification toggle on, then update to the build that lists `contentSettings` as optional. Record whether Chrome and Edge keep the grant, drop it, or prompt. Do this on a real profile, not only a fresh one. The 2026-11-15 review left this **nicht bestätigt** on purpose. If the grant is dropped and the toggle still reads as on, the patch is wrong and must keep the toggle off when the permission is absent.

## False alarms and the counterexample corpus

Not a warning. The regression set is behavioral: default install still does not block notification prompts; turning the toggle on blocks them; turning it off clears the setting; denying the permission prompt leaves prompts allowed. WhatsApp Web and a calendar site are the named cases already in the source comment. They are not a new corpus.

## Store policy

Program policies were read 2026-11-15. A permission the feature does not need at install is a worse fit for “strictly necessary” than an optional permission requested from the toggle that uses it. The store listing already says the notification block is optional and off by default (`STORE_LISTING.md`, `PERMISSIONS.md`). Those sentences stay true. The dashboard permission form, if it lists `contentSettings` as a required permission, has to be updated in the same release. Whether the current form says that was not re-checked on 2026-11-17. **Nicht bestätigt.**

## Effort

Small, once the update grant is known: manifest, options click, the e2e assertion, and the listing form. No engine change, no weights change.

## Recommendation

**Yes. `contentSettings` only. Not in this commit.** `privacy`, `scripting`, and `management` stay required. Ship the manifest change only after the Chrome and Edge update check above is written down.
