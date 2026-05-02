import { expect, test, type Page } from "@playwright/test";

const modKey = process.platform === "darwin" ? "Meta" : "Control";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

async function openInitialPage(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Untitled" }).click();
}

test("moves from title to the first body block with Enter", async ({ page }) => {
  await openInitialPage(page);

  const title = page.getByRole("heading", { name: "Untitled" });
  await title.click();
  await page.keyboard.press(`${modKey}+A`);
  await page.keyboard.type("Daily notes");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "paragraph block" }).first()).toBeFocused();
});

test("persists typed block text through the editor save path", async ({ page }) => {
  await openInitialPage(page);

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
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("First block");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "paragraph block" })).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "paragraph block" }).nth(1)).toBeFocused();
});

test("creates page link targets as child pages", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Untitled" })).toBeFocused();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const document = window.__noteE2E.getDocument("page-1");
        const pageLinkBlock = document.blocks[0];
        const targetPageId =
          typeof pageLinkBlock?.props.targetPageId === "string"
            ? pageLinkBlock.props.targetPageId
            : null;

        return {
          blockType: pageLinkBlock?.type,
          targetTitle: pageLinkBlock?.props.targetTitle,
          targetParentPageId: targetPageId
            ? window.__noteE2E.getDocument(targetPageId).page.parentPageId
            : null
        };
      })
    )
    .toEqual({
      blockType: "page_link",
      targetTitle: "",
      targetParentPageId: "page-1"
    });
});

test("selects slash menu commands on pointer hover without scrolling the menu", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/");

  const menu = page.getByRole("listbox");
  const headingCommand = page.getByRole("option", { name: /Heading 3/ });
  await headingCommand.hover();

  await expect(headingCommand).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBe(0);

  await page.keyboard.press("Enter");

  await expect(page.getByRole("textbox", { name: "heading_3 block" }).first()).toBeFocused();
});

test("opens page blocks in the current tab and supports browser back", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  const targetPageId = await page.evaluate(() => {
    const pageLinkBlock = window.__noteE2E.getDocument("page-1").blocks[0];

    return typeof pageLinkBlock?.props.targetPageId === "string"
      ? pageLinkBlock.props.targetPageId
      : null;
  });

  expect(targetPageId).toBeTruthy();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));

  await page.goBack();
  await expect(page).toHaveURL(/\/pages\/page-1$/);

  const pageBlock = page
    .locator("[data-block-id]")
    .getByRole("button", { exact: true, name: "Untitled" });
  await pageBlock.click();

  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));
});

test("uses the app tab history for mouse back and forward buttons", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  const targetPageId = await page.evaluate(() => {
    const pageLinkBlock = window.__noteE2E.getDocument("page-1").blocks[0];

    return typeof pageLinkBlock?.props.targetPageId === "string"
      ? pageLinkBlock.props.targetPageId
      : null;
  });

  expect(targetPageId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));

  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 3 }));
  });

  await expect(page).toHaveURL(/\/pages\/page-1$/);

  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 4 }));
  });

  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));
});

test("uses the app tab history for command arrow shortcuts", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  const targetPageId = await page.evaluate(() => {
    const pageLinkBlock = window.__noteE2E.getDocument("page-1").blocks[0];

    return typeof pageLinkBlock?.props.targetPageId === "string"
      ? pageLinkBlock.props.targetPageId
      : null;
  });

  expect(targetPageId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));

  await page.keyboard.press(`${modKey}+ArrowLeft`);
  await expect(page).toHaveURL(/\/pages\/page-1$/);

  await page.keyboard.press(`${modKey}+ArrowRight`);
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));
});

test("uses the app tab history from the main navigation bridge", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  const targetPageId = await page.evaluate(() => {
    const pageLinkBlock = window.__noteE2E.getDocument("page-1").blocks[0];

    return typeof pageLinkBlock?.props.targetPageId === "string"
      ? pageLinkBlock.props.targetPageId
      : null;
  });

  expect(targetPageId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("note-navigation-command", { detail: "back" }));
  });
  await expect(page).toHaveURL(/\/pages\/page-1$/);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("note-navigation-command", { detail: "forward" }));
  });
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));
});

test("opens page blocks in a new tab with the middle mouse button", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");

  const targetPageId = await page.evaluate(() => {
    const pageLinkBlock = window.__noteE2E.getDocument("page-1").blocks[0];

    return typeof pageLinkBlock?.props.targetPageId === "string"
      ? pageLinkBlock.props.targetPageId
      : null;
  });

  expect(targetPageId).toBeTruthy();
  await page.goBack();

  const pageBlock = page
    .locator("[data-block-id]")
    .getByRole("button", { exact: true, name: "Untitled" });
  await pageBlock.click({ button: "middle" });

  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page).toHaveURL(new RegExp(`/pages/${targetPageId}$`));
});

test("deletes a focused page block with Backspace", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.type)
    )
    .toBe("page_link");
  await page.goBack();

  const pageBlock = page
    .locator("[data-block-id]")
    .getByRole("button", { exact: true, name: "Untitled" });
  await pageBlock.focus();
  await page.keyboard.press("Backspace");

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.type)
    )
    .toBe("paragraph");
});

test("deletes a drag-selected page block with Delete", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("/page");
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.type)
    )
    .toBe("page_link");
  await page.goBack();

  const pageBlock = page
    .locator("[data-block-id]")
    .getByRole("button", { exact: true, name: "Untitled" });
  const box = await pageBlock.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x - 16, box!.y - 6);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width + 16, box!.y + box!.height + 6);
  await page.mouse.up();

  await expect(page.locator("[data-block-selection-overlay]")).toHaveCount(1);

  await page.keyboard.press("Delete");

  await expect
    .poll(() =>
      page.evaluate(() => window.__noteE2E.getDocument("page-1").blocks[0]?.type)
    )
    .toBe("paragraph");
});

test("turns markdown shortcuts into block types", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("# ");

  await expect(page.getByRole("textbox", { name: "heading_1 block" }).first()).toBeFocused();
});

test("pastes markdown from the system clipboard as multiple blocks", async ({ page }) => {
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.evaluate(() => navigator.clipboard.writeText("# Pasted heading\n- item"));
  await page.keyboard.press(`${modKey}+V`);

  await expect(page.getByRole("textbox", { name: "heading_1 block" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "bulleted_list block" })).toHaveCount(1);
});

test("copies a selected block range and supports repeated block paste", async ({ page }) => {
  await openInitialPage(page);

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

  await expect(page.locator("[data-block-selection-overlay]")).toHaveCount(1);

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

  await expect(page.locator("[data-block-selection-overlay]")).toHaveCount(0);

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
  await openInitialPage(page);

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
  await openInitialPage(page);

  const firstBlock = page.getByRole("textbox", { name: "paragraph block" }).first();
  await firstBlock.click();
  await page.keyboard.type("Selectable");
  await page.keyboard.press("Escape");

  await expect(firstBlock).not.toBeFocused();

  await page.keyboard.press("Enter");
  await expect(firstBlock).toBeFocused();
});

test("moves selected blocks with command shift arrows", async ({ page }) => {
  await openInitialPage(page);

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
  await openInitialPage(page);

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
  await openInitialPage(page);

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
