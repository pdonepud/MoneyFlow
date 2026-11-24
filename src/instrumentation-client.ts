import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./lib/sentry-privacy";

const options = sentryPrivacyOptions("browser");

if (options.enabled) {
  Sentry.init({
    ...options,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}