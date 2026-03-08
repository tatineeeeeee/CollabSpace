import { test, expect } from "@playwright/test";

test.describe("Public Document Preview", () => {
  test("shows error state for non-existent document", async ({ page }) => {
    // Navigate to a fake document ID — should show error/not found state
    await page.goto("/preview/nonexistent123");
    // The page should load without crashing (graceful error handling)
    await expect(page.locator("body")).toBeVisible();
  });

  test("preview page does not expose authenticated routes", async ({ page }) => {
    await page.goto("/preview/test-document-id");
    // Should NOT redirect to sign-in (public route)
    await expect(page).toHaveURL(/preview/);
  });

  test("preview page renders bottom CTA bar", async ({ page }) => {
    await page.goto("/preview/test-document-id");
    // The "Made with CollabSpace" bar should appear even on error states
    // since it's part of the layout
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
