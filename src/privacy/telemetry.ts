export type TelemetryEvent = "tracker_blocked" | "warning_shown" | "user_continued";

export interface TelemetryClient {
  record(event: TelemetryEvent): void;
}

/** Default: discard. Never queues URLs. */
export class NullTelemetryClient implements TelemetryClient {
  record(_event: TelemetryEvent): void {
    // Intentionally empty: no endpoint is shipped.
  }
}

export class GatedTelemetryClient implements TelemetryClient {
  constructor(
    private readonly enabled: () => boolean,
    private readonly inner: TelemetryClient = new NullTelemetryClient(),
  ) {}

  record(event: TelemetryEvent): void {
    if (!this.enabled()) return;
    this.inner.record(event);
  }
}
