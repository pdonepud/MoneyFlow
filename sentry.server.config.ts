import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./src/lib/sentry-privacy";

const options = sentryPrivacyOptions("node");

if (options.enabled) {
  Sentry.init(options);
}