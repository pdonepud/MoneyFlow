import { describe, expect, it } from "vitest";
import { resolveDeployment, validateEnvironment, validateRelease, validateRuntime } from "./sentry-deployment";

const sha = "ab".repeat(20);

describe("monitoring deployment metadata", () => {
  it.each(["preview", "production"])("gives Vercel %s precedence over CI", label => {
    expect(resolveDeployment({
      VERCEL: "1", VERCEL_ENV: label, VERCEL_GIT_COMMIT_SHA: sha.toUpperCase(),
      CI: "true", GITHUB_ACTIONS: "true", GITHUB_SHA: "cd".repeat(20),
    })).toEqual({ environment: label, release: sha, trustedDeployment: true });
  });

  it("distinguishes local and CI and refuses unknown Vercel targets", () => {
    expect(resolveDeployment({})).toEqual({ environment: "local", release: undefined, trustedDeployment: false });
    expect(resolveDeployment({ GITHUB_ACTIONS: "true", GITHUB_SHA: sha })).toEqual({
      environment: "ci", release: sha, trustedDeployment: false,
    });
    expect(resolveDeployment({ CI: "true", VERCEL_ENV: "production" }).trustedDeployment).toBe(false);
    expect(resolveDeployment({
      VERCEL: "1", VERCEL_ENV: "development", CI: "true", GITHUB_ACTIONS: "true", GITHUB_SHA: sha,
    })).toEqual({ environment: "local", release: undefined, trustedDeployment: false });
  });

  it.each(["deadbeef", `${sha}\n`, ` ${sha}`, "secret@example.invalid", "g".repeat(40)])
    ("drops invalid commit identifiers", value => expect(validateRelease(value)).toBeUndefined());

  it("accepts only literal environment and runtime labels", () => {
    for (const label of ["local", "ci", "preview", "production"]) expect(validateEnvironment(label)).toBe(label);
    for (const runtime of ["browser", "node", "edge"]) expect(validateRuntime(runtime)).toBe(runtime);
    expect(validateEnvironment("production\n")).toBeUndefined();
    expect(validateRuntime("node/user@example.invalid")).toBeUndefined();
  });
});