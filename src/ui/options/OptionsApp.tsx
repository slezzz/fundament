import { useEffect, useState } from "react";
import { paidCheckoutLive } from "@billing/launch";
import { openCheckout } from "@billing/checkout";
import { parseSettings } from "@storage/settings";
import { APP_VERSION, ENGINE_VERSION } from "@engine/version";
import { pwnedCountForHash, sha1Hex } from "@privacy/hibp";
import { send } from "../lib/messaging";
import { normalizePopupState } from "../lib/popupState";
import { t } from "../lib/i18n";
import { BrandMark } from "../components/BrandMark";
import { Toggle } from "../components/Toggle";
import type { ServerMessage } from "@shared/messages";
import type { ExtensionChangeView, ExtensionRiskView, FeedStatusView, PopupState, PostureItem, Settings } from "@shared/types";

export function OptionsApp() {
  const [state, setState] = useState<PopupState | null>(null);
  const [audit, setAudit] = useState<ExtensionRiskView[]>([]);
  const [changes, setChanges] = useState<ExtensionChangeView[]>([]);
  const [posture, setPosture] = useState<PostureItem[] | null>(null);
  const [feed, setFeed] = useState<FeedStatusView | null>(null);
  const [feedBusy, setFeedBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pwned, setPwned] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [packUrl, setPackUrl] = useState("");
  const [packPin, setPackPin] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [iocUrl, setIocUrl] = useState("");
  const [iocPin, setIocPin] = useState("");
  const [iocBusy, setIocBusy] = useState(false);

  async function refresh() {
    const response = await send<ServerMessage>({ type: "GET_POPUP_STATE" }).catch(() => null);
    if (response?.type === "POPUP_STATE") {
      const next = normalizePopupState(response.state);
      setState(next);
      if (next) {
        setPackUrl(next.settings.filterPackUrl);
        setPackPin(next.settings.filterPackSha256);
        setIocUrl(next.settings.iocFeedUrl);
        setIocPin(next.settings.iocFeedSha256);
      }
      setError(null);
    } else {
      setError(t("dash_loadError"));
    }
    const auditResponse = await send<ServerMessage>({ type: "GET_EXTENSION_AUDIT" }).catch(() => null);
    if (auditResponse?.type === "EXTENSION_AUDIT") {
      setAudit(auditResponse.items);
      setChanges(Array.isArray(auditResponse.changes) ? auditResponse.changes : []);
    }
    const postureResponse = await send<ServerMessage>({ type: "GET_POSTURE" }).catch(() => null);
    if (postureResponse?.type === "POSTURE") setPosture(postureResponse.items);
    const feedResponse = await send<ServerMessage>({ type: "GET_FEED_STATUS" }).catch(() => null);
    if (feedResponse?.type === "FEED_STATUS") setFeed(feedResponse.status);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function patch(next: Partial<Settings>) {
    const response = await send<ServerMessage>({ type: "UPDATE_SETTINGS", patch: next });
    if (response.type === "SETTINGS") {
      setState((prev) => (prev ? { ...prev, settings: parseSettings(response.settings) } : prev));
    }
    await refresh();
  }

  async function checkLeak() {
    const value = password;
    setPassword("");
    setBusy(true);
    setPwned(null);
    try {
      const hash = await sha1Hex(value);
      const result = await pwnedCountForHash(hash);
      if (!result.available) {
        setPwned(t("dash_hibpUnreachable"));
      } else if (result.count === 0) {
        setPwned(t("dash_hibpClean"));
      } else {
        setPwned(t("dash_hibpHit", [result.count.toLocaleString()]));
      }
    } catch {
      setPwned(t("dash_hibpFail"));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="dash">
        <p>{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="dash">
        <p className="muted">{t("dash_loading")}</p>
      </div>
    );
  }

  const lifetime = state.lifetime;
  const settings = state.settings;

  return (
    <div className="dash">
      <header>
        <div className="dash-title">
          <BrandMark size={36} />
          <div>
            <h1>{t("dash_title")}</h1>
            <p className="muted">
              v{APP_VERSION} · engine {ENGINE_VERSION} · {state.plan}
            </p>
            <p className="muted credits">
              {t("dash_credits")}{" "}
              <a href={chrome.runtime.getURL("THIRD_PARTY_NOTICES.txt")} target="_blank" rel="noopener">
                {t("dash_creditsLink")}
              </a>
            </p>
          </div>
        </div>
      </header>
      {!state.integrity.ok ? (
        <section className="integrity-banner" role="alert">
          <h2>{t("dash_integrity")}</h2>
          <p className="note">{t("dash_integrityFail")}</p>
          <p className="note">{state.integrity.detail}</p>
        </section>
      ) : null}

      <section>
        <h2>{t("dash_posture")}</h2>
        <p className="note">{t("dash_postureNote")}</p>
        {posture === null ? (
          <p className="muted">{t("dash_loading")}</p>
        ) : (
          <ul className="posture">
            {posture.map((item) => (
              <li key={item.id} className={`posture-${item.status}`}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">{item.detail}</span>
                </div>
                {item.fix && item.status !== "ok" ? (
                  <button type="button" onClick={() => void send({ type: "OPEN_SETTINGS_PAGE", url: item.fix ?? "" })}>
                    {t("dash_postureFix")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t("dash_lifetime")}</h2>
        <div className="stats">
          <div>
            <strong>{lifetime.trackers}</strong>
            {t("dash_hits")}
          </div>
          <div>
            <strong>{lifetime.threats}</strong>
            {t("dash_events")}
          </div>
          <div>
            <strong>{lifetime.downloads}</strong>
            {t("dash_downloads")}
          </div>
        </div>
      </section>

      <section>
        <h2>{t("dash_modules")}</h2>
        <h3 className="sec-label">{t("popup_secEveryday")}</h3>
        <Toggle
          label={t("toggle_trackers")}
          checked={settings.trackerBlocking}
          onChange={(trackerBlocking) => void patch({ trackerBlocking })}
        />
        <Toggle
          label={t("toggle_cosmetic")}
          hint={state.entitlements.cosmeticFiltering ? t("toggle_cosmeticHint") : t("toggle_cosmeticHintFree")}
          checked={settings.cosmeticFiltering}
          onChange={(cosmeticFiltering) => {
            if (!state.entitlements.cosmeticFiltering) return;
            void patch({ cosmeticFiltering });
          }}
        />
        <Toggle
          label={t("toggle_phishing")}
          checked={settings.phishingProtection}
          onChange={(phishingProtection) => void patch({ phishingProtection })}
        />
        <Toggle
          label={t("toggle_threats")}
          checked={settings.threatProtection}
          onChange={(threatProtection) => void patch({ threatProtection })}
        />
        <Toggle
          label={t("toggle_pageChecks")}
          checked={settings.pageChecks}
          onChange={(pageChecks) => void patch({ pageChecks })}
        />
        <h3 className="sec-label">{t("popup_secExtra")}</h3>
        <Toggle
          label={t("toggle_overlay")}
          hint={t("toggle_overlayHint")}
          checked={settings.overlayProtection}
          onChange={(overlayProtection) => void patch({ overlayProtection })}
        />
        <Toggle
          label={t("toggle_csp")}
          hint={t("toggle_cspHint")}
          checked={settings.cspReinforce}
          onChange={(cspReinforce) => void patch({ cspReinforce })}
        />
        <Toggle
          label={t("toggle_fingerprint")}
          hint={t("toggle_fingerprintHint")}
          checked={settings.fingerprintShield}
          onChange={(fingerprintShield) => void patch({ fingerprintShield })}
        />
        <Toggle
          label={t("toggle_ioc")}
          hint={t("toggle_iocHint")}
          checked={settings.iocFeeds}
          onChange={(iocFeeds) => void patch({ iocFeeds })}
        />
        <Toggle
          label={t("toggle_downloads")}
          checked={settings.downloadProtection}
          onChange={(downloadProtection) => void patch({ downloadProtection })}
        />
        <Toggle
          label={t("toggle_https")}
          checked={settings.httpsUpgrade}
          onChange={(httpsUpgrade) => void patch({ httpsUpgrade })}
        />
        <Toggle
          label={t("toggle_harden")}
          checked={settings.hardenBrowser}
          onChange={(hardenBrowser) => void patch({ hardenBrowser })}
        />
        <Toggle
          label={t("toggle_notifyBlock")}
          hint={t("toggle_notifyBlockHint")}
          checked={settings.blockNotificationPrompts}
          onChange={(blockNotificationPrompts) => void patch({ blockNotificationPrompts })}
        />
        <Toggle
          label={t("toggle_searchMarks")}
          hint={t("toggle_searchMarksHint")}
          checked={settings.searchMarks}
          onChange={(searchMarks) => void patch({ searchMarks })}
        />
      </section>

      <section>
        <h2>{t("dash_integrity")}</h2>
        <p className="note">{state.integrity.ok ? t("dash_integrityOk") : t("dash_integrityFail")}</p>
        <p className="note">{state.integrity.detail}</p>
      </section>

      <section>
        <h2>{t("dash_feed")}</h2>
        {feed ? (
          <>
            <p className="note">{t("dash_feedShipped", [feed.shippedHosts.toLocaleString()])}</p>
            {!feed.live.configured ? (
              <p className="note">{t("dash_feedLiveOff")}</p>
            ) : (
              <>
                <Toggle
                  label={t("toggle_liveFeed")}
                  hint={t("toggle_liveFeedHint")}
                  checked={settings.liveFeed}
                  onChange={(liveFeed) => void patch({ liveFeed })}
                />
                <p className="note">
                  {feed.live.generated
                    ? t("dash_feedLive", [feed.live.hostCount.toLocaleString(), new Date(feed.live.generated).toLocaleString()])
                    : t("dash_feedLiveNever")}
                  {feed.live.error ? ` · ${t("dash_feedLiveError", [feed.live.error])}` : ""}
                </p>
                <button
                  type="button"
                  disabled={feedBusy || !settings.liveFeed}
                  onClick={async () => {
                    setFeedBusy(true);
                    const response = await send<ServerMessage>({ type: "REFRESH_LIVE_FEED" }).catch(() => null);
                    if (response?.type === "FEED_STATUS") setFeed(response.status);
                    setFeedBusy(false);
                  }}
                >
                  {t("dash_feedRefresh")}
                </button>
              </>
            )}
          </>
        ) : (
          <p className="muted">{t("dash_loading")}</p>
        )}
      </section>

      <section>
        <h2>{t("dash_ioc")}</h2>
        <p className="note">
          {t("dash_iocStatus", [
            String(state.iocFeed.hostCount),
            String(state.iocFeed.version),
            state.iocFeed.updatedAt
              ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(state.iocFeed.updatedAt)
              : t("dash_packNever"),
          ])}
        </p>
        {state.iocFeed.error ? <p className="note">{state.iocFeed.error}</p> : null}
        <p className="note">{t("dash_iocNote")}</p>
        <label className="field">
          {t("dash_iocUrl")}
          <input value={iocUrl} onChange={(e) => setIocUrl(e.target.value)} spellCheck={false} />
        </label>
        <label className="field">
          {t("dash_iocPin")}
          <input value={iocPin} onChange={(e) => setIocPin(e.target.value)} spellCheck={false} />
        </label>
        <div className="row">
          <button
            className="small-btn"
            type="button"
            disabled={iocBusy}
            onClick={() => {
              void (async () => {
                setIocBusy(true);
                await patch({ iocFeedUrl: iocUrl.trim(), iocFeedSha256: iocPin.trim().toLowerCase() });
                await send({ type: "REFRESH_IOC_FEED" });
                await refresh();
                setIocBusy(false);
              })();
            }}
          >
            {t("dash_iocRefresh")}
          </button>
          <button
            className="small-btn"
            type="button"
            disabled={!state.iocFeed.canRollback || iocBusy}
            onClick={() => void send({ type: "ROLLBACK_IOC_FEED" }).then(() => refresh())}
          >
            {t("dash_iocRollback")}
          </button>
        </div>
      </section>

      <section>
        <h2>{t("dash_extensions")}</h2>
        <p className="note">{t("dash_extensionsNote")}</p>
        {changes.filter((c) => c.kind === "escalated").length > 0 ? (
          <div className="ext-changes" role="alert">
            <h3 className="sec-label">{t("dash_extChanges")}</h3>
            <ul>
              {changes
                .filter((c) => c.kind === "escalated")
                .slice(0, 8)
                .map((c) => (
                  <li key={`${c.id}-${c.at}`} className={`ext-change-${c.severity}`}>
                    <strong>{c.name}</strong>{" "}
                    <span className="muted">
                      {c.fromVersion} → {c.toVersion} · {new Date(c.at).toLocaleDateString()}
                    </span>
                    <span>{t("dash_extChangeAdded", [c.added.slice(0, 6).join(", ")])}</span>
                  </li>
                ))}
            </ul>
            <button type="button" onClick={() => void send({ type: "OPEN_SETTINGS_PAGE", url: "chrome://extensions" })}>
              {t("dash_extOpen")}
            </button>
          </div>
        ) : null}
        {audit.length === 0 ? (
          <p className="muted">{t("dash_extensionsEmpty")}</p>
        ) : (
          <ul className="ext-list">
            {audit.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.name}{" "}
                  <span className={`risk-${item.level}`}>{item.level}</span>
                  {!item.enabled ? ` · ${t("dash_disabled")}` : ""}
                </strong>
                <span className="muted">{item.reasons.length > 0 ? item.reasons.join(" · ") : t("dash_limitedPerms")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>{t("dash_hibp")}</h2>
        <p className="note">{t("dash_hibpNote")}</p>
        <label className="field">
          {t("dash_hibpLabel")}
          <div className="row">
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="small-btn" type="button" disabled={busy || password.length === 0} onClick={() => void checkLeak()}>
              {busy ? t("dash_hibpBusy") : t("dash_hibpCheck")}
            </button>
          </div>
        </label>
        {pwned ? <p className="note">{pwned}</p> : null}
      </section>

      <section>
        <h2>{t("dash_pack")}</h2>
        <p className="note">{state.entitlements.filterPack ? t("dash_packNote") : t("dash_packPro")}</p>
        {state.filterPack.error ? <p className="note">{state.filterPack.error}</p> : null}
        <p className="note">
          {t("dash_packStatus", [
            String(state.filterPack.hostCount),
            state.filterPack.updatedAt
              ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(state.filterPack.updatedAt)
              : t("dash_packNever"),
          ])}
        </p>
        <label className="field">
          {t("dash_packUrl")}
          <input
            value={packUrl}
            onChange={(e) => setPackUrl(e.target.value)}
            spellCheck={false}
            disabled={!state.entitlements.filterPack}
          />
        </label>
        <label className="field">
          {t("dash_packPin")}
          <input
            value={packPin}
            onChange={(e) => setPackPin(e.target.value)}
            spellCheck={false}
            disabled={!state.entitlements.filterPack}
          />
        </label>
        <div className="row">
          <button
            className="small-btn"
            type="button"
            disabled={packBusy || !state.entitlements.filterPack}
            onClick={() => {
              void (async () => {
                setPackBusy(true);
                await patch({ filterPackUrl: packUrl.trim(), filterPackSha256: packPin.trim().toLowerCase() });
                setPackBusy(false);
              })();
            }}
          >
            {t("dash_packSave")}
          </button>
          <button
            className="small-btn"
            type="button"
            disabled={packBusy || !state.entitlements.filterPack}
            onClick={() => {
              void (async () => {
                setPackBusy(true);
                await send({ type: "REFRESH_FILTER_PACK" });
                await refresh();
                setPackBusy(false);
              })();
            }}
          >
            {t("dash_packRefresh")}
          </button>
          {!state.entitlements.filterPack ? (
            paidCheckoutLive() ? (
              <button className="small-btn" type="button" onClick={() => openCheckout()}>
                {t("plan_getPro")}
              </button>
            ) : (
              <p className="note">{t("plan_comingSoon")}</p>
            )
          ) : null}
        </div>
      </section>

      <section>
        <h2>{t("dash_doh")}</h2>
        <p className="note">{t("dash_dohNote")}</p>
      </section>

      <section>
        <h2>{t("dash_limits")}</h2>
        <p className="note">{t("dash_limitsNote")}</p>
      </section>
    </div>
  );
}

