import { test, expect } from "./fixtures";
import { contrastProblems } from "./contrast";

// Text contrast as the browser draws it (G8), in both modes: the token-pair unit test only
// knows the pairs someone listed, and twice missed text sitting on a background it didn't list.
const SCREENS = [
  "/",
  "/pipeline",
  "/deals",
  "/contacts",
  "/organizations",
  "/deals/1",
  "/contacts/1",
  "/organizations/1",
];

for (const mode of ["light", "dark"] as const) {
  test(`every screen's text meets WCAG AA in ${mode} mode (G8)`, async ({ page }) => {
    await page.goto("/");
    if (mode === "dark")
      await page.evaluate(() => localStorage.setItem("accountable.theme", "dark"));
    const problems: string[] = [];
    for (const path of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
      await expect(page.getByRole("main").locator(".panel").first()).toBeVisible();
      problems.push(...(await contrastProblems(page)));
    }
    expect(problems).toEqual([]);
  });
}

// The checker itself: it must catch low contrast, including what opacity and translucent
// backgrounds do to it, or the tests above would pass whatever the screens looked like.
test("the contrast check catches text that falls short", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const add = (html: string) =>
      document.querySelector("main")!.insertAdjacentHTML("beforeend", html);
    // 3.9:1 straight; the same white text at 85% on a fill; dark text on a translucent dark tint.
    add('<p style="color:var(--white);background:var(--cerulean)">plain fill</p>');
    add('<p style="color:var(--white);background:var(--cerulean-ink);opacity:.85">dimmed</p>');
    add(
      '<div style="background:var(--midnight)"><p style="background:color-mix(in srgb,var(--white) 20%,transparent);color:var(--slate)">tinted</p></div>',
    );
    // Large bold text only needs 3:1, so this one passes.
    add(
      '<p style="color:var(--white);background:var(--cerulean);font:700 19px sans-serif">large</p>',
    );
  });
  const problems = await contrastProblems(page);
  expect(problems.map((p) => p.match(/"(\w+)/)?.[1])).toEqual(["plain", "dimmed", "tinted"]);
});

test("the contrast check passes text that meets AA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    document
      .querySelector("main")!
      .insertAdjacentHTML(
        "beforeend",
        '<p style="color:var(--white);background:var(--cerulean-ink)">white on New</p>',
      );
  });
  expect(await contrastProblems(page)).toEqual([]);
});
