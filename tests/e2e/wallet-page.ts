const spender = `${"0".repeat(24)}${"11".repeat(20)}`;
const unlimited = `0x095ea7b3${spender}${"f".repeat(64)}`;
const limited = `0x095ea7b3${spender}${"0".repeat(63)}1`;

/** Local fake wallet. No chain and no network. The bridge must wrap request before a click. */
export const walletPage = `<!doctype html><title>Wallet</title>
<button id="unlimited">unlimited</button>
<button id="permit">permit</button>
<button id="blind">blind</button>
<button id="plain">plain</button>
<button id="silence">silence</button>
<script>
window.__reached = [];
window.__result = "";
var unlimited = ${JSON.stringify(unlimited)};
var limited = ${JSON.stringify(limited)};
window.ethereum = {
  request: function (args) {
    var data = args && args.params && args.params[0] && args.params[0].data;
    var mark = args.method + (data ? ":" + data.slice(0, 10) : "");
    window.__reached.push(mark);
    sessionStorage.setItem("fundament-wallet-reached", (sessionStorage.getItem("fundament-wallet-reached") || "") + mark + ",");
    return Promise.resolve("wallet");
  }
};
window.dispatchEvent(new Event("ethereum#initialized"));
function ask(args) {
  window.__result = "";
  window.ethereum.request(args).then(function () { window.__result = "ok"; }, function () { window.__result = "err"; });
}
document.getElementById("unlimited").onclick = function () {
  ask({ method: "eth_sendTransaction", params: [{ data: unlimited }] });
};
document.getElementById("permit").onclick = function () {
  ask({ method: "eth_signTypedData_v4", params: ["0xabc", JSON.stringify({ primaryType: "Permit", message: { spender: "0x1", value: "1" } })] });
};
document.getElementById("blind").onclick = function () {
  ask({ method: "eth_sign", params: ["0xabc", "0xdead"] });
};
document.getElementById("plain").onclick = function () {
  ask({ method: "eth_chainId", params: [] });
  ask({ method: "eth_accounts", params: [] });
  ask({ method: "eth_sendTransaction", params: [{ data: limited }] });
};
document.getElementById("silence").onclick = function () {
  window.postMessage({ __fundament: "off" }, "*");
  window.postMessage({ __fundament: "disable-confirm" }, "*");
  window.postMessage({ type: "SET_SETTINGS", walletGuard: false }, "*");
  ask({ method: "eth_sendTransaction", params: [{ data: unlimited }] });
};
</script>`;
