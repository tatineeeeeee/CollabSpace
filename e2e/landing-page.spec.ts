import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with headline and CTAs", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /see how it works/i })).toBeVisible();
  });

  test("renders navigation with brand and auth links", async ({ page }) => {
    await expect(page.getByRole("link", { name: /collabspace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();
  });

  test("renders features section", async ({ page }) => {
    await expect(page.getByText(/rich documents/i)).toBeVisible();
    await expect(page.getByText(/kanban boards/i)).toBeVisible();
    await expect(page.getByText(/real-time/i).first()).toBeVisible();
  });

  test("renders how it works section", async ({ page }) => {
    const section = page.locator("#how-it-works");
    await expect(section).toBeVisible();
  });

  test("renders footer with navigation links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link").first()).toBeVisible();
  });

  test("navigates to sign-in page from CTA", async ({ page }) => {
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/sign/);
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/collabspace/i);
  });
});
