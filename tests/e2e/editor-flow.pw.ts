import { expect, test } from "@playwright/test";

const modKey = process.platform === "darwin" ? "Meta" : "Control";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("moves from title to the first body block with Enter", async ({ page }) => {
  await page.goto("/");

  const title = page.getByRole("heading", { name: "Untitled" });
  await title.click();
  await page.keyboard.press(`${modKey}+A`);
  await page.keyboard.type("Daily notes");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "paragraph block" }).first()).toBeFocused();
});

test("persists typed block text through the editor save path", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("Saved body text");

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.text)
    )
    .toBe("Saved body text");
});

test("creates the next block with Enter", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("First block");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "paragraph block" })).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "paragraph block" }).nth(1)).toBeFocused();
});

test("turns markdown shortcuts into block types", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("# ");

  await expect(page.getByRole("textbox", { name: "heading_1 block" }).first()).toBeFocused();
});

test("pastes markdown from the system clipboard as multiple blocks", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.evaluate(() => navigator.clipboard.writeText("# Pasted heading\n- item"));
  await page.keyboard.press(`${modKey}+V`);

  await expect(page.getByRole("textbox", { name: "heading_1 block" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "bulleted_list block" })).toHaveCount(1);
});

test("copies a selected block range and supports repeated block paste", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("One");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Two");

  await firstBlock.click();
  await page.keyboard.press(`${modKey}+A`);
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press(`${modKey}+C`);
  await page.keyboard.press(`${modKey}+V`);
  await page.keyboard.press(`${modKey}+V`);

  await expect
    .poll(() =>
      page
        .evaluate(() =>
          window.__noteE2E.getDocument("page-1").blocks.map((block) => block.text)
        )
    )
    .toEqual(["One", "Two", "One", "Two", "One", "Two"]);
});

test("keeps an editable block after deleting every selected block", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("Delete me");
  await page.keyboard.press(`${modKey}+A`);
  await page.keyboard.press("Backspace");

  await expect(page.getByRole("textbox", { name: "paragraph block" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "paragraph block" }).first()).toBeFocused();
});
