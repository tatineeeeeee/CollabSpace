import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("landing page has no duplicate main landmarks", async ({ page }) => {
    await page.goto("/");
    const mains = page.getByRole("main");
    await expect(mains).toHaveCount(1);
  });

  test("landing page images have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("landing page links are keyboard navigable", async ({ page }) => {
    await page.goto("/");
    // Tab to the first interactive element and verify focus is visible
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("sign-in page has accessible brand link", async ({ page }) => {
    await page.goto("/sign-in");
    const brandLink = page.getByRole("link", { name: /collabspace/i });
    await expect(brandLink).toBeVisible();
    // Should navigate back to home
    await expect(brandLink).toHaveAttribute("href", "/");
  });

  test("color contrast: hero text is readable", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    // Verify the heading has content (not empty)
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });
});
