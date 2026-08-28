import { test, expect } from "@playwright/test";

// End-to-end happy path: pick party size + date + time, fill guest details,
// land on a confirmation screen with a confirmation code. Requires a seeded
// dev database (npm run db:seed) with at least one open service period and
// an available table for the chosen date.
test("guest can complete a full reservation", async ({ page }) => {
  await page.goto("/reservations");

  await page.getByRole("button", { name: "2", exact: true }).click();

  const future = new Date();
  future.setDate(future.getDate() + 7);
  const dateStr = future.toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(dateStr);

  await page.waitForSelector("text=Checking availability", { state: "hidden" }).catch(() => {});
  const firstSlot = page.locator("button", { hasText: /AM|PM/ }).first();
  await expect(firstSlot).toBeVisible({ timeout: 10000 });
  await firstSlot.click();

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/reservations\/confirm/);
  await page.getByPlaceholder("Full name").fill("Playwright Guest");
  await page.getByPlaceholder("Email").fill("playwright@example.com");
  await page.getByRole("button", { name: "Confirm Reservation" }).click();

  await expect(page).toHaveURL(/\/reservations\/[A-Z0-9]+/, { timeout: 10000 });
  await expect(page.getByText(/Confirmation/i)).toBeVisible();
});
