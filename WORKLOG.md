# Work log

Newest first. One entry per pass.

## 2026-11-17 — Measure page signals on whole pages

- Hypothesis: counts from 22 text excerpts describe page signals on real pages.
- Result: They do not. Edge opened 629 public pages with the built extension (22 corpus URLs, 107 install and support pages, 500 homepages). 536 loaded. 93 did not, and those are not counted as clean. One page warned: `berkeley-humanoid-lite.gitbook.io`, signal `clickfix-unseen`, after a button named only “Copy”. The excerpt of that page already contains the command, and the excerpt test stays quiet. ClickFix context, tech-support, prompt injection, browser-in-the-browser, and keyboard lock did not fire. 32 copy buttons were clicked. The other 31 did not warn.
- Evidence: the sanitizer test failed while the script was missing, then passed. A first Edge run died after ~50 pages and was not kept. The run that was kept recycled the browser and capped each page. `RELEASE_AUDIT.md` has the counts. The raw file is gitignored. Weights unchanged.
- Open doubt: why the live GitBook command was not “shown” when the excerpt contains it. Not fixed here. A picture lure and a shadow lure behind enough on-screen elements remain open from earlier passes.

### Self-check

- Real user, real attack: No new block. The run found one real doc page that already warns.
- Five-minute bypass: A page that never finishes loading is counted as not measured, which is the bypass of a false “0”. Those 93 are listed apart from the 536. Tested, not only named.
- False alarm: `berkeley-humanoid-lite.gitbook.io` is one. Popular homepages that loaded did not warn.
- Simpler or more complicated: A local script and a summary. The engine did not grow.
- AGENTS.md: Nothing new is sent. The script does not remap DNS. It is not in CI. Page text stays out of the repo.
- Would I defend it: Yes, as “536 real pages, 1 warning, 93 unknown.” Not as “page signals are clean.”
- Harmless on weird input: A path, a query, or a title cannot land in the stored record. The test checks that.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The measurement reads the extension’s own tab record (signal ids and band). A page can fail to load, and that is counted as not measured. It cannot mark itself clean.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The copy button and whether the command is readable text. Both belong to the page. The GitBook warning is that disagreement.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? The GitBook page that documents a Windows install command, and the other hosting-zone docs in the same run that stayed up.
- Richtig: Gemessen. Der Test war rot, bevor das Skript existierte, und die Edge-Läufe haben die Zahlen erzeugt. Der erste Lauf mit dem toten Browser zählt nicht.
- Gut für das Vorhaben: Ein Prüfer kann den Commit verteidigen, weil er eine echte Seite nennt und die 93 Ausfälle nicht als sauber verbucht. Er macht die Erweiterung nicht größer. Er macht die Behauptung ehrlicher.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Eine Seite, die nicht lädt, darf nicht als „0 Warnungen“ gelten. Getestet: 93 Seiten stehen getrennt. Ein Köder, den der lesbare Walk für gezeigt hält, obwohl niemand ihn lesen kann, ist der ältere Bypass und war nicht dieser Durchgang.

Urteil: BEHALTEN

## 2026-11-17 — Decision memos, no detectors

- Hypothesis: ConsentFix, device-code phishing, an extension-id list, and an optional `contentSettings` permission are each ready to code.
- Result: Three are not. ConsentFix ends in a paste this extension must not read, and a localhost `code=` URL is also a real loopback login (Push Security, 11 December 2025). Device-code phishing sends the visitor to Microsoft’s own device-login URL (Microsoft, 13 February 2025 and 6 April 2026); an opener hint would be one weak signal. An id blocklist has no licensed ids, and the permission diff already covers extension changes. `contentSettings` is the one yes: it defaults off, and its install warning describes a wider power than notification prompts. `privacy`, `scripting`, and `management` stay required. The manifest was not changed. Whether an update keeps an existing `contentSettings` grant is **nicht bestätigt**.
- Evidence: `concepts/consentfix.md`, `concepts/device-code.md`, `concepts/extension-blocklist.md`, `concepts/content-settings-optional.md`. No engine change. Weights unchanged.
- Open doubt: the update-grant behavior, and the current store-dashboard permission form. Neither was re-checked on 2026-11-17.

### Self-check

