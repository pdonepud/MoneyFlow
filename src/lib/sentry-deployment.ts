const environments = ["local", "ci", "preview", "production"] as const;
const runtimes = ["browser", "node", "edge"] as const;

export type MonitoringRuntime = typeof runtimes[number];
type MonitoringEnvironment = typeof environments[number];

export function validateRelease(value?: string): string | undefined {
  return value?.length === 40 && /^[0-9a-f]{40}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

export function validateEnvironment(value?: string): MonitoringEnvironment | undefined {
  return environments.find(environment => environment === value);
}

export function validateRuntime(value?: string): MonitoringRuntime | undefined {
  return runtimes.find(runtime => runtime === value);
}

export function resolveDeployment(env: Record<string, string | undefined>) {
  const vercel = env.VERCEL === "1";
  const vercelEnvironment = vercel ? validateEnvironment(env.VERCEL_ENV) : undefined;
  const trustedDeployment = vercelEnvironment === "preview" || vercelEnvironment === "production";
  const ci = env.CI === "true" || env.CI === "1" || env.GITHUB_ACTIONS === "true";
  const release = validateRelease(vercel
    ? env.VERCEL_GIT_COMMIT_SHA
    : env.GITHUB_ACTIONS === "true" ? env.GITHUB_SHA : undefined);

  return {
    environment: trustedDeployment ? vercelEnvironment : vercel ? "local" : ci ? "ci" : "local",
    release,
    trustedDeployment,
  } as const;
}