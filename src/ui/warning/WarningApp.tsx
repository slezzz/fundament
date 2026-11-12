import { useEffect, useState } from "react";
import type { UrlAnalysis } from "@shared/types";
import { send } from "../lib/messaging";
import { explanation, statusFrom } from "../lib/status";
import { StatusMark, poseFromStatus } from "../components/StatusMark";
import type { ServerMessage } from "@shared/messages";
import { t } from "../lib/i18n";
import { BrandMark } from "../components/BrandMark";
import { sigText } from "../lib/signalText";
import "../styles/global.css";
import "./warning.css";

function tabIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get("tab");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) ? id : null;
}

/** Set when a network rule (phishing feed, IOC feed, your blocklist) redirected here. */
function blockedReason(): string | undefined {
  const raw = new URLSearchParams(window.location.search).get("blocked");
  return raw && /^(feed|ioc|threat|user)$/.test(raw) ? raw : undefined;
}

async function resolveTabId(): Promise<number | null> {
  const fromQuery = tabIdFromLocation();
  if (fromQuery !== null) return fromQuery;
  try {
    const tab = await chrome.tabs.getCurrent();
    return tab?.id ?? null;
  } catch {
    return null;
  }
}

export function WarningApp() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<UrlAnalysis | null>(null);
  const [why, setWhy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const id = await resolveTabId();
      if (id === null) {
        setError(t("warn_missingTab"));
        return;
      }
      setTabId(id);
      const response = await send<ServerMessage>({ type: "GET_TAB_ANALYSIS", tabId: id, blocked: blockedReason() });
      if (response.type === "TAB_ANALYSIS") {
        if (response.analysis) setAnalysis(response.analysis);
        else setError(t("warn_noAnalysis"));
      } else if (response.type === "ERROR") {
        setError(response.message);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="wrap">
        <p className="brand">
          <BrandMark size={28} />
          Fundament
        </p>
        <p>{error}</p>
        <div className="actions">
          <button className="primary" onClick={() => history.back()}>
            {t("warn_back")}
          </button>
        </div>
      </div>
    );
  }

  if (!analysis || tabId === null) {
    return (
      <div className="wrap">
        <p>{t("warn_checking")}</p>
      </div>
    );
  }

  const critical = analysis.band === "critical" || analysis.signals.some((s) => s.severity === "fail");
  const status = statusFrom(analysis, true);
  const top =
    analysis.signals.find((s) => s.severity === "fail") ??
    [...analysis.signals].filter((s) => s.severity === "warn").sort((a, b) => b.weightApplied - a.weightApplied)[0];
  const topText = top ? sigText(top) : null;
  const reason = topText?.title ?? t("warn_multi");
  const host = analysis.domain?.hostnameUnicode ?? analysis.parsed?.hostnameUnicode ?? "";

  return (
    <div className="wrap">
      <p className="brand">
        <BrandMark size={28} />
        Fundament
      </p>
      <StatusMark tone={status.tone} pose={poseFromStatus(status.tone, Boolean(analysis.allowlisted))} />
      <h1>{critical ? t("warn_stopped") : t("warn_suspicious")}</h1>
      {host && <p className="host">{host}</p>}
      <p className="reason">{t("warn_reason", [reason])}</p>
      <p className="lead">{topText?.explanation ?? explanation(analysis) ?? (critical ? t("warn_cut") : t("warn_fallback"))}</p>
      <p className="score">{t("warn_score", [String(analysis.score)])}</p>
      <div className="actions">
        <button className="primary" onClick={() => void send({ type: "GO_BACK", tabId })}>
          {t("warn_back")}
        </button>
        <button className="ghost" onClick={() => setWhy((v) => !v)}>
          {why ? t("warn_hide") : t("warn_why")}
        </button>
        {!confirming ? (
          <button className="ghost continue" onClick={() => (critical ? setConfirming(true) : void send({ type: "CONTINUE_TO_SITE", tabId }))}>
            {t("warn_continue")}
          </button>
        ) : (
          <button className="ghost continue danger" onClick={() => void send({ type: "CONTINUE_TO_SITE", tabId })}>
            {t("warn_continueConfirm")}
          </button>
        )}
      </div>
      {why && (
        <ul className="why">
          {analysis.signals
            .filter((s) => s.severity === "fail" || s.severity === "warn")
            .map((s) => (
              <li key={s.id}>
                <strong>{sigText(s).title}</strong>
                <p className="sig-id">
                  {s.id} · +{s.weightApplied}
                </p>
                <p>{sigText(s).explanation}</p>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