- Real user, real attack: A ConsentFix paste and a device-code login on Microsoft’s own page are not new warnings. An extension that gains a dangerous permission is still the existing local notice.
- Five-minute bypass: Not applicable. No new check was added to bypass.
- False alarm: The declined checks would have warned on loopback logins, device-login docs, and Microsoft’s own page. Those pages were not collected, which is why the checks stay unbuilt.
- Simpler or more complicated: Four memos. The permission diff and the notification toggle stay as they are.
- AGENTS.md: Nothing new is sent. No new permission. No id was added to a list.
- Would I defend it: Yes, as “these three do not get a detector, and `contentSettings` waits for an update check.” Not as “the attacks are handled.”
- Harmless on weird input: No new parser. The manifest test still expects `contentSettings` in `permissions`.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? ConsentFix’s finishing move is a paste. Device-code’s destination is a real Microsoft URL the attacker does not have to hide. An id list would depend on ids the project does not have a license to ship.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? No new check. The declined ConsentFix idea would have depended on a link the page controls, which is why a docs page sits in the same category.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? Azure CLI docs and real loopback logins. Microsoft’s device-login page and CLI docs that tell you to open it. Ordinary extensions that merely share a permission with a kit. None of those should get a new warning from this pass.

## 2026-11-16 — Read the visible lure before filler shadow roots

- Hypothesis: the 12 ms walk reads every open shadow root before `::before` / `::after`, so filler roots can hide a lure the visitor can see.
- Result: Confirmed. A page with 2 000 open shadow roots of filler text, and “Press Windows + R” in an on-screen `::before`, stayed up. The walk now reads the clicked element, its ancestors, and other on-screen elements first, then open shadows, then closed ones. The shown-command whitespace class is the same string in `commandIsShown` and `weakCommandIsShown`. The hosted-doc test passes that visible result into the worker check instead of a hardcoded `true`.
- Evidence: the filler page was red (8 s on the page) and then reaches `warning.html` in the same click, under a second. The older shadow, CSS, picture, and github.io cases still pass. Weights unchanged.
- Open doubt: thousands of on-screen elements can still spend the 12 ms before a later shadow lure. A `::before` with no box is still skipped. Text below the fold is not in the first pass.

### Self-check

- Real user, real attack: A page that hides the Win+R line in a visible `::before` and pads the document with open shadow roots still cannot copy the weak command.
- Five-minute bypass: Put the instruction in a shadow root after enough on-screen elements to spend the 12 ms, or in a `::before` that has no box.
- False alarm: No new signal. A component page is only blocked when the visible text is actually a lure. The github.io doc and the 29 hosted-doc lines stay quiet.
- Simpler or more complicated: The same walk, in a different order, plus the click target. The string comparison did not change.
- AGENTS.md: Still local. Nothing new is sent. No new permission. The page cannot turn the check off by adding shadow roots.
- Would I defend it: Yes, as “what the visitor can see is read first.” Not as “every shadow on a huge page is read.”
- Harmless on weird input: A click target that is not an element is ignored. A throw in one pass does not drop text already collected.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From generated text on screen and near the click, then from shadow text if time remains. A picture, a canvas, a cross-origin frame, or a `::before` with no box is still invisible. Enough on-screen elements can still crowd out a later shadow.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The click target is read through the captured `target` getter. Which nodes exist still belongs to the page.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? A page built from many components, such as `github.com` or `youtube.com`. It stays quiet unless the visible text is a lure. A docs page that shows “Press Windows + R” and also copies an install command would be blocked; that pair is not in the 22 excerpts.

## 2026-11-16 — Unreadable text is not a shown command

- Hypothesis: `commandIsShown` treats `innerText` as proof the visitor can read the command, so a hosting-zone page can print it in the background color, at 1 px, at opacity 0, off-screen, or clipped, and the copy is left alone.
- Result: Confirmed on `b4c387e`. All five pages stayed up. The bridge now walks text nodes and counts a node only when it has area, the font is at least 8 px, opacity is over 0.1, contrast against the background is at least 3:1, the box is not parked off the side of the viewport, and overflow or `clip` does not cover it. Readable pieces are joined, so a highlighted code block still counts.
- Evidence: the five pages were red (8 s on the page) and then reach `warning.html`. The github.io doc stays up, including the command split across one span per word. The hosted-doc lines stay at 0 warnings. Weights unchanged.
- Open doubt: the walk stops at 12 ms or 2 000 text nodes and then falls back to `innerText`. A page that spends that budget before the unreadable command is still treated as a doc. Text below the fold still counts. A pale color under 3:1 on white, such as yellow, does not.

### Self-check

