import * as Sentry from "@sentry/nextjs";
import { afterEach, expect, it, vi } from "vitest";
import { sanitizeSentryError, sentryPrivacyOptions } from "./sentry-privacy";

afterEach(() => vi.unstubAllGlobals());

it("keeps safe stack locations and strips free-form data from every exception", () => {
  const sensitive = "customer@example.invalid owes $4321; Bearer synthetic-token";
  const hint = { attachments: [{ filename: "statement", data: sensitive }] };
  const frame = {
    filename: `https://app.invalid/_next/static/chunks/app.js?token=${sensitive}`,
    function: sensitive, abs_path: sensitive, context_line: sensitive,
    vars: { password: sensitive }, lineno: 42, colno: 9, in_app: true,
  };
  const event = sanitizeSentryError({
    type: undefined,
    message: sensitive,
    request: { data: sensitive, cookies: { session: sensitive } },
    user: { email: sensitive }, tags: { account: sensitive },
    contexts: { account: { balance: sensitive } },
    extra: { headers: sensitive }, breadcrumbs: [{ message: sensitive }],
    logentry: { message: sensitive }, fingerprint: [sensitive],
    exception: { values: [
      { type: "TypeError", value: sensitive, stacktrace: { frames: [frame] } },
      { type: sensitive, value: sensitive },
    ] },
  }, hint);

  expect(sanitizeSentryError({ type: undefined, exception: { values: [{ stacktrace: { frames: [
    { filename: "file:///private/user/src/lib/budget.ts?email=private" },
  ] } }] } }, {})?.exception?.values?.[0].stacktrace?.frames?.[0].filename).toBe("src/lib/budget.ts");
  expect(hint.attachments).toBeUndefined();
  expect(event?.exception?.values).toEqual([
    { type: "TypeError", value: "Application error", stacktrace: { frames: [
      { filename: "next-client-chunk.js", lineno: 42, colno: 9, in_app: true },
    ] } },
    { type: "Error", value: "Application error" },
  ]);
  expect(JSON.stringify(event)).not.toContain(sensitive);
  expect(sanitizeSentryError({ type: undefined, message: sensitive }, {})).toBeNull();
});

it("delivers a sanitized SDK error and drops internal errors, attachments, and logs", async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", send);
  const client = Sentry.init({
    ...sentryPrivacyOptions("node"),
    dsn: "http://public@127.0.0.1:1/1",
    enabled: true,
    defaultIntegrations: false,
  });
  expect(client).toBeDefined();
  try {
    client!.captureException(new TypeError("synthetic-private-message"), {
      attachments: [{ filename: "private.txt", data: "synthetic-private-attachment" }],
    });
    client!.captureException(new Error("synthetic-private-internal"), {
      data: { __sentry__: true },
    });
    Sentry.logger.info("synthetic-private-log");
    expect(await client!.flush(3000)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const request = send.mock.calls[0][1]!;
    const parts = String(request.body).split("\n").map((line) => JSON.parse(line));
    expect(parts).toHaveLength(3);
    expect(parts[1].type).toBe("event");
    expect(parts[2].exception.values[0].type).toBe("TypeError");
    expect(parts[2].exception.values[0].stacktrace.frames.length).toBeGreaterThan(0);
    expect(String(request.body)).not.toContain("synthetic-private");
    expect(request.credentials).toBe("omit");
  } finally {
    await client?.close();
  }
});
it.each(["browser", "node", "edge"])("emits trusted build labels for %s", runtime => {
  const release = "ab".repeat(20);
  const event = sanitizeSentryError({
    type: undefined,
    release: "private-release",
    environment: "private-environment",
    tags: { runtime: "untrusted-runtime", token: "private-token" },
    contexts: { trace: { trace_id: "ab".repeat(16), span_id: "cd".repeat(8) } },
    exception: { values: [{ type: "Error" }] },
  }, {}, { release, environment: "preview", runtime });
  expect(event).toMatchObject({ release, environment: "preview", tags: { runtime } });
  expect(event?.contexts).toBeUndefined();
  expect(JSON.stringify(event)).not.toContain("private");
});

it("drops unverified artifact paths, Debug ID mappings, and invalid build labels", () => {
  const filenames = [
    "https://user:secret@evil.invalid/_next/static/chunks/private.js?key=password",
    "/_next/static/chunks/../../private.js",
    "/_next/static/chunks/%2e%2e/private.js",
    "C:\\Users\\private\\.next\\server\\private.js",
    "/_next/static/chunks/unverified.js",
  ];
  const event = sanitizeSentryError({
    type: undefined,
    debug_meta: { images: [{
      type: "sourcemap",
      code_file: filenames[4],
      debug_id: "709e7507-6dd2-4776-9fef-4a24527f1b91",
    }] },
    exception: { values: [{ stacktrace: { frames: filenames.map(filename => ({
      filename, abs_path: filename, function: "private", context_line: "private",
      vars: { secret: "private" }, lineno: 5, colno: 0, in_app: false,
    })) } }] },
  }, {}, { release: "private", environment: "private", runtime: "private" });
  expect(event?.debug_meta).toBeUndefined();
  expect(event?.release).toBeUndefined();
  expect(event?.environment).toBeUndefined();
  expect(event?.tags).toBeUndefined();
  expect(event?.exception?.values?.[0].stacktrace?.frames).toEqual([
    "next-client-chunk.js", "next-client-chunk.js", "next-client-chunk.js",
    "next-server-bundle.js", "next-client-chunk.js",
  ].map(filename => ({ filename, lineno: 5, colno: 0, in_app: false })));
  expect(JSON.stringify(event)).not.toMatch(/private|unverified|709e7507/);
});