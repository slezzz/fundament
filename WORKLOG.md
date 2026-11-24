# Work log

Newest first. One entry per pass.

## 2026-11-23 — Pin the workflows and drop the high advisories

- Hypothesis: the signing key is safe if it stays a repository secret next to `npm ci`, and the current dev tree is fine because the runtime audit is already 0.
- Red first: `tests/security/workflows.test.ts` failed on the old files. Ten `uses:` lines had a tag instead of a 40-character commit. `ci.yml` had no `permissions` block. The live-feed job that ran `npm ci` also read `secrets.FEED_SIGNING_KEY`.
- Actions, resolved from the tag to the commit on 2026-11-23: checkout `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), setup-node `949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0), upload-artifact `cf430e030ddbb5b0abf93d22962f4752f3646cd9` (v7.0.2), download-artifact `37930b1c2abaa49bbe596cd826c3c89aef350131` (v7.0.0), configure-pages `45bfe0192ca1faeb007ade9deae92b16b8254a0d` (v6.0.0), upload-pages-artifact `fc324d3547104276b827a68afc52ff2a11cc49c9` (v5.0.0), deploy-pages `368f82528645a54fb793d4d04e342629a3f51346` (v5.0.1). `ci.yml` now defaults to `contents: read`. The deploy job restates that and adds `pages: write` and `id-token: write`, because a job’s permissions replace the workflow default.
- The live feed is three jobs. `build` runs `npm ci` and writes an unsigned artifact. `sign` checks out only `scripts/sign-live-feed.mjs`, downloads that artifact, and signs it. The script imports `node:crypto`, `node:fs`, and `node:path`. It reads `FEED_SIGNING_KEY` and does not open `.feed-signing-key`. `deploy` publishes the signed file. The environment is `live-feed-signing`. `GO_LIVE.md` lists the GitHub clicks: selected branch `main`, no required reviewers, delete a repository secret of the same name, do not put the key on `github-pages`. Those clicks are not done from here.
- Audit before the bump, this machine: runtime 0. Dev dependencies 16: 10 moderate, 4 high, 2 critical. The critical pair was `tinypool` and `vitest`. The high set included `vite` through 6.4.3. After Vite 8.3.8, Vitest 5.1.1, and `@vitejs/plugin-react` 6.3.0, `npm audit fix` reported 0. Typecheck then failed: `tests/unit/content-isolation.test.ts` imports `esbuild`, and Vite 8 no longer installs it. `esbuild` 0.28.2 is now a direct dev dependency. Audit after that: 0 info, low, moderate, high, and critical.
- `vitest.config.ts` and `vite.config.ts` use `import.meta.dirname`. A `.ts` suffix on the connectable import makes `tsc` fail unless `allowImportingTsExtensions` is on for the whole project, so that import stays without a suffix. Vite 8 still warns that the native config loader will reject it later.
- Port 5174 was empty before the typecheck that failed on `esbuild`. It was not checked again before the suite that followed. Definition of done after the fix: typecheck, lint with the `autonomous-world` ignore, 299 unit tests, 43 Edge end-to-end tests. The three new tests are the workflow pins, the permissions block, and the secret-next-to-`npm ci` rule, plus the signer’s `node:` imports. Corpora were not edited. Weights unchanged.

### Self-check

