import { createTransport } from "@sentry/nextjs";
import type { ErrorEvent, EventHint, StackFrame } from "@sentry/nextjs";
import {
  validateEnvironment,
  validateRelease,
  validateRuntime,
  type MonitoringRuntime,
} from "./sentry-deployment";

const standardErrors = new Set([
  "Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError",
  "EvalError", "AggregateError",
]);

const knownSourceFiles = [
  "src/app/api/advisor/route.ts", "src/app/api/sentry-example-api/route.ts",
  "src/app/global-error.tsx", "src/app/page.tsx", "src/app/login/page.tsx",
  "src/lib/advisor.ts", "src/lib/budget.ts", "src/lib/financing.ts",
  "src/lib/free-advisor.ts", "src/lib/goals.ts", "src/lib/money.ts",
  "src/lib/obligations.ts", "src/lib/paychecks.ts", "src/lib/savings-plan.ts",
  "src/lib/supabase/finance.ts", "src/lib/supabase/advisor-context.ts",
];

// Never use arbitrary stack strings as labels. Paths can contain user IDs,
// credentials, query strings, local usernames, or generated function names.
function stackLocation(filename = "") {
  const path = filename.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const source = knownSourceFiles.find((file) => path === file || path.endsWith(`/${file}`));
  if (source) return source;
  if (path.includes("/_next/static/chunks/")) return "next-client-chunk.js";
  if (path.includes("/.next/server/")) return "next-server-bundle.js";
  if (path.includes("/node_modules/")) return "dependency.js";
  if (path.startsWith("node:")) return "node-runtime.js";
  if (path.includes("/src/app/")) return "app-source.js";
  if (path.includes("/src/lib/")) return "lib-source.js";
  return "application.js";
}

function sanitizeFrame(frame: StackFrame): StackFrame {
  return {
    filename: stackLocation(frame.filename),
    lineno: Number.isSafeInteger(frame.lineno) ? frame.lineno : undefined,
    colno: Number.isSafeInteger(frame.colno) ? frame.colno : undefined,
    in_app: typeof frame.in_app === "boolean" ? frame.in_app : undefined,
  };
}

const approvedEvents = new WeakSet<ErrorEvent>();

export function sanitizeSentryError(
  event: ErrorEvent,
  hint: EventHint,
  build: { environment?: string; release?: string; runtime?: string } = {},
): ErrorEvent | null {
  delete hint.attachments;
  if (!event.exception?.values?.length) return null;

  const runtime = validateRuntime(build.runtime);
  const sanitized: ErrorEvent = {
    type: undefined,
    level: "error",
    environment: validateEnvironment(build.environment),
    release: validateRelease(build.release),
    tags: runtime ? { runtime } : undefined,
    event_id: /^[a-f0-9]{32}$/i.test(event.event_id ?? "") ? event.event_id : undefined,
    timestamp: Number.isFinite(event.timestamp) ? event.timestamp : undefined,
    exception: {
      values: event.exception.values.map(({ type, stacktrace }) => ({
        type: type && standardErrors.has(type) ? type : "Error",
        value: "Application error",
        stacktrace: stacktrace && { frames: stacktrace.frames?.map(sanitizeFrame) },
      })),
    },
  };
  approvedEvents.add(sanitized);
  return sanitized;
}

// The SDK bypasses beforeSend for its own failures. Only transmit envelopes
// containing an error that passed our filter, with no additional items.
type TransportOptions = Parameters<typeof createTransport>[0] & { url: string };

export function errorOnlyTransport(options: TransportOptions): ReturnType<typeof createTransport> {
  const transport = createTransport(options, async ({ body }) => {
    const response = await fetch(options.url, {
      method: "POST",
      body: typeof body === "string" ? body : new Uint8Array(body),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
    return {
      statusCode: response.status,
      headers: {
        "retry-after": response.headers.get("retry-after"),
        "x-sentry-rate-limits": response.headers.get("x-sentry-rate-limits"),
      },
    };
  });

  return {
    flush: (timeout) => transport.flush(timeout),
    send(envelope) {
      const [item] = envelope[1];
      if (envelope[1].length !== 1 || item?.[0].type !== "event" ||
          !approvedEvents.has(item[1] as ErrorEvent)) {
        return Promise.resolve({});
      }
      return transport.send(envelope);
    },
  };
}

const privacyOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()),
  // The SDK enables tracing if either sampling option is defined.
  tracesSampleRate: undefined,
  tracesSampler: undefined,
  tracePropagationTargets: [],
  integrations: (defaults: { name: string }[]) => defaults.filter(({ name }) =>
    !["Breadcrumbs", "BrowserSession", "ProcessSession", "BrowserTracing", "ConsoleLogs", "Pino"].includes(name)
  ),
  maxBreadcrumbs: 0,
  sendClientReports: false,
  spotlight: false,
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  },
  transport: errorOnlyTransport,

};

export function sentryPrivacyOptions(runtime: MonitoringRuntime) {
  const build = {
    runtime,
    environment: process.env.NEXT_PUBLIC_MONEYFLOW_SENTRY_ENVIRONMENT,
    release: process.env.NEXT_PUBLIC_MONEYFLOW_SENTRY_RELEASE,
  };
  return {
    ...privacyOptions,
    beforeSend: (event: ErrorEvent, hint: EventHint) => sanitizeSentryError(event, hint, build),
  };
}
