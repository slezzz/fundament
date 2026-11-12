import { createServer } from "node:http";
import { domainToHttpsOrigin, parseOrigin } from "./validate.mjs";
import { lookupOrigin } from "./safebrowsing.mjs";
import { handlePay, processStripeWebhook } from "./pay.mjs";
import { checkLicenseRevoked } from "./billing-state.mjs";

const LISTEN = process.env.FUNDAMENT_LISTEN ?? "127.0.0.1";
const PORT = Number.parseInt(process.env.FUNDAMENT_PORT ?? "8787", 10);
const API_KEY = process.env.SAFE_BROWSING_API_KEY ?? "";
const MOCK = process.env.MOCK_SAFE_BROWSING === "1";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const bucket = hits.get(ip) ?? [];
  const recent = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(json);
}

function unavailable(res, status = 200) {
  send(res, status, {
    listed: false,
    source: "google-safe-browsing",
    available: false,
  });
}

async function readRaw(req, max = 65_536) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error("too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer((req, res) => {
  void handle(req, res);
});

async function handle(req, res) {
  const ip = req.socket.remoteAddress ?? "unknown";
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    send(res, 200, {
      ok: true,
      safeBrowsing: Boolean(API_KEY) || MOCK,
      checkout: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      demoCheckout: process.env.ALLOW_DEMO_CHECKOUT === "1",
    });
    return;
  }

  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (req.method === "POST" && requestUrl.pathname === "/pay/webhook") {
    try {
      const raw = await readRaw(req);
      const signature = req.headers["stripe-signature"];
      const header = Array.isArray(signature) ? signature[0] : signature;
      const result = processStripeWebhook(raw, header);
      res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ received: result.ok }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ received: false }));
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/v1/license/status") {
    try {
      const payload = JSON.parse(await readRaw(req, 1024));
      const sid = typeof payload?.sid === "string" ? payload.sid.slice(0, 200) : "";
      const sub = typeof payload?.sub === "string" ? payload.sub.slice(0, 200) : "";
      send(res, 200, { revoked: checkLicenseRevoked(sid, sub) });
    } catch {
      send(res, 400, { revoked: false });
    }
    return;
  }

  if (await handlePay(req, res, requestUrl)) {
    return;
  }

  if (req.method !== "POST" || requestUrl.pathname !== "/v1/reputation") {
    send(res, 404, { listed: false, source: "none", available: false });
    return;
  }

  if (!rateLimit(ip)) {
    unavailable(res, 429);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRaw(req, 1024));
    if (!payload || typeof payload !== "object") payload = {};
  } catch {
    unavailable(res, 400);
    return;
  }

  const origin =
    parseOrigin(payload?.origin) ?? domainToHttpsOrigin(payload?.domain);
  if (!origin) {
    unavailable(res, 400);
    return;
  }

  const hostname = new URL(origin).hostname;
  try {
    const result = await lookupOrigin(origin, hostname, { apiKey: API_KEY, mock: MOCK });
    send(res, 200, result);
  } catch {
    unavailable(res, 200);
  }
}

server.listen(PORT, LISTEN, () => {
  const mode = API_KEY ? "safe-browsing" : MOCK ? "mock" : "unconfigured";
  process.stdout.write(`Fundament reputation listening on http://${LISTEN}:${PORT} (${mode})\n`);
  if (process.env.ALLOW_DEMO_CHECKOUT === "1") {
    process.stdout.write("WARNING: ALLOW_DEMO_CHECKOUT=1 — never use this on the public pay host.\n");
  }
});
