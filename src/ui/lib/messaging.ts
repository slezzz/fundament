import type { ClientMessage, ServerMessage } from "@shared/messages";

export async function send<T extends ServerMessage>(message: ClientMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as ServerMessage | undefined;
  if (!response || typeof response !== "object" || !("type" in response)) {
    throw new Error("Extension worker did not respond. Reload Fundament on chrome://extensions.");
  }
  return response as T;
}