- Real user, real attack: A compromised Action tag or a dependency in the signing job could sign a list the user then trusts. The job that installs packages no longer sees the key.
- Five-minute bypass: Point `uses:` at a tag, drop the permissions block, or pass `secrets.` into the `npm ci` job. The workflow test fails on each. Importing an npm package from the signer fails the same file.
- False alarm: A job that needs `pages: write` must restate `contents: read`. That is written on the deploy job, not left to a merge that GitHub does not do.
- Simpler or more complicated: Three jobs instead of one. The signer is one file and the standard library.
- AGENTS.md: The signature, the freshness window, the expiry, and the rule that a popular, official, or public-suffix host is never blocked are unchanged. Nothing new leaves the browser. The private key stays out of the repo.
- Would I defend it: Yes, as “the key is not in the install job, and every action is a commit.” Not as “the environment already exists on GitHub.” The clicks are still the user’s.
- Harmless on weird input: An unsigned file with the wrong format throws before a signature is written. A missing key throws. The signer checks the signature with the public key it derives.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The list is still the file the build job wrote. The signer does not fetch feeds. A package install in that job cannot read the key, because the key is not in the job.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None. `node:crypto` signs bytes the build already produced.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? None. No detection change.
- Richtig: Der Workflow-Test war rot (Tags, kein `permissions`, Secret neben `npm ci`) und ist grün. Audit davor 2 kritisch und 4 hoch, danach 0. 299 Unit-Tests und 43 Edge-Tests grün. Gewichte unverändert.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil der Signierjob das Artefakt und ein Skript ohne Abhängigkeiten bekommt und der Schlüssel ein Environment-Secret ist, dessen Klicks in `GO_LIVE.md` stehen.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Ein `uses:` ohne Commit, ein Workflow ohne `permissions`, ein Secret in einem Job mit `npm ci`, oder ein Import, der nicht `node:` ist. Getestet. Die Klicks in der GitHub-Oberfläche sind benannt und nicht ausgeführt.

Urteil: BEHALTEN


## 2026-11-23 — Measure the host the extension actually opened

- Hypothesis: the 55 “no tab record” misses are pages that never got an analysis, so a 2 000-page run cannot stay under 5 % failures.
- Result: Many of those pages redirect. `youtu.be` commits `www.youtube.com`. The old comparison looked only at the host we asked for, found no tab, and skipped a page the extension had analyzed. The measurer now reads the final host when the asked host has no record. The comparison inside the service worker is inlined. Calling the Node helper there throws, and the first 40-page probe was 40 `worker` skips for that reason. After the inline, the same 40: 35 measured, 5 not, 0 warnings. The five are `twitter.com` and `x.com` (HTTP error), `w2rt6byl5nf1opmc-a.com` (does not resolve), `europa.eu` and `reddit.com` (browser closed). 12.5 %. The 2 000-page run was not started. Port 5174 was empty. Weights unchanged. `FUNDAMENT_MEASURE_MAJESTIC` can raise the home-page list. The default stays 500.

### Self-check

- Real user, real attack: No new detection. A redirected homepage is no longer dropped before its signals are read.
- Five-minute bypass: Not a recognition rule. A page that never commits still stays not measured. Tested on the dead name.
- False alarm: The probe warned on 0 of 35. A redirect is recorded as the final host, not as the short link we typed.
- Simpler or more complicated: One host comparison, used outside the worker. The worker keeps its own copy because it cannot see the Node function.
- AGENTS.md: Nothing new is sent. No permission, no weight change. The output is still hostnames and signal names, local, gitignored.
- Would I defend it: Yes, as “a redirect is the page we measured.” Not as “failures are under 5 %” and not as “2 000 pages were opened.”
- Harmless on weird input: A host that does not resolve stays not measured. An HTTP error stays not measured. Neither is counted clean.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The record is the extension’s own tab entry. The page cannot mark itself measured. A different host is used only when that entry exists.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The redirect target. It belongs to the site. We store the host the extension already stored.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? None new. `google.com`, `github.com`, and `wikipedia.org` stayed up with no warning.
- Richtig: Der erste Lauf war 40 Worker-Fehler, weil der Vergleich die Node-Funktion rief. Danach 35 gemessen, 5 nicht, 0 Warnungen.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil `youtu.be` als `www.youtube.com` gemessen wurde und die fünf Ausfälle benannt sind. Die 5-%-Grenze ist nicht erreicht.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Eine Seite, die nicht lädt, als sauber zu zählen. Nicht gebaut. Der tote Name bleibt `not measured`.

Urteil: BEHALTEN

## 2026-11-19 — Bridge inventory, then one shared copy decision

- Hypothesis: `walletBridge.ts` is long because the same decision is written twice, so folding those copies makes the file much shorter and the script smaller.
- Inventory before the edit, 1 331 lines. The built script was 28.41 kB, gzip 10.16 kB.
  - Captured natives, about lines 24–136. The builtin test reads this region. A call that is not on `native` uses the page's prototype.
  - Helpers for strings, DOM, and events, about 138–276.
  - ClickFix tier, the lure walk, and readability, about 280–920. This is most of the file. `hiddenInstructionText` and `commandsAreShown` each have their own 12 ms deadline.
  - Clipboard, wallet, miner, and fingerprint probes, the rest.