- Real user, real attack: A picture lure on a user site that also prints the install command in white on white, at 1 px, or at opacity 0 still reaches the warning screen.
- Five-minute bypass: Put enough other text in front of the unreadable command that the 12 ms walk stops, or draw the command in a picture.
- False alarm: The github.io page with a normal code block stays up, and so does the same command split across spans. The 29 hosted-doc lines stay quiet. Weights unchanged.
- Simpler or more complicated: One readable-text walk in the copy handler, using the functions captured before page scripts. The string check in the engine is unchanged, because the corpus has no styles.
- AGENTS.md: Still local. The signal is still only the name `clickfix-weak`. Nothing new is sent. No new permission.
- Would I defend it: Yes, as “shown means a person could read it.” Not as “every command on a huge page is classified.”
- Harmless on weird input: If the style walk throws, the old `innerText` check is used. A missing DOM function skips the new walk.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From the text node and its computed style, read through the captured functions. A picture, a canvas, or a cross-origin frame is still invisible. A budget spent on other nodes falls back to `innerText`, which still counts unreadable text.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The style and box reads go through the captured `getComputedStyle`, `getPropertyValue`, `getBoundingClientRect`, and the rect getters. What still belongs to the page is which nodes exist.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? A documentation page that shows the install command in ordinary type, including a highlighted block with one span per word. `project-docs.github.io` in the browser test is that page. A command printed in a pale color under 3:1 would be treated as hidden; none of the 29 lines is that.

## 2026-11-16 — Page scripts cannot replace the bridge's functions

- Hypothesis: the bridge decides in the page's world and calls functions the page can replace after load, so one assignment turns the clipboard check off.
- Result: Confirmed for `RegExp.prototype.test`, the `innerText` getter, `performance.now`, and `getBoundingClientRect`. Each of those four pages stayed up. The bridge now captures the functions it uses before page scripts run and calls them through `Reflect.apply`. `test` is not used: it looks up `exec`, so matching goes through the captured `exec` on a fresh regexp. `::before` text is read with `getPropertyValue`, because `content` is not a prototype getter.
- Evidence: the four override pages were red on `c22bbf4` (8 s on the page) and reach `warning.html` after the change. The older shadow, CSS, picture, crash, and github.io cases still pass. `tests/security/bridge-natives.test.ts` fails if a later edit calls a method that was not captured.
- Open doubt: a fresh regexp's own `lastIndex` is assigned, not redefined, because the property is not configurable. A getter we did not list is still the page's. The test covers method calls and the getters `innerText`, `textContent`, `isTrusted`, `shadowRoot`, and the rect edges.

### Self-check

- Real user, real attack: A page that replaces `RegExp.prototype.test` still cannot copy a hidden PowerShell command. A page that blanks `innerText` still cannot copy a weak command next to a visible Win+R line.
- Five-minute bypass: Replace a getter the bridge still reads as a property, or poison something the captured `exec` itself looks up. `test` and `Symbol.replace` are not on that path.
- False alarm: No new signal. The github.io doc stays up. The page-text corpus and the hosted-doc lines are unchanged. Weights unchanged.
- Simpler or more complicated: One captured table and `Reflect.apply`, instead of trusting the prototypes at click time.
- AGENTS.md: A page script cannot turn this check off by replacing the function. Nothing new is sent. No new permission.
- Would I defend it: Yes, as “the check uses the functions from before the page ran.” Not as “every getter on every object is frozen.”
- Harmless on weird input: A missing DOM function is skipped. A throw inside one walk does not erase a decision already made from `innerText`. The sealed `attachShadow` still returns the real root.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From the captured `innerText`, shadow text, and `getPropertyValue("content")`. A picture, a canvas, or a cross-origin frame is still invisible.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? Before this change: `RegExp.prototype.test`, `innerText`, `performance.now`, and `getBoundingClientRect`. Those are captured now. What still belongs to the page is the document itself: which nodes exist, and any getter that is not in the captured table.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? Pages that replace built-ins on purpose. A docs site that polyfills `String.prototype` or a framework that wraps `attachShadow` still gets the original behavior from the bridge, and its own code still sees its own replacement. `github.com` and `youtube.com` do both.

## 2026-11-16 — Shadow roots are not kept after removal

- Hypothesis: the `attachShadow` list holds every root strongly, including ones the page has removed, so a later lure can fall outside the 12 ms walk.
- Result: Confirmed. After 10 000 closed roots were created and removed, the live lure stayed on the page. Roots are now weak references. A root whose host is disconnected is dropped when the list passes 512 and again on each copy. The same page then reaches the warning screen. The sealed hook still returns the root, binds `this` to the element, throws `DOMException` on a second attach, and is the same function on `Element.prototype`. Two hundred custom elements that attach in the constructor still render.
- Evidence: `/shadow-churn` was red on `d378de3` (stayed on the page for 8.3 s) and reaches `warning.html` after the change. That test finished in 356 ms, including creating and removing the 10 000 components, under the 1 000 ms click limit. `/components` reports `hook-ok`. Open and closed shadow lures still block.
- Open doubt: heap bytes were not measured. A page that keeps thousands of closed roots connected can still spend the 12 ms before a late one. Open roots are walked from the document, not from this list. No cap on live roots.

### Self-check

