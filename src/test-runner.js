import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { ensureDir, writeFile } from "./utils.js";

function testDir() {
  const dir = path.join(process.cwd(), "tests", "generated");
  ensureDir(dir);
  return dir;
}

function uiSpecTemplate() {
  return `import { test, expect } from "@playwright/test";

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
`;
}

function apiSpecTemplate() {
  return `import { test, expect, request } from "@playwright/test";

test.describe("Banking demo API", () => {
  test("fetch account data", async ({ baseURL }) => {
    const api = await request.newContext({ baseURL: baseURL || "http://localhost:3000" });
    const res = await api.get("/api/account");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.balance).toBeDefined();
    expect(Array.isArray(data.transactions)).toBeTruthy();
  });
});
`;
}

export function generateSpecs() {
  const dir = testDir();
  const uiPath = path.join(dir, "ui.generated.spec.js");
  const apiPath = path.join(dir, "api.generated.spec.js");
  writeFile(uiPath, uiSpecTemplate());
  writeFile(apiPath, apiSpecTemplate());
  return [uiPath, apiPath];
}

export function runPlaywright(specPaths = []) {
  if (!specPaths.length) {
    return { ok: false, message: "No specs provided", results: [] };
  }

  const args = ["playwright", "test", ...specPaths, "--reporter=json"];
  const res = spawnSync("npx", args, { encoding: "utf8" });

  const output = res.stdout || res.stderr || "";
  let parsed = null;
  try {
    parsed = JSON.parse(output.trim().split(/\r?\n/).pop() || "{}");
  } catch {
    parsed = null;
  }

  const summary = parsed?.stats || {};
  const ok = res.status === 0;
  return {
    ok,
    message: ok ? "Tests passed" : "Tests failed",
    summary,
    raw: output
  };
}
