import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const STORAGE_KEY_ENABLED = 'unblurry-analytics-enabled';
const STORAGE_KEY_ANON_ID = 'unblurry-anon-id';
const STORAGE_KEY_SESSION_COUNT = 'unblurry-session-count';

let initialized = false;

export function initAnalytics() {
  if (!POSTHOG_KEY || initialized) return;

  const anonId = getOrCreateAnonId();

  posthog.init(POSTHOG_KEY, {
    api_host: 'https://eu.i.posthog.com',
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
  });

  posthog.identify(anonId);

  if (!isAnalyticsEnabled()) {
    posthog.opt_out_capturing();
  }

  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || !initialized || !isAnalyticsEnabled()) return;
  posthog.capture(event, properties);
}

export function isAnalyticsEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
  return stored !== 'false'; // default ON
}

export function setAnalyticsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
  if (!initialized) return;
  if (enabled) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function incrementSessionCount(): number {
  const current = Number(localStorage.getItem(STORAGE_KEY_SESSION_COUNT) || '0');
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY_SESSION_COUNT, String(next));
  return next;
}

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(STORAGE_KEY_ANON_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_ANON_ID, id);
  }
  return id;
}
