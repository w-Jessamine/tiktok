import { expect, test } from "@playwright/test";

test("workspace shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("TikTok Shop VideoPilot")).toBeVisible();
  await expect(page.getByRole("button", { name: /Assets/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Scripts/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create/i })).toBeVisible();
});
