import { chromeMessage } from "@shared/chromeI18n";
import { contextMenuItems } from "../../src/background/menus";
import { downloadBlockedNotification } from "../../src/background/notify";
import { poseFromStatus } from "../../src/ui/components/StatusMark";
import { visibleStatus } from "../../src/ui/lib/status";
import { t } from "../../src/ui/lib/i18n";

describe("everyday copy", () => {
  it("substitutes the host into the download notice", () => {
    expect(chromeMessage("x", "Stopped $1", "evil.test")).toBe("Stopped evil.test");
    const note = downloadBlockedNotification("phish.test");
    expect(note.message).toContain("phish.test");
    expect(note.title.length).toBeGreaterThan(8);
  });

  it("keeps context menus in the locale catalog", () => {
    const ids = contextMenuItems().map((item) => item.id);
    expect(ids).toEqual(["fundament-allow", "fundament-block", "fundament-pause"]);
    expect(t("menu_pause")).toMatch(/Pause|pausieren/i);
    expect(t("onboard_4_title")).toMatch(/Pin|anpinnen/i);
    expect(t("popup_pause")).toMatch(/broken|kaputt/i);
  });

  it("localizes the Protected home label", () => {
    expect(visibleStatus({ label: "Protected", hint: "x", tone: "safe" }, 0).label).toBe("Protected");
    expect(visibleStatus({ label: "Allowed", hint: "x", tone: "idle" }, 0).label).toBe("Allowed");
  });

  it("maps Protected to crossed spears and allowlist to spears together", () => {
    expect(poseFromStatus("safe", false)).toBe("block");
    expect(poseFromStatus("idle", true)).toBe("open");
    expect(poseFromStatus("idle", false)).toBe("rest");
    expect(poseFromStatus("danger", false)).toBe("alert");
  });
});