- Real user, real attack: A closed-shadow lure after a page has thrown away 10 000 components is still blocked.
- Five-minute bypass: Keep more closed roots connected than the 12 ms walk can read, and put the instruction in one the walk does not reach.
- False alarm: No new signal. The page-text corpus and the hosted-doc lines are unchanged. The custom-element page does not warn.
- Simpler or more complicated: Weak references plus dropping disconnected hosts. The hook's call and return are unchanged.
- AGENTS.md: Still local. Nothing is sent. No new permission. Weights unchanged. The page cannot turn the hook off; a thrown attach still throws.
- Would I defend it: Yes, as “removed components are not kept, and `attachShadow` still behaves.” Not as “every closed root on a huge live page is read.”
- Harmless on weird input: Remembering a root is inside a catch, so a failure there cannot swallow the browser's own exception. A dead reference is skipped.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From roots the page created with `attachShadow` and has not removed. Dropping the host, or using a picture instead of text, still hides it.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? Pages that create and destroy many shadow roots. `youtube.com` and `github.com` do that for ordinary UI. The fixture is that shape: a constructor that calls `attachShadow`, 200 of them, and the return value, `this`, the error, and the prototype function all still match the browser.

## 2026-11-16 — Hidden text past the first elements

- Hypothesis: stopping at the first 200 nodes, the first 80 for CSS, and the first 6 frames lets a lure sit behind empty padding.
- Result: Confirmed for generated content, a declarative shadow, and a same-origin frame. A shadow created with `attachShadow` was already recorded and scanned with no element cap, so that shape was not a gap. The walk now follows open roots to depth 32, every recorded closed root, `::before` / `::after` only on elements with a box near the viewport, and every same-origin frame with a box. It stops after 12 ms.
- Evidence: `/late-300`, `/late-3000`, `/shadow-deep`, and `/iframe-seventh` stayed on the page before the change and reach `warning.html` after it. The 3 000-div case asserts click-to-warning under 1 000 ms; that test finished in 339 ms including navigation. Edge E2E 27, including the older shadow, CSS, picture, and github.io cases.
- Open doubt: a `::before` on an element with no box is still skipped. One root still stops at 400 text nodes. Depth 33 is past the safety stop. A page large enough to spend the 12 ms on boxes before the lure is still open; the 3 000-div page did not. The recorded shadow list still grows without a limit.

### Self-check

- Real user, real attack: A weak command whose only instruction is a `::before` after 3 000 empty divs, a declarative shadow seven deep, or the 7th frame is blocked.
- Five-minute bypass: Put the instruction on an element whose box has height 0, or behind more text nodes than 400 inside one root, or deeper than 32 declarative shadows.
- False alarm: The page-text corpus and the 29 hosted-doc lines stay at 0. The github.io fixture stays up. No new signal.
- Simpler or more complicated: One time budget and a box check, instead of three document-order caps.
- AGENTS.md: Still local text. Nothing new is sent. No new permission. Weights unchanged.
- Would I defend it: Yes, as “a visible lure is not skipped because empty divs came first.” Not as “every hidden string on a huge page is read.”
- Harmless on weird input: A foreign frame still throws and is skipped. A detached root is skipped. The deadline stops the walk.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From text nodes, CSS generated content, and same-origin frames, only where there is a box. A picture, a canvas, a cross-origin frame, and a `::before` with no box stay invisible.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? Pages whose real text lives in shadow roots, generated content, or a same-origin frame. `github.com` file views and `youtube.com` are full of web components. A docs page that says “Press Windows + R” inside a component and also copies an install line would now be blocked. That pair is not in the 22 excerpts.

## 2026-11-16 — Visible install commands on hosting zones

- Hypothesis: `clickfix-unseen` treats every non-popular user site on a hosting zone as a lure, including a doc whose copy button shows `curl | sh`.
- Result: Confirmed. 29 weak lines on 17 doc pages were warnings, and a `github.io` fixture reached the warning screen. The page now sends `clickfix-weak` only when that command is not already visible text. Docs stay up. The weebly picture lure still warns, because its command is not on the page.
- Evidence: `tests/security/hosted-docs.test.ts` and `tests/fixtures/page-text/hosted-docs.json`, fetched 2026-11-16. The github.io end-to-end test was red before the change.
- Open doubt: a doc that copies a command it never shows (only a “Copy” label, command only in a script) still warns on a hosting zone. None of the 29 lines were like that. A lure that also prints the command in hidden-but-innerText text would look like a doc.

### Self-check