- What was merged: the head-and-tail cut of a long string (`bothEnds`, used at 12 000, 20 000, and 8 000). The ping for a blocked or weak copy (`announced`, used by `writeText` and by the `copy` event). The two scans that pick a typed-data parameter, now one loop that still prefers a JSON string over an object.
- What was not merged: the two 12 ms walks. One shared walk would change which text is seen when the clock runs out. The tier expressions were not turned into a table. Each expression is already one line, so a table does not remove a check. The file was not split. `content-isolation.test.ts` compiles this one source, and the built `content-bridge.js` must not contain an import.
- After: 1 324 lines. Built script 28.34 kB (28 351 bytes), gzip 10.14 kB. Port 5174 was empty for both copy timings. Three fixtures, 200 `writeText` calls, median of five rounds, milliseconds per call. Before: strong `powershell -w hidden …` 0.0113, weak `bash -c "$(curl …)"` 0.0299, plain release-note sentence 0.0141. After: 0.0119, 0.0334, 0.0146. Same band. Not a speedup.
- 295 unit tests and 43 Edge end-to-end tests passed. Weights unchanged.

### Self-check

- Real user, real attack: A hidden PowerShell copy is still replaced. A visible install line on a github.io doc is still left alone. Both are in the end-to-end run.
- Five-minute bypass: Not a new rule. The same tier function runs once instead of being inlined twice.
- False alarm: No new match. The typed-data loop still prefers a `{` string over an object parameter.
- Simpler or more complicated: Three call sites share the head-and-tail cut. The copy ping is one function. The file is seven lines shorter, not a different design.
- AGENTS.md: Nothing new is sent. No permission, no weight change. The page still cannot turn a check off. The request bytes are still not rewritten.
- Would I defend it: Yes, as “the copy decision is written once.” Not as “the bridge is now small.”
- Harmless on weird input: A string that does not start with `{` is still not parsed as typed data. An empty `calls` array is still no danger.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? Unchanged. The command text and the readable page still belong to the page. The 12 ms walks were not combined, so the attacker does not get a new way to spend the budget.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The clipboard write and the page text. Both still belong to the page.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? The same installer docs as before. The end-to-end github.io cases stayed up.
- Richtig: 1 331 auf 1 324 Zeilen, 28,41 kB auf 28,34 kB. Die drei Kopierzeiten bleiben in demselben Band. 295 und 43 Tests grün.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil die große Länge die zwei 12-ms-Läufe und die Tier-Ausdrücke sind, und die nicht zusammengelegt wurden.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Kein neuer Pfad. Ein Walk mit einem gemeinsamen Zeitlimit wäre ein Verhaltenswechsel. Benannt und nicht gebaut.

Urteil: BEHALTEN

## 2026-11-19 — Budget follows a calibration, not 118 ms

- Hypothesis: an absolute 118 ms will stay green on GitHub Actions because it was three times the median here.
- Result: That number is this machine. The test now measures a fixed loop, 38 500 000 `Math.imul` steps, five times, and requires the 100 analyses to finish under three times that median. The multiple did not move. Report-only in CI was the other option. It was not taken: the `check` job is the run that happens on every push, and a report would let a real slowdown pass there.
- Choice of the loop: five quiet `node` runs of 38 500 000 steps took 35.9, 46.7, 38.2, 36.0, 36.0 ms (median 36.0), next to the 39.2 ms analysis median from `8b73007`. Port 5174 was empty before those runs and again before the Vitest runs.
- Vitest, same quiet machine, five times: analysis / calibration median / bound = 52.1 / 42.7 / 128.1, 42.0 / 38.4 / 115.3, 38.7 / 36.5 / 109.4, 39.1 / 41.4 / 124.3, 38.8 / 36.2 / 108.5. The largest ratio is 1.22. Three is the same headroom as before.
- GitHub Actions was not measured. Docker is not installed. WSL Ubuntu has no Node. The budget test runs in the `check` job (`npm test` on ubuntu-24.04, Node 24), not in the Chromium e2e job. Nothing here executed that runner, so this does not say the job is green.
- Not loosened. A red run still gets its cause measured. The multiple stays 3.

