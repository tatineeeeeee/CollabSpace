import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("sign-in page renders with Clerk form", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk renders its own form — verify the page loads without errors
    await expect(page).toHaveURL(/sign-in/);
    // The sign-in page should have the split-screen layout with brand panel
    await expect(page.getByText(/collabspace/i)).toBeVisible();
  });

  test("sign-up page renders with Clerk form", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/sign-up/);
    await expect(page.getByText(/collabspace/i)).toBeVisible();
  });

  test("protected routes redirect to sign-in", async ({ page }) => {
    await page.goto("/documents");
    // Clerk middleware should redirect unauthenticated users
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("boards page redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/boards");
    await expect(page).toHaveURL(/sign-in/);
  });
});