- Real user, real attack: The picture lure on a hosting zone still reaches the warning screen. A person copying the install line from a GitHub Pages doc does not.
- Five-minute bypass: Print the same `curl | sh` somewhere in the page text, then copy it from a button. That is the doc case, and it is quiet on purpose.
- False alarm: The 29 lines are 0. The 22 older excerpts stay 0. `readthedocs.io` is not a hosting suffix and was already quiet.
- Simpler or more complicated: One substring check on text the page already has. No new host list.
- AGENTS.md: The command text still does not leave the page. No new permission, no network. Weights unchanged.
- Would I defend it: Yes, as “a command the page already shows is not an unseen lure.” Not as “a hosting zone is safe.”
- Harmless on weird input: A command shorter than 12 characters is not treated as shown. A textarea value is not page text, so the hidden copy field on the weebly fixture does not count.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From `innerText`. A command drawn only as a picture is still unseen, which is the case that warns. An attacker who also puts the command in ordinary page text makes it look like a doc.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? Hosting zones. `michaelcurrin.github.io`, `script-ware.gitbook.io`, `blueberrypy.netlify.app`, `opensoul-web.vercel.app`, `termix.pages.dev`, and `flywheel-io.gitlab.io` are docs, not kits. A hosting zone is not phishing.

## 2026-11-16 — File and URI lures

- Hypothesis: A `search-ms:` URI, a WebDAV UNC, or an Explorer path padded away from a command is copied and is not `strong`.
- Result: Confirmed. `search-ms:query=…` was `null` before the change. Those shapes are now `strong` in the engine and in the bridge, same expressions. A normal UNC, a path alone, and `search:` without `query=` or `crumb=` stay quiet.
- Evidence: `tests/unit/clickfix.test.ts`. The sync test compares the bridge. Page-text corpus stays 0 blocked copy buttons. The shell-link paragraph is still `strong`. The `.lnk` / `.hta` rule was not narrowed, because no copy button matched it.
- Sources: Proofpoint, 1 March 2024, TA571 “Auto-fix” uses `search-ms` to show a WebDAV file. Huntress, 29 September 2025, FileFix uses the Explorer address bar and hides the command with padding.
- Open doubt: `ms-settings:windowsupdate` on a real support copy button would be blocked. Not in the 22 excerpts. A space run shorter than 20 stays at the old tier.

### Self-check

- Real user, real attack: Yes. The page copies the URI or the padded path. The bridge replaces that clipboard text.
- Five-minute bypass: Use a normal `\\server\share` without `@SSL`, `@80`, `@443`, or `DavWWWRoot`, or put fewer than 20 spaces between the path and the command. Both stay at the old tier, on purpose.
- False alarm: The 32 copy buttons still do not warn. `search: see the manual` and `\\fileserver\share\readme.txt` are null. The known `.lnk` sentence in the shell-link excerpt is still strong.
- Simpler or more complicated: Five expressions on the clipboard string. No new list and no network.
- AGENTS.md: Nothing leaves the device. The command text is still not stored or sent. No new permission.
- Would I defend it: Yes, as “these URI and WebDAV spellings, and a path padded away from a command, are blocked.” Not as “every UNC path” and not as “every mention of Settings.”
- Harmless on weird input: The new expressions are bounded. A million spaces still finishes inside the existing time budget.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? These rules do not use page context. They read the string the page writes to the clipboard. Spaces and a `#` used to hide the command from the user and, after collapsing, from the weak check. That padding is now the signal. A picture of the URI still is not readable, which is the open case from the previous pass. The string the page actually copies is what is checked.

## 2026-11-16 — Hidden instruction context

- Hypothesis: After a bare “captcha” stopped counting, a weak command plus an instruction the bridge cannot see (`innerText` only) is copied.
- Result: Confirmed on the previous build. Open shadow, closed shadow, and CSS `::before` on an ordinary host stayed up. Image, canvas, and a cross-origin frame on a weebly.com user site stayed up. Shadow text and CSS generated content are now part of the lure check, and those copies are replaced. Image, canvas, and a foreign frame are still unreadable. Those report `clickfix-weak` and nothing else. The worker warns only when the host is a user site on a hosting zone and not popular.
- Evidence: The six end-to-end tests were red before the change (shadow and CSS timed out on the page URL; the weebly cases did too once `.dev` was dropped). `tests/unit/clickfix.test.ts` covers the hosting-zone decision. Page-text corpus stays 0 warnings.
- Open doubt: a picture and a weak command on a normal unknown host, not a hosting zone, still copies. Blocking every weak command would also block install docs.

### Self-check

