import { handlePay } from "../../server/pay.mjs";
import { licenseExpFromSession } from "../../server/license-term.mjs";
import { resetPayLimits } from "../../server/pay.mjs";

const PRIV = "MC4CAQAwBQYDK2VwBCIEIGow2bwmfeQU4rx99iwrF5r+u2wdb+JmyC84+3n0t0l3";

function expOf(html: string): number {
  const match = html.match(/fundament1\.([A-Za-z0-9_-]+)\./);
  const body = match?.[1];
  if (!body) throw new Error("no license on the page");
  const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { exp?: number };
  return json.exp ?? 0;
}

function response() {
  let status = 0;
  let body = "";
  return {
    writeHead(code: number) {
      status = code;
    },
    end(chunk?: string) {
      body = chunk ?? "";
    },
    get status() {
      return status;
    },
    get body() {
      return body;
    },
  };
}

describe("success page restores one license", () => {
  it("mints the same exp on the second visit and refuses the session after the year", async () => {
    process.env.LICENSE_PRIVATE_KEY_PKCS8_B64 = PRIV;
    process.env.STRIPE_SECRET_KEY = "sk_test_local";
    process.env.STRIPE_MODE = "payment";
    resetPayLimits();
    const now = Math.floor(Date.now() / 1000);
    const created = now - 10 * 24 * 60 * 60;
    const id = `cs_test_${"c".repeat(24)}`;
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({ id, created, payment_status: "paid", status: "complete" }),
      }) as Response) as typeof fetch;
    try {
      const first = response();
      const second = response();
      const url = new URL(`http://127.0.0.1/pay/success?session_id=${id}`);
      const req = { method: "GET", socket: { remoteAddress: "203.0.113.20" } };
      await handlePay(req, first, url);
      await handlePay(req, second, url);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(expOf(second.body)).toBe(expOf(first.body));
      expect(expOf(first.body)).toBe(licenseExpFromSession({ created }, now));
      expect(first.body).toContain("Bewahre diese Adresse");

      const expired = response();
      globalThis.fetch = (async () =>
        ({
          ok: true,
          json: async () => ({
            id: `cs_test_${"d".repeat(24)}`,
            created: now - 400 * 24 * 60 * 60,
            payment_status: "paid",
            status: "complete",
          }),
        }) as Response) as typeof fetch;
      await handlePay(
        req,
        expired,
        new URL(`http://127.0.0.1/pay/success?session_id=cs_test_${"d".repeat(24)}`),
      );
      expect(expired.status).toBe(402);
      expect(expired.body).not.toContain("fundament1.");
    } finally {
      globalThis.fetch = original;
      delete process.env.STRIPE_SECRET_KEY;
    }
  });
});
