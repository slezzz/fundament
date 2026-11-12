/**
 * Chrome privacy controls used by uBlock-class extensions.
 * Turning this off clears our overrides so Chrome defaults return.
 */
async function setOrClear(setting: { set: (details: { value: boolean }) => unknown; clear: (details: object) => unknown } | undefined, enabled: boolean, value: boolean): Promise<void> {
  if (!setting) return;
  try {
    if (enabled) await Promise.resolve(setting.set({ value }));
    else await Promise.resolve(setting.clear({}));
  } catch {
    /* Enterprise policies and older Chrome builds skip unknown keys. */
  }
}

export async function applyBrowserHardening(enabled: boolean): Promise<void> {
  const privacy = chrome.privacy;
  if (!privacy) return;

  try {
    if (enabled) {
      await privacy.network.webRTCIPHandlingPolicy.set({ value: "disable_non_proxied_udp" });
    } else {
      await privacy.network.webRTCIPHandlingPolicy.clear({});
    }
  } catch {
    /* ignore */
  }

  await setOrClear(privacy.network.networkPredictionEnabled, enabled, false);
  await setOrClear(privacy.websites.hyperlinkAuditingEnabled, enabled, false);

  const websites = privacy.websites as unknown as {
    topicsEnabled?: { set: (details: { value: boolean }) => unknown; clear: (details: object) => unknown };
    adMeasurementEnabled?: { set: (details: { value: boolean }) => unknown; clear: (details: object) => unknown };
    fledgeEnabled?: { set: (details: { value: boolean }) => unknown; clear: (details: object) => unknown };
  };
  await setOrClear(websites.topicsEnabled, enabled, false);
  await setOrClear(websites.adMeasurementEnabled, enabled, false);
  await setOrClear(websites.fledgeEnabled, enabled, false);
}