- Real user, real attack: Yes for a hosting-zone page whose instructions are a picture, and for a shadow or CSS instruction on any host. Not for a picture on a random domain.
- Five-minute bypass: Put the steps in a picture and the `curl | sh` on a domain that is not a hosting zone. Tested: `tool-docs.example` stays. A closed shadow on that same host is now blocked.
- False alarm: Popular `netflix.net` and ordinary `tool-docs.example` allow the picture. The 22 page-text excerpts still do not warn. Install copy buttons are not blocked.
- Simpler or more complicated: Reading shadow roots and CSS content is local. The worker decision is one boolean on facts the analysis already has. No new list of doc domains.
- AGENTS.md: No new permission, no network, no reading of typed fields or of the user’s own clipboard. The command text does not leave the page. `PRIVACY.md` says so.
- Would I defend it: Yes, as “shadow and CSS instructions are blocked, and a hidden instruction on a user hosting site warns.” Not as “an image cannot hide a command.”
- Harmless on weird input: Input and textarea values are not part of the extra text. A foreign frame that throws is skipped.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From `innerText`, shadow text nodes (open roots and roots we saw at `attachShadow`, including closed), CSS `::before` / `::after`, and same-origin frames. Yes for a picture, a canvas, and a cross-origin frame. Those no longer decide the block. They only raise `clickfix-weak`, and only a hosting-zone user site is warned.

## 2026-11-16 — Page-text corpus

- Hypothesis: “reCAPTCHA” and “Your browser is out of date” set the paste-lure context with no instruction to paste or run anything, and there is no count of that on real pages.
- Result: Confirmed. Both sentences matched before the change (the new assertions failed). Context is now a key combination or the Run dialog, or a claim about this browser together with a paste or run instruction. The two sentences are false. “Your browser is out of date. Paste the fix.” and “Press Windows + R” stay true. Install lines under “paste this into PowerShell” stay false.
- Evidence: `tests/unit/clickfix.test.ts`. `tests/security/page-text.test.ts`: 22 snapshots, 32 copy buttons, 0 blocks, 0 prompt-injection matches, 0 tech-support text matches. The shell-link paragraph is `strong` because it contains `.lnk`; its copy button is not. typecheck, lint, 284 tests, URL-corpus ceilings held, Edge E2E 14. The false-alarm report test now reads `webNavigation`: under `MAP * 127.0.0.1` Edge shows `chrome-error` and no Playwright request, so the old listener never saw the GitHub URL. The assertions on that URL are unchanged.
- Open doubt: the context the bridge reads is `document.body.innerText`. A page can put the instruction in an image, a canvas, a shadow root, an iframe, or CSS `::before` / `::after`, and a weak command still copies. Not fixed here.

### Self-check

- Real user, real attack: The false alarm is real (a captcha badge, an update banner). The attack that remains is a weak command next to a lure the bridge cannot see.
- Five-minute bypass: Say “I’m not a robot” and copy `powershell -c` with no Win+R and no “paste the fix”. That no longer blocks. The e2e captcha page still has Win+R and Ctrl+V.
- False alarm: 22 real excerpts, 32 copy buttons, 0 warnings. Homebrew’s “Paste that in the Terminal” does not set context, so `curl | sh` stays unblocked.
- Simpler or more complicated: Three expressions instead of one word list. The sync test compares all three with the bridge.
- AGENTS.md: No new permission, no network, no reading of the user’s clipboard. Excerpts are short quotations with a source and a date.
- Would I defend it: Yes, as “these pages do not warn, and a word is not a lure.” Not as “page signals have a 0 false-alarm rate on the web.”
- Harmless on weird input: A crash sentence buried after a long prefix does not match unless a key combination or a paste instruction is there too.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? From `document.body.innerText`, the first 20 000 characters and the last 20 000. Yes. An image, a canvas, an open or closed shadow root, a cross-origin iframe, or `::before` / `::after` is invisible to this check. The page-text corpus does not cover that. Next pass.

## 2026-11-15 — Paste-lure class

- Hypothesis: A page can copy `finger` at a host, `start finger.exe` / `ct.exe`, or a `.search-ms` / `.lnk` / `.hta` name, or can call a normal `curl | sh` a browser-crash fix, and the old patterns miss it. Install docs that say “Terminal” must stay unblocked.
- Result: Those shapes are `strong`. Crash / “out of date” / “abgestürzt” text makes a weak install command count as a lure. “Open Terminal” and “PowerShell” do not. The page’s claim is not compared with the installed Chrome version; `posture.ts` still owns that.
- Evidence: `tests/unit/clickfix.test.ts` (the two new cases). Homebrew, winget, rustup, nvm, Docker, npm, pip lines stay off. Edge crash page copies `curl | sh` with no captcha and no Win+R. 282 tests, corpus ceilings held, E2E 14.
- Open doubt: a page that only says “open Windows Terminal” and copies a malicious command shaped like rustup is not blocked. Blocking that phrase would also block the Docker and rustup copy buttons. Measured as the counterexample, left open on purpose.

### Self-check

