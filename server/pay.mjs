import { mintLicense } from "./license.mjs";
import { verifyStripeSignature } from "./stripe.mjs";
import { recordStripeEvent } from "./billing-state.mjs";

const LICENSE_DAYS = Number.parseInt(process.env.LICENSE_DAYS ?? "365", 10);

function html(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; font-family: "Segoe UI", sans-serif; }
    body { max-width: 28rem; margin: 12vh auto; padding: 0 1.25rem; line-height: 1.45; }
    textarea { width: 100%; min-height: 6rem; font: inherit; }
    button { font: inherit; padding: 0.6rem 1rem; border-radius: 999px; border: 0; background: #1c1a16; color: #fffcf7; cursor: pointer; }
    .ghost { background: transparent; color: inherit; border: 1px solid currentColor; margin-left: 0.4rem; }
    .ok { color: #2f7d56; }
    .err { color: #b5523f; }
    code { word-break: break-all; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function isExtensionId(value) {
  return typeof value === "string" && /^[a-z]{32}$/.test(value);
}

export function publicBase() {
  return (process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${process.env.FUNDAMENT_PORT ?? "8787"}`).replace(/\/$/, "");
}

export async function createStripeCheckout(extId) {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const price = process.env.STRIPE_PRICE_ID ?? "";
  if (!secret || !price) return null;
  const mode = process.env.STRIPE_MODE === "subscription" ? "subscription" : "payment";
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("line_items[0][price]", price);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${publicBase()}/pay/success?session_id={CHECKOUT_SESSION_ID}&ext=${extId}`);
  params.set("cancel_url", `${publicBase()}/pay/cancel`);
  if (extId) {
    params.set("client_reference_id", extId);
    params.set("metadata[ext]", extId);
    if (mode === "subscription") params.set("subscription_data[metadata][ext]", extId);
  }
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 300));
  }
  return response.json();
}

export async function loadPaidCheckoutSession(sessionId) {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secret || !sessionId || sessionId.length > 200) return null;
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  url.searchParams.append("expand[]", "subscription");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) return null;
  const session = await response.json();
  const paid = session.payment_status === "paid" || session.status === "complete";
  return paid ? session : null;
}

function subscriptionId(session) {
  if (typeof session?.subscription === "string") return session.subscription;
  if (session?.subscription && typeof session.subscription.id === "string") return session.subscription.id;
  return "";
}

function licenseDaysFromSession(session) {
  const sub = session?.subscription;
  const end = sub && typeof sub === "object" ? sub.current_period_end : null;
  if (typeof end === "number" && end > Date.now() / 1000) {
    return Math.max(1, Math.ceil((end - Date.now() / 1000) / 86400));
  }
  return LICENSE_DAYS;
}

function successPage(token, extId) {
  const escaped = token.replace(/[<>&]/g, "");
  return html(
    "Fundament Pro",
    `<h1>You're in.</h1>
<p>Payment is done. Activate Pro in the browser that has Fundament installed.</p>
<textarea id="token" readonly>${escaped}</textarea>
<p>
  <button type="button" id="activate">Activate in Fundament</button>
  <button type="button" class="ghost" id="copy">Copy license</button>
</p>
<p id="status"></p>
<script>
const token = document.getElementById("token").value.trim();
const ext = ${JSON.stringify(extId)};
document.getElementById("copy").onclick = async () => {
  await navigator.clipboard.writeText(token);
  document.getElementById("status").textContent = "License copied.";
};
document.getElementById("activate").onclick = () => {
  const status = document.getElementById("status");
  if (!ext || !window.chrome?.runtime?.sendMessage) {
    status.className = "err";
    status.textContent = "Open this page in Chrome with Fundament installed, or paste the license under Upgrade.";
    return;
  }
  chrome.runtime.sendMessage(ext, { type: "ACTIVATE_LICENSE", token }, (response) => {
    if (chrome.runtime.lastError) {
      status.className = "err";
      status.textContent = chrome.runtime.lastError.message + " Paste the license in the extension if this tab cannot reach it.";
      return;
    }
    if (response && response.type === "ERROR") {
      status.className = "err";
      status.textContent = response.message;
      return;
    }
    status.className = "ok";
    status.textContent = "Pro is active. You can close this tab.";
  });
};
</script>`,
  );
}

export async function handlePay(req, res, url) {
  const ext = isExtensionId(url.searchParams.get("ext") ?? "") ? url.searchParams.get("ext") : "";

  if (req.method === "GET" && url.pathname === "/pay/cancel") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html("Checkout cancelled", "<h1>Checkout cancelled</h1><p>No charge. You can close this tab.</p>"));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/pay/start") {
    try {
      const session = await createStripeCheckout(ext);
      if (session?.url) {
        res.writeHead(302, { Location: session.url });
        res.end();
        return true;
      }
    } catch (error) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Stripe checkout failed. ${error && error.message ? error.message : ""}`);
      return true;
    }
    if (process.env.ALLOW_DEMO_CHECKOUT === "1") {
      res.writeHead(302, { Location: `${publicBase()}/pay/success?demo=1&ext=${ext}` });
      res.end();
      return true;
    }
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Checkout is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID, or ALLOW_DEMO_CHECKOUT=1 for local tests.");
    return true;
  }

  if (req.method === "GET" && url.pathname === "/pay/success") {
    const demo = url.searchParams.get("demo") === "1" && process.env.ALLOW_DEMO_CHECKOUT === "1";
    const sessionId = url.searchParams.get("session_id") ?? "";
    let session = null;
    if (!demo && sessionId) {
      session = await loadPaidCheckoutSession(sessionId);
    }
    if (!demo && !session) {
      res.writeHead(402, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html("Payment not confirmed", "<h1>Payment not confirmed</h1><p>Stripe did not report a paid session. Do not activate a license.</p>"));
      return true;
    }
    const token = mintLicense(demo ? LICENSE_DAYS : licenseDaysFromSession(session), {
      sid: session?.id,
      sub: subscriptionId(session),
      ext,
    });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(successPage(token, ext));
    return true;
  }

  return false;
}

export function processStripeWebhook(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!verifyStripeSignature(rawBody, signatureHeader, secret)) {
    return { ok: false, status: 400 };
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400 };
  }
  if (typeof event?.type !== "string") return { ok: false, status: 400 };
  recordStripeEvent(event);
  return { ok: true, status: 200 };
}
