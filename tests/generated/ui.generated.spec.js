import { test, expect } from "@playwright/test";

test.describe("Banking demo UI", () => {
  test("login and view dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.fill("#email", "user@example.com");
    await page.fill("#password", "demo123");
    await page.click("button[type=submit]");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Account balance")).toBeVisible();
    await expect(page.getByText("Recent transactions")).toBeVisible();
  });
});
