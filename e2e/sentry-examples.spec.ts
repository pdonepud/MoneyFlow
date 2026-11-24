import { expect, test } from "@playwright/test";

test("Sentry examples are unavailable on the production server", async ({ request }) => {
  test.skip(!process.env.CI, "Playwright uses the development server outside CI.");
  for (const path of ["/sentry-example-page", "/api/sentry-example-api"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});