### Self-check

- Real user, real attack: Not a detector. A slower `analyzeUrl` on the same CPU still fails, because the calibration loop does not call it.
- Five-minute bypass: Not applicable.
- False alarm: A runner where `analyzeUrl` is slower relative to a tight `Math.imul` loop, without an engine change. That ratio was not measured on ubuntu-24.04.
- Simpler or more complicated: The assertion is a ratio. The iteration count is fixed. No production code.
- AGENTS.md: Nothing is sent. No permission, no weight change.
- Would I defend it: Yes, as “three times a fixed loop on the same machine.” Not as “GitHub Actions was timed.”
- Harmless on weird input: A collapsed hash throws. A zero calibration makes the bound zero and the test fails.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? No page. The clock and the loop are the machine’s.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? None.
- Richtig: Fünf ruhige Vitest-Läufe, größte Quote 1,22, Vielfaches 3. Port 5174 leer. ubuntu-24.04 nicht gelaufen.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil 118 ms eine Eigenschaft dieses Rechners war und das Vielfache gleich geblieben ist.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Die Kalibrierung selbst verlangsamen, damit die Grenze mitwächst. Das wäre ein Fehler der Prüfung. Benannt. Der Loop ruft `analyzeUrl` nicht auf.

Urteil: BEHALTEN

## 2026-11-19 — Worklog entries for 8b73007, 84e8d6b, and c964639

- Hypothesis: the measurement notes already in this file were enough of a record for those three commits.
- Result: They were not. Each commit now has its own entry, with the self-check and a verdict. No engine change.

### Self-check

- Real user, real attack: No change to what the extension does.
- Five-minute bypass: Not applicable.
- False alarm: Not applicable.
- Simpler or more complicated: Three entries. The two notes they replace are gone, not duplicated.
- AGENTS.md: No data flow, no permission, no weight change.
- Would I defend it: Yes, as “a commit without a self-check is not recorded.” Not as “the bridge is shorter.”
- Harmless on weird input: The file is prose.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? No recognition was added.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? None.
- Richtig: Die drei Commits stehen mit Urteil im Log. Der Code dazu ist unverändert.
- Gut für das Vorhaben: Ein Prüfer kann jeden der drei Sätze ohne die Chat-Notiz wiederholen.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Einen späteren Commit wieder ohne Eintrag lassen. Benannt, und dieser Eintrag ist die Gegenregel.

Urteil: BEHALTEN

## 2026-11-19 — c964639 EIP-7702 and lookalike addresses left unbuilt

- Hypothesis: an authorization list, and a destination that shares the sender’s first and last four hex digits, are bypasses of the approval check, so they can ship while detection is frozen.
- Result: They are not bypasses. The approval check looks at calldata selectors. An `authorizationList` is a different field. Address poisoning, as MetaMask and Etherscan describe it, imitates an earlier recipient. The later payment is from the real account to that lookalike. Comparing `from` with `to` on one request does not see that pair. The draft was removed. The memo is `concepts/wallet-delegation.md`. The backlog row is Nach 1.2. Weights unchanged.

### Self-check

- Real user, real attack: A dust transfer from a vanity address that matches a previous recipient, then a send to that copy. The refused check stays quiet on that send.
- Five-minute bypass: Not applicable. Nothing was added to the bridge.
- False alarm: A real EIP-7702 delegation the user meant to sign. No corpus of those transactions exists, which is one reason it stays unbuilt.
- Simpler or more complicated: The bridge lost the two checks. The memo is the record.
- AGENTS.md: Nothing new is sent. No permission, no weight change.
- Would I defend it: Yes, as “these are new detectors, and the lookalike draft does not match the published attack.” Not as “delegation and poisoning are covered.”
- Harmless on weird input: No new parser. A batch that hides `approve` is still the previous commit.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? There is no new recognition. A lookalike check that matched the attack would need the wallet’s earlier recipients. This extension does not have that list.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None was added. The page already supplies `from`, `to`, and calldata. `from` is the wrong context for this attack.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? A wallet the user asked to delegate (EIP-7702), and a payment to an address the user chose that happens to share the sender’s prefix and suffix.
- Richtig: Der Entwurf ist vor dem Commit aus der Brücke und aus dem Test. Die Quellen stehen im Memo.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil die veröffentlichte Attacke den früheren Empfänger nachahmt, nicht `from` mit `to`.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Es gibt keinen neuen Pfad. Die Lücke ist benannt: ein Ziel, das einem früheren Empfänger ähnelt, bleibt ohne Historie unsichtbar.

