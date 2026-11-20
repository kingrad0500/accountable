import { expect, type Locator, type Page } from "@playwright/test";

export const columnEl = (page: Page, stage: string) => page.getByTestId(`column-${stage}`);
export const card = (page: Page, name: string) =>
  page.getByTestId("deal-card").filter({ has: page.getByRole("link", { name, exact: true }) });

/** Card names in a column, top to bottom. */
export async function names(page: Page, stage: string): Promise<string[]> {
  return columnEl(page, stage).getByTestId("deal-card").locator("a").allTextContents();
}

/** Drag a card with the mouse and drop it above, below or into a target. */
export async function drag(page: Page, source: Locator, target: Locator, where: "above" | "below" | "into" = "into") {
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  // Grab at the card's middle, so the lifted card is centred on the pointer.
  const startX = from.x + 20;
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  const to = (await target.boundingBox())!;
  const y = where === "above" ? to.y + to.height * 0.2 : where === "below" ? to.y + to.height * 0.8 : to.y + to.height / 2;
  await page.mouse.move(to.x + to.width / 2, y, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, y + 1, { steps: 3 });
  await page.mouse.up();
}

export async function openPipeline(page: Page) {
  await page.goto("/pipeline");
  await expect(page.getByTestId("deal-card").first()).toBeVisible();
}
