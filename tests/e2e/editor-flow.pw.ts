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

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("note-history-command", { detail: "undo" }))
  );

  await expect
    .poll(() =>
      page
        .evaluate(() =>
          window.__noteE2E.getDocument("page-1").blocks.map((block) => block.text)
        )
    )
    .toEqual(["One", "Two", "One", "Two"]);
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

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("note-history-command", { detail: "undo" }))
  );

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks.map((block) => block.text))
    )
    .toEqual(["Delete me"]);
});

test("selects the focused block with Escape and returns to editing with Enter", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("Selectable");
  await page.keyboard.press("Escape");

  await expect(firstBlock).not.toBeFocused();

  await page.keyboard.press("Enter");
  await expect(firstBlock).toBeFocused();
});

test("moves selected blocks with command shift arrows", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("One");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Two");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Three");

  const secondBlock = page.getByRole("textbox", { name: "paragraph block" }).nth(1);
  await secondBlock.click();
  await page.keyboard.press(`${modKey}+A`);
  await page.keyboard.press(`${modKey}+Shift+ArrowUp`);

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__noteE2E.getDocument("page-1").blocks.map((block) => block.text)
      )
    )
    .toEqual(["Two", "One", "Three"]);
});

test("formats selected inline text from the floating toolbar", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("Format docs");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");

  await page.getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "Link" }).click();
  await page.getByLabel("Link URL").fill("https://example.com");
  await page.keyboard.press("Enter");

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__noteE2E.getDocument("page-1").blocks[0]?.props.inlineMarks
      )
    )
    .toEqual([
      { end: 11, start: 7, type: "bold" },
      { end: 11, href: "https://example.com", start: 7, type: "link" }
    ]);
});

test("undoes and redoes block text from the app history command", async ({ page }) => {
  await page.goto("/");

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.fill("Undo me");
  await expect(firstBlock).toHaveText("Undo me");

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("note-history-command", { detail: "undo" }))
  );

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.text)
    )
    .toBe("");

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("note-history-command", { detail: "redo" }))
  );

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.text)
    )
    .toBe("Undo me");
});