Urteil: NICHT BAUEN

## 2026-11-19 — 84e8d6b hidden approval inside wallet_sendCalls

- Hypothesis: `wallet_sendCalls` is only a new method name, so the existing `eth_sendTransaction` check is enough.
- Result: The batch is a bypass. The same calldata sits in `calls[].data` instead of the top-level transaction, so the old check never sees it. The bridge now walks each call with the same `approve` and `setApprovalForAll` rules. A plain call still resolves. The request is not rewritten. The unit test rejects `0xa22cb465` ending in 1 and accepts `0x`. Weights unchanged. EIP-7702 and lookalike addresses are not in this commit.

### Self-check

- Real user, real attack: A page asks for `wallet_sendCalls` whose only call is `setApprovalForAll` ending in 1. The native confirm runs. Cancel keeps the request away from the wallet.
- Five-minute bypass: Put the same selector in `input` instead of `data`. The walk reads `data` then `input`, same as `eth_sendTransaction`. Tested for the batch’s `data`. The `input` field on a batch call is the same function, not a separate fixture.
- False alarm: A batch whose call data is `0x`. Tested: it reaches the wallet.
- Simpler or more complicated: One helper, two call sites. No new selector.
- AGENTS.md: Nothing new is sent. No permission, no weight change. The page still cannot turn the check off. The request bytes are unchanged.
- Would I defend it: Yes, as “the batch was a way around the approval check that already exists.” Not as “every wallet method is covered.”
- Harmless on weird input: A missing `calls` array is no danger. A malformed amount still does not confirm.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The context is the calldata the page sends. The attacker writes it. Hiding it in a batch used to skip the check. That hole is the one this commit closes. A different method name still would.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? `wallet_sendCalls` and the call data. Both belong to the page.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? A dapp that batches a real unlimited approval. It gets the same confirm as `eth_sendTransaction`, which is the existing behavior for that calldata.
- Richtig: Der Test lehnt die versteckte `setApprovalForAll` ab und lässt `0x` durch. 295 Unit-Tests und 43 Edge-E2E-Tests waren grün. Die E2E-Seiten rufen `wallet_sendCalls` nicht auf.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil die Selektoren dieselben sind und nur der Weg neu ist.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Dieselbe Freigabe unter einem anderen Methodennamen als `wallet_sendCalls`. Benannt, nicht als neuer Detektor gebaut.

Urteil: BEHALTEN

## 2026-11-19 — 8b73007 one hundred analyses under 118 ms

- Hypothesis: 500 ms is a useful ceiling because one run of 100 `analyzeUrl` calls took about 41 ms.
- Result: It is not. Five runs, nothing else running: 49.5, 39.2, 39.2, 38.5, 42.1 ms. Median 39.2 ms. The assertion is under 118 ms, three times that median, rounded up. Port 5174 had no listener. The full suite still passed the assertion (the file reported 60 ms, then 83 ms). Service-worker start and content-script cost stay unmeasured. Weights unchanged.

### Self-check

- Real user, real attack: Not a detector. A navigation that used to be cheap stays under the measured multiple.
- Five-minute bypass: Not applicable. The number is a ceiling, not a recognition rule.
- False alarm: A slow machine fails the absolute millisecond number without the engine having changed. That is the open CI question, not a reason to raise 118.
- Simpler or more complicated: One loop, ten URLs, ten times. No production code.
- AGENTS.md: The test does not send anything. No permission, no weight change.
- Would I defend it: Yes, as “three times the quiet median on this machine.” Not as “118 ms is true on every runner.”
- Harmless on weird input: The ten URLs are fixed. A throw fails the test.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? There is no page context. The clock is the machine’s.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? None. The samples include `google.com` and `github.com` as ordinary analyses, not as warnings.
- Richtig: Fünf Läufe, Port 5174 leer, Median 39,2 ms, Grenze 118 ms. Die Grenze ist nicht angehoben worden.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil eine Verdreifachung auf diesem Rechner rot wird und 500 ms das nicht tat.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Die Prüfung auf einem langsameren Rechner rot werden lassen, ohne dass die Engine langsamer wurde. Benannt. Die Kalibrierung dagegen ist der nächste Eintrag, nicht dieser Commit.