- Real user, real attack: Yes for the class Microsoft described on 5 Feb 2026 and 28 Aug 2026: a copied LOLBin or a fake crash that asks for a shell command. Not a transcription of their figure.
- Five-minute bypass: Drop the `@host`, the `.exe`, and the crash sentence, and copy `curl | sh` from a page that only says Terminal. Tested: that stays unblocked. Adding the crash sentence is tested the other way.
- False alarm: The seven install lines under “Open Terminal” do not block. Measured, not assumed. `ubuntu-24.04.iso` is not a file lure.
- Simpler or more complicated: Three patterns and one shared phrase list, duplicated into the bridge. The sync test covers both.
- AGENTS.md: Not stretched. No new permission, no network, no reading of the user’s own clipboard. Page text used for the lure check stays in the page.
- Would I defend it: Yes, as “these shapes are blocked, and install docs are not.” Not as “every paste lure.”
- Harmless on weird input: A ten-character `.hta` name is still strong (the length floor does not apply to that pattern). A long page with the crash sentence at the end still matches. A host over 253 characters is unchanged.

## 2026-11-15 — Over-length clipboard command

## 2026-11-15 — Over-length clipboard command

- Hypothesis: `clickFixTier` returns null above 12 000 characters, so a real command plus padding is copied and still runs.
- Result: Whitespace, including U+00A0, U+2000–U+200A, and U+3000, is collapsed. U+200B, U+200C, U+200D, and U+2060 are removed. The scanner reads the first 12 000 characters, the last 12 000, and a short slice around the first and last hit of each command name. The same head-and-tail change is in the prompt, DOM-XSS, obfuscation, miner, session-id, prototype-gadget, and QR checks. A host over 253 characters and a URL the parser rejects past 4 096 still stop: those are not a marker hiding past a cutoff.
- Evidence: `tests/unit/clickfix.test.ts` “still flags a command buried in padding”. `tests/security/redos.test.ts` now expects `strong` for one million spaces and for one million `a`s in front of the command, under 100 ms. The old “oversized means null” assertion was the bug; changing it is the fix. Edge fake-captcha copies the command after 13 000 spaces, Unicode spaces, and a 13 000-character `#` comment. 280 tests, corpus ceilings held, E2E 13.
- Open doubt: a command whose keyword is not in the marker list, sitting more than 12 000 characters from both ends, is still missed. Every current pattern’s keyword is in that list. Letters glued directly onto `curl` (`aaaacurl`) do not match `\b`, which is what we want.

### Self-check

- Real user, real attack: Yes. A page can pad a PowerShell command and the old check waved it through. The bridge blocks that copy. The exact CrashFix figure is still not transcribed; this closes the length bypass for the class we already detect.
- Five-minute bypass: Command in the middle, more than 12 000 characters from both ends, with a keyword we list. Tested (`a` × 20 000, command, `a` × 20 000). A keyword we forgot would miss. The list is the keywords the patterns already use.
- False alarm: rustup’s `curl | sh` stays `weak`, including after a long prefix and a newline. Measured. It is blocked only when the page shows the captcha / Win+R script, which was already the rule. Corpus ceilings unchanged.
- Simpler or more complicated: More code in two copies (engine and bridge). The sync test compares the patterns and the marker list. The extra code is the check that was missing.
- AGENTS.md: The ReDoS test was changed because it required the bypass. No threshold or fixture was loosened to hide a miss. Corpus ceilings untouched.
- Would I defend it: Yes. A long string is not harmless. I would not claim every possible command shape in the middle of a novel is caught.
- Harmless on weird input: The old `length > 12000 return null` is gone. Prompt, script, session-id, and QR checks no longer return “no” only because the string is long. A too-long host and an unparseable URL still return no, on purpose.

## 2026-11-15 — CrashFix and TerminalFix command text

## 2026-11-15 — CrashFix and TerminalFix command text

- Hypothesis: The February 2026 CrashFix advisory contains a clipboard command that `clickFixTier` does not treat as strong, so a user who pastes it is unprotected.
- Result: No code. Both advisories show the command as a figure. The CrashFix hunting query is `cmd.exe` + `start` + `finger.exe` + `ct.exe`. The current strong pattern is `finger user@host |`. Those are not the same string. Inventing the missing characters would flag or miss the wrong thing.
- Evidence: Microsoft Security Blog, fetched 2026-11-15, URLs in `BACKLOG.md`. `src/engine/page/clickfix.ts` line for `finger`.
- Open doubt: the exact command. Also whether the page says Win+R or only “the browser crashed”. Not read from the image.

### Self-check

- Real user, real attack: Not this pass. Shipping a guessed `finger.exe` rule could false-alarm on a docs page that mentions the tool, or miss the real command.
- Five-minute bypass: Not applicable. No new check.
- False alarm: None added.
- Simpler or more complicated: No code. Correct.
- AGENTS.md: Not stretched. Unconfirmed command was not built on.
- Would I defend it: Yes, as “we did not invent the command.” Not as coverage of CrashFix.

