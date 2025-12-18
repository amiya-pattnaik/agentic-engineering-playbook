import { test, expect, request } from "@playwright/test";

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