Urteil: BEHALTEN

## 2026-11-17 — Unix shell forms that skipped the weak tier

- Hypothesis: `curl | sh` is the only download-and-run shape, so `bash -c "$(curl …)"` and `wget | bash` are harmless.
- Result: They are the same shape. A shell `-c` whose command substitution is `curl` or `wget`, a pipe from `curl` or `wget` into a shell (including `sudo` or `nohup`), process substitution `bash <(curl …)`, and `curl`/`wget` with `-o` followed by `chmod +x` are weak. They are not strong, because Homebrew’s own install line is `bash -c "$(curl …)"`. A weak line is blocked only when the page shows a key combination or a browser-fix claim. A visible install line with no such lure stays up.
- Evidence: the new assertions were null, then weak. The Cmd+Space page reached `warning.html` only after the copy button actually carried the command (the first button was split by a quote). Page-text corpus and hosted-doc corpus stay at 0 warnings. Edge then opened the 107 install and support pages with the new build: 105 loaded, 2 did not (`ddev.readthedocs.io`, `turbo.build`, no tab record), 23 copy clicks, 0 warnings. `berkeley-humanoid-lite.gitbook.io` and `docs.brew.sh` stayed up. Weights unchanged.
- Sources, quoted as text: CloudSEK quotes the clipboard `/bin/bash -c "$(curl -fsSL …/install.sh)"` and the line itself says Cloudflare 2025. ThreatDown quotes the same shape. Garrett Stimpson, 1 June 2026, quotes `bash <(curl -sSfL $(echo … | base64 --decode))`. Forcepoint and Emsisoft quote `curl … | nohup bash`. BadByte quotes the clipboard as base64 of the `bash -c "$(curl …)"` form, and quotes `curl -o /tmp/update && xattr -c && chmod +x && /tmp/update` as the script that form downloads.
- Not confirmed as a pasted line, so not a new claim: `zsh -c "$(curl …)"` (the pattern is the quoted bash form with the other shell). `wget -qO- … | bash` as a campaign clipboard (it is the published nvm install line, and the same pipe). The chmod chain as the clipboard rather than the downloaded script. `curl | python` or `curl | perl`. `osascript` without `-e`. A bare `iwr -OutFile` plus `Start-Process`. The reports that paste the PowerShell download use `powershell -c` (already weak) or `-WindowStyle Hidden` (already strong).
- Open doubt: "Terminal öffnen und einfügen" alone is still not a lure, on purpose, because install docs are written that way. `sudo` and `nohup` together in one pipe are not covered.

### Self-check

- Real user, real attack: A page that says Cmd+Space and copies `bash -c "$(curl …)"` reaches the warning screen. Homebrew’s own button does not.
- Five-minute bypass: `zsh -c "$(curl …)"` and `wget | bash` are the same patterns and are tested. `curl | sudo nohup bash` is two prefixes and stays unrated. Tested. `curl | python` was checked and left unrated because no report quotes it as the pasted command.
- False alarm: Homebrew, oh-my-zsh, nvm, and rustup are the legitimate pages in this category. Their buttons are weak and their page text is not a lure, so the corpus stays at 0 warnings. Docker’s `curl -o get-docker.sh` has no `chmod +x` and stays unrated.
- Simpler or more complicated: Four lines on the existing weak tier, copied into the bridge. No new signal. The bridge is longer again.
- AGENTS.md: Nothing new is sent. No permission, no weight change. The page still cannot turn the check off.
- Would I defend it: Yes, as “these are the same installer shape as `curl | sh`, and docs without a key combination stay up.” Not as “every Unix form is covered.”
- Harmless on weird input: A download with `-o` and no `chmod +x` stays unrated. `osascript` of a file stays unrated. The length windows are bounded.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The tier is the command text. The block still needs a key combination or a browser-fix claim, which the page writes and can omit. Omitting it leaves a weak command allowed when the page also shows the line. A hidden line on a user site on a hosting zone still warns.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The copied command and the words Cmd+Space. Both belong to the page. The page can drop the key combination. That is the documented installer case, and the corpus holds it.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? brew.sh, ohmyz.sh, the nvm README, and rustup.rs. They copy these shapes and do not ask for Cmd+Space.
- Richtig: Die Formen waren null, danach weak. Der E2E-Köder war erst still, weil das Anführungszeichen den Knopf zerlegt hat, und danach auf der Warnseite. Die Korpora bleiben bei 0. Die 107 Installationsseiten: 105 geladen, 2 ohne Tab-Eintrag, 23 Kopierknöpfe, 0 Warnungen.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil Homebrew dieselbe Form hat und nur der Köder mit Cmd+Space blockt. Die Stufe bleibt schwach.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? `zsh -c` und `wget | bash` sind getestet. `curl | python` ist geprüft und bleibt ohne Beleg unbewertet. `curl | sudo nohup bash` ist getestet und bleibt ohne Stufe.

