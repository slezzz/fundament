# Wallet delegation and lookalike addresses

**Recommendation: No, not in this release.** Neither check is a bypass of a check that already exists. Detection is frozen until after 1.2. The batch case that hides the existing `approve` and `setApprovalForAll` selectors is a bypass and is separate: it stays in `wallet_sendCalls` and is not this memo.

## Threat and primary source

EIP-7702, [Set code for EOAs](https://eips.ethereum.org/EIPS/eip-7702). A transaction can carry an `authorizationList`. Each entry lets an externally owned account delegate execution to other code. A wallet that forwards that list is asking the account to run delegated code. That is a new field. It does not hide the calldata selectors the bridge already confirms.

Address poisoning, [MetaMask Help Center](https://support.metamask.io/stay-safe/protect-yourself/wallet-and-hardware/address-poisoning-scams/). The attacker watches a transfer, generates a vanity address whose start and end match an address the account already used, and sends a dust or zero-value transfer so the lookalike shows up in the history. The loss happens later, when the person copies that history entry and sends funds to it. MetaMask’s own description of the warning compares the destination with addresses the account has interacted with before. The first four and last four characters match and the middle does not.

Etherscan’s [Address Poisoning Attacks](https://info.etherscan.com/what-is-address-poisoning/) describes the same shape: a vanity address that matches the first and last characters of a target, then a tiny token transfer so the victim copies the spoofed address.

## What the browser can see

The bridge sees the request the page sends to the injected provider. For `eth_sendTransaction` that is one transaction object. It has `from`, `to`, and calldata. It does not have the account’s earlier recipients. The extension does not read the wallet’s history, and it must not start doing so for this memo.

## Why the drafted check missed the attack

The uncommitted draft returned a confirm when `from` and `to` on the same transaction shared the first four and last four hex digits and were not equal. That compares the sender with the destination of this one request.

The published attack does not do that. The lookalike imitates an earlier recipient, or the account’s own address as it appears in history, and the later send is `from` the real account `to` that lookalike. Those two addresses match at the ends only when the earlier recipient happened to share the sender’s own prefix and suffix. MetaMask’s write-up treats “matches yours” and “matches your friend’s” as two cases, and the detection they ship compares the destination with previous counterparties, not with `from` on the same call.

So the draft fires on a rare vanity payment to an address that looks like the sender, and it stays quiet on the common case: a send to a lookalike of someone the account paid before. It is not evidence that the existing calldata check is being bypassed.

## Detection

No rule in this memo is approved to build.

An `authorizationList` with any entry would be a new confirm on a field the current bridge ignores. That is new detection. It does not smuggle an unlimited `approve` past the selector check. A batch that puts that selector in `calls[].data` is the existing check, and it is already applied.

A lookalike warning that matched the real attack would need the account’s earlier counterparties. This extension does not have that list. Inventing one from pages the user visited would be a new data store. Comparing `from` with `to` does not substitute for it.

## Data read

Today: nothing new. The request arguments are already what the bridge sees, and only the existing selectors are judged.

A later lookalike check would need recipient history from the wallet. That history is not on the page, and this memo does not approve reading it.

## Does anything leave the device

No.

## Permissions

None.

## False alarms and the counterexample corpus

EIP-7702: a real account-abstraction or session-key flow that the user meant to sign. No corpus of those transactions is in the repo. Warning on every non-empty `authorizationList` would interrupt that flow with no measured false-alarm rate.

Lookalike: two addresses the user chose that happen to share four leading and four trailing hex digits. With 8 hex digits constrained, that is rare, but it is also not the attack. The dangerous false negative is the one above. There is no corpus of prior recipients.

## Measurement plan, if this is reopened after 1.2

1. A fixture of public, already-published poisoning transactions: dust transfer from a vanity address, then a later send whose `to` matches that vanity address at the first four and last four hex digits and does not match `from`. The `from`/`to` comparison must stay quiet. That is the pass/fail for any replacement.
2. A fixture of intentional EIP-7702 authorizations from a wallet the user meant to delegate, long enough to count false confirms. No such fixture exists yet.
3. Do not add the confirm until both fixtures exist and the replacement is a bypass of a check already in the bridge, or detection is explicitly unfrozen.

## Verdict

Do not ship. The drafted `from` comparison does not catch the attack MetaMask and Etherscan describe.
