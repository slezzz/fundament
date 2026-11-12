import { useState } from "react";
import type { Entitlements, PlanId } from "@shared/types";
import { LICENSE_PUBLIC_KEY_SPKI_B64 } from "@billing/publicKey";
import { openCheckout, proPriceLabel } from "@billing/checkout";
import { licenseActivationAllowed, paidCheckoutLive } from "@billing/launch";
import { send } from "../lib/messaging";
import { t } from "../lib/i18n";
import type { ServerMessage } from "@shared/messages";

export function PlanView({
  plan,
  entitlements,
  onActivated,
  onBack,
}: {
  plan: PlanId;
  entitlements: Entitlements;
  onActivated: () => Promise<void>;
  onBack: () => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const price = proPriceLabel();
  const checkoutOn = paidCheckoutLive();
  const licenseOn = licenseActivationAllowed(LICENSE_PUBLIC_KEY_SPKI_B64);

  return (
    <main className="plan">
      <button className="text-btn" onClick={onBack}>
        {t("popup_back")}
      </button>
      <p className="plan-badge">{plan === "pro" ? t("popup_planPro") : t("popup_planFree")}</p>
      <h2>{plan === "pro" ? t("plan_onPro") : t("plan_freeTitle")}</h2>
      <p className="hint">{t("plan_hint")}</p>
      {price ? <p className="plan-price">{price}</p> : null}
      <ul className="plan-list">
        <Row label={t("plan_local")} free />
        <Row label={t("plan_ads")} free />
        <Row label={t("plan_extra")} free />
        <Row label={t("plan_hibp")} free />
        <Row label={t("plan_extended")} pro />
        <Row label={t("plan_fp")} pro />
        <Row label={t("plan_cosmetic")} pro />
        <Row label={t("plan_rep")} pro />
        <Row label={t("plan_pack")} pro />
        <li>
          <span>{t("plan_lists")}</span>
          <strong>{entitlements.maxListEntries}</strong>
        </li>
        <li>
          <span>{t("plan_history")}</span>
          <strong>{plan === "pro" ? t("plan_historyPro") : t("plan_historyFree")}</strong>
        </li>
        <li>
          <span>{t("plan_level")}</span>
          <strong>{plan === "pro" ? t("plan_levelAll") : t("level_standard")}</strong>
        </li>
      </ul>
      {plan === "free" && (
        <>
          {checkoutOn ? (
            <>
              <button className="small-btn plan-cta" type="button" onClick={() => openCheckout()}>
                {t("plan_getPro")}
              </button>
              <p className="note">{t("plan_checkoutHow")}</p>
            </>
          ) : (
            <p className="note">{t("plan_comingSoon")}</p>
          )}
          {licenseOn ? (
            <>
              <button className="text-btn" type="button" onClick={() => setShowLicense((v) => !v)}>
                {t("plan_haveLicense")}
              </button>
              {showLicense && (
                <>
                  <label className="field">
                    {t("plan_license")}
                    <textarea
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      spellCheck={false}
                      rows={4}
                      placeholder="fundament1.…"
                    />
                  </label>
                  {error ? <p className="plan-error">{error}</p> : null}
                  <button
                    className="small-btn"
                    type="button"
                    disabled={busy || token.trim().length === 0}
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        setError(null);
                        const response = await send<ServerMessage>({
                          type: "ACTIVATE_LICENSE",
                          token: token.trim(),
                        });
                        setBusy(false);
                        if (response.type === "ERROR") {
                          setError(response.message);
                          return;
                        }
                        await onActivated();
                      })();
                    }}
                  >
                    {t("plan_activate")}
                  </button>
                </>
              )}
            </>
          ) : null}
        </>
      )}
      {plan === "pro" && (
        <button
          className="text-btn"
          type="button"
          onClick={() => {
            void send({ type: "DEACTIVATE_LICENSE" }).then(() => onActivated());
          }}
        >
          {t("plan_remove")}
        </button>
      )}
    </main>
  );
}

function Row({ label, free, pro }: { label: string; free?: boolean; pro?: boolean }) {
  return (
    <li>
      <span>{label}</span>
      <strong className={pro && !free ? "pro-tag" : ""}>{pro ? t("popup_planPro") : t("popup_planFree")}</strong>
    </li>
  );
}