Urteil: BEHALTEN

## 2026-11-17 — A visible install line inside a longer copy

- Hypothesis: the GitBook warning is a readability miss (shadow, contrast, or overflow), so the excerpt and the live page disagree about the same string.
- Result: They disagree about different strings. The copy button wrote 48 lines. 18 are in the page text. The install line is one of them, in a readable light-DOM span below the fold, not in a shadow root. The excerpt stored only that line, so the excerpt test stays quiet. The bridge asked whether the whole clipboard was shown, reported `clickfix-weak`, and the worker turned that into `clickfix-unseen` on a user site on a hosting zone. A weak clipboard is now shown when every weak line is readable. Other lines do not have to be on the page. If no line is weak on its own, the whole string is still checked. A strong command is still judged on the whole string first.
- Evidence: red first, on the build from `2b783fd`. A `github.io` page that shows the install line and copies it between two plain lines went to `warning.html`. The same longer copy with the line absent also went to `warning.html`. After the change the first page stays up and the second still warns. The host is not special-cased. The 629 pages were not opened again. Weights unchanged.
- Open doubt: a weak line longer than the 4 000-character window, or one the walk does not reach before 12 ms, can still be missed. Text under 3:1 contrast is still hidden. Branded Chrome’s `contentSettings` grant is still not measured.

### Self-check

- Real user, real attack: A doc whose Copy button copies a visible install line plus source the page does not render stays up. A longer copy that hides a weak line still reaches the warning screen.
- Five-minute bypass: Put a second weak line in the copied text and leave it off the page. Tested: the hidden page still warns. Named, not given its own page: a strong command inside the same longer copy. That still blocks, because the whole string is judged first.
- False alarm: The GitBook page is the legitimate page in this category. A hosting-zone doc that shows the line and copies extra notes is the same shape. A page that only hides the line is not.
- Simpler or more complicated: The decision got smaller. One weak line is the unit, not the whole clipboard. The walk is shared. No new signal.
- AGENTS.md: Nothing new is sent. No permission, no network request, no weight change. The page still cannot turn the check off.
- Would I defend it: Yes, as “a visible install line is shown even when the copy has other lines.” Not as “the 629-page run is now clean.”
- Harmless on weird input: A weak line shorter than 12 characters is not treated as shown. An empty copy is unchanged. The textarea that holds the copy is still skipped.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The context is whether each weak line is readable text. The attacker owns the copy and the page, and can hide a line. That hidden line still warns. The attacker cannot make an unread line count as shown by padding the copy with other text.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? The Copy button’s string belongs to the page. The readable text belongs to the page. The check compares those two, one weak line at a time.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? A GitBook (or any hosting-zone doc) whose Copy button copies a section: the visible install line plus source the rendered page does not show.
- Richtig: Gemessen auf der echten Seite (Licht-DOM, lesbar, 48 Zeilen, die Installationszeile steht im Text). Der Test war rot, bevor die Prüfung geändert wurde, und danach grün. Die versteckte Zeile warnt weiter.
- Gut für das Vorhaben: Ein Prüfer kann den Satz verteidigen, weil die Seite und der Test dieselbe Form haben. Die Erweiterung warnt eine echte Doku-Seite weniger, ohne eine versteckte Zeile durchzulassen. Sie ist an dieser Stelle kleiner in der Entscheidung, nicht in der Zeilenzahl.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Eine zweite schwache Zeile, die nicht auf der Seite steht. Getestet. Ein starker Befehl in demselben langen Text blockt weiter, weil der ganze Text zuerst geprüft wird. Das ist der bestehende Pfad, nicht eine neue Seite.

