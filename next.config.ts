import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { resolveDeployment } from "./src/lib/sentry-deployment";

export default function configure(phase: string): NextConfig {
  const { environment, release, trustedDeployment } = resolveDeployment(process.env);
  const nextConfig: NextConfig = {
    productionBrowserSourceMaps: false,
    env: {
      NEXT_PUBLIC_MONEYFLOW_SENTRY_ENVIRONMENT: environment,
      NEXT_PUBLIC_MONEYFLOW_SENTRY_RELEASE: release ?? "",
    },
  };

  const uploadRequested = phase === PHASE_PRODUCTION_BUILD
    && trustedDeployment
    && process.env.MONEYFLOW_SENTRY_UPLOAD === "1"
    && process.env.SENTRYCLI_SKIP_UPLOAD !== "1";
  if (!uploadRequested) return nextConfig;

  const authToken = process.env.SENTRY_AUTH_TOKEN?.trim();
  if (!authToken || !release) {
    throw new Error("Sentry upload requires an authentication token and a valid deployment commit SHA.");
  }

  const config = withSentryConfig(
    { ...nextConfig, productionBrowserSourceMaps: true },
    {
      authToken,
      org: "moneyflow-xe",
      project: "moneyflow",
      release: { name: release, inject: false },
      telemetry: false,
      useRunAfterProductionCompileHook: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    },
  );

  const upload = config.compiler?.runAfterProductionCompile;
  if (!upload) throw new Error("Sentry source-map build hook is unavailable.");

  config.compiler = {
    ...config.compiler,
    async runAfterProductionCompile(metadata) {
      await upload(metadata);
      const staticFiles = await readdir(join(metadata.distDir, "static"), { recursive: true });
      if (staticFiles.some(file => /\.map$/i.test(file))) {
        throw new Error("Sentry cleanup left source maps in the public build output.");
      }
    },
  };
  return config;
}