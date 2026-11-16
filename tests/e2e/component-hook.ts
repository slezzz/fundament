/**
 * A Lit-style custom element: attachShadow in the constructor, then render into
 * the root it returns. The page records whether the sealed hook still behaves
 * like the browser method. No clipboard command lives in this file.
 */
export function componentHookPage(): string {
  return `<!doctype html><title>Components</title><h1>Cards</h1>
<script>
class DocCard extends HTMLElement {
  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    var span = document.createElement("span");
    span.textContent = "shown";
    root.appendChild(span);
  }
}
customElements.define("doc-card", DocCard);
var checks = [];
var host = document.createElement("div");
document.body.appendChild(host);
var root = host.attachShadow({ mode: "open" });
checks.push(root instanceof ShadowRoot && host.shadowRoot === root);
checks.push(host.attachShadow === Element.prototype.attachShadow);
checks.push(Object.getPrototypeOf(host.attachShadow) === Function.prototype);
var threw = false;
try { host.attachShadow({ mode: "open" }); } catch (e) { threw = e instanceof DOMException; }
checks.push(threw);
var other = document.createElement("span");
document.body.appendChild(other);
var moved = Element.prototype.attachShadow.call(other, { mode: "open" });
checks.push(other.shadowRoot === moved);
var closedHost = document.createElement("div");
document.body.appendChild(closedHost);
var closedRoot = closedHost.attachShadow({ mode: "closed" });
checks.push(closedRoot instanceof ShadowRoot && closedRoot.mode === "closed" && closedHost.shadowRoot === null);
for (var i = 0; i < 200; i++) document.body.appendChild(document.createElement("doc-card"));
var card = document.querySelector("doc-card");
checks.push(document.querySelectorAll("doc-card").length === 200 && card.shadowRoot !== null && card.shadowRoot.textContent.indexOf("shown") !== -1);
var mark = document.createElement("p");
mark.id = "hook";
mark.textContent = checks.every(Boolean) ? "hook-ok" : "hook-bad";
document.body.appendChild(mark);
</script>`;
}