## 2026-11-15 — Threat model matches the manifest

- Hypothesis: `THREAT_MODEL.md` still told a reviewer that websites cannot connect and that DNR never redirects. Both were already false in code, so the doc was the bug.
- Result: The elevation row now describes localhost in source, deletion of that key on a store pack with no https pay origin, and `ACTIVATE_LICENSE` only. The DNR row now says the redirect target is this extension's warning page.
- Evidence: `src/billing/connectable.ts`, `scripts/pack-store.mjs`, `warningRedirect` in `src/network/dnr.ts`. Tests unchanged: 279 unit, 13 Edge E2E. Corpus ceilings held.
- Open doubt: none in the doc. The pay-origin path with a real `VITE_PAY_ORIGIN` was not packed again in this pass. The code path is the one read above. The earlier pack measurement (no key) is still the 2026-11-15 zip in the P0 table.

### Self-check

- Real user, real attack: No new block. A reviewer who believed the old sentence would miss a real connectable origin and a real redirect. The code was already restricted. This pass stops the doc from hiding that.
- Five-minute bypass: Not a new control. The message gate still refuses `UPDATE_SETTINGS` from a web page. That test already exists.
- False alarm: None. No scoring change.
- Simpler or more complicated: The threat model is longer and accurate. No runtime code.
- AGENTS.md: Not stretched.
- Would I defend it: Yes, as a correction. Not as a new protection.

## 2026-11-15 — Last feed chunk and live rule 80000

- Hypothesis: Chrome might accept a 49-rule file and still not enforce the tail of `requestDomains`, and a dynamic rule id of 80000 might be stored but not applied.
- Result: Edge redirected both `www-robinhood-com-login-guide.typedream.app` and `zzzzzzbxxxx.weebly.com` (first and last host of rule 49, 1,353 hosts) to `warning.html?blocked=feed`. A dynamic rule at id 80000 redirected `live-rule-probe.example` only. `live-rule-other.example` stayed on the page. After the rule was removed, the probe host stayed on the page.
- Evidence: `tests/e2e/live.spec.ts` (13 passed), `tests/security/live-feed.test.ts` pins ids 80000–80002. `npm test` 279, corpus ceilings held.
- Open doubt: 1,351 hosts in the middle of rule 49 were not navigated. A truncation that kept the first and last entry and dropped the middle is not ruled out. No Chrome document describes that shape.

### Self-check

- Real user, real attack: Yes for the two hosts that were loaded. They are entries from the shipped phishing list. The browser never contacted them (`MAP * 127.0.0.1`). The rule match is what a user would hit.
- Five-minute bypass: A host outside the rule was loaded and was not redirected. That path is tested. Putting a phish in the untested middle of the chunk is not a bypass the attacker chooses; the list order is ours.
- False alarm: `live-rule-other.example` stayed up. Measured in that test, not assumed. Corpus ceilings unchanged.
- Simpler or more complicated: No production code. Two browser tests. Worth keeping.
- AGENTS.md: Not stretched. No threshold or fixture edit.
- Would I defend it: Yes, as “the last rule’s ends are enforced, and id 80000 is enforced.” Not as “all 385,353 hosts were opened.”

## 2026-11-15 — Permission proposal (no manifest change)

- Hypothesis: `contentSettings`, `privacy`, `scripting`, and `management` can move to `optional_permissions` and the install warning gets smaller without dropping default protection.
- Result: Rejected as a code change. Chrome’s permissions page (fetched 2026-11-15) allows those four as optional. `privacy` backs `hardenBrowser`, which defaults on. `management` backs `checkExtensions` on every boot. `scripting` has no warning text on the permission list. Only `contentSettings` both defaults off and carries an install warning. Left every permission required.
- Evidence: `RELEASE_AUDIT.md` section “Permission proposal, 2026-11-15”. No test change. Manifest diff is empty.
- Open doubt: whether Chrome Web Store builds still return `getMatchedRules` when `declarativeNetRequestFeedback` is ignored. Not measured. Whether an update keeps a grant that moved from required to optional. Not measured.

### Self-check

- Real user, real attack: No. This pass records a decision. It does not block a phish, a tracker, or a download.
- Five-minute bypass: Not applicable. Nothing new is enforced. An attacker does not need to bypass a proposal.
- False alarm: None added. Not a scoring change. Corpus ceilings held on this pass (35 files, 279 tests). Edge E2E 11 passed.
- Simpler or more complicated: No runtime code. The audit got longer. That is the record the next pass needs so `privacy` is not moved by accident.
- AGENTS.md: Not stretched. No threshold, fixture, permission, or network change.
- Would I defend it: Yes, as “we looked and did not shrink permissions,” not as a new protection.
