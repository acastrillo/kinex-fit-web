"use client";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsEventPayload {
  event: string;
  properties?: AnalyticsProperties;
}

function logToConsole(payload: AnalyticsEventPayload) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[Analytics]", payload.event, payload.properties || {});
  }
}

function sendAnalyticsPayload(payload: AnalyticsEventPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block UX.
  });
}

export function trackEvent(event: string, properties?: AnalyticsProperties) {
  const payload = {
    event,
    properties,
  };

  logToConsole(payload);

  if (typeof window === "undefined") return;
  sendAnalyticsPayload(payload);
}
