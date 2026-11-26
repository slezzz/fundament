import { useEffect, useMemo, useState } from "react";
import type { Entitlements, PopupState, SecurityEvent, Settings } from "@shared/types";
import { ENGINE_VERSION, APP_VERSION } from "@engine/version";
import { isStorePack } from "@billing/launch";
import { RULESET_LABELS } from "@shared/constants";
import { coverageLine, contributingPoints, formatAnalysisReport, sortSignals } from "@engine/report/format";
import { parseSettings } from "@storage/settings";
import { send } from "../lib/messaging";
import { normalizePopupState } from "../lib/popupState";
import { statusFrom, visibleStatus } from "../lib/status";
import { partitionSignals } from "../lib/signals";
import { sigText } from "../lib/signalText";
import { StatusMark, poseFromStatus } from "../components/StatusMark";
import { Counts } from "../components/Counts";
import { Toggle } from "../components/Toggle";
import { PlanView } from "./PlanView";
import { t } from "../lib/i18n";
import { BrandMark } from "../components/BrandMark";
import type { ServerMessage } from "@shared/messages";

type View = "home" | "details" | "settings" | "history" | "plan";

export function App() {
  const [state, setState] = useState<PopupState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  async function refresh() {
    const tabParam = Number.parseInt(new URLSearchParams(window.location.search).get("tab") ?? "", 10);
    const response = await send<ServerMessage>({
      type: "GET_POPUP_STATE",
      ...(Number.isInteger(tabParam) ? { tabId: tabParam } : {}),
    }).catch(() => null);
    if (!response) {
      setError(t("popup_loadError"));
      return;
    }
    if (response.type === "POPUP_STATE") {
      const next = normalizePopupState(response.state);
      if (!next) {
        setError(t("popup_loadError"));
        return;
      }
      setState(next);
      setError(null);
      if (!next.settings.onboardingComplete) {
        window.location.href = "onboarding.html";
      }
    } else if (response.type === "ERROR") {
      setError(response.message);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const onChange = () => {
      void refresh();
    };
    try {
      chrome.storage.onChanged.addListener(onChange);
      return () => chrome.storage.onChanged.removeListener(onChange);
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && view !== "home") setView("home");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  useEffect(() => {
    if (view !== "history") return;
    void send<ServerMessage>({ type: "GET_HISTORY" }).then((response) => {
      if (response.type === "HISTORY") setEvents(response.events);
    });
  }, [view]);

  if (error) {
    return (
      <div className="shell">
        <header className="top">
          <span className="brand">
            <BrandMark />
            Fundament
          </span>
        </header>
        <p className="hint">{t("popup_loadError")}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="shell">
        <header className="top">
          <span className="brand">
            <BrandMark />
            Fundament
          </span>
        </header>
        <p className="hint skeleton">{t("popup_checking")}</p>
      </div>
    );
  }

  const status = statusFrom(state.analysis, state.tabId !== null && Boolean(state.analysis), {
    blocked: state.trackersBlocked ?? 0,
    pausedUntil: state.pausedUntil,
  });

  return (
    <div className="shell">
      <header className="top">
        <span className="brand">
          <BrandMark />
            Fundament
          {isStorePack() ? null : (
            <span className={`tier ${state.plan}`}>{state.plan === "pro" ? t("popup_planPro") : t("popup_planFree")}</span>
          )}
        </span>
        <button className="icon-btn" aria-label={t("popup_settingsAria")} onClick={() => setView(view === "settings" ? "home" : "settings")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" />
            <path d="M8 1.6 v1.8 M8 12.6 v1.8 M1.6 8 h1.8 M12.6 8 h1.8 M3.2 3.2 l1.3 1.3 M11.5 11.5 l1.3 1.3 M3.2 12.8 l1.3 -1.3 M11.5 4.5 l1.3 -1.3" />
          </svg>
        </button>
      </header>

      {view === "home" && (
        <Home
          state={state}
          onRefresh={() => void refresh()}
          onDetails={() => setView("details")}
          onHistory={() => setView("history")}
          onPlan={() => setView("plan")}
        />
      )}
      {view === "details" && (
        <Details state={state} onBack={() => setView("home")} />
      )}
      {view === "settings" && (
        <SettingsView
          settings={state.settings}
          entitlements={state.entitlements}
          onChange={async (patch) => {
            if (Object.keys(patch).length > 0) {
              const response = await send<ServerMessage>({ type: "UPDATE_SETTINGS", patch });
              if (response.type === "SETTINGS") {
                setState({ ...state, settings: parseSettings(response.settings) });
              }
            }
            await refresh();
          }}
          onBack={() => setView("home")}
          onPlan={() => setView("plan")}
        />
      )}
      {view === "plan" && !isStorePack() && (
        <PlanView
          plan={state.plan}
          entitlements={state.entitlements}
          onActivated={async () => {
            await refresh();
            setView("plan");
          }}
          onBack={() => setView("home")}
        />
      )}
      {view === "history" && (
        <HistoryView
          events={events}
          onClear={async () => {
            await send({ type: "CLEAR_HISTORY" });
            setEvents([]);
          }}
          onBack={() => setView("home")}
        />
      )}
      {view === "home" && (
        <p className="sr-status" aria-live="polite">
          {visibleStatus(status, state.trackersBlocked ?? 0).label}
        </p>
      )}
    </div>
  );
}

function Home({
  state,
  onRefresh,
  onDetails,
  onHistory,
  onPlan,
}: {
  state: PopupState;
  onRefresh: () => void;
  onDetails: () => void;
  onHistory: () => void;
  onPlan: () => void;
}) {
  const hasAnalysis = Boolean(state.analysis);
  const status = statusFrom(state.analysis, hasAnalysis, {
    blocked: state.trackersBlocked ?? 0,
    pausedUntil: state.pausedUntil,
  });
  const shown = visibleStatus(status, state.trackersBlocked ?? 0);
  const host = state.analysis?.domain?.registrableDomain;
  const paused = Boolean(state.pausedUntil && state.pausedUntil > Date.now());
  const allowlisted = Boolean(state.analysis?.allowlisted);
  const layers = [
    state.settings?.trackerBlocking ? t("popup_layerAds") : null,
    state.settings?.trackerBlocking ? t("popup_layerTrackers") : null,
    state.settings?.phishingProtection ? t("popup_layerPhish") : null,
    state.settings?.downloadProtection ? t("popup_layerDownloads") : null,
    state.settings?.stripTrackingParams ? t("popup_layerLinks") : null,
    state.settings?.hardenBrowser ? t("popup_layerWebrtc") : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <main className="home">
      {state.integrity && !state.integrity.ok ? (
        <p className="integrity-alert" role="alert">
          {t("popup_integrityFail")}
        </p>
      ) : null}
      {(state.postureAlerts ?? [])
        .filter((item) => item.status === "fail")
        .slice(0, 2)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            className="posture-alert"
            role="alert"
            onClick={() => {
              if (item.fix) void send({ type: "OPEN_SETTINGS_PAGE", url: item.fix });
            }}
          >
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      <StatusMark
        tone={status.tone}
        pose={poseFromStatus(status.tone, allowlisted)}
      />
      <h1 className={`label label-${status.tone}`}>{shown.label}</h1>
      {host ? <p className="site-host">{host}</p> : null}
      <p className="hint">{shown.hint}</p>
      {host && (
        <div className="site-actions">
          {paused ? (
            <button type="button" className="small-btn primary-fill" onClick={() => void send({ type: "RESUME_SITE", host }).then(onRefresh)}>
              {t("popup_resume")}
            </button>
          ) : (
            <button
              type="button"
              className="small-btn primary-fill"
              onClick={() => void send({ type: "PAUSE_SITE", host, minutes: 15 }).then(onRefresh)}
            >
              {t("popup_pause")}
            </button>
          )}
          {allowlisted ? (
            <button
              type="button"
              className="small-btn ghost-fill"
              onClick={() => void send({ type: "REMOVE_ALLOWLIST", host }).then(onRefresh)}
            >
              {t("popup_revokeAllow")}
            </button>
          ) : (
            <button
              type="button"
              className="small-btn ghost-fill"
              onClick={() => void send({ type: "ADD_ALLOWLIST", host }).then(onRefresh)}
            >
              {t("popup_allowSite")}
            </button>
          )}
          <p className="pause-hint">
            {paused ? t("popup_resumeHint") : allowlisted ? t("popup_revokeAllowHint") : t("popup_pauseHint")}
          </p>
        </div>
      )}
      {layers.length > 0 ? (
        <ul className="layers" aria-label={t("popup_layersAria")}>
          {layers.map((label) => (
            <li key={label} className="on">
              {label}
            </li>
          ))}
        </ul>
      ) : null}
      <Counts
        connections={state.connectionsChecked ?? 0}
        trackers={state.trackersBlocked ?? 0}
        threats={state.threatsDetected ?? 0}
      />
      <nav className="home-nav">
        <button type="button" className="nav-link" onClick={onDetails} disabled={!hasAnalysis}>
          {t("popup_inspect")}
        </button>
        <button type="button" className="nav-link" onClick={onHistory}>
          {t("popup_history")}
        </button>
        {isStorePack() ? null : (
          <button type="button" className="nav-link" onClick={onPlan}>
            {state.plan === "pro" ? t("popup_managePlan") : t("popup_upgrade")}
          </button>
        )}
        <button type="button" className="nav-link" onClick={() => void chrome.runtime.openOptionsPage()}>
          {t("popup_dashboard")}
        </button>
      </nav>
    </main>
  );
}

function Details({ state, onBack }: { state: PopupState; onBack: () => void }) {
  const analysis = state.analysis;
  const [copied, setCopied] = useState(false);
  const [showRest, setShowRest] = useState(false);
  if (!analysis) {
    return (
      <main>
        <button className="text-btn" onClick={onBack}>
          {t("popup_back")}
        </button>
        <p className="hint">{t("popup_noAnalysis")}</p>
      </main>
    );
  }

  const host = analysis.domain?.hostnameUnicode ?? analysis.parsed?.hostname ?? t("popup_thisPage");
  const ascii = analysis.domain?.registrableDomain ?? analysis.parsed?.hostname;
  const ranked = sortSignals(analysis.signals);
  const { issues, rest } = partitionSignals(ranked);
  const visible = showRest ? [...issues, ...rest] : issues.length > 0 ? issues : rest;
  const raw = contributingPoints(analysis);

  return (
    <main className="details">
      <button className="text-btn" onClick={onBack}>
        {t("popup_back")}
      </button>
      <h2>{t("popup_verdict")}</h2>
      <p className="host">{host}</p>
      {ascii && ascii !== host ? <p className="host-ascii">{ascii}</p> : null}

      <dl className="meta-grid">
        <div>
          <dt>{t("popup_score")}</dt>
          <dd>
            {analysis.score}/100
            <span className="band"> {analysis.band}</span>
          </dd>
        </div>
        <div>
          <dt>{t("popup_raw")}</dt>
          <dd>{raw}</dd>
        </div>
        <div>
          <dt>{t("popup_engine")}</dt>
          <dd>
            {analysis.engineVersion}
          </dd>
        </div>
        <div>
          <dt>{t("popup_weights")}</dt>
          <dd>{analysis.weightsVersion}</dd>
        </div>
      </dl>
      <div className={`score-bar band-${analysis.band}`} aria-hidden="true">
        <span style={{ width: `${Math.min(100, analysis.score)}%` }} />
      </div>

      <ul className="signals">
        {visible.map((signal) => (
          <li key={signal.id} className={`signal signal-${signal.severity}`}>
            <span className="sig-mark">
              {signal.severity === "ok" ? "✓" : signal.severity === "fail" ? "✕" : signal.severity === "unavailable" ? "–" : "⚠"}
            </span>
            <div>
              <strong>{sigText(signal).title}</strong>
              <p className="sig-meta">
                <code>{signal.id}</code>
                {signal.weightApplied > 0 ? `  +${signal.weightApplied}` : "  +0"}
              </p>
              <p>{sigText(signal).explanation}</p>
            </div>
          </li>
        ))}
      </ul>
      {issues.length > 0 && rest.length > 0 ? (
        <button type="button" className="text-btn" onClick={() => setShowRest((v) => !v)}>
          {showRest ? t("popup_hideClear") : t("popup_showClear", [String(rest.length)])}
        </button>
      ) : null}
      <p className="coverage">{coverageLine(analysis)}</p>
      {(state.blockedSlices ?? []).length > 0 ? (
        <ul className="signals">
          {(state.blockedSlices ?? []).map((slice) => (
            <li key={slice.rulesetId} className="signal signal-ok">
              <span className="sig-mark">–</span>
              <div>
                <strong>{t(`ruleset_${slice.rulesetId.replace(/-/g, "_")}`) || RULESET_LABELS[slice.rulesetId] || slice.rulesetId}</strong>
                <p>{t("popup_sliceHits", [String(slice.count)])}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="small-btn ghost-fill"
        onClick={() => {
          void navigator.clipboard.writeText(formatAnalysisReport(analysis)).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? t("popup_copied") : t("popup_copyReport")}
      </button>
    </main>
  );
}

function SettingsView({
  settings,
  entitlements,
  onChange,
  onBack,
  onPlan,
}: {
  settings: Settings;
  entitlements: Entitlements;
  onChange: (patch: Partial<Settings>) => Promise<void>;
  onBack: () => void;
  onPlan: () => void;
}) {
  const [allow, setAllow] = useState("");
  const [block, setBlock] = useState("");
  const [query, setQuery] = useState("");

  function match(label: string, hint?: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().includes(q) || (hint ?? "").toLowerCase().includes(q);
  }

  function FilteredToggle(props: {
    label: string;
    hint?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (value: boolean) => void;
  }) {
    return <Toggle {...props} hidden={!match(props.label, props.hint)} />;
  }

  return (
    <main className="settings">
      <button className="text-btn" onClick={onBack}>
        {t("popup_back")}
      </button>
      {isStorePack() ? null : (
        <button className="text-btn" onClick={onPlan}>
          {entitlements.plan === "pro" ? t("popup_managePlan") : t("popup_upgrade")}
        </button>
      )}
      <section>
        <h2>{t("popup_protection")}</h2>
        <label className="field">
          {t("popup_filterSettings")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("popup_filterPlaceholder")}
            spellCheck={false}
          />
        </label>
        <h3 className="sec-label">{t("popup_secEveryday")}</h3>
        <FilteredToggle
          label={t("toggle_threats")}
          checked={settings.threatProtection}
          onChange={(threatProtection) => void onChange({ threatProtection })}
        />
        <FilteredToggle
          label={t("toggle_trackers")}
          hint={isStorePack() ? t("toggle_trackersHintStore") : entitlements.plusTrackers ? t("toggle_trackersHintPro") : t("toggle_trackersHintFree")}
          checked={settings.trackerBlocking}
          onChange={(trackerBlocking) => void onChange({ trackerBlocking })}
        />
        <FilteredToggle
          label={t("toggle_phishing")}
          checked={settings.phishingProtection}
          onChange={(phishingProtection) => void onChange({ phishingProtection })}
        />
        <FilteredToggle
          label={t("toggle_https")}
          hint={t("toggle_httpsHint")}
          checked={settings.httpsUpgrade}
          onChange={(httpsUpgrade) => void onChange({ httpsUpgrade })}
        />
        <FilteredToggle
          label={t("toggle_pageChecks")}
          hint={t("toggle_pageChecksHint")}
          checked={settings.pageChecks}
          onChange={(pageChecks) => void onChange({ pageChecks })}
        />
        <FilteredToggle
          label={t("toggle_downloads")}
          hint={t("toggle_downloadsHint")}
          checked={settings.downloadProtection}
          onChange={(downloadProtection) => void onChange({ downloadProtection })}
        />
        <FilteredToggle
          label={t("toggle_strip")}
          hint={t("toggle_stripHint")}
          checked={settings.stripTrackingParams}
          onChange={(stripTrackingParams) => void onChange({ stripTrackingParams })}
        />
        <FilteredToggle
          label={t("toggle_gpc")}
          hint={t("toggle_gpcHint")}
          checked={settings.globalPrivacyControl}
          onChange={(globalPrivacyControl) => void onChange({ globalPrivacyControl })}
        />
        <FilteredToggle
          label={t("toggle_harden")}
          hint={t("toggle_hardenHint")}
          checked={settings.hardenBrowser}
          onChange={(hardenBrowser) => void onChange({ hardenBrowser })}
        />
        <FilteredToggle
          label={t("toggle_searchMarks")}
          hint={t("toggle_searchMarksHint")}
          checked={settings.searchMarks}
          onChange={(searchMarks) => void onChange({ searchMarks })}
        />
        <FilteredToggle
          label={t("toggle_notifyBlock")}
          hint={t("toggle_notifyBlockHint")}
          checked={settings.blockNotificationPrompts}
          onChange={(blockNotificationPrompts) => void onChange({ blockNotificationPrompts })}
        />
        <h3 className="sec-label">{t("popup_secExtra")}</h3>
        <FilteredToggle
          label={t("toggle_httpsPages")}
          hint={t("toggle_httpsPagesHint")}
          checked={settings.httpsUpgradePages}
          onChange={(httpsUpgradePages) => void onChange({ httpsUpgradePages })}
        />
        {isStorePack() ? null : (
          <FilteredToggle
            label={t("toggle_cosmetic")}
            hint={entitlements.cosmeticFiltering ? t("toggle_cosmeticHint") : t("toggle_cosmeticHintFree")}
            checked={settings.cosmeticFiltering}
            disabled={!entitlements.cosmeticFiltering}
            onChange={(cosmeticFiltering) => {
              if (!entitlements.cosmeticFiltering) {
                onPlan();
                return;
              }
              void onChange({ cosmeticFiltering });
            }}
          />
        )}
        <FilteredToggle
          label={t("toggle_overlay")}
          hint={t("toggle_overlayHint")}
          checked={settings.overlayProtection}
          onChange={(overlayProtection) => void onChange({ overlayProtection })}
        />
        <FilteredToggle
          label={t("toggle_csp")}
          hint={t("toggle_cspHint")}
          checked={settings.cspReinforce}
          onChange={(cspReinforce) => void onChange({ cspReinforce })}
        />
        {isStorePack() ? null : (
          <FilteredToggle
            label={t("toggle_fingerprint")}
            hint={t("toggle_fingerprintHint")}
            checked={settings.fingerprintShield && entitlements.fingerprintShield}
            disabled={!entitlements.fingerprintShield}
            onChange={(fingerprintShield) => {
              if (!entitlements.fingerprintShield) return;
              void onChange({ fingerprintShield });
            }}
          />
        )}
        <FilteredToggle
          label={t("toggle_ioc")}
          hint={isStorePack() ? t("toggle_iocHintStore") : t("toggle_iocHint")}
          checked={settings.iocFeeds}
          onChange={(iocFeeds) => void onChange({ iocFeeds })}
        />
      </section>
      <section>
        <h2>{t("popup_privacy")}</h2>
        <FilteredToggle label={t("toggle_local")} checked disabled onChange={() => undefined} />
        {isStorePack() ? null : (
          <FilteredToggle
            label={t("toggle_telemetry")}
            checked={settings.telemetry}
            onChange={(telemetry) => void onChange({ telemetry })}
          />
        )}
      </section>
      <section>
        <h2>{t("popup_advanced")}</h2>
        {isStorePack() ? null : (
        <label className="field">
          {t("popup_securityLevel")}
          <select
            value={settings.securityLevel}
            disabled={entitlements.securityLevels.length === 1}
            onChange={(e) => void onChange({ securityLevel: e.target.value as Settings["securityLevel"] })}
          >
            {entitlements.securityLevels.includes("relaxed") && <option value="relaxed">{t("level_relaxed")}</option>}
            <option value="standard">{t("level_standard")}</option>
            {entitlements.securityLevels.includes("strict") && <option value="strict">{t("level_strict")}</option>}
          </select>
        </label>
        )}
        <HostList
          title={t("popup_allowlist", [String(settings.allowlist.length), String(entitlements.maxListEntries)])}
          value={allow}
          onChange={setAllow}
          items={settings.allowlist}
          onAdd={async () => {
            const host = allow.trim().toLowerCase();
            if (!host) return;
            await send({ type: "ADD_ALLOWLIST", host });
            setAllow("");
            await onChange({});
            const latest = await send<ServerMessage>({ type: "GET_POPUP_STATE" });
            if (latest.type === "POPUP_STATE") {
              await onChange(latest.state.settings);
            }
          }}
          onRemove={(host) => void send({ type: "REMOVE_ALLOWLIST", host }).then(() => onChange({}))}
        />
        <HostList
          title={t("popup_blocklist", [String(settings.blocklist.length), String(entitlements.maxListEntries)])}
          value={block}
          onChange={setBlock}
          items={settings.blocklist}
          onAdd={async () => {
            const host = block.trim().toLowerCase();
            if (!host) return;
            await send({ type: "ADD_BLOCKLIST", host });
            setBlock("");
            await onChange({});
          }}
          onRemove={(host) => void send({ type: "REMOVE_BLOCKLIST", host }).then(() => onChange({}))}
        />
      </section>
      <section className="about">
        <h2>{t("popup_about")}</h2>
        <p>Version {APP_VERSION} · engine {ENGINE_VERSION}</p>
        <p>{t("popup_aboutBody")}</p>
      </section>
    </main>
  );
}

function HostList({
  title,
  value,
  onChange,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (host: string) => void;
}) {
  return (
    <div className="host-list">
      <h3>{title}</h3>
      <div className="row">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="example.com"
          spellCheck={false}
        />
        <button type="button" className="small-btn" onClick={onAdd}>
          {t("popup_add")}
        </button>
      </div>
      <ul>
        {items.map((host) => (
          <li key={host}>
            <span>{host}</span>
            <button type="button" className="text-btn" onClick={() => onRemove(host)}>
              {t("popup_remove")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryView({
  events,
  onClear,
  onBack,
}: {
  events: SecurityEvent[];
  onClear: () => void;
  onBack: () => void;
}) {
  const grouped = useMemo(() => groupByDay(events), [events]);

  return (
    <main className="history">
      <button className="text-btn" onClick={onBack}>
        {t("popup_back")}
      </button>
      <h2>{t("popup_history")}</h2>
      {events.length === 0 ? (
        <p className="hint">{t("popup_historyEmpty")}</p>
      ) : (
        Object.entries(grouped).map(([day, list]) => (
          <section key={day}>
            <h3>{day}</h3>
            <ul>
              {list.map((event) => (
                <li key={event.id}>
                  <time>{formatTime(event.at)}</time>
                  <div>
                    <strong>{eventTitle(event.type)}</strong>
                    <p>{event.host}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {events.length > 0 && (
        <button className="text-btn" onClick={() => void onClear()}>
          {t("popup_historyClear")}
        </button>
      )}
    </main>
  );
}

function eventTitle(type: SecurityEvent["type"]): string {
  return t(`event_${type}`);
}

function formatTime(at: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(at);
}

function groupByDay(events: SecurityEvent[]): Record<string, SecurityEvent[]> {
  const groups: Record<string, SecurityEvent[]> = {};
  const today = startOfDay(Date.now());
  for (const event of events) {
    const key = startOfDay(event.at) === today ? t("popup_today") : new Intl.DateTimeFormat(undefined).format(event.at);
    groups[key] ??= [];
    groups[key].push(event);
  }
  return groups;
}

function startOfDay(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
