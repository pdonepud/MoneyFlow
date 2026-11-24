
import { test, expect } from "@playwright/test";

test("login page loads successfully", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).toBeVisible();
});

test("unauthenticated users are redirected to login", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login/);
});
