/**
 * Optional Chrome contentSettings. Default off so WhatsApp Web and
 * calendar sites keep working until the user opts in.
 */
export async function applyNotificationPromptBlock(enabled: boolean): Promise<void> {
  const api = chrome.contentSettings?.notifications;
  if (!api) return;
  try {
    if (enabled) {
      await api.set({ primaryPattern: "<all_urls>", setting: "block", scope: "regular" });
    } else {
      await api.clear({ scope: "regular" });
    }
  } catch {
    /* policy / missing API */
  }
}