Urteil: BEHALTEN

### Rückblick, Durchgänge 1–3

Messung, `contentSettings`-Protokoll, diese Zeilenprüfung. Die Messung hat eine echte Fehlwarnung gefunden, statt eine Rate zu behaupten. Das Protokoll hat eine Manifest-Änderung gestoppt, die nur zur Hälfte belegt war. Diese Prüfung macht die Entscheidung kleiner: eine schwache Zeile, nicht die ganze Zwischenablage. Die Erkennung ist nicht um einen Detektor gewachsen. Die 93 nicht geladenen Seiten und die Brücke mit 1 252 Zeilen sind die nächsten Vereinfachungen, nicht neue Signale.

## 2026-11-17 — contentSettings grant after an update

- Hypothesis: moving `contentSettings` from required to optional keeps an existing grant on Chrome and on Edge, so the manifest can change.
- Result: Edge 157 kept it. A dedicated profile installed 1.1.0 with the permission required, the notification toggle was turned on, then the same folder was updated to 1.1.1 with the permission only optional. The extension stayed enabled, `permissions.contains` stayed true, `chrome.contentSettings` stayed present, and the toggle stayed on. Branded Chrome 158 never started the extension: `--load-extension` is ignored, and `Extensions.loadUnpacked` returned an id with no service worker and nothing stored in the profile. The manifest was not changed. The three declined detectors stay declined.
- Evidence: Edge probe before and after the version bump. Chrome probe stopped at “no service worker”. Weights unchanged. No permission moved.
- Open doubt: branded Chrome’s update grant. Chrome for Testing was not on this machine, and Playwright’s Chromium has no `chrome.exe` (the file is gone). Until one of those is measured, the move stays unbuilt.

### Self-check

- Real user, real attack: No new warning. An Edge user who already allowed notification blocking would still have that API after this kind of update. A Chrome user was not measured.
- Five-minute bypass: Not a detector. The way to miss the Chrome half is to call a Chromium result “Chrome”. That was not done.
- False alarm: None. The manifest still requires `contentSettings`.
- Simpler or more complicated: A measurement and a no. The options toggle was not rewritten.
- AGENTS.md: Nothing new is sent. No permission was added or removed. `privacy`, `scripting`, and `management` stay required.
- Would I defend it: Yes, as “Edge keeps the grant; Chrome was not loaded, so the manifest stays.” Not as “both browsers are done.”
- Harmless on weird input: The test extension was a copy in a temp profile. The repo manifest was not edited.
- Woher kommt der Kontext, auf den meine Erkennung sich verlässt, und kann der Angreifer ihn für mich unsichtbar machen? The result is the browser’s own `permissions.contains` and the presence of `chrome.contentSettings` after a restart. A page cannot set that.
- Welche Funktion, auf die sich meine Prüfung verlässt, gehört der Seite? None. The grant belongs to the browser profile.
- Welche legitime Seite liegt in genau der Kategorie, die ich gerade als verdächtig behandle? WhatsApp Web and a calendar site, which keep their notification prompts while the toggle is off. This pass did not block them.
- Richtig: Gemessen auf Edge, vor und nach dem Versionswechsel. Chrome ist als nicht gemessen hingeschrieben, nicht als bestanden.
- Gut für das Vorhaben: Ein Prüfer kann den Stopp verteidigen. Die Erweiterung ist nicht größer geworden.
- Was wäre der Fünf-Minuten-Bypass, und habe ich ihn getestet oder nur benannt? Den Chromium-Lauf als Chrome ausgeben. Nicht getan. Der echte Chrome-Lauf ist erst belegt, wenn ein Build die Erweiterung startet.

Urteil: BEHALTEN

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
